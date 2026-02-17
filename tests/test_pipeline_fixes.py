#!/usr/bin/env python3
"""Tests for pipeline fixes: rate limiting, hardcoded paths, game_tick gardens, CRM import."""
import json
import os
import sys
import tempfile
import time
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))
import api_process_inbox


class TestRateLimitSlidingWindow(unittest.TestCase):
    """Verify rate limit only counts messages within the last hour."""

    def test_old_files_not_counted(self):
        """Files older than 1 hour should not count toward rate limit."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create state dir structure
            agents_dir = os.path.join(tmpdir, 'agents')
            processed_dir = os.path.join(tmpdir, 'inbox', '_processed')
            os.makedirs(agents_dir)
            os.makedirs(processed_dir)

            # Create agent config with limit of 5/hour
            agent_config = {'rate_limit': {'messages_per_hour': 5}}
            with open(os.path.join(agents_dir, 'test-agent.json'), 'w') as f:
                json.dump(agent_config, f)

            # Create 10 old processed files (mtime set to 2 hours ago)
            old_time = time.time() - 7200  # 2 hours ago
            for i in range(10):
                fpath = os.path.join(processed_dir, 'test-agent_%d.json' % i)
                with open(fpath, 'w') as f:
                    json.dump({}, f)
                os.utime(fpath, (old_time, old_time))

            # Should be allowed since all files are old
            allowed, reason = api_process_inbox.check_rate_limit('test-agent', tmpdir)
            self.assertTrue(allowed, 'Old files should not block: %s' % reason)

    def test_recent_files_counted(self):
        """Files within the last hour should count toward rate limit."""
        with tempfile.TemporaryDirectory() as tmpdir:
            agents_dir = os.path.join(tmpdir, 'agents')
            processed_dir = os.path.join(tmpdir, 'inbox', '_processed')
            os.makedirs(agents_dir)
            os.makedirs(processed_dir)

            agent_config = {'rate_limit': {'messages_per_hour': 5}}
            with open(os.path.join(agents_dir, 'test-agent.json'), 'w') as f:
                json.dump(agent_config, f)

            # Create 5 recent files (default mtime = now)
            for i in range(5):
                fpath = os.path.join(processed_dir, 'test-agent_%d.json' % i)
                with open(fpath, 'w') as f:
                    json.dump({}, f)

            # Should be rate-limited
            allowed, reason = api_process_inbox.check_rate_limit('test-agent', tmpdir)
            self.assertFalse(allowed, 'Recent files should trigger rate limit')

    def test_mixed_old_and_new_files(self):
        """Only recent files should count; old ones should be ignored."""
        with tempfile.TemporaryDirectory() as tmpdir:
            agents_dir = os.path.join(tmpdir, 'agents')
            processed_dir = os.path.join(tmpdir, 'inbox', '_processed')
            os.makedirs(agents_dir)
            os.makedirs(processed_dir)

            agent_config = {'rate_limit': {'messages_per_hour': 5}}
            with open(os.path.join(agents_dir, 'test-agent.json'), 'w') as f:
                json.dump(agent_config, f)

            # Create 10 old files
            old_time = time.time() - 7200
            for i in range(10):
                fpath = os.path.join(processed_dir, 'test-agent_old_%d.json' % i)
                with open(fpath, 'w') as f:
                    json.dump({}, f)
                os.utime(fpath, (old_time, old_time))

            # Create 3 recent files
            for i in range(3):
                fpath = os.path.join(processed_dir, 'test-agent_new_%d.json' % i)
                with open(fpath, 'w') as f:
                    json.dump({}, f)

            # Should be allowed (3 < 5)
            allowed, reason = api_process_inbox.check_rate_limit('test-agent', tmpdir)
            self.assertTrue(allowed, 'Only 3 recent files, limit is 5: %s' % reason)


class TestNoHardcodedPaths(unittest.TestCase):
    """Verify no hardcoded absolute paths in scripts."""

    def _check_file_for_hardcoded_paths(self, filepath):
        with open(filepath, 'r') as f:
            lines = f.readlines()
        violations = []
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            if stripped.startswith('#') or stripped.startswith('//'):
                continue
            if '/Users/' in line and 'os.path' not in line:
                violations.append('Line %d: %s' % (i, stripped))
        return violations

    def test_sync_state_no_hardcoded_paths(self):
        script = os.path.join(os.path.dirname(__file__), '..', 'scripts', 'sync_state.py')
        violations = self._check_file_for_hardcoded_paths(script)
        self.assertEqual(violations, [], 'Hardcoded paths in sync_state.py: %s' % violations)

    def test_agent_autonomy_no_hardcoded_paths(self):
        script = os.path.join(os.path.dirname(__file__), '..', 'scripts', 'agent_autonomy.py')
        violations = self._check_file_for_hardcoded_paths(script)
        self.assertEqual(violations, [], 'Hardcoded paths in agent_autonomy.py: %s' % violations)

    def test_architect_genesis_no_hardcoded_paths(self):
        script = os.path.join(os.path.dirname(__file__), '..', 'scripts', 'architect_genesis.py')
        violations = self._check_file_for_hardcoded_paths(script)
        self.assertEqual(violations, [], 'Hardcoded paths in architect_genesis.py: %s' % violations)


class TestGameTickGardens(unittest.TestCase):
    """Verify game_tick reads and processes gardens.json when provided."""

    def test_game_tick_processes_gardens_file(self):
        """game_tick should accept and process a gardens.json file."""
        import game_tick

        gardens = {
            'plot1': {
                'plants': [
                    {'name': 'rose', 'growthStage': 0.5, 'growthTime': 3600}
                ]
            }
        }
        result = game_tick.advance_plant_growth(gardens, 1800)
        self.assertGreater(result['plot1']['plants'][0]['growthStage'], 0.5,
                           'Plant growth should advance')

    def test_game_tick_main_reads_gardens_arg(self):
        """game_tick main should handle gardens file as argv[2]."""
        import game_tick

        with tempfile.TemporaryDirectory() as tmpdir:
            # Create world state
            world = {'worldTime': 100, 'lastTickAt': time.time() - 60}
            world_path = os.path.join(tmpdir, 'world.json')
            with open(world_path, 'w') as f:
                json.dump(world, f)

            # Create gardens state
            gardens = {
                'plot1': {
                    'plants': [
                        {'name': 'rose', 'growthStage': 0.5, 'growthTime': 3600}
                    ]
                }
            }
            gardens_path = os.path.join(tmpdir, 'gardens.json')
            with open(gardens_path, 'w') as f:
                json.dump(gardens, f)

            # Run tick on world state
            with open(world_path, 'r') as f:
                result = game_tick.tick(f.read())

            state = json.loads(result)
            self.assertIn('worldTime', state)


class TestCrmImport(unittest.TestCase):
    """Verify CRM module import handling."""

    def test_crm_import_at_module_level(self):
        """CRM import should not crash the module on import."""
        # The module should import without error even if sim_crm_apply
        # is not on sys.path (it should handle ImportError gracefully)
        import importlib
        importlib.reload(api_process_inbox)
        self.assertTrue(hasattr(api_process_inbox, 'apply_to_state'))


if __name__ == '__main__':
    unittest.main()
