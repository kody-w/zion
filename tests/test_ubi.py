#!/usr/bin/env python3
"""
Comprehensive tests for UBI (Universal Basic Income) distribution.

Covers economy_engine.distribute_ubi and economy_engine.get_ubi_eligible_citizens
as mandated by CONSTITUTION.md §6.4 (Progressive Taxation and Universal Basic Income).

Test categories:
  - UBI calculation from tax pool (Treasury-funded distribution)
  - Equal distribution to all citizens
  - Ledger entry creation (type "ubi_distribution", §6.4.7 transparency)
  - TREASURY balance tracking (§6.4.3: TREASURY cannot go negative)
  - Idempotency (once per game day, §6.4.4)
  - Edge cases: no tax revenue, single citizen, zero treasury, many citizens
  - Integration with game_tick._distribute_ubi
"""
import json
import os
import sys
import time
import unittest

# Make sure scripts/ is importable
_SCRIPTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'scripts')
sys.path.insert(0, _SCRIPTS_DIR)

from economy_engine import (
    TREASURY_ID,
    SYSTEM_ID,
    BASE_UBI_AMOUNT,
    distribute_ubi,
    get_ubi_eligible_citizens,
    process_earnings,
    apply_wealth_tax,
)
from game_tick import _distribute_ubi as game_tick_distribute_ubi


# ---------------------------------------------------------------------------
# Helper factory
# ---------------------------------------------------------------------------

def _economy(balances=None, ledger=None, last_ubi_day=None):
    """Build a minimal economy dict for testing."""
    eco = {
        'balances': dict(balances or {}),
        'ledger': list(ledger or []),
    }
    if last_ubi_day is not None:
        eco['_lastUbiDay'] = last_ubi_day
    return eco


def _state(world_time=0, economy=None, structures=None, last_ubi_day=None):
    """Build a minimal game state dict for testing _distribute_ubi."""
    s = {
        'worldTime': world_time,
        'economy': economy or _economy(),
    }
    if structures is not None:
        s['structures'] = structures
    if last_ubi_day is not None:
        s['_lastUbiDay'] = last_ubi_day
    return s


# ---------------------------------------------------------------------------
# 1. get_ubi_eligible_citizens
# ---------------------------------------------------------------------------

class TestGetUBIEligibleCitizens(unittest.TestCase):
    """Test that eligibility correctly excludes system accounts."""

    def test_empty_economy_returns_empty_list(self):
        eco = _economy()
        self.assertEqual(get_ubi_eligible_citizens(eco), [])

    def test_economy_without_balances_key(self):
        """If 'balances' key is missing, return empty list."""
        self.assertEqual(get_ubi_eligible_citizens({}), [])

    def test_excludes_treasury(self):
        eco = _economy(balances={TREASURY_ID: 100, 'alice': 10})
        eligible = get_ubi_eligible_citizens(eco)
        self.assertNotIn(TREASURY_ID, eligible)
        self.assertIn('alice', eligible)

    def test_excludes_system(self):
        eco = _economy(balances={SYSTEM_ID: 50, 'bob': 5})
        eligible = get_ubi_eligible_citizens(eco)
        self.assertNotIn(SYSTEM_ID, eligible)
        self.assertIn('bob', eligible)

    def test_excludes_both_system_accounts(self):
        eco = _economy(balances={TREASURY_ID: 200, SYSTEM_ID: 0, 'c1': 10, 'c2': 20})
        eligible = get_ubi_eligible_citizens(eco)
        self.assertEqual(set(eligible), {'c1', 'c2'})

    def test_includes_zero_balance_citizens(self):
        """Citizens at 0 Spark are still eligible — no minimum balance."""
        eco = _economy(balances={'broke_citizen': 0, TREASURY_ID: 50})
        eligible = get_ubi_eligible_citizens(eco)
        self.assertIn('broke_citizen', eligible)

    def test_includes_ai_agents(self):
        eco = _economy(balances={'agent_001': 30, 'agent_002': 15, TREASURY_ID: 100})
        eligible = get_ubi_eligible_citizens(eco)
        self.assertIn('agent_001', eligible)
        self.assertIn('agent_002', eligible)

    def test_single_citizen(self):
        eco = _economy(balances={'lone_ranger': 7, TREASURY_ID: 20})
        eligible = get_ubi_eligible_citizens(eco)
        self.assertEqual(eligible, ['lone_ranger'])

    def test_many_citizens(self):
        balances = {f'citizen_{i}': i for i in range(20)}
        balances[TREASURY_ID] = 1000
        eco = _economy(balances=balances)
        eligible = get_ubi_eligible_citizens(eco)
        self.assertEqual(len(eligible), 20)
        self.assertNotIn(TREASURY_ID, eligible)


