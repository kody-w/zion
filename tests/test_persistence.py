#!/usr/bin/env python3
"""
Tests for state persistence of Guilds, Mentoring, and Pets systems.

Covers:
- Initial state file structure validation
- game_tick.py load_state_file helper
- game_tick.py decay_pet_states function
- game_tick.py tick() integration with guilds/mentoring/pets
- game_tick.py main() envelope output for all three systems
"""
import unittest
import sys
import os
import json
import tempfile

# Add scripts directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))

from game_tick import (
    load_state_file,
    decay_pet_states,
    tick,
)

# Path to state directory
STATE_DIR = os.path.join(os.path.dirname(__file__), '..', 'state')


# ---------------------------------------------------------------------------
# State file structure tests
# ---------------------------------------------------------------------------

class TestStateFileStructure(unittest.TestCase):
    """Verify the initial JSON state files have the correct schema."""

    def _load(self, filename):
        path = os.path.join(STATE_DIR, filename)
        with open(path, 'r') as f:
            return json.load(f)

    def test_guilds_json_exists(self):
        path = os.path.join(STATE_DIR, 'guilds.json')
        self.assertTrue(os.path.exists(path), 'state/guilds.json must exist')

    def test_mentoring_json_exists(self):
        path = os.path.join(STATE_DIR, 'mentoring.json')
        self.assertTrue(os.path.exists(path), 'state/mentoring.json must exist')

    def test_pets_json_exists(self):
        path = os.path.join(STATE_DIR, 'pets.json')
        self.assertTrue(os.path.exists(path), 'state/pets.json must exist')

    def test_guilds_json_structure(self):
        data = self._load('guilds.json')
        self.assertIn('guilds', data)
        self.assertIn('invites', data)
        self.assertIn('guildMessages', data)
        self.assertIn('nextGuildId', data)
        self.assertIn('nextInviteId', data)
        self.assertIn('nextMessageId', data)
        self.assertIsInstance(data['guilds'], list)
        self.assertIsInstance(data['invites'], list)
        self.assertIsInstance(data['guildMessages'], list)
        self.assertIsInstance(data['nextGuildId'], int)
        self.assertIsInstance(data['nextInviteId'], int)
        self.assertIsInstance(data['nextMessageId'], int)

    def test_guilds_json_initial_empty_collections(self):
        data = self._load('guilds.json')
        self.assertEqual(len(data['guilds']), 0)
        self.assertEqual(len(data['invites']), 0)
        self.assertEqual(len(data['guildMessages']), 0)

    def test_guilds_json_counters_start_at_one(self):
        data = self._load('guilds.json')
        self.assertEqual(data['nextGuildId'], 1)
        self.assertEqual(data['nextInviteId'], 1)
        self.assertEqual(data['nextMessageId'], 1)

    def test_mentoring_json_structure(self):
        data = self._load('mentoring.json')
        self.assertIn('playerSkills', data)
        self.assertIn('mentorships', data)
        self.assertIn('mentorshipOffers', data)
        self.assertIn('npcLessons', data)
        self.assertIsInstance(data['playerSkills'], dict)
        self.assertIsInstance(data['mentorships'], dict)
        self.assertIsInstance(data['mentorshipOffers'], dict)
        self.assertIsInstance(data['npcLessons'], dict)

    def test_mentoring_json_initial_empty_collections(self):
        data = self._load('mentoring.json')
        self.assertEqual(len(data['playerSkills']), 0)
        self.assertEqual(len(data['mentorships']), 0)
        self.assertEqual(len(data['mentorshipOffers']), 0)
        self.assertEqual(len(data['npcLessons']), 0)

    def test_pets_json_structure(self):
        data = self._load('pets.json')
        self.assertIn('playerPets', data)
        self.assertIsInstance(data['playerPets'], dict)

    def test_pets_json_initial_empty(self):
        data = self._load('pets.json')
        self.assertEqual(len(data['playerPets']), 0)


# ---------------------------------------------------------------------------
# load_state_file helper tests
# ---------------------------------------------------------------------------

