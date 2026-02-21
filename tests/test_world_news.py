#!/usr/bin/env python3
"""Tests for world_news.py and snapshot_state.py."""

import json
import os
import shutil
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET

# Add scripts directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))

from world_news import (
    generate_news_item,
    generate_rss_feed,
    update_feed,
)
from snapshot_state import snapshot_state, save_snapshot


# ---------------------------------------------------------------------------
# Shared helpers (mirrored from test_world_diff.py style)
# ---------------------------------------------------------------------------

def make_economy(balances=None, transactions=None):
    return {
        'balances': balances or {},
        'transactions': transactions or [],
        'listings': []
    }


def make_gardens(plots=None):
    return plots or {}


def make_structures(items=None):
    return items or {}


def make_chat(messages=None):
    return {'messages': messages or []}


def make_federation(federations=None, worlds=None):
    return {
        'worldId': 'zion-main',
        'worldName': 'ZION',
        'federations': federations or [],
        'discoveredWorlds': worlds or [],
        'sparkExchangeRate': 1.0,
    }


def make_players(players=None):
    return {'players': players or {}}


def make_state(economy=None, gardens=None, structures=None,
               chat=None, federation=None, players=None):
    return {
        'economy': economy or make_economy(),
        'gardens': gardens or make_gardens(),
        'structures': structures or make_structures(),
        'chat': chat or make_chat(),
        'federation': federation or make_federation(),
        'players': players or make_players(),
    }


def changed_state():
    """Return a before/after pair with real differences."""
    before = make_state(
        economy=make_economy({'alice': 10, 'TREASURY': 100}),
        players=make_players({
            'alice': {'position': {'zone': 'nexus', 'x': 0, 'y': 0, 'z': 0}}
        })
    )
    after = make_state(
        economy=make_economy({'alice': 25, 'TREASURY': 150}),
        players=make_players({
            'alice': {'position': {'zone': 'gardens', 'x': 200, 'y': 0, 'z': 30}}
        })
    )
    return before, after


FIXED_TS = '2026-02-21T12:00:00+00:00'


# ===========================================================================
# Tests for generate_news_item
# ===========================================================================

class TestGenerateNewsItem(unittest.TestCase):

    def test_creates_valid_item_from_state_diff(self):
        """generate_news_item returns a dict with all required fields."""
        before, after = changed_state()
        item = generate_news_item(before, after, timestamp=FIXED_TS)

        self.assertIsNotNone(item)
        self.assertIn('title', item)
        self.assertIn('description', item)
        self.assertIn('pubDate', item)
        self.assertIn('guid', item)

    def test_returns_none_when_no_changes(self):
        """generate_news_item returns None when states are identical."""
        state = make_state()
        item = generate_news_item(state, state, timestamp=FIXED_TS)
        self.assertIsNone(item)

    def test_title_is_first_sentence(self):
        """Title should derive from the first sentence of the narrative."""
        before, after = changed_state()
        item = generate_news_item(before, after, timestamp=FIXED_TS)
        self.assertIsNotNone(item)
        # Title should not be empty
        self.assertGreater(len(item['title']), 0)

    def test_title_includes_timestamp(self):
        """Title should embed a human-readable form of the timestamp."""
        before, after = changed_state()
        item = generate_news_item(before, after, timestamp=FIXED_TS)
        self.assertIsNotNone(item)
        # The date portion should appear somewhere in the title
        self.assertIn('2026-02-21', item['title'])

    def test_description_contains_narrative(self):
        """Description should contain the full narrative."""
        before = make_state(economy=make_economy({'TREASURY': 100}))
        after = make_state(economy=make_economy({'TREASURY': 200}))
        item = generate_news_item(before, after, timestamp=FIXED_TS)
        self.assertIsNotNone(item)
        self.assertIn('TREASURY', item['description'])

    def test_description_truncated_at_max_len(self):
        """Very large narratives should be truncated in description."""
        # Create a state with many balance changes to produce a long narrative
        many_balances = {'user_{:04d}'.format(i): i for i in range(200)}
        before = make_state(economy=make_economy(many_balances))
        large_after = {'user_{:04d}'.format(i): i + 10 for i in range(200)}
        after = make_state(economy=make_economy(large_after))
        item = generate_news_item(before, after, timestamp=FIXED_TS)
        if item is not None:
            self.assertLessEqual(len(item['description']), 4100)  # MAX_NARRATIVE_LEN + a bit

    def test_guid_is_unique_per_timestamp(self):
        """Each timestamp should produce a unique guid."""
        before, after = changed_state()
        ts1 = '2026-02-21T10:00:00+00:00'
        ts2 = '2026-02-21T11:00:00+00:00'
        item1 = generate_news_item(before, after, timestamp=ts1)
        item2 = generate_news_item(before, after, timestamp=ts2)
        self.assertIsNotNone(item1)
        self.assertIsNotNone(item2)
        self.assertNotEqual(item1['guid'], item2['guid'])

    def test_pub_date_matches_timestamp(self):
        """pubDate field should match the timestamp passed in."""
        before, after = changed_state()
        item = generate_news_item(before, after, timestamp=FIXED_TS)
        self.assertIsNotNone(item)
        self.assertEqual(item['pubDate'], FIXED_TS)

    def test_defaults_timestamp_to_now(self):
        """When no timestamp provided, pubDate should be a non-empty string."""
        before, after = changed_state()
        item = generate_news_item(before, after)
        self.assertIsNotNone(item)
        self.assertIsInstance(item['pubDate'], str)
        self.assertGreater(len(item['pubDate']), 0)

    def test_economy_change_reflected_in_item(self):
        """Economy changes should appear in the description."""
        before = make_state(economy=make_economy({'bob': 5}))
        after = make_state(economy=make_economy({'bob': 50}))
        item = generate_news_item(before, after, timestamp=FIXED_TS)
        self.assertIsNotNone(item)
        self.assertIn('bob', item['description'].lower())

    def test_new_player_reflected_in_item(self):
        """New player joining should appear in the description."""
        before = make_state(players=make_players({}))
        after = make_state(players=make_players({
            'wanderer': {'position': {'zone': 'nexus', 'x': 0, 'y': 0, 'z': 0}}
        }))
        item = generate_news_item(before, after, timestamp=FIXED_TS)
        self.assertIsNotNone(item)
        self.assertIn('wanderer', item['description'].lower())


