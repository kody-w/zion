#!/usr/bin/env python3
"""Generate soul files for the Founding Hundred NPCs.

Each soul contains archetype-specific intentions in the format
required by intentions.js:
  {id, trigger: {condition, params}, action: {type, params},
   priority, ttl, cooldown, max_fires}

All config is loaded from state/config/souls.json (§8.8).
Greetings are generated fresh by the emergence engine.
"""
import json
import os
import sys

# Lazy emergence import
_emergence = None

def _get_emergence():
    global _emergence
    if _emergence is not None:
        return _emergence
    try:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from seed_emergence import get_emergence
        _emergence = get_emergence()
    except ImportError:
        _emergence = None
    return _emergence


sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from load_config import load_config, get_soul_archetype

_souls_cfg = load_config('souls')


def _make_greeting_text(archetype):
    """Generate a unique greeting using emergence, or return a simple fallback."""
    em = _get_emergence()
    if em:
        return em.soul_greeting(archetype)
    return "Welcome to Zion."


def _make_personality_text(trait):
    """Generate a personality-specific phrase."""
    em = _get_emergence()
    if em:
        return em.personality_greeting(trait)
    return ""


def _make_idle_text(archetype):
    """Generate an idle/ambient say phrase for archetypes that speak on timer."""
    em = _get_emergence()
    if em:
        return em.soul_idle(archetype)
    return "..."


def _build_intentions(archetype, personality):
    """Build the intentions list for an NPC soul."""
    greeting_text = _make_greeting_text(archetype)

    if personality:
        trait = personality[0]
        extra = _make_personality_text(trait)
        if extra:
            greeting_text = greeting_text + " " + extra

    greet_cooldown = _souls_cfg.get('greet_cooldown', 30)
    greet_distance = _souls_cfg.get('greet_distance', 12)
    greet_max_fires = _souls_cfg.get('greet_max_fires', 100)

    intentions = [
        {"id": "greet",
         "trigger": {"condition": "player_nearby", "params": {"distance_lt": greet_distance}},
         "action": {"type": "say", "params": {"text": greeting_text}},
         "priority": 5, "ttl": 86400, "cooldown": greet_cooldown, "max_fires": greet_max_fires}
    ]

    timer_cfg = get_soul_archetype(archetype)
    interval = timer_cfg.get('interval', 60)

    if timer_cfg.get('action_type') == 'emote':
        emote = timer_cfg.get('emote', 'wave')
        max_fires = _souls_cfg.get('timer_max_fires_emote', 200)
        intentions.append({
            "id": emote,
            "trigger": {"condition": "timer", "params": {"interval_seconds": interval}},
            "action": {"type": "emote", "params": {"emoteType": emote}},
            "priority": 3, "ttl": 86400, "cooldown": interval, "max_fires": max_fires
        })
    else:
        idle_text = _make_idle_text(timer_cfg.get('idle_key', archetype))
        action_id = {"merchant": "hawk", "teacher": "lecture",
                     "storyteller": "narrate"}.get(archetype, "speak")
        max_fires = _souls_cfg.get('timer_max_fires_say', 100)
        intentions.append({
            "id": action_id,
            "trigger": {"condition": "timer", "params": {"interval_seconds": interval}},
            "action": {"type": "say", "params": {"text": idle_text}},
            "priority": 2, "ttl": 86400, "cooldown": interval, "max_fires": max_fires
        })

    return intentions


def generate_soul(agent):
    archetype = agent["archetype"]
    personality = agent.get("personality", [])
    intentions = _build_intentions(archetype, personality)

    soul = {
        "id": agent["id"],
        "name": agent["name"],
        "archetype": archetype,
        "personality": personality,
        "home_zone": agent.get("position", {}).get("zone", "nexus"),
        "intentions": intentions,
        "memory": {
            "greetings_given": 0,
            "tasks_completed": 0,
            "favorite_spot": agent.get("position", {})
        }
    }
    return soul


def main():
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    agents_path = os.path.join(base, "state", "founding", "agents.json")
    souls_dir = os.path.join(base, "state", "souls")
    os.makedirs(souls_dir, exist_ok=True)

    with open(agents_path) as f:
        agents = json.load(f)["agents"]

    for agent in agents:
        soul = generate_soul(agent)
        path = os.path.join(souls_dir, f"{agent['id']}.json")
        with open(path, "w") as f:
            json.dump(soul, f, indent=2)

    print(f"Generated {len(agents)} soul files in {souls_dir}")


if __name__ == "__main__":
    main()
