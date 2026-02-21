#!/usr/bin/env python3
"""Tests for world_diff.py — World Diff narrative tool."""
import unittest
import sys
import os
import json
import tempfile
import shutil

# Add scripts directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))

from world_diff import diff_states, narrate_diff, diff_files


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_economy(balances=None, transactions=None):
    return {
        'balances': balances or {},
        'transactions': transactions or [],
        'listings': []
    }


def make_gardens(plots=None):
    return plots or {}


def make_structures(items=None):
    return items or {}


def make_chat(messages=None):
    return {'messages': messages or []}


def make_federation(federations=None, worlds=None):
    return {
        'worldId': 'zion-main',
        'worldName': 'ZION',
        'federations': federations or [],
        'discoveredWorlds': worlds or [],
        'sparkExchangeRate': 1.0
    }


def make_players(players=None):
    return {'players': players or {}}


def make_state(economy=None, gardens=None, structures=None,
               chat=None, federation=None, players=None):
    """Build a composite state dict as used by diff_states."""
    return {
        'economy': economy or make_economy(),
        'gardens': gardens or make_gardens(),
        'structures': structures or make_structures(),
        'chat': chat or make_chat(),
        'federation': federation or make_federation(),
        'players': players or make_players(),
    }


# ---------------------------------------------------------------------------
# Economy diff tests
# ---------------------------------------------------------------------------

class TestEconomyDiff(unittest.TestCase):

    def test_no_changes(self):
        economy = make_economy({'alice': 100, 'TREASURY': 50})
        before = make_state(economy=economy)
        after = make_state(economy=economy)
        diff = diff_states(before, after)
        self.assertEqual(diff['economy']['balance_changes'], {})
        self.assertEqual(diff['economy']['treasury_delta'], 0)

    def test_balance_increase(self):
        before = make_state(economy=make_economy({'alice': 10}))
        after = make_state(economy=make_economy({'alice': 25}))
        diff = diff_states(before, after)
        self.assertEqual(diff['economy']['balance_changes']['alice'], 15)

    def test_balance_decrease(self):
        before = make_state(economy=make_economy({'bob': 50}))
        after = make_state(economy=make_economy({'bob': 30}))
        diff = diff_states(before, after)
        self.assertEqual(diff['economy']['balance_changes']['bob'], -20)

    def test_treasury_change(self):
        before = make_state(economy=make_economy({'TREASURY': 100}))
        after = make_state(economy=make_economy({'TREASURY': 147}))
        diff = diff_states(before, after)
        self.assertEqual(diff['economy']['treasury_delta'], 47)

    def test_treasury_decrease(self):
        before = make_state(economy=make_economy({'TREASURY': 200}))
        after = make_state(economy=make_economy({'TREASURY': 150}))
        diff = diff_states(before, after)
        self.assertEqual(diff['economy']['treasury_delta'], -50)

    def test_new_player_balance(self):
        before = make_state(economy=make_economy({}))
        after = make_state(economy=make_economy({'newguy': 5}))
        diff = diff_states(before, after)
        # New players with a positive balance show up as a change from 0
        self.assertEqual(diff['economy']['balance_changes']['newguy'], 5)

    def test_new_transactions(self):
        tx1 = {'type': 'craft', 'from': 'alice', 'ts': 't1', 'payload': {}}
        tx2 = {'type': 'gift', 'from': 'bob', 'ts': 't2', 'payload': {}}
        before = make_state(economy=make_economy(transactions=[tx1]))
        after = make_state(economy=make_economy(transactions=[tx1, tx2]))
        diff = diff_states(before, after)
        self.assertEqual(len(diff['economy']['new_transactions']), 1)
        self.assertEqual(diff['economy']['new_transactions'][0]['type'], 'gift')

    def test_ubi_detected(self):
        """UBI payments should be detected as a special transaction type."""
        ubi_tx = {'type': 'ubi', 'from': 'system', 'ts': 't1', 'payload': {'amount': 10}}
        before = make_state(economy=make_economy(transactions=[]))
        after = make_state(economy=make_economy(transactions=[ubi_tx]))
        diff = diff_states(before, after)
        ubi_txs = [t for t in diff['economy']['new_transactions'] if t['type'] == 'ubi']
        self.assertEqual(len(ubi_txs), 1)


# ---------------------------------------------------------------------------
# Movement diff tests
# ---------------------------------------------------------------------------

