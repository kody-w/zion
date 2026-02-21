#!/usr/bin/env python3
"""Performance and minification tests for bundle_helper.py.

Tests:
- JS minifier strips comments correctly
- JS minifier preserves strings containing // and /*
- JS minifier doesn't break valid JS (node -c)
- CSS minifier strips comments and whitespace
- Minified bundle is smaller than original
- Minified bundle still passes node -c on extracted JS
- Gzip estimate is computed correctly
- Embedded JSON is compact (no unnecessary whitespace)
- All JS modules still present in minified bundle
- Round-trip: bundle, minify, extract JS, syntax check
"""
import unittest
import os
import re
import sys
import subprocess
import tempfile
import json
import zlib

# Add scripts directory to path so we can import bundle_helper
PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPTS_DIR = os.path.join(PROJECT_DIR, 'scripts')
sys.path.insert(0, SCRIPTS_DIR)

from bundle_helper import minify_js, minify_css, gzip_estimate, bundle_js, bundle_css, create_bundle, JS_FILES

SRC_DIR = os.path.join(PROJECT_DIR, 'src')
BUNDLE_PATH = os.path.join(PROJECT_DIR, 'docs', 'index.html')


def node_syntax_check(js_source):
    """Run node -c on js_source string. Returns (ok, stderr_text)."""
    with tempfile.NamedTemporaryFile(
        mode='w', suffix='.js', delete=False, encoding='utf-8'
    ) as f:
        f.write(js_source)
        tmp = f.name
    try:
        result = subprocess.run(
            ['node', '-c', tmp],
            capture_output=True, text=True, timeout=30
        )
        return result.returncode == 0, result.stderr.strip()
    finally:
        os.unlink(tmp)


