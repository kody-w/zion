#!/usr/bin/env python3
"""
Comprehensive tests for Wealth Tax (§6.4.6).

Constitution mandate:
  "Once per game day, citizens with balances above 500 pay 2% of their balance
   above 500 to the TREASURY. This is rounded down (player-favorable)."

Test coverage:
  1. Tax calculation — 2% on the amount OVER 500 (not on the whole balance)
  2. No tax on balances <= 500
  3. Exactly 500 is tax-exempt (boundary)
  4. Ledger entries have correct type, user, amount, and metadata
  5. TREASURY receives the exact amount deducted from citizen
  6. Tax is rounded down (floor), never up
  7. System accounts (TREASURY, SYSTEM) are exempt
  8. Multiple citizens taxed independently
  9. Very large balances taxed correctly
  10. game_tick._distribute_ubi applies wealth tax via economy_engine
  11. Wealth tax runs before UBI each game day
  12. Wealth tax does not repeat on same game day (guarded by _lastUbiDay)
  13. Citizen balance never goes below 0 after wealth tax
  14. Citizen with balance of exactly 501 pays floor(1 * 0.02) = 0
"""
import json
import os
import sys
import time
import unittest

# Add scripts to path
_SCRIPT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'scripts')
sys.path.insert(0, _SCRIPT_DIR)

from economy_engine import (
    apply_wealth_tax,
    TREASURY_ID,
    WEALTH_TAX_THRESHOLD,
    WEALTH_TAX_RATE,
)
from game_tick import _distribute_ubi, TREASURY_ID as GT_TREASURY_ID


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_economy(balances, ledger=None):
    """Build a minimal economy dict."""
    return {
        'balances': dict(balances),
        'ledger': list(ledger or []),
    }


def make_state(balances, world_time=1440, last_ubi_day=-1, transactions=None):
    """Build a minimal game state dict for _distribute_ubi tests."""
    return {
        'worldTime': world_time,
        '_lastUbiDay': last_ubi_day,
        'economy': {
            'balances': dict(balances),
            'transactions': list(transactions or []),
            'ledger': [],
        },
    }


# ---------------------------------------------------------------------------
# 1. Tax Calculation
# ---------------------------------------------------------------------------

class TestWealthTaxCalculation(unittest.TestCase):
    """Verify the 2%-on-amount-over-500 calculation."""

    def test_tax_is_2_percent_of_excess(self):
        """Standard case: balance 600, taxable = 100, tax = floor(100 * 0.02) = 2."""
        economy = make_economy({'citizen1': 600})
        result = apply_wealth_tax(economy)
        self.assertEqual(result['balances']['citizen1'], 598)

    def test_tax_on_large_excess(self):
        """Balance 1000, taxable = 500, tax = floor(500 * 0.02) = 10."""
        economy = make_economy({'citizen1': 1000})
        result = apply_wealth_tax(economy)
        self.assertEqual(result['balances']['citizen1'], 990)

    def test_tax_floor_rounding(self):
        """
        Balance 550, taxable = 50, tax = floor(50 * 0.02) = floor(1.0) = 1.
        (No fractional issue here, but ensures int() is used.)
        """
        economy = make_economy({'citizen1': 550})
        result = apply_wealth_tax(economy)
        self.assertEqual(result['balances']['citizen1'], 549)

    def test_tax_rounds_down_not_up(self):
        """
        Balance 524, taxable = 24, raw tax = 24 * 0.02 = 0.48.
        floor(0.48) = 0, so no tax is collected (player-favorable).
        """
        economy = make_economy({'citizen1': 524})
        result = apply_wealth_tax(economy)
        # 0.48 rounds down to 0 — no tax
        self.assertEqual(result['balances']['citizen1'], 524)

    def test_tax_rounds_down_not_up_fractional(self):
        """
        Balance 575, taxable = 75, raw tax = 75 * 0.02 = 1.5.
        floor(1.5) = 1 (player-favorable, not 2).
        """
        economy = make_economy({'citizen1': 575})
        result = apply_wealth_tax(economy)
        self.assertEqual(result['balances']['citizen1'], 574)


# ---------------------------------------------------------------------------
# 2. No Tax Below / At Threshold
# ---------------------------------------------------------------------------