class TestLoadStateFile(unittest.TestCase):
    """Test the load_state_file helper function."""

    def test_load_valid_json_file(self):
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump({'key': 'value', 'count': 42}, f)
            fname = f.name
        try:
            result = load_state_file(fname, {})
            self.assertEqual(result['key'], 'value')
            self.assertEqual(result['count'], 42)
        finally:
            os.unlink(fname)

    def test_load_missing_file_returns_default(self):
        result = load_state_file('/nonexistent/path/state.json', {'default': True})
        self.assertEqual(result, {'default': True})

    def test_load_invalid_json_returns_default(self):
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            f.write('not valid json {{{{')
            fname = f.name
        try:
            result = load_state_file(fname, {'fallback': 99})
            self.assertEqual(result['fallback'], 99)
        finally:
            os.unlink(fname)

    def test_load_none_path_returns_none(self):
        result = load_state_file(None, {'default': True})
        self.assertIsNone(result)

    def test_load_guilds_default(self):
        default = {'guilds': [], 'invites': [], 'guildMessages': [],
                   'nextGuildId': 1, 'nextInviteId': 1, 'nextMessageId': 1}
        result = load_state_file('/no/such/file.json', default)
        self.assertEqual(result['guilds'], [])
        self.assertEqual(result['nextGuildId'], 1)

    def test_load_mentoring_default(self):
        default = {'playerSkills': {}, 'mentorships': {},
                   'mentorshipOffers': {}, 'npcLessons': {}}
        result = load_state_file('/no/such/file.json', default)
        self.assertIsInstance(result['playerSkills'], dict)

    def test_load_pets_default(self):
        default = {'playerPets': {}}
        result = load_state_file('/no/such/file.json', default)
        self.assertIsInstance(result['playerPets'], dict)


# ---------------------------------------------------------------------------
# decay_pet_states tests
# ---------------------------------------------------------------------------

