#!/usr/bin/env python3
"""Tests for reputation_engine.py — 50+ tests covering all public functions."""
import json
import math
import os
import sys
import tempfile
import time
import unittest

# Add scripts directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))

from reputation_engine import (
    DECAY_RATE,
    MAX_ADJUSTMENTS_PER_DAY,
    MAX_HISTORY_ENTRIES,
    MAX_SCORE,
    MAX_SINGLE_ADJUSTMENT,
    MIN_SCORE,
    TIER_ORDER,
    TIER_THRESHOLDS,
    apply_adjustment,
    calculate_reputation,
    decay_reputation,
    get_reputation_tier,
    get_top_citizens,
    load_reputation,
    save_reputation,
    tick_reputation,
    validate_adjustment,
)


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _make_history_entry(from_id='alice', target_id='bob', amount=10,
                        reason='helping', ts=None):
    """Create a minimal history entry dict."""
    return {
        'from_id': from_id,
        'target_id': target_id,
        'amount': amount,
        'reason': reason,
        'timestamp': ts if ts is not None else time.time(),
        'old_score': 0,
        'new_score': amount,
    }


# ===========================================================================
# TIER_THRESHOLDS
# ===========================================================================

class TestTierThresholds(unittest.TestCase):
    """Validate the TIER_THRESHOLDS constant is well-formed."""

    def test_all_tiers_present(self):
        """All required tier names must be present."""
        required = {'Untrusted', 'Neutral', 'Respected', 'Honored', 'Legendary'}
        self.assertEqual(required, set(TIER_THRESHOLDS.keys()))

    def test_tier_order_list_matches_keys(self):
        """TIER_ORDER must list the same tiers as TIER_THRESHOLDS."""
        self.assertEqual(set(TIER_ORDER), set(TIER_THRESHOLDS.keys()))

    def test_thresholds_are_tuples_of_two(self):
        """Each threshold entry must be a 2-tuple."""
        for name, bounds in TIER_THRESHOLDS.items():
            self.assertEqual(len(bounds), 2, f'{name} bounds should be length 2')

    def test_lower_bound_less_than_upper_bound(self):
        """Each tier's lower bound must be strictly less than its upper bound."""
        for name, (low, high) in TIER_THRESHOLDS.items():
            self.assertLess(low, high, f'{name}: low must be < high')


# ===========================================================================
# get_reputation_tier
# ===========================================================================

class TestGetReputationTier(unittest.TestCase):
    """Tests for tier mapping."""

    def test_negative_score_is_untrusted(self):
        self.assertEqual(get_reputation_tier(-100), 'Untrusted')

    def test_minus_one_is_untrusted(self):
        self.assertEqual(get_reputation_tier(-1), 'Untrusted')

    def test_zero_is_neutral(self):
        self.assertEqual(get_reputation_tier(0), 'Neutral')

    def test_fifty_is_neutral(self):
        self.assertEqual(get_reputation_tier(50), 'Neutral')

    def test_99_is_neutral(self):
        self.assertEqual(get_reputation_tier(99), 'Neutral')

    def test_100_is_respected(self):
        self.assertEqual(get_reputation_tier(100), 'Respected')

    def test_300_is_respected(self):
        self.assertEqual(get_reputation_tier(300), 'Respected')

    def test_499_is_respected(self):
        self.assertEqual(get_reputation_tier(499), 'Respected')

    def test_500_is_honored(self):
        self.assertEqual(get_reputation_tier(500), 'Honored')

    def test_1000_is_honored(self):
        self.assertEqual(get_reputation_tier(1000), 'Honored')

    def test_1499_is_honored(self):
        self.assertEqual(get_reputation_tier(1499), 'Honored')

    def test_1500_is_legendary(self):
        self.assertEqual(get_reputation_tier(1500), 'Legendary')

    def test_large_score_is_legendary(self):
        self.assertEqual(get_reputation_tier(99999), 'Legendary')


# ===========================================================================
# calculate_reputation
# ===========================================================================

