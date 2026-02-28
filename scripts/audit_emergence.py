#!/usr/bin/env python3
"""
Emergence Pipeline Audit — Trace seed_emergence.py through the entire codebase,
map the pipeline, and identify constitutional violations.
"""
import json
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(SCRIPT_DIR, '..')


def load_constitution():
    """Extract constitutional economic constants from CONSTITUTION.md."""
    return {
        'tax_brackets': [
            (0, 19, 0.0),
            (20, 49, 0.05),
            (50, 99, 0.10),
            (100, 249, 0.15),
            (250, 499, 0.25),
            (500, None, 0.40),
        ],
        'wealth_tax_threshold': 500,    # §6.4.6
        'wealth_tax_rate': 0.02,        # §6.4.6
        'maintenance_cost': 1,          # §6.5.1
        'listing_fee_rate': 0.05,       # §6.5.2
        'listing_fee_min': 1,           # §6.5.2
        'base_ubi_amount': 5,           # §6.4.4
    }


def load_current_config():
    """Load state/config/economy.json."""
    path = os.path.join(ROOT, 'state', 'config', 'economy.json')
    with open(path) as f:
        return json.load(f)


def load_generate_config_ranges():
    """Extract the variance ranges from generate_config.py."""
    return {
        'wealth_tax_threshold': {'base': 500, 'min': 200, 'max': 800},
        'wealth_tax_rate': {'base': 0.02, 'min': 0.005, 'max': 0.05},
        'maintenance_cost': {'base': 1, 'min': 1, 'max': 3},
        'base_ubi_amount': {'base': 5, 'min': 1, 'max': 15},
        'listing_fee_rate': {'base': 0.05, 'min': 0.02, 'max': 0.10},
        'listing_fee_min': {'base': 1, 'min': 1, 'max': 3},
        'tax_bracket_ranges': [
            {'bracket': '0-50', 'base': 0.0, 'min': 0.0, 'max': 0.0},
            {'bracket': '50-100', 'base': 0.05, 'min': 0.03, 'max': 0.08},
            {'bracket': '100-250', 'base': 0.10, 'min': 0.06, 'max': 0.15},
            {'bracket': '250-500', 'base': 0.15, 'min': 0.10, 'max': 0.25},
            {'bracket': '500-1000', 'base': 0.25, 'min': 0.15, 'max': 0.35},
            {'bracket': '1000+', 'base': 0.35, 'min': 0.25, 'max': 0.45},
        ],
    }


def print_pipeline():
    """Print the emergence pipeline dependency graph."""
    print("""
╔══════════════════════════════════════════════════════════════════════╗
║                  EMERGENCE PIPELINE DEPENDENCY GRAPH                ║
╚══════════════════════════════════════════════════════════════════════╝

  seed_emergence.py ──── Emergence(seed)
  │                      │
  │   Core Engine:       │  _hash(s) → SHA256 → deterministic int
  │                      │  _seeded_rng(context) → sub-RNG per context
  │                      │  _compose(fragments, context) → phrase builder
  │                      │  agent_speak(archetype) → NPC dialogue
  │                      │  observe_time/population/weather → narration
  │                      │  weather_weights(season) → weather distribution
  │                      │  soul_greeting(archetype) → NPC greetings
  │                      │
  ├─► generate_config.py ─── seed=YYYY-MM-DD (daily)
  │   │   └─ Emergence(seed)
  │   │       ├─ generate_economy(e) ──► state/config/economy.json
  │   │       │   └─ e._seeded_rng('economy') → earn_table, tax_brackets,
  │   │       │      wealth_tax, maintenance, UBI, listing fees
  │   │       │      ⚠️ VARIES constitutional constants randomly!
  │   │       │
  │   │       ├─ generate_world(e) ──► state/config/world.json
  │   │       │   └─ e._seeded_rng('world') → zone names, day phases,
  │   │       │      weather weights, season cycle, pet/plant params
  │   │       │
  │   │       └─ generate_souls(e) ──► state/config/souls.json
  │   │           └─ e._seeded_rng('souls') → archetype behaviors,
  │   │              emote types, greet cooldowns, timer fires
  │   │
  ├─► agent_autonomy.py ──── Emergence() (auto timestamp seed)
  │   │   └─ agent_speak(archetype) → NPC chat messages
  │   │   └─ pick_action(pool) → plant species, build types, craft recipes
  │   │   └─ pick_intention() → life intentions
  │   │   └─ NEW: get_routine(agent, worldTime) → daily schedule
  │   │
  ├─► agent_observer.py ──── Emergence(seed=timestamp+zone)
  │   │   └─ observe_time(phase, zone) → time-of-day narration
  │   │   └─ observe_population(count) → crowd observation
  │   │   └─ Emergence(seed=timestamp+'intent') → intention narration
  │   │
  ├─► game_tick.py ──── Emergence(seed=tick_number)
  │   │   └─ weather_weights(season) → next weather roll
  │   │
  ├─► world_diff.py ──── get_emergence() (lazy, auto seed)
  │   │   └─ narrate templates for zone transitions, builds, chat
  │   │
  └─► generate_souls.py ──── get_emergence() (lazy, auto seed)
      └─ soul archetype configs for NPC behavior

  Downstream Effects:
  ┌────────────────────┬──────────────────────────────────────────┐
  │ Config File        │ Affects                                  │
  ├────────────────────┼──────────────────────────────────────────┤
  │ economy.json       │ Tax rates, earn table, UBI, wealth tax,  │
  │                    │ maintenance fees, listing fees            │
  │ world.json         │ Zone names, day phases, weather cycles,   │
  │                    │ season length, pet/plant growth rates     │
  │ souls.json         │ NPC behavior timers, emote types,         │
  │                    │ greeting cooldowns                        │
  └────────────────────┴──────────────────────────────────────────┘
""")


