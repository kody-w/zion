#!/usr/bin/env python3
"""Tests for load_config.py and generate_config.py — config infrastructure.

Validates: config loading with fallbacks, config generation with emergence,
bounded ranges, deterministic seeds, variety across seeds.
"""
import json
import os
import sys
import shutil
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))
from load_config import load_config, clear_cache, get_zone_names, get_valid_zones, get_earn_table, get_soul_archetype
from generate_config import generate_all, generate_economy, generate_world, generate_souls
from seed_emergence import Emergence


class TestLoadConfigDefaults(unittest.TestCase):
    """Loading config without files should return sensible defaults."""

    def setUp(self):
        clear_cache()

    def test_economy_defaults_exist(self):
        # Point to a non-existent dir so defaults are used
        cfg = load_config('economy', config_dir='/tmp/nonexistent_zion_config')
        self.assertIn('earn_table', cfg)
        self.assertIn('tax_brackets', cfg)
        self.assertIn('base_ubi_amount', cfg)
        self.assertIn('wealth_tax_threshold', cfg)
        self.assertIn('wealth_tax_rate', cfg)

    def test_world_defaults_exist(self):
        cfg = load_config('world', config_dir='/tmp/nonexistent_zion_config')
        self.assertIn('day_phases', cfg)
        self.assertIn('zones', cfg)
        self.assertIn('weather_base_weights', cfg)
        self.assertIn('pet_hunger_decay', cfg)

    def test_souls_defaults_exist(self):
        cfg = load_config('souls', config_dir='/tmp/nonexistent_zion_config')
        self.assertIn('archetypes', cfg)
        self.assertIn('greet_cooldown', cfg)
        archetypes = cfg['archetypes']
        self.assertIn('gardener', archetypes)
        self.assertIn('storyteller', archetypes)

    def test_unknown_config_returns_empty(self):
        cfg = load_config('nonexistent_config_xyz', config_dir='/tmp/nonexistent_zion_config')
        self.assertEqual(cfg, {})

    def test_earn_table_has_all_action_types(self):
        cfg = load_config('economy', config_dir='/tmp/nonexistent_zion_config')
        et = cfg['earn_table']
        required = ['join', 'say', 'shout', 'build', 'plant', 'craft',
                     'compose', 'harvest', 'discover', 'gift', 'score']
        for action in required:
            self.assertIn(action, et, 'Missing action: %s' % action)


class TestLoadConfigFromFile(unittest.TestCase):
    """Loading config from actual JSON files."""

    def setUp(self):
        clear_cache()
        self.tmpdir = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.tmpdir)

    def test_loads_from_json_file(self):
        data = {'earn_table': {'test': 42}, 'base_ubi_amount': 99}
        with open(os.path.join(self.tmpdir, 'economy.json'), 'w') as f:
            json.dump(data, f)
        cfg = load_config('economy', config_dir=self.tmpdir)
        self.assertEqual(cfg['earn_table']['test'], 42)
        self.assertEqual(cfg['base_ubi_amount'], 99)

    def test_corrupt_json_falls_back(self):
        with open(os.path.join(self.tmpdir, 'economy.json'), 'w') as f:
            f.write('not valid json{{{')
        cfg = load_config('economy', config_dir=self.tmpdir)
        # Should fall back to defaults
        self.assertIn('earn_table', cfg)

    def test_caching(self):
        clear_cache()
        cfg1 = load_config('economy')
        cfg2 = load_config('economy')
        self.assertIs(cfg1, cfg2)