# ---------------------------------------------------------------------------
# 2. UBI calculation from tax pool
# ---------------------------------------------------------------------------

class TestUBICalculationFromTaxPool(unittest.TestCase):
    """Test that UBI amount is correctly derived from TREASURY balance."""

    def test_per_citizen_capped_at_base_ubi_amount(self):
        """When treasury is very large, each citizen gets BASE_UBI_AMOUNT (5)."""
        eco = _economy(balances={TREASURY_ID: 10000, 'u1': 0, 'u2': 0, 'u3': 0})
        distribute_ubi(eco, game_day=1)
        # Each should receive exactly BASE_UBI_AMOUNT
        self.assertEqual(eco['balances']['u1'], BASE_UBI_AMOUNT)
        self.assertEqual(eco['balances']['u2'], BASE_UBI_AMOUNT)
        self.assertEqual(eco['balances']['u3'], BASE_UBI_AMOUNT)

    def test_per_citizen_limited_by_treasury(self):
        """When treasury is small, per-citizen amount is floor(treasury/count)."""
        # treasury=3, citizens=2 -> floor(3/2)=1 each
        eco = _economy(balances={TREASURY_ID: 3, 'a': 0, 'b': 0})
        distribute_ubi(eco, game_day=1)
        self.assertEqual(eco['balances']['a'], 1)
        self.assertEqual(eco['balances']['b'], 1)
        # TREASURY should be 1 left (distributed 2, had 3)
        self.assertEqual(eco['balances'][TREASURY_ID], 1)

    def test_per_citizen_uses_floor_division(self):
        """Distribution uses integer floor division — player-favorable rounding."""
        # treasury=10, 3 citizens -> floor(10/3)=3 each (not 3.33)
        eco = _economy(balances={TREASURY_ID: 10, 'x': 0, 'y': 0, 'z': 0})
        distribute_ubi(eco, game_day=1)
        self.assertEqual(eco['balances']['x'], 3)
        self.assertEqual(eco['balances']['y'], 3)
        self.assertEqual(eco['balances']['z'], 3)
        # TREASURY distributed 9, left with 1
        self.assertEqual(eco['balances'][TREASURY_ID], 1)

    def test_uses_total_tax_revenue_in_treasury(self):
        """UBI draws from the TREASURY (which accumulates progressive tax)."""
        # First earn some Spark with taxable balance — taxes go to TREASURY
        eco = {'balances': {'rich_user': 500}, 'ledger': []}
        actions = [{'type': 'discover', 'from': 'rich_user', 'ts': '2026-01-01'}]
        eco = process_earnings(eco, actions)
        # discover earns 20 at 40% -> 8 tax to treasury
        self.assertGreater(eco['balances'].get(TREASURY_ID, 0), 0)
        treasury_before = eco['balances'][TREASURY_ID]

        # Now distribute UBI
        eco['balances']['new_citizen'] = 0
        distribute_ubi(eco, game_day=1)

        # New citizen should have received something
        self.assertGreater(eco['balances']['new_citizen'], 0)
        # Treasury should have decreased
        self.assertLess(eco['balances'][TREASURY_ID], treasury_before)


# ---------------------------------------------------------------------------
# 3. Equal distribution to all citizens
# ---------------------------------------------------------------------------