class TestMovementDiff(unittest.TestCase):

    def test_no_movement(self):
        players = make_players({'alice': {'position': {'zone': 'nexus', 'x': 0, 'y': 0, 'z': 0}}})
        before = make_state(players=players)
        after = make_state(players=players)
        diff = diff_states(before, after)
        self.assertEqual(diff['movement']['zone_transitions'], [])

    def test_zone_transition(self):
        before = make_state(players=make_players({
            'alice': {'position': {'zone': 'nexus', 'x': 0, 'y': 0, 'z': 0}}
        }))
        after = make_state(players=make_players({
            'alice': {'position': {'zone': 'gardens', 'x': 200, 'y': 0, 'z': 30}}
        }))
        diff = diff_states(before, after)
        self.assertEqual(len(diff['movement']['zone_transitions']), 1)
        t = diff['movement']['zone_transitions'][0]
        self.assertEqual(t['player'], 'alice')
        self.assertEqual(t['from_zone'], 'nexus')
        self.assertEqual(t['to_zone'], 'gardens')

    def test_multiple_zone_transitions(self):
        before = make_state(players=make_players({
            'alice': {'position': {'zone': 'nexus', 'x': 0, 'y': 0, 'z': 0}},
            'bob': {'position': {'zone': 'arena', 'x': 0, 'y': 0, 'z': -240}}
        }))
        after = make_state(players=make_players({
            'alice': {'position': {'zone': 'gardens', 'x': 200, 'y': 0, 'z': 30}},
            'bob': {'position': {'zone': 'wilds', 'x': -30, 'y': 0, 'z': 260}}
        }))
        diff = diff_states(before, after)
        self.assertEqual(len(diff['movement']['zone_transitions']), 2)

    def test_movement_within_zone_not_transition(self):
        """Moving within same zone should not create a zone transition entry."""
        before = make_state(players=make_players({
            'alice': {'position': {'zone': 'nexus', 'x': 0, 'y': 0, 'z': 0}}
        }))
        after = make_state(players=make_players({
            'alice': {'position': {'zone': 'nexus', 'x': 5, 'y': 0, 'z': 5}}
        }))
        diff = diff_states(before, after)
        self.assertEqual(diff['movement']['zone_transitions'], [])


# ---------------------------------------------------------------------------
# Players diff tests
# ---------------------------------------------------------------------------

class TestPlayersDiff(unittest.TestCase):

    def test_new_player_joins(self):
        before = make_state(players=make_players({}))
        after = make_state(players=make_players({
            'newguy': {'position': {'zone': 'nexus', 'x': 0, 'y': 0, 'z': 0}, 'joinedAt': 't1'}
        }))
        diff = diff_states(before, after)
        self.assertIn('newguy', diff['players']['joined'])

    def test_player_leaves(self):
        before = make_state(players=make_players({
            'oldguy': {'position': {'zone': 'nexus', 'x': 0, 'y': 0, 'z': 0}}
        }))
        after = make_state(players=make_players({}))
        diff = diff_states(before, after)
        self.assertIn('oldguy', diff['players']['left'])

    def test_no_player_changes(self):
        players = make_players({'alice': {'position': {'zone': 'nexus', 'x': 0, 'y': 0, 'z': 0}}})
        before = make_state(players=players)
        after = make_state(players=players)
        diff = diff_states(before, after)
        self.assertEqual(diff['players']['joined'], [])
        self.assertEqual(diff['players']['left'], [])


# ---------------------------------------------------------------------------
# Gardens diff tests
# ---------------------------------------------------------------------------

