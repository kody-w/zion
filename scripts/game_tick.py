#!/usr/bin/env python3
"""Run one game tick: advance world time, weather, seasons, plant growth."""
import json
import sys
import time
import random
import math
import os as _os
sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))
from economy_engine import (
    apply_wealth_tax as _apply_wealth_tax,
    process_structure_maintenance as _process_structure_maintenance,
    distribute_ubi as _distribute_ubi_ledger,
    get_ubi_eligible_citizens as _get_ubi_eligible_citizens,
)


def calculate_day_phase(world_time):
    """
    Calculate day phase based on world time.

    24-minute cycle (1440 seconds):
    - dawn: 0-360 (0-6 hours)
    - day: 360-1080 (6-18 hours)
    - dusk: 1080-1260 (18-21 hours)
    - night: 1260-1440 (21-24 hours)

    Args:
        world_time: seconds since world epoch

    Returns:
        One of 'dawn', 'day', 'dusk', 'night'
    """
    cycle_position = world_time % 1440

    if cycle_position < 360:
        return 'dawn'
    elif cycle_position < 1080:
        return 'day'
    elif cycle_position < 1260:
        return 'dusk'
    else:
        return 'night'


def generate_weather(seed):
    """
    Generate weather based on seed for determinism.

    Args:
        seed: integer seed for random number generator

    Returns:
        One of 'clear', 'cloudy', 'rain', 'storm', 'snow', 'fog'
    """
    rng = random.Random(seed)
    weather_types = ['clear', 'cloudy', 'rain', 'storm', 'snow', 'fog']
    weights = [40, 30, 15, 5, 5, 5]  # Probabilities (%)

    return rng.choices(weather_types, weights=weights)[0]


def calculate_season(real_timestamp):
    """
    Calculate season based on real timestamp.

    Cycles every 4 weeks from epoch:
    - Week 0: spring
    - Week 1: summer
    - Week 2: autumn
    - Week 3: winter

    Args:
        real_timestamp: Unix timestamp

    Returns:
        One of 'spring', 'summer', 'autumn', 'winter'
    """
    seconds_per_week = 7 * 24 * 60 * 60
    four_weeks = 4 * seconds_per_week

    cycle_position = real_timestamp % four_weeks
    week_in_cycle = int(cycle_position / seconds_per_week)

    seasons = ['spring', 'summer', 'autumn', 'winter']
    return seasons[week_in_cycle]


def advance_plant_growth(gardens, delta_seconds):
    """
    Advance plant growth based on time delta.

    Each plant's growthStage advances toward 1.0 based on growthTime.

    Args:
        gardens: dict of garden plots {plot_id: {plants: [...]}}
        delta_seconds: time elapsed since last tick

    Returns:
        Updated gardens dict
    """
    updated_gardens = json.loads(json.dumps(gardens))  # Deep copy

    for plot_id, plot_data in updated_gardens.items():
        if 'plants' not in plot_data:
            continue

        for plant in plot_data['plants']:
            if 'growthStage' not in plant:
                plant['growthStage'] = 0.0

            if 'growthTime' not in plant:
                plant['growthTime'] = 3600  # Default 1 hour to full growth

            if plant['growthStage'] < 1.0:
                growth_rate = 1.0 / plant['growthTime']  # Stage per second
                plant['growthStage'] = min(1.0, plant['growthStage'] + (growth_rate * delta_seconds))

    return updated_gardens


def respawn_resources(state, delta_seconds):
    """
    Respawn depleted resources over time.

    Args:
        state: game state dict
        delta_seconds: time elapsed since last tick

    Returns:
        Updated state with respawned resources
    """
    updated_state = json.loads(json.dumps(state))  # Deep copy

    if 'resources' not in updated_state:
        updated_state['resources'] = {}

    # Track depleted resources and respawn them
    for zone_id, zone_data in updated_state.get('zones', {}).items():
        if 'resources' not in zone_data:
            zone_data['resources'] = []

        for resource in zone_data['resources']:
            if 'depleted' in resource and resource['depleted']:
                # Check respawn timer
                if 'respawnTime' not in resource:
                    resource['respawnTime'] = 300  # Default 5 minutes

                if 'depletedAt' not in resource:
                    resource['depletedAt'] = 0

                time_depleted = delta_seconds
                if time_depleted >= resource['respawnTime']:
                    resource['depleted'] = False
                    resource.pop('depletedAt', None)
                    resource['quantity'] = resource.get('maxQuantity', 10)

    return updated_state


TREASURY_ID = 'TREASURY'
BASE_UBI_AMOUNT = 5
WEALTH_TAX_THRESHOLD = 500
WEALTH_TAX_RATE = 0.02


def _get_ubi_eligible(economy, current_time):
    """Find players eligible for UBI: anyone with a balance entry, excluding system accounts."""
    eligible = []
    for pid in economy.get('balances', {}):
        if pid in (TREASURY_ID, 'SYSTEM'):
            continue
        eligible.append(pid)
    return eligible


