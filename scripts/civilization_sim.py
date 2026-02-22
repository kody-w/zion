#!/usr/bin/env python3
"""ZION Civilization Simulator — run 1000 ticks of the entire world.

Simulates all 100 agents making autonomous decisions, economy flowing,
structures being built, cultures emerging. Generates a single-page HTML
report with SVG charts, narrative timeline, and economic analysis.

Usage:
    python scripts/civilization_sim.py [--ticks N] [--output FILE]
"""
import copy
import hashlib
import json
import math
import os
import random
import sys
import time
from collections import Counter, defaultdict
from datetime import datetime, timezone

# ─── Import siblings ──────────────────────────────────────────
script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, script_dir)

from game_tick import calculate_day_phase, generate_weather, calculate_season
from agent_autonomy import generate_agent_intentions, get_archetype_phrases

# ─── Simulation Constants ─────────────────────────────────────

TICK_SECONDS = 300          # 5 minutes per tick (matches real cadence)
AGENTS_PER_TICK = 10        # Agents activated per tick
SNAPSHOT_INTERVAL = 10      # Record metrics every N ticks
ZONES = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena']
ZONE_CENTERS = {
    'nexus': (0, 0), 'gardens': (200, 30), 'athenaeum': (100, -220),
    'studio': (-200, -100), 'wilds': (-30, 260), 'agora': (-190, 120),
    'commons': (170, 190), 'arena': (0, -240),
}


# ─── Simulation State ─────────────────────────────────────────

def create_initial_state(agents):
    """Create a fresh world state from the founding agents."""
    return {
        'worldTime': 0,
        'lastTickAt': time.time(),
        'dayPhase': 'dawn',
        'weather': 'clear',
        'season': 'spring',
        'citizens': {},
        'structures': {},
        'creations': [],
        'gardens': {},
        'economy': {
            'balances': {SIM_TREASURY_ID: 0},
            'transactions': [],
            'listings': [],
        },
        'chat': [],
        'discoveries': {},
        'zone_populations': {z: 0 for z in ZONES},
        'agents': agents,
    }


# ─── Core Simulation Loop ─────────────────────────────────────