class TestDecayPetStates(unittest.TestCase):
    """Test the decay_pet_states function."""

    def _make_pet(self, hunger=0, mood=100, bond=0):
        return {
            'id': 'pet_test_001',
            'type': 'cat',
            'name': 'Whiskers',
            'hunger': hunger,
            'mood': mood,
            'bond': bond,
            'adopted_at': 1000000,
            'last_updated': 1000000
        }

    def test_hunger_increases_over_time(self):
        pets_data = {'playerPets': {'player1': self._make_pet(hunger=0)}}
        # 60 seconds = 1 minute, hunger_decay = 1 per minute
        result = decay_pet_states(pets_data, 60)
        self.assertAlmostEqual(result['playerPets']['player1']['hunger'], 1.0, places=2)

    def test_hunger_capped_at_100(self):
        pets_data = {'playerPets': {'player1': self._make_pet(hunger=99)}}
        # 60 minutes should not exceed 100
        result = decay_pet_states(pets_data, 3600)
        self.assertEqual(result['playerPets']['player1']['hunger'], 100)

    def test_mood_decreases_over_time(self):
        pets_data = {'playerPets': {'player1': self._make_pet(hunger=0, mood=100)}}
        # 60 seconds = 1 minute, mood_decay = 0.5 per minute
        result = decay_pet_states(pets_data, 60)
        self.assertAlmostEqual(result['playerPets']['player1']['mood'], 99.5, places=2)

    def test_mood_capped_at_zero(self):
        pets_data = {'playerPets': {'player1': self._make_pet(hunger=100, mood=1)}}
        # Very hungry pet, mood decays faster; many minutes should floor at 0
        result = decay_pet_states(pets_data, 3600)
        self.assertGreaterEqual(result['playerPets']['player1']['mood'], 0)
        self.assertEqual(result['playerPets']['player1']['mood'], 0)

    def test_mood_decays_faster_when_hungry(self):
        """Mood should decay at 2x rate when hunger > 60."""
        # High hunger pet vs low hunger pet, same time delta
        pets_data = {
            'playerPets': {
                'hungry_player': self._make_pet(hunger=70, mood=100),
                'fed_player': self._make_pet(hunger=10, mood=100),
            }
        }
        result = decay_pet_states(pets_data, 60)
        hungry_mood = result['playerPets']['hungry_player']['mood']
        fed_mood = result['playerPets']['fed_player']['mood']
        # Hungry pet should lose more mood than fed pet
        self.assertLess(hungry_mood, fed_mood)

    def test_passive_bonding_when_happy_and_fed(self):
        """Bond increases when hunger < 30 and mood > 50."""
        pets_data = {'playerPets': {'player1': self._make_pet(hunger=10, mood=80, bond=0)}}
        result = decay_pet_states(pets_data, 60)  # 1 minute
        self.assertGreater(result['playerPets']['player1']['bond'], 0)

    def test_no_bonding_when_hungry(self):
        """Bond should not increase when pet is hungry (hunger >= 30)."""
        pets_data = {'playerPets': {'player1': self._make_pet(hunger=40, mood=80, bond=0)}}
        result = decay_pet_states(pets_data, 60)
        self.assertEqual(result['playerPets']['player1']['bond'], 0)

    def test_no_bonding_when_unhappy(self):
        """Bond should not increase when mood <= 50."""
        pets_data = {'playerPets': {'player1': self._make_pet(hunger=10, mood=40, bond=0)}}
        result = decay_pet_states(pets_data, 60)
        self.assertEqual(result['playerPets']['player1']['bond'], 0)

    def test_bond_capped_at_100(self):
        pets_data = {'playerPets': {'player1': self._make_pet(hunger=0, mood=100, bond=99.9)}}
        result = decay_pet_states(pets_data, 3600 * 100)
        self.assertLessEqual(result['playerPets']['player1']['bond'], 100)

    def test_zero_delta_no_change(self):
        """Zero time elapsed should not change pet stats."""
        pets_data = {'playerPets': {'player1': self._make_pet(hunger=50, mood=70, bond=30)}}
        result = decay_pet_states(pets_data, 0)
        self.assertAlmostEqual(result['playerPets']['player1']['hunger'], 50, places=5)
        self.assertAlmostEqual(result['playerPets']['player1']['mood'], 70, places=5)
        self.assertAlmostEqual(result['playerPets']['player1']['bond'], 30, places=5)

    def test_multiple_pets_updated(self):
        pets_data = {
            'playerPets': {
                'player1': self._make_pet(hunger=0, mood=100),
                'player2': self._make_pet(hunger=0, mood=100),
            }
        }
        result = decay_pet_states(pets_data, 60)
        self.assertAlmostEqual(result['playerPets']['player1']['hunger'], 1.0, places=2)
        self.assertAlmostEqual(result['playerPets']['player2']['hunger'], 1.0, places=2)

    def test_empty_pets_no_error(self):
        pets_data = {'playerPets': {}}
        result = decay_pet_states(pets_data, 60)
        self.assertEqual(result['playerPets'], {})

    def test_missing_player_pets_key(self):
        """Should handle missing playerPets key gracefully."""
        pets_data = {}
        result = decay_pet_states(pets_data, 60)
        self.assertIn('playerPets', result)
        self.assertEqual(result['playerPets'], {})

    def test_last_updated_is_set(self):
        pets_data = {'playerPets': {'player1': self._make_pet()}}
        result = decay_pet_states(pets_data, 60)
        self.assertIn('last_updated', result['playerPets']['player1'])
        self.assertGreater(result['playerPets']['player1']['last_updated'], 0)

    def test_original_data_not_mutated(self):
        """decay_pet_states should not mutate its input."""
        original_pet = self._make_pet(hunger=0, mood=100)
        pets_data = {'playerPets': {'player1': original_pet}}
        _ = decay_pet_states(pets_data, 60)
        # Original should be unchanged (deep copy check)
        self.assertEqual(original_pet['hunger'], 0)
        self.assertEqual(original_pet['mood'], 100)


# ---------------------------------------------------------------------------
# tick() integration tests — guilds/mentoring/pets pass-through
# ---------------------------------------------------------------------------