class TestWealthTaxNoTaxBelowThreshold(unittest.TestCase):
    """Citizens at or below 500 should pay no wealth tax."""

    def test_balance_zero_no_tax(self):
        economy = make_economy({'citizen1': 0})
        result = apply_wealth_tax(economy)
        self.assertEqual(result['balances']['citizen1'], 0)
        self.assertEqual(len(result['ledger']), 0)

    def test_balance_499_no_tax(self):
        economy = make_economy({'citizen1': 499})
        result = apply_wealth_tax(economy)
        self.assertEqual(result['balances']['citizen1'], 499)
        self.assertEqual(len(result['ledger']), 0)

    def test_balance_exactly_500_no_tax(self):
        """Exactly 500 is the threshold — no tax (boundary case)."""
        economy = make_economy({'citizen1': 500})
        result = apply_wealth_tax(economy)
        self.assertEqual(result['balances']['citizen1'], 500)
        self.assertEqual(len(result['ledger']), 0)

    def test_balance_501_very_small_excess(self):
        """
        Balance 501, taxable = 1, raw tax = 0.02.
        floor(0.02) = 0 — no tax charged (player-favorable rounding).
        """
        economy = make_economy({'citizen1': 501})
        result = apply_wealth_tax(economy)
        self.assertEqual(result['balances']['citizen1'], 501)
        self.assertEqual(len(result['ledger']), 0)

    def test_negative_balance_no_tax(self):
        """Negative balances should never be taxed."""
        economy = make_economy({'citizen1': -100})
        result = apply_wealth_tax(economy)
        self.assertEqual(result['balances']['citizen1'], -100)
        self.assertEqual(len(result['ledger']), 0)


# ---------------------------------------------------------------------------
# 3. TREASURY Receives Tax
# ---------------------------------------------------------------------------

class TestWealthTaxTreasuryCredit(unittest.TestCase):
    """TREASURY must receive exactly what citizens pay."""

    def test_treasury_receives_tax(self):
        """TREASURY balance increases by the exact tax amount."""
        economy = make_economy({'citizen1': 600, TREASURY_ID: 0})
        result = apply_wealth_tax(economy)
        # citizen1: 600 -> 598, tax = 2
        self.assertEqual(result['balances'][TREASURY_ID], 2)

    def test_treasury_accumulates_from_multiple(self):
        """TREASURY receives sum of taxes from all taxed citizens."""
        economy = make_economy({
            'citizen1': 600,   # taxable=100, tax=2
            'citizen2': 1000,  # taxable=500, tax=10
            TREASURY_ID: 0,
        })
        result = apply_wealth_tax(economy)
        self.assertEqual(result['balances'][TREASURY_ID], 12)

    def test_treasury_existing_balance_not_lost(self):
        """Existing TREASURY balance is preserved and tax is added to it."""
        economy = make_economy({'citizen1': 600, TREASURY_ID: 50})
        result = apply_wealth_tax(economy)
        # 50 existing + 2 new tax
        self.assertEqual(result['balances'][TREASURY_ID], 52)

    def test_conservation_citizen_loss_equals_treasury_gain(self):
        """Total Spark is conserved: citizen loss == treasury gain."""
        initial_citizen = 800
        initial_treasury = 100
        economy = make_economy({'citizen1': initial_citizen, TREASURY_ID: initial_treasury})
        result = apply_wealth_tax(economy)

        final_citizen = result['balances']['citizen1']
        final_treasury = result['balances'][TREASURY_ID]
        citizen_loss = initial_citizen - final_citizen
        treasury_gain = final_treasury - initial_treasury
        self.assertEqual(citizen_loss, treasury_gain)

    def test_treasury_created_if_missing(self):
        """TREASURY is initialized to 0 if not present, then receives tax."""
        economy = make_economy({'citizen1': 600})  # no TREASURY key
        result = apply_wealth_tax(economy)
        self.assertIn(TREASURY_ID, result['balances'])
        self.assertEqual(result['balances'][TREASURY_ID], 2)


# ---------------------------------------------------------------------------
# 4. Ledger Entries
# ---------------------------------------------------------------------------

