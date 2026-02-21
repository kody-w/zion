#!/usr/bin/env python3
"""Integration tests for the ZION pipeline: agent autonomy, inbox processing, rate limiting, and state updates.

Covers issues identified in the Feb 18 2026 incident analysis:
- buy/sell API restriction handling
- Rate limiting accuracy (filename timestamps vs mtime)
- inspect/teach message handling
- Agent autonomy output validation
- Full pipeline: autonomy -> inbox -> process -> state
- Dict-type guards for economy state (regression)
- Concurrent workflow safety
"""
import json
import os
import shutil
import sys
import tempfile
import time
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))
from api_process_inbox import (
    validate_message, check_api_restrictions, check_rate_limit,
    apply_to_state, process_inbox, load_json, save_json,
    API_ALLOWED_TYPES, MESSAGE_TYPES
)
from agent_autonomy import generate_agent_intentions, activate_agents


def make_state_dir():
    """Create a temp state dir with minimal JSON files."""
    d = tempfile.mkdtemp()
    for name, content in [
        ('world.json', {'worldTime': 100, 'dayPhase': 'day', 'citizens': {}}),
        ('economy.json', {'balances': {}, 'transactions': [], 'listings': []}),
        ('chat.json', {'messages': []}),
        ('changes.json', {'changes': []}),
        ('players.json', {'players': {}}),
        ('discoveries.json', {'discoveries': {}}),
        ('actions.json', {'actions': []}),
    ]:
        with open(os.path.join(d, name), 'w') as f:
            json.dump(content, f)
    os.makedirs(os.path.join(d, 'inbox', '_processed'), exist_ok=True)
    return d


def make_msg(msg_type, sender='agent_001', payload=None, zone='nexus', ts=None):
    return {
        'v': 1,
        'id': '%s_test_%s' % (sender, msg_type),
        'ts': ts or '2026-02-17T23:00:00Z',
        'seq': 0,
        'from': sender,
        'type': msg_type,
        'platform': 'api',
        'position': {'x': 0, 'y': 0, 'z': 0, 'zone': zone},
        'payload': payload or {},
    }


# ─── Buy/Sell API Restrictions ───────────────────────────────

class TestBuySellAllowed(unittest.TestCase):
    """buy and sell must be in API_ALLOWED_TYPES so merchant agents can trade."""

    def test_buy_in_allowed_types(self):
        self.assertIn('buy', API_ALLOWED_TYPES,
                       'buy must be in API_ALLOWED_TYPES for merchant agents')

    def test_sell_in_allowed_types(self):
        self.assertIn('sell', API_ALLOWED_TYPES,
                       'sell must be in API_ALLOWED_TYPES for merchant agents')

    def test_buy_message_passes_restrictions(self):
        msg = make_msg('buy', payload={'item': 'potion', 'seller': 'agent_002'})
        allowed, reason = check_api_restrictions(msg)
        self.assertTrue(allowed, 'buy should pass API restrictions: %s' % reason)

    def test_sell_message_passes_restrictions(self):
        msg = make_msg('sell', payload={'item': 'gem', 'buyer': 'agent_003'})
        allowed, reason = check_api_restrictions(msg)
        self.assertTrue(allowed, 'sell should pass API restrictions: %s' % reason)


# ─── Inspect/Teach Handling ───────────────────────────────────