def audit_constitutional_compliance():
    """Check current config against constitutional mandates."""
    constitution = load_constitution()
    config = load_current_config()
    ranges = load_generate_config_ranges()
    violations = []

    print("╔══════════════════════════════════════════════════════════════════════╗")
    print("║                    CONSTITUTIONAL COMPLIANCE AUDIT                   ║")
    print("╚══════════════════════════════════════════════════════════════════════╝\n")

    # Check wealth tax
    wt_rate = config.get('wealth_tax_rate', 0)
    if abs(wt_rate - constitution['wealth_tax_rate']) > 0.001:
        violations.append(f"§6.4.6 wealth_tax_rate: config={wt_rate}, constitution={constitution['wealth_tax_rate']}")
    else:
        print(f"  ✅ §6.4.6 wealth_tax_rate = {wt_rate} (correct)")

    wt_thresh = config.get('wealth_tax_threshold', 0)
    if wt_thresh != constitution['wealth_tax_threshold']:
        violations.append(f"§6.4.6 wealth_tax_threshold: config={wt_thresh}, constitution={constitution['wealth_tax_threshold']}")
    else:
        print(f"  ✅ §6.4.6 wealth_tax_threshold = {wt_thresh} (correct)")

    # Check maintenance
    maint = config.get('maintenance_cost', 0)
    if maint != constitution['maintenance_cost']:
        violations.append(f"§6.5.1 maintenance_cost: config={maint}, constitution={constitution['maintenance_cost']}")
    else:
        print(f"  ✅ §6.5.1 maintenance_cost = {maint} (correct)")

    # Check UBI
    ubi = config.get('base_ubi_amount', 0)
    if ubi != constitution['base_ubi_amount']:
        violations.append(f"§6.4.4 base_ubi_amount: config={ubi}, constitution={constitution['base_ubi_amount']}")
    else:
        print(f"  ✅ §6.4.4 base_ubi_amount = {ubi} (correct)")

    # Check listing fee
    lfr = config.get('listing_fee_rate', 0)
    if abs(lfr - constitution['listing_fee_rate']) > 0.001:
        violations.append(f"§6.5.2 listing_fee_rate: config={lfr}, constitution={constitution['listing_fee_rate']}")
    else:
        print(f"  ✅ §6.5.2 listing_fee_rate = {lfr} (correct)")

    lfm = config.get('listing_fee_min', 0)
    if lfm != constitution['listing_fee_min']:
        violations.append(f"§6.5.2 listing_fee_min: config={lfm}, constitution={constitution['listing_fee_min']}")
    else:
        print(f"  ✅ §6.5.2 listing_fee_min = {lfm} (correct)")

    # Check tax brackets
    brackets = config.get('tax_brackets', [])
    const_brackets = constitution['tax_brackets']
    print(f"\n  Tax Brackets (§6.4.1):")
    for i, (lo, hi, rate) in enumerate(const_brackets):
        hi_str = str(hi) if hi else '∞'
        if i < len(brackets):
            cfg_rate = brackets[i][2] if len(brackets[i]) > 2 else 'missing'
            if isinstance(cfg_rate, (int, float)) and abs(cfg_rate - rate) > 0.001:
                violations.append(f"§6.4.1 bracket [{lo}-{hi_str}]: config={cfg_rate}, constitution={rate}")
                print(f"    ❌ [{lo}-{hi_str}]: {cfg_rate} (should be {rate})")
            else:
                print(f"    ✅ [{lo}-{hi_str}]: {cfg_rate}")
        else:
            violations.append(f"§6.4.1 bracket [{lo}-{hi_str}] missing from config")
            print(f"    ❌ [{lo}-{hi_str}]: MISSING")

    # Check emergence variance ranges for constitutional risk
    print("\n  Emergence Variance Risk Analysis:")
    print("  (ranges that can drift outside constitutional bounds)\n")

    risky = [
        ('wealth_tax_rate', 0.02, ranges['wealth_tax_rate'], '§6.4.6 mandates exactly 2%'),
        ('wealth_tax_threshold', 500, ranges['wealth_tax_threshold'], '§6.4.6 mandates exactly 500'),
        ('maintenance_cost', 1, ranges['maintenance_cost'], '§6.5.1 mandates exactly 1 Spark'),
    ]
    for name, const_val, r, note in risky:
        if r['min'] != r['max'] or r['min'] != const_val:
            print(f"    ⚠️  {name}: varies [{r['min']}, {r['max']}] but {note}")
            violations.append(f"RISK: generate_config.py varies {name} in [{r['min']}, {r['max']}] — {note}")
        else:
            print(f"    ✅ {name}: fixed at {const_val}")

    # Summary
    print("\n" + "═" * 70)
    if violations:
        print(f"\n  ❌ {len(violations)} VIOLATION(S) FOUND:\n")
        for v in violations:
            print(f"    • {v}")
        print(f"\n  RECOMMENDATION: Fix generate_config.py to use constitutional")
        print(f"  constants as fixed values, not random variance ranges.")
        print(f"  The emergence engine should only vary non-constitutional")
        print(f"  parameters (earn table, zone names, soul behavior timers).")
    else:
        print("\n  ✅ ALL CONSTITUTIONAL CHECKS PASSED")

    return violations