class TestCalculateReputation(unittest.TestCase):
    """Tests for history-based score computation."""

    def test_empty_history_returns_empty(self):
        result = calculate_reputation([])
        self.assertEqual(result, {})

    def test_single_entry_correct_score(self):
        history = [_make_history_entry('alice', 'bob', 50)]
        result = calculate_reputation(history)
        self.assertEqual(result['bob'], 50)

    def test_multiple_entries_same_target_accumulate(self):
        history = [
            _make_history_entry('alice', 'bob', 30),
            _make_history_entry('carol', 'bob', 20),
        ]
        result = calculate_reputation(history)
        self.assertEqual(result['bob'], 50)

    def test_negative_amounts_reduce_score(self):
        history = [
            _make_history_entry('alice', 'bob', 100),
            _make_history_entry('carol', 'bob', -40),
        ]
        result = calculate_reputation(history)
        self.assertEqual(result['bob'], 60)

    def test_score_clamped_at_max(self):
        history = [_make_history_entry('alice', 'bob', MAX_SCORE + 5000)]
        result = calculate_reputation(history)
        self.assertLessEqual(result['bob'], MAX_SCORE)

    def test_score_clamped_at_min(self):
        history = [_make_history_entry('alice', 'bob', MIN_SCORE - 5000)]
        result = calculate_reputation(history)
        self.assertGreaterEqual(result['bob'], MIN_SCORE)

    def test_missing_target_id_skipped(self):
        history = [{'amount': 10, 'reason': 'test'}]
        result = calculate_reputation(history)
        self.assertEqual(result, {})

    def test_multiple_citizens_tracked_separately(self):
        history = [
            _make_history_entry('alice', 'bob', 10),
            _make_history_entry('alice', 'carol', 20),
        ]
        result = calculate_reputation(history)
        self.assertEqual(result['bob'], 10)
        self.assertEqual(result['carol'], 20)


# ===========================================================================
# decay_reputation
# ===========================================================================

class TestDecayReputation(unittest.TestCase):
    """Tests for gradual score decay."""

    def test_zero_delta_returns_same_scores(self):
        scores = {'alice': 500, 'bob': -200}
        result = decay_reputation(scores, 0)
        self.assertEqual(result['alice'], 500)
        self.assertEqual(result['bob'], -200)

    def test_negative_delta_returns_same_scores(self):
        scores = {'alice': 100}
        result = decay_reputation(scores, -1)
        self.assertEqual(result['alice'], 100)

    def test_positive_score_decreases_with_decay(self):
        scores = {'alice': 1000}
        result = decay_reputation(scores, 1)
        self.assertLess(result['alice'], 1000)

    def test_negative_score_increases_toward_zero(self):
        scores = {'bob': -500}
        result = decay_reputation(scores, 1)
        self.assertGreater(result['bob'], -500)

    def test_decay_formula_one_day(self):
        """After 1 day: score * (1 - DECAY_RATE)."""
        scores = {'alice': 1000}
        result = decay_reputation(scores, 1)
        expected = 1000 * (1.0 - DECAY_RATE)
        self.assertAlmostEqual(result['alice'], expected, places=5)

    def test_decay_compound_two_days(self):
        """After 2 days: score * (1 - DECAY_RATE)^2."""
        scores = {'alice': 1000}
        result = decay_reputation(scores, 2)
        expected = 1000 * ((1.0 - DECAY_RATE) ** 2)
        self.assertAlmostEqual(result['alice'], expected, places=5)

    def test_empty_scores_returns_empty(self):
        result = decay_reputation({}, 5)
        self.assertEqual(result, {})

    def test_score_does_not_exceed_max(self):
        scores = {'alice': MAX_SCORE}
        result = decay_reputation(scores, 0.5)
        self.assertLessEqual(result['alice'], MAX_SCORE)

    def test_score_does_not_go_below_min(self):
        # A large negative score decaying further should stay clamped
        scores = {'bob': MIN_SCORE}
        result = decay_reputation(scores, 1)
        self.assertGreaterEqual(result['bob'], MIN_SCORE)

    def test_input_dict_not_mutated(self):
        scores = {'alice': 500}
        original = dict(scores)
        decay_reputation(scores, 1)
        self.assertEqual(scores, original)


# ===========================================================================
# validate_adjustment
# ===========================================================================