class TestJsMinifier(unittest.TestCase):
    """Tests for the minify_js function.

    Design principle: safety-first. The minifier uses a conservative line-based
    approach. "Better to miss a comment than to break code."

    What IS stripped:
    - Pure // comment lines (entire line is a comment)
    - Standalone block comments (/* ... */ where /* starts a line)
    - Trailing whitespace on every line
    - Consecutive blank lines

    What is intentionally NOT stripped (too risky without a full parser):
    - Inline // comments on the same line as code
    - Inline /* ... */ comments on the same line as code
    """

    def test_strips_pure_comment_lines(self):
        """Lines that are only // comments should be removed."""
        source = "// This is a big comment\nvar x = 1;\n// Another comment\nvar y = 2;"
        result = minify_js(source)
        self.assertNotIn('This is a big comment', result)
        self.assertNotIn('Another comment', result)
        self.assertIn('var x = 1;', result)
        self.assertIn('var y = 2;', result)

    def test_strips_block_comments_standalone(self):
        """Standalone /* ... */ block comments (/* first on line) should be removed."""
        source = "/* standalone comment */\nvar x = 1;"
        result = minify_js(source)
        self.assertNotIn('standalone comment', result)
        self.assertIn('var x = 1;', result)

    def test_strips_multiline_block_comments(self):
        """Multi-line /* ... */ comments should be removed."""
        source = "/*\n * Block comment\n * spanning lines\n */\nvar x = 1;"
        result = minify_js(source)
        self.assertNotIn('Block comment', result)
        self.assertNotIn('spanning lines', result)
        self.assertIn('var x = 1;', result)

    def test_preserves_url_in_double_string(self):
        """// inside double-quoted string must not be treated as comment.
        The URL-containing line is NOT a pure comment line, so it's preserved."""
        source = 'var url = "http://example.com/path";\n'
        result = minify_js(source)
        self.assertIn('http://example.com/path', result)

    def test_preserves_url_in_single_string(self):
        """// inside single-quoted string must not be treated as comment.
        The URL-containing line is NOT a pure comment line, so it's preserved."""
        source = "var url = 'http://example.com/path';\n"
        result = minify_js(source)
        self.assertIn('http://example.com/path', result)

    def test_preserves_slash_star_in_string(self):
        """/* inside a string on a code line must be preserved (line has code before /*).
        The conservative minifier only strips /* comments where /* starts the line."""
        source = 'var s = "/* not a comment */"; var x = 1;'
        result = minify_js(source)
        self.assertIn('/* not a comment */', result)
        self.assertIn('var x = 1;', result)

    def test_preserves_template_literal(self):
        """Template literals must survive intact."""
        source = "var s = `hello ${name}`;\n"
        result = minify_js(source)
        self.assertIn('`hello ${name}`', result)

    def test_preserves_escaped_quote_in_string(self):
        """Code lines with escaped quotes must survive."""
        source = r"""var s = "he said \"hi\""; var x = 1;"""
        result = minify_js(source)
        self.assertIn('var x = 1;', result)

    def test_collapses_blank_lines(self):
        """Multiple consecutive blank lines collapse to one."""
        source = "var x = 1;\n\n\n\n\nvar y = 2;"
        result = minify_js(source)
        # Should not have more than 2 consecutive newlines (1 blank line)
        self.assertNotIn('\n\n\n', result)
        self.assertIn('var x = 1;', result)
        self.assertIn('var y = 2;', result)

    def test_strips_trailing_whitespace(self):
        """Each line should have no trailing spaces/tabs."""
        source = "var x = 1;   \nvar y = 2;\t\t\n"
        result = minify_js(source)
        for line in result.split('\n'):
            self.assertEqual(line, line.rstrip(),
                f'Line has trailing whitespace: {repr(line)}')

    def test_output_smaller_than_input(self):
        """Minified output should be smaller than comment-heavy input."""
        source = """
// This is a big comment block
// It spans many lines
// And takes up lots of space
/*
   Another block comment
   with lots of content inside
   spanning multiple lines
*/
var x = 1;
var y = 2;
"""
        result = minify_js(source)
        self.assertLess(len(result), len(source))

    def test_valid_js_survives_minification_simple(self):
        """Simple valid JS must pass node -c after minification."""
        source = """
// Module pattern
(function(exports) {
  'use strict';
  // Constants
  var VERSION = 1;
  /* Multi-line comment
     about the function */
  function greet(name) {
    var url = "http://example.com";
    return "Hello " + name;
  }
  exports.greet = greet;
  exports.VERSION = VERSION;
})(typeof module !== 'undefined' ? module.exports : (window.TestMod = {}));
"""
        minified = minify_js(source)
        ok, err = node_syntax_check(minified)
        self.assertTrue(ok, f'Minified JS failed node -c: {err}\n\nMinified:\n{minified[:500]}')

    def test_valid_js_survives_minification_umd(self):
        """UMD-style module must pass node -c after minification."""
        source = """
// economy.js — Economic simulation
(function(exports) {
  'use strict';
  // Price calculation
  function calcPrice(base, demand) {
    // Simple formula
    return base * (1 + demand / 100);
  }
  exports.calcPrice = calcPrice;
})(typeof module !== 'undefined' ? module.exports : (window.Economy = {}));
"""
        minified = minify_js(source)
        ok, err = node_syntax_check(minified)
        self.assertTrue(ok, f'Minified UMD JS failed node -c: {err}')

    def test_pure_comment_line_only_stripped(self):
        """Only pure comment lines are stripped, not inline trailing comments."""
        source = "var x = 1; // inline comment stays\n// pure comment removed\nvar y = 2;"
        result = minify_js(source)
        # Pure comment line removed:
        self.assertNotIn('pure comment removed', result)
        # Code preserved (inline comment may stay — that's the safe choice):
        self.assertIn('var x = 1;', result)
        self.assertIn('var y = 2;', result)

    def test_comment_at_start_of_line_removed(self):
        """// comment-only lines (no leading code) are stripped."""
        source = "var x = 1;\n// end of file comment line\nvar y = 2;"
        result = minify_js(source)
        self.assertNotIn('end of file comment line', result)
        self.assertIn('var x = 1;', result)