def main():
    print_pipeline()
    violations = audit_constitutional_compliance()

    # Fix generate_config.py constitutional constants
    if '--fix' in sys.argv:
        print("\n\n🔧 Applying constitutional fixes to generate_config.py...")
        fix_generate_config()
        print("Done. Re-run without --fix to verify.")

    sys.exit(1 if violations else 0)


def fix_generate_config():
    """Fix generate_config.py to use constitutional constants."""
    path = os.path.join(ROOT, 'scripts', 'generate_config.py')
    with open(path, 'r') as f:
        content = f.read()

    # Fix wealth_tax_threshold
    content = content.replace(
        "'wealth_tax_threshold': _vary_int(rng, 500, 200, 800)",
        "'wealth_tax_threshold': 500,   # §6.4.6 constitutional constant"
    )
    # Fix wealth_tax_rate
    content = content.replace(
        "'wealth_tax_rate': _vary_float(rng, 0.02, 0.005, 0.05, 3)",
        "'wealth_tax_rate': 0.02,       # §6.4.6 constitutional constant"
    )
    # Fix maintenance_cost
    content = content.replace(
        "'maintenance_cost': _vary_int(rng, 1, 1, 3)",
        "'maintenance_cost': 1,         # §6.5.1 constitutional constant"
    )
    # Fix tax brackets to constitutional values
    content = content.replace(
        """TAX_BRACKET_RANGES = [
    (0, 50, 0.0, 0.0, 0.0),
    (50, 100, 0.05, 0.03, 0.08),
    (100, 250, 0.10, 0.06, 0.15),
    (250, 500, 0.15, 0.10, 0.25),
    (500, 1000, 0.25, 0.15, 0.35),
    (1000, None, 0.35, 0.25, 0.45),
]""",
        """# §6.4.1 Constitutional tax brackets — these are fixed, not varied
TAX_BRACKET_RANGES = [
    (0, 20, 0.0, 0.0, 0.0),
    (20, 50, 0.05, 0.05, 0.05),
    (50, 100, 0.10, 0.10, 0.10),
    (100, 250, 0.15, 0.15, 0.15),
    (250, 500, 0.25, 0.25, 0.25),
    (500, None, 0.40, 0.40, 0.40),
]"""
    )

    with open(path, 'w') as f:
        f.write(content)
    print(f"  Updated {path}")


if __name__ == '__main__':
    main()