class TestValidateAdjustment(unittest.TestCase):
    """Tests for adjustment validation."""

    def test_valid_positive_adjustment(self):
        result = validate_adjustment('alice', 'bob', 10)
        self.assertTrue(result['valid'])
        self.assertIsNone(result['error'])

    def test_valid_negative_adjustment(self):
        result = validate_adjustment('alice', 'bob', -10)
        self.assertTrue(result['valid'])

    def test_self_adjustment_forbidden(self):
        result = validate_adjustment('alice', 'alice', 10)
        self.assertFalse(result['valid'])
        self.assertIn('Self', result['error'])

    def test_amount_exceeds_max_rejected(self):
        result = validate_adjustment('alice', 'bob', MAX_SINGLE_ADJUSTMENT + 1)
        self.assertFalse(result['valid'])

    def test_amount_at_max_accepted(self):
        result = validate_adjustment('alice', 'bob', MAX_SINGLE_ADJUSTMENT)
        self.assertTrue(result['valid'])

    def test_negative_amount_at_max_magnitude_accepted(self):
        result = validate_adjustment('alice', 'bob', -MAX_SINGLE_ADJUSTMENT)
        self.assertTrue(result['valid'])

    def test_negative_amount_exceeding_max_rejected(self):
        result = validate_adjustment('alice', 'bob', -(MAX_SINGLE_ADJUSTMENT + 1))
        self.assertFalse(result['valid'])

    def test_non_numeric_amount_rejected(self):
        result = validate_adjustment('alice', 'bob', 'ten')
        self.assertFalse(result['valid'])

    def test_none_amount_rejected(self):
        result = validate_adjustment('alice', 'bob', None)
        self.assertFalse(result['valid'])

    def test_rate_limit_exceeded(self):
        """Citizen who gave MAX_ADJUSTMENTS_PER_DAY within 24h is rate-limited."""
        now = time.time()
        history = [
            _make_history_entry('alice', f'target_{i}', 5, ts=now - 3600)
            for i in range(MAX_ADJUSTMENTS_PER_DAY)
        ]
        result = validate_adjustment('alice', 'new_target', 5, history=history)
        self.assertFalse(result['valid'])
        self.assertIn('Rate limit', result['error'])

    def test_rate_limit_not_exceeded_below_max(self):
        """Citizen just below the rate limit should still be allowed."""
        now = time.time()
        history = [
            _make_history_entry('alice', f'target_{i}', 5, ts=now - 3600)
            for i in range(MAX_ADJUSTMENTS_PER_DAY - 1)
        ]
        result = validate_adjustment('alice', 'new_target', 5, history=history)
        self.assertTrue(result['valid'])

    def test_old_adjustments_outside_window_ignored(self):
        """Adjustments older than 24h do not count toward rate limit."""
        old_time = time.time() - 90000  # ~25 hours ago
        history = [
            _make_history_entry('alice', f'target_{i}', 5, ts=old_time)
            for i in range(MAX_ADJUSTMENTS_PER_DAY)
        ]
        result = validate_adjustment('alice', 'new_target', 5, history=history)
        self.assertTrue(result['valid'])

    def test_zero_amount_valid(self):
        result = validate_adjustment('alice', 'bob', 0)
        self.assertTrue(result['valid'])

    def test_float_amount_valid(self):
        result = validate_adjustment('alice', 'bob', 5.5)
        self.assertTrue(result['valid'])


# ===========================================================================
# apply_adjustment
# ===========================================================================