class TestWealthTaxLedgerEntries(unittest.TestCase):
    """Wealth tax must be recorded in the public ledger with full detail."""

    def test_ledger_entry_type(self):
        """Ledger entry type must be 'wealth_tax'."""
        economy = make_economy({'citizen1': 600})
        result = apply_wealth_tax(economy)
        entries = [e for e in result['ledger'] if e.get('type') == 'wealth_tax']
        self.assertEqual(len(entries), 1)

    def test_ledger_entry_user(self):
        """Ledger entry records the correct citizen ID."""
        economy = make_economy({'citizen1': 600})
        result = apply_wealth_tax(economy)
        entry = result['ledger'][0]
        self.assertEqual(entry['user'], 'citizen1')

    def test_ledger_entry_amount(self):
        """Ledger entry amount matches actual tax deducted."""
        economy = make_economy({'citizen1': 600})
        result = apply_wealth_tax(economy)
        entry = result['ledger'][0]
        self.assertEqual(entry['amount'], 2)

    def test_ledger_entry_taxable_amount(self):
        """Ledger entry records taxable amount (balance over threshold)."""
        economy = make_economy({'citizen1': 600})
        result = apply_wealth_tax(economy)
        entry = result['ledger'][0]
        self.assertEqual(entry['taxableAmount'], 100)

    def test_ledger_entry_tax_rate(self):
        """Ledger entry records the correct tax rate."""
        economy = make_economy({'citizen1': 600})
        result = apply_wealth_tax(economy)
        entry = result['ledger'][0]
        self.assertAlmostEqual(entry['taxRate'], WEALTH_TAX_RATE)

    def test_ledger_entry_threshold(self):
        """Ledger entry records the threshold value."""
        economy = make_economy({'citizen1': 600})
        result = apply_wealth_tax(economy)
        entry = result['ledger'][0]
        self.assertEqual(entry['threshold'], WEALTH_TAX_THRESHOLD)

    def test_ledger_entry_balance_before_after(self):
        """Ledger entry records pre- and post-tax balances."""
        economy = make_economy({'citizen1': 600})
        result = apply_wealth_tax(economy)
        entry = result['ledger'][0]
        self.assertEqual(entry['balanceBefore'], 600)
        self.assertEqual(entry['balanceAfter'], 598)

    def test_ledger_entry_timestamp(self):
        """Ledger entry has a timestamp."""
        ts = 12345.0
        economy = make_economy({'citizen1': 600})
        result = apply_wealth_tax(economy, timestamp=ts)
        entry = result['ledger'][0]
        self.assertEqual(entry['timestamp'], ts)

    def test_no_ledger_entry_when_no_tax(self):
        """No ledger entry is created when no tax is collected."""
        economy = make_economy({'citizen1': 500})
        result = apply_wealth_tax(economy)
        self.assertEqual(len(result['ledger']), 0)

    def test_no_ledger_entry_when_tax_rounds_to_zero(self):
        """No ledger entry when floor(taxable * rate) == 0."""
        economy = make_economy({'citizen1': 501})  # taxable=1, tax=floor(0.02)=0
        result = apply_wealth_tax(economy)
        self.assertEqual(len(result['ledger']), 0)

    def test_existing_ledger_entries_preserved(self):
        """Pre-existing ledger entries are not overwritten."""
        existing = [{'type': 'earn', 'user': 'citizen1', 'amount': 50}]
        economy = make_economy({'citizen1': 600}, ledger=existing)
        result = apply_wealth_tax(economy)
        # Should have the existing entry plus the new wealth_tax entry
        self.assertEqual(len(result['ledger']), 2)
        self.assertEqual(result['ledger'][0]['type'], 'earn')
        self.assertEqual(result['ledger'][1]['type'], 'wealth_tax')

    def test_multiple_citizens_multiple_entries(self):
        """One ledger entry per taxed citizen."""
        economy = make_economy({'c1': 600, 'c2': 800, 'c3': 400})
        result = apply_wealth_tax(economy)
        wt_entries = [e for e in result['ledger'] if e['type'] == 'wealth_tax']
        self.assertEqual(len(wt_entries), 2)
        taxed_users = {e['user'] for e in wt_entries}
        self.assertIn('c1', taxed_users)
        self.assertIn('c2', taxed_users)
        self.assertNotIn('c3', taxed_users)


# ---------------------------------------------------------------------------
# 5. System Account Exemption
# ---------------------------------------------------------------------------

