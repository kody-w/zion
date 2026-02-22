#!/usr/bin/env python3
"""Bundle helper: create single HTML file from source components.

Usage:
    python3 scripts/bundle_helper.py src docs/index.html
    python3 scripts/bundle_helper.py src docs/index.html --minify
"""
import sys
import os
import json
import glob
import zlib
import re


# JavaScript files in dependency order
JS_FILES = [
    'protocol.js',
    'zones.js',
    'economy.js',
    'economy_viz.js',
    'inventory.js',
    'trading.js',
    'state.js',
    'replay.js',
    'yaml_dash.js',
    'intentions.js',
    'social.js',
    'creation.js',
    'quests.js',
    'competition.js',
    'exploration.js',
    'anchors.js',
    'physical.js',
    'guilds.js',
    'mentoring.js',
    'gardens.js',
    'chat.js',
    'elections.js',
    'leaderboards.js',
    'notifications.js',
    'badges.js',
    'daily_rewards.js',
    'profiles.js',
    'models.js',
    'auth.js',
    'network.js',
    'federation.js',
    'rift_portal.js',
    'api_bridge.js',
    'sim_crm.js',
    'sim_forge_browser.js',
    'world.js',
    'worldmap.js',
    'timelapse.js',
    'input.js',
    'hud.js',
    'xr.js',
    'audio.js',
    'npc_dialogue.js',
    'npc_ai.js',
    'npcs.js',
    'seasons.js',
    'pets.js',
    'main.js'
]

# CSS files in order
CSS_FILES = [
    'tokens.css',
    'layout.css',
    'hud.css',
    'world.css'
]

# Modules that could be lazy-loaded in the future (markers only — no actual lazy loading)
LAZY_LOAD_CANDIDATES = {
    'economy_viz.js',
    'replay.js',
    'yaml_dash.js',
    'timelapse.js',
    'sim_crm.js',
    'xr.js',
    'npc_dialogue.js',
}


def read_file_safe(filepath):
    """Read file content safely, return empty string if not found."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        print(f"Warning: File not found: {filepath}", file=sys.stderr)
        return ''
    except Exception as e:
        print(f"Error reading {filepath}: {e}", file=sys.stderr)
        return ''


def gzip_estimate(text):
    """Return compressed byte count using gzip compression (best estimate)."""
    raw = text.encode('utf-8')
    compressed = zlib.compress(raw, level=9)
    return len(compressed)


def _is_pure_comment_line(line):
    """
    Return True if the line (stripped) is a pure // or /* comment.
    A pure comment line starts with // or /* (after optional whitespace).
    We do NOT try to detect inline comments to avoid string-confusion bugs.
    """
    stripped = line.lstrip()
    return stripped.startswith('//') or stripped.startswith('/*') or stripped.startswith('*')


def _remove_block_comments(source):
    """
    Remove /* ... */ block comments from JS source using a two-pass approach.

    Safety: Only removes block comments that START at the beginning of a line
    (after optional whitespace) OR are clearly standalone (the entire trimmed line
    is the comment). Does NOT touch inline /* */ to avoid string-confusion bugs.

    For multi-line block comments (/* ... */ spanning multiple lines), uses a
    careful approach: the comment must start with /* as the first non-whitespace
    on its line.
    """
    # Two-pass: first find standalone block comment regions, then remove them.
    # A "standalone" block comment starts with /* as first non-whitespace on a line.
    result_lines = []
    lines = source.split('\n')
    in_block = False
    block_start_standalone = False

    for line in lines:
        stripped = line.lstrip()
        if not in_block:
            if stripped.startswith('/*'):
                # Check if entire line up to first */ is just the comment
                # (or it's the opening of a multi-line comment)
                in_block = True
                block_start_standalone = True
                # Check if comment closes on same line
                rest = stripped[2:]
                close_idx = rest.find('*/')
                if close_idx >= 0:
                    # Single-line block comment: strip this line if nothing else
                    after = rest[close_idx + 2:].strip()
                    if not after:
                        in_block = False
                        # Don't add this line (pure comment)
                    else:
                        # There's code after the comment on the same line
                        # Keep the line as-is (safe approach: don't strip)
                        in_block = False
                        result_lines.append(line)
                # else: multi-line block comment starts here, drop this line
            else:
                result_lines.append(line)
        else:
            # We're inside a block comment — skip until */
            close_idx = line.find('*/')
            if close_idx >= 0:
                in_block = False
                # Check if there's code after the */ on this line
                after = line[close_idx + 2:].strip()
                if after:
                    # Keep the code after the comment (rare edge case)
                    result_lines.append(line[close_idx + 2:])
                # else: drop the closing line of the comment
            # else: this whole line is inside the block comment, drop it

    return '\n'.join(result_lines)


