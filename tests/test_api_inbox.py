#!/usr/bin/env python3
"""Tests for api_process_inbox.py"""
import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))
import api_process_inbox


def make_valid_message(**overrides):
    """Create a valid protocol message with optional overrides."""
    msg = {
        'v': 1,
        'id': 'test-uuid-001',
        'ts': '2026-02-16T12:00:00Z',
        'seq': 0,
        'from': 'test-agent',
        'type': 'say',
        'platform': 'api',
        'position': {'x': 0, 'y': 0, 'z': 0, 'zone': 'nexus'},
        'geo': None,
        'payload': {'text': 'Hello from test!'}
    }
    msg.update(overrides)
    return msg


class TestValidateMessage(unittest.TestCase):
    """Test protocol message validation."""

    def test_valid_message(self):
        msg = make_valid_message()
        valid, errors = api_process_inbox.validate_message(msg)
        self.assertTrue(valid, 'Expected valid, got errors: %s' % errors)

    def test_invalid_version(self):
        msg = make_valid_message(v=99)
        valid, errors = api_process_inbox.validate_message(msg)
        self.assertFalse(valid)
        self.assertTrue(any('version' in e for e in errors))

    def test_missing_id(self):
        msg = make_valid_message(id='')
        valid, errors = api_process_inbox.validate_message(msg)
        self.assertFalse(valid)

    def test_invalid_timestamp(self):
        msg = make_valid_message(ts='not-a-date')
        valid, errors = api_process_inbox.validate_message(msg)
        self.assertFalse(valid)
        self.assertTrue(any('ts' in e for e in errors))

    def test_negative_seq(self):
        msg = make_valid_message(seq=-1)
        valid, errors = api_process_inbox.validate_message(msg)
        self.assertFalse(valid)

    def test_invalid_type(self):
        msg = make_valid_message(type='invalid_type')
        valid, errors = api_process_inbox.validate_message(msg)
        self.assertFalse(valid)

    def test_invalid_platform(self):
        msg = make_valid_message(platform='xbox')
        valid, errors = api_process_inbox.validate_message(msg)
        self.assertFalse(valid)

    def test_missing_position_zone(self):
        msg = make_valid_message(position={'x': 0, 'y': 0, 'z': 0})
        valid, errors = api_process_inbox.validate_message(msg)
        self.assertFalse(valid)

    def test_non_object_not_valid(self):
        valid, errors = api_process_inbox.validate_message('not an object')
        self.assertFalse(valid)

    def test_all_valid_types(self):
        for t in ['say', 'shout', 'emote', 'move', 'warp', 'discover', 'join']:
            msg = make_valid_message(type=t)
            valid, errors = api_process_inbox.validate_message(msg)
            self.assertTrue(valid, 'Type %s should be valid, got: %s' % (t, errors))


class TestAPIRestrictions(unittest.TestCase):
    """Test API-specific restrictions."""

    def test_api_platform_required(self):
        msg = make_valid_message(platform='desktop')
        allowed, reason = api_process_inbox.check_api_restrictions(msg)
        self.assertFalse(allowed)
        self.assertIn('api', reason)

    def test_allowed_types(self):
        for t in ['say', 'shout', 'emote', 'move', 'warp', 'discover']:
            msg = make_valid_message(type=t)
            allowed, reason = api_process_inbox.check_api_restrictions(msg)
            self.assertTrue(allowed, 'Type %s should be allowed for API' % t)

    def test_restricted_types(self):
        for t in ['election_start', 'steward_moderate', 'reputation_adjust']:
            msg = make_valid_message(type=t)
            allowed, reason = api_process_inbox.check_api_restrictions(msg)
            self.assertFalse(allowed, 'Type %s should be restricted for API' % t)

    def test_text_length_limit(self):
        msg = make_valid_message(payload={'text': 'x' * 501})
        allowed, reason = api_process_inbox.check_api_restrictions(msg)
        self.assertFalse(allowed)
        self.assertIn('500', reason)

    def test_text_under_limit(self):
        msg = make_valid_message(payload={'text': 'x' * 500})
        allowed, reason = api_process_inbox.check_api_restrictions(msg)
        self.assertTrue(allowed)


