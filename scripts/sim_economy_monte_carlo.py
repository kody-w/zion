#!/usr/bin/env python3
"""
Monte Carlo Economy Simulator for ZION

Simulates 1000 agents over 100 game-days using actual economy_engine.py code.
Tracks Gini coefficient over time, then optimizes tax brackets via grid search
to minimize inequality while maximizing economic activity.

Usage:
    python3 scripts/sim_economy_monte_carlo.py
"""
import copy
import json
import math
import os
import random
import sys
import time

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _SCRIPT_DIR)
from load_config import load_config
from economy_engine import (
    process_earnings, apply_wealth_tax, distribute_ubi,
    process_structure_maintenance, TREASURY_ID, SYSTEM_ID,
)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
NUM_AGENTS = 1000
NUM_DAYS = 100
ACTIONS_PER_AGENT_PER_DAY = 8  # average actions per agent per game-day
STRUCTURE_PROBABILITY = 0.02   # chance an agent builds a structure per day
WORLD_TIME_PER_DAY = 1440      # game-seconds per game-day

# Action probability weights (relative likelihood of each action type)
ACTION_WEIGHTS = {
    'say': 25, 'emote': 10, 'shout': 5,
    'move': 20, 'warp': 5,
    'build': 4, 'craft': 6, 'compose': 3,
    'harvest': 8, 'plant': 4, 'water': 3,
    'teach': 3, 'learn': 4, 'discover': 2,
    'gift': 5, 'trade_offer': 2, 'vote': 2,
    'inspect': 3, 'mentor': 1, 'quest_complete': 1,
}

# ---------------------------------------------------------------------------
# Gini coefficient
# ---------------------------------------------------------------------------
def gini_coefficient(balances):
    """Compute Gini coefficient from a dict of balances (0=perfect equality, 1=max inequality)."""
    values = sorted(v for k, v in balances.items()
                    if k not in (TREASURY_ID, SYSTEM_ID, 'SYSTEM') and v >= 0)
    n = len(values)
    if n == 0:
        return 0.0
    total = sum(values)
    if total == 0:
        return 0.0
    cumulative = 0.0
    weighted_sum = 0.0
    for i, v in enumerate(values):
        cumulative += v
        weighted_sum += (2 * (i + 1) - n - 1) * v
    return weighted_sum / (n * total)


# ---------------------------------------------------------------------------
# Weighted random action picker
# ---------------------------------------------------------------------------
def _build_action_picker(weights):
    actions = list(weights.keys())
    cumulative = []
    total = 0
    for a in actions:
        total += weights[a]
        cumulative.append(total)
    return actions, cumulative, total

_ACTIONS, _CUM_WEIGHTS, _TOTAL_WEIGHT = _build_action_picker(ACTION_WEIGHTS)

def pick_action():
    r = random.random() * _TOTAL_WEIGHT
    for i, cw in enumerate(_CUM_WEIGHTS):
        if r <= cw:
            return _ACTIONS[i]
    return _ACTIONS[-1]


