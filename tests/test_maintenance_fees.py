#!/usr/bin/env python3
"""Tests for Structure Maintenance Costs and Market Listing Fees (§6.5)."""
import json
import os
import sys
import time
import unittest

# Add scripts to path
script_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'scripts')
sys.path.insert(0, script_dir)

from economy_engine import (
    process_structure_maintenance,
    process_market_listing_fee,
    MAINTENANCE_COST,
    LISTING_FEE_RATE,
    LISTING_FEE_MIN,
    SYSTEM_ID,
    TREASURY_ID,
)


# ---------------------------------------------------------------------------
# STRUCTURE MAINTENANCE TESTS (§6.5.1)
# ---------------------------------------------------------------------------

class TestStructureMaintenance(unittest.TestCase):
    """Test structure maintenance cost deduction (1 Spark/day, destroyed)."""

    def _make_economy(self, balances=None):
        return {
            'balances': dict(balances or {}),
            'ledger': [],
        }

    def _make_structures(self, owners):
        """Create a structures dict from {structure_id: owner_id} mapping."""
        structs = {}
        for sid, owner in owners.items():
            structs[sid] = {
                'type': 'bench',
                'builder': owner,
                'zone': 'nexus',
                '_missedPayments': 0,
            }
        return structs

    def test_basic_maintenance_deducted(self):
        """Owner with sufficient balance pays 1 Spark maintenance."""
        economy = self._make_economy({'player1': 10})
        structures = self._make_structures({'s1': 'player1'})

        economy, to_remove = process_structure_maintenance(economy, structures)

        self.assertEqual(economy['balances']['player1'], 9,
                         'Owner should lose 1 Spark for maintenance')
        self.assertEqual(to_remove, [],
                         'No structures should be removed when payment succeeds')

    def test_maintenance_creates_ledger_entry(self):
        """Successful maintenance payment creates a ledger entry typed structure_maintenance."""
        economy = self._make_economy({'player1': 5})
        structures = self._make_structures({'s1': 'player1'})

        economy, _ = process_structure_maintenance(economy, structures)

        maint_entries = [e for e in economy['ledger']
                         if e['type'] == 'structure_maintenance']
        self.assertEqual(len(maint_entries), 1)
        entry = maint_entries[0]
        self.assertEqual(entry['user'], 'player1')
        self.assertEqual(entry['structureId'], 's1')
        self.assertEqual(entry['amount'], MAINTENANCE_COST)
        self.assertEqual(entry['sink'], SYSTEM_ID,
                         'Destroyed Spark should be sent to SYSTEM (void)')

    def test_maintenance_spark_destroyed_not_to_treasury(self):
        """Maintenance Spark is destroyed — TREASURY must not increase."""
        economy = self._make_economy({'player1': 5, TREASURY_ID: 0})
        structures = self._make_structures({'s1': 'player1'})

        economy, _ = process_structure_maintenance(economy, structures)

        self.assertEqual(economy['balances'][TREASURY_ID], 0,
                         'TREASURY must not receive maintenance Spark (§6.5.3 — destroy, not redistribute)')

    def test_multiple_structures_multiple_deductions(self):
        """Each structure incurs a separate 1 Spark charge."""
        economy = self._make_economy({'player1': 10})
        structures = self._make_structures({'s1': 'player1', 's2': 'player1', 's3': 'player1'})

        economy, to_remove = process_structure_maintenance(economy, structures)

        self.assertEqual(economy['balances']['player1'], 7,
                         'Three structures cost 3 Spark total')
        self.assertEqual(to_remove, [])
        maint_entries = [e for e in economy['ledger'] if e['type'] == 'structure_maintenance']
        self.assertEqual(len(maint_entries), 3)

    def test_multiple_owners_each_charged(self):
        """Each structure owner is charged independently."""
        economy = self._make_economy({'alice': 5, 'bob': 3})
        structures = {
            's_alice': {'type': 'bench', 'builder': 'alice', 'zone': 'nexus', '_missedPayments': 0},
            's_bob': {'type': 'bench', 'builder': 'bob', 'zone': 'nexus', '_missedPayments': 0},
        }

        economy, to_remove = process_structure_maintenance(economy, structures)

        self.assertEqual(economy['balances']['alice'], 4)
        self.assertEqual(economy['balances']['bob'], 2)
        self.assertEqual(to_remove, [])

    def test_owner_at_zero_cannot_pay_increments_missed(self):
        """Owner at balance floor (0) cannot pay; missed payment counter increments."""
        economy = self._make_economy({'broke_player': 0})
        structures = {'s1': {'type': 'bench', 'builder': 'broke_player',
                              'zone': 'nexus', '_missedPayments': 0}}

        economy, to_remove = process_structure_maintenance(economy, structures)

        self.assertEqual(economy['balances']['broke_player'], 0,
                         'Balance should remain at 0 (cannot go negative)')
        self.assertEqual(structures['s1']['_missedPayments'], 1,
                         'Missed payment counter should increment to 1')
        self.assertEqual(to_remove, [],
                         'Structure should NOT be removed after first missed payment')

    def test_missed_payment_logged_in_ledger(self):
        """Missed maintenance payments are logged in the ledger for transparency."""
        economy = self._make_economy({'broke_player': 0})
        structures = {'s1': {'type': 'bench', 'builder': 'broke_player',
                              'zone': 'nexus', '_missedPayments': 0}}

        economy, _ = process_structure_maintenance(economy, structures)

        missed_entries = [e for e in economy['ledger']
                          if e['type'] == 'structure_maintenance_missed']
        self.assertEqual(len(missed_entries), 1)
        self.assertEqual(missed_entries[0]['user'], 'broke_player')
        self.assertEqual(missed_entries[0]['missedPayments'], 1)

    def test_second_missed_payment_marks_for_removal(self):
        """Structure with 2 consecutive missed payments is marked for removal (§6.5.1)."""
        economy = self._make_economy({'broke_player': 0})
        # Already missed 1 payment
        structures = {'s1': {'type': 'bench', 'builder': 'broke_player',
                              'zone': 'nexus', '_missedPayments': 1}}

        economy, to_remove = process_structure_maintenance(economy, structures)

        self.assertIn('s1', to_remove,
                      'Structure should be flagged for removal after 2nd missed payment')

    def test_successful_payment_resets_missed_counter(self):
        """After a successful payment, missed payment counter resets to 0."""
        economy = self._make_economy({'recovering_player': 5})
        # Had previously missed 1 payment
        structures = {'s1': {'type': 'bench', 'builder': 'recovering_player',
                              'zone': 'nexus', '_missedPayments': 1}}

        economy, to_remove = process_structure_maintenance(economy, structures)

        self.assertEqual(structures['s1']['_missedPayments'], 0,
                         'Successful payment should reset missed counter to 0')
        self.assertEqual(to_remove, [])
        self.assertEqual(economy['balances']['recovering_player'], 4)

    def test_system_owned_structures_not_charged(self):
        """Structures built by 'system' (SYSTEM_ID) are exempt from maintenance."""
        economy = self._make_economy({'player1': 10})
        structures = {
            's_system': {'type': 'fountain', 'builder': 'system',
                         'zone': 'nexus', '_missedPayments': 0},
            's_player': {'type': 'bench', 'builder': 'player1',
                         'zone': 'nexus', '_missedPayments': 0},
        }

        economy, to_remove = process_structure_maintenance(economy, structures)

        # Only player1 charged
        self.assertEqual(economy['balances']['player1'], 9)
        maint = [e for e in economy['ledger'] if e['type'] == 'structure_maintenance']
        self.assertEqual(len(maint), 1)
        self.assertEqual(maint[0]['user'], 'player1')

    def test_empty_structures_no_charges(self):
        """No structures means no maintenance charges."""
        economy = self._make_economy({'player1': 10})

        economy, to_remove = process_structure_maintenance(economy, {})

        self.assertEqual(economy['balances']['player1'], 10)
        self.assertEqual(economy['ledger'], [])
        self.assertEqual(to_remove, [])

    def test_unknown_builder_skipped(self):
        """Structures with missing or empty builder field are skipped gracefully."""
        economy = self._make_economy({'player1': 10})
        structures = {
            's_no_builder': {'type': 'bench', 'zone': 'nexus', '_missedPayments': 0},
            's_empty_builder': {'type': 'bench', 'builder': '', 'zone': 'nexus',
                                '_missedPayments': 0},
        }

        economy, to_remove = process_structure_maintenance(economy, structures)

        # No charges applied, no errors
        self.assertEqual(economy['balances']['player1'], 10)
        self.assertEqual(economy['ledger'], [])

    def test_maintenance_cost_is_one_spark(self):
        """The maintenance cost constant must equal 1 Spark per §6.5.1."""
        self.assertEqual(MAINTENANCE_COST, 1,
                         'Constitution §6.5.1 mandates exactly 1 Spark per structure per day')

    def test_exactly_one_spark_balance_pays_successfully(self):
        """Owner with exactly 1 Spark balance can pay maintenance (boundary case)."""
        economy = self._make_economy({'edge_player': 1})
        structures = {'s1': {'type': 'bench', 'builder': 'edge_player',
                              'zone': 'nexus', '_missedPayments': 0}}

        economy, to_remove = process_structure_maintenance(economy, structures)

        self.assertEqual(economy['balances']['edge_player'], 0,
                         'Balance should go to 0 (not below floor)')
        self.assertEqual(to_remove, [])


