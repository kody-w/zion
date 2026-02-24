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
    """Verify the wealth tax calculation on amount over threshold."""

    def test_tax_on_excess(self):
        """Standard case: balance over threshold is taxed at configured rate."""
        excess = 100
        balance = WEALTH_TAX_THRESHOLD + excess
        expected_tax = int(excess * WEALTH_TAX_RATE)
        economy = make_economy({'citizen1': balance})
        result = apply_wealth_tax(economy)
        self.assertEqual(result['balances']['citizen1'], balance - expected_tax)

    def test_tax_on_large_excess(self):
        """Large excess is taxed proportionally."""
        excess = 500
        balance = WEALTH_TAX_THRESHOLD + excess
        expected_tax = int(excess * WEALTH_TAX_RATE)
        economy = make_economy({'citizen1': balance})
        result = apply_wealth_tax(economy)
        self.assertEqual(result['balances']['citizen1'], balance - expected_tax)

    def test_tax_floor_rounding(self):
        """Tax uses floor rounding (player-favorable)."""
        # Pick excess where rate gives fractional result
        excess = int(1.5 / WEALTH_TAX_RATE) if WEALTH_TAX_RATE > 0 else 75
        balance = WEALTH_TAX_THRESHOLD + excess
        expected_tax = int(excess * WEALTH_TAX_RATE)
        economy = make_economy({'citizen1': balance})
        result = apply_wealth_tax(economy)
        self.assertEqual(result['balances']['citizen1'], balance - expected_tax)

    def test_tax_rounds_down_not_up(self):
        """Small excess produces 0 tax when floor rounds down."""
        # Find smallest excess where floor(excess * rate) == 0
        small_excess = max(1, int(0.5 / WEALTH_TAX_RATE)) if WEALTH_TAX_RATE > 0 else 1
        balance = WEALTH_TAX_THRESHOLD + small_excess
        expected_tax = int(small_excess * WEALTH_TAX_RATE)
        economy = make_economy({'citizen1': balance})
        result = apply_wealth_tax(economy)
        self.assertEqual(result['balances']['citizen1'], balance - expected_tax)


# ---------------------------------------------------------------------------
# 2. No Tax Below / At Threshold
# ---------------------------------------------------------------------------