def minify_js(source):
    """
    Safe JS minifier — stdlib only, no variable renaming.

    Safety-first approach: "better to miss a comment than to break code."

    Strips:
    - Standalone block comments (/* ... */ where /* is first on the line)
    - Pure comment lines (lines that are only // comment text)
    - Trailing whitespace on each line
    - Consecutive blank lines (collapse to one)

    Does NOT strip inline // or /* */ comments (too risky with complex string
    content like HTML-in-JS strings with embedded quotes).

    Preserves:
    - All string literals (no string parsing attempted)
    - All code logic and structure
    - Inline comments that share a line with code (conservative choice)
    """
    # Step 1: Remove standalone block comments
    text = _remove_block_comments(source)

    # Step 2: Process line by line
    lines = text.split('\n')
    result = []
    prev_blank = False

    for line in lines:
        # Strip trailing whitespace always
        line = line.rstrip()

        # Remove lines that are pure // comments
        # (line stripped starts with // — no code on this line)
        stripped = line.lstrip()
        if stripped.startswith('//'):
            # This entire line is a comment — skip it
            # But preserve blank line collapsing logic
            if not prev_blank:
                # Replace the comment line with a blank line (keeps spacing reasonable)
                # Actually: just skip it entirely for maximum compactness
                pass
            continue

        # Collapse multiple consecutive blank lines to one
        is_blank = (line == '')
        if is_blank and prev_blank:
            continue

        result.append(line)
        prev_blank = is_blank

    return '\n'.join(result)


def minify_css(source):
    """
    Safe CSS minifier — stdlib only.

    Strips:
    - CSS comments (/* ... */)
    - Unnecessary whitespace (collapse runs, strip around { } : ; ,)
    - Trailing/leading whitespace
    """
    # Remove CSS block comments
    result = re.sub(r'/\*.*?\*/', '', source, flags=re.DOTALL)

    # Collapse whitespace sequences (spaces, tabs, newlines) to single space
    result = re.sub(r'\s+', ' ', result)

    # Remove spaces around structural characters
    result = re.sub(r'\s*([{};:,>+~])\s*', r'\1', result)

    # Remove space after opening paren and before closing paren
    result = re.sub(r'\(\s+', '(', result)
    result = re.sub(r'\s+\)', ')', result)

    # Remove trailing semicolons before closing braces
    result = re.sub(r';}', '}', result)

    # Strip leading/trailing whitespace
    result = result.strip()

    return result


def bundle_css(src_dir, minify=False):
    """Read and concatenate all CSS files."""
    css_dir = os.path.join(src_dir, 'css')
    css_content = []

    for filename in CSS_FILES:
        filepath = os.path.join(css_dir, filename)
        content = read_file_safe(filepath)
        if content:
            if minify:
                content = minify_css(content)
                css_content.append(content)
            else:
                css_content.append(f"/* {filename} */")
                css_content.append(content)
                css_content.append('')

    if minify:
        return ' '.join(css_content)
    return '\n'.join(css_content)


def load_embedded_data(project_root, minify=False):
    """Load agents and souls data for embedding."""
    # Load agents data for embedding in npcs.js
    agents_path = os.path.join(project_root, 'state', 'founding', 'agents.json')
    agents_json = read_file_safe(agents_path)

    # Load souls data for embedding in main.js
    souls_dir = os.path.join(project_root, 'state', 'souls')
    souls_data = []
    if os.path.isdir(souls_dir):
        for soul_file in sorted(glob.glob(os.path.join(souls_dir, '*.json'))):
            raw = read_file_safe(soul_file)
            if raw:
                try:
                    soul = json.loads(raw)
                    if minify:
                        # Only embed essential fields — skip full intentions/memory
                        souls_data.append({
                            'id': soul['id'],
                            'name': soul.get('name', ''),
                            'archetype': soul.get('archetype', ''),
                            'personality': soul.get('personality', []),
                            'home_zone': soul.get('home_zone', '')
                        })
                    else:
                        souls_data.append({
                            'id': soul['id'],
                            'name': soul.get('name', ''),
                            'archetype': soul.get('archetype', ''),
                            'intentions': soul.get('intentions', [])
                        })
                except Exception:
                    pass

    if minify:
        # Use compact JSON separators — no extra whitespace
        souls_compact = json.dumps(souls_data, separators=(',', ':')) if souls_data else '[]'
    else:
        souls_compact = json.dumps(souls_data) if souls_data else '[]'

    return agents_json, souls_compact


