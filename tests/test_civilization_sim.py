#!/usr/bin/env python3
"""Tests for ZION Civilization Simulator."""
import json
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))
from civilization_sim import (
    create_initial_state, sim_tick, collect_snapshot, run_simulation,
    analyze_economy, generate_report, _gini_coefficient, _pick_zone,
    _generate_actions, _apply_action, _select_notable_events,
    ZONES, TICK_SECONDS, AGENTS_PER_TICK,
)
import random


def make_test_agents(n=20):
    archetypes = ['gardener', 'builder', 'storyteller', 'merchant', 'explorer',
                  'teacher', 'musician', 'healer', 'philosopher', 'artist']
    agents = []
    for i in range(n):
        agents.append({
            'id': 'agent_%03d' % i,
            'name': 'Agent %d' % i,
            'archetype': archetypes[i % len(archetypes)],
            'personality': ['curious'],
            'position': {'x': 0, 'y': 0, 'z': 0, 'zone': 'nexus'},
            'intentions': ['say', 'build', 'plant', 'harvest', 'compose',
                           'craft', 'discover', 'emote', 'trade_offer'],
            'inventory': [],
            'spark': 100,
        })
    return agents


# ─── Core Simulation ──────────────────────────────────────────

class TestInitialState(unittest.TestCase):
    def test_creates_valid_state(self):
        agents = make_test_agents(10)
        state = create_initial_state(agents)
        self.assertEqual(len(state['agents']), 10)
        self.assertEqual(state['worldTime'], 0)
        self.assertIsInstance(state['citizens'], dict)
        self.assertIsInstance(state['structures'], dict)
        self.assertIsInstance(state['creations'], list)
        self.assertIsInstance(state['economy'], dict)


class TestSimTick(unittest.TestCase):
    def test_tick_advances_time(self):
        agents = make_test_agents(10)
        state = create_initial_state(agents)
        rng = random.Random(42)
        state, events = sim_tick(state, 0, rng)
        self.assertEqual(state['worldTime'], TICK_SECONDS)

    def test_tick_adds_citizens(self):
        agents = make_test_agents(20)
        state = create_initial_state(agents)
        rng = random.Random(42)
        state, events = sim_tick(state, 0, rng)
        self.assertGreater(len(state['citizens']), 0)

    def test_tick_generates_events(self):
        agents = make_test_agents(50)
        state = create_initial_state(agents)
        rng = random.Random(42)
        all_events = []
        for i in range(10):
            state, events = sim_tick(state, i, rng)
            all_events.extend(events)
        self.assertGreater(len(all_events), 0)

    def test_tick_updates_zone_populations(self):
        agents = make_test_agents(20)
        state = create_initial_state(agents)
        rng = random.Random(42)
        state, _ = sim_tick(state, 0, rng)
        total_pop = sum(state['zone_populations'].values())
        self.assertGreater(total_pop, 0)


class TestPickZone(unittest.TestCase):
    def test_gardeners_prefer_gardens(self):
        agent = {'archetype': 'gardener', 'position': {'zone': 'nexus'}}
        rng = random.Random(42)
        zones_picked = [_pick_zone(agent, {}, rng) for _ in range(100)]
        self.assertIn('gardens', zones_picked)

    def test_all_zones_reachable(self):
        agent = {'archetype': 'explorer', 'position': {'zone': 'nexus'}}
        rng = random.Random(42)
        zones_picked = set(_pick_zone(agent, {}, rng) for _ in range(500))
        self.assertEqual(zones_picked, set(ZONES))


class TestApplyAction(unittest.TestCase):
    def setUp(self):
        self.agents = make_test_agents(10)
        self.state = create_initial_state(self.agents)
        self.rng = random.Random(42)

    def test_build_adds_structure(self):
        action = {'type': 'build', 'agent': self.agents[0], 'zone': 'nexus'}
        _apply_action(action, self.state, 1, self.rng)
        self.assertGreater(len(self.state['structures']), 0)

    def test_compose_adds_creation(self):
        action = {'type': 'compose', 'agent': self.agents[0], 'zone': 'studio'}
        _apply_action(action, self.state, 1, self.rng)
        self.assertGreater(len(self.state['creations']), 0)

    def test_say_adds_to_chat(self):
        action = {'type': 'say', 'agent': self.agents[0], 'zone': 'nexus'}
        _apply_action(action, self.state, 1, self.rng)
        self.assertGreater(len(self.state['chat']), 0)

    def test_discover_adds_discovery(self):
        action = {'type': 'discover', 'agent': self.agents[0], 'zone': 'wilds'}
        _apply_action(action, self.state, 1, self.rng)
        self.assertGreater(len(self.state['discoveries']), 0)

    def test_plant_adds_to_gardens(self):
        action = {'type': 'plant', 'agent': self.agents[0], 'zone': 'gardens'}
        _apply_action(action, self.state, 1, self.rng)
        self.assertGreater(len(self.state['gardens']), 0)

    def test_harvest_needs_mature_plant(self):
        action = {'type': 'harvest', 'agent': self.agents[0], 'zone': 'gardens'}
        result = _apply_action(action, self.state, 1, self.rng)
        self.assertIsNone(result)  # No mature plants yet