class TestCssMinifier(unittest.TestCase):
    """Tests for the minify_css function."""

    def test_strips_css_comments(self):
        """/* ... */ CSS comments should be removed."""
        source = "/* Global reset */\nbody { margin: 0; } /* inline comment */"
        result = minify_css(source)
        self.assertNotIn('Global reset', result)
        self.assertNotIn('inline comment', result)
        self.assertIn('body', result)
        self.assertIn('margin:0', result)

    def test_collapses_whitespace(self):
        """Multiple spaces/newlines should collapse."""
        source = "body   {\n    margin:   0;\n    padding:   0;\n}"
        result = minify_css(source)
        self.assertNotIn('  ', result)  # no double spaces
        self.assertIn('margin:0', result)

    def test_removes_space_around_braces(self):
        """No spaces before/after { and }."""
        source = "body { color: red; }"
        result = minify_css(source)
        self.assertIn('body{', result)

    def test_removes_trailing_semicolons(self):
        """Semicolons before } should be removed."""
        source = ".x { color: red; }"
        result = minify_css(source)
        self.assertNotIn(';}', result)
        # The rule should still be valid
        self.assertIn('color:red', result)

    def test_output_smaller_than_input(self):
        """CSS minified output should be smaller than verbose input."""
        source = """
/* Tokens */
:root {
    /* Primary color */
    --color-primary: #6b4fbb;
    --color-secondary: #4b8fef;
}

/* Layout */
body {
    margin: 0;
    padding: 0;
    background: #000;
}
"""
        result = minify_css(source)
        self.assertLess(len(result), len(source))

    def test_strips_multiline_block_comment(self):
        """Multi-line CSS comments should be fully removed."""
        source = "/* line 1\n   line 2\n   line 3 */\nbody{}"
        result = minify_css(source)
        self.assertNotIn('line 1', result)
        self.assertNotIn('line 2', result)
        self.assertIn('body', result)


class TestGzipEstimate(unittest.TestCase):
    """Tests for the gzip_estimate function."""

    def test_returns_integer(self):
        """gzip_estimate should return an integer."""
        result = gzip_estimate("hello world")
        self.assertIsInstance(result, int)

    def test_compressed_smaller_than_raw_for_large_input(self):
        """Gzip estimate should be smaller than raw for repetitive content."""
        # Highly repetitive content compresses well
        text = "var x = 1; var y = 2; var z = 3;\n" * 1000
        raw_size = len(text.encode('utf-8'))
        gz_size = gzip_estimate(text)
        self.assertLess(gz_size, raw_size,
            f'Expected gz ({gz_size}) < raw ({raw_size})')

    def test_empty_string(self):
        """gzip_estimate handles empty string gracefully."""
        result = gzip_estimate("")
        self.assertIsInstance(result, int)
        self.assertGreaterEqual(result, 0)

    def test_gzip_estimate_consistent(self):
        """Same input always produces same gzip estimate."""
        text = "var x = 1; // comment\n" * 100
        r1 = gzip_estimate(text)
        r2 = gzip_estimate(text)
        self.assertEqual(r1, r2)


