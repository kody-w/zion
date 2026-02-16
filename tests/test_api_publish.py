#!/usr/bin/env python3
"""Tests for api_publish_state.py"""
import json
import os
import sys
import tempfile
import unittest

# Add scripts dir to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))
import api_publish_state


class TestBuildWorldState(unittest.TestCase):
    """Test world state snapshot generation."""

    def setUp(self):
        """Create a temp state directory with minimal data."""
        self.tmpdir = tempfile.mkdtemp()
        self.state_dir = self.tmpdir

        # Create minimal state files
        os.makedirs(os.path.join(self.state_dir, 'founding'), exist_ok=True)

        self._write_json('world.json', {
            'version': 1,
            'zones': {
                'nexus': {
                    'id': 'nexus', 'name': 'The Nexus',
                    'description': 'Central hub', 'terrain': 'plaza',
                    'objects': [{'id': 'fountain_001', 'type': 'fountain'}]
                },
                'gardens': {
                    'id': 'gardens', 'name': 'The Gardens',
                    'description': 'Botanical gardens', 'terrain': 'garden',
                    'objects': []
                }
            },
            'worldTime': 720,
            'dayPhase': 'midday',
            'weather': 'clear',
            'season': 'spring',
        })

        self._write_json('players.json', {
            'players': {
                'test-user': {
                    'position': {'x': 5, 'y': 0, 'z': 10, 'zone': 'nexus'}
                }
            }
        })

        self._write_json('economy.json', {
            'balances': {'test-user': 100},
            'transactions': [],
            'listings': [{'id': 'listing1'}]
        })

        self._write_json('chat.json', {
            'messages': [
                {'from': 'test-user', 'type': 'say', 'ts': '2026-02-16T12:00:00Z',
                 'payload': {'text': 'Hello world!'}}
            ]
        })

        self._write_json('discoveries.json', {'discoveries': {}})
        self._write_json('structures.json', {'fountain_001': {'type': 'fountain'}})
        self._write_json('gardens.json', {
            'plot_001': {'plants': [], 'fertility': 0.8}
        })
        self._write_json('actions.json', {'actions': []})

        self._write_json(os.path.join('founding', 'agents.json'), {
            'agents': [
                {
                    'id': 'agent_001', 'name': 'Test Agent',
                    'archetype': 'explorer',
                    'position': {'zone': 'nexus', 'x': 0, 'y': 0, 'z': 0},
                    'personality': ['curious'],
                }
            ]
        })

    def _write_json(self, relpath, data):
        path = os.path.join(self.state_dir, relpath)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'w') as f:
            json.dump(data, f)

    def test_builds_valid_snapshot(self):
        state = api_publish_state.build_world_state(self.state_dir)
        self.assertEqual(state['v'], 1)
        self.assertIn('ts', state)
        self.assertIn('world', state)
        self.assertIn('zones', state)
        self.assertIn('npcs', state)
        self.assertIn('meta', state)

    def test_world_fields(self):
        state = api_publish_state.build_world_state(self.state_dir)
        w = state['world']
        self.assertEqual(w['dayPhase'], 'midday')
        self.assertEqual(w['weather'], 'clear')
        self.assertEqual(w['season'], 'spring')

    def test_zones_present(self):
        state = api_publish_state.build_world_state(self.state_dir)
        self.assertIn('nexus', state['zones'])
        self.assertIn('gardens', state['zones'])
        self.assertEqual(state['zones']['nexus']['name'], 'The Nexus')

    def test_player_counted(self):
        state = api_publish_state.build_world_state(self.state_dir)
        self.assertEqual(state['zones']['nexus']['player_count'], 1)
        self.assertIn('test-user', state['players'])

    def test_npc_listed(self):
        state = api_publish_state.build_world_state(self.state_dir)
        self.assertEqual(len(state['npcs']), 1)
        self.assertEqual(state['npcs'][0]['name'], 'Test Agent')

    def test_npc_zone_count(self):
        state = api_publish_state.build_world_state(self.state_dir)
        self.assertEqual(state['zones']['nexus']['npc_count'], 1)

    def test_recent_chat(self):
        state = api_publish_state.build_world_state(self.state_dir)
        self.assertEqual(len(state['recent_chat']), 1)
        self.assertEqual(state['recent_chat'][0]['text'], 'Hello world!')

    def test_economy(self):
        state = api_publish_state.build_world_state(self.state_dir)
        self.assertEqual(state['economy']['total_spark'], 100)
        self.assertEqual(state['economy']['active_listings'], 1)

    def test_meta_urls(self):
        state = api_publish_state.build_world_state(self.state_dir)
        self.assertIn('feeds', state['meta'])
        self.assertIn('world', state['meta']['feeds'])

    def test_gardens_summary(self):
        state = api_publish_state.build_world_state(self.state_dir)
        self.assertEqual(state['gardens']['total_plots'], 1)
        self.assertEqual(state['gardens']['planted'], 0)