# ---------------------------------------------------------------------------
# Simulation core
# ---------------------------------------------------------------------------
def simulate(tax_brackets, seed=42, verbose=False):
    """
    Run one full simulation with given tax brackets.

    Returns:
        dict with keys: gini_series, final_gini, total_activity,
                        avg_balance, treasury, total_spark
    """
    rng = random.Random(seed)
    random.seed(seed)

    # Build economy state
    economy = {'balances': {}, 'ledger': [], '_lastUbiDay': -1}
    agent_ids = ['agent_%04d' % i for i in range(NUM_AGENTS)]

    # Initialize all agents with 0 balance
    for aid in agent_ids:
        economy['balances'][aid] = 0
    economy['balances'][TREASURY_ID] = 0

    # Structures tracker
    structures = {}
    struct_counter = 0

    # Patch tax brackets into the economy_engine module at runtime
    import economy_engine
    patched_brackets = []
    for b in tax_brackets:
        lo, hi, rate = b
        patched_brackets.append((lo, float('inf') if hi is None else hi, rate))
    economy_engine._TAX_BRACKETS = patched_brackets

    gini_series = []
    total_actions = 0

    for day in range(NUM_DAYS):
        # Generate random actions for this day
        day_actions = []
        for aid in agent_ids:
            n_actions = max(1, int(rng.gauss(ACTIONS_PER_AGENT_PER_DAY, 2)))
            for _ in range(n_actions):
                action_type = pick_action()
                day_actions.append({
                    'type': action_type,
                    'from': aid,
                    'ts': time.time(),
                })
                # Some agents build structures
                if action_type == 'build' and rng.random() < STRUCTURE_PROBABILITY:
                    sid = 'struct_%d' % struct_counter
                    struct_counter += 1
                    structures[sid] = {'builder': aid, '_missedPayments': 0}

        total_actions += len(day_actions)

        # Process earnings (this uses the patched tax brackets)
        economy = process_earnings(economy, day_actions)

        # Daily cycle: wealth tax → maintenance → UBI
        ts = time.time()
        economy = apply_wealth_tax(economy, timestamp=ts)
        economy, to_remove = process_structure_maintenance(economy, structures, timestamp=ts)
        for sid in to_remove:
            structures.pop(sid, None)
        economy = distribute_ubi(economy, day, timestamp=ts)

        # Record Gini
        g = gini_coefficient(economy['balances'])
        gini_series.append(g)

        if verbose and day % 10 == 0:
            player_total = sum(v for k, v in economy['balances'].items()
                               if k not in (TREASURY_ID, 'SYSTEM'))
            print(f'  Day {day:3d}: Gini={g:.4f}  Total={player_total}  '
                  f'Treasury={economy["balances"].get(TREASURY_ID, 0)}  '
                  f'Structures={len(structures)}')

    # Final stats
    player_balances = {k: v for k, v in economy['balances'].items()
                       if k not in (TREASURY_ID, 'SYSTEM')}
    total_spark = sum(player_balances.values())
    avg_balance = total_spark / max(1, len(player_balances))

    return {
        'gini_series': gini_series,
        'final_gini': gini_series[-1] if gini_series else 0,
        'total_activity': total_actions,
        'avg_balance': avg_balance,
        'treasury': economy['balances'].get(TREASURY_ID, 0),
        'total_spark': total_spark,
        'tax_brackets': tax_brackets,
    }


# ---------------------------------------------------------------------------
# Bracket generation for optimization
# ---------------------------------------------------------------------------
def generate_bracket_variants(base_brackets):
    """Generate tax bracket variants to search over."""
    variants = [base_brackets]  # include baseline

    # Vary rates systematically
    rate_scales = [
        [0.0, 0.03, 0.08, 0.12, 0.20, 0.35],  # lower rates
        [0.0, 0.05, 0.10, 0.15, 0.25, 0.40],  # original hardcoded
        [0.0, 0.05, 0.12, 0.20, 0.30, 0.45],  # moderate progressive
        [0.0, 0.08, 0.15, 0.25, 0.35, 0.50],  # steep progressive
        [0.0, 0.10, 0.20, 0.30, 0.40, 0.55],  # very steep
        [0.0, 0.02, 0.05, 0.10, 0.15, 0.25],  # very flat
        [0.0, 0.04, 0.10, 0.18, 0.28, 0.42],  # balanced
        [0.0, 0.06, 0.14, 0.22, 0.32, 0.48],  # high-mid
    ]

    # Standard bracket thresholds
    thresholds = [
        [[0, 20], [20, 50], [50, 100], [100, 250], [250, 500], [500, None]],  # original
        [[0, 30], [30, 80], [80, 150], [150, 300], [300, 600], [600, None]],  # wider
        [[0, 15], [15, 40], [40, 80], [80, 200], [200, 400], [400, None]],   # tighter
        [[0, 50], [50, 100], [100, 250], [250, 500], [500, 1000], [1000, None]],  # current config
    ]

    for rates in rate_scales:
        for thresh in thresholds:
            brackets = []
            for i, (t, r) in enumerate(zip(thresh, rates)):
                brackets.append([t[0], t[1], r])
            variants.append(brackets)

    return variants