class TestInspectTeachHandling(unittest.TestCase):
    """inspect and teach messages should be allowed and handled gracefully."""

    def setUp(self):
        self.state_dir = make_state_dir()

    def tearDown(self):
        shutil.rmtree(self.state_dir)

    def test_inspect_in_allowed_types(self):
        self.assertIn('inspect', API_ALLOWED_TYPES)

    def test_teach_in_allowed_types(self):
        self.assertIn('teach', API_ALLOWED_TYPES)

    def test_inspect_passes_restrictions(self):
        msg = make_msg('inspect', payload={'target': 'fountain_001'})
        allowed, reason = check_api_restrictions(msg)
        self.assertTrue(allowed, 'inspect should pass: %s' % reason)

    def test_inspect_records_in_changes(self):
        msg = make_msg('inspect', payload={'target': 'ancient_tree'})
        apply_to_state(msg, self.state_dir)
        changes = load_json(os.path.join(self.state_dir, 'changes.json'))
        found = any(c['type'] == 'inspect' for c in changes.get('changes', []))
        self.assertTrue(found, 'inspect should be recorded in changes.json')

    def test_teach_records_in_changes(self):
        msg = make_msg('teach', payload={'skill': 'foraging'})
        apply_to_state(msg, self.state_dir)
        changes = load_json(os.path.join(self.state_dir, 'changes.json'))
        found = any(c['type'] == 'teach' for c in changes.get('changes', []))
        self.assertTrue(found, 'teach should be recorded in changes.json')


# ─── Rate Limiting ────────────────────────────────────────────

class TestRateLimiting(unittest.TestCase):
    """Rate limiting should use filename timestamps, not file mtime."""

    def setUp(self):
        self.state_dir = make_state_dir()

    def tearDown(self):
        shutil.rmtree(self.state_dir)

    def test_under_rate_limit_allows(self):
        allowed, reason = check_rate_limit('agent_new', self.state_dir)
        self.assertTrue(allowed, 'Agent with no history should be allowed')

    def test_rate_limit_counts_recent_files(self):
        """Agents with many recent processed files should be rate limited."""
        processed_dir = os.path.join(self.state_dir, 'inbox', '_processed')
        # Use a timestamp that's "now" so it falls within the 1-hour window
        from datetime import datetime as dt, timezone as tz
        now_ts = dt.now(tz.utc).strftime('%Y%m%d%H%M%S')
        # Create 31 recent processed files (exceeds 30/hour default)
        for i in range(31):
            fname = 'agent_spam_%s_%02d.json' % (now_ts, i)
            fpath = os.path.join(processed_dir, fname)
            with open(fpath, 'w') as f:
                json.dump({}, f)
        allowed, reason = check_rate_limit('agent_spam', self.state_dir)
        self.assertFalse(allowed, 'Agent with 31 recent messages should be rate limited')
        self.assertIn('Rate limit', reason)

    def test_old_files_not_counted(self):
        """Files with old mtime should not count toward rate limit."""
        processed_dir = os.path.join(self.state_dir, 'inbox', '_processed')
        old_time = time.time() - 7200  # 2 hours ago
        for i in range(31):
            fname = 'agent_old_%s_%02d.json' % ('20260217210000', i)
            fpath = os.path.join(processed_dir, fname)
            with open(fpath, 'w') as f:
                json.dump({}, f)
            os.utime(fpath, (old_time, old_time))
        allowed, reason = check_rate_limit('agent_old', self.state_dir)
        self.assertTrue(allowed, 'Old files should not trigger rate limit')


# ─── Agent Autonomy Output Validation ────────────────────────