class TestEqualDistribution(unittest.TestCase):
    """Test that UBI distributes the same amount to every eligible citizen."""

    def test_all_citizens_receive_equal_amount(self):
        eco = _economy(balances={TREASURY_ID: 50, 'c1': 0, 'c2': 100, 'c3': 500})
        distribute_ubi(eco, game_day=1)
        # All three get 5 (min(5, 50//3) = min(5,16) = 5)
        c1_gain = eco['balances']['c1'] - 0
        c2_gain = eco['balances']['c2'] - 100
        c3_gain = eco['balances']['c3'] - 500
        self.assertEqual(c1_gain, c2_gain)
        self.assertEqual(c2_gain, c3_gain)

    def test_rich_and_poor_get_same_amount(self):
        """UBI is unconditional — same amount regardless of existing balance."""
        eco = _economy(balances={TREASURY_ID: 100, 'millionaire': 9999, 'pauper': 0})
        distribute_ubi(eco, game_day=1)
        millionaire_gain = eco['balances']['millionaire'] - 9999
        pauper_gain = eco['balances']['pauper'] - 0
        self.assertEqual(millionaire_gain, pauper_gain)

    def test_five_citizens_each_get_five(self):
        citizens = {f'c{i}': 0 for i in range(5)}
        citizens[TREASURY_ID] = 100
        eco = _economy(balances=citizens)
        distribute_ubi(eco, game_day=1)
        for i in range(5):
            self.assertEqual(eco['balances'][f'c{i}'], 5)

    def test_single_citizen_gets_min_of_5_and_treasury(self):
        """Single citizen gets min(5, treasury) — no splitting needed."""
        eco = _economy(balances={TREASURY_ID: 3, 'only_one': 0})
        distribute_ubi(eco, game_day=1)
        # floor(3/1) = 3, min(5, 3) = 3
        self.assertEqual(eco['balances']['only_one'], 3)
        self.assertEqual(eco['balances'][TREASURY_ID], 0)

    def test_single_citizen_capped_at_base_ubi(self):
        """Single citizen gets at most BASE_UBI_AMOUNT even if treasury is huge."""
        eco = _economy(balances={TREASURY_ID: 9999, 'lucky': 0})
        distribute_ubi(eco, game_day=1)
        self.assertEqual(eco['balances']['lucky'], BASE_UBI_AMOUNT)


# ---------------------------------------------------------------------------
# 4. Ledger entry creation
# ---------------------------------------------------------------------------