# ---------------------------------------------------------------------------
# Scoring: minimize Gini while maximizing activity
# ---------------------------------------------------------------------------
def score_result(result):
    """
    Score a simulation result. Lower is better.

    We want:
      - Low final Gini (equality)
      - Low average Gini over time (sustained equality)
      - High total activity (vibrant economy)
      - Reasonable total Spark (not hyperinflation)

    Score = avg_gini * 0.6 + final_gini * 0.4 - activity_bonus
    """
    avg_gini = sum(result['gini_series']) / max(1, len(result['gini_series']))
    final_gini = result['final_gini']

    # Normalize activity: higher is better, cap bonus at 0.15
    activity_bonus = min(0.15, result['total_activity'] / 1_000_000)

    return avg_gini * 0.6 + final_gini * 0.4 - activity_bonus


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    print('=' * 60)
    print('  ZION Economy Monte Carlo Simulator')
    print('  1000 agents × 100 game-days × ~8 actions/day')
    print('=' * 60)

    # Load current config as baseline
    cfg = load_config('economy')
    current_brackets = cfg.get('tax_brackets', [
        [0, 50, 0.0], [50, 100, 0.062], [100, 250, 0.071],
        [250, 500, 0.183], [500, 1000, 0.314], [1000, None, 0.312],
    ])

    # --- Phase 1: Baseline simulation ---
    print('\n📊 Phase 1: Baseline simulation (current config)...')
    baseline = simulate(current_brackets, seed=42, verbose=True)
    print(f'\n  Baseline Results:')
    print(f'    Final Gini:    {baseline["final_gini"]:.4f}')
    print(f'    Avg Balance:   {baseline["avg_balance"]:.1f}')
    print(f'    Total Spark:   {baseline["total_spark"]}')
    print(f'    Treasury:      {baseline["treasury"]}')
    print(f'    Activity:      {baseline["total_activity"]} actions')

    # --- Phase 2: Generate and test variants ---
    print('\n🧬 Phase 2: Optimizing tax brackets...')
    variants = generate_bracket_variants(current_brackets)
    print(f'  Testing {len(variants)} bracket configurations...')

    results = []
    for i, brackets in enumerate(variants):
        result = simulate(brackets, seed=42)
        result['score'] = score_result(result)
        results.append(result)
        if (i + 1) % 10 == 0:
            print(f'  ... {i + 1}/{len(variants)} tested')

    # Sort by score (lower is better)
    results.sort(key=lambda r: r['score'])

    # --- Phase 3: Report top 5 ---
    print('\n🏆 Phase 3: Top 5 configurations:')
    print(f'  {"Rank":<5} {"Score":<8} {"Gini":<8} {"AvgBal":<9} {"Treasury":<10} {"Brackets"}')
    print(f'  {"-"*5} {"-"*8} {"-"*8} {"-"*9} {"-"*10} {"-"*40}')

    for i, r in enumerate(results[:5]):
        rates = [b[2] for b in r['tax_brackets']]
        rates_str = ' '.join(f'{rate:.0%}' for rate in rates)
        print(f'  #{i+1:<4} {r["score"]:<8.4f} {r["final_gini"]:<8.4f} '
              f'{r["avg_balance"]:<9.1f} {r["treasury"]:<10} {rates_str}')

    # Compare best vs baseline
    best = results[0]
    baseline_score = score_result(baseline)
    print(f'\n  Baseline score: {baseline_score:.4f} (Gini {baseline["final_gini"]:.4f})')
    print(f'  Optimal score:  {best["score"]:.4f} (Gini {best["final_gini"]:.4f})')
    improvement = ((baseline_score - best['score']) / baseline_score) * 100
    gini_improvement = ((baseline['final_gini'] - best['final_gini']) / baseline['final_gini']) * 100
    print(f'  Improvement:    {improvement:.1f}% score, {gini_improvement:.1f}% Gini reduction')

    # --- Phase 4: Write results ---
    output = {
        'baseline': {
            'gini_series': baseline['gini_series'],
            'final_gini': baseline['final_gini'],
            'avg_balance': baseline['avg_balance'],
            'total_spark': baseline['total_spark'],
            'treasury': baseline['treasury'],
            'tax_brackets': current_brackets,
            'score': baseline_score,
        },
        'optimal': {
            'gini_series': best['gini_series'],
            'final_gini': best['final_gini'],
            'avg_balance': best['avg_balance'],
            'total_spark': best['total_spark'],
            'treasury': best['treasury'],
            'tax_brackets': best['tax_brackets'],
            'score': best['score'],
        },
        'top5': [{
            'tax_brackets': r['tax_brackets'],
            'final_gini': r['final_gini'],
            'score': r['score'],
            'avg_balance': r['avg_balance'],
        } for r in results[:5]],
        'metadata': {
            'num_agents': NUM_AGENTS,
            'num_days': NUM_DAYS,
            'actions_per_day': ACTIONS_PER_AGENT_PER_DAY,
            'variants_tested': len(variants),
            'timestamp': time.time(),
        }
    }

    results_path = os.path.join(_SCRIPT_DIR, '..', 'state', 'simulations', 'economy_monte_carlo.json')
    os.makedirs(os.path.dirname(results_path), exist_ok=True)
    with open(results_path, 'w') as f:
        json.dump(output, f, indent=2)
    print(f'\n📁 Full results saved to state/simulations/economy_monte_carlo.json')

    return output


if __name__ == '__main__':
    output = main()