class TestApplyAdjustment(unittest.TestCase):
    """Tests for adjustment application."""

    def test_successful_adjustment_returns_success(self):
        scores, history, result = apply_adjustment({}, [], 'alice', 'bob', 50, 'helping')
        self.assertTrue(result['success'])
        self.assertIsNone(result['error'])

    def test_score_updated_correctly(self):
        scores, history, result = apply_adjustment({}, [], 'alice', 'bob', 50, 'helping')
        self.assertEqual(scores['bob'], 50)
        self.assertEqual(result['new_score'], 50)

    def test_history_entry_appended(self):
        scores, history, result = apply_adjustment({}, [], 'alice', 'bob', 50, 'helping')
        self.assertEqual(len(history), 1)
        entry = history[0]
        self.assertEqual(entry['from_id'], 'alice')
        self.assertEqual(entry['target_id'], 'bob')
        self.assertEqual(entry['amount'], 50)
        self.assertEqual(entry['reason'], 'helping')

    def test_tier_change_detected(self):
        # Start at 90 (Neutral), add 20 to cross into Respected (>=100)
        scores = {'bob': 90}
        scores, history, result = apply_adjustment(scores, [], 'alice', 'bob', 10, 'helping')
        self.assertEqual(result['old_tier'], 'Neutral')
        self.assertEqual(result['new_tier'], 'Respected')
        self.assertTrue(result['tier_changed'])

    def test_no_tier_change_when_within_same_tier(self):
        scores = {'bob': 50}
        scores, history, result = apply_adjustment(scores, [], 'alice', 'bob', 10, 'helping')
        self.assertEqual(result['old_tier'], 'Neutral')
        self.assertEqual(result['new_tier'], 'Neutral')
        self.assertFalse(result['tier_changed'])

    def test_self_adjustment_rejected(self):
        scores, history, result = apply_adjustment({}, [], 'alice', 'alice', 50, 'cheat')
        self.assertFalse(result['success'])
        self.assertIsNotNone(result['error'])
        self.assertEqual(scores, {})
        self.assertEqual(history, [])

    def test_score_clamped_at_max(self):
        scores = {'bob': MAX_SCORE - 5}
        scores, history, result = apply_adjustment(scores, [], 'alice', 'bob', 100, 'boost')
        self.assertLessEqual(scores['bob'], MAX_SCORE)

    def test_score_clamped_at_min(self):
        scores = {'bob': MIN_SCORE + 5}
        scores, history, result = apply_adjustment(scores, [], 'alice', 'bob', -100, 'penalty')
        self.assertGreaterEqual(scores['bob'], MIN_SCORE)

    def test_input_dicts_not_mutated(self):
        original_scores = {'bob': 50}
        original_history = []
        apply_adjustment(original_scores, original_history, 'alice', 'bob', 10, 'test')
        self.assertEqual(original_scores, {'bob': 50})
        self.assertEqual(original_history, [])

    def test_history_trimmed_to_max(self):
        """History list must not exceed MAX_HISTORY_ENTRIES."""
        existing_history = [
            _make_history_entry('x', f'y{i}', 1) for i in range(MAX_HISTORY_ENTRIES)
        ]
        scores, history, result = apply_adjustment(
            {}, existing_history, 'alice', 'bob', 1, 'test'
        )
        self.assertLessEqual(len(history), MAX_HISTORY_ENTRIES)

    def test_accumulation_across_multiple_calls(self):
        scores = {}
        history = []
        scores, history, _ = apply_adjustment(scores, history, 'alice', 'bob', 30, 'a')
        scores, history, _ = apply_adjustment(scores, history, 'carol', 'bob', 20, 'b')
        self.assertEqual(scores['bob'], 50)
        self.assertEqual(len(history), 2)


# ===========================================================================
# get_top_citizens
# ===========================================================================

class TestGetTopCitizens(unittest.TestCase):
    """Tests for leaderboard computation."""

    def test_empty_scores_returns_empty_list(self):
        self.assertEqual(get_top_citizens({}), [])

    def test_returns_correct_number(self):
        scores = {f'citizen_{i}': i * 10 for i in range(20)}
        result = get_top_citizens(scores, limit=5)
        self.assertEqual(len(result), 5)

    def test_returns_sorted_descending(self):
        scores = {'alice': 100, 'bob': 500, 'carol': 250}
        result = get_top_citizens(scores)
        returned_scores = [entry['score'] for entry in result]
        self.assertEqual(returned_scores, sorted(returned_scores, reverse=True))

    def test_entry_has_required_keys(self):
        scores = {'alice': 200}
        result = get_top_citizens(scores, limit=1)
        self.assertIn('citizen_id', result[0])
        self.assertIn('score', result[0])
        self.assertIn('tier', result[0])

    def test_tier_computed_correctly(self):
        scores = {'alice': 600}
        result = get_top_citizens(scores, limit=1)
        self.assertEqual(result[0]['tier'], 'Honored')

    def test_limit_larger_than_scores_returns_all(self):
        scores = {'alice': 10, 'bob': 20}
        result = get_top_citizens(scores, limit=100)
        self.assertEqual(len(result), 2)

    def test_default_limit_is_ten(self):
        scores = {f'citizen_{i}': i for i in range(50)}
        result = get_top_citizens(scores)
        self.assertLessEqual(len(result), 10)


# ===========================================================================
# load_reputation / save_reputation
# ===========================================================================