class TestMinifiedBundle(unittest.TestCase):
    """Integration tests for full bundle minification."""

    @classmethod
    def setUpClass(cls):
        """Build a temporary minified bundle for testing."""
        cls.src_dir = SRC_DIR
        cls.has_src = os.path.isdir(SRC_DIR)
        cls.minified_html = None
        cls.original_html = None

        if cls.has_src:
            # Build minified bundle to temp file
            with tempfile.NamedTemporaryFile(
                mode='w', suffix='.html', delete=False, encoding='utf-8'
            ) as f:
                cls.minified_path = f.name

            with tempfile.NamedTemporaryFile(
                mode='w', suffix='.html', delete=False, encoding='utf-8'
            ) as f:
                cls.original_path = f.name

            # Create un-minified baseline
            result_orig = create_bundle(SRC_DIR, cls.original_path, minify=False)
            if result_orig:
                cls.original_html = result_orig

            # Create minified version
            result_min = create_bundle(SRC_DIR, cls.minified_path, minify=True)
            if result_min:
                cls.minified_html = result_min

    @classmethod
    def tearDownClass(cls):
        """Clean up temp files."""
        for path in [getattr(cls, 'minified_path', None), getattr(cls, 'original_path', None)]:
            if path and os.path.exists(path):
                try:
                    os.unlink(path)
                except Exception:
                    pass

    def setUp(self):
        if not self.has_src:
            self.skipTest("src/ directory not found")
        if self.minified_html is None:
            self.skipTest("Minified bundle could not be built")

    def test_minified_bundle_smaller_than_original(self):
        """Minified bundle must be smaller than un-minified."""
        self.assertIsNotNone(self.original_html, "Original bundle failed to build")
        orig_size = len(self.original_html.encode('utf-8'))
        min_size = len(self.minified_html.encode('utf-8'))
        self.assertLess(min_size, orig_size,
            f'Expected minified ({min_size:,}) < original ({orig_size:,})')

    def test_minified_bundle_substantially_smaller(self):
        """Minified bundle should be at least 10% smaller."""
        self.assertIsNotNone(self.original_html, "Original bundle failed to build")
        orig_size = len(self.original_html.encode('utf-8'))
        min_size = len(self.minified_html.encode('utf-8'))
        reduction_pct = (orig_size - min_size) / orig_size * 100
        self.assertGreater(reduction_pct, 10.0,
            f'Expected >10% reduction, got {reduction_pct:.1f}%')

    def test_all_modules_present_in_minified_bundle(self):
        """Every JS module should still appear in minified bundle (via markers or content)."""
        # Modules in LAZY_LOAD_CANDIDATES have different markers
        from bundle_helper import LAZY_LOAD_CANDIDATES
        lazy_names = {f.replace('.js', '') for f in LAZY_LOAD_CANDIDATES}

        for filename in JS_FILES:
            module_name = filename.replace('.js', '')
            if module_name in lazy_names:
                # Lazy-load candidates get LAZY_LOAD_START marker
                marker = f'// LAZY_LOAD_START: {module_name}'
            else:
                marker = f'// {filename}'
            self.assertIn(marker, self.minified_html,
                f'Module marker for "{filename}" not found in minified bundle')

    def test_minified_bundle_js_syntax_valid(self):
        """Inline JS extracted from minified bundle must pass node -c."""
        blocks = re.findall(r'<script\b([^>]*)>([\s\S]*?)</script>',
                            self.minified_html)
        inline = [content for attrs, content in blocks
                  if 'src=' not in attrs and 'ld+json' not in attrs]

        self.assertTrue(len(inline) > 0, 'No inline <script> blocks found in minified bundle')

        combined = '\n'.join(inline)
        self.assertGreater(len(combined), 1000,
            'Extracted JS too small — extraction may have failed')

        ok, err = node_syntax_check(combined)
        self.assertTrue(ok,
            f'Minified bundle JS failed node -c:\n{err[:500]}')

    def test_gzip_estimate_computed(self):
        """gzip_estimate should return reasonable value for bundle."""
        raw = len(self.minified_html.encode('utf-8'))
        gz = gzip_estimate(self.minified_html)
        # gzip should compress a JS-heavy HTML file meaningfully
        self.assertLess(gz, raw, "gzip estimate should be less than raw size")
        # Should compress to at most 70% of raw for a typical JS-heavy file
        ratio = gz / raw
        self.assertLess(ratio, 0.70, f'gzip ratio {ratio:.2f} seems too high (expected <0.70)')

    def test_embedded_json_compact_in_minified(self):
        """Embedded JSON in minified bundle should use compact separators."""
        # The minified bundle should not contain pretty-printed JSON arrays
        # (no newlines + indentation inside JSON data)
        # Find the souls placeholder region (SOULS_PLACEHOLDER was replaced with JSON)
        # We look for array-of-objects JSON with no leading whitespace on interior lines
        # Simple check: minified bundle has agents embedded without indented JSON
        # Find '[{' followed by '"id":' without intervening newline+spaces
        # (compact JSON has no whitespace around : and ,)
        compact_pattern = re.compile(r'\[\{"id":"[^"]+","name":"[^"]*"')
        self.assertTrue(compact_pattern.search(self.minified_html),
            'Embedded JSON should be compact (no spaces after : or ,)')

    def test_lazy_load_markers_present(self):
        """Lazy-load candidate modules should have LAZY_LOAD_START/END markers."""
        from bundle_helper import LAZY_LOAD_CANDIDATES
        for filename in LAZY_LOAD_CANDIDATES:
            if filename in JS_FILES:
                module_name = filename.replace('.js', '')
                self.assertIn(f'// LAZY_LOAD_START: {module_name}', self.minified_html,
                    f'Missing LAZY_LOAD_START marker for {module_name}')
                self.assertIn(f'// LAZY_LOAD_END: {module_name}', self.minified_html,
                    f'Missing LAZY_LOAD_END marker for {module_name}')

    def test_minified_has_doctype(self):
        """Minified bundle should still be valid HTML with DOCTYPE."""
        self.assertTrue(self.minified_html.strip().startswith('<!DOCTYPE html'),
            'Minified bundle should start with <!DOCTYPE html>')

    def test_minified_has_threejs_cdn(self):
        """Minified bundle should still reference Three.js CDN."""
        self.assertIn('cdnjs.cloudflare.com', self.minified_html)