class TestLedgerEntries(unittest.TestCase):
    """Verify that every UBI payment creates a proper 'ubi_distribution' ledger entry."""

    def test_ledger_entry_type_is_ubi_distribution(self):
        eco = _economy(balances={TREASURY_ID: 20, 'citizen': 0})
        distribute_ubi(eco, game_day=1)
        ubi_entries = [e for e in eco['ledger'] if e['type'] == 'ubi_distribution']
        self.assertEqual(len(ubi_entries), 1)

    def test_ledger_entry_has_correct_user(self):
        eco = _economy(balances={TREASURY_ID: 20, 'charlie': 0})
        distribute_ubi(eco, game_day=1)
        entry = next(e for e in eco['ledger'] if e['type'] == 'ubi_distribution')
        self.assertEqual(entry['user'], 'charlie')

    def test_ledger_entry_has_correct_amount(self):
        eco = _economy(balances={TREASURY_ID: 20, 'diana': 0})
        distribute_ubi(eco, game_day=1)
        entry = next(e for e in eco['ledger'] if e['type'] == 'ubi_distribution')
        self.assertEqual(entry['amount'], 5)

    def test_ledger_entry_has_game_day(self):
        eco = _economy(balances={TREASURY_ID: 20, 'earl': 0})
        distribute_ubi(eco, game_day=7)
        entry = next(e for e in eco['ledger'] if e['type'] == 'ubi_distribution')
        self.assertEqual(entry['gameDay'], 7)

    def test_ledger_entry_has_eligible_count(self):
        eco = _economy(balances={TREASURY_ID: 50, 'f1': 0, 'f2': 0})
        distribute_ubi(eco, game_day=1)
        entries = [e for e in eco['ledger'] if e['type'] == 'ubi_distribution']
        for entry in entries:
            self.assertEqual(entry['eligibleCount'], 2)

    def test_ledger_entry_has_timestamp(self):
        fixed_ts = 1234567890.0
        eco = _economy(balances={TREASURY_ID: 10, 'g': 0})
        distribute_ubi(eco, game_day=1, timestamp=fixed_ts)
        entry = next(e for e in eco['ledger'] if e['type'] == 'ubi_distribution')
        self.assertEqual(entry['timestamp'], fixed_ts)

    def test_one_ledger_entry_per_citizen(self):
        """Each citizen generates exactly one ledger entry."""
        citizens = {f'h{i}': 0 for i in range(4)}
        citizens[TREASURY_ID] = 100
        eco = _economy(balances=citizens)
        distribute_ubi(eco, game_day=1)
        ubi_entries = [e for e in eco['ledger'] if e['type'] == 'ubi_distribution']
        self.assertEqual(len(ubi_entries), 4)

    def test_no_ledger_entry_when_treasury_empty(self):
        eco = _economy(balances={TREASURY_ID: 0, 'citizen': 5})
        distribute_ubi(eco, game_day=1)
        ubi_entries = [e for e in eco['ledger'] if e['type'] == 'ubi_distribution']
        self.assertEqual(len(ubi_entries), 0)

    def test_no_ledger_entry_when_no_eligible_citizens(self):
        eco = _economy(balances={TREASURY_ID: 100})
        distribute_ubi(eco, game_day=1)
        ubi_entries = [e for e in eco['ledger'] if e['type'] == 'ubi_distribution']
        self.assertEqual(len(ubi_entries), 0)

    def test_ledger_entries_use_custom_timestamp(self):
        """Callers can provide a timestamp for deterministic testing."""
        ts = 9999.0
        eco = _economy(balances={TREASURY_ID: 10, 'i1': 0, 'i2': 0})
        distribute_ubi(eco, game_day=1, timestamp=ts)
        ubi_entries = [e for e in eco['ledger'] if e['type'] == 'ubi_distribution']
        for entry in ubi_entries:
            self.assertEqual(entry['timestamp'], ts)


# ---------------------------------------------------------------------------
# 5. TREASURY balance tracking
# ---------------------------------------------------------------------------

class TestTreasuryTracking(unittest.TestCase):
    """Verify TREASURY is debited correctly and never goes negative."""

    def test_treasury_decreases_by_total_distributed(self):
        eco = _economy(balances={TREASURY_ID: 50, 'j1': 0, 'j2': 0, 'j3': 0})
        distribute_ubi(eco, game_day=1)
        # 3 citizens * 5 Spark = 15 distributed
        self.assertEqual(eco['balances'][TREASURY_ID], 50 - 15)

    def test_treasury_never_goes_negative(self):
        """TREASURY balance must be >= 0 after distribution."""
        eco = _economy(balances={TREASURY_ID: 7, 'k1': 0, 'k2': 0, 'k3': 0})
        distribute_ubi(eco, game_day=1)
        # floor(7/3) = 2 each -> distributed 6, left 1
        self.assertGreaterEqual(eco['balances'][TREASURY_ID], 0)

    def test_treasury_exactly_zero_does_nothing(self):
        """If TREASURY starts at 0, no distribution occurs."""
        eco = _economy(balances={TREASURY_ID: 0, 'l': 5})
        distribute_ubi(eco, game_day=1)
        self.assertEqual(eco['balances']['l'], 5)
        self.assertEqual(eco['balances'][TREASURY_ID], 0)

    def test_treasury_initialized_if_missing(self):
        """distribute_ubi should not crash if TREASURY is not in balances."""
        eco = {'balances': {'m': 5}, 'ledger': []}
        distribute_ubi(eco, game_day=1)
        # TREASURY should be created at 0 and no distribution happens
        self.assertIn(TREASURY_ID, eco['balances'])
        self.assertEqual(eco['balances'][TREASURY_ID], 0)

    def test_treasury_conserved_across_distribution(self):
        """Total Spark in system is conserved: treasury decrease == citizen increases."""
        eco = _economy(balances={TREASURY_ID: 30, 'n1': 10, 'n2': 20})
        treasury_before = eco['balances'][TREASURY_ID]
        n1_before = eco['balances']['n1']
        n2_before = eco['balances']['n2']

        distribute_ubi(eco, game_day=1)

        treasury_after = eco['balances'][TREASURY_ID]
        n1_after = eco['balances']['n1']
        n2_after = eco['balances']['n2']

        total_before = treasury_before + n1_before + n2_before
        total_after = treasury_after + n1_after + n2_after
        self.assertEqual(total_before, total_after,
                         "Total Spark should be conserved during UBI distribution")

    def test_treasury_balance_tracks_over_multiple_days(self):
        """Each game day draws from the treasury once."""
        eco = _economy(balances={TREASURY_ID: 100, 'p': 0})
        distribute_ubi(eco, game_day=0)
        after_day0 = eco['balances'][TREASURY_ID]
        distribute_ubi(eco, game_day=1)
        after_day1 = eco['balances'][TREASURY_ID]
        # Day 0 and day 1 should each deduct from treasury
        self.assertLess(after_day1, after_day0)


