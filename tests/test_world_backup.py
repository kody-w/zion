#!/usr/bin/env python3
"""Tests for the world backup system."""
import json
import os
import sys
import tempfile
import shutil
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))

from world_backup import freeze, list_snapshots, restore, diff_snapshots
import world_backup


class TestFreeze(unittest.TestCase):

    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.state_dir = os.path.join(self.tmpdir, 'state')
        self.snap_dir = os.path.join(self.state_dir, 'snapshots')
        os.makedirs(self.state_dir)
        # Create mock state files
        for name in ['world.json', 'economy.json', 'players.json']:
            with open(os.path.join(self.state_dir, name), 'w') as f:
                json.dump({'test': name}, f)
        # Patch dirs
        world_backup.STATE_DIR = self.state_dir
        world_backup.SNAPSHOTS_DIR = self.snap_dir

    def tearDown(self):
        shutil.rmtree(self.tmpdir)
        # Restore
        world_backup.STATE_DIR = os.path.join(
            os.path.dirname(os.path.abspath(world_backup.__file__)), '..', 'state')
        world_backup.SNAPSHOTS_DIR = os.path.join(world_backup.STATE_DIR, 'snapshots')

    def test_freeze_creates_snapshot(self):
        path = freeze(tag='test-snap')
        self.assertTrue(os.path.isfile(path))
        with open(path) as f:
            snap = json.load(f)
        self.assertIn('_snapshot_ts', snap)
        self.assertIn('_snapshot_files', snap)
        self.assertIn('world', snap)
        self.assertIn('economy', snap)

    def test_freeze_captures_all_available_files(self):
        path = freeze(tag='test2')
        with open(path) as f:
            snap = json.load(f)
        self.assertEqual(len(snap['_snapshot_files']), 3)

    def test_freeze_with_date_default(self):
        path = freeze()
        self.assertTrue(os.path.isfile(path))
        # Should contain today's date
        from datetime import datetime, timezone
        today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
        self.assertIn(today, path)

    def test_freeze_skips_missing_files(self):
        # Remove one file
        os.remove(os.path.join(self.state_dir, 'economy.json'))
        path = freeze(tag='partial')
        with open(path) as f:
            snap = json.load(f)
        self.assertNotIn('economy', snap)
        self.assertEqual(len(snap['_snapshot_files']), 2)


class TestListSnapshots(unittest.TestCase):

    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.snap_dir = os.path.join(self.tmpdir, 'snapshots')
        os.makedirs(self.snap_dir)
        world_backup.SNAPSHOTS_DIR = self.snap_dir

    def tearDown(self):
        shutil.rmtree(self.tmpdir)
        world_backup.SNAPSHOTS_DIR = os.path.join(world_backup.STATE_DIR, 'snapshots')

    def test_list_empty(self):
        result = list_snapshots()
        self.assertEqual(result, [])

    def test_list_finds_snapshots(self):
        for name in ['2026-02-27.json', '2026-02-28.json']:
            with open(os.path.join(self.snap_dir, name), 'w') as f:
                json.dump({'_snapshot_ts': '2026-02-28T00:00:00Z'}, f)
        result = list_snapshots()
        self.assertEqual(len(result), 2)

    def test_list_ignores_gitkeep(self):
        open(os.path.join(self.snap_dir, '.gitkeep'), 'w').close()
        with open(os.path.join(self.snap_dir, 'test.json'), 'w') as f:
            json.dump({}, f)
        result = list_snapshots()
        self.assertEqual(len(result), 1)


class TestRestore(unittest.TestCase):

    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.state_dir = os.path.join(self.tmpdir, 'state')
        self.snap_dir = os.path.join(self.state_dir, 'snapshots')
        os.makedirs(self.state_dir)
        os.makedirs(self.snap_dir)

        # Create current state
        for name in ['world.json', 'economy.json', 'players.json']:
            with open(os.path.join(self.state_dir, name), 'w') as f:
                json.dump({'current': True, 'file': name}, f)

        # Create a snapshot with different data
        snap = {
            '_snapshot_ts': '2026-02-27T00:00:00Z',
            '_snapshot_tag': 'old',
            '_snapshot_files': ['world.json', 'economy.json', 'players.json'],
            'world': {'restored': True, 'weather': 'rain'},
            'economy': {'restored': True, 'balances': {}},
            'players': {'restored': True, 'players': {}},
        }
        with open(os.path.join(self.snap_dir, 'old.json'), 'w') as f:
            json.dump(snap, f)

        world_backup.STATE_DIR = self.state_dir
        world_backup.SNAPSHOTS_DIR = self.snap_dir

    def tearDown(self):
        shutil.rmtree(self.tmpdir)
        world_backup.STATE_DIR = os.path.join(
            os.path.dirname(os.path.abspath(world_backup.__file__)), '..', 'state')
        world_backup.SNAPSHOTS_DIR = os.path.join(world_backup.STATE_DIR, 'snapshots')

    def test_restore_overwrites_state_files(self):
        restore('old')
        with open(os.path.join(self.state_dir, 'world.json')) as f:
            data = json.load(f)
        self.assertTrue(data.get('restored'))
        self.assertEqual(data.get('weather'), 'rain')

    def test_restore_creates_safety_backup(self):
        restore('old')
        snaps = [f for f in os.listdir(self.snap_dir) if f.startswith('pre-restore')]
        self.assertGreater(len(snaps), 0, 'Safety backup should be created')

    def test_restore_missing_snapshot_exits(self):
        with self.assertRaises(SystemExit):
            restore('nonexistent')


if __name__ == '__main__':
    unittest.main()