class TestTickWithNewSystems(unittest.TestCase):
    """Test that tick() correctly passes guilds, mentoring, and pets through."""

    def _base_state(self):
        return {
            'worldTime': 720,
            'lastTickAt': 1000.0,
        }

    def test_tick_passes_guilds_through(self):
        """tick() should preserve guild data in state."""
        state = self._base_state()
        state['guilds'] = {
            'guilds': [{'id': 1, 'name': 'Test Guild', 'tag': 'TST'}],
            'invites': [],
            'guildMessages': [],
            'nextGuildId': 2,
            'nextInviteId': 1,
            'nextMessageId': 1,
        }
        result = json.loads(tick(json.dumps(state)))
        self.assertIn('guilds', result)
        self.assertEqual(len(result['guilds']['guilds']), 1)
        self.assertEqual(result['guilds']['guilds'][0]['name'], 'Test Guild')

    def test_tick_passes_mentoring_through(self):
        """tick() should preserve mentoring data in state."""
        state = self._base_state()
        state['mentoring'] = {
            'playerSkills': {
                'player_abc': {
                    'gardening': {'xp': 150, 'level': 1, 'levelName': 'Sprout'}
                }
            },
            'mentorships': {},
            'mentorshipOffers': {},
            'npcLessons': {},
        }
        result = json.loads(tick(json.dumps(state)))
        self.assertIn('mentoring', result)
        self.assertIn('player_abc', result['mentoring']['playerSkills'])
        gardening = result['mentoring']['playerSkills']['player_abc']['gardening']
        self.assertEqual(gardening['xp'], 150)

    def test_tick_decays_pet_states(self):
        """tick() should run pet decay on the pets sub-state."""
        import time
        state = self._base_state()
        state['lastTickAt'] = time.time() - 60  # 1 minute ago
        state['pets'] = {
            'playerPets': {
                'player_xyz': {
                    'id': 'pet_001',
                    'type': 'cat',
                    'name': 'Mittens',
                    'hunger': 0,
                    'mood': 100,
                    'bond': 0,
                    'adopted_at': 1000000,
                    'last_updated': 1000000,
                }
            }
        }
        result = json.loads(tick(json.dumps(state)))
        self.assertIn('pets', result)
        pet = result['pets']['playerPets']['player_xyz']
        # After ~60 seconds, hunger should have increased
        self.assertGreater(pet['hunger'], 0)

    def test_tick_with_no_new_systems_still_works(self):
        """tick() should work normally when guilds/mentoring/pets are absent."""
        state = self._base_state()
        result = json.loads(tick(json.dumps(state)))
        self.assertIn('worldTime', result)
        self.assertIn('dayPhase', result)
        self.assertNotIn('guilds', result)
        self.assertNotIn('mentoring', result)
        self.assertNotIn('pets', result)

    def test_tick_guilds_not_mutated_when_no_activity(self):
        """Guild counter values should be preserved unchanged through tick."""
        state = self._base_state()
        state['guilds'] = {
            'guilds': [],
            'invites': [],
            'guildMessages': [],
            'nextGuildId': 5,
            'nextInviteId': 3,
            'nextMessageId': 7,
        }
        result = json.loads(tick(json.dumps(state)))
        g = result['guilds']
        self.assertEqual(g['nextGuildId'], 5)
        self.assertEqual(g['nextInviteId'], 3)
        self.assertEqual(g['nextMessageId'], 7)

    def test_tick_mentoring_preserves_multiple_players(self):
        """All player skill records should survive a tick."""
        state = self._base_state()
        state['mentoring'] = {
            'playerSkills': {
                'alice': {'crafting': {'xp': 300, 'level': 2, 'levelName': 'Journeyman'}},
                'bob': {'exploration': {'xp': 50, 'level': 0, 'levelName': 'Wanderer'}},
            },
            'mentorships': {'m_001': {'id': 'm_001', 'mentorId': 'alice',
                                       'menteeId': 'bob', 'skill': 'crafting',
                                       'stepsCompleted': 2, 'totalSteps': 5}},
            'mentorshipOffers': {},
            'npcLessons': {},
        }
        result = json.loads(tick(json.dumps(state)))
        skills = result['mentoring']['playerSkills']
        self.assertIn('alice', skills)
        self.assertIn('bob', skills)
        self.assertEqual(skills['alice']['crafting']['xp'], 300)
        mentorships = result['mentoring']['mentorships']
        self.assertIn('m_001', mentorships)
        self.assertEqual(mentorships['m_001']['stepsCompleted'], 2)