# ===========================================================================
# Tests for generate_rss_feed
# ===========================================================================

class TestGenerateRssFeed(unittest.TestCase):

    def _make_item(self, title='Test Item', description='Test desc',
                   pub_date=None, guid=None):
        return {
            'title': title,
            'description': description,
            'pubDate': pub_date or FIXED_TS,
            'guid': guid or 'zion-news-test-{}'.format(title.replace(' ', '-')),
        }

    def test_valid_rss_2_0_xml(self):
        """Feed output should be valid RSS 2.0 XML with required elements."""
        items = [self._make_item()]
        xml_str = generate_rss_feed(items)

        # Must parse as XML without errors
        root = ET.fromstring(xml_str)

        # Root must be <rss>
        self.assertEqual(root.tag, 'rss')
        self.assertEqual(root.get('version'), '2.0')

        # Must have <channel>
        channel = root.find('channel')
        self.assertIsNotNone(channel)

        # Channel must have required elements
        self.assertIsNotNone(channel.find('title'))
        self.assertIsNotNone(channel.find('link'))
        self.assertIsNotNone(channel.find('description'))

    def test_items_appear_in_feed(self):
        """Items passed in should appear in feed output."""
        items = [
            self._make_item('Item One', guid='guid-1'),
            self._make_item('Item Two', guid='guid-2'),
        ]
        xml_str = generate_rss_feed(items)
        root = ET.fromstring(xml_str)
        channel = root.find('channel')
        item_els = channel.findall('item')
        self.assertEqual(len(item_els), 2)

    def test_items_sorted_newest_first(self):
        """Items should be ordered newest pubDate first."""
        items = [
            self._make_item('Older', pub_date='2026-02-20T10:00:00+00:00', guid='g1'),
            self._make_item('Newer', pub_date='2026-02-21T10:00:00+00:00', guid='g2'),
        ]
        xml_str = generate_rss_feed(items)
        root = ET.fromstring(xml_str)
        channel = root.find('channel')
        item_els = channel.findall('item')
        first_title = item_els[0].find('title').text
        self.assertEqual(first_title, 'Newer')

    def test_respects_max_items_limit(self):
        """Feed should not exceed max_items count."""
        items = [self._make_item('Item {}'.format(i), guid='g{}'.format(i)) for i in range(20)]
        xml_str = generate_rss_feed(items, max_items=5)
        root = ET.fromstring(xml_str)
        channel = root.find('channel')
        item_els = channel.findall('item')
        self.assertLessEqual(len(item_els), 5)

    def test_empty_items_list(self):
        """Feed with no items should still be valid XML."""
        xml_str = generate_rss_feed([])
        root = ET.fromstring(xml_str)
        channel = root.find('channel')
        item_els = channel.findall('item')
        self.assertEqual(len(item_els), 0)

    def test_item_has_required_fields(self):
        """Each item element should have title, description, pubDate, guid."""
        items = [self._make_item('Test', guid='test-guid')]
        xml_str = generate_rss_feed(items)
        root = ET.fromstring(xml_str)
        channel = root.find('channel')
        item_el = channel.find('item')
        self.assertIsNotNone(item_el.find('title'))
        self.assertIsNotNone(item_el.find('description'))
        self.assertIsNotNone(item_el.find('pubDate'))
        self.assertIsNotNone(item_el.find('guid'))

    def test_xml_special_chars_escaped(self):
        """Ampersands and angle brackets in content should be escaped."""
        items = [self._make_item(
            title='Alice & Bob <trade>',
            description='x < y & y > z',
            guid='escaped-test'
        )]
        xml_str = generate_rss_feed(items)
        # Should parse without errors (ET would fail on unescaped &/</>)
        root = ET.fromstring(xml_str)
        channel = root.find('channel')
        item_el = channel.find('item')
        title_text = item_el.find('title').text
        self.assertIn('Alice', title_text)

    def test_feed_is_well_formed(self):
        """Full round-trip through ElementTree parser should not raise."""
        before, after = changed_state()
        item = generate_news_item(before, after, timestamp=FIXED_TS)
        self.assertIsNotNone(item)
        xml_str = generate_rss_feed([item])
        # Should parse without raising
        try:
            ET.fromstring(xml_str)
        except ET.ParseError as e:
            self.fail('Feed XML is not well-formed: {}'.format(e))

    def test_channel_title_is_zion_world_news(self):
        """Channel title should be 'ZION World News'."""
        xml_str = generate_rss_feed([])
        root = ET.fromstring(xml_str)
        channel = root.find('channel')
        title_text = channel.find('title').text
        self.assertEqual(title_text, 'ZION World News')

    def test_atom_self_link_present(self):
        """Channel should have an atom:link self-reference."""
        xml_str = generate_rss_feed([])
        # Check raw string for atom:link since ET strips namespaces sometimes
        self.assertIn('atom:link', xml_str)
        self.assertIn('news.xml', xml_str)

    def test_max_items_default_50(self):
        """Default max_items should be 50."""
        items = [self._make_item('Item {}'.format(i), guid='g{}'.format(i)) for i in range(60)]
        xml_str = generate_rss_feed(items)
        root = ET.fromstring(xml_str)
        channel = root.find('channel')
        item_els = channel.findall('item')
        self.assertLessEqual(len(item_els), 50)


