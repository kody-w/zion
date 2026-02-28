#!/usr/bin/env python3
"""Tests for the NPC daily routine system in agent_autonomy.py."""
import unittest
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))

from agent_autonomy import (
    get_day_phase, get_routine, _name_hash, generate_agent_intentions,
    ARCHETYPE_ROUTINES, DAY_PHASES
)


class TestDayPhases(unittest.TestCase):

    def test_dawn(self):
        self.assertEqual(get_day_phase(0), 'dawn')
        self.assertEqual(get_day_phase(100), 'dawn')
        self.assertEqual(get_day_phase(359), 'dawn')

    def test_day(self):
        self.assertEqual(get_day_phase(360), 'day')
        self.assertEqual(get_day_phase(500), 'day')

    def test_afternoon(self):
        self.assertEqual(get_day_phase(720), 'afternoon')
        self.assertEqual(get_day_phase(1000), 'afternoon')

    def test_dusk(self):
        self.assertEqual(get_day_phase(1080), 'dusk')
        self.assertEqual(get_day_phase(1200), 'dusk')

    def test_night(self):
        self.assertEqual(get_day_phase(1260), 'night')
        self.assertEqual(get_day_phase(1400), 'night')

    def test_wraps_around(self):
        self.assertEqual(get_day_phase(1440), 'dawn')
        self.assertEqual(get_day_phase(2880), 'dawn')

    def test_all_phases_covered(self):
        """Every worldTime value 0-1439 maps to a phase."""
        for t in range(1440):
            phase = get_day_phase(t)
            self.assertIn(phase, ['dawn', 'day', 'afternoon', 'dusk', 'night'],
                          f'worldTime {t} has invalid phase: {phase}')


class TestNameHash(unittest.TestCase):

    def test_deterministic(self):
        self.assertEqual(_name_hash('Iris Skyhigh'), _name_hash('Iris Skyhigh'))

    def test_different_names_different_hash(self):
        self.assertNotEqual(_name_hash('Iris Skyhigh'), _name_hash('Storm Windwalker'))

    def test_returns_int(self):
        self.assertIsInstance(_name_hash('test'), int)


class TestArchetypeRoutines(unittest.TestCase):

    ARCHETYPES = ['gardener', 'builder', 'merchant', 'explorer', 'teacher',
                  'healer', 'artist', 'musician', 'philosopher', 'storyteller']

    def test_all_archetypes_have_routines(self):
        for arch in self.ARCHETYPES:
            self.assertIn(arch, ARCHETYPE_ROUTINES, f'Missing routine for {arch}')

    def test_all_phases_defined_per_archetype(self):
        phases = ['dawn', 'day', 'afternoon', 'dusk', 'night']
        for arch, routine in ARCHETYPE_ROUTINES.items():
            for phase in phases:
                self.assertIn(phase, routine, f'{arch} missing phase: {phase}')

    def test_routine_returns_tuple(self):
        for arch in self.ARCHETYPES:
            for phase in ['dawn', 'day', 'afternoon', 'dusk', 'night']:
                actions, zone = ARCHETYPE_ROUTINES[arch][phase]
                self.assertIsInstance(actions, list, f'{arch}/{phase} actions not list')
                self.assertIsInstance(zone, str, f'{arch}/{phase} zone not str')
                self.assertGreater(len(actions), 0, f'{arch}/{phase} has no actions')


class TestGetRoutine(unittest.TestCase):

    def _agent(self, name='Test Agent', archetype='gardener', zone='nexus'):
        return {'id': 'agent_test', 'name': name, 'archetype': archetype,
                'position': {'zone': zone, 'x': 0, 'y': 0, 'z': 0}}

    def test_gardener_dawn(self):
        actions, zone = get_routine(self._agent(archetype='gardener'), 100)
        self.assertEqual(zone, 'gardens')
        self.assertIn('plant', actions)

    def test_builder_afternoon(self):
        actions, zone = get_routine(self._agent(archetype='builder'), 800)
        self.assertEqual(zone, 'commons')
        self.assertIn('build', actions)

    def test_merchant_day(self):
        actions, zone = get_routine(self._agent(archetype='merchant'), 500)
        self.assertEqual(zone, 'agora')
        self.assertIn('trade_offer', actions)

    def test_explorer_dawn(self):
        actions, zone = get_routine(self._agent(archetype='explorer'), 100)
        self.assertEqual(zone, 'wilds')

    def test_deterministic(self):
        agent = self._agent(name='Stable Name')
        r1 = get_routine(agent, 500)
        r2 = get_routine(agent, 500)
        self.assertEqual(r1, r2)

    def test_wanderer_variation(self):
        """~20% of agents get a different zone due to name hash."""
        zones_seen = set()
        for i in range(50):
            agent = self._agent(name=f'Agent_{i}', archetype='gardener')
            _, zone = get_routine(agent, 500)
            zones_seen.add(zone)
        self.assertGreater(len(zones_seen), 1, 'Expected zone variation from wanderers')


class TestGenerateWithRoutines(unittest.TestCase):

    def _agent(self):
        return {
            'id': 'agent_001', 'name': 'Iris Skyhigh', 'archetype': 'gardener',
            'position': {'zone': 'nexus', 'x': 0, 'y': 0, 'z': 0},
            'intentions': ['plant', 'harvest'], 'inventory': [], 'spark': 100
        }

    def test_with_world_time(self):
        msgs = generate_agent_intentions(self._agent(), count=2, world_time=100)
        self.assertGreater(len(msgs), 0)
        for msg in msgs:
            self.assertEqual(msg['v'], 1)
            self.assertEqual(msg['from'], 'agent_001')

    def test_without_world_time_uses_raw_intentions(self):
        msgs = generate_agent_intentions(self._agent(), count=2, world_time=None)
        types = {m['type'] for m in msgs}
        # Should use raw intentions (plant, harvest) + say + warp
        self.assertTrue(types.issubset({'plant', 'harvest', 'say', 'warp'}))

    def test_warp_injected_when_not_in_preferred_zone(self):
        agent = self._agent()
        agent['position']['zone'] = 'arena'
        msgs = generate_agent_intentions(agent, count=1, world_time=100)
        warp_msgs = [m for m in msgs if m['type'] == 'warp']
        self.assertGreater(len(warp_msgs), 0, 'Should warp to preferred zone')
        self.assertEqual(warp_msgs[0]['payload']['zone'], 'gardens')

    def test_no_warp_when_already_in_zone(self):
        agent = self._agent()
        agent['position']['zone'] = 'gardens'
        msgs = generate_agent_intentions(agent, count=1, world_time=100)
        warp_msgs = [m for m in msgs if m['type'] == 'warp']
        # No forced warp (there might be a random warp from intention list)
        forced_warps = [m for m in warp_msgs if '_warp' in m['id']]
        self.assertEqual(len(forced_warps), 0)


if __name__ == '__main__':
    unittest.main()