class TestGardensDiff(unittest.TestCase):

    def make_plot(self, owner=None, plants=None, fertility=0.8):
        return {
            'owner': owner,
            'position': {'zone': 'gardens', 'x': 0, 'y': 0, 'z': 0},
            'plants': plants or [],
            'fertility': fertility,
            'size': 'medium'
        }

    def test_no_changes(self):
        gardens = make_gardens({
            'plot_001': self.make_plot(owner='alice', plants=['rose'])
        })
        before = make_state(gardens=gardens)
        after = make_state(gardens=gardens)
        diff = diff_states(before, after)
        self.assertEqual(diff['gardens']['new_plants'], [])
        self.assertEqual(diff['gardens']['harvests'], [])
        self.assertEqual(diff['gardens']['ownership_changes'], [])

    def test_new_plant(self):
        before = make_state(gardens=make_gardens({
            'plot_001': self.make_plot(plants=[])
        }))
        after = make_state(gardens=make_gardens({
            'plot_001': self.make_plot(plants=['rose', 'lily'])
        }))
        diff = diff_states(before, after)
        self.assertEqual(len(diff['gardens']['new_plants']), 1)
        entry = diff['gardens']['new_plants'][0]
        self.assertEqual(entry['plot'], 'plot_001')
        self.assertIn('rose', entry['added'] + entry['added'])  # both added

    def test_harvest(self):
        before = make_state(gardens=make_gardens({
            'plot_001': self.make_plot(plants=['carrot', 'tomato'])
        }))
        after = make_state(gardens=make_gardens({
            'plot_001': self.make_plot(plants=['carrot'])
        }))
        diff = diff_states(before, after)
        self.assertEqual(len(diff['gardens']['harvests']), 1)
        self.assertEqual(diff['gardens']['harvests'][0]['plot'], 'plot_001')
        self.assertIn('tomato', diff['gardens']['harvests'][0]['removed'])

    def test_ownership_change(self):
        before = make_state(gardens=make_gardens({
            'plot_001': self.make_plot(owner=None)
        }))
        after = make_state(gardens=make_gardens({
            'plot_001': self.make_plot(owner='alice')
        }))
        diff = diff_states(before, after)
        self.assertEqual(len(diff['gardens']['ownership_changes']), 1)
        change = diff['gardens']['ownership_changes'][0]
        self.assertEqual(change['plot'], 'plot_001')
        self.assertIsNone(change['from_owner'])
        self.assertEqual(change['to_owner'], 'alice')

    def test_fertility_change(self):
        before = make_state(gardens=make_gardens({
            'plot_001': self.make_plot(fertility=0.5)
        }))
        after = make_state(gardens=make_gardens({
            'plot_001': self.make_plot(fertility=0.9)
        }))
        diff = diff_states(before, after)
        self.assertEqual(len(diff['gardens']['fertility_changes']), 1)
        fc = diff['gardens']['fertility_changes'][0]
        self.assertEqual(fc['plot'], 'plot_001')
        self.assertAlmostEqual(fc['delta'], 0.4, places=5)

    def test_new_plot(self):
        before = make_state(gardens=make_gardens({}))
        after = make_state(gardens=make_gardens({
            'plot_001': self.make_plot()
        }))
        diff = diff_states(before, after)
        self.assertIn('plot_001', diff['gardens']['new_plots'])


# ---------------------------------------------------------------------------
# Structures diff tests
# ---------------------------------------------------------------------------

class TestStructuresDiff(unittest.TestCase):

    def make_structure(self, sid, stype='bench', zone='commons', builder='alice'):
        return {
            'id': sid,
            'type': stype,
            'name': f'A {stype}',
            'zone': zone,
            'position': {'x': 0, 'y': 0, 'z': 0},
            'builder': builder,
            'builtAt': '2026-01-01T00:00:00Z'
        }

    def test_no_changes(self):
        structs = make_structures({
            'bench_001': self.make_structure('bench_001')
        })
        before = make_state(structures=structs)
        after = make_state(structures=structs)
        diff = diff_states(before, after)
        self.assertEqual(diff['structures']['new_builds'], [])
        self.assertEqual(diff['structures']['removals'], [])

    def test_new_structure(self):
        before = make_state(structures=make_structures({}))
        after = make_state(structures=make_structures({
            'bench_001': self.make_structure('bench_001', stype='bench', zone='commons')
        }))
        diff = diff_states(before, after)
        self.assertEqual(len(diff['structures']['new_builds']), 1)
        build = diff['structures']['new_builds'][0]
        self.assertEqual(build['id'], 'bench_001')
        self.assertEqual(build['type'], 'bench')
        self.assertEqual(build['zone'], 'commons')

    def test_removed_structure(self):
        before = make_state(structures=make_structures({
            'old_001': self.make_structure('old_001')
        }))
        after = make_state(structures=make_structures({}))
        diff = diff_states(before, after)
        self.assertEqual(len(diff['structures']['removals']), 1)
        self.assertEqual(diff['structures']['removals'][0]['id'], 'old_001')

    def test_modified_structure(self):
        before = make_state(structures=make_structures({
            'bench_001': self.make_structure('bench_001', builder='alice')
        }))
        after_struct = self.make_structure('bench_001', builder='alice')
        after_struct['name'] = 'Modified Bench'
        after = make_state(structures=make_structures({'bench_001': after_struct}))
        diff = diff_states(before, after)
        self.assertEqual(len(diff['structures']['modifications']), 1)