class TestWealthTaxSystemExemption(unittest.TestCase):
    """TREASURY and SYSTEM are never taxed."""

    def test_treasury_not_taxed(self):
        """TREASURY itself is exempt even with balance > 500."""
        economy = make_economy({TREASURY_ID: 10000})
        result = apply_wealth_tax(economy)
        self.assertEqual(result['balances'][TREASURY_ID], 10000)
        self.assertEqual(len(result['ledger']), 0)

    def test_system_not_taxed(self):
        """SYSTEM account is exempt even with balance > 500."""
        economy = make_economy({'SYSTEM': 9999})
        result = apply_wealth_tax(economy)
        self.assertEqual(result['balances']['SYSTEM'], 9999)
        self.assertEqual(len(result['ledger']), 0)

    def test_only_citizens_taxed_not_system_accounts(self):
        """Only real citizens pay; system accounts are exempt."""
        economy = make_economy({
            'citizen1': 600,
            TREASURY_ID: 5000,
            'SYSTEM': 3000,
        })
        result = apply_wealth_tax(economy)
        wt_entries = [e for e in result['ledger'] if e['type'] == 'wealth_tax']
        self.assertEqual(len(wt_entries), 1)
        self.assertEqual(wt_entries[0]['user'], 'citizen1')


# ---------------------------------------------------------------------------
# 6. Multiple Citizens
# ---------------------------------------------------------------------------

class TestWealthTaxMultipleCitizens(unittest.TestCase):
    """Wealth tax applies independently to each citizen."""

    def test_multiple_citizens_all_above_threshold(self):
        """All rich citizens are taxed; balances and treasury are correct."""
        economy = make_economy({
            'c1': 1000,   # taxable=500, tax=10
            'c2': 700,    # taxable=200, tax=4
            'c3': 600,    # taxable=100, tax=2
            TREASURY_ID: 0,
        })
        result = apply_wealth_tax(economy)
        self.assertEqual(result['balances']['c1'], 990)
        self.assertEqual(result['balances']['c2'], 696)
        self.assertEqual(result['balances']['c3'], 598)
        self.assertEqual(result['balances'][TREASURY_ID], 16)

    def test_mixed_above_and_below_threshold(self):
        """Only citizens above 500 are taxed."""
        economy = make_economy({
            'rich1': 600,   # taxed
            'poor1': 100,   # not taxed
            'edge1': 500,   # not taxed (exactly at threshold)
            TREASURY_ID: 0,
        })
        result = apply_wealth_tax(economy)
        self.assertEqual(result['balances']['rich1'], 598)
        self.assertEqual(result['balances']['poor1'], 100)
        self.assertEqual(result['balances']['edge1'], 500)
        self.assertEqual(result['balances'][TREASURY_ID], 2)

    def test_no_citizens_above_threshold(self):
        """No tax collected when all citizens are below threshold."""
        economy = make_economy({
            'c1': 200,
            'c2': 499,
            'c3': 0,
            TREASURY_ID: 100,
        })
        result = apply_wealth_tax(economy)
        self.assertEqual(result['balances'][TREASURY_ID], 100)
        self.assertEqual(len(result['ledger']), 0)


# ---------------------------------------------------------------------------
# 7. Very Large Balances
# ---------------------------------------------------------------------------

class TestWealthTaxLargeBalances(unittest.TestCase):
    """Wealth tax scales linearly for very large balances."""

    def test_very_large_balance(self):
        """Balance 10500: taxable=10000, tax=floor(200)=200."""
        economy = make_economy({'whale': 10500})
        result = apply_wealth_tax(economy)
        self.assertEqual(result['balances']['whale'], 10300)
        self.assertEqual(result['balances'][TREASURY_ID], 200)

    def test_million_balance(self):
        """Balance 1000000: taxable=999500, tax=floor(19990)=19990."""
        economy = make_economy({'ultrawealthy': 1000000})
        result = apply_wealth_tax(economy)
        expected_taxable = 1000000 - 500
        expected_tax = int(expected_taxable * 0.02)
        self.assertEqual(result['balances']['ultrawealthy'], 1000000 - expected_tax)
        self.assertEqual(result['balances'][TREASURY_ID], expected_tax)


# ---------------------------------------------------------------------------
# 8. Idempotency Check (calling twice doesn't double-tax)
# ---------------------------------------------------------------------------

class TestWealthTaxIdempotency(unittest.TestCase):
    """apply_wealth_tax itself is not idempotent — calling it twice taxes twice.
    The game_tick guard (_lastUbiDay) is what prevents double-taxing per day.
    These tests verify the function itself, not the guard."""

    def test_second_call_taxes_reduced_balance(self):
        """
        Calling apply_wealth_tax twice taxes the already-reduced balance.
        After first call: 598. taxable = 98, tax = floor(98*0.02)=1.
        After second: 597.
        """
        economy = make_economy({'citizen1': 600})
        economy = apply_wealth_tax(economy)
        self.assertEqual(economy['balances']['citizen1'], 598)
        economy = apply_wealth_tax(economy)
        # 598: taxable=98, tax=floor(1.96)=1
        self.assertEqual(economy['balances']['citizen1'], 597)


