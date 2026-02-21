#!/usr/bin/env python3
"""Tests for progressive taxation and UBI system."""
import json
import os
import sys
import unittest

# Add scripts to path
script_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'scripts')
sys.path.insert(0, script_dir)

from economy_engine import _get_tax_rate, TREASURY_ID, process_earnings
from game_tick import _get_ubi_eligible, _distribute_ubi


class TestTaxBrackets(unittest.TestCase):
    """Test _get_tax_rate bracket thresholds."""

    def test_bracket_0_to_19(self):
        self.assertEqual(_get_tax_rate(0), 0.0)
        self.assertEqual(_get_tax_rate(10), 0.0)
        self.assertEqual(_get_tax_rate(19), 0.0)

    def test_bracket_20_to_49(self):
        self.assertEqual(_get_tax_rate(20), 0.05)
        self.assertEqual(_get_tax_rate(49), 0.05)

    def test_bracket_50_to_99(self):
        self.assertEqual(_get_tax_rate(50), 0.10)
        self.assertEqual(_get_tax_rate(99), 0.10)

    def test_bracket_100_to_249(self):
        self.assertEqual(_get_tax_rate(100), 0.15)
        self.assertEqual(_get_tax_rate(249), 0.15)

    def test_bracket_250_to_499(self):
        self.assertEqual(_get_tax_rate(250), 0.25)
        self.assertEqual(_get_tax_rate(499), 0.25)

    def test_bracket_500_plus(self):
        self.assertEqual(_get_tax_rate(500), 0.40)
        self.assertEqual(_get_tax_rate(10000), 0.40)

    def test_negative_balance(self):
        self.assertEqual(_get_tax_rate(-5), 0.0)
        self.assertEqual(_get_tax_rate(-100), 0.0)


class TestProcessEarningsWithTax(unittest.TestCase):
    """Test economy_engine process_earnings with tax."""

    def test_earnings_with_no_tax(self):
        """Balance 0 -> 0% tax bracket."""
        economy = {'balances': {}, 'ledger': []}
        actions = [{'type': 'say', 'from': 'user1', 'ts': 1000}]
        result = process_earnings(economy, actions)
        # say earns 1, balance 0 -> 0% tax
        self.assertEqual(result['balances']['user1'], 1)
        self.assertNotIn(TREASURY_ID, result['balances'])

    def test_earnings_with_tax(self):
        """Balance 100 -> 15% tax bracket."""
        economy = {'balances': {'user1': 100}, 'ledger': []}
        actions = [{'type': 'build', 'from': 'user1', 'ts': 1000}]
        result = process_earnings(economy, actions)
        # build earns 10, 15% tax = 1 (floor), net = 9
        self.assertEqual(result['balances']['user1'], 109)
        self.assertEqual(result['balances'][TREASURY_ID], 1)

    def test_tax_recorded_in_ledger(self):
        economy = {'balances': {'user1': 100}, 'ledger': []}
        actions = [{'type': 'build', 'from': 'user1', 'ts': 1000}]
        result = process_earnings(economy, actions)
        tax_entries = [e for e in result['ledger'] if e['type'] == 'tax']
        self.assertEqual(len(tax_entries), 1)
        self.assertEqual(tax_entries[0]['amount'], 1)

    def test_spark_conservation(self):
        """Net + tax should equal gross."""
        economy = {'balances': {'user1': 500}, 'ledger': []}
        actions = [{'type': 'discover', 'from': 'user1', 'ts': 1000}]
        result = process_earnings(economy, actions)
        # discover earns 20, 40% tax = 8, net = 12
        gross = 20
        net = result['balances']['user1'] - 500
        tax = result['balances'].get(TREASURY_ID, 0)
        self.assertEqual(net + tax, gross)


class TestUBIEligibility(unittest.TestCase):
    """Test UBI eligibility determination."""

    def test_eligible_excludes_system_accounts(self):
        economy = {
            'balances': {'user1': 10, 'user2': 5, TREASURY_ID: 100, 'SYSTEM': 0}
        }
        eligible = _get_ubi_eligible(economy, None)
        self.assertIn('user1', eligible)
        self.assertIn('user2', eligible)
        self.assertNotIn(TREASURY_ID, eligible)
        self.assertNotIn('SYSTEM', eligible)

    def test_eligible_empty_economy(self):
        eligible = _get_ubi_eligible({}, None)
        self.assertEqual(eligible, [])


class TestUBIDistribution(unittest.TestCase):
    """Test UBI distribution in game tick."""

    def test_ubi_distributes_on_game_day_boundary(self):
        state = {
            'worldTime': 1440,  # Day 1
            '_lastUbiDay': -1,
            'economy': {
                'balances': {TREASURY_ID: 20, 'user1': 5, 'user2': 3},
                'transactions': [],
            },
        }
        _distribute_ubi(state)
        # Each gets min(5, 20//2) = 5
        self.assertEqual(state['economy']['balances']['user1'], 10)
        self.assertEqual(state['economy']['balances']['user2'], 8)
        self.assertEqual(state['economy']['balances'][TREASURY_ID], 10)

    def test_ubi_does_not_repeat_same_day(self):
        state = {
            'worldTime': 1440,
            '_lastUbiDay': 1,  # Already distributed today
            'economy': {
                'balances': {TREASURY_ID: 10, 'user1': 5},
                'transactions': [],
            },
        }
        _distribute_ubi(state)
        # Should not distribute again
        self.assertEqual(state['economy']['balances']['user1'], 5)
        self.assertEqual(state['economy']['balances'][TREASURY_ID], 10)

    def test_treasury_never_negative(self):
        state = {
            'worldTime': 1440,
            '_lastUbiDay': -1,
            'economy': {
                'balances': {TREASURY_ID: 3, 'u1': 0, 'u2': 0, 'u3': 0},
                'transactions': [],
            },
        }
        _distribute_ubi(state)
        self.assertGreaterEqual(state['economy']['balances'][TREASURY_ID], 0)

    def test_ubi_records_transactions(self):
        state = {
            'worldTime': 1440,
            '_lastUbiDay': -1,
            'economy': {
                'balances': {TREASURY_ID: 10, 'user1': 0},
                'transactions': [],
            },
        }
        _distribute_ubi(state)
        ubi_txns = [t for t in state['economy']['transactions'] if t['type'] == 'ubi_payout']
        self.assertEqual(len(ubi_txns), 1)
        self.assertEqual(ubi_txns[0]['to'], 'user1')
        self.assertEqual(ubi_txns[0]['amount'], 5)

    def test_ubi_with_empty_treasury_does_nothing(self):
        state = {
            'worldTime': 1440,
            '_lastUbiDay': -1,
            'economy': {
                'balances': {TREASURY_ID: 0, 'user1': 5},
                'transactions': [],
            },
        }
        _distribute_ubi(state)
        self.assertEqual(state['economy']['balances']['user1'], 5)


if __name__ == '__main__':
    unittest.main()
