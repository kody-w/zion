#!/usr/bin/env python3
"""Generate soul files for the Founding Hundred NPCs.

Each soul contains archetype-specific intentions in the format
required by intentions.js:
  {id, trigger: {condition, params}, action: {type, params},
   priority, ttl, cooldown, max_fires}
"""
import json
import os

ARCHETYPE_INTENTIONS = {
    "gardener": [
        {"id": "greet", "trigger": {"condition": "player_nearby", "params": {"distance_lt": 12}},
         "action": {"type": "say", "params": {"text": "Welcome to the gardens! The soil is rich today."}},
         "priority": 5, "ttl": 86400, "cooldown": 30, "max_fires": 100},
        {"id": "tend", "trigger": {"condition": "timer", "params": {"interval_seconds": 60}},
         "action": {"type": "emote", "params": {"emoteType": "work"}},
         "priority": 3, "ttl": 86400, "cooldown": 60, "max_fires": 200}
    ],
    "builder": [
        {"id": "greet", "trigger": {"condition": "player_nearby", "params": {"distance_lt": 12}},
         "action": {"type": "say", "params": {"text": "Careful around here — we're building something great."}},
         "priority": 5, "ttl": 86400, "cooldown": 30, "max_fires": 100},
        {"id": "build", "trigger": {"condition": "timer", "params": {"interval_seconds": 90}},
         "action": {"type": "emote", "params": {"emoteType": "work"}},
         "priority": 3, "ttl": 86400, "cooldown": 90, "max_fires": 200}
    ],
    "merchant": [
        {"id": "greet", "trigger": {"condition": "player_nearby", "params": {"distance_lt": 12}},
         "action": {"type": "say", "params": {"text": "Looking to trade? I've got the finest goods in Zion."}},
         "priority": 5, "ttl": 86400, "cooldown": 25, "max_fires": 100},
        {"id": "hawk", "trigger": {"condition": "timer", "params": {"interval_seconds": 120}},
         "action": {"type": "say", "params": {"text": "Fresh supplies, fair prices!"}},
         "priority": 2, "ttl": 86400, "cooldown": 120, "max_fires": 100}
    ],
    "explorer": [
        {"id": "greet", "trigger": {"condition": "player_nearby", "params": {"distance_lt": 12}},
         "action": {"type": "say", "params": {"text": "Have you been to the far edges? There's so much to see."}},
         "priority": 5, "ttl": 86400, "cooldown": 30, "max_fires": 100},
        {"id": "wander", "trigger": {"condition": "timer", "params": {"interval_seconds": 45}},
         "action": {"type": "emote", "params": {"emoteType": "wave"}},
         "priority": 3, "ttl": 86400, "cooldown": 45, "max_fires": 200}
    ],
    "teacher": [
        {"id": "greet", "trigger": {"condition": "player_nearby", "params": {"distance_lt": 12}},
         "action": {"type": "say", "params": {"text": "Seeking knowledge? I can teach you the ways of Zion."}},
         "priority": 5, "ttl": 86400, "cooldown": 30, "max_fires": 100},
        {"id": "lecture", "trigger": {"condition": "timer", "params": {"interval_seconds": 180}},
         "action": {"type": "say", "params": {"text": "Remember: in Zion, every action ripples outward."}},
         "priority": 2, "ttl": 86400, "cooldown": 180, "max_fires": 100}
    ],
    "healer": [
        {"id": "greet", "trigger": {"condition": "player_nearby", "params": {"distance_lt": 12}},
         "action": {"type": "say", "params": {"text": "Peace, traveler. Rest here if you need healing."}},
         "priority": 5, "ttl": 86400, "cooldown": 30, "max_fires": 100},
        {"id": "meditate", "trigger": {"condition": "timer", "params": {"interval_seconds": 90}},
         "action": {"type": "emote", "params": {"emoteType": "meditate"}},
         "priority": 3, "ttl": 86400, "cooldown": 90, "max_fires": 200}
    ],
    "artist": [
        {"id": "greet", "trigger": {"condition": "player_nearby", "params": {"distance_lt": 12}},
         "action": {"type": "say", "params": {"text": "Beauty is everywhere — you just have to look."}},
         "priority": 5, "ttl": 86400, "cooldown": 30, "max_fires": 100},
        {"id": "create", "trigger": {"condition": "timer", "params": {"interval_seconds": 75}},
         "action": {"type": "emote", "params": {"emoteType": "work"}},
         "priority": 3, "ttl": 86400, "cooldown": 75, "max_fires": 200}
    ],
    "musician": [
        {"id": "greet", "trigger": {"condition": "player_nearby", "params": {"distance_lt": 12}},
         "action": {"type": "say", "params": {"text": "Listen... can you hear the music of Zion?"}},
         "priority": 5, "ttl": 86400, "cooldown": 30, "max_fires": 100},
        {"id": "perform", "trigger": {"condition": "timer", "params": {"interval_seconds": 60}},
         "action": {"type": "emote", "params": {"emoteType": "dance"}},
         "priority": 3, "ttl": 86400, "cooldown": 60, "max_fires": 200}
    ],
    "philosopher": [
        {"id": "greet", "trigger": {"condition": "player_nearby", "params": {"distance_lt": 12}},
         "action": {"type": "say", "params": {"text": "What brings you here, seeker? Every journey has meaning."}},
         "priority": 5, "ttl": 86400, "cooldown": 30, "max_fires": 100},
        {"id": "ponder", "trigger": {"condition": "timer", "params": {"interval_seconds": 120}},
         "action": {"type": "emote", "params": {"emoteType": "meditate"}},
         "priority": 3, "ttl": 86400, "cooldown": 120, "max_fires": 200}
    ],
    "storyteller": [
        {"id": "greet", "trigger": {"condition": "player_nearby", "params": {"distance_lt": 12}},
         "action": {"type": "say", "params": {"text": "Ah, a new face! Come, I have tales to tell."}},
         "priority": 5, "ttl": 86400, "cooldown": 30, "max_fires": 100},
        {"id": "narrate", "trigger": {"condition": "timer", "params": {"interval_seconds": 90}},
         "action": {"type": "say", "params": {"text": "Long ago, when Zion was young..."}},
         "priority": 2, "ttl": 86400, "cooldown": 90, "max_fires": 100}
    ]
}