class TestAgentAutonomyOutput(unittest.TestCase):
    """All messages from agent_autonomy must be valid protocol messages."""

    def test_generated_messages_are_valid(self):
        agent = {
            'id': 'agent_test_042',
            'archetype': 'gardener',
            'intentions': ['say', 'plant', 'harvest', 'emote'],
            'position': {'x': 10, 'y': 0, 'z': 20, 'zone': 'gardens'},
        }
        messages = generate_agent_intentions(agent, 3, inject_join=True)
        for msg in messages:
            valid, errors = validate_message(msg)
            self.assertTrue(valid, 'Agent message invalid: %s' % errors)

    def test_all_generated_types_are_api_allowed(self):
        """Every message type from agent autonomy must be in API_ALLOWED_TYPES."""
        agent = {
            'id': 'agent_test_043',
            'archetype': 'explorer',
            'intentions': ['say', 'move', 'discover', 'emote', 'intention_set'],
            'position': {'x': 0, 'y': 0, 'z': 0, 'zone': 'wilds'},
        }
        messages = generate_agent_intentions(agent, 3, inject_join=True)
        for msg in messages:
            self.assertIn(msg['type'], API_ALLOWED_TYPES,
                          'Type "%s" not in API_ALLOWED_TYPES' % msg['type'])

    def test_agent_says_have_text(self):
        agent = {
            'id': 'agent_test_044',
            'archetype': 'storyteller',
            'intentions': ['say'],
            'position': {'x': 0, 'y': 0, 'z': 0, 'zone': 'nexus'},
        }
        messages = generate_agent_intentions(agent, 1)
        for msg in messages:
            if msg['type'] == 'say':
                self.assertTrue(len(msg['payload'].get('text', '')) > 0,
                                'say messages must have non-empty text')

    def test_activate_agents_produces_valid_messages(self):
        agents_data = {
            'agents': [
                {
                    'id': 'agent_%03d' % i,
                    'archetype': ['gardener', 'builder', 'merchant'][i % 3],
                    'intentions': ['say', 'plant', 'harvest', 'build', 'craft'],
                    'position': {'x': i, 'y': 0, 'z': i, 'zone': 'nexus'},
                }
                for i in range(20)
            ]
        }
        messages = activate_agents(agents_data, num_activate=5)
        self.assertTrue(len(messages) > 0, 'Should generate some messages')
        for msg in messages:
            valid, errors = validate_message(msg)
            self.assertTrue(valid, 'activate_agents message invalid: %s' % errors)
            allowed, reason = check_api_restrictions(msg)
            self.assertTrue(allowed, 'activate_agents message restricted: %s' % reason)

    def test_all_archetypes_generate_valid_messages(self):
        archetypes = ['gardener', 'builder', 'storyteller', 'merchant',
                      'explorer', 'teacher', 'musician', 'healer',
                      'philosopher', 'artist']
        for archetype in archetypes:
            agent = {
                'id': 'agent_test_%s' % archetype,
                'archetype': archetype,
                'intentions': ['say', 'emote'],
                'position': {'x': 0, 'y': 0, 'z': 0, 'zone': 'nexus'},
            }
            messages = generate_agent_intentions(agent, 2, inject_join=True)
            for msg in messages:
                valid, errors = validate_message(msg)
                self.assertTrue(valid,
                                '%s archetype message invalid: %s' % (archetype, errors))


# ─── Dict-Type Guards (Regression) ───────────────────────────

class TestDictTypeGuards(unittest.TestCase):
    """Economy state fields must not crash when they are dicts instead of lists.
    Regression test for the Feb 18 'dict has no attribute append' bug."""

    def setUp(self):
        self.state_dir = make_state_dir()

    def tearDown(self):
        shutil.rmtree(self.state_dir)

    def test_listings_as_dict_handled(self):
        """trade_offer should work even if listings is a dict (corrupted state)."""
        econ_path = os.path.join(self.state_dir, 'economy.json')
        econ = load_json(econ_path)
        econ['listings'] = {'old_listing': {'item': 'rock'}}  # Corrupted to dict
        save_json(econ_path, econ)
        msg = make_msg('trade_offer', payload={'item': 'tool', 'price': 10})
        # Should not raise
        apply_to_state(msg, self.state_dir)
        econ = load_json(econ_path)
        self.assertIsInstance(econ['listings'], list)

    def test_creations_as_dict_handled(self):
        """compose should work even if creations is a dict (corrupted state)."""
        world_path = os.path.join(self.state_dir, 'world.json')
        world = load_json(world_path)
        world['creations'] = {'old_creation': {'title': 'lost poem'}}  # Corrupted
        save_json(world_path, world)
        msg = make_msg('compose', payload={'title': 'New Song', 'type': 'song'})
        apply_to_state(msg, self.state_dir)
        world = load_json(world_path)
        self.assertIsInstance(world['creations'], list)

    def test_structures_as_list_handled(self):
        """build should work even if structures is a list (corrupted state)."""
        world_path = os.path.join(self.state_dir, 'world.json')
        world = load_json(world_path)
        world['structures'] = [{'id': 'old'}]  # Corrupted to list
        save_json(world_path, world)
        msg = make_msg('build', payload={'structure': 'bench'})
        apply_to_state(msg, self.state_dir)
        world = load_json(world_path)
        self.assertIsInstance(world['structures'], dict)


