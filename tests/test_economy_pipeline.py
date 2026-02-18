#!/usr/bin/env python3
"""Tests for economy pipeline, build/compose handlers, discover fix, and agent join."""
import json
import os
import shutil
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))
from api_process_inbox import apply_to_state, load_json


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


def make_msg(msg_type, sender='agent_001', payload=None, zone='nexus'):
    return {
        'v': 1,
        'id': f'{sender}_test_{msg_type}',
        'ts': '2026-02-17T23:00:00Z',
        'seq': 0,
        'from': sender,
        'type': msg_type,
        'platform': 'api',
        'position': {'x': 0, 'y': 0, 'z': 0, 'zone': zone},
        'payload': payload or {},
    }


class TestCraftHandler(unittest.TestCase):
    def setUp(self):
        self.state_dir = make_state_dir()

    def tearDown(self):
        shutil.rmtree(self.state_dir)

    def test_craft_creates_transaction(self):
        msg = make_msg('craft', payload={'recipe': 'tool'})
        apply_to_state(msg, self.state_dir)
        econ = load_json(os.path.join(self.state_dir, 'economy.json'))
        self.assertTrue(len(econ['transactions']) > 0)
        txn = econ['transactions'][-1]
        self.assertEqual(txn['type'], 'craft')
        self.assertEqual(txn['from'], 'agent_001')

    def test_craft_creates_citizen(self):
        msg = make_msg('craft', payload={'recipe': 'ornament'})
        apply_to_state(msg, self.state_dir)
        world = load_json(os.path.join(self.state_dir, 'world.json'))
        self.assertIn('agent_001', world['citizens'])


class TestHarvestHandler(unittest.TestCase):
    def setUp(self):
        self.state_dir = make_state_dir()

    def tearDown(self):
        shutil.rmtree(self.state_dir)

    def test_harvest_creates_transaction(self):
        msg = make_msg('harvest', payload={'plot': 'plot_001'})
        apply_to_state(msg, self.state_dir)
        econ = load_json(os.path.join(self.state_dir, 'economy.json'))
        self.assertTrue(len(econ['transactions']) > 0)
        self.assertEqual(econ['transactions'][-1]['type'], 'harvest')

    def test_harvest_credits_balance(self):
        msg = make_msg('harvest', payload={'plot': 'plot_001'})
        apply_to_state(msg, self.state_dir)
        econ = load_json(os.path.join(self.state_dir, 'economy.json'))
        self.assertGreater(econ['balances'].get('agent_001', 0), 0)


class TestPlantHandler(unittest.TestCase):
    def setUp(self):
        self.state_dir = make_state_dir()

    def tearDown(self):
        shutil.rmtree(self.state_dir)

    def test_plant_creates_transaction(self):
        msg = make_msg('plant', payload={'species': 'tomato', 'plot': 'plot_005'})
        apply_to_state(msg, self.state_dir)
        econ = load_json(os.path.join(self.state_dir, 'economy.json'))
        self.assertTrue(len(econ['transactions']) > 0)
        self.assertEqual(econ['transactions'][-1]['type'], 'plant')


class TestGiftHandler(unittest.TestCase):
    def setUp(self):
        self.state_dir = make_state_dir()

    def tearDown(self):
        shutil.rmtree(self.state_dir)

    def test_gift_creates_transaction(self):
        msg = make_msg('gift', payload={'to': 'agent_002', 'item': 'flower', 'amount': 5})
        apply_to_state(msg, self.state_dir)
        econ = load_json(os.path.join(self.state_dir, 'economy.json'))
        self.assertTrue(len(econ['transactions']) > 0)
        txn = econ['transactions'][-1]
        self.assertEqual(txn['type'], 'gift')
        self.assertEqual(txn['to'], 'agent_002')

    def test_gift_adjusts_balances(self):
        # Give sender starting balance
        econ_path = os.path.join(self.state_dir, 'economy.json')
        econ = load_json(econ_path)
        econ['balances']['agent_001'] = 100
        with open(econ_path, 'w') as f:
            json.dump(econ, f)
        msg = make_msg('gift', payload={'to': 'agent_002', 'amount': 10})
        apply_to_state(msg, self.state_dir)
        econ = load_json(econ_path)
        self.assertEqual(econ['balances']['agent_001'], 90)
        self.assertEqual(econ['balances'].get('agent_002', 0), 10)


class TestTradeHandler(unittest.TestCase):
    def setUp(self):
        self.state_dir = make_state_dir()

    def tearDown(self):
        shutil.rmtree(self.state_dir)

    def test_trade_offer_creates_listing(self):
        msg = make_msg('trade_offer', payload={'item': 'tool', 'price': 10})
        apply_to_state(msg, self.state_dir)
        econ = load_json(os.path.join(self.state_dir, 'economy.json'))
        self.assertTrue(len(econ['listings']) > 0)
        self.assertEqual(econ['listings'][-1]['item'], 'tool')

    def test_buy_creates_transaction(self):
        msg = make_msg('buy', payload={'item': 'potion', 'price': 5, 'seller': 'agent_002'})
        apply_to_state(msg, self.state_dir)
        econ = load_json(os.path.join(self.state_dir, 'economy.json'))
        self.assertTrue(len(econ['transactions']) > 0)
        self.assertEqual(econ['transactions'][-1]['type'], 'buy')

    def test_sell_creates_transaction(self):
        msg = make_msg('sell', payload={'item': 'gem', 'price': 20, 'buyer': 'agent_003'})
        apply_to_state(msg, self.state_dir)
        econ = load_json(os.path.join(self.state_dir, 'economy.json'))
        self.assertTrue(len(econ['transactions']) > 0)
        self.assertEqual(econ['transactions'][-1]['type'], 'sell')