class TestWealthTaxNoTaxBelowThreshold(unittest.TestCase):
    """Citizens at or below threshold should pay no wealth tax."""

    def test_balance_zero_no_tax(self):
        economy = make_economy({'citizen1': 0})
        result = apply_wealth_tax(economy)
        self.assertEqual(result['balances']['citizen1'], 0)
        self.assertEqual(len(result['ledger']), 0)

    def test_balance_below_threshold_no_tax(self):
        economy = make_economy({'citizen1': WEALTH_TAX_THRESHOLD - 1})
        result = apply_wealth_tax(economy)
        self.assertEqual(result['balances']['citizen1'], WEALTH_TAX_THRESHOLD - 1)
        self.assertEqual(len(result['ledger']), 0)

    def test_balance_exactly_threshold_no_tax(self):
        """Exactly at threshold — no tax (boundary case)."""
        economy = make_economy({'citizen1': WEALTH_TAX_THRESHOLD})
        result = apply_wealth_tax(economy)
        self.assertEqual(result['balances']['citizen1'], WEALTH_TAX_THRESHOLD)
        self.assertEqual(len(result['ledger']), 0)

    def test_balance_just_over_threshold_small_excess(self):
        """Balance just over threshold, very small excess."""
        economy = make_economy({'citizen1': WEALTH_TAX_THRESHOLD + 1})
        result = apply_wealth_tax(economy)
        expected_tax = int(1 * WEALTH_TAX_RATE)
        self.assertEqual(result['balances']['citizen1'], WEALTH_TAX_THRESHOLD + 1 - expected_tax)
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
        balance = WEALTH_TAX_THRESHOLD + 100
        economy = make_economy({'citizen1': balance, TREASURY_ID: 0})
        result = apply_wealth_tax(economy)
        expected_tax = int(100 * WEALTH_TAX_RATE)
        self.assertEqual(result['balances'][TREASURY_ID], expected_tax)

    def test_treasury_accumulates_from_multiple(self):
        """TREASURY receives sum of taxes from all taxed citizens."""
        b1 = WEALTH_TAX_THRESHOLD + 100
        b2 = WEALTH_TAX_THRESHOLD + 500
        economy = make_economy({
            'citizen1': b1,
            'citizen2': b2,
            TREASURY_ID: 0,
        })
        result = apply_wealth_tax(economy)
        t1 = int(100 * WEALTH_TAX_RATE)
        t2 = int(500 * WEALTH_TAX_RATE)
        self.assertEqual(result['balances'][TREASURY_ID], t1 + t2)

    def test_treasury_existing_balance_not_lost(self):
        """Existing TREASURY balance is preserved and tax is added to it."""
        balance = WEALTH_TAX_THRESHOLD + 100
        economy = make_economy({'citizen1': balance, TREASURY_ID: 50})
        result = apply_wealth_tax(economy)
        expected_tax = int(100 * WEALTH_TAX_RATE)
        self.assertEqual(result['balances'][TREASURY_ID], 50 + expected_tax)

    def test_conservation_citizen_loss_equals_treasury_gain(self):
        """Total Spark is conserved: citizen loss == treasury gain."""
        initial_citizen = WEALTH_TAX_THRESHOLD + 300
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
        balance = WEALTH_TAX_THRESHOLD + 100
        economy = make_economy({'citizen1': balance})  # no TREASURY key
        result = apply_wealth_tax(economy)
        expected_tax = int(100 * WEALTH_TAX_RATE)
        self.assertIn(TREASURY_ID, result['balances'])
        self.assertEqual(result['balances'][TREASURY_ID], expected_tax)


# ---------------------------------------------------------------------------
# 4. Ledger Entries
# ---------------------------------------------------------------------------