# ---------------------------------------------------------------------------
# 9. Integration with game_tick._distribute_ubi
# ---------------------------------------------------------------------------

class TestWealthTaxInGameTick(unittest.TestCase):
    """Wealth tax fires through _distribute_ubi in game_tick.py."""

    def test_distribute_ubi_applies_wealth_tax(self):
        """Citizens above 500 are taxed when _distribute_ubi runs.

        With citizen1=600 and no other citizens:
          - Wealth tax: citizen1 pays 2 (600->598), TREASURY gets 2
          - UBI: TREASURY=2, 1 eligible citizen, per_player=min(5,2//1)=2
          - citizen1 gets 2 UBI back: 598+2=600
          - Net: citizen1 unchanged, but tax was collected and redistributed
        We verify this by checking that the wealth_tax ledger entry was created.
        """
        state = make_state({
            'citizen1': 600,
            TREASURY_ID: 0,
        })
        _distribute_ubi(state)
        # Ledger must contain a wealth_tax entry even though UBI restored the balance
        wt_entries = [e for e in state['economy'].get('ledger', [])
                      if e.get('type') == 'wealth_tax']
        self.assertEqual(len(wt_entries), 1)
        self.assertEqual(wt_entries[0]['user'], 'citizen1')
        self.assertEqual(wt_entries[0]['amount'], 2)

    def test_distribute_ubi_wealth_tax_credited_to_treasury(self):
        """TREASURY receives wealth tax before distributing UBI.

        Use two citizens so the UBI pool does not fully cancel the tax.
          citizen1=600, citizen2=200, TREASURY=0
          - Wealth tax: citizen1 pays 2 -> TREASURY=2
          - UBI: TREASURY=2, 2 eligible, per_player=min(5, 2//2)=1
          - Both get 1 UBI each, TREASURY depleted by 2
          - citizen1: 598+1=599 (net -1 vs start), citizen2: 200+1=201
        """
        state = make_state({
            'citizen1': 600,
            'citizen2': 200,
            TREASURY_ID: 0,
        })
        _distribute_ubi(state)
        # citizen1 should be less than 600 (paid 2 tax, received 1 UBI => 599)
        self.assertLess(state['economy']['balances']['citizen1'], 600)

    def test_distribute_ubi_no_wealth_tax_for_poor(self):
        """Citizens below 500 should not be taxed by _distribute_ubi."""
        state = make_state({
            'citizen1': 200,
            TREASURY_ID: 10,
        })
        _distribute_ubi(state)
        # citizen1 has 200, below threshold, no wealth tax
        # But they get UBI payout (min(5, 10//1) = 5)
        self.assertGreaterEqual(state['economy']['balances']['citizen1'], 200)

    def test_distribute_ubi_runs_wealth_tax_before_ubi(self):
        """Wealth tax should run before UBI distribution."""
        state = make_state({
            'citizen1': 600,
            'citizen2': 100,
            TREASURY_ID: 0,
        })
        _distribute_ubi(state)
        # After wealth tax: citizen1 pays 2 spark, TREASURY gets 2
        # Then UBI: 2 spark in treasury, 2 citizens -> per_player = min(5, 2//2) = 1
        # citizen1: 598 + 1 = 599, citizen2: 100 + 1 = 101, treasury = 0
        c1 = state['economy']['balances']['citizen1']
        c2 = state['economy']['balances']['citizen2']
        self.assertGreaterEqual(c2, 100)  # No wealth tax on citizen2
        # citizen1 was taxed, but may have received UBI back
        self.assertLessEqual(c1, 600)

    def test_distribute_ubi_does_not_repeat_same_day(self):
        """Wealth tax does not fire twice on the same game day."""
        state = make_state({
            'citizen1': 600,
            TREASURY_ID: 0,
        })
        _distribute_ubi(state)
        balance_after_first = state['economy']['balances']['citizen1']

        # Try distributing again on same day — should be a no-op
        _distribute_ubi(state)
        balance_after_second = state['economy']['balances']['citizen1']
        self.assertEqual(balance_after_first, balance_after_second)

    def test_distribute_ubi_wealth_tax_recorded_in_transactions(self):
        """Wealth tax is mirrored into economy['transactions'] for backward compat."""
        state = make_state({
            'citizen1': 600,
            TREASURY_ID: 0,
        })
        _distribute_ubi(state)
        wt_txns = [t for t in state['economy']['transactions']
                   if t.get('type') == 'wealth_tax']
        self.assertEqual(len(wt_txns), 1)
        self.assertEqual(wt_txns[0]['from'], 'citizen1')
        self.assertEqual(wt_txns[0]['amount'], 2)

    def test_distribute_ubi_wealth_tax_in_ledger(self):
        """Wealth tax is recorded in the ledger via economy_engine."""
        state = make_state({
            'citizen1': 600,
            TREASURY_ID: 0,
        })
        _distribute_ubi(state)
        wt_entries = [e for e in state['economy'].get('ledger', [])
                      if e.get('type') == 'wealth_tax']
        self.assertEqual(len(wt_entries), 1)
        self.assertEqual(wt_entries[0]['user'], 'citizen1')
        self.assertEqual(wt_entries[0]['amount'], 2)


