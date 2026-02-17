#!/usr/bin/env python3
"""Tests for daily_health.py — metrics, trends, quality scoring, state hygiene."""
import json
import os
import sys
import tempfile
import time
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))
import daily_health


def make_state_dir():
    """Create a temp state directory with minimal valid state files."""
    tmpdir = tempfile.mkdtemp()
    os.makedirs(os.path.join(tmpdir, 'inbox', '_processed'))
    os.makedirs(os.path.join(tmpdir, 'api'))
    os.makedirs(os.path.join(tmpdir, 'logs'))

    def write(name, data):
        path = os.path.join(tmpdir, name)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'w') as f:
            json.dump(data, f)

    write('world.json', {
        'worldTime': 5000,
        'dayPhase': 'day',
        'weather': 'clear',
        'season': 'spring',
        'lastTickAt': time.time() - 60,
        'zones': {z: {} for z in ['nexus', 'gardens', 'athenaeum', 'studio',
                                   'wilds', 'agora', 'commons', 'arena']},
        'citizens': {'agent_001': {}, 'agent_002': {}},
    })
    write('chat.json', {'messages': [
        {'ts': '2026-02-17T12:00:00Z', 'from': 'observer', 'type': 'say',
         'position': {'zone': 'nexus'}, 'payload': {'text': 'Hello from Nexus'}},
        {'ts': '2026-02-17T13:00:00Z', 'from': 'observer', 'type': 'say',
         'position': {'zone': 'gardens'}, 'payload': {'text': 'Gardens are blooming'}},
        {'ts': '2026-02-17T14:00:00Z', 'from': 'agent_001', 'type': 'say',
         'position': {'zone': 'arena'}, 'payload': {'text': 'Ready to compete'}},
    ]})
    write('actions.json', {'actions': [
        {'type': 'move', 'from': 'agent_001'},
        {'type': 'say', 'from': 'agent_002'},
        {'type': 'craft', 'from': 'agent_001'},
        {'type': 'discover', 'from': 'agent_003'},
    ]})
    write('changes.json', {'changes': [
        {'type': 'warp', 'from': 'observer', 'ts': '2026-02-17T12:00:00Z', 'platform': 'api'},
        {'type': 'say', 'from': 'observer', 'ts': '2026-02-17T12:00:01Z', 'platform': 'api'},
    ]})
    write('economy.json', {'balances': {}, 'transactions': [], 'listings': []})
    write('discoveries.json', {'discoveries': {}})
    write('anchors.json', {'anchors': []})
    write('competitions.json', {'competitions': []})
    write('federation.json', {'federations': []})
    write('gardens.json', {})
    write('structures.json', {'structures': []})
    write('players.json', {'players': {}})
    write('api/last_process.json', {
        'ts': '2026-02-17T12:00:00Z', 'processed': 5, 'rejected': 0, 'errors': []
    })

    return tmpdir


class TestContentQuality(unittest.TestCase):
    """Test content quality scoring."""

    def test_quality_score_between_0_and_100(self):
        state_dir = make_state_dir()
        quality = daily_health.analyze_content_quality(state_dir)
        self.assertGreaterEqual(quality['score'], 0)
        self.assertLessEqual(quality['score'], 100)

    def test_zone_coverage_counts_valid_zones(self):
        state_dir = make_state_dir()
        quality = daily_health.analyze_content_quality(state_dir)
        self.assertEqual(len(quality['zones_seen']), 3)  # nexus, gardens, arena
        self.assertIn('nexus', quality['zones_seen'])
        self.assertIn('gardens', quality['zones_seen'])
        self.assertIn('arena', quality['zones_seen'])

    def test_zones_missing_reported(self):
        state_dir = make_state_dir()
        quality = daily_health.analyze_content_quality(state_dir)
        self.assertEqual(len(quality['zones_missing']), 5)

    def test_action_diversity_from_actions(self):
        state_dir = make_state_dir()
        quality = daily_health.analyze_content_quality(state_dir)
        self.assertIn('move', quality['action_types'])
        self.assertIn('craft', quality['action_types'])
        self.assertIn('discover', quality['action_types'])

    def test_text_uniqueness_all_unique(self):
        state_dir = make_state_dir()
        quality = daily_health.analyze_content_quality(state_dir)
        self.assertEqual(quality['text_uniqueness'], 100.0)

    def test_text_uniqueness_with_duplicates(self):
        state_dir = make_state_dir()
        chat_path = os.path.join(state_dir, 'chat.json')
        with open(chat_path, 'w') as f:
            json.dump({'messages': [
                {'ts': '2026-02-17T12:00:00Z', 'from': 'a', 'position': {'zone': 'nexus'},
                 'payload': {'text': 'same text'}},
                {'ts': '2026-02-17T13:00:00Z', 'from': 'b', 'position': {'zone': 'nexus'},
                 'payload': {'text': 'same text'}},
            ]}, f)
        quality = daily_health.analyze_content_quality(state_dir)
        self.assertEqual(quality['text_uniqueness'], 50.0)