def _distribute_ubi(state):
    """
    Distribute UBI from TREASURY once per game day (every 1440 worldTime units).

    Delegates to economy_engine.distribute_ubi for the authoritative ledger
    entries (type 'ubi_distribution'), then mirrors results into the
    'transactions' list for backward compatibility with existing API consumers.

    Also applies wealth tax (§6.4.6) and structure maintenance (§6.5.1) at the
    game-day boundary, in that order, before UBI distribution.
    """
    economy = state.get('economy', {})
    if 'balances' not in economy:
        economy['balances'] = {}
    if 'transactions' not in economy:
        economy['transactions'] = []
    if 'ledger' not in economy:
        economy['ledger'] = []

    # Initialize TREASURY if missing
    if TREASURY_ID not in economy['balances']:
        economy['balances'][TREASURY_ID] = 0

    # Check game-day boundary: distribute UBI once per game day (1440 worldTime units)
    current_day = int(state.get('worldTime', 0) / 1440)
    last_ubi_day = state.get('_lastUbiDay', -1)

    if current_day <= last_ubi_day:
        return  # Already distributed this game day

    # Mark day on state (economy_engine also tracks _lastUbiDay on the economy dict)
    state['_lastUbiDay'] = current_day

    ts_wt = time.time()

    # 1. Apply wealth tax (§6.4.6): 2% on balances above 500
    economy = _apply_wealth_tax(economy, timestamp=ts_wt)
    # Mirror wealth tax ledger entries into transactions for backward compat
    for entry in economy.get('ledger', []):
        if entry.get('type') == 'wealth_tax' and entry.get('timestamp') == ts_wt:
            economy['transactions'].append({
                'type': 'wealth_tax',
                'from': entry['user'],
                'amount': entry['amount'],
                'timestamp': ts_wt,
            })

    # 2. Structure maintenance (§6.5.1): 1 Spark/day per structure (SYSTEM sink)
    structures = state.get('structures', {})
    if structures:
        economy, to_remove = _process_structure_maintenance(
            economy, structures, timestamp=ts_wt
        )
        for sid in to_remove:
            structures.pop(sid, None)
        # Mirror maintenance ledger entries into transactions for backward compat
        for entry in economy.get('ledger', []):
            if entry.get('type') == 'structure_maintenance' and entry.get('timestamp') == ts_wt:
                economy['transactions'].append({
                    'type': 'maintenance',
                    'from': entry['user'],
                    'amount': entry['amount'],
                    'structureId': entry['structureId'],
                    'timestamp': ts_wt,
                })

    # 3. UBI distribution (§6.4.4): delegate to economy_engine.distribute_ubi
    #    This creates authoritative 'ubi_distribution' ledger entries and
    #    enforces the idempotency guard via economy['_lastUbiDay'].
    ts_ubi = time.time()
    pre_ledger_len = len(economy.get('ledger', []))
    economy = _distribute_ubi_ledger(economy, current_day, timestamp=ts_ubi)
    # Mirror new ubi_distribution ledger entries into transactions for backward compat
    for entry in economy.get('ledger', [])[pre_ledger_len:]:
        if entry.get('type') == 'ubi_distribution':
            economy['transactions'].append({
                'type': 'ubi_payout',
                'to': entry['user'],
                'amount': entry['amount'],
                'timestamp': ts_ubi,
            })

    state['economy'] = economy


def decay_pet_states(pets_data, delta_seconds):
    """
    Advance pet hunger/mood decay over time.

    Args:
        pets_data: dict with 'playerPets' mapping playerId -> pet object
        delta_seconds: time elapsed since last tick

    Returns:
        Updated pets_data dict
    """
    updated = json.loads(json.dumps(pets_data))  # Deep copy
    player_pets = updated.get('playerPets', {})

    minutes_elapsed = delta_seconds / 60.0
    hunger_decay = 1.0  # per minute
    mood_decay = 0.5    # per minute
    hunger_threshold_content = 60

    for pid, pet in player_pets.items():
        if not isinstance(pet, dict):
            continue

        # Hunger increases over time
        pet['hunger'] = min(100, pet.get('hunger', 0) + hunger_decay * minutes_elapsed)

        # Mood decays faster when hungry
        effective_mood_decay = mood_decay * minutes_elapsed
        if pet.get('hunger', 0) > hunger_threshold_content:
            effective_mood_decay *= 2
        pet['mood'] = max(0, pet.get('mood', 100) - effective_mood_decay)

        # Passive bonding when pet is happy and fed
        if pet.get('hunger', 0) < 30 and pet.get('mood', 0) > 50:
            pet['bond'] = min(100, pet.get('bond', 0) + 0.1 * minutes_elapsed)

        pet['last_updated'] = time.time()

    updated['playerPets'] = player_pets
    return updated