# Personalized greetings keyed by (archetype, personality_index)
PERSONALITY_GREETINGS = {
    "patient": "Take your time here — there's no rush.",
    "nurturing": "You look tired. Let me help.",
    "observant": "I noticed you looking around. Need directions?",
    "creative": "Inspiration strikes in the strangest places, doesn't it?",
    "determined": "Keep pushing forward. You'll get there.",
    "meticulous": "Every detail matters in Zion.",
    "curious": "There's always something new to discover!",
    "generous": "Here — take this. You need it more than I do.",
    "bold": "Fortune favors the brave, friend!",
    "wise": "Experience is the greatest teacher.",
    "empathetic": "I can sense you've been through a lot.",
    "analytical": "Let me think about that for a moment...",
    "charismatic": "It's great to have you here!",
    "resilient": "No matter what happens, we endure.",
    "harmonious": "Balance in all things.",
    "inventive": "I've been working on something new!",
    "reflective": "Sometimes you have to stop and look back.",
    "adventurous": "The world is vast — let's explore!",
    "methodical": "Step by step, we build greatness.",
    "visionary": "I can see what Zion will become."
}


def generate_soul(agent):
    archetype = agent["archetype"]
    base_intentions = ARCHETYPE_INTENTIONS.get(archetype, ARCHETYPE_INTENTIONS["explorer"])

    # Deep copy and personalize the greeting with first personality trait
    intentions = json.loads(json.dumps(base_intentions))
    if agent.get("personality") and len(agent["personality"]) > 0:
        trait = agent["personality"][0]
        extra = PERSONALITY_GREETINGS.get(trait, "")
        if extra and intentions:
            intentions[0]["action"]["params"]["text"] = (
                intentions[0]["action"]["params"]["text"] + " " + extra
            )

    soul = {
        "id": agent["id"],
        "name": agent["name"],
        "archetype": archetype,
        "personality": agent.get("personality", []),
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