# ─── Full Pipeline Integration ────────────────────────────────

class TestFullPipeline(unittest.TestCase):
    """End-to-end: drop messages in inbox, process, verify state changes."""

    def setUp(self):
        self.state_dir = make_state_dir()

    def tearDown(self):
        shutil.rmtree(self.state_dir)

    def test_full_pipeline_join_say_build(self):
        """Simulate an agent joining, talking, and building."""
        inbox_dir = os.path.join(self.state_dir, 'inbox')

        # Drop 3 messages in inbox
        messages = [
            make_msg('join', sender='agent_pipeline', ts='2026-02-17T23:00:01Z'),
            make_msg('say', sender='agent_pipeline',
                     payload={'text': 'Hello world!'},
                     ts='2026-02-17T23:00:02Z'),
            make_msg('build', sender='agent_pipeline',
                     payload={'structure': 'fountain'},
                     ts='2026-02-17T23:00:03Z'),
        ]
        for i, msg in enumerate(messages):
            msg['id'] = 'agent_pipeline_test_%02d' % i
            msg['seq'] = i
            fname = 'agent_pipeline_20260217230000_%02d.json' % i
            with open(os.path.join(inbox_dir, fname), 'w') as f:
                json.dump(msg, f)

        # Process
        results = process_inbox(self.state_dir)
        self.assertEqual(results['processed'], 3)
        self.assertEqual(results['rejected'], 0)

        # Verify state
        players = load_json(os.path.join(self.state_dir, 'players.json'))
        self.assertIn('agent_pipeline', players['players'])

        chat = load_json(os.path.join(self.state_dir, 'chat.json'))
        self.assertTrue(any(m.get('from') == 'agent_pipeline'
                            for m in chat['messages']))

        world = load_json(os.path.join(self.state_dir, 'world.json'))
        self.assertTrue(len(world.get('structures', {})) > 0)

    def test_pipeline_rejects_invalid_version(self):
        inbox_dir = os.path.join(self.state_dir, 'inbox')
        bad_msg = make_msg('say', payload={'text': 'bad'})
        bad_msg['v'] = 99
        with open(os.path.join(inbox_dir, 'bad_version.json'), 'w') as f:
            json.dump(bad_msg, f)
        results = process_inbox(self.state_dir)
        self.assertEqual(results['rejected'], 1)
        self.assertEqual(results['processed'], 0)

    def test_pipeline_moves_processed_files(self):
        inbox_dir = os.path.join(self.state_dir, 'inbox')
        msg = make_msg('join', sender='agent_move_test')
        with open(os.path.join(inbox_dir, 'move_test.json'), 'w') as f:
            json.dump(msg, f)
        process_inbox(self.state_dir)
        # Original should be gone
        self.assertFalse(os.path.exists(os.path.join(inbox_dir, 'move_test.json')))
        # Should be in _processed
        processed_dir = os.path.join(inbox_dir, '_processed')
        self.assertTrue(os.path.exists(os.path.join(processed_dir, 'move_test.json')))

    def test_pipeline_handles_empty_inbox(self):
        results = process_inbox(self.state_dir)
        self.assertEqual(results['processed'], 0)
        self.assertEqual(results['rejected'], 0)


# ─── Protocol Completeness ────────────────────────────────────

class TestProtocolCompleteness(unittest.TestCase):
    """API_ALLOWED_TYPES should be a subset of MESSAGE_TYPES."""

    def test_allowed_types_subset_of_message_types(self):
        invalid = API_ALLOWED_TYPES - MESSAGE_TYPES
        self.assertEqual(len(invalid), 0,
                         'API_ALLOWED_TYPES has types not in MESSAGE_TYPES: %s' % invalid)


if __name__ == '__main__':
    unittest.main()