# ---------------------------------------------------------------------------
# 6. Idempotency: once per game day
# ---------------------------------------------------------------------------

class TestUBIIdempotency(unittest.TestCase):
    """Verify that UBI distributes at most once per game day."""

    def test_does_not_distribute_same_day_twice(self):
        eco = _economy(balances={TREASURY_ID: 50, 'q': 0})
        distribute_ubi(eco, game_day=1)
        balance_after_first = eco['balances']['q']
        treasury_after_first = eco['balances'][TREASURY_ID]

        # Call again for the same day
        distribute_ubi(eco, game_day=1)
        self.assertEqual(eco['balances']['q'], balance_after_first)
        self.assertEqual(eco['balances'][TREASURY_ID], treasury_after_first)

    def test_does_not_distribute_past_day(self):
        """If _lastUbiDay >= game_day, skip distribution."""
        eco = _economy(
            balances={TREASURY_ID: 100, 'r': 5},
            last_ubi_day=5,  # Already distributed through day 5
        )
        distribute_ubi(eco, game_day=3)  # Day 3 <= 5: skip
        self.assertEqual(eco['balances']['r'], 5)

    def test_distributes_on_new_day(self):
        eco = _economy(
            balances={TREASURY_ID: 100, 's': 0},
            last_ubi_day=1,
        )
        distribute_ubi(eco, game_day=2)
        self.assertGreater(eco['balances']['s'], 0)

    def test_last_ubi_day_advanced_after_distribution(self):
        eco = _economy(balances={TREASURY_ID: 50, 't': 0})
        distribute_ubi(eco, game_day=7)
        self.assertEqual(eco['_lastUbiDay'], 7)

    def test_last_ubi_day_advanced_even_with_empty_treasury(self):
        """Even if nothing is distributed, _lastUbiDay should advance."""
        eco = _economy(balances={TREASURY_ID: 0, 'u': 0})
        distribute_ubi(eco, game_day=3)
        self.assertEqual(eco['_lastUbiDay'], 3)

    def test_last_ubi_day_advanced_with_no_citizens(self):
        """Even with no citizens, _lastUbiDay should advance to prevent retries."""
        eco = _economy(balances={TREASURY_ID: 100})
        distribute_ubi(eco, game_day=5)
        self.assertEqual(eco['_lastUbiDay'], 5)

    def test_ten_calls_same_day_distributes_once(self):
        eco = _economy(balances={TREASURY_ID: 50, 'v': 0})
        for _ in range(10):
            distribute_ubi(eco, game_day=1)
        # Should have received only one UBI payment
        self.assertEqual(eco['balances']['v'], 5)


# ---------------------------------------------------------------------------
# 7. Edge cases
# ---------------------------------------------------------------------------