class TestWealthTaxLedgerEntries(unittest.TestCase):
    """Wealth tax must be recorded in the public ledger with full detail."""

    def test_ledger_entry_type(self):
        """Ledger entry type must be 'wealth_tax'."""
        economy = make_economy({'citizen1': WEALTH_TAX_THRESHOLD + 100})
        result = apply_wealth_tax(economy)
        entries = [e for e in result['ledger'] if e.get('type') == 'wealth_tax']
        self.assertEqual(len(entries), 1)

    def test_ledger_entry_user(self):
        """Ledger entry records the correct citizen ID."""
        economy = make_economy({'citizen1': WEALTH_TAX_THRESHOLD + 100})
        result = apply_wealth_tax(economy)
        entry = result['ledger'][0]
        self.assertEqual(entry['user'], 'citizen1')

    def test_ledger_entry_amount(self):
        """Ledger entry amount matches actual tax deducted."""
        balance = WEALTH_TAX_THRESHOLD + 100
        economy = make_economy({'citizen1': balance})
        result = apply_wealth_tax(economy)
        entry = result['ledger'][0]
        expected_tax = int(100 * WEALTH_TAX_RATE)
        self.assertEqual(entry['amount'], expected_tax)

    def test_ledger_entry_taxable_amount(self):
        """Ledger entry records taxable amount (balance over threshold)."""
        economy = make_economy({'citizen1': WEALTH_TAX_THRESHOLD + 100})
        result = apply_wealth_tax(economy)
        entry = result['ledger'][0]
        self.assertEqual(entry['taxableAmount'], 100)

    def test_ledger_entry_tax_rate(self):
        """Ledger entry records the correct tax rate."""
        economy = make_economy({'citizen1': WEALTH_TAX_THRESHOLD + 100})
        result = apply_wealth_tax(economy)
        entry = result['ledger'][0]
        self.assertAlmostEqual(entry['taxRate'], WEALTH_TAX_RATE)

    def test_ledger_entry_threshold(self):
        """Ledger entry records the threshold value."""
        economy = make_economy({'citizen1': WEALTH_TAX_THRESHOLD + 100})
        result = apply_wealth_tax(economy)
        entry = result['ledger'][0]
        self.assertEqual(entry['threshold'], WEALTH_TAX_THRESHOLD)

    def test_ledger_entry_balance_before_after(self):
        """Ledger entry records pre- and post-tax balances."""
        balance = WEALTH_TAX_THRESHOLD + 100
        expected_tax = int(100 * WEALTH_TAX_RATE)
        economy = make_economy({'citizen1': balance})
        result = apply_wealth_tax(economy)
        entry = result['ledger'][0]
        self.assertEqual(entry['balanceBefore'], balance)
        self.assertEqual(entry['balanceAfter'], balance - expected_tax)

    def test_ledger_entry_timestamp(self):
        """Ledger entry has a timestamp."""
        ts = 12345.0
        economy = make_economy({'citizen1': WEALTH_TAX_THRESHOLD + 100})
        result = apply_wealth_tax(economy, timestamp=ts)
        entry = result['ledger'][0]
        self.assertEqual(entry['timestamp'], ts)

    def test_no_ledger_entry_when_no_tax(self):
        """No ledger entry is created when no tax is collected."""
        economy = make_economy({'citizen1': WEALTH_TAX_THRESHOLD})
        result = apply_wealth_tax(economy)
        self.assertEqual(len(result['ledger']), 0)

    def test_no_ledger_entry_when_tax_rounds_to_zero(self):
        """No ledger entry when floor(taxable * rate) == 0."""
        # Need taxable amount where floor(taxable * rate) == 0
        # With rate=0.02, taxable must be < 50 (floor(49*0.02) = 0)
        small_excess = max(1, int(1 / WEALTH_TAX_RATE) - 1)
        economy = make_economy({'citizen1': WEALTH_TAX_THRESHOLD + small_excess})
        result = apply_wealth_tax(economy)
        self.assertEqual(len(result['ledger']), 0)

    def test_existing_ledger_entries_preserved(self):
        """Pre-existing ledger entries are not overwritten."""
        existing = [{'type': 'earn', 'user': 'citizen1', 'amount': 50}]
        economy = make_economy({'citizen1': WEALTH_TAX_THRESHOLD + 100}, ledger=existing)
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
        """TREASURY itself is exempt even with balance > threshold."""
        economy = make_economy({TREASURY_ID: 10000})
        result = apply_wealth_tax(economy)
        self.assertEqual(result['balances'][TREASURY_ID], 10000)
        self.assertEqual(len(result['ledger']), 0)

    def test_system_not_taxed(self):
        """SYSTEM account is exempt even with balance > threshold."""
        economy = make_economy({'SYSTEM': 9999})
        result = apply_wealth_tax(economy)
        self.assertEqual(result['balances']['SYSTEM'], 9999)
        self.assertEqual(len(result['ledger']), 0)

    def test_only_citizens_taxed_not_system_accounts(self):
        """Only real citizens pay; system accounts are exempt."""
        economy = make_economy({
            'citizen1': WEALTH_TAX_THRESHOLD + 100,
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
        c1_bal = WEALTH_TAX_THRESHOLD + 500
        c2_bal = WEALTH_TAX_THRESHOLD + 200
        c3_bal = WEALTH_TAX_THRESHOLD + 100
        economy = make_economy({
            'c1': c1_bal,
            'c2': c2_bal,
            'c3': c3_bal,
            TREASURY_ID: 0,
        })
        result = apply_wealth_tax(economy)
        t1 = int(500 * WEALTH_TAX_RATE)
        t2 = int(200 * WEALTH_TAX_RATE)
        t3 = int(100 * WEALTH_TAX_RATE)
        self.assertEqual(result['balances']['c1'], c1_bal - t1)
        self.assertEqual(result['balances']['c2'], c2_bal - t2)
        self.assertEqual(result['balances']['c3'], c3_bal - t3)
        self.assertEqual(result['balances'][TREASURY_ID], t1 + t2 + t3)

    def test_mixed_above_and_below_threshold(self):
        """Only citizens above threshold are taxed."""
        rich_bal = WEALTH_TAX_THRESHOLD + 100
        economy = make_economy({
            'rich1': rich_bal,
            'poor1': 100,
            'edge1': WEALTH_TAX_THRESHOLD,
            TREASURY_ID: 0,
        })
        result = apply_wealth_tax(economy)
        expected_tax = int(100 * WEALTH_TAX_RATE)
        self.assertEqual(result['balances']['rich1'], rich_bal - expected_tax)
        self.assertEqual(result['balances']['poor1'], 100)
        self.assertEqual(result['balances']['edge1'], WEALTH_TAX_THRESHOLD)
        self.assertEqual(result['balances'][TREASURY_ID], expected_tax)

    def test_no_citizens_above_threshold(self):
        """No tax collected when all citizens are below threshold."""
        below = max(1, WEALTH_TAX_THRESHOLD - 1)
        economy = make_economy({
            'c1': 200,
            'c2': below,
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
        """Very large balance: taxed on excess over threshold."""
        economy = make_economy({'whale': WEALTH_TAX_THRESHOLD + 10000})
        result = apply_wealth_tax(economy)
        expected_tax = int(10000 * WEALTH_TAX_RATE)
        self.assertEqual(result['balances']['whale'], WEALTH_TAX_THRESHOLD + 10000 - expected_tax)
        self.assertEqual(result['balances'][TREASURY_ID], expected_tax)

    def test_million_balance(self):
        """Balance 1000000: taxable=999500, tax=floor(19990)=19990."""
        economy = make_economy({'ultrawealthy': 1000000})
        result = apply_wealth_tax(economy)
        expected_taxable = 1000000 - WEALTH_TAX_THRESHOLD
        expected_tax = int(expected_taxable * WEALTH_TAX_RATE)
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
        """
        balance = WEALTH_TAX_THRESHOLD + 100
        economy = make_economy({'citizen1': balance})
        economy = apply_wealth_tax(economy)
        tax1 = int(100 * WEALTH_TAX_RATE)
        after_first = balance - tax1
        self.assertEqual(economy['balances']['citizen1'], after_first)
        economy = apply_wealth_tax(economy)
        taxable2 = after_first - WEALTH_TAX_THRESHOLD
        tax2 = int(taxable2 * WEALTH_TAX_RATE)
        self.assertEqual(economy['balances']['citizen1'], after_first - tax2)


# ---------------------------------------------------------------------------
# 9. Integration with game_tick._distribute_ubi
# ---------------------------------------------------------------------------

class TestWealthTaxInGameTick(unittest.TestCase):
    """Wealth tax fires through _distribute_ubi in game_tick.py."""

    def test_distribute_ubi_applies_wealth_tax(self):
        """Citizens above threshold are taxed when _distribute_ubi runs.

        With citizen1=600 and no other citizens:
          - Wealth tax: citizen1 pays 2 (600->598), TREASURY gets 2
          - UBI: TREASURY=2, 1 eligible citizen, per_player=min(5,2//1)=2
          - citizen1 gets 2 UBI back: 598+2=600
          - Net: citizen1 unchanged, but tax was collected and redistributed
        We verify this by checking that the wealth_tax ledger entry was created.
        """
        state = make_state({
            'citizen1': WEALTH_TAX_THRESHOLD + 100,
            TREASURY_ID: 0,
        })
        _distribute_ubi(state)
        # Ledger must contain a wealth_tax entry even though UBI restored the balance
        wt_entries = [e for e in state['economy'].get('ledger', [])
                      if e.get('type') == 'wealth_tax']
        self.assertEqual(len(wt_entries), 1)
        self.assertEqual(wt_entries[0]['user'], 'citizen1')
        expected_tax = int(100 * WEALTH_TAX_RATE)
        self.assertEqual(wt_entries[0]['amount'], expected_tax)

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
            'citizen1': WEALTH_TAX_THRESHOLD + 100,
            'citizen2': 200,
            TREASURY_ID: 0,
        })
        _distribute_ubi(state)
        # citizen1 should be less than starting balance (paid 2 tax, received 1 UBI => 599)
        self.assertLess(state['economy']['balances']['citizen1'], WEALTH_TAX_THRESHOLD + 100)

    def test_distribute_ubi_no_wealth_tax_for_poor(self):
        """Citizens below threshold should not be taxed by _distribute_ubi."""
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
            'citizen1': WEALTH_TAX_THRESHOLD + 100,
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
        self.assertLessEqual(c1, WEALTH_TAX_THRESHOLD + 100)

    def test_distribute_ubi_does_not_repeat_same_day(self):
        """Wealth tax does not fire twice on the same game day."""
        state = make_state({
            'citizen1': WEALTH_TAX_THRESHOLD + 100,
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
            'citizen1': WEALTH_TAX_THRESHOLD + 100,
            TREASURY_ID: 0,
        })
        _distribute_ubi(state)
        wt_txns = [t for t in state['economy']['transactions']
                   if t.get('type') == 'wealth_tax']
        self.assertEqual(len(wt_txns), 1)
        self.assertEqual(wt_txns[0]['from'], 'citizen1')
        self.assertEqual(wt_txns[0]['amount'], int(100 * WEALTH_TAX_RATE))

    def test_distribute_ubi_wealth_tax_in_ledger(self):
        """Wealth tax is recorded in the ledger via economy_engine."""
        state = make_state({
            'citizen1': WEALTH_TAX_THRESHOLD + 100,
            TREASURY_ID: 0,
        })
        _distribute_ubi(state)
        wt_entries = [e for e in state['economy'].get('ledger', [])
                      if e.get('type') == 'wealth_tax']
        self.assertEqual(len(wt_entries), 1)
        self.assertEqual(wt_entries[0]['user'], 'citizen1')
        self.assertEqual(wt_entries[0]['amount'], int(100 * WEALTH_TAX_RATE))


# ---------------------------------------------------------------------------
# 10. Constants Exposed for Import
# ---------------------------------------------------------------------------

class TestWealthTaxConstants(unittest.TestCase):
    """Verify constants match the constitution."""

    def test_threshold_is_positive(self):
        """Wealth tax threshold should be a positive value."""
        self.assertGreater(WEALTH_TAX_THRESHOLD, 0)

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
        # Very small excess — safe
        small_excess = max(1, int(1 / WEALTH_TAX_RATE) - 1)
        balance = WEALTH_TAX_THRESHOLD + small_excess
        economy = make_economy({'citizen1': balance})
        result = apply_wealth_tax(economy)
        self.assertGreaterEqual(result['balances']['citizen1'], WEALTH_TAX_THRESHOLD)

    def test_ledger_initialized_if_missing(self):
        """apply_wealth_tax initializes ledger if not present."""
        economy = {'balances': {'citizen1': WEALTH_TAX_THRESHOLD + 100}}  # no 'ledger' key
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
        economy = make_economy({'citizen1': WEALTH_TAX_THRESHOLD + 100})
        result = apply_wealth_tax(economy, timestamp=custom_ts)
        entry = result['ledger'][0]
        self.assertEqual(entry['timestamp'], custom_ts)

    def test_default_timestamp_is_current_time(self):
        """Default timestamp is close to current time."""
        before = time.time()
        economy = make_economy({'citizen1': WEALTH_TAX_THRESHOLD + 100})
        result = apply_wealth_tax(economy)
        after = time.time()
        entry = result['ledger'][0]
        self.assertGreaterEqual(entry['timestamp'], before)
        self.assertLessEqual(entry['timestamp'], after)


if __name__ == '__main__':
    unittest.main(verbosity=2)