# ---------------------------------------------------------------------------
# MARKET LISTING FEE TESTS (§6.5.2)
# ---------------------------------------------------------------------------

class TestMarketListingFee(unittest.TestCase):
    """Test market listing fee (5% of asking price, min 1 Spark, destroyed)."""

    def _make_economy(self, balances=None):
        return {
            'balances': dict(balances or {}),
            'ledger': [],
        }

    def test_listing_fee_is_five_percent(self):
        """Listing fee is exactly 5% of asking price (§6.5.2)."""
        self.assertAlmostEqual(LISTING_FEE_RATE, 0.05,
                               msg='Listing fee rate must be 5% per §6.5.2')

    def test_minimum_listing_fee_is_one_spark(self):
        """Minimum listing fee is 1 Spark (§6.5.2)."""
        self.assertEqual(LISTING_FEE_MIN, 1,
                         'Minimum listing fee is 1 Spark per §6.5.2')

    def test_listing_fee_deducted_from_seller(self):
        """5% of asking price is deducted from seller's balance at listing time."""
        economy = self._make_economy({'seller': 100})
        # Asking price 100 -> fee = floor(100 * 0.05) = 5
        result = process_market_listing_fee(economy, 'seller', 100)

        self.assertTrue(result['success'])
        self.assertEqual(result['fee'], 5)
        self.assertEqual(economy['balances']['seller'], 95)

    def test_listing_fee_creates_ledger_entry(self):
        """Listing fee creates a ledger entry with type 'market_listing_fee'."""
        economy = self._make_economy({'seller': 100})
        result = process_market_listing_fee(economy, 'seller', 100)

        self.assertTrue(result['success'])
        fee_entries = [e for e in economy['ledger']
                       if e['type'] == 'market_listing_fee']
        self.assertEqual(len(fee_entries), 1)
        entry = fee_entries[0]
        self.assertEqual(entry['user'], 'seller')
        self.assertEqual(entry['amount'], 5)
        self.assertEqual(entry['askingPrice'], 100)
        self.assertEqual(entry['feeRate'], LISTING_FEE_RATE)
        self.assertEqual(entry['sink'], SYSTEM_ID,
                         'Fee Spark must go to SYSTEM sink (destroyed, not TREASURY)')

    def test_listing_fee_spark_destroyed_not_treasury(self):
        """Listing fee Spark is destroyed — TREASURY must not receive it."""
        economy = self._make_economy({'seller': 100, TREASURY_ID: 50})
        process_market_listing_fee(economy, 'seller', 100)

        self.assertEqual(economy['balances'][TREASURY_ID], 50,
                         'TREASURY should not receive listing fee Spark')

    def test_minimum_fee_applied_for_small_prices(self):
        """For small prices where 5% < 1, minimum fee of 1 Spark is charged."""
        economy = self._make_economy({'seller': 10})
        # Asking price 5 -> 5% = 0.25, rounded down = 0, but minimum is 1
        result = process_market_listing_fee(economy, 'seller', 5)

        self.assertTrue(result['success'])
        self.assertEqual(result['fee'], 1, 'Fee must be at least 1 Spark')
        self.assertEqual(economy['balances']['seller'], 9)

    def test_minimum_fee_for_price_of_one(self):
        """Listing an item at 1 Spark costs a minimum fee of 1 Spark."""
        economy = self._make_economy({'seller': 10})
        result = process_market_listing_fee(economy, 'seller', 1)

        self.assertEqual(result['fee'], 1)
        self.assertEqual(economy['balances']['seller'], 9)

    def test_fee_rounds_down_player_favorable(self):
        """Fee rounds down (floor) — player-favorable per §6.5.2."""
        economy = self._make_economy({'seller': 100})
        # Asking price 21 -> 5% = 1.05, floor = 1
        result = process_market_listing_fee(economy, 'seller', 21)

        self.assertEqual(result['fee'], 1, 'Fee should floor to 1 (player-favorable)')

    def test_large_asking_price_fee(self):
        """Large asking price: fee is proportionate."""
        economy = self._make_economy({'seller': 500})
        # Asking price 200 -> 5% = 10
        result = process_market_listing_fee(economy, 'seller', 200)

        self.assertEqual(result['fee'], 10)
        self.assertEqual(economy['balances']['seller'], 490)

    def test_insufficient_balance_fails(self):
        """Seller with insufficient balance to pay fee gets success=False."""
        economy = self._make_economy({'seller': 0})
        result = process_market_listing_fee(economy, 'seller', 100)

        self.assertFalse(result['success'])
        self.assertEqual(economy['balances']['seller'], 0,
                         'Balance should be unchanged on failure')
        # No ledger entry should be created
        self.assertEqual(len(economy['ledger']), 0)

    def test_balance_exactly_equals_fee_succeeds(self):
        """Seller with exactly the fee amount can pay (boundary case)."""
        economy = self._make_economy({'seller': 5})
        # Price 100 -> fee = 5 -> seller has exactly 5
        result = process_market_listing_fee(economy, 'seller', 100)

        self.assertTrue(result['success'])
        self.assertEqual(economy['balances']['seller'], 0)

    def test_balance_one_below_fee_fails(self):
        """Seller with 1 Spark less than fee cannot list (boundary case)."""
        economy = self._make_economy({'seller': 4})
        # Price 100 -> fee = 5 -> seller has 4 (insufficient)
        result = process_market_listing_fee(economy, 'seller', 100)

        self.assertFalse(result['success'])
        self.assertEqual(economy['balances']['seller'], 4)

    def test_unknown_seller_gets_zero_balance_then_fails(self):
        """Unknown seller (no balance entry) is initialized to 0 and fails fee."""
        economy = self._make_economy({})
        result = process_market_listing_fee(economy, 'new_seller', 100)

        # fee would be 5, balance is 0 -> cannot pay
        self.assertFalse(result['success'])
        self.assertEqual(economy['balances'].get('new_seller', 0), 0)

    def test_result_contains_fee_and_balance(self):
        """Result dict contains fee, balance, and message fields."""
        economy = self._make_economy({'seller': 100})
        result = process_market_listing_fee(economy, 'seller', 100)

        self.assertIn('success', result)
        self.assertIn('fee', result)
        self.assertIn('balance', result)
        self.assertIn('message', result)

    def test_zero_asking_price_charges_minimum(self):
        """Zero asking price still charges minimum listing fee."""
        economy = self._make_economy({'seller': 5})
        result = process_market_listing_fee(economy, 'seller', 0)

        # 5% of 0 = 0, but minimum is 1
        self.assertEqual(result['fee'], 1)