def bundle_js(src_dir, minify=False):
    """Read and concatenate all JavaScript files."""
    js_dir = os.path.join(src_dir, 'js')
    js_content = []

    project_root = os.path.dirname(src_dir)
    agents_json, souls_compact = load_embedded_data(project_root, minify=minify)

    for filename in JS_FILES:
        filepath = os.path.join(js_dir, filename)
        content = read_file_safe(filepath)
        if content:
            # Embed agents data in npcs.js
            if filename == 'npcs.js' and agents_json:
                try:
                    agents_data = json.loads(agents_json)
                    if minify:
                        compact = json.dumps([{
                            'id': a['id'], 'name': a['name'], 'archetype': a['archetype'],
                            'position': a['position'], 'personality': a.get('personality', [])
                        } for a in agents_data.get('agents', [])], separators=(',', ':'))
                    else:
                        compact = json.dumps([{
                            'id': a['id'], 'name': a['name'], 'archetype': a['archetype'],
                            'position': a['position'], 'personality': a.get('personality', [])
                        } for a in agents_data.get('agents', [])])
                    content = content.replace('AGENTS_PLACEHOLDER', compact)
                except Exception as e:
                    print(f"Warning: Could not embed agents: {e}", file=sys.stderr)
                    content = content.replace('AGENTS_PLACEHOLDER', '[]')

            # Embed souls data in main.js
            if filename == 'main.js':
                content = content.replace('SOULS_PLACEHOLDER', souls_compact)

            # Apply minification if requested
            if minify:
                content = minify_js(content)

            # Add lazy-load markers for candidate modules
            module_name = filename.replace('.js', '')
            if filename in LAZY_LOAD_CANDIDATES:
                js_content.append(f"// LAZY_LOAD_START: {module_name}")
                js_content.append(content)
                js_content.append(f"// LAZY_LOAD_END: {module_name}")
            else:
                js_content.append(f"// {filename}")
                js_content.append(content)

            js_content.append('')

    return '\n'.join(js_content)


def create_bundle(src_dir, output_path, minify=False):
    """Create bundled HTML file."""
    html_template_path = os.path.join(src_dir, 'html', 'index.html')

    # Read template
    template = read_file_safe(html_template_path)

    if not template:
        # Create a minimal template if none exists
        template = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ZION MMO</title>
    <style>
/* INLINE_CSS */
    </style>
</head>
<body>
    <div id="app"></div>
    <script>
/* INLINE_JS */
    </script>
</body>
</html>"""

    # Bundle CSS and JS
    css_content = bundle_css(src_dir, minify=minify)
    js_content = bundle_js(src_dir, minify=minify)

    # Replace placeholders
    output_html = template.replace('/* INLINE_CSS */', css_content)
    output_html = output_html.replace('/* INLINE_JS */', js_content)

    # Write output
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(output_html)
        return output_html
    except Exception as e:
        print(f"Error writing output file: {e}", file=sys.stderr)
        return None


def print_size_report(label, text):
    """Print raw and gzip-estimated sizes for a bundle."""
    raw = len(text.encode('utf-8'))
    gz = gzip_estimate(text)
    print(f"  {label}: {raw:>12,} bytes (raw)  |  ~{gz:>10,} bytes (gzip estimate)")
    return raw, gz


def main():
    """Main entry point."""
    args = sys.argv[1:]
    minify = '--minify' in args
    args = [a for a in args if a != '--minify']

    if len(args) < 2:
        print("Usage: bundle_helper.py <src_dir> <output_file> [--minify]", file=sys.stderr)
        sys.exit(1)

    src_dir = args[0]
    output_path = args[1]

    if not os.path.isdir(src_dir):
        print(f"Error: Source directory not found: {src_dir}", file=sys.stderr)
        sys.exit(1)

    print("Building ZION bundle...")

    if minify:
        # First build un-minified to get baseline size
        print("  Computing baseline (un-minified)...")
        html_template_path = os.path.join(src_dir, 'html', 'index.html')
        template = read_file_safe(html_template_path) or ''
        css_baseline = bundle_css(src_dir, minify=False)
        js_baseline = bundle_js(src_dir, minify=False)
        baseline_html = template.replace('/* INLINE_CSS */', css_baseline)
        baseline_html = baseline_html.replace('/* INLINE_JS */', js_baseline)

        print("\nSize report:")
        baseline_raw, baseline_gz = print_size_report("Original  (un-minified)", baseline_html)

        # Now build minified
        print("  Minifying...")
        output_html = create_bundle(src_dir, output_path, minify=True)
        if output_html is None:
            sys.exit(1)

        minified_raw, minified_gz = print_size_report("Minified               ", output_html)

        raw_saved = baseline_raw - minified_raw
        gz_saved = baseline_gz - minified_gz
        raw_pct = (raw_saved / baseline_raw * 100) if baseline_raw > 0 else 0
        gz_pct = (gz_saved / baseline_gz * 100) if baseline_gz > 0 else 0
        print(f"\n  Savings (raw):  {raw_saved:>10,} bytes  ({raw_pct:.1f}% reduction)")
        print(f"  Savings (gzip): {gz_saved:>10,} bytes  ({gz_pct:.1f}% reduction)")
        print(f"\nOutput: {output_path}")
    else:
        output_html = create_bundle(src_dir, output_path, minify=False)
        if output_html is None:
            sys.exit(1)

        print("\nSize report:")
        print_size_report("Bundle (un-minified)", output_html)
        print(f"\n  Tip: run with --minify to reduce bundle size")
        print(f"\nOutput: {output_path}")

    print("Done.")


if __name__ == '__main__':
    main()
