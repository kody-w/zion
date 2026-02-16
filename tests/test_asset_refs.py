#!/usr/bin/env python3
"""Tests for asset reference integrity.

Prevents: referencing .png/.wav files that don't exist,
unexpected external URLs in source code.
"""
import unittest
import os
import re

PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(PROJECT_DIR, 'src', 'js')
ASSETS_DIR = os.path.join(PROJECT_DIR, 'docs', 'assets')

# Expected source modules
EXPECTED_MODULES = [
    'protocol', 'zones', 'economy', 'inventory', 'trading',
    'state', 'intentions', 'social', 'creation', 'quests',
    'competition', 'exploration', 'physical', 'guilds', 'mentoring',
    'models', 'auth', 'network', 'world', 'input',
    'hud', 'xr', 'audio', 'npc_ai', 'npcs',
    'seasons', 'pets', 'main'
]

# Allowed external URL patterns
ALLOWED_URL_PATTERNS = [
    r'cdnjs\.cloudflare\.com',
    r'unpkg\.com/peerjs',
    r'github\.com',
    r'kody-w\.github\.io',
    r'zion-oauth\.kwildfeuer\.workers\.dev',
    r'example\.com',       # documentation/placeholder URLs
    r'localhost',           # development
    r'127\.0\.0\.1',       # development
]


class TestAssetRefs(unittest.TestCase):
    """Verify that all referenced assets exist."""

    @classmethod
    def setUpClass(cls):
        # Collect all asset filenames (recursive)
        cls.texture_files = set()
        cls.sound_files = set()

        tex_dir = os.path.join(ASSETS_DIR, 'textures')
        snd_dir = os.path.join(ASSETS_DIR, 'sounds')

        if os.path.isdir(tex_dir):
            for root, _dirs, files in os.walk(tex_dir):
                for f in files:
                    cls.texture_files.add(f)
        if os.path.isdir(snd_dir):
            for root, _dirs, files in os.walk(snd_dir):
                for f in files:
                    cls.sound_files.add(f)

        cls.all_assets = cls.texture_files | cls.sound_files

        # Read all source files
        cls.sources = {}
        if os.path.isdir(SRC_DIR):
            for f in sorted(os.listdir(SRC_DIR)):
                if f.endswith('.js'):
                    with open(os.path.join(SRC_DIR, f), 'r') as fh:
                        cls.sources[f] = fh.read()

    @staticmethod
    def _strip_comments(src):
        """Remove JS line and block comments."""
        src = re.sub(r'//.*$', '', src, flags=re.MULTILINE)
        src = re.sub(r'/\*[\s\S]*?\*/', '', src)
        return src

    def test_source_files_exist(self):
        """Every expected module should have a source file."""
        for mod in EXPECTED_MODULES:
            filepath = os.path.join(SRC_DIR, f'{mod}.js')
            self.assertTrue(os.path.exists(filepath),
                f'Source file {mod}.js not found')

    def test_png_references_have_files(self):
        """Every .png string literal in source should have a matching asset."""
        missing = []
        pattern = re.compile(r"""['"]([^'"]*\.png)['"]""")

        for filename, src in self.sources.items():
            clean = self._strip_comments(src)
            for ref in pattern.findall(clean):
                basename = os.path.basename(ref)
                # Skip data URIs and remote URLs
                if ref.startswith('data:') or ref.startswith('http'):
                    continue
                if basename not in self.all_assets:
                    missing.append(f'{filename}: {ref} (looked for {basename})')

        self.assertEqual(len(missing), 0,
            'Missing .png asset files:\n  ' + '\n  '.join(missing))

    def test_wav_references_have_files(self):
        """Every .wav string literal in source should have a matching asset."""
        missing = []
        pattern = re.compile(r"""['"]([^'"]*\.wav)['"]""")

        for filename, src in self.sources.items():
            clean = self._strip_comments(src)
            for ref in pattern.findall(clean):
                basename = os.path.basename(ref)
                if ref.startswith('data:') or ref.startswith('http'):
                    continue
                if basename not in self.all_assets:
                    missing.append(f'{filename}: {ref} (looked for {basename})')

        self.assertEqual(len(missing), 0,
            'Missing .wav asset files:\n  ' + '\n  '.join(missing))

    def test_no_unexpected_external_urls(self):
        """Only allowed external URLs should appear in source."""
        url_pattern = re.compile(r'https?://[^\s\'"<>]+')
        unexpected = set()

        for filename, src in self.sources.items():
            clean = self._strip_comments(src)
            for url in url_pattern.findall(clean):
                # Clean trailing punctuation
                url = url.rstrip('.,;:)]}')
                is_allowed = any(
                    re.search(pat, url) for pat in ALLOWED_URL_PATTERNS
                )
                if not is_allowed:
                    unexpected.add(f'{filename}: {url}')

        unexpected = sorted(unexpected)
        self.assertEqual(len(unexpected), 0,
            'Unexpected external URLs:\n  ' + '\n  '.join(unexpected))


if __name__ == '__main__':
    unittest.main()
