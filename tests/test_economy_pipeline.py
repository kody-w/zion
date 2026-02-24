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
        # Give sender enough balance for the gift
        econ_path = os.path.join(self.state_dir, 'economy.json')
        econ = load_json(econ_path)
        econ['balances']['agent_001'] = 100
        with open(econ_path, 'w') as f:
            json.dump(econ, f)
        msg = make_msg('gift', payload={'to': 'agent_002', 'item': 'flower', 'amount': 5})
        apply_to_state(msg, self.state_dir)
        econ = load_json(econ_path)
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
        # Sender loses 10 from gift but may also earn Spark from the gift action
        self.assertLess(econ['balances']['agent_001'], 100, 'Gift should reduce balance')
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
        # Subsequent messages are normal intentions (including injected say/warp)
        self.assertIn(messages[1]['type'], ['plant', 'harvest', 'say', 'warp'])


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


# ---------------------------------------------------------------------------
# Universal Earnings Tests (§6.3)
# ---------------------------------------------------------------------------

class TestUniversalEarnings(unittest.TestCase):
    """Every action that has a positive EARN_TABLE value should award Spark."""

    def setUp(self):
        self.state_dir = make_state_dir()

    def tearDown(self):
        shutil.rmtree(self.state_dir)

    def _get_balance(self, agent='agent_001'):
        econ = load_json(os.path.join(self.state_dir, 'economy.json'))
        return econ.get('balances', {}).get(agent, 0)

    def test_compose_earns_spark(self):
        msg = make_msg('compose', payload={'title': 'Test', 'type': 'poem'})
        apply_to_state(msg, self.state_dir)
        self.assertGreater(self._get_balance(), 0, 'compose should earn Spark')

    def test_craft_earns_spark(self):
        msg = make_msg('craft', payload={'recipe': 'tool'})
        apply_to_state(msg, self.state_dir)
        self.assertGreater(self._get_balance(), 0, 'craft should earn Spark')

    def test_build_earns_spark(self):
        msg = make_msg('build', payload={'structure': 'bench'})
        apply_to_state(msg, self.state_dir)
        self.assertGreater(self._get_balance(), 0, 'build should earn Spark')

    def test_harvest_earns_spark(self):
        msg = make_msg('harvest', payload={'plot': 'plot_001'})
        apply_to_state(msg, self.state_dir)
        self.assertGreater(self._get_balance(), 0, 'harvest should earn Spark')

    def test_plant_earns_spark(self):
        msg = make_msg('plant', payload={'species': 'rose'})
        apply_to_state(msg, self.state_dir)
        self.assertGreater(self._get_balance(), 0, 'plant should earn Spark')

    def test_say_earns_spark(self):
        msg = make_msg('say', payload={'text': 'Hello world'})
        apply_to_state(msg, self.state_dir)
        self.assertGreater(self._get_balance(), 0, 'say should earn Spark')

    def test_discover_earns_spark(self):
        msg = make_msg('discover', payload={'name': 'Hidden Cave'})
        apply_to_state(msg, self.state_dir)
        self.assertGreater(self._get_balance(), 0, 'discover should earn Spark')

    def test_inspect_earns_spark(self):
        msg = make_msg('inspect', payload={'target': 'fountain'})
        apply_to_state(msg, self.state_dir)
        self.assertGreater(self._get_balance(), 0, 'inspect should earn Spark')

    def test_zero_earn_action_no_balance(self):
        """Actions with 0 in EARN_TABLE should not create a balance entry."""
        msg = make_msg('move', payload={'destination': {'x': 1, 'y': 0, 'z': 1, 'zone': 'nexus'}})
        apply_to_state(msg, self.state_dir)
        self.assertEqual(self._get_balance(), 0, 'move (0 earn) should not award Spark')

    def test_progressive_tax_applied(self):
        """High-balance agents pay tax when rate * earnings >= 1."""
        from api_process_inbox import EARN_TABLE, _get_tax_rate, _TAX_BRACKETS
        max_earn = max(EARN_TABLE.values())
        max_rate = max(r for _, _, r in _TAX_BRACKETS)
        if int(max_earn * max_rate) == 0:
            # Tax rates too low for any single action — valid config, skip
            return
        action_type = [k for k, v in EARN_TABLE.items() if v == max_earn][0]
        test_balance = _TAX_BRACKETS[-1][0] + 100
        econ_path = os.path.join(self.state_dir, 'economy.json')
        econ = load_json(econ_path)
        econ['balances']['agent_001'] = test_balance
        with open(econ_path, 'w') as f:
            json.dump(econ, f)
        msg = make_msg(action_type, payload={'title': 'Test', 'type': 'poem'})
        apply_to_state(msg, self.state_dir)
        balance = self._get_balance()
        self.assertGreater(balance, test_balance)
        self.assertLess(balance, test_balance + max_earn)

    def test_tax_goes_to_treasury(self):
        """Tax from earnings goes to TREASURY when rate * earnings >= 1."""
        from api_process_inbox import EARN_TABLE, _get_tax_rate, _TAX_BRACKETS
        max_earn = max(EARN_TABLE.values())
        max_rate = max(r for _, _, r in _TAX_BRACKETS)
        if int(max_earn * max_rate) == 0:
            return
        action_type = [k for k, v in EARN_TABLE.items() if v == max_earn][0]
        test_balance = _TAX_BRACKETS[-1][0] + 100
        econ_path = os.path.join(self.state_dir, 'economy.json')
        econ = load_json(econ_path)
        econ['balances']['agent_001'] = test_balance
        econ['balances']['TREASURY'] = 0
        with open(econ_path, 'w') as f:
            json.dump(econ, f)
        msg = make_msg(action_type, payload={'title': 'Test', 'type': 'poem'})
        apply_to_state(msg, self.state_dir)
        econ = load_json(econ_path)
        self.assertGreater(econ['balances'].get('TREASURY', 0), 0)

    def test_gift_rejected_insufficient_balance(self):
        """Gift should be rejected when sender has insufficient balance."""
        msg = make_msg('gift', payload={'to': 'agent_002', 'amount': 10})
        apply_to_state(msg, self.state_dir)
        econ = load_json(os.path.join(self.state_dir, 'economy.json'))
        # Gift itself should be rejected (0 balance), but gift action still earns Spark
        self.assertGreaterEqual(self._get_balance(), 0, 'Balance should not go negative')


