#!/usr/bin/env python3
"""Run one game tick: advance world time, weather, seasons, plant growth."""
import json
import sys
import time
import random
import math


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

    # Update last tick time
    state['lastTickAt'] = current_time

    return json.dumps(state, indent=2)


def main():
    """Main entry point: read state, run tick, output updated state."""
    # Read input
    input_data = None
    if len(sys.argv) > 1:
        # Read from file
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
        # Read from stdin
        input_data = sys.stdin.read()

    # Parse and process
    try:
        updated_state = tick(input_data)
        print(updated_state)
        sys.exit(0)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error processing tick: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