class TestHelperFunctions(unittest.TestCase):
    """Test convenience helpers."""

    def setUp(self):
        clear_cache()

    def test_get_zone_names_returns_dict(self):
        names = get_zone_names(config_dir='/tmp/nonexistent_zion_config')
        self.assertIsInstance(names, dict)
        self.assertIn('nexus', names)
        self.assertIn('gardens', names)

    def test_get_valid_zones_returns_set(self):
        zones = get_valid_zones(config_dir='/tmp/nonexistent_zion_config')
        self.assertIsInstance(zones, set)
        self.assertIn('nexus', zones)
        self.assertGreater(len(zones), 5)

    def test_get_earn_table_returns_dict(self):
        table = get_earn_table(config_dir='/tmp/nonexistent_zion_config')
        self.assertIsInstance(table, dict)
        self.assertIn('build', table)

    def test_get_soul_archetype_returns_dict(self):
        cfg = get_soul_archetype('gardener', config_dir='/tmp/nonexistent_zion_config')
        self.assertIsInstance(cfg, dict)
        self.assertIn('interval', cfg)

    def test_get_soul_archetype_unknown_falls_back(self):
        cfg = get_soul_archetype('unknown_xyz', config_dir='/tmp/nonexistent_zion_config')
        self.assertIsInstance(cfg, dict)
        self.assertIn('interval', cfg)


class TestGenerateEconomy(unittest.TestCase):
    """Config generator produces valid economy config."""

    def test_generates_earn_table(self):
        e = Emergence(seed='test-econ')
        cfg = generate_economy(e)
        self.assertIn('earn_table', cfg)
        self.assertIsInstance(cfg['earn_table'], dict)
        self.assertGreater(len(cfg['earn_table']), 20)

    def test_earn_values_within_bounds(self):
        e = Emergence(seed='test-bounds')
        cfg = generate_economy(e)
        for action, value in cfg['earn_table'].items():
            self.assertGreaterEqual(value, 0, '%s below 0' % action)
            self.assertLessEqual(value, 300, '%s above 300' % action)

    def test_tax_brackets_ordered(self):
        e = Emergence(seed='test-tax')
        cfg = generate_economy(e)
        brackets = cfg['tax_brackets']
        self.assertGreater(len(brackets), 3)
        for i in range(len(brackets) - 1):
            if brackets[i][1] is not None:
                self.assertLess(brackets[i][0], brackets[i][1])

    def test_ubi_in_range(self):
        e = Emergence(seed='test-ubi')
        cfg = generate_economy(e)
        self.assertGreaterEqual(cfg['base_ubi_amount'], 1)
        self.assertLessEqual(cfg['base_ubi_amount'], 15)

    def test_wealth_tax_rate_bounded(self):
        e = Emergence(seed='test-wtax')
        cfg = generate_economy(e)
        self.assertGreaterEqual(cfg['wealth_tax_rate'], 0.005)
        self.assertLessEqual(cfg['wealth_tax_rate'], 0.05)


class TestGenerateWorld(unittest.TestCase):
    """Config generator produces valid world config."""

    def test_generates_day_phases(self):
        e = Emergence(seed='test-world')
        cfg = generate_world(e)
        self.assertIn('day_phases', cfg)
        phases = cfg['day_phases']
        self.assertGreater(len(phases), 3)

    def test_zones_have_names_and_roles(self):
        e = Emergence(seed='test-zones')
        cfg = generate_world(e)
        for zid, zone in cfg['zones'].items():
            self.assertIn('name', zone, 'Zone %s missing name' % zid)
            self.assertIn('role', zone, 'Zone %s missing role' % zid)

    def test_weather_weights_per_season(self):
        e = Emergence(seed='test-weather')
        cfg = generate_world(e)
        for season in ['spring', 'summer', 'autumn', 'winter']:
            self.assertIn(season, cfg['weather_base_weights'])
            weights = cfg['weather_base_weights'][season]
            self.assertGreater(sum(weights.values()), 50)

    def test_pet_decay_bounded(self):
        e = Emergence(seed='test-pets')
        cfg = generate_world(e)
        self.assertGreaterEqual(cfg['pet_hunger_decay'], 0.5)
        self.assertLessEqual(cfg['pet_hunger_decay'], 2.0)


