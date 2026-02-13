#!/usr/bin/env python3
"""Tests for economy_engine.py"""
import unittest
import sys
import os
import json

# Add scripts directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))

from economy_engine import (
    process_earnings,
    validate_transaction,
    check_ledger_integrity,
    expire_listings,
    EARN_TABLE
)


class TestEconomyEngine(unittest.TestCase):
    """Test suite for economy engine."""

    def setUp(self):
        """Set up test fixtures."""
        self.empty_economy = {
            'balances': {},
            'ledger': []
        }

    def test_earn_table_matches_activities(self):
        """Earn table should have entries for all activity types."""
        expected_types = {
            'join', 'say', 'shout', 'build', 'plant', 'craft',
            'compose', 'harvest', 'gift', 'teach', 'learn',
            'discover', 'anchor_place', 'score'
        }

        for activity_type in expected_types:
            self.assertIn(activity_type, EARN_TABLE, f"{activity_type} should be in EARN_TABLE")

    def test_process_earnings_single_action(self):
        """Process earnings for a single action."""
        economy = self.empty_economy.copy()
        economy['balances'] = {}
        economy['ledger'] = []

        actions = [
            {
                'type': 'say',
                'from': 'user_001',
                'ts': '2026-02-12T12:00:00Z'
            }
        ]

        updated = process_earnings(economy, actions)

        self.assertEqual(updated['balances']['user_001'], EARN_TABLE['say'])
        self.assertEqual(len(updated['ledger']), 1)
        self.assertEqual(updated['ledger'][0]['type'], 'earn')
        self.assertEqual(updated['ledger'][0]['amount'], EARN_TABLE['say'])

    def test_process_earnings_multiple_actions(self):
        """Process earnings for multiple actions."""
        economy = self.empty_economy.copy()
        economy['balances'] = {}
        economy['ledger'] = []

        actions = [
            {'type': 'say', 'from': 'user_001', 'ts': '2026-02-12T12:00:00Z'},
            {'type': 'build', 'from': 'user_001', 'ts': '2026-02-12T12:01:00Z'},
            {'type': 'plant', 'from': 'user_002', 'ts': '2026-02-12T12:02:00Z'}
        ]

        updated = process_earnings(economy, actions)

        expected_user1 = EARN_TABLE['say'] + EARN_TABLE['build']
        expected_user2 = EARN_TABLE['plant']

        self.assertEqual(updated['balances']['user_001'], expected_user1)
        self.assertEqual(updated['balances']['user_002'], expected_user2)
        self.assertEqual(len(updated['ledger']), 3)

    def test_process_earnings_zero_spark_actions(self):
        """Actions with zero Spark should not create ledger entries."""
        economy = self.empty_economy.copy()
        economy['balances'] = {}
        economy['ledger'] = []

        actions = [
            {'type': 'move', 'from': 'user_001', 'ts': '2026-02-12T12:00:00Z'},
            {'type': 'heartbeat', 'from': 'user_001', 'ts': '2026-02-12T12:01:00Z'}
        ]

        updated = process_earnings(economy, actions)

        self.assertEqual(len(updated['balances']), 0)
        self.assertEqual(len(updated['ledger']), 0)

    def test_process_earnings_accumulates(self):
        """Earnings should accumulate for same user."""
        economy = {
            'balances': {'user_001': 100},
            'ledger': []
        }

        actions = [
            {'type': 'say', 'from': 'user_001', 'ts': '2026-02-12T12:00:00Z'}
        ]

        updated = process_earnings(economy, actions)

        self.assertEqual(updated['balances']['user_001'], 100 + EARN_TABLE['say'])

    def test_validate_transaction_sufficient_balance(self):
        """Transaction with sufficient balance should be valid."""
        economy = {
            'balances': {'user_001': 100}
        }

        self.assertTrue(validate_transaction(economy, 'user_001', 50))
        self.assertTrue(validate_transaction(economy, 'user_001', 100))

    def test_validate_transaction_insufficient_balance(self):
        """Transaction with insufficient balance should be invalid."""
        economy = {
            'balances': {'user_001': 50}
        }

        self.assertFalse(validate_transaction(economy, 'user_001', 100))
        self.assertFalse(validate_transaction(economy, 'user_001', 51))

    def test_validate_transaction_zero_balance(self):
        """User with zero balance can't make transactions."""
        economy = {
            'balances': {'user_001': 0}
        }

        self.assertFalse(validate_transaction(economy, 'user_001', 1))
        self.assertTrue(validate_transaction(economy, 'user_001', 0))

    def test_validate_transaction_unknown_user(self):
        """Unknown user should fail validation."""
        economy = {
            'balances': {}
        }

        self.assertFalse(validate_transaction(economy, 'user_999', 1))

    def test_check_ledger_integrity_empty(self):
        """Empty ledger should pass integrity check."""
        economy = {'ledger': []}
        self.assertTrue(check_ledger_integrity(economy))

    def test_check_ledger_integrity_balanced(self):
        """Balanced ledger should pass integrity check."""
        economy = {
            'ledger': [
                {'type': 'earn', 'amount': 100},
                {'type': 'earn', 'amount': 50},
                {'type': 'spend', 'amount': 30}
            ]
        }

        self.assertTrue(check_ledger_integrity(economy))

    def test_check_ledger_integrity_genesis(self):
        """Genesis entries should count as credits."""
        economy = {
            'ledger': [
                {'type': 'genesis', 'amount': 1000},
                {'type': 'earn', 'amount': 100},
                {'type': 'spend', 'amount': 50}
            ]
        }

        self.assertTrue(check_ledger_integrity(economy))

    def test_expire_listings_removes_old(self):
        """Expired listings should be removed."""
        import time
        current_time = time.time()

        economy = {
            'market': {
                'listings': [
                    {
                        'id': 'listing_001',
                        'listedAt': current_time - (25 * 3600)  # 25 hours ago
                    },
                    {
                        'id': 'listing_002',
                        'listedAt': current_time - (1 * 3600)  # 1 hour ago
                    }
                ]
            }
        }

        updated = expire_listings(economy, max_age_hours=24)

        self.assertEqual(len(updated['market']['listings']), 1)
        self.assertEqual(updated['market']['listings'][0]['id'], 'listing_002')

    def test_expire_listings_keeps_recent(self):
        """Recent listings should be kept."""
        import time
        current_time = time.time()

        economy = {
            'market': {
                'listings': [
                    {'id': 'listing_001', 'listedAt': current_time - 1000},
                    {'id': 'listing_002', 'listedAt': current_time - 2000},
                    {'id': 'listing_003', 'listedAt': current_time - 3000}
                ]
            }
        }

        updated = expire_listings(economy, max_age_hours=24)

        self.assertEqual(len(updated['market']['listings']), 3)

    def test_expire_listings_no_market(self):
        """Economy without market should not error."""
        economy = {'balances': {}}
        updated = expire_listings(economy)
        self.assertNotIn('market', updated)

    def test_all_earn_values_non_negative(self):
        """All earn table values should be non-negative."""
        for action_type, spark_value in EARN_TABLE.items():
            self.assertGreaterEqual(
                spark_value, 0,
                f"{action_type} should have non-negative Spark value"
            )

    def test_high_value_actions(self):
        """High-value actions should earn appropriate Spark."""
        high_value = ['warp_fork', 'federation_announce', 'discover', 'anchor_place']

        for action in high_value:
            self.assertGreaterEqual(
                EARN_TABLE[action], 20,
                f"{action} should be high-value (>= 20 Spark)"
            )

    def test_social_actions_earn_spark(self):
        """Social actions should earn Spark."""
        social = ['say', 'shout', 'whisper', 'emote', 'gift']

        for action in social:
            self.assertGreater(
                EARN_TABLE.get(action, 0), 0,
                f"{action} should earn Spark"
            )


if __name__ == '__main__':
    unittest.main()