# ---------------------------------------------------------------------------
# INTEGRATION: MAINTENANCE + GAME TICK
# ---------------------------------------------------------------------------

class TestMaintenanceInGameTick(unittest.TestCase):
    """Test that structure maintenance integrates correctly with game_tick._distribute_ubi."""

    def setUp(self):
        # Add scripts to path
        sys.path.insert(0, script_dir)

    def test_maintenance_wired_into_game_tick(self):
        """game_tick._distribute_ubi charges structure maintenance via economy_engine."""
        from game_tick import _distribute_ubi

        state = {
            'worldTime': 1440,
            '_lastUbiDay': -1,
            'structures': {
                'bench_1': {'type': 'bench', 'builder': 'player1',
                            'zone': 'nexus', '_missedPayments': 0},
            },
            'economy': {
                'balances': {'player1': 10, TREASURY_ID: 50},
                'transactions': [],
                'ledger': [],
            },
        }

        _distribute_ubi(state)

        # player1 should have paid 1 Spark maintenance
        self.assertEqual(state['economy']['balances']['player1'], 14,
                         'player1 should pay 1 Spark maintenance, then receive UBI from treasury')

    def test_decay_removes_structure_in_game_tick(self):
        """Structures with 2 missed payments are removed during game tick."""
        from game_tick import _distribute_ubi

        state = {
            'worldTime': 1440,
            '_lastUbiDay': -1,
            'structures': {
                'decaying': {'type': 'bench', 'builder': 'broke_player',
                             'zone': 'nexus', '_missedPayments': 1},
            },
            'economy': {
                'balances': {'broke_player': 0, TREASURY_ID: 0},
                'transactions': [],
                'ledger': [],
            },
        }

        _distribute_ubi(state)

        self.assertNotIn('decaying', state['structures'],
                         'Structure with 2 missed payments should be removed from world')

    def test_maintenance_ledger_entries_in_game_tick(self):
        """Structure maintenance creates ledger entries with correct type."""
        from game_tick import _distribute_ubi

        state = {
            'worldTime': 1440,
            '_lastUbiDay': -1,
            'structures': {
                's1': {'type': 'bench', 'builder': 'player1',
                       'zone': 'nexus', '_missedPayments': 0},
            },
            'economy': {
                'balances': {'player1': 10, TREASURY_ID: 0},
                'transactions': [],
                'ledger': [],
            },
        }

        _distribute_ubi(state)

        ledger = state['economy']['ledger']
        maint_entries = [e for e in ledger if e['type'] == 'structure_maintenance']
        self.assertGreater(len(maint_entries), 0,
                           'Ledger must have structure_maintenance entries')

    def test_maintenance_not_double_charged_same_day(self):
        """Maintenance is only charged once per game day (no double-billing)."""
        from game_tick import _distribute_ubi

        state = {
            'worldTime': 1440,
            '_lastUbiDay': -1,
            'structures': {
                's1': {'type': 'bench', 'builder': 'player1',
                       'zone': 'nexus', '_missedPayments': 0},
            },
            'economy': {
                'balances': {'player1': 10, TREASURY_ID: 0},
                'transactions': [],
                'ledger': [],
            },
        }

        # Run twice on same game day
        _distribute_ubi(state)
        _distribute_ubi(state)

        maint_entries = [e for e in state['economy']['ledger']
                         if e['type'] == 'structure_maintenance']
        self.assertEqual(len(maint_entries), 1,
                         'Maintenance should only be charged once per game day')


if __name__ == '__main__':
    unittest.main()