class TestRoundTrip(unittest.TestCase):
    """Round-trip tests: build -> minify -> syntax check."""

    def setUp(self):
        if not os.path.isdir(SRC_DIR):
            self.skipTest("src/ directory not found")

    def test_individual_js_modules_survive_minification(self):
        """Each JS module should survive minification and pass node -c."""
        js_dir = os.path.join(SRC_DIR, 'js')
        failures = []

        for filename in JS_FILES:
            filepath = os.path.join(js_dir, filename)
            if not os.path.exists(filepath):
                continue

            with open(filepath, 'r', encoding='utf-8') as f:
                source = f.read()

            # Replace placeholders so the source is syntactically valid
            source = source.replace('AGENTS_PLACEHOLDER', '[]')
            source = source.replace('SOULS_PLACEHOLDER', '[]')

            minified = minify_js(source)
            ok, err = node_syntax_check(minified)
            if not ok:
                failures.append(f'{filename}: {err[:200]}')

        if failures:
            self.fail(
                f'{len(failures)} module(s) failed node -c after minification:\n' +
                '\n'.join(failures)
            )

    def test_css_minifier_output_is_nonempty_for_existing_files(self):
        """CSS files should produce non-empty output after minification."""
        css_dir = os.path.join(SRC_DIR, 'css')
        from bundle_helper import CSS_FILES
        for filename in CSS_FILES:
            filepath = os.path.join(css_dir, filename)
            if not os.path.exists(filepath):
                continue
            with open(filepath, 'r', encoding='utf-8') as f:
                source = f.read()
            result = minify_css(source)
            self.assertGreater(len(result.strip()), 0,
                f'CSS minifier produced empty output for {filename}')

    def test_minified_js_bundle_smaller_than_source(self):
        """Bundled+minified JS should be smaller than raw concatenated source."""
        js_bundled = bundle_js(SRC_DIR, minify=False)
        js_minified = bundle_js(SRC_DIR, minify=True)
        self.assertLess(len(js_minified), len(js_bundled),
            f'Minified JS ({len(js_minified):,}) should be < original ({len(js_bundled):,})')

    def test_minified_css_bundle_smaller_than_source(self):
        """Bundled+minified CSS should be smaller than raw concatenated source."""
        css_bundled = bundle_css(SRC_DIR, minify=False)
        css_minified = bundle_css(SRC_DIR, minify=True)
        self.assertLess(len(css_minified), len(css_bundled),
            f'Minified CSS ({len(css_minified):,}) should be < original ({len(css_bundled):,})')


if __name__ == '__main__':
    unittest.main(verbosity=2)