class TestStateHygiene(unittest.TestCase):
    """Test state rotation/cleanup."""

    def test_rotate_caps_entries(self):
        state_dir = make_state_dir()
        path = os.path.join(state_dir, 'changes.json')
        # Write 600 entries
        data = {'changes': [{'type': 'say', 'i': i} for i in range(600)]}
        with open(path, 'w') as f:
            json.dump(data, f)

        removed = daily_health.rotate_state_file(path, 500, 'changes')
        self.assertEqual(removed, 100)

        with open(path) as f:
            result = json.load(f)
        self.assertEqual(len(result['changes']), 500)
        # Should keep the NEWEST entries
        self.assertEqual(result['changes'][0]['i'], 100)
        self.assertEqual(result['changes'][-1]['i'], 599)

    def test_rotate_noop_when_under_limit(self):
        state_dir = make_state_dir()
        path = os.path.join(state_dir, 'changes.json')
        removed = daily_health.rotate_state_file(path, 500, 'changes')
        self.assertEqual(removed, 0)

    def test_run_state_hygiene_returns_counts(self):
        state_dir = make_state_dir()
        results = daily_health.run_state_hygiene(state_dir)
        self.assertIn('changes', results)
        self.assertIn('chat', results)
        self.assertIn('actions', results)
        self.assertIn('old_logs', results)


class TestMetrics(unittest.TestCase):
    """Test metrics time-series persistence."""

    def test_save_and_load_metrics(self):
        tmpdir = tempfile.mkdtemp()
        metrics = {'date': '2026-02-17', 'qualityScore': 85.0, 'worldTime': 5000}
        daily_health.save_metrics(tmpdir, metrics)

        history = daily_health.load_metrics_history(tmpdir)
        self.assertEqual(len(history), 1)
        self.assertEqual(history[0]['date'], '2026-02-17')

    def test_no_duplicate_dates(self):
        tmpdir = tempfile.mkdtemp()
        daily_health.save_metrics(tmpdir, {'date': '2026-02-17', 'score': 80})
        daily_health.save_metrics(tmpdir, {'date': '2026-02-17', 'score': 85})

        history = daily_health.load_metrics_history(tmpdir)
        self.assertEqual(len(history), 1)
        self.assertEqual(history[0]['score'], 85)

    def test_yesterday_metrics(self):
        tmpdir = tempfile.mkdtemp()
        daily_health.save_metrics(tmpdir, {'date': '2026-02-16', 'score': 70})
        daily_health.save_metrics(tmpdir, {'date': '2026-02-17', 'score': 85})

        yesterday = daily_health.get_yesterday_metrics(tmpdir, '2026-02-17')
        self.assertIsNotNone(yesterday)
        self.assertEqual(yesterday['date'], '2026-02-16')
        self.assertEqual(yesterday['score'], 70)

    def test_yesterday_returns_none_if_no_history(self):
        tmpdir = tempfile.mkdtemp()
        result = daily_health.get_yesterday_metrics(tmpdir, '2026-02-17')
        self.assertIsNone(result)

    def test_metrics_capped_at_90(self):
        tmpdir = tempfile.mkdtemp()
        for i in range(100):
            daily_health.save_metrics(tmpdir, {'date': '2026-01-%02d' % (i % 28 + 1), 'i': i})
        # Save more with unique dates
        for i in range(100):
            daily_health.save_metrics(tmpdir, {'date': '2026-%02d-01' % (i % 12 + 1), 'i': i})

        history = daily_health.load_metrics_history(tmpdir)
        self.assertLessEqual(len(history), 90)


class TestTrendArrow(unittest.TestCase):
    """Test trend comparison arrows."""

    def test_increase(self):
        self.assertIn('↑', daily_health.trend_arrow(10, 5))

    def test_decrease(self):
        self.assertIn('↓', daily_health.trend_arrow(5, 10))

    def test_stable(self):
        self.assertIn('→', daily_health.trend_arrow(5, 5))

    def test_no_previous(self):
        self.assertEqual(daily_health.trend_arrow(5, None), '')


class TestReportGeneration(unittest.TestCase):
    """Test full report generation."""

    def test_report_produces_markdown(self):
        state_dir = make_state_dir()
        report, metrics = daily_health.generate_report(state_dir)
        self.assertIn('# ZION Daily Health Report', report)
        self.assertIn('Quality Score', report)
        self.assertIn('World Vitals', report)
        self.assertIn('Health Checklist', report)

    def test_report_returns_metrics_dict(self):
        state_dir = make_state_dir()
        _, metrics = daily_health.generate_report(state_dir)
        self.assertIn('date', metrics)
        self.assertIn('qualityScore', metrics)
        self.assertIn('worldTime', metrics)
        self.assertIn('healthChecks', metrics)

    def test_report_with_yesterday_shows_trends(self):
        state_dir = make_state_dir()
        yesterday = {
            'worldTime': 3000,
            'citizens': 1,
            'chatRecent': 2,
            'actionCount': 10,
            'uniqueAgents': 5,
            'changeRecent': 5,
            'stateSize': 15000,
            'zone_coverage': 25.0,
            'action_diversity': 50.0,
            'agent_diversity': 50.0,
            'text_uniqueness': 100.0,
        }
        report, metrics = daily_health.generate_report(state_dir, yesterday)
        self.assertIn('↑', report)  # worldTime should show increase


if __name__ == '__main__':
    unittest.main()