# ---------------------------------------------------------------------------
# Chat diff tests
# ---------------------------------------------------------------------------

class TestChatDiff(unittest.TestCase):

    def make_msg(self, mid, sender, text, zone='nexus'):
        return {
            'v': 1, 'id': mid, 'ts': '2026-01-01T00:00:00Z', 'seq': 0,
            'from': sender, 'type': 'say', 'platform': 'api',
            'position': {'x': 0, 'y': 0, 'z': 0, 'zone': zone},
            'geo': None,
            'payload': {'text': text}
        }

    def test_no_new_messages(self):
        msgs = [self.make_msg('msg_001', 'alice', 'Hello!')]
        before = make_state(chat=make_chat(msgs))
        after = make_state(chat=make_chat(msgs))
        diff = diff_states(before, after)
        self.assertEqual(diff['chat']['new_messages'], [])

    def test_new_messages(self):
        msg1 = self.make_msg('msg_001', 'alice', 'Hello!')
        msg2 = self.make_msg('msg_002', 'bob', 'Greetings!')
        before = make_state(chat=make_chat([msg1]))
        after = make_state(chat=make_chat([msg1, msg2]))
        diff = diff_states(before, after)
        self.assertEqual(len(diff['chat']['new_messages']), 1)
        self.assertEqual(diff['chat']['new_messages'][0]['from'], 'bob')

    def test_message_count(self):
        msgs = [self.make_msg(f'msg_{i:03d}', 'alice', f'Message {i}') for i in range(5)]
        before = make_state(chat=make_chat(msgs[:2]))
        after = make_state(chat=make_chat(msgs))
        diff = diff_states(before, after)
        self.assertEqual(diff['chat']['new_message_count'], 3)


# ---------------------------------------------------------------------------
# Federation diff tests
# ---------------------------------------------------------------------------

class TestFederationDiff(unittest.TestCase):

    def test_no_changes(self):
        fed = make_federation(federations=[], worlds=[])
        before = make_state(federation=fed)
        after = make_state(federation=fed)
        diff = diff_states(before, after)
        self.assertEqual(diff['federation']['new_federations'], [])
        self.assertEqual(diff['federation']['new_worlds'], [])

    def test_new_federation(self):
        fed_entry = {'id': 'fed_001', 'name': 'Outer Worlds Alliance', 'status': 'active'}
        before = make_state(federation=make_federation(federations=[]))
        after = make_state(federation=make_federation(federations=[fed_entry]))
        diff = diff_states(before, after)
        self.assertEqual(len(diff['federation']['new_federations']), 1)
        self.assertEqual(diff['federation']['new_federations'][0]['name'], 'Outer Worlds Alliance')

    def test_new_discovered_world(self):
        world_entry = {'worldId': 'world-2', 'worldName': 'Elsewhere', 'endpoint': 'http://example.com'}
        before = make_state(federation=make_federation(worlds=[]))
        after = make_state(federation=make_federation(worlds=[world_entry]))
        diff = diff_states(before, after)
        self.assertEqual(len(diff['federation']['new_worlds']), 1)

    def test_exchange_rate_change(self):
        before_fed = make_federation()
        before_fed['sparkExchangeRate'] = 1.0
        after_fed = make_federation()
        after_fed['sparkExchangeRate'] = 1.25
        before = make_state(federation=before_fed)
        after = make_state(federation=after_fed)
        diff = diff_states(before, after)
        self.assertAlmostEqual(diff['federation']['exchange_rate_delta'], 0.25, places=5)


# ---------------------------------------------------------------------------
# Edge case tests
# ---------------------------------------------------------------------------

class TestEdgeCases(unittest.TestCase):

    def test_identical_states(self):
        state = make_state(
            economy=make_economy({'alice': 100, 'TREASURY': 50}),
            players=make_players({'alice': {'position': {'zone': 'nexus', 'x': 0, 'y': 0, 'z': 0}}})
        )
        diff = diff_states(state, state)
        self.assertEqual(diff['economy']['balance_changes'], {})
        self.assertEqual(diff['movement']['zone_transitions'], [])
        self.assertEqual(diff['players']['joined'], [])
        self.assertEqual(diff['players']['left'], [])

    def test_empty_states(self):
        before = make_state()
        after = make_state()
        diff = diff_states(before, after)
        # Should not raise; all diff sections should be empty / zero
        self.assertIsInstance(diff, dict)
        self.assertEqual(diff['economy']['balance_changes'], {})
        self.assertEqual(diff['players']['joined'], [])

    def test_missing_keys_graceful(self):
        """diff_states should handle missing top-level keys gracefully."""
        before = {}
        after = {}
        diff = diff_states(before, after)
        self.assertIsInstance(diff, dict)

    def test_partial_state(self):
        """Only economy data, no players/gardens/etc."""
        before = {'economy': make_economy({'alice': 10})}
        after = {'economy': make_economy({'alice': 20})}
        diff = diff_states(before, after)
        self.assertEqual(diff['economy']['balance_changes']['alice'], 10)


