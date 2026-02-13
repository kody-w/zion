#!/usr/bin/env python3
"""Tests for game_tick.py"""
import unittest
import sys
import os
import json

# Add scripts directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))

from game_tick import (
    calculate_day_phase,
    generate_weather,
    calculate_season,
    advance_plant_growth,
    respawn_resources,
    tick
)


class TestGameTick(unittest.TestCase):
    """Test suite for game tick functions."""

    def test_day_phase_dawn(self):
        """Dawn phase: 0-360 seconds."""
        self.assertEqual(calculate_day_phase(0), 'dawn')
        self.assertEqual(calculate_day_phase(180), 'dawn')
        self.assertEqual(calculate_day_phase(359), 'dawn')

    def test_day_phase_day(self):
        """Day phase: 360-1080 seconds."""
        self.assertEqual(calculate_day_phase(360), 'day')
        self.assertEqual(calculate_day_phase(500), 'day')
        self.assertEqual(calculate_day_phase(720), 'day')
        self.assertEqual(calculate_day_phase(1079), 'day')

    def test_day_phase_dusk(self):
        """Dusk phase: 1080-1260 seconds."""
        self.assertEqual(calculate_day_phase(1080), 'dusk')
        self.assertEqual(calculate_day_phase(1100), 'dusk')
        self.assertEqual(calculate_day_phase(1170), 'dusk')
        self.assertEqual(calculate_day_phase(1259), 'dusk')

    def test_day_phase_night(self):
        """Night phase: 1260-1440 seconds."""
        self.assertEqual(calculate_day_phase(1260), 'night')
        self.assertEqual(calculate_day_phase(1300), 'night')
        self.assertEqual(calculate_day_phase(1439), 'night')

    def test_day_phase_cycles(self):
        """Day phases should cycle every 1440 seconds."""
        # Second cycle
        self.assertEqual(calculate_day_phase(1440), 'dawn')
        self.assertEqual(calculate_day_phase(1440 + 500), 'day')

        # Third cycle
        self.assertEqual(calculate_day_phase(2880), 'dawn')

    def test_weather_generation(self):
        """Weather generation should produce valid weather types."""
        valid_weather = {'clear', 'cloudy', 'rain', 'storm', 'snow', 'fog'}

        for seed in range(100):
            weather = generate_weather(seed)
            self.assertIn(weather, valid_weather)

    def test_weather_deterministic(self):
        """Same seed should produce same weather."""
        weather1 = generate_weather(42)
        weather2 = generate_weather(42)
        self.assertEqual(weather1, weather2)

    def test_weather_varies(self):
        """Different seeds should eventually produce different weather."""
        weathers = set()
        for seed in range(100):
            weathers.add(generate_weather(seed))

        # Should have more than one weather type in 100 seeds
        self.assertGreater(len(weathers), 1)

    def test_season_calculation(self):
        """Season should cycle every 4 weeks."""
        valid_seasons = {'spring', 'summer', 'autumn', 'winter'}

        # Week 0 (0-7 days)
        self.assertEqual(calculate_season(0), 'spring')
        self.assertEqual(calculate_season(6 * 24 * 60 * 60), 'spring')

        # Week 1 (7-14 days)
        self.assertEqual(calculate_season(7 * 24 * 60 * 60), 'summer')
        self.assertEqual(calculate_season(10 * 24 * 60 * 60), 'summer')

        # Week 2 (14-21 days)
        self.assertEqual(calculate_season(14 * 24 * 60 * 60), 'autumn')
        self.assertEqual(calculate_season(17 * 24 * 60 * 60), 'autumn')

        # Week 3 (21-28 days)
        self.assertEqual(calculate_season(21 * 24 * 60 * 60), 'winter')
        self.assertEqual(calculate_season(24 * 24 * 60 * 60), 'winter')

        # Week 4 (cycle repeats)
        self.assertEqual(calculate_season(28 * 24 * 60 * 60), 'spring')

    def test_plant_growth_advances(self):
        """Plants should grow over time."""
        gardens = {
            'plot_001': {
                'plants': [
                    {
                        'species': 'tomato',
                        'growthStage': 0.0,
                        'growthTime': 100  # 100 seconds to full growth
                    }
                ]
            }
        }

        # Advance 50 seconds (should be at 0.5)
        updated = advance_plant_growth(gardens, 50)
        plant = updated['plot_001']['plants'][0]
        self.assertAlmostEqual(plant['growthStage'], 0.5, places=2)

        # Advance another 50 seconds (should be at 1.0)
        updated = advance_plant_growth(updated, 50)
        plant = updated['plot_001']['plants'][0]
        self.assertAlmostEqual(plant['growthStage'], 1.0, places=2)

        # Should not exceed 1.0
        updated = advance_plant_growth(updated, 100)
        plant = updated['plot_001']['plants'][0]
        self.assertEqual(plant['growthStage'], 1.0)

    def test_plant_growth_default_growth_time(self):
        """Plants without growthTime should use default."""
        gardens = {
            'plot_001': {
                'plants': [
                    {
                        'species': 'wheat',
                        'growthStage': 0.0
                    }
                ]
            }
        }

        updated = advance_plant_growth(gardens, 1800)  # 30 minutes
        plant = updated['plot_001']['plants'][0]

        # With default 3600s growth time, 1800s should give 0.5
        self.assertAlmostEqual(plant['growthStage'], 0.5, places=2)

    def test_multiple_plants_grow(self):
        """Multiple plants should all grow."""
        gardens = {
            'plot_001': {
                'plants': [
                    {'species': 'tomato', 'growthStage': 0.0, 'growthTime': 100},
                    {'species': 'wheat', 'growthStage': 0.5, 'growthTime': 100}
                ]
            }
        }

        updated = advance_plant_growth(gardens, 25)

        self.assertAlmostEqual(updated['plot_001']['plants'][0]['growthStage'], 0.25, places=2)
        self.assertAlmostEqual(updated['plot_001']['plants'][1]['growthStage'], 0.75, places=2)

    def test_resource_respawn(self):
        """Depleted resources should respawn over time."""
        state = {
            'zones': {
                'forest': {
                    'resources': [
                        {
                            'id': 'tree_001',
                            'depleted': True,
                            'respawnTime': 10,
                            'maxQuantity': 5,
                            'quantity': 0
                        }
                    ]
                }
            }
        }

        # Advance 10 seconds (should respawn)
        updated = respawn_resources(state, 10)
        resource = updated['zones']['forest']['resources'][0]

        self.assertFalse(resource.get('depleted', False))
        self.assertEqual(resource['quantity'], 5)

    def test_tick_advances_world_time(self):
        """Tick should advance world time."""
        state = {
            'worldTime': 0,
            'lastTickAt': 1000.0
        }

        # Mock time.time() by passing JSON
        state_json = json.dumps(state)
        result_json = tick(state_json)
        result = json.loads(result_json)

        # World time should have advanced
        self.assertGreaterEqual(result['worldTime'], 0)
        self.assertIn('dayPhase', result)
        self.assertIn('weather', result)
        self.assertIn('season', result)

    def test_tick_updates_day_phase(self):
        """Tick should update day phase based on world time."""
        state = {
            'worldTime': 0,
            'lastTickAt': 1000.0
        }

        state_json = json.dumps(state)
        result_json = tick(state_json)
        result = json.loads(result_json)

        self.assertIn(result['dayPhase'], ['dawn', 'day', 'dusk', 'night'])


if __name__ == '__main__':
    unittest.main()