class TestGenerateSouls(unittest.TestCase):
    """Config generator produces valid souls config."""

    def test_all_archetypes_present(self):
        e = Emergence(seed='test-souls')
        cfg = generate_souls(e)
        expected = ['gardener', 'builder', 'merchant', 'explorer', 'teacher',
                     'healer', 'artist', 'musician', 'philosopher', 'storyteller']
        for arch in expected:
            self.assertIn(arch, cfg['archetypes'], 'Missing archetype: %s' % arch)

    def test_intervals_bounded(self):
        e = Emergence(seed='test-intervals')
        cfg = generate_souls(e)
        for arch, data in cfg['archetypes'].items():
            self.assertGreaterEqual(data['interval'], 30, '%s interval too low' % arch)
            self.assertLessEqual(data['interval'], 240, '%s interval too high' % arch)

    def test_greet_params_reasonable(self):
        e = Emergence(seed='test-greet')
        cfg = generate_souls(e)
        self.assertGreaterEqual(cfg['greet_cooldown'], 15)
        self.assertLessEqual(cfg['greet_cooldown'], 60)
        self.assertGreaterEqual(cfg['greet_distance'], 8)


class TestGenerateAll(unittest.TestCase):
    """End-to-end config generation."""

    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.tmpdir)

    def test_generates_all_files(self):
        configs = generate_all(seed='test-all', config_dir=self.tmpdir)
        self.assertIn('economy', configs)
        self.assertIn('world', configs)
        self.assertIn('souls', configs)

        for name in configs:
            path = os.path.join(self.tmpdir, name + '.json')
            self.assertTrue(os.path.exists(path), 'Missing file: %s' % path)

    def test_files_are_valid_json(self):
        generate_all(seed='test-json', config_dir=self.tmpdir)
        for name in ['economy', 'world', 'souls']:
            path = os.path.join(self.tmpdir, name + '.json')
            with open(path) as f:
                data = json.load(f)
            self.assertIsInstance(data, dict)

    def test_deterministic_same_seed(self):
        dir1 = os.path.join(self.tmpdir, 'd1')
        dir2 = os.path.join(self.tmpdir, 'd2')
        os.makedirs(dir1)
        os.makedirs(dir2)

        generate_all(seed='deterministic', config_dir=dir1)
        generate_all(seed='deterministic', config_dir=dir2)

        for name in ['economy', 'world', 'souls']:
            with open(os.path.join(dir1, name + '.json')) as f:
                d1 = json.load(f)
            with open(os.path.join(dir2, name + '.json')) as f:
                d2 = json.load(f)
            self.assertEqual(d1, d2, '%s differs with same seed' % name)

    def test_different_seeds_produce_different_config(self):
        dir1 = os.path.join(self.tmpdir, 'a')
        dir2 = os.path.join(self.tmpdir, 'b')
        os.makedirs(dir1)
        os.makedirs(dir2)

        generate_all(seed='2026-01-01', config_dir=dir1)
        generate_all(seed='2026-12-31', config_dir=dir2)

        # At least economy should differ
        with open(os.path.join(dir1, 'economy.json')) as f:
            e1 = json.load(f)
        with open(os.path.join(dir2, 'economy.json')) as f:
            e2 = json.load(f)
        self.assertNotEqual(e1, e2, 'Different seeds should produce different config')

    def test_loaded_config_matches_generated(self):
        clear_cache()
        generate_all(seed='test-load', config_dir=self.tmpdir)

        economy = load_config('economy', config_dir=self.tmpdir)
        self.assertIn('earn_table', economy)
        self.assertIn('base_ubi_amount', economy)

        world = load_config('world', config_dir=self.tmpdir)
        self.assertIn('zones', world)

        souls = load_config('souls', config_dir=self.tmpdir)
        self.assertIn('archetypes', souls)


if __name__ == '__main__':
    unittest.main()