class TestUBIEdgeCases(unittest.TestCase):
    """Edge cases: no tax revenue, single citizen, zero balance treasury, etc."""

    def test_no_tax_revenue_no_distribution(self):
        """If TREASURY is empty (no tax collected), UBI is skipped."""
        eco = _economy(balances={TREASURY_ID: 0, 'citizen': 10})
        distribute_ubi(eco, game_day=1)
        self.assertEqual(eco['balances']['citizen'], 10)
        ubi_entries = [e for e in eco['ledger'] if e['type'] == 'ubi_distribution']
        self.assertEqual(len(ubi_entries), 0)

    def test_no_eligible_citizens_treasury_unchanged(self):
        """With only system accounts, TREASURY should be unchanged."""
        eco = _economy(balances={TREASURY_ID: 100, SYSTEM_ID: 0})
        distribute_ubi(eco, game_day=1)
        self.assertEqual(eco['balances'][TREASURY_ID], 100)

    def test_single_citizen_exact_amount(self):
        eco = _economy(balances={TREASURY_ID: 5, 'solo': 0})
        distribute_ubi(eco, game_day=1)
        self.assertEqual(eco['balances']['solo'], 5)
        self.assertEqual(eco['balances'][TREASURY_ID], 0)

    def test_per_citizen_less_than_one_spark_no_distribution(self):
        """If floor(treasury / citizens) < 1, no distribution occurs."""
        # 2 citizens, 1 Spark treasury: floor(1/2) = 0 -> skip
        eco = _economy(balances={TREASURY_ID: 1, 'w1': 0, 'w2': 0})
        distribute_ubi(eco, game_day=1)
        self.assertEqual(eco['balances']['w1'], 0)
        self.assertEqual(eco['balances']['w2'], 0)
        self.assertEqual(eco['balances'][TREASURY_ID], 1)

    def test_citizen_balance_floor_is_zero(self):
        """No citizen balance can fall below 0 (§6.4.5). UBI only adds, never subtracts."""
        eco = _economy(balances={TREASURY_ID: 50, 'floor_citizen': 0})
        distribute_ubi(eco, game_day=1)
        self.assertGreaterEqual(eco['balances']['floor_citizen'], 0)

    def test_large_number_of_citizens(self):
        """UBI works correctly with many citizens."""
        n = 100
        balances = {f'agent_{i:03d}': 0 for i in range(n)}
        balances[TREASURY_ID] = 1000
        eco = _economy(balances=balances)
        distribute_ubi(eco, game_day=1)
        # floor(1000/100) = 10, but capped at BASE_UBI_AMOUNT (5)
        for i in range(n):
            self.assertEqual(eco['balances'][f'agent_{i:03d}'], BASE_UBI_AMOUNT)
        # Treasury distributed 100 * 5 = 500
        self.assertEqual(eco['balances'][TREASURY_ID], 500)

    def test_ledger_initialized_if_missing(self):
        """If 'ledger' key is absent, distribute_ubi initializes it."""
        eco = {'balances': {TREASURY_ID: 20, 'z': 0}}
        distribute_ubi(eco, game_day=1)
        self.assertIn('ledger', eco)
        self.assertGreater(len(eco['ledger']), 0)

    def test_distribute_after_tax_cycle(self):
        """Tax collected by process_earnings flows into TREASURY, then UBI redistributes."""
        # Give high_earner a balance that puts them in the 25% tax bracket
        # so they pay significant tax on build (10 Spark * 25% = 2 tax)
        eco = {'balances': {'high_earner': 250, 'low_earner': 0}, 'ledger': []}
        # Earn multiple activities to accumulate a meaningful TREASURY balance
        actions = [
            {'type': 'build', 'from': 'high_earner', 'ts': '2026-01-01'},
            {'type': 'discover', 'from': 'high_earner', 'ts': '2026-01-01'},
        ]
        eco = process_earnings(eco, actions)
        treasury = eco['balances'].get(TREASURY_ID, 0)
        self.assertGreater(treasury, 0, "Tax should flow to TREASURY")

        # Treasury should be large enough to distribute >=1 Spark per citizen
        # With treasury > 0 and 2 eligible citizens, distribution happens when
        # floor(treasury / 2) >= 1, i.e., treasury >= 2
        if treasury >= 2:
            distribute_ubi(eco, game_day=1)
            ubi_entries = [e for e in eco['ledger'] if e['type'] == 'ubi_distribution']
            self.assertGreater(len(ubi_entries), 0,
                               "UBI distribution should create ledger entries when treasury >= 2")
        else:
            # Treasury too small to split between 2 citizens: still verify it works
            distribute_ubi(eco, game_day=1)
            # No entries expected — per_citizen would be 0
            ubi_entries = [e for e in eco['ledger'] if e['type'] == 'ubi_distribution']
            self.assertEqual(len(ubi_entries), 0)


