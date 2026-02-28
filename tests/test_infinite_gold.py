#!/usr/bin/env python3
"""Regression test for infinite gold exploit (universal earnings guard).

Root cause: commit c9c33145 added a universal earnings block at the end of
apply_to_state() that awarded Spark for every action unconditionally — even
failed actions and pure transfers. This allowed:
  1. Failed gifts earning Spark (0-cost, free money)
  2. Gift farming (gift costs 1, earns 6 = net +5 per action)
  3. Zero-cost action spam to farm Spark without bound

Fix: action_ok flag + _TRANSFER_TYPES exclusion set.
"""
import json
import os
import shutil
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))
from api_process_inbox import apply_to_state, load_json


def make_state_dir(balances=None):
    """Create a temp state dir with minimal JSON files."""
    d = tempfile.mkdtemp()
    econ = {'balances': balances or {}, 'transactions': [], 'listings': []}
    for name, content in [
        ('world.json', {'worldTime': 100, 'dayPhase': 'day', 'citizens': {}}),
        ('economy.json', econ),
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
        'id': '%s_test_%s' % (sender, msg_type),
        'ts': '2026-02-17T23:00:00Z',
        'seq': 0,
        'from': sender,
        'type': msg_type,
        'platform': 'api',
        'position': {'x': 0, 'y': 0, 'z': 0, 'zone': zone},
        'payload': payload or {},
    }


def get_balance(state_dir, player_id):
    econ = load_json(os.path.join(state_dir, 'economy.json'))
    return econ.get('balances', {}).get(player_id, 0)


def total_spark(state_dir):
    """Sum of all non-system balances."""
    econ = load_json(os.path.join(state_dir, 'economy.json'))
    return sum(v for k, v in econ.get('balances', {}).items()
               if k not in ('TREASURY', 'SYSTEM'))


class TestFailedActionNoEarnings(unittest.TestCase):
    """A failed action must NOT award Spark."""

    def setUp(self):
        self.state_dir = make_state_dir(balances={'agent_001': 0})

    def tearDown(self):
        shutil.rmtree(self.state_dir)

    def test_failed_gift_earns_nothing(self):
        """Player with 0 Spark sends a gift — should stay at 0."""
        msg = make_msg('gift', payload={'amount': 1, 'to': 'agent_002'})
        apply_to_state(msg, self.state_dir)
        bal = get_balance(self.state_dir, 'agent_001')
        self.assertEqual(bal, 0, 'Failed gift should not award Spark (got %d)' % bal)

    def test_failed_gift_no_spark_creation(self):
        """Failed gift must not create Spark from nothing."""
        before = total_spark(self.state_dir)
        msg = make_msg('gift', payload={'amount': 5, 'to': 'agent_002'})
        apply_to_state(msg, self.state_dir)
        after = total_spark(self.state_dir)
        self.assertEqual(before, after,
                         'Total Spark changed on failed gift: %d -> %d' % (before, after))


class TestTransferNoEarnings(unittest.TestCase):
    """Transfer actions (gift, buy, sell) must NOT earn Spark."""

    def setUp(self):
        self.state_dir = make_state_dir(balances={'agent_001': 100, 'agent_002': 100})

    def tearDown(self):
        shutil.rmtree(self.state_dir)

    def test_gift_no_net_spark_creation(self):
        """Successful gift must not create Spark — total supply stays constant."""
        before = total_spark(self.state_dir)
        msg = make_msg('gift', payload={'amount': 1, 'to': 'agent_002'})
        apply_to_state(msg, self.state_dir)
        after = total_spark(self.state_dir)
        self.assertEqual(before, after,
                         'Gift created Spark from nothing: %d -> %d' % (before, after))

    def test_buy_no_earnings(self):
        """Buy action must not award Spark to buyer."""
        bal_before = get_balance(self.state_dir, 'agent_001')
        msg = make_msg('buy', payload={'item': 'sword', 'seller': 'agent_002'})
        apply_to_state(msg, self.state_dir)
        bal_after = get_balance(self.state_dir, 'agent_001')
        self.assertEqual(bal_before, bal_after,
                         'Buy should not award Spark: %d -> %d' % (bal_before, bal_after))

    def test_sell_no_earnings(self):
        """Sell action must not award Spark to seller."""
        bal_before = get_balance(self.state_dir, 'agent_001')
        msg = make_msg('sell', payload={'item': 'sword', 'buyer': 'agent_002'})
        apply_to_state(msg, self.state_dir)
        bal_after = get_balance(self.state_dir, 'agent_001')
        self.assertEqual(bal_before, bal_after,
                         'Sell should not award Spark: %d -> %d' % (bal_before, bal_after))


class TestGiftFarmingBlocked(unittest.TestCase):
    """Gift farming exploit: two players exchanging gifts must not grow supply."""

    def setUp(self):
        self.state_dir = make_state_dir(balances={'alice': 10, 'bob': 10})

    def tearDown(self):
        shutil.rmtree(self.state_dir)

    def test_gift_exchange_no_inflation(self):
        """10 rounds of gift exchange must not increase total Spark."""
        initial_total = total_spark(self.state_dir)

        for i in range(10):
            msg_a = make_msg('gift', sender='alice',
                             payload={'amount': 1, 'to': 'bob'})
            msg_a['id'] = 'alice_gift_%d' % i
            apply_to_state(msg_a, self.state_dir)

            msg_b = make_msg('gift', sender='bob',
                             payload={'amount': 1, 'to': 'alice'})
            msg_b['id'] = 'bob_gift_%d' % i
            apply_to_state(msg_b, self.state_dir)

        final_total = total_spark(self.state_dir)
        self.assertEqual(initial_total, final_total,
                         'Gift farming created Spark: %d -> %d (+%d)' %
                         (initial_total, final_total, final_total - initial_total))


class TestProductiveActionsStillEarn(unittest.TestCase):
    """Productive actions (harvest, build, etc.) should still earn Spark."""

    def setUp(self):
        self.state_dir = make_state_dir(balances={})

    def tearDown(self):
        shutil.rmtree(self.state_dir)

    def test_harvest_earns_spark(self):
        """Harvest should earn Spark from the earn table."""
        msg = make_msg('harvest', payload={'resource': 'wheat'})
        apply_to_state(msg, self.state_dir)
        bal = get_balance(self.state_dir, 'agent_001')
        self.assertGreater(bal, 0, 'Harvest should earn Spark')

    def test_say_earns_spark(self):
        """Chat messages should earn Spark (they are productive social actions)."""
        msg = make_msg('say', payload={'text': 'Hello world!'})
        apply_to_state(msg, self.state_dir)
        bal = get_balance(self.state_dir, 'agent_001')
        self.assertGreater(bal, 0, 'Say should earn Spark')

    def test_build_earns_spark(self):
        """Building should earn Spark."""
        msg = make_msg('build', payload={'structure': 'house'})
        apply_to_state(msg, self.state_dir)
        bal = get_balance(self.state_dir, 'agent_001')
        self.assertGreater(bal, 0, 'Build should earn Spark')


if __name__ == '__main__':
    unittest.main()
