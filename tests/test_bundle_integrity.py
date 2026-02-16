#!/usr/bin/env python3
"""Tests for bundle output integrity.

Prevents: syntax errors surviving bundling, missing HTML elements,
missing module markers, wrong dependency order.
"""
import unittest
import os
import re
import subprocess
import tempfile

PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUNDLE_PATH = os.path.join(PROJECT_DIR, 'docs', 'index.html')

# Expected modules in dependency order (must match bundle_helper.py)
MODULE_ORDER = [
    'protocol', 'zones', 'economy', 'inventory', 'trading',
    'state', 'intentions', 'social', 'creation', 'quests',
    'competition', 'exploration', 'physical', 'guilds', 'mentoring',
    'models', 'auth', 'network', 'world', 'input',
    'hud', 'xr', 'audio', 'npc_ai', 'npcs',
    'seasons', 'pets', 'main'
]

# Window name for each module (UMD closure targets)
WINDOW_NAMES = [
    'Protocol', 'Zones', 'Economy', 'Inventory', 'Trading',
    'State', 'Intentions', 'Social', 'Creation', 'Quests',
    'Competition', 'Exploration', 'Physical', 'Guilds', 'Mentoring',
    'Models', 'Auth', 'Network', 'World', 'Input',
    'HUD', 'XR', 'Audio', 'NpcAI', 'NPCs',
    'Seasons', 'Pets', 'Main'
]


class TestBundleIntegrity(unittest.TestCase):
    """Verify the bundled docs/index.html is structurally sound."""

    @classmethod
    def setUpClass(cls):
        cls.bundle_exists = os.path.exists(BUNDLE_PATH)
        if cls.bundle_exists:
            with open(BUNDLE_PATH, 'r', encoding='utf-8') as f:
                cls.content = f.read()
            cls.size = os.path.getsize(BUNDLE_PATH)
        else:
            cls.content = ''
            cls.size = 0

    def test_bundle_exists_and_not_truncated(self):
        """Bundle file should exist and be > 100KB."""
        self.assertTrue(self.bundle_exists, f'Bundle not found at {BUNDLE_PATH}')
        self.assertGreater(self.size, 100_000,
            f'Bundle is only {self.size} bytes - likely truncated')

    def test_has_doctype(self):
        """Bundle should start with DOCTYPE."""
        self.assertTrue(self.content.strip().startswith('<!DOCTYPE html'),
            'Bundle should begin with <!DOCTYPE html>')

    def test_has_favicon(self):
        """Bundle should have a favicon link (Bug #4 regression)."""
        self.assertRegex(self.content, r'rel=["\']icon["\']',
            'Bundle should have <link rel="icon" ...>')

    def test_has_threejs_cdn(self):
        """Bundle should include Three.js from CDN."""
        self.assertIn('cdnjs.cloudflare.com', self.content,
            'Three.js should come from cdnjs CDN')
        self.assertRegex(self.content, r'three(?:\.min)?\.js',
            'Bundle should reference three.js')

    def test_has_peerjs_cdn(self):
        """Bundle should include PeerJS from CDN."""
        self.assertRegex(self.content, r'peerjs|peer\.min\.js',
            'Bundle should reference PeerJS')

    def test_has_critical_html_elements(self):
        """Bundle should have game-container, world-canvas, login-screen."""
        for elem_id in ['game-container', 'world-canvas', 'login-screen']:
            self.assertIn(elem_id, self.content,
                f'Bundle should have element with id="{elem_id}"')

    def test_all_modules_present(self):
        """Every module marker comment should be in the bundle."""
        for mod in MODULE_ORDER:
            marker = f'// {mod}.js'
            self.assertIn(marker, self.content,
                f'Module marker "{marker}" not found in bundle')

    def test_modules_in_dependency_order(self):
        """Module markers should appear in ascending order."""
        positions = []
        for mod in MODULE_ORDER:
            marker = f'// {mod}.js'
            pos = self.content.find(marker)
            self.assertGreater(pos, -1, f'Module marker "{marker}" not found')
            positions.append((mod, pos))

        for i in range(len(positions) - 1):
            mod_a, pos_a = positions[i]
            mod_b, pos_b = positions[i + 1]
            self.assertLess(pos_a, pos_b,
                f'{mod_a}.js (pos {pos_a}) should appear before '
                f'{mod_b}.js (pos {pos_b})')

    def test_all_umd_closures_present(self):
        """Every window.ModuleName assignment should exist."""
        for name in WINDOW_NAMES:
            pattern = f'window.{name}'
            self.assertIn(pattern, self.content,
                f'UMD closure for {pattern} not found in bundle')

    def test_bundle_js_syntax_valid(self):
        """Inline JS extracted from bundle should pass node -c."""
        # Extract inline script blocks (not CDN src= tags)
        blocks = re.findall(r'<script\b([^>]*)>([\s\S]*?)</script>', self.content)
        inline = [content for attrs, content in blocks if 'src=' not in attrs]

        self.assertTrue(len(inline) > 0,
            'No inline <script> blocks found in bundle')

        combined = '\n'.join(inline)
        self.assertGreater(len(combined), 1000,
            'Extracted JS is too small - extraction may have failed')

        with tempfile.NamedTemporaryFile(
            mode='w', suffix='.js', delete=False, encoding='utf-8'
        ) as f:
            f.write(combined)
            tmp_path = f.name

        try:
            result = subprocess.run(
                ['node', '-c', tmp_path],
                capture_output=True, text=True, timeout=30
            )
            self.assertEqual(result.returncode, 0,
                f'Bundle JS syntax error:\n{result.stderr.strip()[:500]}')
        finally:
            os.unlink(tmp_path)


if __name__ == '__main__':
    unittest.main()