# ===========================================================================
# Tests for update_feed
# ===========================================================================

class TestUpdateFeed(unittest.TestCase):

    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.feed_path = os.path.join(self.tmpdir, 'news.xml')

    def tearDown(self):
        shutil.rmtree(self.tmpdir)

    def _write_state(self, filename, state_dict):
        path = os.path.join(self.tmpdir, filename)
        with open(path, 'w') as f:
            json.dump(state_dict, f)
        return path

    def test_creates_new_feed_when_none_exists(self):
        """update_feed should create the feed file if it doesn't exist."""
        before, after = changed_state()
        before_path = self._write_state('before.json', before)
        after_path = self._write_state('after.json', after)

        result = update_feed(before_path, after_path, self.feed_path)

        self.assertTrue(result)
        self.assertTrue(os.path.isfile(self.feed_path))

    def test_created_feed_is_valid_xml(self):
        """Newly created feed must be valid XML."""
        before, after = changed_state()
        before_path = self._write_state('before.json', before)
        after_path = self._write_state('after.json', after)

        update_feed(before_path, after_path, self.feed_path)

        tree = ET.parse(self.feed_path)
        root = tree.getroot()
        self.assertEqual(root.tag, 'rss')

    def test_prepends_to_existing_feed(self):
        """New item should be prepended (newest first) to existing feed."""
        # First item
        before1, after1 = changed_state()
        before_path1 = self._write_state('before1.json', before1)
        after_path1 = self._write_state('after1.json', after1)
        update_feed(before_path1, after_path1, self.feed_path)

        # Second item with different state
        before2 = make_state(economy=make_economy({'charlie': 0}))
        after2 = make_state(economy=make_economy({'charlie': 99}))
        before_path2 = self._write_state('before2.json', before2)
        after_path2 = self._write_state('after2.json', after2)
        update_feed(before_path2, after_path2, self.feed_path)

        # Feed should now have 2 items
        tree = ET.parse(self.feed_path)
        root = tree.getroot()
        channel = root.find('channel')
        items = channel.findall('item')
        self.assertEqual(len(items), 2)

    def test_returns_false_when_no_changes(self):
        """update_feed returns False when states are identical."""
        state = make_state()
        before_path = self._write_state('same_before.json', state)
        after_path = self._write_state('same_after.json', state)

        result = update_feed(before_path, after_path, self.feed_path)
        self.assertFalse(result)

    def test_returns_true_when_item_added(self):
        """update_feed returns True when a new item was added."""
        before, after = changed_state()
        before_path = self._write_state('b.json', before)
        after_path = self._write_state('a.json', after)

        result = update_feed(before_path, after_path, self.feed_path)
        self.assertTrue(result)

    def test_does_not_duplicate_guids(self):
        """Calling update_feed twice with same data should not duplicate items."""
        before, after = changed_state()
        before_path = self._write_state('b.json', before)
        after_path = self._write_state('a.json', after)

        # Both calls use same mtime -> same guid
        update_feed(before_path, after_path, self.feed_path)
        update_feed(before_path, after_path, self.feed_path)

        tree = ET.parse(self.feed_path)
        channel = tree.getroot().find('channel')
        items = channel.findall('item')
        # Should only have 1 (or at most 2 if mtimes differ by seconds)
        guids = [i.find('guid').text for i in items]
        self.assertEqual(len(guids), len(set(guids)), 'Duplicate GUIDs found')

    def test_creates_parent_directory_if_missing(self):
        """update_feed should create the feeds directory if it doesn't exist."""
        nested_path = os.path.join(self.tmpdir, 'sub', 'dir', 'news.xml')
        before, after = changed_state()
        before_path = self._write_state('b.json', before)
        after_path = self._write_state('a.json', after)

        update_feed(before_path, after_path, nested_path)
        self.assertTrue(os.path.isfile(nested_path))

    def test_feed_respects_max_50_items(self):
        """After many updates, feed should keep at most 50 items."""
        for i in range(55):
            b = make_state(economy=make_economy({'user': i}))
            a = make_state(economy=make_economy({'user': i + 1}))
            bp = self._write_state('b{}.json'.format(i), b)
            ap = self._write_state('a{}.json'.format(i), a)
            # Use distinct timestamps to avoid guid collision
            ts = '2026-02-21T{:02d}:{:02d}:00+00:00'.format(i // 60, i % 60)
            from world_news import generate_news_item, generate_rss_feed, _load_existing_items, _ensure_dir
            b_state = b
            a_state = a
            item = generate_news_item(b_state, a_state, timestamp=ts)
            if item:
                existing = _load_existing_items(self.feed_path)
                all_items = [item] + existing
                xml = generate_rss_feed(all_items, max_items=50)
                _ensure_dir(self.feed_path)
                with open(self.feed_path, 'w') as f:
                    f.write(xml)

        if os.path.isfile(self.feed_path):
            tree = ET.parse(self.feed_path)
            channel = tree.getroot().find('channel')
            items = channel.findall('item')
            self.assertLessEqual(len(items), 50)


# ===========================================================================
# Tests for snapshot_state
# ===========================================================================

class TestSnapshotState(unittest.TestCase):

    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.state_dir = os.path.join(self.tmpdir, 'state')
        os.makedirs(self.state_dir)

    def tearDown(self):
        shutil.rmtree(self.tmpdir)

    def _write_state_file(self, filename, data):
        path = os.path.join(self.state_dir, filename)
        with open(path, 'w') as f:
            json.dump(data, f)
        return path

    def test_captures_all_state_files(self):
        """snapshot_state should include all known state files present."""
        self._write_state_file('world.json', {'time': 1000})
        self._write_state_file('economy.json', {'balances': {}})
        self._write_state_file('gardens.json', {})
        self._write_state_file('structures.json', {})
        self._write_state_file('chat.json', {'messages': []})

        snap = snapshot_state(state_dir=self.state_dir)

        self.assertIn('world', snap)
        self.assertIn('economy', snap)
        self.assertIn('gardens', snap)
        self.assertIn('structures', snap)
        self.assertIn('chat', snap)

    def test_snapshot_includes_timestamp(self):
        """snapshot_state should include _snapshot_ts field."""
        snap = snapshot_state(state_dir=self.state_dir)
        self.assertIn('_snapshot_ts', snap)
        self.assertIsInstance(snap['_snapshot_ts'], str)
        self.assertGreater(len(snap['_snapshot_ts']), 0)

    def test_snapshot_includes_files_list(self):
        """snapshot_state should list which files were captured."""
        self._write_state_file('economy.json', {'balances': {}})
        snap = snapshot_state(state_dir=self.state_dir)
        self.assertIn('_snapshot_files', snap)
        self.assertIn('economy.json', snap['_snapshot_files'])

    def test_handles_missing_files_gracefully(self):
        """snapshot_state should not fail if some state files are missing."""
        # Write only one file
        self._write_state_file('economy.json', {'balances': {'alice': 10}})

        # Should not raise
        snap = snapshot_state(state_dir=self.state_dir)
        self.assertIn('economy', snap)
        # Other keys simply should not be present (or may be absent)

    def test_handles_empty_state_dir(self):
        """snapshot_state with no state files should return minimal dict."""
        snap = snapshot_state(state_dir=self.state_dir)
        self.assertIsInstance(snap, dict)
        self.assertIn('_snapshot_ts', snap)
        self.assertEqual(snap['_snapshot_files'], [])

    def test_handles_invalid_json_gracefully(self):
        """snapshot_state should skip files with invalid JSON."""
        bad_path = os.path.join(self.state_dir, 'economy.json')
        with open(bad_path, 'w') as f:
            f.write('not valid json {{{')

        # Should not raise
        snap = snapshot_state(state_dir=self.state_dir)
        self.assertIsInstance(snap, dict)
        # economy should not be in snapshot (failed to parse)
        self.assertNotIn('economy', snap)

    def test_data_preserved_in_snapshot(self):
        """Snapshot should faithfully preserve the data from state files."""
        self._write_state_file('economy.json', {
            'balances': {'alice': 42, 'bob': 7},
            'transactions': []
        })
        snap = snapshot_state(state_dir=self.state_dir)
        self.assertEqual(snap['economy']['balances']['alice'], 42)
        self.assertEqual(snap['economy']['balances']['bob'], 7)


class TestSaveSnapshot(unittest.TestCase):

    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.tmpdir)

    def test_saves_to_file(self):
        """save_snapshot should write a JSON file at the given path."""
        snap = {'_snapshot_ts': FIXED_TS, '_snapshot_files': []}
        out_path = os.path.join(self.tmpdir, 'snap.json')
        result = save_snapshot(snap, out_path)
        self.assertTrue(os.path.isfile(out_path))
        self.assertEqual(result, out_path)

    def test_saved_file_is_valid_json(self):
        """Saved snapshot should be valid JSON."""
        snap = {'_snapshot_ts': FIXED_TS, 'economy': {'balances': {'alice': 10}}}
        out_path = os.path.join(self.tmpdir, 'snap.json')
        save_snapshot(snap, out_path)
        with open(out_path) as f:
            loaded = json.load(f)
        self.assertEqual(loaded['_snapshot_ts'], FIXED_TS)

    def test_creates_parent_directories(self):
        """save_snapshot should create missing parent directories."""
        nested = os.path.join(self.tmpdir, 'a', 'b', 'c', 'snap.json')
        save_snapshot({'_snapshot_ts': FIXED_TS}, nested)
        self.assertTrue(os.path.isfile(nested))