class TestApplyToState(unittest.TestCase):
    """Test message application to state files."""

    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.state_dir = self.tmpdir
        # Create minimal state files
        self._write('chat.json', {'messages': []})
        self._write('world.json', {'zones': {}, 'citizens': {}})
        self._write('players.json', {'players': {}})
        self._write('discoveries.json', {'discoveries': {}})
        self._write('actions.json', {'actions': []})
        self._write('changes.json', {'changes': []})

    def _write(self, name, data):
        path = os.path.join(self.state_dir, name)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'w') as f:
            json.dump(data, f)

    def _read(self, name):
        path = os.path.join(self.state_dir, name)
        with open(path) as f:
            return json.load(f)

    def test_say_adds_to_chat(self):
        msg = make_valid_message(type='say')
        api_process_inbox.apply_to_state(msg, self.state_dir)
        chat = self._read('chat.json')
        self.assertEqual(len(chat['messages']), 1)
        self.assertEqual(chat['messages'][0]['type'], 'say')

    def test_move_updates_citizen(self):
        msg = make_valid_message(type='move', position={'x': 10, 'y': 0, 'z': 20, 'zone': 'gardens'})
        api_process_inbox.apply_to_state(msg, self.state_dir)
        world = self._read('world.json')
        self.assertIn('test-agent', world['citizens'])
        self.assertEqual(world['citizens']['test-agent']['position']['zone'], 'gardens')

    def test_warp_updates_zone(self):
        msg = make_valid_message(type='warp', payload={'zone': 'arena'})
        api_process_inbox.apply_to_state(msg, self.state_dir)
        world = self._read('world.json')
        self.assertEqual(world['citizens']['test-agent']['position']['zone'], 'arena')

    def test_discover_creates_entry(self):
        msg = make_valid_message(type='discover', payload={'name': 'Hidden Cave', 'description': 'A cave'})
        api_process_inbox.apply_to_state(msg, self.state_dir)
        disc = self._read('discoveries.json')
        self.assertTrue(len(disc['discoveries']) > 0)

    def test_join_creates_player(self):
        msg = make_valid_message(type='join')
        api_process_inbox.apply_to_state(msg, self.state_dir)
        players = self._read('players.json')
        self.assertIn('test-agent', players['players'])
        self.assertEqual(players['players']['test-agent']['platform'], 'api')

    def test_changes_recorded(self):
        msg = make_valid_message(type='say')
        api_process_inbox.apply_to_state(msg, self.state_dir)
        changes = self._read('changes.json')
        self.assertEqual(len(changes['changes']), 1)
        self.assertEqual(changes['changes'][0]['type'], 'say')
        self.assertEqual(changes['changes'][0]['platform'], 'api')


class TestProcessInbox(unittest.TestCase):
    """Test full inbox processing pipeline."""

    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.state_dir = self.tmpdir
        os.makedirs(os.path.join(self.state_dir, 'inbox', '_processed'))
        os.makedirs(os.path.join(self.state_dir, 'api'))
        self._write('chat.json', {'messages': []})
        self._write('world.json', {'zones': {}, 'citizens': {}})
        self._write('players.json', {'players': {}})
        self._write('discoveries.json', {'discoveries': {}})
        self._write('actions.json', {'actions': []})
        self._write('changes.json', {'changes': []})

    def _write(self, name, data):
        path = os.path.join(self.state_dir, name)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'w') as f:
            json.dump(data, f)

    def _drop_inbox(self, filename, data):
        path = os.path.join(self.state_dir, 'inbox', filename)
        with open(path, 'w') as f:
            json.dump(data, f)

    def test_process_valid_message(self):
        msg = make_valid_message()
        self._drop_inbox('test-agent_001.json', msg)
        results = api_process_inbox.process_inbox(self.state_dir)
        self.assertEqual(results['processed'], 1)
        self.assertEqual(results['rejected'], 0)
        # File should be moved to _processed
        self.assertFalse(os.path.exists(os.path.join(self.state_dir, 'inbox', 'test-agent_001.json')))
        self.assertTrue(os.path.exists(os.path.join(self.state_dir, 'inbox', '_processed', 'test-agent_001.json')))

    def test_process_invalid_message(self):
        msg = make_valid_message(v=99)
        self._drop_inbox('bad_001.json', msg)
        results = api_process_inbox.process_inbox(self.state_dir)
        self.assertEqual(results['processed'], 0)
        self.assertEqual(results['rejected'], 1)

    def test_process_empty_inbox(self):
        results = api_process_inbox.process_inbox(self.state_dir)
        self.assertEqual(results['processed'], 0)
        self.assertEqual(results['rejected'], 0)

    def test_process_malformed_json(self):
        path = os.path.join(self.state_dir, 'inbox', 'bad.json')
        with open(path, 'w') as f:
            f.write('{invalid json')
        results = api_process_inbox.process_inbox(self.state_dir)
        self.assertEqual(results['rejected'], 1)


if __name__ == '__main__':
    unittest.main()
