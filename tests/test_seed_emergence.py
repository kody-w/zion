#!/usr/bin/env python3
"""Tests for seed_emergence.py — composable fragment engine.

Validates: uniqueness across seeds, composition correctness, pool coverage,
deterministic reproducibility, and integration with pipeline scripts.
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))
from seed_emergence import (
    Emergence,
    TIME_FRAGMENTS,
    POPULATION_FRAGMENTS,
    NPC_MENTION_FRAGMENTS,
    WEATHER_FRAGMENTS,
    SEASON_FRAGMENTS,
    ARCHETYPE_FRAGMENTS,
    ACTION_POOLS,
    WEATHER_BASE_WEIGHTS,
    get_emergence,
)


class TestEmergenceSeeding(unittest.TestCase):
    """Seeds produce deterministic but unique output."""

    def test_same_seed_same_output(self):
        e1 = Emergence(seed='fixed')
        e2 = Emergence(seed='fixed')
        self.assertEqual(e1.observe_time('dawn', 'The Nexus'),
                         e2.observe_time('dawn', 'The Nexus'))

    def test_different_seeds_different_output(self):
        e1 = Emergence(seed='seed-a')
        e2 = Emergence(seed='seed-b')
        # With large fragment pools, different seeds should produce different output
        results_a = [e1.observe_time(p, 'Zone') for p in TIME_FRAGMENTS]
        results_b = [e2.observe_time(p, 'Zone') for p in TIME_FRAGMENTS]
        # At least half should differ
        diffs = sum(1 for a, b in zip(results_a, results_b) if a != b)
        self.assertGreater(diffs, len(results_a) // 2,
                           'Different seeds should produce mostly different phrases')

    def test_auto_seed_is_unique(self):
        """Two instances created without explicit seed should differ."""
        import time
        e1 = Emergence()
        time.sleep(0.01)
        e2 = Emergence()
        # Seeds should be different ISO timestamps
        self.assertNotEqual(e1.seed, e2.seed)

    def test_seed_property_returns_string(self):
        e = Emergence(seed=12345)
        self.assertEqual(e.seed, '12345')


class TestTimeObservations(unittest.TestCase):
    """Time-of-day observations compose correctly."""

    def test_all_day_phases_produce_output(self):
        e = Emergence(seed='test')
        for phase in ['dawn', 'morning', 'midday', 'afternoon', 'dusk', 'night', 'day']:
            result = e.observe_time(phase, 'The Gardens')
            self.assertIsInstance(result, str)
            self.assertGreater(len(result), 10, 'Phase %s produced too-short output' % phase)

    def test_zone_name_appears_in_output(self):
        e = Emergence(seed='test')
        result = e.observe_time('dawn', 'The Nexus')
        self.assertIn('The Nexus', result)

    def test_unknown_phase_falls_back_to_day(self):
        e = Emergence(seed='test')
        result = e.observe_time('nonexistent', 'Zone')
        self.assertIsInstance(result, str)
        self.assertGreater(len(result), 5)

    def test_high_uniqueness_across_seeds(self):
        """100 different seeds should produce at least 50 unique dawn phrases."""
        phrases = set()
        for i in range(100):
            e = Emergence(seed='unique-%d' % i)
            phrases.add(e.observe_time('dawn', 'The Nexus'))
        self.assertGreaterEqual(len(phrases), 50,
                                'Expected >= 50 unique dawn phrases from 100 seeds, got %d' % len(phrases))


class TestPopulationObservations(unittest.TestCase):

    def test_count_appears_in_output(self):
        e = Emergence(seed='test')
        result = e.observe_population(15)
        self.assertIn('15', result)

    def test_produces_string(self):
        e = Emergence(seed='test')
        result = e.observe_population(0)
        self.assertIsInstance(result, str)


class TestNPCMentions(unittest.TestCase):

    def test_name_and_archetype_in_output(self):
        e = Emergence(seed='test')
        result = e.observe_npc('Aria', 'gardener')
        self.assertIn('Aria', result)
        self.assertIn('gardener', result)


class TestWeatherObservations(unittest.TestCase):

    def test_all_weather_types_produce_output(self):
        e = Emergence(seed='test')
        for weather in ['cloudy', 'rain', 'storm', 'snow', 'fog']:
            result = e.observe_weather(weather)
            self.assertIsInstance(result, str)
            self.assertGreater(len(result), 5, '%s produced empty output' % weather)

    def test_clear_weather_can_be_empty(self):
        """Clear weather has an empty pattern option."""
        e = Emergence(seed='test')
        result = e.observe_weather('clear')
        self.assertIsInstance(result, str)

    def test_unknown_weather_returns_empty(self):
        e = Emergence(seed='test')
        result = e.observe_weather('tornado')
        self.assertEqual(result, '')


class TestSeasonObservations(unittest.TestCase):

    def test_all_seasons_produce_output(self):
        e = Emergence(seed='test')
        for season in ['spring', 'summer', 'autumn', 'winter']:
            result = e.observe_season(season)
            self.assertIsInstance(result, str)
            self.assertGreater(len(result), 5)


class TestArchetypeSpeech(unittest.TestCase):

    def test_all_archetypes_produce_speech(self):
        e = Emergence(seed='test')
        for arch in ARCHETYPE_FRAGMENTS:
            result = e.agent_speak(arch)
            self.assertIsInstance(result, str)
            self.assertGreater(len(result), 5, '%s produced too-short speech' % arch)

    def test_unknown_archetype_has_fallback(self):
        e = Emergence(seed='test')
        result = e.agent_speak('alien')
        self.assertIsInstance(result, str)
        self.assertGreater(len(result), 5)

    def test_consecutive_calls_differ(self):
        """Multiple calls to agent_speak should produce different phrases."""
        e = Emergence(seed='test')
        phrases = [e.agent_speak('gardener') for _ in range(10)]
        unique = set(phrases)
        self.assertGreater(len(unique), 3,
                           'Expected variety in 10 calls, got %d unique' % len(unique))

    def test_high_archetype_uniqueness(self):
        """50 seeds should produce at least 20 unique gardener phrases."""
        phrases = set()
        for i in range(50):
            e = Emergence(seed='arch-%d' % i)
            phrases.add(e.agent_speak('gardener'))
        self.assertGreaterEqual(len(phrases), 20)


class TestActionPools(unittest.TestCase):

    def test_all_pools_exist(self):
        for pool_name in ['plant_species', 'build_structures', 'craft_recipes',
                          'compose_types', 'inspect_targets', 'emote_actions',
                          'discovery_types', 'intentions']:
            self.assertIn(pool_name, ACTION_POOLS)

    def test_pools_are_larger_than_originals(self):
        """Each pool should have more entries than the hardcoded originals."""
        self.assertGreaterEqual(len(ACTION_POOLS['plant_species']), 10)
        self.assertGreaterEqual(len(ACTION_POOLS['build_structures']), 10)
        self.assertGreaterEqual(len(ACTION_POOLS['craft_recipes']), 10)
        self.assertGreaterEqual(len(ACTION_POOLS['compose_types']), 8)
        self.assertGreaterEqual(len(ACTION_POOLS['inspect_targets']), 8)
        self.assertGreaterEqual(len(ACTION_POOLS['emote_actions']), 8)
        self.assertGreaterEqual(len(ACTION_POOLS['discovery_types']), 8)
        self.assertGreaterEqual(len(ACTION_POOLS['intentions']), 8)

    def test_pick_action_returns_pool_member(self):
        e = Emergence(seed='test')
        for pool_name in ACTION_POOLS:
            result = e.pick_action(pool_name)
            self.assertIn(result, ACTION_POOLS[pool_name])

    def test_pick_unknown_pool_returns_name(self):
        e = Emergence(seed='test')
        result = e.pick_action('nonexistent_pool')
        self.assertEqual(result, 'nonexistent_pool')


class TestWeatherWeights(unittest.TestCase):

    def test_weights_sum_to_approximately_100(self):
        e = Emergence(seed='test')
        for season in ['spring', 'summer', 'autumn', 'winter']:
            weights = e.weather_weights(season)
            total = sum(weights.values())
            self.assertAlmostEqual(total, 100, delta=2,
                                   msg='%s weights sum to %d' % (season, total))

    def test_all_weather_types_present(self):
        e = Emergence(seed='test')
        weights = e.weather_weights('spring')
        for wt in ['clear', 'cloudy', 'rain', 'storm', 'snow', 'fog']:
            self.assertIn(wt, weights)

    def test_weights_vary_with_seed(self):
        w1 = Emergence(seed='a').weather_weights('spring')
        w2 = Emergence(seed='b').weather_weights('spring')
        # At least some weights should differ
        diffs = sum(1 for k in w1 if w1[k] != w2[k])
        self.assertGreater(diffs, 0, 'Different seeds should produce different weights')

    def test_no_negative_weights(self):
        for i in range(20):
            e = Emergence(seed='neg-%d' % i)
            for season in ['spring', 'summer', 'autumn', 'winter']:
                weights = e.weather_weights(season)
                for wt, val in weights.items():
                    self.assertGreaterEqual(val, 0,
                                            '%s/%s weight is negative: %d' % (season, wt, val))

    def test_winter_favors_snow(self):
        """On average, winter should have higher snow weight than spring."""
        snow_winter = []
        snow_spring = []
        for i in range(50):
            e = Emergence(seed='season-%d' % i)
            snow_winter.append(e.weather_weights('winter')['snow'])
            snow_spring.append(e.weather_weights('spring')['snow'])
        self.assertGreater(sum(snow_winter) / len(snow_winter),
                           sum(snow_spring) / len(snow_spring))


class TestFragmentPoolIntegrity(unittest.TestCase):
    """All fragment pools are well-formed."""

    def test_all_time_phases_have_patterns(self):
        for phase, fragments in TIME_FRAGMENTS.items():
            self.assertIn('patterns', fragments, '%s missing patterns' % phase)
            self.assertGreater(len(fragments['patterns']), 0)

    def test_all_archetype_fragments_have_patterns(self):
        for arch, fragments in ARCHETYPE_FRAGMENTS.items():
            self.assertIn('patterns', fragments, '%s missing patterns' % arch)
            self.assertGreater(len(fragments['patterns']), 0)

    def test_all_weather_fragments_have_patterns(self):
        for weather, fragments in WEATHER_FRAGMENTS.items():
            self.assertIn('patterns', fragments, '%s missing patterns' % weather)

    def test_all_season_fragments_have_patterns(self):
        for season, fragments in SEASON_FRAGMENTS.items():
            self.assertIn('patterns', fragments, '%s missing patterns' % season)

    def test_ten_archetypes_covered(self):
        expected = {'gardener', 'builder', 'storyteller', 'merchant', 'explorer',
                    'teacher', 'musician', 'healer', 'philosopher', 'artist'}
        self.assertEqual(set(ARCHETYPE_FRAGMENTS.keys()), expected)


class TestGetEmergenceSingleton(unittest.TestCase):

    def test_returns_instance(self):
        e = get_emergence(seed='singleton-test')
        self.assertIsInstance(e, Emergence)

    def test_same_seed_returns_cached(self):
        e1 = get_emergence(seed='cache-test')
        e2 = get_emergence(seed='cache-test')
        self.assertIs(e1, e2)


class TestIntegrationWithObserver(unittest.TestCase):
    """Verify observer still produces valid output after emergence integration."""

    def test_observer_generates_observation(self):
        try:
            from agent_observer import generate_observation
        except ImportError:
            self.skipTest('agent_observer not importable')

        zone_data = {'name': 'The Gardens'}
        npcs = [{'name': 'Aria', 'archetype': 'gardener'}]
        world = {'dayPhase': 'dawn', 'weather': 'rain', 'season': 'spring'}
        result = generate_observation('gardens', zone_data, npcs, world, '2026-02-24T01:00:00Z')
        self.assertIsInstance(result, str)
        self.assertGreater(len(result), 20)
        self.assertIn('Gardens', result)


class TestIntegrationWithAutonomy(unittest.TestCase):
    """Verify agent autonomy still produces valid output."""

    def test_agent_generates_intentions(self):
        try:
            from agent_autonomy import generate_agent_intentions
        except ImportError:
            self.skipTest('agent_autonomy not importable')

        agent = {
            'id': 'test_001',
            'name': 'Test Agent',
            'archetype': 'gardener',
            'position': {'x': 0, 'y': 0, 'z': 0, 'zone': 'gardens'},
            'intentions': ['say', 'plant'],
        }
        messages = generate_agent_intentions(agent, count=3)
        self.assertIsInstance(messages, list)
        self.assertGreater(len(messages), 0)
        for msg in messages:
            self.assertIn('type', msg)
            self.assertIn('payload', msg)


class TestIntegrationWithGameTick(unittest.TestCase):
    """Verify game tick weather generation works with emergence."""

    def test_weather_with_season(self):
        try:
            from game_tick import generate_weather
        except ImportError:
            self.skipTest('game_tick not importable')

        result = generate_weather(42, season='winter')
        self.assertIn(result, ['clear', 'cloudy', 'rain', 'storm', 'snow', 'fog'])

    def test_weather_without_season_backward_compat(self):
        try:
            from game_tick import generate_weather
        except ImportError:
            self.skipTest('game_tick not importable')

        result = generate_weather(42)
        self.assertIn(result, ['clear', 'cloudy', 'rain', 'storm', 'snow', 'fog'])


if __name__ == '__main__':
    unittest.main()