# ---------------------------------------------------------------------------
# 8. Integration with game_tick._distribute_ubi
# ---------------------------------------------------------------------------

class TestGameTickUBIIntegration(unittest.TestCase):
    """Verify game_tick._distribute_ubi properly delegates to economy_engine."""

    def test_game_tick_distributes_on_day_boundary(self):
        """worldTime 1440 = game day 1, should trigger distribution."""
        state = _state(
            world_time=1440,
            economy=_economy(
                balances={TREASURY_ID: 20, 'citizen_a': 0, 'citizen_b': 0}
            ),
            last_ubi_day=-1,
        )
        game_tick_distribute_ubi(state)
        eco = state['economy']
        self.assertEqual(eco['balances']['citizen_a'], 5)
        self.assertEqual(eco['balances']['citizen_b'], 5)

    def test_game_tick_creates_ubi_distribution_ledger_entries(self):
        """After game_tick._distribute_ubi, ledger must have 'ubi_distribution' entries."""
        state = _state(
            world_time=1440,
            economy=_economy(
                balances={TREASURY_ID: 30, 'aa': 0}
            ),
            last_ubi_day=-1,
        )
        game_tick_distribute_ubi(state)
        ledger = state['economy'].get('ledger', [])
        ubi_entries = [e for e in ledger if e['type'] == 'ubi_distribution']
        self.assertGreater(len(ubi_entries), 0,
                           "game_tick._distribute_ubi must create 'ubi_distribution' ledger entries")

    def test_game_tick_creates_transactions_for_backward_compat(self):
        """game_tick._distribute_ubi should mirror UBI to 'transactions' as 'ubi_payout'."""
        state = _state(
            world_time=1440,
            economy=_economy(
                balances={TREASURY_ID: 20, 'bb': 0}
            ),
            last_ubi_day=-1,
        )
        state['economy']['transactions'] = []
        game_tick_distribute_ubi(state)
        txns = state['economy']['transactions']
        ubi_txns = [t for t in txns if t['type'] == 'ubi_payout']
        self.assertGreater(len(ubi_txns), 0,
                           "Transactions list must have 'ubi_payout' entries for API compatibility")

    def test_game_tick_does_not_distribute_same_day(self):
        """Repeated tick on same game day should not double-distribute."""
        state = _state(
            world_time=2880,  # game day 2
            economy=_economy(balances={TREASURY_ID: 50, 'cc': 0}),
            last_ubi_day=2,  # Already distributed today
        )
        game_tick_distribute_ubi(state)
        self.assertEqual(state['economy']['balances']['cc'], 0)

    def test_game_tick_treasury_never_negative(self):
        """After distribution, TREASURY must not be negative."""
        state = _state(
            world_time=1440,
            economy=_economy(
                balances={TREASURY_ID: 5, 'dd': 0, 'ee': 0, 'ff': 0, 'gg': 0}
            ),
            last_ubi_day=-1,
        )
        game_tick_distribute_ubi(state)
        self.assertGreaterEqual(state['economy']['balances'][TREASURY_ID], 0)

    def test_game_tick_applies_wealth_tax_before_ubi(self):
        """Wealth tax (§6.4.6) is applied before UBI distribution."""
        state = _state(
            world_time=1440,
            economy=_economy(
                balances={TREASURY_ID: 0, 'rich': 600, 'poor': 0}
            ),
            last_ubi_day=-1,
        )
        game_tick_distribute_ubi(state)
        # rich has 600, wealth tax = 2% of (600-500) = 2% of 100 = 2
        # TREASURY gets 2, then UBI distributes to 2 citizens (floor(2/2)=1 each)
        wealth_tax_entries = [
            e for e in state['economy'].get('ledger', []) if e['type'] == 'wealth_tax'
        ]
        self.assertGreater(len(wealth_tax_entries), 0,
                           "Wealth tax should be applied and recorded in ledger")

    def test_game_tick_ubi_on_day_zero(self):
        """worldTime 0 = day 0; distribution should trigger if _lastUbiDay is -1."""
        state = _state(
            world_time=0,
            economy=_economy(balances={TREASURY_ID: 10, 'hh': 0}),
            last_ubi_day=-1,
        )
        game_tick_distribute_ubi(state)
        # Day 0 > _lastUbiDay (-1), so distribution occurs
        self.assertEqual(state['economy']['balances']['hh'], 5)