class TestBuildPerception(unittest.TestCase):
    """Test natural language perception generation."""

    def test_contains_zone_names(self):
        state = {
            'v': 1, 'ts': '2026-02-16T12:00:00Z',
            'world': {'dayPhase': 'midday', 'weather': 'clear', 'season': 'spring', 'time': 720},
            'zones': {'nexus': {'name': 'The Nexus', 'player_count': 1, 'npc_count': 5, 'objects': 1}},
            'players': {}, 'npcs': [], 'recent_chat': [],
            'economy': {'total_spark': 0, 'active_listings': 0},
            'meta': {},
        }
        text = api_publish_state.build_perception(state)
        self.assertIn('THE NEXUS', text)
        self.assertIn('Midday', text)
        self.assertIn('HOW TO ACT', text)
        self.assertIn('RSS FEEDS', text)

    def test_contains_chat(self):
        state = {
            'v': 1, 'ts': '2026-02-16T12:00:00Z',
            'world': {'dayPhase': 'midday', 'weather': 'clear', 'season': 'spring', 'time': 720},
            'zones': {},
            'players': {}, 'npcs': [],
            'recent_chat': [{'from': 'bob', 'type': 'say', 'text': 'hi', 'ts': ''}],
            'economy': {'total_spark': 0, 'active_listings': 0},
            'meta': {},
        }
        text = api_publish_state.build_perception(state)
        self.assertIn('bob', text)
        self.assertIn('RECENT MESSAGES', text)


class TestBuildSchema(unittest.TestCase):
    """Test Schema.org JSON-LD generation."""

    def test_schema_type(self):
        state = {
            'v': 1, 'ts': '2026-02-16T12:00:00Z',
            'world': {'dayPhase': 'midday', 'weather': 'clear', 'season': 'spring', 'time': 720},
            'zones': {'nexus': {'name': 'The Nexus', 'description': 'Hub'}},
            'players': {}, 'npcs': [], 'recent_chat': [], 'discoveries': [],
            'economy': {'total_spark': 0, 'active_listings': 0},
            'meta': {},
        }
        schema = api_publish_state.build_schema(state)
        self.assertEqual(schema['@type'], 'GameServer')
        self.assertEqual(schema['@context'], 'https://schema.org')
        self.assertEqual(schema['name'], 'ZION')

    def test_contains_places(self):
        state = {
            'v': 1, 'ts': '2026-02-16T12:00:00Z',
            'world': {'dayPhase': 'midday', 'weather': 'clear', 'season': 'spring', 'time': 720},
            'zones': {'nexus': {'name': 'The Nexus', 'description': 'Hub'}},
            'players': {}, 'npcs': [], 'recent_chat': [], 'discoveries': [],
            'economy': {'total_spark': 0, 'active_listings': 0},
            'meta': {},
        }
        schema = api_publish_state.build_schema(state)
        self.assertEqual(len(schema['containsPlace']), 1)
        self.assertEqual(schema['containsPlace'][0]['@type'], 'Place')
        self.assertEqual(schema['containsPlace'][0]['name'], 'The Nexus')


class TestBuildRSS(unittest.TestCase):
    """Test RSS feed generation."""

    def _make_state(self):
        return {
            'v': 1, 'ts': '2026-02-16T12:00:00Z',
            'world': {'dayPhase': 'midday', 'weather': 'clear', 'season': 'spring', 'time': 720},
            'zones': {'nexus': {'name': 'The Nexus', 'npc_count': 5, 'player_count': 1}},
            'players': {}, 'npcs': [],
            'recent_chat': [{'from': 'bob', 'type': 'say', 'text': 'Hello', 'ts': '2026-02-16T12:00:00Z'}],
            'economy': {'total_spark': 0, 'active_listings': 0},
            'discoveries': [],
            'meta': {},
        }

    def test_world_rss_valid_xml(self):
        state = self._make_state()
        xml = api_publish_state.build_rss_world(state)
        self.assertIn('<?xml', xml)
        self.assertIn('<rss version="2.0"', xml)
        self.assertIn('ZION World State', xml)

    def test_chat_rss_has_items(self):
        state = self._make_state()
        xml = api_publish_state.build_rss_chat(state)
        self.assertIn('<item>', xml)
        self.assertIn('bob', xml)

    def test_events_rss_has_genesis(self):
        state = self._make_state()
        xml = api_publish_state.build_rss_events(state)
        self.assertIn('World Created', xml)

    def test_opml_valid(self):
        xml = api_publish_state.build_opml()
        self.assertIn('<opml', xml)
        self.assertIn('world.xml', xml)
        self.assertIn('chat.xml', xml)
        self.assertIn('events.xml', xml)


class TestComputeDayPhase(unittest.TestCase):
    def test_night(self):
        self.assertEqual(api_publish_state.compute_day_phase(0), 'night')
        self.assertEqual(api_publish_state.compute_day_phase(1200), 'night')

    def test_dawn(self):
        self.assertEqual(api_publish_state.compute_day_phase(400), 'dawn')

    def test_midday(self):
        self.assertEqual(api_publish_state.compute_day_phase(720), 'midday')


if __name__ == '__main__':
    unittest.main()