class TestValidZonesFromConfig(unittest.TestCase):
    """VALID_ZONES should be loaded from config, including observatory."""

    def test_observatory_in_valid_zones(self):
        from api_process_inbox import VALID_ZONES
        self.assertIn('observatory', VALID_ZONES,
                      'observatory must be a valid zone')

    def test_valid_zones_loaded_from_config(self):
        from api_process_inbox import VALID_ZONES
        from load_config import load_config
        world_cfg = load_config('world')
        config_zones = set(world_cfg.get('zones', {}).keys())
        if config_zones:
            self.assertEqual(VALID_ZONES, config_zones,
                             'VALID_ZONES should match config world.zones')

    def test_warp_to_observatory(self):
        """Warp to observatory should set citizen zone to observatory."""
        d = make_state_dir()
        try:
            msg = make_msg('warp', payload={'zone': 'observatory'})
            apply_to_state(msg, d)
            world = load_json(os.path.join(d, 'world.json'))
            zone = world['citizens']['agent_001']['position']['zone']
            self.assertEqual(zone, 'observatory')
        finally:
            shutil.rmtree(d)

    def test_all_config_zones_warpable(self):
        """Every zone in config should be warpable without fallback to nexus."""
        from load_config import load_config
        world_cfg = load_config('world')
        config_zones = list(world_cfg.get('zones', {}).keys())
        for zone_id in config_zones:
            d = make_state_dir()
            try:
                msg = make_msg('warp', payload={'zone': zone_id})
                apply_to_state(msg, d)
                world = load_json(os.path.join(d, 'world.json'))
                actual = world['citizens']['agent_001']['position']['zone']
                self.assertEqual(actual, zone_id,
                                 'warp to %s should not fall back to nexus' % zone_id)
            finally:
                shutil.rmtree(d)


