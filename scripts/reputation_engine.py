#!/usr/bin/env python3
"""Reputation engine: compute, decay, and query citizen reputation scores."""
import json
import sys
import time

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Score boundaries for reputation tiers (inclusive lower bound, exclusive upper)
# Mirrors the tiers used in src/js/social.js but maps to the server-side
# taxonomy described in the task spec.
TIER_THRESHOLDS = {
    'Untrusted': (-float('inf'), 0),
    'Neutral':   (0, 100),
    'Respected': (100, 500),
    'Honored':   (500, 1500),
    'Legendary': (1500, float('inf')),
}

# Tier display order (lowest to highest)
TIER_ORDER = ['Untrusted', 'Neutral', 'Respected', 'Honored', 'Legendary']

# Decay rate: fraction of (score - neutral_point) removed per real day.
# A value of 0.05 means 5 % of the excess score decays per day toward 0.
# This prevents permanent grudges and permanent glory alike.
DECAY_RATE = 0.05

# Maximum absolute score any citizen can hold (prevents runaway accumulation).
MAX_SCORE = 10000
MIN_SCORE = -1000

# Rate-limiting: how many adjustments a single citizen may give per day.
MAX_ADJUSTMENTS_PER_DAY = 10

# Self-adjustment is forbidden (enforced in validate_adjustment).

# Maximum amount per single adjustment call.
MAX_SINGLE_ADJUSTMENT = 100

# History retention cap per citizen pair (keep last N events in global history).
MAX_HISTORY_ENTRIES = 1000


# ---------------------------------------------------------------------------
# Tier helpers
# ---------------------------------------------------------------------------

def get_reputation_tier(score):
    """
    Map a numeric score to a tier name.

    Args:
        score: numeric reputation score (int or float)

    Returns:
        One of 'Untrusted', 'Neutral', 'Respected', 'Honored', 'Legendary'
    """
    for tier_name in TIER_ORDER:
        low, high = TIER_THRESHOLDS[tier_name]
        if low <= score < high:
            return tier_name
    # score == MAX boundary falls into Legendary
    return 'Legendary'


# ---------------------------------------------------------------------------
# Score computation from history
# ---------------------------------------------------------------------------

def calculate_reputation(history):
    """
    Compute a reputation score by replaying an adjustment history list.

    Each history entry should have the shape:
        {'target_id': str, 'amount': int/float, ...}

    This function is intentionally pure: it ignores any pre-existing scores
    and rebuilds them from scratch.  Useful for auditing.

    Args:
        history: list of adjustment dicts (as stored in reputation.json)

    Returns:
        dict mapping target_id -> computed score (float, clamped to bounds)
    """
    scores = {}
    for entry in history:
        target = entry.get('target_id')
        amount = entry.get('amount', 0)
        if target is None:
            continue
        scores[target] = scores.get(target, 0) + amount

    # Clamp all scores to valid bounds
    for target in scores:
        scores[target] = max(MIN_SCORE, min(MAX_SCORE, scores[target]))

    return scores


# ---------------------------------------------------------------------------
# Decay
# ---------------------------------------------------------------------------

def decay_reputation(scores, delta_days):
    """
    Apply gradual decay toward neutral (0) for all citizens.

    The decay formula is:
        new_score = score * (1 - DECAY_RATE) ^ delta_days

    Positive scores decay downward; negative scores decay upward (both toward 0).
    This prevents permanent grudges and permanent glory.

    Args:
        scores: dict mapping citizen_id -> numeric score
        delta_days: number of real-world days elapsed since last decay

    Returns:
        New scores dict with decayed values (floats, clamped)
    """
    if delta_days <= 0:
        return dict(scores)

    decay_factor = (1.0 - DECAY_RATE) ** delta_days
    decayed = {}
    for citizen_id, score in scores.items():
        new_score = score * decay_factor
        # Clamp to valid range
        new_score = max(MIN_SCORE, min(MAX_SCORE, new_score))
        decayed[citizen_id] = new_score

    return decayed


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

def validate_adjustment(from_id, target_id, amount, history=None):
    """
    Validate a proposed reputation adjustment before applying it.

    Checks:
    - Self-adjustment is forbidden.
    - amount must be a number.
    - |amount| must not exceed MAX_SINGLE_ADJUSTMENT.
    - from_id must not exceed MAX_ADJUSTMENTS_PER_DAY in the last 24 hours.

    Args:
        from_id: citizen making the adjustment
        target_id: citizen being adjusted
        amount: numeric adjustment value (positive = boost, negative = penalty)
        history: optional list of past adjustment dicts for rate-limit checking

    Returns:
        dict with keys:
            'valid' (bool),
            'error' (str or None)
    """
    # Self-adjustment check
    if from_id == target_id:
        return {'valid': False, 'error': 'Self-adjustment is not allowed'}

    # Type check
    if not isinstance(amount, (int, float)):
        return {'valid': False, 'error': 'amount must be a number'}

    # Magnitude check
    if abs(amount) > MAX_SINGLE_ADJUSTMENT:
        return {
            'valid': False,
            'error': f'amount magnitude exceeds maximum of {MAX_SINGLE_ADJUSTMENT}'
        }

    # Rate-limit check (optional — only when history is provided)
    if history is not None:
        cutoff = time.time() - 86400  # last 24 hours
        recent_count = sum(
            1 for entry in history
            if entry.get('from_id') == from_id
            and entry.get('timestamp', 0) >= cutoff
        )
        if recent_count >= MAX_ADJUSTMENTS_PER_DAY:
            return {
                'valid': False,
                'error': (
                    f'Rate limit exceeded: {from_id} has made '
                    f'{recent_count} adjustments in the last 24 hours '
                    f'(max {MAX_ADJUSTMENTS_PER_DAY})'
                )
            }

    return {'valid': True, 'error': None}