# ---------------------------------------------------------------------------
# Narrative output tests
# ---------------------------------------------------------------------------

class TestNarrateDiff(unittest.TestCase):

    def test_narrative_is_string(self):
        diff = diff_states(make_state(), make_state())
        narrative = narrate_diff(diff)
        self.assertIsInstance(narrative, str)

    def test_narrative_no_changes(self):
        diff = diff_states(make_state(), make_state())
        narrative = narrate_diff(diff)
        # Should mention "no changes" or similar quiet message
        self.assertIn('no', narrative.lower())

    def test_narrative_balance_increase(self):
        before = make_state(economy=make_economy({'alice': 10}))
        after = make_state(economy=make_economy({'alice': 25}))
        diff = diff_states(before, after)
        narrative = narrate_diff(diff)
        self.assertIn('alice', narrative.lower())
        self.assertIn('15', narrative)

    def test_narrative_treasury(self):
        before = make_state(economy=make_economy({'TREASURY': 100}))
        after = make_state(economy=make_economy({'TREASURY': 147}))
        diff = diff_states(before, after)
        narrative = narrate_diff(diff)
        self.assertIn('TREASURY', narrative)
        self.assertIn('47', narrative)

    def test_narrative_zone_transition(self):
        before = make_state(players=make_players({
            'sage': {'position': {'zone': 'nexus', 'x': 0, 'y': 0, 'z': 0}}
        }))
        after = make_state(players=make_players({
            'sage': {'position': {'zone': 'gardens', 'x': 200, 'y': 0, 'z': 30}}
        }))
        diff = diff_states(before, after)
        narrative = narrate_diff(diff)
        self.assertIn('sage', narrative.lower())
        self.assertIn('gardens', narrative.lower())

    def test_narrative_new_structure(self):
        before = make_state(structures=make_structures({}))
        after = make_state(structures=make_structures({
            'bench_001': {
                'id': 'bench_001', 'type': 'bench', 'name': 'A Bench',
                'zone': 'commons', 'position': {'x': 0, 'y': 0, 'z': 0},
                'builder': 'alice', 'builtAt': '2026-01-01T00:00:00Z'
            }
        }))
        diff = diff_states(before, after)
        narrative = narrate_diff(diff)
        self.assertIn('bench', narrative.lower())
        self.assertIn('commons', narrative.lower())

    def test_narrative_plant_added(self):
        before = make_state(gardens=make_gardens({
            'plot_001': {
                'owner': 'alice', 'plants': [],
                'position': {'zone': 'gardens', 'x': 0, 'y': 0, 'z': 0},
                'fertility': 0.8, 'size': 'medium'
            }
        }))
        after = make_state(gardens=make_gardens({
            'plot_001': {
                'owner': 'alice', 'plants': ['rose', 'lily', 'violet'],
                'position': {'zone': 'gardens', 'x': 0, 'y': 0, 'z': 0},
                'fertility': 0.8, 'size': 'medium'
            }
        }))
        diff = diff_states(before, after)
        narrative = narrate_diff(diff)
        self.assertIn('rose', narrative.lower())

    def test_narrative_new_player(self):
        before = make_state(players=make_players({}))
        after = make_state(players=make_players({
            'wanderer': {
                'position': {'zone': 'nexus', 'x': 0, 'y': 0, 'z': 0},
                'joinedAt': '2026-01-01T00:00:00Z'
            }
        }))
        diff = diff_states(before, after)
        narrative = narrate_diff(diff)
        self.assertIn('wanderer', narrative.lower())

    def test_narrative_chat_messages(self):
        msg1 = {
            'v': 1, 'id': 'msg_001', 'ts': '2026-01-01T00:00:00Z', 'seq': 0,
            'from': 'alice', 'type': 'say', 'platform': 'api',
            'position': {'x': 0, 'y': 0, 'z': 0, 'zone': 'nexus'},
            'geo': None, 'payload': {'text': 'Hello everyone!'}
        }
        before = make_state(chat=make_chat([]))
        after = make_state(chat=make_chat([msg1]))
        diff = diff_states(before, after)
        narrative = narrate_diff(diff)
        self.assertIn('alice', narrative.lower())

    def test_narrative_federation(self):
        before = make_state(federation=make_federation(federations=[]))
        after = make_state(federation=make_federation(
            federations=[{'id': 'f1', 'name': 'Alliance', 'status': 'active'}]
        ))
        diff = diff_states(before, after)
        narrative = narrate_diff(diff)
        self.assertIn('alliance', narrative.lower())

    def test_narrative_multiple_events(self):
        """Narrative should handle multiple concurrent changes."""
        before = make_state(
            economy=make_economy({'alice': 10, 'TREASURY': 100}),
            players=make_players({'alice': {'position': {'zone': 'nexus', 'x': 0, 'y': 0, 'z': 0}}})
        )
        after = make_state(
            economy=make_economy({'alice': 25, 'TREASURY': 150}),
            players=make_players({'alice': {'position': {'zone': 'gardens', 'x': 200, 'y': 0, 'z': 30}}})
        )
        diff = diff_states(before, after)
        narrative = narrate_diff(diff)
        # Both events should appear in the narrative
        self.assertIn('alice', narrative.lower())
        self.assertIn('gardens', narrative.lower())
        self.assertIn('TREASURY', narrative)