def load_state_file(filepath, default):
    """
    Load a JSON state file, returning default if missing or invalid.

    Args:
        filepath: path to JSON file
        default: default value to return on failure

    Returns:
        Parsed JSON or default
    """
    if filepath is None:
        return None
    try:
        with open(filepath, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def tick(state_json):
    """
    Run one game tick: advance time, weather, seasons, growth.

    Args:
        state_json: JSON string of game state

    Returns:
        Updated state JSON string
    """
    state = json.loads(state_json)

    # Initialize world time if not present
    if 'worldTime' not in state:
        state['worldTime'] = 0

    if 'lastTickAt' not in state:
        state['lastTickAt'] = time.time()

    # Calculate delta
    current_time = time.time()
    delta_seconds = current_time - state['lastTickAt']

    # Advance world time (accelerated: 1 real second = 1 game second)
    state['worldTime'] += delta_seconds

    # Update phase
    state['dayPhase'] = calculate_day_phase(state['worldTime'])

    # Update weather (use world time as seed for determinism)
    weather_seed = int(state['worldTime'] / 300)  # Change every 5 minutes
    state['weather'] = generate_weather(weather_seed)

    # Update season
    state['season'] = calculate_season(current_time)

    # Advance plant growth
    if 'gardens' in state:
        state['gardens'] = advance_plant_growth(state['gardens'], delta_seconds)

    # Respawn resources
    state = respawn_resources(state, delta_seconds)

    # Distribute UBI from TREASURY (once per game day)
    if 'economy' in state:
        _distribute_ubi(state)

    # Decay pet states
    if 'pets' in state:
        state['pets'] = decay_pet_states(state['pets'], delta_seconds)

    # Update last tick time
    state['lastTickAt'] = current_time

    return json.dumps(state, indent=2)


def main():
    """Main entry point: read state, run tick, output updated state."""
    # Read world state
    input_data = None
    if len(sys.argv) > 1:
        try:
            with open(sys.argv[1], 'r') as f:
                input_data = f.read()
        except FileNotFoundError:
            print(f"Error: File not found: {sys.argv[1]}", file=sys.stderr)
            sys.exit(1)
        except Exception as e:
            print(f"Error reading file: {e}", file=sys.stderr)
            sys.exit(1)
    else:
        input_data = sys.stdin.read()

    # Read gardens state if provided
    gardens_data = None
    if len(sys.argv) > 2:
        try:
            with open(sys.argv[2], 'r') as f:
                gardens_data = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            gardens_data = {}

    # Read economy state if provided (argv[3])
    economy_data = None
    if len(sys.argv) > 3:
        try:
            with open(sys.argv[3], 'r') as f:
                economy_data = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            economy_data = {}

    # Read guilds state if provided (argv[4])
    guilds_data = load_state_file(
        sys.argv[4] if len(sys.argv) > 4 else None,
        {'guilds': [], 'invites': [], 'guildMessages': [],
         'nextGuildId': 1, 'nextInviteId': 1, 'nextMessageId': 1}
    )

    # Read mentoring state if provided (argv[5])
    mentoring_data = load_state_file(
        sys.argv[5] if len(sys.argv) > 5 else None,
        {'playerSkills': {}, 'mentorships': {},
         'mentorshipOffers': {}, 'npcLessons': {}}
    )

    # Read pets state if provided (argv[6])
    pets_data = load_state_file(
        sys.argv[6] if len(sys.argv) > 6 else None,
        {'playerPets': {}}
    )

    # Merge all state sections into world state for processing
    try:
        state = json.loads(input_data)
        if gardens_data is not None:
            state['gardens'] = gardens_data
        if economy_data is not None:
            state['economy'] = economy_data
        if guilds_data is not None:
            state['guilds'] = guilds_data
        if mentoring_data is not None:
            state['mentoring'] = mentoring_data
        if pets_data is not None:
            state['pets'] = pets_data

        updated_state = tick(json.dumps(state))
        updated = json.loads(updated_state)

        # Separate sub-states back out for envelope output
        gardens_out = updated.pop('gardens', None)
        economy_out = updated.pop('economy', None)
        guilds_out = updated.pop('guilds', None)
        mentoring_out = updated.pop('mentoring', None)
        pets_out = updated.pop('pets', None)

        # Remove internal tracking fields from world output
        updated.pop('_lastUbiDay', None)

        output = {'world': updated}
        if gardens_out is not None:
            output['gardens'] = gardens_out
        if economy_out is not None:
            output['economy'] = economy_out
        if guilds_out is not None:
            output['guilds'] = guilds_out
        if mentoring_out is not None:
            output['mentoring'] = mentoring_out
        if pets_out is not None:
            output['pets'] = pets_out

        print(json.dumps(output, indent=2))
        sys.exit(0)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error processing tick: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