def sim_tick(state, tick_num, rng):
    """Run one simulation tick. Returns (state, events)."""
    events = []

    # Advance world time
    state['worldTime'] += TICK_SECONDS
    state['dayPhase'] = calculate_day_phase(state['worldTime'])
    weather_seed = int(state['worldTime'] / 300)
    old_weather = state['weather']
    state['weather'] = generate_weather(weather_seed)
    if state['weather'] != old_weather:
        events.append(('weather', 'Weather changed to %s' % state['weather']))

    # Season (use tick_num to cycle faster for interesting history)
    season_cycle = ['spring', 'summer', 'autumn', 'winter']
    state['season'] = season_cycle[(tick_num // 250) % 4]

    # Activate random agents
    agents = state['agents']
    num_activate = min(AGENTS_PER_TICK, len(agents))
    activated = rng.sample(agents, num_activate)

    for agent in activated:
        # Assign zone based on archetype preference + some randomness
        zone = _pick_zone(agent, state, rng)
        cx, cz = ZONE_CENTERS.get(zone, (0, 0))
        agent['position'] = {
            'x': cx + rng.uniform(-50, 50),
            'y': 0,
            'z': cz + rng.uniform(-50, 50),
            'zone': zone,
        }

        # Register citizen
        if agent['id'] not in state['citizens']:
            state['citizens'][agent['id']] = {
                'id': agent['id'],
                'name': agent['name'],
                'archetype': agent['archetype'],
                'zone': zone,
                'joinedAtTick': tick_num,
                'actions': 0,
                'spark': agent.get('spark', 100),
            }
            if len(state['citizens']) <= 100:
                events.append(('join', '%s (%s) joined ZION' % (agent['name'], agent['archetype'])))

        citizen = state['citizens'][agent['id']]
        citizen['zone'] = zone

        # Generate actions based on archetype
        actions = _generate_actions(agent, state, tick_num, rng)
        for action in actions:
            result = _apply_action(action, state, tick_num, rng)
            citizen['actions'] += 1
            if result:
                events.append(result)

    # Advance plant growth
    for plot_id, plot in state['gardens'].items():
        for plant in plot.get('plants', []):
            if plant.get('growthStage', 0) < 1.0:
                growth_rate = 1.0 / plant.get('growthTime', 3600)
                plant['growthStage'] = min(1.0, plant['growthStage'] + growth_rate * TICK_SECONDS)

    # Wealth tax + UBI distribution once per game day (every 1440 worldTime units)
    current_day = int(state['worldTime'] / 1440)
    last_ubi_day = state.get('_lastUbiDay', -1)
    if current_day > last_ubi_day:
        state['_lastUbiDay'] = current_day
        econ = state['economy']

        # Wealth tax (§6.4): 2% on balances above 500
        for pid in list(econ['balances'].keys()):
            if pid in (SIM_TREASURY_ID, 'SYSTEM'):
                continue
            bal = econ['balances'].get(pid, 0)
            if bal > SIM_WEALTH_TAX_THRESHOLD:
                taxable = bal - SIM_WEALTH_TAX_THRESHOLD
                tax = int(taxable * SIM_WEALTH_TAX_RATE)
                if tax > 0:
                    econ['balances'][pid] -= tax
                    econ['balances'][SIM_TREASURY_ID] = econ['balances'].get(SIM_TREASURY_ID, 0) + tax

        # Structure maintenance (§6.5): charge 1 spark per structure to builder
        maintenance_destroyed = 0
        structures_to_remove = []
        for sid, struct in list(state['structures'].items()):
            builder_id = struct.get('builder', '')
            # Find the agent ID matching this builder name
            builder_agent_id = None
            for cid, cit in state['citizens'].items():
                if cit.get('name') == builder_id or cid == builder_id:
                    builder_agent_id = cid
                    break
            if builder_agent_id:
                bal = econ['balances'].get(builder_agent_id, 0)
                if bal >= SIM_MAINTENANCE_COST:
                    econ['balances'][builder_agent_id] -= SIM_MAINTENANCE_COST
                    maintenance_destroyed += SIM_MAINTENANCE_COST
                    econ['transactions'].append({
                        'type': 'maintenance', 'agent': builder_agent_id,
                        'amount': -SIM_MAINTENANCE_COST, 'tick': tick_num,
                    })
                else:
                    # Track missed payments for decay
                    missed = struct.get('_missedPayments', 0) + 1
                    struct['_missedPayments'] = missed
                    if missed >= 2:
                        structures_to_remove.append(sid)
            else:
                # No known builder — structure decays
                missed = struct.get('_missedPayments', 0) + 1
                struct['_missedPayments'] = missed
                if missed >= 2:
                    structures_to_remove.append(sid)

        for sid in structures_to_remove:
            del state['structures'][sid]
            events.append(('decay', 'Structure %s decayed from neglect' % sid))

        if maintenance_destroyed > 0:
            events.append(('maintenance', '%d spark destroyed in maintenance' % maintenance_destroyed))

        treasury_bal = econ['balances'].get(SIM_TREASURY_ID, 0)
        if treasury_bal > 0:
            eligible = [pid for pid in econ['balances'] if pid not in (SIM_TREASURY_ID, 'SYSTEM')]
            if eligible:
                per_player = min(SIM_BASE_UBI, treasury_bal // len(eligible))
                if per_player >= 1:
                    distributed = 0
                    for pid in eligible:
                        if econ['balances'].get(SIM_TREASURY_ID, 0) < per_player:
                            break
                        econ['balances'][pid] = econ['balances'].get(pid, 0) + per_player
                        econ['balances'][SIM_TREASURY_ID] -= per_player
                        distributed += per_player
                    if distributed > 0:
                        events.append(('ubi', 'UBI distributed: %d spark to %d citizens' % (distributed, len(eligible))))

    # Update zone populations
    zone_pop = Counter(c.get('zone', 'nexus') for c in state['citizens'].values())
    state['zone_populations'] = {z: zone_pop.get(z, 0) for z in ZONES}

    return state, events


def _pick_zone(agent, state, rng):
    """Pick a zone for an agent based on archetype affinity."""
    archetype = agent.get('archetype', 'citizen')
    zone_affinity = {
        'gardener': ['gardens', 'commons', 'nexus'],
        'builder': ['studio', 'nexus', 'arena'],
        'storyteller': ['athenaeum', 'agora', 'nexus'],
        'merchant': ['agora', 'nexus', 'commons'],
        'explorer': ['wilds', 'arena', 'gardens'],
        'teacher': ['athenaeum', 'nexus', 'agora'],
        'musician': ['studio', 'agora', 'nexus'],
        'healer': ['gardens', 'commons', 'nexus'],
        'philosopher': ['athenaeum', 'wilds', 'nexus'],
        'artist': ['studio', 'gardens', 'nexus'],
    }
    preferred = zone_affinity.get(archetype, ZONES[:3])
    # 70% chance of preferred zone, 30% random
    if rng.random() < 0.7:
        return rng.choice(preferred)
    return rng.choice(ZONES)


def _generate_actions(agent, state, tick_num, rng):
    """Generate 1-3 actions for an agent based on archetype."""
    archetype = agent.get('archetype', 'citizen')
    intentions = agent.get('intentions', ['say', 'move'])
    num_actions = rng.randint(1, 3)

    actions = []
    for _ in range(num_actions):
        action_type = rng.choice(intentions + ['say', 'emote'])
        actions.append({
            'type': action_type,
            'agent': agent,
            'zone': agent['position']['zone'],
        })
    return actions


def _apply_action(action, state, tick_num, rng):
    """Apply a single agent action to world state. Returns event tuple or None."""
    agent = action['agent']
    zone = action['zone']
    archetype = agent.get('archetype', 'citizen')
    agent_id = agent['id']
    agent_name = agent['name']

    action_type = action['type']

    if action_type == 'say':
        phrases = get_archetype_phrases(archetype)
        text = rng.choice(phrases)
        state['chat'].append({
            'from': agent_name,
            'text': text,
            'zone': zone,
            'tick': tick_num,
        })
        state['chat'] = state['chat'][-500:]
        return None

    elif action_type == 'build':
        # Pay first — refuse if agent can't afford (§6.4)
        if not _econ_txn(state, 'build', agent_id, -5, tick_num):
            return None
        struct_types = ['bench', 'statue', 'path', 'shrine', 'fountain', 'bridge',
                        'tower', 'garden_wall', 'archway', 'monument']
        struct_type = rng.choice(struct_types)
        struct_id = 'struct_%s_%d' % (agent_id, tick_num)
        state['structures'][struct_id] = {
            'type': struct_type,
            'builder': agent_name,
            'zone': zone,
            'tick': tick_num,
        }
        # Cap structures
        if len(state['structures']) > 300:
            oldest = sorted(state['structures'].keys())[:50]
            for k in oldest:
                del state['structures'][k]
        return ('build', '%s built a %s in %s' % (agent_name, struct_type, zone))

    elif action_type == 'compose':
        creation_types = ['song', 'poem', 'story', 'painting', 'sculpture', 'dance']
        ctype = rng.choice(creation_types)
        titles = {
            'song': ['Dawn Chorus', 'Twilight Melody', 'Storm Song', 'Peace Hymn'],
            'poem': ['Ode to the Wilds', 'Garden Verses', 'Nexus Sonnet', 'Arena Ballad'],
            'story': ['Tale of Two Zones', 'The Lost Explorer', 'Merchant\'s Journey', 'The Healer\'s Path'],
            'painting': ['Sunset over Gardens', 'Portrait of the Nexus', 'Storm Clouds', 'Peaceful Commons'],
            'sculpture': ['The Thinker', 'Unity', 'Growth', 'Harmony'],
            'dance': ['Zone Waltz', 'Harvest Dance', 'Battle Rhythm', 'Morning Flow'],
        }
        title = rng.choice(titles.get(ctype, ['Untitled']))
        state['creations'].append({
            'title': title,
            'type': ctype,
            'creator': agent_name,
            'zone': zone,
            'tick': tick_num,
        })
        state['creations'] = state['creations'][-500:]
        _econ_txn(state, 'compose', agent_id, 0, tick_num)
        return ('creation', '%s composed "%s" (%s) in %s' % (agent_name, title, ctype, zone))

    elif action_type == 'plant':
        # Pay first — refuse if agent can't afford (§6.4)
        if not _econ_txn(state, 'plant', agent_id, -3, tick_num):
            return None
        species = rng.choice(['tomato', 'wheat', 'flower', 'tree', 'herb', 'vine'])
        plot_id = 'plot_%s_%03d' % (zone, rng.randint(1, 30))
        if plot_id not in state['gardens']:
            state['gardens'][plot_id] = {'plants': []}
        state['gardens'][plot_id]['plants'].append({
            'species': species,
            'plantedBy': agent_name,
            'growthStage': 0.0,
            'growthTime': rng.randint(1800, 7200),
            'tick': tick_num,
        })
        return ('plant', '%s planted %s in %s' % (agent_name, species, zone))

    elif action_type == 'harvest':
        # Find a mature plant
        for plot_id, plot in state['gardens'].items():
            mature = [p for p in plot.get('plants', []) if p.get('growthStage', 0) >= 1.0]
            if mature:
                plant = mature[0]
                plot['plants'].remove(plant)
                earnings = rng.randint(1, 4)
                _econ_txn(state, 'harvest', agent_id, earnings, tick_num)
                return ('harvest', '%s harvested %s (+%d spark)' % (agent_name, plant['species'], earnings))
        return None

    elif action_type == 'craft':
        # Pay first — refuse if agent can't afford (§6.4)
        if not _econ_txn(state, 'craft', agent_id, -3, tick_num):
            return None
        items = ['tool', 'ornament', 'instrument', 'potion', 'amulet', 'scroll']
        item = rng.choice(items)
        return ('craft', '%s crafted a %s' % (agent_name, item))

    elif action_type == 'trade_offer':
        items = ['tool', 'gem', 'flower', 'scroll', 'potion']
        item = rng.choice(items)
        price = rng.randint(1, 15)
        state['economy']['listings'].append({
            'item': item, 'price': price, 'seller': agent_id, 'tick': tick_num,
        })
        state['economy']['listings'] = state['economy']['listings'][-200:]
        _econ_txn(state, 'trade_offer', agent_id, 0, tick_num)
        return ('trade', '%s listed %s for %d spark' % (agent_name, item, price))

    elif action_type == 'discover':
        discoveries_list = [
            'Ancient Ruins', 'Hidden Spring', 'Crystal Cave', 'Star Map',
            'Forgotten Library', 'Sacred Grove', 'Underground River',
            'Singing Stones', 'Mirror Lake', 'Wind Temple',
            'Shadow Garden', 'Sun Dial', 'Moon Gate', 'Thunder Peak',
        ]
        disc = rng.choice(discoveries_list)
        disc_id = 'disc_%s_%d' % (agent_id, tick_num)
        if disc_id not in state['discoveries']:
            state['discoveries'][disc_id] = {
                'name': disc, 'discoverer': agent_name, 'zone': zone, 'tick': tick_num,
            }
            return ('discovery', '%s discovered %s in %s!' % (agent_name, disc, zone))
        return None

    elif action_type == 'emote':
        return None  # Silent action

    elif action_type == 'inspect':
        return None  # Silent

    elif action_type == 'intention_set':
        return None  # Silent

    return None


_SIM_TAX_BRACKETS = [
    (0,   19,  0.00),
    (20,  49,  0.05),
    (50,  99,  0.10),
    (100, 249, 0.15),
    (250, 499, 0.25),
    (500, float('inf'), 0.40),
]

SIM_TREASURY_ID = 'TREASURY'
SIM_BASE_UBI = 5
SIM_WEALTH_TAX_THRESHOLD = 500
SIM_WEALTH_TAX_RATE = 0.02
SIM_BALANCE_FLOOR = 0
SIM_MAINTENANCE_COST = 1


def _sim_tax_rate(balance):
    """Get tax rate for a balance level."""
    if balance < 0:
        return 0.0
    for low, high, rate in _SIM_TAX_BRACKETS:
        if low <= balance <= high:
            return rate
    return 0.0


def _econ_txn(state, txn_type, agent_id, amount, tick_num):
    """Record an economy transaction and adjust balance, with tax on positive earnings.

    Returns True if the transaction succeeded, False if refused (insufficient funds).
    Constitution §6.4: actions that would reduce a balance below 0 are refused.
    """
    econ = state['economy']
    current_balance = econ['balances'].get(agent_id, 100)

    if amount > 0:
        # Apply progressive tax on earnings
        tax_rate = _sim_tax_rate(current_balance)
        tax_amount = int(amount * tax_rate)
        net_amount = amount - tax_amount

        econ['balances'][agent_id] = current_balance + net_amount

        if tax_amount > 0:
            econ['balances'][SIM_TREASURY_ID] = econ['balances'].get(SIM_TREASURY_ID, 0) + tax_amount
            econ['transactions'].append({
                'type': 'tax', 'agent': agent_id, 'amount': tax_amount, 'tick': tick_num,
            })
    else:
        # Balance floor (§6.4): refuse if agent can't afford full cost
        new_balance = current_balance + amount
        if new_balance < SIM_BALANCE_FLOOR:
            return False
        econ['balances'][agent_id] = new_balance

    econ['transactions'].append({
        'type': txn_type, 'agent': agent_id, 'amount': amount, 'tick': tick_num,
    })
    econ['transactions'] = econ['transactions'][-2000:]
    return True


# ─── Metrics Collection ───────────────────────────────────────

def collect_snapshot(state, tick_num, events):
    """Collect metrics at a point in time."""
    econ = state['economy']
    total_spark = sum(v for k, v in econ['balances'].items() if k not in (SIM_TREASURY_ID, 'SYSTEM'))
    txn_volume = len([t for t in econ['transactions'] if t.get('tick', 0) > tick_num - SNAPSHOT_INTERVAL])

    # Zone diversity
    zone_pop = state['zone_populations']
    active_zones = sum(1 for v in zone_pop.values() if v > 0)

    # Gini coefficient for economic inequality (exclude TREASURY/SYSTEM)
    balances = sorted(v for k, v in econ['balances'].items() if k not in (SIM_TREASURY_ID, 'SYSTEM'))
    gini = _gini_coefficient(balances) if balances else 0

    # Count total spark destroyed via maintenance
    maintenance_txns = [t for t in econ['transactions'] if t.get('type') == 'maintenance']
    total_spark_destroyed = sum(abs(t.get('amount', 0)) for t in maintenance_txns)

    return {
        'tick': tick_num,
        'population': len(state['citizens']),
        'structures': len(state['structures']),
        'creations': len(state['creations']),
        'gardens': sum(len(p.get('plants', [])) for p in state['gardens'].values()),
        'discoveries': len(state['discoveries']),
        'total_spark': total_spark,
        'txn_volume': txn_volume,
        'listings': len(econ['listings']),
        'active_zones': active_zones,
        'zone_populations': dict(zone_pop),
        'gini': round(gini, 3),
        'weather': state['weather'],
        'season': state['season'],
        'dayPhase': state['dayPhase'],
        'chat_messages': len(state['chat']),
        'treasury': econ['balances'].get(SIM_TREASURY_ID, 0),
        'totalSparkDestroyed': total_spark_destroyed,
    }


def _gini_coefficient(values):
    """Calculate Gini coefficient (0=perfect equality, 1=perfect inequality)."""
    if not values or len(values) < 2:
        return 0
    n = len(values)
    sorted_vals = sorted(values)
    cumulative = sum((2 * i - n + 1) * v for i, v in enumerate(sorted_vals))
    total = sum(sorted_vals)
    if total == 0:
        return 0
    return cumulative / (n * total)


# ─── Main Simulation ──────────────────────────────────────────

def run_simulation(agents, num_ticks=1000, seed=42):
    """Run the full civilization simulation.

    Returns:
        (snapshots, all_events, final_state)
    """
    rng = random.Random(seed)
    state = create_initial_state(agents)
    snapshots = []
    all_events = []

    print('ZION Civilization Simulator')
    print('  Agents: %d' % len(agents))
    print('  Ticks: %d' % num_ticks)
    print('  Simulated time: %.1f days' % (num_ticks * TICK_SECONDS / 86400))
    print()

    for tick in range(num_ticks):
        state, events = sim_tick(state, tick, rng)

        for event in events:
            all_events.append((tick, event[0], event[1]))

        if tick % SNAPSHOT_INTERVAL == 0:
            snapshot = collect_snapshot(state, tick, events)
            snapshots.append(snapshot)

        if tick % 100 == 0:
            pop = len(state['citizens'])
            spark = sum(state['economy']['balances'].values())
            structs = len(state['structures'])
            print('  tick %4d: pop=%d spark=%d structures=%d creations=%d' % (
                tick, pop, spark, structs, len(state['creations'])))

    # Final snapshot
    snapshots.append(collect_snapshot(state, num_ticks, []))

    print()
    print('Simulation complete.')
    return snapshots, all_events, state


# ─── Economic Analysis ────────────────────────────────────────

def analyze_economy(snapshots, final_state):
    """Analyze economic health and stability."""
    analysis = {}

    # Total spark over time
    spark_series = [s['total_spark'] for s in snapshots]
    analysis['final_spark'] = spark_series[-1]
    analysis['peak_spark'] = max(spark_series)
    analysis['min_spark'] = min(spark_series)

    # Growth rate (compare first and last quarter)
    q1 = spark_series[:len(spark_series) // 4]
    q4 = spark_series[-(len(spark_series) // 4):]
    q1_avg = sum(q1) / len(q1) if q1 else 0
    q4_avg = sum(q4) / len(q4) if q4 else 0
    analysis['growth_rate'] = ((q4_avg - q1_avg) / q1_avg * 100) if q1_avg else 0

    # Gini coefficient trend
    gini_series = [s['gini'] for s in snapshots]
    analysis['final_gini'] = gini_series[-1]
    analysis['avg_gini'] = sum(gini_series) / len(gini_series)

    # Transaction velocity
    txn_series = [s['txn_volume'] for s in snapshots]
    analysis['avg_txn_volume'] = sum(txn_series) / len(txn_series) if txn_series else 0
    analysis['peak_txn_volume'] = max(txn_series) if txn_series else 0

    # Wealth distribution (exclude TREASURY/SYSTEM)
    balances = sorted(
        [v for k, v in final_state['economy']['balances'].items() if k not in (SIM_TREASURY_ID, 'SYSTEM')],
        reverse=True)
    top10_wealth = sum(balances[:10]) if len(balances) >= 10 else sum(balances)
    total_wealth = sum(balances) if balances else 1
    analysis['top10_share'] = top10_wealth / total_wealth * 100
    analysis['treasury'] = final_state['economy']['balances'].get(SIM_TREASURY_ID, 0)

    # Stability assessment
    if analysis['growth_rate'] > 50:
        analysis['verdict'] = 'INFLATIONARY'
        analysis['emoji'] = '📈'
        analysis['detail'] = ('Economy is inflating at %.0f%%. Spark creation (harvesting) '
                              'outpaces destruction (building, planting). Without intervention, '
                              'currency will devalue. Recommend: increase build costs or add spark sinks.' % analysis['growth_rate'])
    elif analysis['growth_rate'] < -20:
        analysis['verdict'] = 'DEFLATIONARY'
        analysis['emoji'] = '📉'
        analysis['detail'] = ('Economy is contracting at %.0f%%. Agents are spending faster than earning. '
                              'Risk of economic stagnation. Recommend: increase harvest yields or reduce costs.' % abs(analysis['growth_rate']))
    elif analysis['final_gini'] > 0.5 and analysis.get('treasury', 0) > 0:
        analysis['verdict'] = 'REDISTRIBUTING'
        analysis['emoji'] = '🔄'
        analysis['detail'] = ('Wealth inequality is high (Gini=%.2f) but taxation and UBI are active. '
                              'Treasury holds %d spark. Top 10 agents hold %.0f%% of all spark. '
                              'System is working to reduce inequality.' % (analysis['final_gini'], analysis['treasury'], analysis['top10_share']))
    elif analysis['final_gini'] > 0.5:
        analysis['verdict'] = 'OLIGARCHIC'
        analysis['emoji'] = '👑'
        analysis['detail'] = ('Wealth inequality is extreme (Gini=%.2f). Top 10 agents hold %.0f%% of all spark. '
                              'Risk of economic exclusion. Recommend: progressive taxation or UBI.' % (analysis['final_gini'], analysis['top10_share']))
    elif analysis['avg_txn_volume'] < 2:
        analysis['verdict'] = 'STAGNANT'
        analysis['emoji'] = '🏚️'
        analysis['detail'] = ('Transaction volume is very low (avg %.1f/snapshot). Agents are not trading. '
                              'Economy lacks dynamism. Recommend: introduce trade incentives.' % analysis['avg_txn_volume'])
    else:
        analysis['verdict'] = 'STABLE'
        analysis['emoji'] = '⚖️'
        analysis['detail'] = ('Economy is healthy. Growth rate: %.0f%%, Gini: %.2f, '
                              'transaction volume: %.1f/snapshot. Wealth is reasonably distributed '
                              'and agents are actively participating.' % (analysis['growth_rate'], analysis['final_gini'], analysis['avg_txn_volume']))

    return analysis


# ─── HTML Report Generator ────────────────────────────────────

def generate_report(snapshots, events, final_state, analysis, agents):
    """Generate a single-page HTML report with inline SVG charts."""
    ticks = [s['tick'] for s in snapshots]
    max_tick = max(ticks) if ticks else 1

    # Notable events (filter to most important)
    notable = _select_notable_events(events)

    # Build the HTML
    html = []
    html.append(_html_head())
    html.append('<body>')
    html.append('<div class="container">')

    # Header
    html.append('<header>')
    html.append('<h1>The History of ZION</h1>')
    html.append('<p class="subtitle">A %d-tick civilization simulation of %d AI souls</p>' % (max_tick, len(agents)))
    html.append('<p class="meta">%.1f simulated days &middot; %d citizens &middot; %d structures &middot; %d creations &middot; %d discoveries</p>' % (
        max_tick * TICK_SECONDS / 86400,
        len(final_state['citizens']),
        len(final_state['structures']),
        len(final_state['creations']),
        len(final_state['discoveries']),
    ))
    html.append('</header>')

    # Economic Verdict
    html.append('<section class="verdict %s">' % analysis['verdict'].lower())
    html.append('<h2>%s Economic Verdict: %s</h2>' % (analysis['emoji'], analysis['verdict']))
    html.append('<p>%s</p>' % analysis['detail'])
    html.append('<div class="stats-row">')
    html.append('<div class="stat"><span class="num">%d</span><span class="label">Total Spark</span></div>' % analysis['final_spark'])
    html.append('<div class="stat"><span class="num">%.1f%%</span><span class="label">Growth Rate</span></div>' % analysis['growth_rate'])
    html.append('<div class="stat"><span class="num">%.2f</span><span class="label">Gini Index</span></div>' % analysis['final_gini'])
    html.append('<div class="stat"><span class="num">%.0f%%</span><span class="label">Top 10 Share</span></div>' % analysis['top10_share'])
    html.append('</div>')
    html.append('</section>')

    # Population Growth Chart
    html.append('<section>')
    html.append('<h2>Population Growth</h2>')
    pop_data = [s['population'] for s in snapshots]
    html.append(_svg_line_chart(ticks, pop_data, color='#4ecdc4', label='Citizens', width=900, height=250))
    html.append('</section>')

    # Economy Chart (dual axis: spark + transactions)
    html.append('<section>')
    html.append('<h2>Economic Cycles</h2>')
    spark_data = [s['total_spark'] for s in snapshots]
    txn_data = [s['txn_volume'] for s in snapshots]
    html.append(_svg_dual_chart(ticks, spark_data, txn_data, 'Total Spark', 'Txn Volume',
                                '#daa520', '#ff6b6b', width=900, height=250))
    html.append('</section>')

    # Zone Coverage (stacked area)
    html.append('<section>')
    html.append('<h2>Territorial Expansion</h2>')
    zone_series = {z: [s['zone_populations'].get(z, 0) for s in snapshots] for z in ZONES}
    html.append(_svg_stacked_area(ticks, zone_series, width=900, height=280))
    html.append('</section>')

    # Cultural Output
    html.append('<section>')
    html.append('<h2>Cultural Output</h2>')
    creation_data = [s['creations'] for s in snapshots]
    struct_data = [s['structures'] for s in snapshots]
    garden_data = [s['gardens'] for s in snapshots]
    html.append(_svg_multi_line(ticks,
                                [creation_data, struct_data, garden_data],
                                ['Creations', 'Structures', 'Gardens'],
                                ['#e040fb', '#ff9800', '#4caf50'],
                                width=900, height=250))
    html.append('</section>')

    # Inequality Tracker
    html.append('<section>')
    html.append('<h2>Inequality Tracker (Gini Coefficient)</h2>')
    gini_data = [s['gini'] for s in snapshots]
    html.append(_svg_line_chart(ticks, gini_data, color='#ff4444', label='Gini', width=900, height=200, y_max=1.0))
    html.append('<p class="chart-note">0.0 = perfect equality &middot; 1.0 = one agent owns everything</p>')
    html.append('</section>')

    # Notable Events Timeline
    html.append('<section>')
    html.append('<h2>Notable Events</h2>')
    html.append('<div class="timeline">')
    for tick, etype, desc in notable[:50]:
        day = tick * TICK_SECONDS / 86400
        icon = {'join': '🧑', 'build': '🏗️', 'creation': '🎨', 'discovery': '🔭',
                'harvest': '🌾', 'trade': '💰', 'plant': '🌱', 'craft': '⚒️',
                'weather': '🌤️', 'milestone': '⭐'}.get(etype, '📌')
        html.append('<div class="event"><span class="event-time">Day %.1f</span>'
                     '<span class="event-icon">%s</span>'
                     '<span class="event-desc">%s</span></div>' % (day, icon, desc))
    html.append('</div>')
    html.append('</section>')

    # Archetype Breakdown
    html.append('<section>')
    html.append('<h2>Archetype Census</h2>')
    arch_counts = Counter(c['archetype'] for c in final_state['citizens'].values())
    html.append(_svg_bar_chart(arch_counts, width=900, height=250))
    html.append('</section>')

    # Top Citizens
    html.append('<section>')
    html.append('<h2>Most Active Citizens</h2>')
    html.append('<table><tr><th>Rank</th><th>Name</th><th>Archetype</th><th>Actions</th><th>Spark</th></tr>')
    top_citizens = sorted(final_state['citizens'].values(), key=lambda c: c.get('actions', 0), reverse=True)[:15]
    for i, c in enumerate(top_citizens):
        spark = final_state['economy']['balances'].get(c['id'], 0)
        html.append('<tr><td>%d</td><td>%s</td><td>%s</td><td>%d</td><td>%d</td></tr>' % (
            i + 1, c.get('name', c['id']), c.get('archetype', '?'), c.get('actions', 0), spark))
    html.append('</table>')
    html.append('</section>')

    # Footer
    html.append('<footer>')
    html.append('<p>Generated by ZION Civilization Simulator &middot; %s</p>' % datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC'))
    html.append('</footer>')
    html.append('</div>')
    html.append('</body></html>')

    return '\n'.join(html)


def _select_notable_events(events):
    """Select the most interesting events for the timeline."""
    notable = []
    seen_types = defaultdict(int)

    # Add milestones
    milestones = {}
    pop_count = 0
    for tick, etype, desc in events:
        if etype == 'join':
            pop_count += 1
            if pop_count in (10, 25, 50, 75, 100):
                notable.append((tick, 'milestone', 'Population reached %d citizens!' % pop_count))

    # First of each type
    first_seen = {}
    for tick, etype, desc in events:
        if etype not in first_seen:
            first_seen[etype] = (tick, etype, desc)
    for key in ['build', 'creation', 'discovery', 'trade', 'harvest', 'plant', 'craft']:
        if key in first_seen:
            notable.append(first_seen[key])

    # Sample interesting events
    for tick, etype, desc in events:
        if etype in ('discovery', 'creation', 'build') and seen_types[etype] < 8:
            notable.append((tick, etype, desc))
            seen_types[etype] += 1
        elif etype == 'trade' and seen_types[etype] < 4:
            notable.append((tick, etype, desc))
            seen_types[etype] += 1
        elif etype == 'harvest' and seen_types[etype] < 3:
            notable.append((tick, etype, desc))
            seen_types[etype] += 1

    # Deduplicate and sort
    seen = set()
    unique = []
    for item in sorted(notable, key=lambda x: x[0]):
        key = (item[0], item[2])
        if key not in seen:
            seen.add(key)
            unique.append(item)

    return unique


# ─── SVG Chart Generators ─────────────────────────────────────

def _svg_line_chart(x_data, y_data, color='#4ecdc4', label='', width=900, height=250, y_max=None):
    """Generate an SVG line chart."""
    if not x_data or not y_data:
        return '<p>No data</p>'

    pad_l, pad_r, pad_t, pad_b = 60, 20, 20, 40
    cw = width - pad_l - pad_r
    ch = height - pad_t - pad_b

    x_min, x_max = min(x_data), max(x_data)
    if y_max is None:
        y_max = max(y_data) * 1.1 if max(y_data) > 0 else 1
    y_min = 0

    def tx(x):
        return pad_l + (x - x_min) / max(x_max - x_min, 1) * cw

    def ty(y):
        return pad_t + ch - (y - y_min) / max(y_max - y_min, 1) * ch

    svg = ['<svg width="%d" height="%d" class="chart">' % (width, height)]

    # Grid lines
    for i in range(5):
        y_val = y_min + (y_max - y_min) * i / 4
        y_pos = ty(y_val)
        svg.append('<line x1="%d" y1="%.1f" x2="%d" y2="%.1f" stroke="#333" stroke-dasharray="4"/>' % (pad_l, y_pos, width - pad_r, y_pos))
        svg.append('<text x="%d" y="%.1f" class="axis-label" text-anchor="end">%s</text>' % (pad_l - 5, y_pos + 4, _fmt_num(y_val)))

    # Line path
    points = ' '.join('%.1f,%.1f' % (tx(x), ty(y)) for x, y in zip(x_data, y_data))
    # Area fill
    area_points = '%.1f,%.1f ' % (tx(x_data[0]), ty(0)) + points + ' %.1f,%.1f' % (tx(x_data[-1]), ty(0))
    svg.append('<polygon points="%s" fill="%s" fill-opacity="0.15"/>' % (area_points, color))
    svg.append('<polyline points="%s" fill="none" stroke="%s" stroke-width="2"/>' % (points, color))

    # Label
    if label:
        svg.append('<text x="%d" y="%d" class="chart-label" fill="%s">%s</text>' % (pad_l + 10, pad_t + 15, color, label))

    # X axis labels
    for i in range(0, len(x_data), max(len(x_data) // 6, 1)):
        svg.append('<text x="%.1f" y="%d" class="axis-label" text-anchor="middle">%d</text>' % (tx(x_data[i]), height - 5, x_data[i]))

    svg.append('</svg>')
    return '\n'.join(svg)


def _svg_dual_chart(x_data, y1_data, y2_data, label1, label2, color1, color2, width=900, height=250):
    """Generate an SVG chart with two y-axes."""
    if not x_data:
        return '<p>No data</p>'

    pad_l, pad_r, pad_t, pad_b = 60, 60, 20, 40
    cw = width - pad_l - pad_r
    ch = height - pad_t - pad_b

    x_min, x_max = min(x_data), max(x_data)
    y1_max = max(y1_data) * 1.1 if max(y1_data) > 0 else 1
    y2_max = max(y2_data) * 1.1 if max(y2_data) > 0 else 1

    def tx(x):
        return pad_l + (x - x_min) / max(x_max - x_min, 1) * cw

    def ty1(y):
        return pad_t + ch - y / y1_max * ch

    def ty2(y):
        return pad_t + ch - y / y2_max * ch

    svg = ['<svg width="%d" height="%d" class="chart">' % (width, height)]

    # Lines
    pts1 = ' '.join('%.1f,%.1f' % (tx(x), ty1(y)) for x, y in zip(x_data, y1_data))
    pts2 = ' '.join('%.1f,%.1f' % (tx(x), ty2(y)) for x, y in zip(x_data, y2_data))

    area1 = '%.1f,%.1f ' % (tx(x_data[0]), ty1(0)) + pts1 + ' %.1f,%.1f' % (tx(x_data[-1]), ty1(0))
    svg.append('<polygon points="%s" fill="%s" fill-opacity="0.1"/>' % (area1, color1))
    svg.append('<polyline points="%s" fill="none" stroke="%s" stroke-width="2"/>' % (pts1, color1))

    area2 = '%.1f,%.1f ' % (tx(x_data[0]), ty2(0)) + pts2 + ' %.1f,%.1f' % (tx(x_data[-1]), ty2(0))
    svg.append('<polygon points="%s" fill="%s" fill-opacity="0.1"/>' % (area2, color2))
    svg.append('<polyline points="%s" fill="none" stroke="%s" stroke-width="2" stroke-dasharray="6"/>' % (pts2, color2))

    # Labels
    svg.append('<text x="%d" y="%d" class="chart-label" fill="%s">%s</text>' % (pad_l + 10, pad_t + 15, color1, label1))
    svg.append('<text x="%d" y="%d" class="chart-label" fill="%s">%s</text>' % (pad_l + 10, pad_t + 32, color2, label2))

    # Y-axis labels
    for i in range(5):
        y_pos = pad_t + ch * (1 - i / 4)
        svg.append('<text x="%d" y="%.1f" class="axis-label" text-anchor="end">%s</text>' % (pad_l - 5, y_pos + 4, _fmt_num(y1_max * i / 4)))
        svg.append('<text x="%d" y="%.1f" class="axis-label" text-anchor="start" fill="%s">%s</text>' % (width - pad_r + 5, y_pos + 4, color2, _fmt_num(y2_max * i / 4)))

    svg.append('</svg>')
    return '\n'.join(svg)


def _svg_stacked_area(x_data, series_dict, width=900, height=280):
    """Generate a stacked area chart for zone populations."""
    if not x_data:
        return '<p>No data</p>'

    zone_colors = {
        'nexus': '#daa520', 'gardens': '#4caf50', 'athenaeum': '#2196f3',
        'studio': '#e040fb', 'wilds': '#ff5722', 'agora': '#ff9800',
        'commons': '#00bcd4', 'arena': '#f44336',
    }

    pad_l, pad_r, pad_t, pad_b = 60, 120, 20, 40
    cw = width - pad_l - pad_r
    ch = height - pad_t - pad_b

    x_min, x_max = min(x_data), max(x_data)
    # Calculate stacked totals
    zones = list(series_dict.keys())
    cumulative = [[0] * len(x_data)]
    for z in zones:
        prev = cumulative[-1]
        cumulative.append([prev[i] + series_dict[z][i] for i in range(len(x_data))])
    y_max = max(cumulative[-1]) * 1.1 if max(cumulative[-1]) > 0 else 1

    def tx(i):
        x = x_data[i]
        return pad_l + (x - x_min) / max(x_max - x_min, 1) * cw

    def ty(y):
        return pad_t + ch - y / y_max * ch

    svg = ['<svg width="%d" height="%d" class="chart">' % (width, height)]

    # Draw areas bottom to top
    for j, z in enumerate(zones):
        bottom = cumulative[j]
        top = cumulative[j + 1]
        points = []
        for i in range(len(x_data)):
            points.append('%.1f,%.1f' % (tx(i), ty(top[i])))
        for i in range(len(x_data) - 1, -1, -1):
            points.append('%.1f,%.1f' % (tx(i), ty(bottom[i])))
        color = zone_colors.get(z, '#888')
        svg.append('<polygon points="%s" fill="%s" fill-opacity="0.7" stroke="%s" stroke-width="0.5"/>' % (' '.join(points), color, color))

    # Legend
    for j, z in enumerate(zones):
        lx = width - pad_r + 10
        ly = pad_t + 15 + j * 18
        color = zone_colors.get(z, '#888')
        svg.append('<rect x="%d" y="%d" width="12" height="12" fill="%s" rx="2"/>' % (lx, ly - 10, color))
        svg.append('<text x="%d" y="%d" class="legend-label">%s</text>' % (lx + 16, ly, z))

    svg.append('</svg>')
    return '\n'.join(svg)


def _svg_multi_line(x_data, series_list, labels, colors, width=900, height=250):
    """Generate a multi-line chart."""
    if not x_data:
        return '<p>No data</p>'

    pad_l, pad_r, pad_t, pad_b = 60, 20, 20, 40
    cw = width - pad_l - pad_r
    ch = height - pad_t - pad_b

    x_min, x_max = min(x_data), max(x_data)
    all_vals = [v for series in series_list for v in series]
    y_max = max(all_vals) * 1.1 if all_vals and max(all_vals) > 0 else 1

    def tx(x):
        return pad_l + (x - x_min) / max(x_max - x_min, 1) * cw

    def ty(y):
        return pad_t + ch - y / y_max * ch

    svg = ['<svg width="%d" height="%d" class="chart">' % (width, height)]

    for i, (series, label, color) in enumerate(zip(series_list, labels, colors)):
        pts = ' '.join('%.1f,%.1f' % (tx(x), ty(y)) for x, y in zip(x_data, series))
        svg.append('<polyline points="%s" fill="none" stroke="%s" stroke-width="2"/>' % (pts, color))
        svg.append('<text x="%d" y="%d" class="chart-label" fill="%s">%s</text>' % (pad_l + 10, pad_t + 15 + i * 17, color, label))

    # Y-axis
    for i in range(5):
        y_pos = pad_t + ch * (1 - i / 4)
        svg.append('<text x="%d" y="%.1f" class="axis-label" text-anchor="end">%s</text>' % (pad_l - 5, y_pos + 4, _fmt_num(y_max * i / 4)))

    svg.append('</svg>')
    return '\n'.join(svg)


def _svg_bar_chart(counter_data, width=900, height=250):
    """Generate a horizontal bar chart from a Counter."""
    if not counter_data:
        return '<p>No data</p>'

    pad_l, pad_r, pad_t, pad_b = 120, 40, 10, 10
    cw = width - pad_l - pad_r
    items = counter_data.most_common()
    n = len(items)
    bar_h = min(25, (height - pad_t - pad_b) // n - 4)
    max_val = max(v for _, v in items) if items else 1

    colors = ['#4ecdc4', '#daa520', '#e040fb', '#ff6b6b', '#4caf50',
              '#2196f3', '#ff9800', '#00bcd4', '#f44336', '#9c27b0']

    svg = ['<svg width="%d" height="%d" class="chart">' % (width, n * (bar_h + 4) + pad_t + pad_b)]
    for i, (label, value) in enumerate(items):
        y = pad_t + i * (bar_h + 4)
        bar_w = value / max_val * cw
        color = colors[i % len(colors)]
        svg.append('<text x="%d" y="%d" class="axis-label" text-anchor="end">%s</text>' % (pad_l - 8, y + bar_h // 2 + 4, label))
        svg.append('<rect x="%d" y="%d" width="%.1f" height="%d" fill="%s" rx="3"/>' % (pad_l, y, bar_w, bar_h, color))
        svg.append('<text x="%.1f" y="%d" class="bar-value">%d</text>' % (pad_l + bar_w + 6, y + bar_h // 2 + 4, value))
    svg.append('</svg>')
    return '\n'.join(svg)


def _fmt_num(n):
    """Format a number for axis labels."""
    if n >= 10000:
        return '%.0fk' % (n / 1000)
    elif n >= 1000:
        return '%.1fk' % (n / 1000)
    elif isinstance(n, float):
        return '%.1f' % n if n != int(n) else '%d' % int(n)
    return '%d' % int(n)


def _html_head():
    return '''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>The History of ZION</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #0a0e1a; color: #e0e0e0; font-family: 'Segoe UI', system-ui, sans-serif; line-height: 1.6; }
.container { max-width: 960px; margin: 0 auto; padding: 30px 20px; }
header { text-align: center; margin-bottom: 40px; padding: 40px 0; border-bottom: 1px solid #1a1f30; }
h1 { font-size: 2.8em; color: #daa520; letter-spacing: 2px; margin-bottom: 8px; }
h2 { font-size: 1.5em; color: #daa520; margin-bottom: 16px; border-bottom: 1px solid #1a1f30; padding-bottom: 8px; }
.subtitle { font-size: 1.2em; color: #888; }
.meta { font-size: 0.9em; color: #666; margin-top: 8px; }
section { margin-bottom: 40px; }
.chart { display: block; margin: 0 auto; background: #0f1320; border-radius: 8px; width: 100%; }
.axis-label { font-size: 11px; fill: #666; font-family: monospace; }
.chart-label { font-size: 13px; font-weight: bold; font-family: sans-serif; }
.legend-label { font-size: 11px; fill: #ccc; font-family: sans-serif; }
.bar-value { font-size: 12px; fill: #aaa; font-family: monospace; }
.chart-note { text-align: center; color: #666; font-size: 0.85em; margin-top: 8px; }
.verdict { padding: 24px; border-radius: 12px; margin-bottom: 30px; }
.verdict.stable { background: linear-gradient(135deg, #1a2a1a, #0f1320); border: 1px solid #2a4a2a; }
.verdict.inflationary { background: linear-gradient(135deg, #2a2a1a, #0f1320); border: 1px solid #4a4a2a; }
.verdict.deflationary { background: linear-gradient(135deg, #2a1a1a, #0f1320); border: 1px solid #4a2a2a; }
.verdict.oligarchic { background: linear-gradient(135deg, #2a1a2a, #0f1320); border: 1px solid #4a2a4a; }
.verdict.stagnant { background: linear-gradient(135deg, #1a1a1a, #0f1320); border: 1px solid #333; }
.verdict.redistributing { background: linear-gradient(135deg, #1a2a2a, #0f1320); border: 1px solid #2a4a4a; }
.verdict h2 { border: none; padding: 0; margin-bottom: 12px; }
.verdict p { color: #bbb; font-size: 1.05em; }
.stats-row { display: flex; gap: 20px; margin-top: 20px; flex-wrap: wrap; }
.stat { flex: 1; min-width: 120px; text-align: center; background: rgba(255,255,255,0.03); padding: 16px; border-radius: 8px; }
.stat .num { display: block; font-size: 1.8em; color: #daa520; font-weight: bold; }
.stat .label { font-size: 0.8em; color: #888; text-transform: uppercase; letter-spacing: 1px; }
.timeline { position: relative; padding-left: 30px; }
.timeline::before { content: ''; position: absolute; left: 10px; top: 0; bottom: 0; width: 2px; background: #1a1f30; }
.event { position: relative; margin-bottom: 12px; padding: 8px 12px; background: #0f1320; border-radius: 6px; display: flex; align-items: center; gap: 10px; }
.event::before { content: ''; position: absolute; left: -24px; width: 10px; height: 10px; background: #daa520; border-radius: 50%; }
.event-time { font-size: 0.8em; color: #666; font-family: monospace; min-width: 60px; }
.event-icon { font-size: 1.2em; }
.event-desc { color: #ccc; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #1a1f30; }
th { color: #daa520; font-size: 0.85em; text-transform: uppercase; letter-spacing: 1px; }
td { font-family: monospace; color: #bbb; }
tr:hover td { background: rgba(218, 165, 32, 0.05); }
footer { text-align: center; padding: 30px 0; color: #444; font-size: 0.85em; border-top: 1px solid #1a1f30; margin-top: 40px; }
@media (max-width: 700px) { h1 { font-size: 1.8em; } .stats-row { flex-direction: column; } }
</style>
</head>'''


# ─── CLI Entry Point ──────────────────────────────────────────

def main():
    num_ticks = 1000
    output_file = None
    seed = 42

    i = 1
    while i < len(sys.argv):
        if sys.argv[i] == '--ticks' and i + 1 < len(sys.argv):
            num_ticks = int(sys.argv[i + 1])
            i += 2
        elif sys.argv[i] == '--output' and i + 1 < len(sys.argv):
            output_file = sys.argv[i + 1]
            i += 2
        elif sys.argv[i] == '--seed' and i + 1 < len(sys.argv):
            seed = int(sys.argv[i + 1])
            i += 2
        else:
            i += 1

    # Load agents
    agents_file = os.path.join(script_dir, '..', 'state', 'founding', 'agents.json')
    with open(agents_file, 'r') as f:
        agents_data = json.load(f)
    agents = agents_data.get('agents', [])

    if not agents:
        print('Error: No agents found in %s' % agents_file, file=sys.stderr)
        sys.exit(1)

    # Run simulation
    snapshots, events, final_state = run_simulation(agents, num_ticks, seed)

    # Analyze economy
    analysis = analyze_economy(snapshots, final_state)

    print()
    print('Economic Verdict: %s %s' % (analysis['emoji'], analysis['verdict']))
    print('  %s' % analysis['detail'])

    # Generate report
    html = generate_report(snapshots, events, final_state, analysis, agents)

    if output_file is None:
        output_file = os.path.join(script_dir, '..', 'docs', 'history.html')

    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html)

    print()
    print('Report generated: %s (%.1f KB)' % (output_file, len(html) / 1024))

    # Also output raw data as JSON
    data_file = output_file.replace('.html', '.json')
    raw_data = {
        'snapshots': snapshots,
        'analysis': analysis,
        'notable_events': [(t, e, d) for t, e, d in events[:200]],
        'final_population': len(final_state['citizens']),
        'final_structures': len(final_state['structures']),
        'final_creations': len(final_state['creations']),
        'final_discoveries': len(final_state['discoveries']),
    }
    with open(data_file, 'w', encoding='utf-8') as f:
        json.dump(raw_data, f, indent=2)
    print('Raw data: %s' % data_file)

    return 0


if __name__ == '__main__':
    sys.exit(main())