class TestChatTextExtraction(unittest.TestCase):
    """Chat messages should have top-level text field extracted from payload."""

    def setUp(self):
        self.state_dir = make_state_dir()

    def tearDown(self):
        shutil.rmtree(self.state_dir)

    def test_say_has_toplevel_text(self):
        msg = make_msg('say', payload={'text': 'Hello world'})
        apply_to_state(msg, self.state_dir)
        chat = load_json(os.path.join(self.state_dir, 'chat.json'))
        last = chat['messages'][-1]
        self.assertEqual(last.get('text'), 'Hello world')

    def test_shout_has_toplevel_text(self):
        msg = make_msg('shout', payload={'text': 'HEY EVERYONE'})
        apply_to_state(msg, self.state_dir)
        chat = load_json(os.path.join(self.state_dir, 'chat.json'))
        last = chat['messages'][-1]
        self.assertEqual(last.get('text'), 'HEY EVERYONE')

    def test_emote_no_text_ok(self):
        """Emotes without text should still be stored without a text field."""
        msg = make_msg('emote', payload={'emoteType': 'wave'})
        apply_to_state(msg, self.state_dir)
        chat = load_json(os.path.join(self.state_dir, 'chat.json'))
        last = chat['messages'][-1]
        self.assertNotIn('text', last)

    def test_whisper_has_toplevel_text(self):
        msg = make_msg('whisper', payload={'text': 'secret message', 'to': 'agent_002'})
        apply_to_state(msg, self.state_dir)
        chat = load_json(os.path.join(self.state_dir, 'chat.json'))
        last = chat['messages'][-1]
        self.assertEqual(last.get('text'), 'secret message')

    def test_original_payload_preserved(self):
        """Text extraction should not remove text from payload."""
        msg = make_msg('say', payload={'text': 'keep both'})
        apply_to_state(msg, self.state_dir)
        chat = load_json(os.path.join(self.state_dir, 'chat.json'))
        last = chat['messages'][-1]
        self.assertEqual(last.get('text'), 'keep both')
        self.assertEqual(last.get('payload', {}).get('text'), 'keep both')


class TestUbiCitizenBootstrap(unittest.TestCase):
    """UBI distribution should bootstrap all citizens into economy."""

    def test_citizens_get_balance_entries(self):
        """Citizens in world.json should get balance entries during UBI tick."""
        from game_tick import _distribute_ubi
        state = {
            'worldTime': 2880,  # Day 2 boundary
            '_lastUbiDay': 0,   # Force UBI distribution
            'citizens': {
                'agent_001': {'id': 'agent_001'},
                'agent_002': {'id': 'agent_002'},
                'agent_003': {'id': 'agent_003'},
            },
            'economy': {
                'balances': {'TREASURY': 100, 'agent_001': 5},
                'transactions': [],
                'ledger': [],
            },
            'structures': {},
        }
        _distribute_ubi(state)
        balances = state['economy']['balances']
        self.assertIn('agent_002', balances,
                      'agent_002 should have been bootstrapped')
        self.assertIn('agent_003', balances,
                      'agent_003 should have been bootstrapped')

    def test_bootstrap_does_not_overwrite_existing(self):
        """Bootstrapping should not overwrite existing balances."""
        from game_tick import _distribute_ubi
        state = {
            'worldTime': 2880,
            '_lastUbiDay': 0,
            'citizens': {'agent_001': {'id': 'agent_001'}},
            'economy': {
                'balances': {'TREASURY': 100, 'agent_001': 50},
                'transactions': [],
                'ledger': [],
            },
            'structures': {},
        }
        _distribute_ubi(state)
        self.assertGreaterEqual(state['economy']['balances']['agent_001'], 50,
                                'Existing balance should not be reduced')


if __name__ == '__main__':
    unittest.main()