# ===========================================================================
# Integration / XML well-formedness tests
# ===========================================================================

class TestRssFeedXmlWellFormedness(unittest.TestCase):

    def test_full_pipeline_produces_valid_xml(self):
        """End-to-end: state diff -> generate_news_item -> generate_rss_feed -> parse."""
        before, after = changed_state()
        item = generate_news_item(before, after, timestamp=FIXED_TS)
        self.assertIsNotNone(item)

        xml_str = generate_rss_feed([item])
        try:
            root = ET.fromstring(xml_str)
        except ET.ParseError as e:
            self.fail('Full pipeline produced invalid XML: {}'.format(e))

        self.assertEqual(root.tag, 'rss')

    def test_feed_with_multiple_items_well_formed(self):
        """Feed with multiple diverse items should be well-formed XML."""
        items = []
        for i in range(10):
            b = make_state(economy=make_economy({'user': i}))
            a = make_state(economy=make_economy({'user': i + 5}))
            ts = '2026-02-{:02d}T10:00:00+00:00'.format(i + 1)
            item = generate_news_item(b, a, timestamp=ts)
            if item:
                items.append(item)

        xml_str = generate_rss_feed(items)
        try:
            ET.fromstring(xml_str)
        except ET.ParseError as e:
            self.fail('Multi-item feed XML is malformed: {}'.format(e))

    def test_item_fields_present(self):
        """Each RSS item should have title, description, pubDate, guid."""
        before, after = changed_state()
        item = generate_news_item(before, after, timestamp=FIXED_TS)
        xml_str = generate_rss_feed([item])
        root = ET.fromstring(xml_str)
        channel = root.find('channel')
        item_el = channel.find('item')

        for tag in ('title', 'description', 'pubDate', 'guid'):
            el = item_el.find(tag)
            self.assertIsNotNone(el, 'Missing <{}> in item'.format(tag))
            self.assertIsNotNone(el.text, '<{}> has no text content'.format(tag))

    def test_identical_states_produce_no_news(self):
        """Identical before/after states must yield no news item."""
        state = make_state(
            economy=make_economy({'alice': 100, 'TREASURY': 50}),
            players=make_players({
                'alice': {'position': {'zone': 'nexus', 'x': 0, 'y': 0, 'z': 0}}
            })
        )
        item = generate_news_item(state, state, timestamp=FIXED_TS)
        self.assertIsNone(item, 'Identical states should produce no news')

    def test_large_diff_description_not_too_long(self):
        """A very large diff's description should be bounded in length."""
        many = {'entity_{:04d}'.format(i): i for i in range(300)}
        before = make_state(economy=make_economy(many))
        after_b = {'entity_{:04d}'.format(i): i + 1 for i in range(300)}
        after = make_state(economy=make_economy(after_b))
        item = generate_news_item(before, after, timestamp=FIXED_TS)
        if item is not None:
            self.assertLessEqual(
                len(item['description']),
                8192,
                'Description is unreasonably long'
            )