# ---------------------------------------------------------------------------
# 10. Constants Exposed for Import
# ---------------------------------------------------------------------------

class TestWealthTaxConstants(unittest.TestCase):
    """Verify constants match the constitution."""

    def test_threshold_is_500(self):
        """§6.4.6 specifies 500 as the wealth tax threshold."""
        self.assertEqual(WEALTH_TAX_THRESHOLD, 500)

    def test_rate_is_2_percent(self):
        """§6.4.6 specifies 2% wealth tax rate."""
        self.assertAlmostEqual(WEALTH_TAX_RATE, 0.02)

    def test_treasury_id_constant(self):
        """TREASURY_ID should be 'TREASURY' in both modules."""
        self.assertEqual(TREASURY_ID, 'TREASURY')
        self.assertEqual(GT_TREASURY_ID, 'TREASURY')


# ---------------------------------------------------------------------------
# 11. Edge Cases
# ---------------------------------------------------------------------------

class TestWealthTaxEdgeCases(unittest.TestCase):
    """Edge cases and guard conditions."""

    def test_empty_economy_no_error(self):
        """apply_wealth_tax handles empty economy gracefully."""
        economy = {}
        result = apply_wealth_tax(economy)
        self.assertIn('balances', result)
        self.assertIn('ledger', result)
        self.assertEqual(result['balances'].get(TREASURY_ID, 0), 0)

    def test_empty_balances_no_error(self):
        """No citizens means no tax and no error."""
        economy = make_economy({})
        result = apply_wealth_tax(economy)
        self.assertEqual(len(result['ledger']), 0)

    def test_balance_does_not_go_negative(self):
        """
        With balance just over threshold and extremely small rate, tax rounds to 0.
        Even if somehow called with a balance that would go negative, the function
        should not produce a negative balance (tax is floored at 0).
        """
        # floor((501-500)*0.02) = floor(0.02) = 0 — safe
        economy = make_economy({'citizen1': 501})
        result = apply_wealth_tax(economy)
        self.assertGreaterEqual(result['balances']['citizen1'], 501)

    def test_ledger_initialized_if_missing(self):
        """apply_wealth_tax initializes ledger if not present."""
        economy = {'balances': {'citizen1': 600}}  # no 'ledger' key
        result = apply_wealth_tax(economy)
        self.assertIn('ledger', result)

    def test_balances_initialized_if_missing(self):
        """apply_wealth_tax initializes balances if not present."""
        economy = {'ledger': []}  # no 'balances' key
        result = apply_wealth_tax(economy)
        self.assertIn('balances', result)

    def test_custom_timestamp_used(self):
        """Caller-supplied timestamp is used in ledger entries."""
        custom_ts = 9999999.0
        economy = make_economy({'citizen1': 600})
        result = apply_wealth_tax(economy, timestamp=custom_ts)
        entry = result['ledger'][0]
        self.assertEqual(entry['timestamp'], custom_ts)

    def test_default_timestamp_is_current_time(self):
        """Default timestamp is close to current time."""
        before = time.time()
        economy = make_economy({'citizen1': 600})
        result = apply_wealth_tax(economy)
        after = time.time()
        entry = result['ledger'][0]
        self.assertGreaterEqual(entry['timestamp'], before)
        self.assertLessEqual(entry['timestamp'], after)


if __name__ == '__main__':
    unittest.main(verbosity=2)