# ---------------------------------------------------------------------------
# diff_files tests
# ---------------------------------------------------------------------------

class TestDiffFiles(unittest.TestCase):

    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.tmpdir)

    def _write_json(self, filename, data):
        path = os.path.join(self.tmpdir, filename)
        with open(path, 'w') as f:
            json.dump(data, f)
        return path

    def test_diff_two_files(self):
        before_data = make_state(economy=make_economy({'alice': 10}))
        after_data = make_state(economy=make_economy({'alice': 20}))
        f1 = self._write_json('before.json', before_data)
        f2 = self._write_json('after.json', after_data)
        diff = diff_files(f1, f2)
        self.assertEqual(diff['economy']['balance_changes']['alice'], 10)

    def test_diff_two_directories(self):
        """diff_files with directory paths merges all JSON files."""
        dir_before = os.path.join(self.tmpdir, 'before')
        dir_after = os.path.join(self.tmpdir, 'after')
        os.makedirs(dir_before)
        os.makedirs(dir_after)

        # Write split state files
        with open(os.path.join(dir_before, 'economy.json'), 'w') as f:
            json.dump(make_economy({'alice': 10}), f)
        with open(os.path.join(dir_after, 'economy.json'), 'w') as f:
            json.dump(make_economy({'alice': 30}), f)

        diff = diff_files(dir_before, dir_after)
        self.assertEqual(diff['economy']['balance_changes']['alice'], 20)

    def test_file_not_found_raises(self):
        with self.assertRaises((FileNotFoundError, IOError, OSError)):
            diff_files('/nonexistent/before.json', '/nonexistent/after.json')


# ---------------------------------------------------------------------------
# Integration: actual state files (if available)
# ---------------------------------------------------------------------------

class TestActualStateFiles(unittest.TestCase):

    STATE_DIR = os.path.join(os.path.dirname(__file__), '..', 'state')

    def test_state_files_exist(self):
        """Sanity check that state dir exists."""
        self.assertTrue(os.path.isdir(self.STATE_DIR))

    def test_diff_identical_actual_state(self):
        """Diff the actual state against itself — should produce no changes."""
        state_dir = self.STATE_DIR
        diff = diff_files(state_dir, state_dir)
        self.assertEqual(diff['economy']['balance_changes'], {})
        self.assertEqual(diff['players']['joined'], [])
        self.assertEqual(diff['players']['left'], [])
        self.assertEqual(diff['movement']['zone_transitions'], [])

    def test_narrate_actual_state_no_crash(self):
        """Narrating a no-op diff on real state should not crash."""
        state_dir = self.STATE_DIR
        diff = diff_files(state_dir, state_dir)
        narrative = narrate_diff(diff)
        self.assertIsInstance(narrative, str)
        self.assertGreater(len(narrative), 0)


if __name__ == '__main__':
    unittest.main()