# ---------------------------------------------------------------------------
# main() envelope output integration tests
# ---------------------------------------------------------------------------

class TestMainEnvelopeOutput(unittest.TestCase):
    """Test that main() produces correct envelope output for all new state files."""

    def _run_tick_with_files(self, world, gardens=None, economy=None,
                              guilds=None, mentoring=None, pets=None):
        """
        Helper: write temp state files, run game_tick.main() via subprocess,
        return parsed JSON output.
        """
        import subprocess
        files = []

        def write_temp(data):
            f = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
            json.dump(data, f)
            f.close()
            files.append(f.name)
            return f.name

        try:
            world_file = write_temp(world)
            args = [sys.executable,
                    os.path.join(os.path.dirname(__file__), '..', 'scripts', 'game_tick.py'),
                    world_file]

            if gardens is not None or economy is not None or guilds is not None \
                    or mentoring is not None or pets is not None:
                gardens_file = write_temp(gardens if gardens is not None else {})
                args.append(gardens_file)

                economy_file = write_temp(economy if economy is not None else {})
                args.append(economy_file)

                if guilds is not None or mentoring is not None or pets is not None:
                    guilds_file = write_temp(guilds if guilds is not None else
                                             {'guilds': [], 'invites': [],
                                              'guildMessages': [], 'nextGuildId': 1,
                                              'nextInviteId': 1, 'nextMessageId': 1})
                    args.append(guilds_file)

                    mentoring_file = write_temp(mentoring if mentoring is not None else
                                                {'playerSkills': {}, 'mentorships': {},
                                                 'mentorshipOffers': {}, 'npcLessons': {}})
                    args.append(mentoring_file)

                    pets_file = write_temp(pets if pets is not None else {'playerPets': {}})
                    args.append(pets_file)

            proc = subprocess.run(args, capture_output=True, text=True)
            self.assertEqual(proc.returncode, 0,
                             f"game_tick.py failed:\nstdout: {proc.stdout}\nstderr: {proc.stderr}")
            return json.loads(proc.stdout)
        finally:
            for f in files:
                try:
                    os.unlink(f)
                except OSError:
                    pass

    def _base_world(self):
        return {'worldTime': 720, 'lastTickAt': 1000.0}

    def test_output_contains_world_key(self):
        output = self._run_tick_with_files(self._base_world())
        self.assertIn('world', output)

    def test_output_contains_guilds_key_when_provided(self):
        guilds = {'guilds': [], 'invites': [], 'guildMessages': [],
                  'nextGuildId': 1, 'nextInviteId': 1, 'nextMessageId': 1}
        output = self._run_tick_with_files(
            self._base_world(), guilds=guilds
        )
        self.assertIn('guilds', output)

    def test_output_contains_mentoring_key_when_provided(self):
        mentoring = {'playerSkills': {}, 'mentorships': {},
                     'mentorshipOffers': {}, 'npcLessons': {}}
        output = self._run_tick_with_files(
            self._base_world(), mentoring=mentoring
        )
        self.assertIn('mentoring', output)

    def test_output_contains_pets_key_when_provided(self):
        pets = {'playerPets': {}}
        output = self._run_tick_with_files(
            self._base_world(), pets=pets
        )
        self.assertIn('pets', output)

    def test_guilds_data_preserved_in_output(self):
        guilds = {
            'guilds': [{'id': 1, 'name': 'The Builders', 'tag': 'BLD', 'type': 'guild'}],
            'invites': [],
            'guildMessages': [],
            'nextGuildId': 2,
            'nextInviteId': 1,
            'nextMessageId': 1,
        }
        output = self._run_tick_with_files(self._base_world(), guilds=guilds)
        out_guilds = output['guilds']
        self.assertEqual(len(out_guilds['guilds']), 1)
        self.assertEqual(out_guilds['guilds'][0]['name'], 'The Builders')
        self.assertEqual(out_guilds['nextGuildId'], 2)

    def test_mentoring_data_preserved_in_output(self):
        mentoring = {
            'playerSkills': {
                'player_test': {
                    'lore': {'xp': 200, 'level': 1, 'levelName': 'Student'}
                }
            },
            'mentorships': {},
            'mentorshipOffers': {},
            'npcLessons': {},
        }
        output = self._run_tick_with_files(self._base_world(), mentoring=mentoring)
        out_mentoring = output['mentoring']
        self.assertIn('player_test', out_mentoring['playerSkills'])
        self.assertEqual(out_mentoring['playerSkills']['player_test']['lore']['xp'], 200)

    def test_pets_data_in_output_has_player_pets(self):
        pets = {
            'playerPets': {
                'test_player': {
                    'id': 'pet_abc',
                    'type': 'fox',
                    'name': 'Foxy',
                    'hunger': 0,
                    'mood': 100,
                    'bond': 10,
                    'adopted_at': 1000000,
                    'last_updated': 1000000,
                }
            }
        }
        output = self._run_tick_with_files(self._base_world(), pets=pets)
        out_pets = output['pets']
        self.assertIn('playerPets', out_pets)
        self.assertIn('test_player', out_pets['playerPets'])

    def test_missing_state_files_use_defaults_gracefully(self):
        """If state files are missing, game_tick should use defaults and not crash."""
        import subprocess
        world_file = None
        try:
            with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
                json.dump(self._base_world(), f)
                world_file = f.name

            # Provide nonexistent paths for the extra files
            args = [
                sys.executable,
                os.path.join(os.path.dirname(__file__), '..', 'scripts', 'game_tick.py'),
                world_file,
                '/no/such/gardens.json',
                '/no/such/economy.json',
                '/no/such/guilds.json',
                '/no/such/mentoring.json',
                '/no/such/pets.json',
            ]
            proc = subprocess.run(args, capture_output=True, text=True)
            self.assertEqual(proc.returncode, 0,
                             f"Should handle missing files gracefully.\nstderr: {proc.stderr}")
            output = json.loads(proc.stdout)
            self.assertIn('world', output)
            # guilds/mentoring/pets should be present with defaults
            self.assertIn('guilds', output)
            self.assertIn('mentoring', output)
            self.assertIn('pets', output)
        finally:
            if world_file:
                try:
                    os.unlink(world_file)
                except OSError:
                    pass

    def test_no_world_key_in_guilds_output(self):
        """guilds output should not be nested inside 'world'."""
        guilds = {'guilds': [], 'invites': [], 'guildMessages': [],
                  'nextGuildId': 1, 'nextInviteId': 1, 'nextMessageId': 1}
        output = self._run_tick_with_files(self._base_world(), guilds=guilds)
        # 'guilds' should be a top-level key, not inside 'world'
        self.assertNotIn('guilds', output.get('world', {}))
        self.assertIn('guilds', output)

    def test_no_world_key_in_mentoring_output(self):
        """mentoring output should not be nested inside 'world'."""
        mentoring = {'playerSkills': {}, 'mentorships': {},
                     'mentorshipOffers': {}, 'npcLessons': {}}
        output = self._run_tick_with_files(self._base_world(), mentoring=mentoring)
        self.assertNotIn('mentoring', output.get('world', {}))
        self.assertIn('mentoring', output)

    def test_no_world_key_in_pets_output(self):
        """pets output should not be nested inside 'world'."""
        pets = {'playerPets': {}}
        output = self._run_tick_with_files(self._base_world(), pets=pets)
        self.assertNotIn('pets', output.get('world', {}))
        self.assertIn('pets', output)


if __name__ == '__main__':
    unittest.main()