# ---------------------------------------------------------------------------
# Apply adjustment
# ---------------------------------------------------------------------------

def apply_adjustment(scores, history, from_id, target_id, amount, reason=''):
    """
    Record a reputation adjustment after validation.

    Mutates (and returns) updated copies of scores and history.

    Args:
        scores: dict mapping citizen_id -> numeric score
        history: list of past adjustment dicts
        from_id: citizen making the adjustment
        target_id: citizen being adjusted
        amount: numeric adjustment (positive boost, negative penalty)
        reason: human-readable reason string

    Returns:
        tuple (updated_scores, updated_history, result_dict)
        result_dict has keys: 'success' (bool), 'error' (str or None),
            'old_score', 'new_score', 'old_tier', 'new_tier', 'tier_changed'
    """
    # Validate first
    check = validate_adjustment(from_id, target_id, amount, history)
    if not check['valid']:
        return scores, history, {'success': False, 'error': check['error']}

    # Deep copy inputs to avoid in-place mutation of caller's data
    scores = dict(scores)
    history = list(history)

    # Initialise target if absent
    old_score = scores.get(target_id, 0)
    old_tier = get_reputation_tier(old_score)

    new_score = max(MIN_SCORE, min(MAX_SCORE, old_score + amount))
    new_tier = get_reputation_tier(new_score)

    scores[target_id] = new_score

    entry = {
        'from_id': from_id,
        'target_id': target_id,
        'amount': amount,
        'reason': reason,
        'timestamp': time.time(),
        'old_score': old_score,
        'new_score': new_score,
    }
    history.append(entry)

    # Trim history to cap
    if len(history) > MAX_HISTORY_ENTRIES:
        history = history[-MAX_HISTORY_ENTRIES:]

    result = {
        'success': True,
        'error': None,
        'old_score': old_score,
        'new_score': new_score,
        'old_tier': old_tier,
        'new_tier': new_tier,
        'tier_changed': old_tier != new_tier,
    }

    return scores, history, result


# ---------------------------------------------------------------------------
# Leaderboard
# ---------------------------------------------------------------------------

def get_top_citizens(scores, limit=10):
    """
    Return the top citizens sorted by reputation score (descending).

    Args:
        scores: dict mapping citizen_id -> numeric score
        limit: maximum number of citizens to return (default 10)

    Returns:
        List of dicts: [{'citizen_id': str, 'score': float, 'tier': str}, ...]
    """
    if not scores:
        return []

    sorted_citizens = sorted(
        scores.items(),
        key=lambda kv: kv[1],
        reverse=True
    )[:limit]

    return [
        {
            'citizen_id': cid,
            'score': score,
            'tier': get_reputation_tier(score),
        }
        for cid, score in sorted_citizens
    ]


# ---------------------------------------------------------------------------
# Game-tick integration helpers
# ---------------------------------------------------------------------------

def load_reputation(filepath):
    """
    Load reputation state from a JSON file.

    Args:
        filepath: path to reputation.json

    Returns:
        dict with keys 'scores', 'history', 'lastDecayAt'
    """
    default = {'scores': {}, 'history': [], 'lastDecayAt': 0}
    try:
        with open(filepath, 'r') as fh:
            data = json.load(fh)
        # Ensure required keys are present
        data.setdefault('scores', {})
        data.setdefault('history', [])
        data.setdefault('lastDecayAt', 0)
        return data
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def save_reputation(filepath, reputation_data):
    """
    Persist reputation state to a JSON file.

    Args:
        filepath: destination path
        reputation_data: dict with keys 'scores', 'history', 'lastDecayAt'
    """
    with open(filepath, 'w') as fh:
        json.dump(reputation_data, fh, indent=2)


def tick_reputation(reputation_data, current_timestamp=None):
    """
    Run one reputation tick: apply decay since lastDecayAt.

    Called by game_tick.py each tick.  Decay is calculated in fractional
    real-world days so it remains correct regardless of tick frequency.

    Args:
        reputation_data: dict with keys 'scores', 'history', 'lastDecayAt'
        current_timestamp: Unix timestamp (defaults to time.time())

    Returns:
        Updated reputation_data dict
    """
    if current_timestamp is None:
        current_timestamp = time.time()

    last_decay = reputation_data.get('lastDecayAt', 0)
    delta_seconds = current_timestamp - last_decay
    delta_days = delta_seconds / 86400.0  # convert to days

    # Only decay if at least 1 hour has elapsed to avoid float noise
    if delta_days >= (1.0 / 24.0):
        reputation_data['scores'] = decay_reputation(
            reputation_data.get('scores', {}),
            delta_days
        )
        reputation_data['lastDecayAt'] = current_timestamp

    return reputation_data


# ---------------------------------------------------------------------------
# CLI entry point (for manual inspection / testing)
# ---------------------------------------------------------------------------

def main():
    """Print current reputation state summary to stdout."""
    if len(sys.argv) < 2:
        print('Usage: reputation_engine.py <path/to/reputation.json>', file=sys.stderr)
        sys.exit(1)

    data = load_reputation(sys.argv[1])
    scores = data.get('scores', {})
    top = get_top_citizens(scores, limit=10)

    print('Top citizens by reputation:')
    for rank, entry in enumerate(top, 1):
        print(f"  {rank}. {entry['citizen_id']}: {entry['score']:.1f} ({entry['tier']})")

    print(f"\nTotal tracked citizens: {len(scores)}")
    print(f"Total history entries:  {len(data.get('history', []))}")
    print(f"Last decay at:          {data.get('lastDecayAt', 0)}")


if __name__ == '__main__':
    main()