# ─── Metrics & Analysis ───────────────────────────────────────

class TestGiniCoefficient(unittest.TestCase):
    def test_perfect_equality(self):
        self.assertAlmostEqual(_gini_coefficient([100, 100, 100, 100]), 0, places=1)

    def test_perfect_inequality(self):
        gini = _gini_coefficient([0, 0, 0, 1000])
        self.assertGreater(gini, 0.5)

    def test_empty_returns_zero(self):
        self.assertEqual(_gini_coefficient([]), 0)

    def test_single_value(self):
        self.assertEqual(_gini_coefficient([42]), 0)


class TestCollectSnapshot(unittest.TestCase):
    def test_snapshot_has_required_fields(self):
        agents = make_test_agents(10)
        state = create_initial_state(agents)
        rng = random.Random(42)
        state, _ = sim_tick(state, 0, rng)
        snap = collect_snapshot(state, 0, [])
        required = ['tick', 'population', 'structures', 'creations', 'gardens',
                     'discoveries', 'total_spark', 'txn_volume', 'active_zones',
                     'gini', 'weather', 'season', 'dayPhase']
        for field in required:
            self.assertIn(field, snap, 'Snapshot missing field: %s' % field)


class TestEconomicAnalysis(unittest.TestCase):
    def test_analysis_has_verdict(self):
        snapshots = [
            {'total_spark': 1000, 'gini': 0.3, 'txn_volume': 5, 'tick': i * 10}
            for i in range(20)
        ]
        state = create_initial_state(make_test_agents(10))
        state['economy']['balances'] = {'a%d' % i: 100 for i in range(10)}
        analysis = analyze_economy(snapshots, state)
        self.assertIn('verdict', analysis)
        self.assertIn(analysis['verdict'], ['STABLE', 'INFLATIONARY', 'DEFLATIONARY', 'OLIGARCHIC', 'STAGNANT'])

    def test_inflationary_detected(self):
        snapshots = [{'total_spark': 100 + i * 100, 'gini': 0.2, 'txn_volume': 5, 'tick': i * 10}
                     for i in range(40)]
        state = create_initial_state(make_test_agents(10))
        state['economy']['balances'] = {'a%d' % i: 100 for i in range(10)}
        analysis = analyze_economy(snapshots, state)
        self.assertEqual(analysis['verdict'], 'INFLATIONARY')


# ─── Report Generation ────────────────────────────────────────

class TestReportGeneration(unittest.TestCase):
    def test_generates_valid_html(self):
        agents = make_test_agents(10)
        state = create_initial_state(agents)
        rng = random.Random(42)
        for i in range(50):
            state, _ = sim_tick(state, i, rng)
        snapshots = [collect_snapshot(state, i, []) for i in range(0, 50, 10)]
        events = [(5, 'build', 'Agent 1 built a bench')]
        analysis = analyze_economy(snapshots, state)
        html = generate_report(snapshots, events, state, analysis, agents)
        self.assertIn('<!DOCTYPE html>', html)
        self.assertIn('History of ZION', html)
        self.assertIn('<svg', html)
        self.assertIn('</html>', html)

    def test_report_contains_all_sections(self):
        agents = make_test_agents(10)
        state = create_initial_state(agents)
        rng = random.Random(42)
        for i in range(20):
            state, _ = sim_tick(state, i, rng)
        snapshots = [collect_snapshot(state, i, []) for i in range(0, 20, 5)]
        analysis = analyze_economy(snapshots, state)
        html = generate_report(snapshots, [], state, analysis, agents)
        self.assertIn('Population Growth', html)
        self.assertIn('Economic Cycles', html)
        self.assertIn('Territorial Expansion', html)
        self.assertIn('Cultural Output', html)
        self.assertIn('Economic Verdict', html)
        self.assertIn('Archetype Census', html)


# ─── Full Integration ─────────────────────────────────────────

class TestFullSimulation(unittest.TestCase):
    def test_50_tick_simulation_runs(self):
        agents = make_test_agents(20)
        snapshots, events, state = run_simulation(agents, num_ticks=50, seed=123)
        self.assertGreater(len(snapshots), 0)
        self.assertGreater(len(state['citizens']), 0)
        self.assertGreater(len(events), 0)

    def test_deterministic_with_seed(self):
        agents = make_test_agents(10)
        s1, e1, st1 = run_simulation(agents, num_ticks=30, seed=99)
        s2, e2, st2 = run_simulation(agents, num_ticks=30, seed=99)
        self.assertEqual(len(st1['citizens']), len(st2['citizens']))
        self.assertEqual(s1[-1]['total_spark'], s2[-1]['total_spark'])

    def test_notable_events_selected(self):
        events = [
            (1, 'join', 'Agent 1 joined'),
            (2, 'build', 'Agent 1 built a bench'),
            (3, 'discovery', 'Agent 2 discovered Crystal Cave'),
            (4, 'creation', 'Agent 3 composed a song'),
            (5, 'trade', 'Agent 4 listed a tool'),
        ]
        notable = _select_notable_events(events)
        self.assertGreater(len(notable), 0)


if __name__ == '__main__':
    unittest.main()