# ---------------------------------------------------------------------------
# 9. Constitution compliance assertions
# ---------------------------------------------------------------------------

class TestConstitutionCompliance(unittest.TestCase):
    """Verify behaviour matches the exact wording of §6.4."""

    def test_s6_4_4_max_payout_is_five(self):
        """§6.4.4: Each citizen receives min(5, TREASURY / eligible_count) Spark."""
        eco = _economy(balances={TREASURY_ID: 999, 'c': 0})
        distribute_ubi(eco, game_day=1)
        # With huge treasury, single citizen: min(5, 999//1) = 5
        self.assertEqual(eco['balances']['c'], BASE_UBI_AMOUNT)

    def test_s6_4_2_rounding_is_floor(self):
        """§6.4.2: Tax amounts are rounded down (floor). Players never lose a fractional Spark."""
        # 7 Spark treasury, 2 citizens: floor(7/2) = 3 each (not 3.5)
        eco = _economy(balances={TREASURY_ID: 7, 'ii': 0, 'jj': 0})
        distribute_ubi(eco, game_day=1)
        self.assertEqual(eco['balances']['ii'], 3)
        self.assertEqual(eco['balances']['jj'], 3)

    def test_s6_4_3_treasury_cannot_go_negative(self):
        """§6.4.3: The TREASURY cannot go negative."""
        for n_citizens in range(1, 10):
            eco = _economy(
                balances=dict({TREASURY_ID: 1}, **{f't{i}': 0 for i in range(n_citizens)})
            )
            distribute_ubi(eco, game_day=1)
            self.assertGreaterEqual(
                eco['balances'][TREASURY_ID], 0,
                f"TREASURY went negative with {n_citizens} citizens"
            )

    def test_s6_4_7_every_payment_recorded(self):
        """§6.4.7: Every UBI payment is recorded in the public ledger."""
        n = 5
        eco = _economy(
            balances=dict({TREASURY_ID: 100}, **{f'kk{i}': 0 for i in range(n)})
        )
        distribute_ubi(eco, game_day=1)
        ubi_entries = [e for e in eco['ledger'] if e['type'] == 'ubi_distribution']
        self.assertEqual(len(ubi_entries), n,
                         "Every citizen must have a corresponding ledger entry")

    def test_s6_4_4_distributes_once_per_game_day(self):
        """§6.4.4: UBI distributes once per game day."""
        eco = _economy(balances={TREASURY_ID: 100, 'll': 0})
        # Simulate 5 ticks on the same game day
        for _ in range(5):
            distribute_ubi(eco, game_day=1)
        # Only one UBI payment should appear in ledger
        ubi_entries = [e for e in eco['ledger'] if e['type'] == 'ubi_distribution']
        self.assertEqual(len(ubi_entries), 1)

    def test_s6_4_4_distributes_each_day_independently(self):
        """§6.4.4: Each game day's UBI is independent."""
        eco = _economy(balances={TREASURY_ID: 100, 'mm': 0})
        distribute_ubi(eco, game_day=1)
        distribute_ubi(eco, game_day=2)
        distribute_ubi(eco, game_day=3)
        ubi_entries = [e for e in eco['ledger'] if e['type'] == 'ubi_distribution']
        self.assertEqual(len(ubi_entries), 3,
                         "Each game day should produce one UBI ledger entry per citizen")


if __name__ == '__main__':
    unittest.main(verbosity=2)