class TestLoadSaveReputation(unittest.TestCase):
    """Tests for file I/O helpers."""

    def test_load_nonexistent_file_returns_defaults(self):
        result = load_reputation('/nonexistent/path/reputation.json')
        self.assertIn('scores', result)
        self.assertIn('history', result)
        self.assertIn('lastDecayAt', result)

    def test_load_invalid_json_returns_defaults(self):
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as fh:
            fh.write('NOT VALID JSON {{')
            path = fh.name
        try:
            result = load_reputation(path)
            self.assertEqual(result['scores'], {})
        finally:
            os.unlink(path)

    def test_save_and_reload_roundtrip(self):
        data = {
            'scores': {'alice': 123.45},
            'history': [_make_history_entry()],
            'lastDecayAt': 1234567890.0,
        }
        with tempfile.NamedTemporaryFile(suffix='.json', delete=False) as fh:
            path = fh.name
        try:
            save_reputation(path, data)
            loaded = load_reputation(path)
            self.assertAlmostEqual(loaded['scores']['alice'], 123.45, places=2)
            self.assertEqual(loaded['lastDecayAt'], 1234567890.0)
            self.assertEqual(len(loaded['history']), 1)
        finally:
            os.unlink(path)

    def test_load_file_missing_keys_adds_defaults(self):
        data = {'scores': {'bob': 50}}
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as fh:
            json.dump(data, fh)
            path = fh.name
        try:
            result = load_reputation(path)
            self.assertIn('history', result)
            self.assertIn('lastDecayAt', result)
        finally:
            os.unlink(path)


# ===========================================================================
# tick_reputation
# ===========================================================================

class TestTickReputation(unittest.TestCase):
    """Tests for game-tick integration helper."""

    def test_tick_does_not_decay_if_less_than_one_hour_elapsed(self):
        """Decay should not happen if delta < 1 hour."""
        now = time.time()
        data = {
            'scores': {'alice': 1000},
            'history': [],
            'lastDecayAt': now - 1800,  # 30 minutes ago
        }
        result = tick_reputation(data, now)
        # Score should be unchanged (or very close to unchanged)
        self.assertEqual(result['scores']['alice'], 1000)

    def test_tick_decays_after_one_hour(self):
        """Decay should occur after more than 1 hour has passed."""
        now = time.time()
        data = {
            'scores': {'alice': 1000},
            'history': [],
            'lastDecayAt': now - 7200,  # 2 hours ago
        }
        result = tick_reputation(data, now)
        self.assertLess(result['scores']['alice'], 1000)

    def test_tick_updates_lastDecayAt_after_decay(self):
        now = time.time()
        data = {
            'scores': {'alice': 1000},
            'history': [],
            'lastDecayAt': now - 7200,
        }
        result = tick_reputation(data, now)
        self.assertAlmostEqual(result['lastDecayAt'], now, delta=1)

    def test_tick_does_not_update_lastDecayAt_when_no_decay(self):
        """lastDecayAt should not change when delta < 1 hour."""
        now = time.time()
        last = now - 1800
        data = {
            'scores': {'alice': 1000},
            'history': [],
            'lastDecayAt': last,
        }
        result = tick_reputation(data, now)
        self.assertEqual(result['lastDecayAt'], last)

    def test_tick_uses_current_time_by_default(self):
        """tick_reputation() without explicit timestamp should not raise."""
        data = {
            'scores': {'alice': 200},
            'history': [],
            'lastDecayAt': 0,  # epoch — large delta so decay fires
        }
        result = tick_reputation(data)
        # Just ensure it ran without error and score changed
        self.assertIsInstance(result['scores']['alice'], float)

    def test_tick_initial_state_lastDecayAt_zero(self):
        """A brand-new state (lastDecayAt=0) should trigger decay."""
        now = time.time()
        data = {'scores': {'alice': 500}, 'history': [], 'lastDecayAt': 0}
        result = tick_reputation(data, now)
        self.assertLess(result['scores']['alice'], 500)

    def test_tick_empty_scores_runs_without_error(self):
        now = time.time()
        data = {'scores': {}, 'history': [], 'lastDecayAt': now - 7200}
        result = tick_reputation(data, now)
        self.assertEqual(result['scores'], {})


# ===========================================================================
# DECAY_RATE constant
# ===========================================================================

class TestDecayRateConstant(unittest.TestCase):
    """Sanity checks on DECAY_RATE."""

    def test_decay_rate_positive(self):
        self.assertGreater(DECAY_RATE, 0)

    def test_decay_rate_less_than_one(self):
        self.assertLess(DECAY_RATE, 1)

    def test_after_100_days_score_not_fully_gone(self):
        """Even after 100 days, score should not hit zero (exponential decay)."""
        score = 1000
        result = decay_reputation({'x': score}, 100)
        self.assertGreater(result['x'], 0)

    def test_after_large_delta_score_still_clamped(self):
        """Decay over a huge time interval should not go below MIN_SCORE."""
        result = decay_reputation({'x': MIN_SCORE}, 365)
        self.assertGreaterEqual(result['x'], MIN_SCORE)


if __name__ == '__main__':
    unittest.main()