class TestBuildHandler(unittest.TestCase):
    def setUp(self):
        self.state_dir = make_state_dir()

    def tearDown(self):
        shutil.rmtree(self.state_dir)

    def test_build_adds_structure_to_world(self):
        msg = make_msg('build', payload={'structure': 'bench'}, zone='meadow')
        apply_to_state(msg, self.state_dir)
        world = load_json(os.path.join(self.state_dir, 'world.json'))
        structures = world.get('structures', {})
        self.assertTrue(len(structures) > 0)
        struct = list(structures.values())[0]
        self.assertEqual(struct['type'], 'bench')
        self.assertEqual(struct['zone'], 'meadow')

    def test_build_creates_citizen(self):
        msg = make_msg('build', payload={'structure': 'statue'})
        apply_to_state(msg, self.state_dir)
        world = load_json(os.path.join(self.state_dir, 'world.json'))
        self.assertIn('agent_001', world['citizens'])

    def test_build_sim_still_routes_to_crm(self):
        """Build with sim payload should NOT create a structure (existing CRM behavior)."""
        msg = make_msg('build', payload={'sim': 'crm', 'action': 'test'})
        apply_to_state(msg, self.state_dir)
        world = load_json(os.path.join(self.state_dir, 'world.json'))
        self.assertEqual(len(world.get('structures', {})), 0)


class TestComposeHandler(unittest.TestCase):
    def setUp(self):
        self.state_dir = make_state_dir()

    def tearDown(self):
        shutil.rmtree(self.state_dir)

    def test_compose_adds_creation_to_world(self):
        msg = make_msg('compose', payload={'title': 'Song of Dawn', 'type': 'song'})
        apply_to_state(msg, self.state_dir)
        world = load_json(os.path.join(self.state_dir, 'world.json'))
        creations = world.get('creations', [])
        self.assertTrue(len(creations) > 0)
        self.assertEqual(creations[-1]['title'], 'Song of Dawn')

    def test_compose_creates_transaction(self):
        msg = make_msg('compose', payload={'title': 'Poem', 'type': 'poem'})
        apply_to_state(msg, self.state_dir)
        econ = load_json(os.path.join(self.state_dir, 'economy.json'))
        self.assertTrue(len(econ['transactions']) > 0)


class TestDiscoverPayload(unittest.TestCase):
    def setUp(self):
        self.state_dir = make_state_dir()

    def tearDown(self):
        shutil.rmtree(self.state_dir)

    def test_discover_uses_name_field(self):
        msg = make_msg('discover', payload={'name': 'Ancient Ruin', 'description': 'A moss-covered ruin'})
        apply_to_state(msg, self.state_dir)
        disc = load_json(os.path.join(self.state_dir, 'discoveries.json'))
        entries = list(disc['discoveries'].values())
        self.assertEqual(entries[0]['name'], 'Ancient Ruin')
        self.assertEqual(entries[0]['description'], 'A moss-covered ruin')

    def test_discover_fallback_from_exploration(self):
        """If agent sends exploration field, handler should still work."""
        msg = make_msg('discover', payload={'exploration': 'constellation'})
        apply_to_state(msg, self.state_dir)
        disc = load_json(os.path.join(self.state_dir, 'discoveries.json'))
        entries = list(disc['discoveries'].values())
        self.assertTrue(len(entries) > 0)
        self.assertNotEqual(entries[0]['name'], 'Unknown')


class TestAgentJoin(unittest.TestCase):
    def setUp(self):
        self.state_dir = make_state_dir()

    def tearDown(self):
        shutil.rmtree(self.state_dir)

    def test_join_adds_to_players(self):
        msg = make_msg('join', sender='agent_050')
        apply_to_state(msg, self.state_dir)
        players = load_json(os.path.join(self.state_dir, 'players.json'))
        self.assertIn('agent_050', players['players'])


class TestAgentAutonomyJoin(unittest.TestCase):
    """Test that agent_autonomy.py injects join for new agents."""
    def test_first_action_is_join(self):
        from agent_autonomy import generate_agent_intentions
        agent = {
            'id': 'agent_test_99',
            'archetype': 'gardener',
            'intentions': ['plant', 'harvest'],
            'position': {'x': 0, 'y': 0, 'z': 0, 'zone': 'nexus'},
        }
        messages = generate_agent_intentions(agent, 2, inject_join=True)
        self.assertEqual(messages[0]['type'], 'join')
        self.assertEqual(messages[0]['from'], 'agent_test_99')
        # Subsequent messages are normal intentions
        self.assertIn(messages[1]['type'], ['plant', 'harvest'])


class TestTransactionCap(unittest.TestCase):
    def setUp(self):
        self.state_dir = make_state_dir()

    def tearDown(self):
        shutil.rmtree(self.state_dir)

    def test_transactions_capped_at_500(self):
        econ_path = os.path.join(self.state_dir, 'economy.json')
        econ = load_json(econ_path)
        econ['transactions'] = [{'type': 'old', 'ts': '2026-01-01'}] * 500
        with open(econ_path, 'w') as f:
            json.dump(econ, f)
        msg = make_msg('craft', payload={'recipe': 'tool'})
        apply_to_state(msg, self.state_dir)
        econ = load_json(econ_path)
        self.assertLessEqual(len(econ['transactions']), 500)


if __name__ == '__main__':
    unittest.main()