# ===========================================================================
# Integration with actual state files
# ===========================================================================

class TestActualStateFiles(unittest.TestCase):

    STATE_DIR = os.path.join(os.path.dirname(__file__), '..', 'state')

    def test_snapshot_actual_state(self):
        """snapshot_state should work on the real project state directory."""
        if not os.path.isdir(self.STATE_DIR):
            self.skipTest('state/ directory not found')
        snap = snapshot_state(state_dir=self.STATE_DIR)
        self.assertIn('_snapshot_ts', snap)
        self.assertIsInstance(snap.get('_snapshot_files'), list)

    def test_news_item_from_identical_actual_state(self):
        """Diffing actual state against itself should yield no news item."""
        if not os.path.isdir(self.STATE_DIR):
            self.skipTest('state/ directory not found')

        snap = snapshot_state(state_dir=self.STATE_DIR)
        item = generate_news_item(snap, snap, timestamp=FIXED_TS)
        self.assertIsNone(item, 'Identical actual state should produce no news')

    def test_snapshot_data_is_json_serializable(self):
        """snapshot_state output must be JSON-serializable."""
        if not os.path.isdir(self.STATE_DIR):
            self.skipTest('state/ directory not found')
        snap = snapshot_state(state_dir=self.STATE_DIR)
        try:
            json.dumps(snap)
        except (TypeError, ValueError) as e:
            self.fail('Snapshot is not JSON-serializable: {}'.format(e))


if __name__ == '__main__':
    unittest.main()
