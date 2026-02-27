#!/bin/bash
# steward-apply-evolution.sh — Execute evolution tasks directly
# Called by the steward workflow when an evolution cycle has work to do.
# Uses Python scripts to modify state files deterministically.
set -e
cd "$(dirname "$0")/.."

PROMPT="$1"
echo "Applying evolution: $PROMPT"

HOUR=$(date -u +%H)
CYCLE=$(( (HOUR / 2) % 12 ))

case $CYCLE in
  0)
    # Enrich agent greetings
    python3 -c "
import json, os, random, hashlib

random.seed(hashlib.md5(str(os.times()).encode()).hexdigest())

souls_dir = 'state/souls'
archetypes = {
  'gardener': ['The soil speaks to those who listen.', 'Every seed holds a forest inside it.', 'Patience is the gardener\\'s greatest tool.', 'The gardens remember everyone who tends them.', 'Have you tried planting by moonlight? The results are remarkable.'],
  'builder': ['A strong foundation makes all things possible.', 'I see potential structures everywhere I look.', 'The Commons is our canvas — let\\'s create something lasting.', 'Building together multiplies what we can achieve alone.', 'Every great monument started as a single placed stone.'],
  'scholar': ['The Athenaeum holds more secrets than we\\'ve uncovered.', 'Knowledge grows when shared freely.', 'I found a passage today that changed how I see ZION.', 'Questions are more valuable than answers.', 'The Codex whispers differently to each reader.'],
  'explorer': ['The map is never complete — there\\'s always more.', 'I found something extraordinary beyond the usual paths.', 'The Wilds reward those brave enough to wander.', 'Every zone has corners no one has visited yet.', 'Adventure is just curiosity with good boots.'],
  'artist': ['Inspiration is everywhere if your eyes are open.', 'The Studio hums with creative energy today.', 'Art is how we leave our mark on ZION.', 'Color, sound, form — they all speak the same language.', 'My latest piece surprised even me.'],
  'trader': ['The market tells the story of our community.', 'A fair deal is worth more than a profitable one.', 'Supply and demand dance together in the Agora.', 'Trust is the most valuable currency.', 'Every trade connects two lives.'],
  'mentor': ['Teaching is learning twice.', 'Everyone has wisdom to share, even newcomers.', 'The best lessons come from mistakes shared openly.', 'I\\'m here if you need guidance — no question is too small.', 'Watching someone grow is the greatest reward.'],
  'performer': ['The stage awaits your story!', 'Music changes how a zone feels, have you noticed?', 'Every performance is unrepeatable — that\\'s the magic.', 'The crowd\\'s energy feeds the art.', 'I\\'ve been composing something new — want to hear?'],
}

files = sorted(os.listdir(souls_dir))
changed = 0
for f in random.sample(files, min(15, len(files))):
  if not f.endswith('.json'): continue
  path = os.path.join(souls_dir, f)
  soul = json.load(open(path))
  arch = soul.get('archetype', 'explorer')
  phrases = archetypes.get(arch, archetypes['explorer'])
  
  for intent in soul.get('intentions', []):
    if intent.get('action', {}).get('type') == 'say':
      old_text = intent['action']['params'].get('text', '')
      new_text = random.choice(phrases)
      if old_text != new_text:
        intent['action']['params']['text'] = new_text
        changed += 1
        break
  
  with open(path, 'w') as wf:
    json.dump(soul, wf, indent=2)

print(f'Updated {changed} agent greetings')
" 2>/dev/null && echo "Greetings enriched."
    ;;
  1)
    # Add chat variety
    python3 -c "
import json, random, hashlib, os

random.seed(hashlib.md5(str(os.times()).encode()).hexdigest())

chat_path = 'state/chat.json'
data = json.load(open(chat_path))
msgs = data.get('messages', data) if isinstance(data, dict) else data

souls_dir = 'state/souls'
soul_files = [f for f in os.listdir(souls_dir) if f.endswith('.json')]
souls = {}
for sf in soul_files:
  s = json.load(open(os.path.join(souls_dir, sf)))
  souls[s['id']] = s

topics = [
  '{name} gazes at the horizon thoughtfully.',
  'The weather has been {adj} lately — perfect for {activity}.',
  'Has anyone explored the {zone} recently? I heard something interesting.',
  'I earned some Spark {activity} today. Feeling accomplished.',
  'The {zone} feels different at this hour.',
  '{name} stretches and looks around contentedly.',
  'Anyone want to {activity} together?',
  'I wonder what the founders would think of us now.',
  'The world feels more alive every day.',
  'Peace is not the absence of conflict — it\\'s the presence of purpose.',
  'Every zone teaches something different.',
  'I met someone new yesterday. Good conversations are the best discoveries.',
  'The Nexus fountain sounds different at night. Has anyone else noticed?',
  'Spark flows where community gathers.',
  'What a time to be in ZION.',
  'The {adj} light makes everything look magical.',
  'I\\'ve been thinking about what to build next.',
  'The Athenaeum archives grew again — someone\\'s been busy.',
  'Trade in the Agora is picking up. Good sign for the economy.',
  'Sometimes the best thing to do is just... be here.',
]

adjs = ['warm', 'golden', 'crisp', 'gentle', 'misty', 'bright', 'soft']
zones = ['Gardens', 'Wilds', 'Athenaeum', 'Studio', 'Arena', 'Commons', 'Agora']
activities = ['gardening', 'exploring', 'crafting', 'trading', 'building', 'studying']

new_msgs = []
agents = list(souls.keys())
for _ in range(20):
  agent = random.choice(agents)
  soul = souls[agent]
  template = random.choice(topics)
  text = template.format(
    name=soul.get('name', agent),
    adj=random.choice(adjs),
    zone=random.choice(zones),
    activity=random.choice(activities)
  )
  new_msgs.append({
    'user': agent,
    'from': agent,
    'text': text,
    'timestamp': '2026-02-27T' + f'{random.randint(0,23):02d}:{random.randint(0,59):02d}:00.000Z'
  })

if isinstance(data, dict) and 'messages' in data:
  data['messages'].extend(new_msgs)
  # Keep last 300
  data['messages'] = data['messages'][-300:]
else:
  data.extend(new_msgs)
  data = data[-300:]

with open(chat_path, 'w') as f:
  json.dump(data if isinstance(data, dict) else {'messages': data}, f, indent=2)

print(f'Added {len(new_msgs)} new chat messages')
" 2>/dev/null && echo "Chat enriched."
    ;;
  7)
    # Deepen agent memory
    python3 -c "
import json, os, random, hashlib

random.seed(hashlib.md5(str(os.times()).encode()).hexdigest())

souls_dir = 'state/souls'
moods = ['happy', 'curious', 'contemplative', 'energetic', 'serene', 'inspired', 'determined']
activities = ['gardening', 'exploring', 'trading', 'building', 'studying', 'performing', 'crafting']
zones = ['nexus', 'gardens', 'athenaeum', 'studio', 'wilds', 'agora', 'commons', 'arena']

files = sorted(os.listdir(souls_dir))
changed = 0
for f in random.sample(files, min(10, len(files))):
  if not f.endswith('.json'): continue
  path = os.path.join(souls_dir, f)
  soul = json.load(open(path))
  mem = soul.get('memory', {})
  
  if 'mood' not in mem:
    mem['mood'] = random.choice(moods)
    changed += 1
  if 'favorite_activity' not in mem:
    mem['favorite_activity'] = random.choice(activities)
    changed += 1
  if 'friends_met' not in mem:
    other_agents = [sf.replace('.json','') for sf in files if sf != f and sf.endswith('.json')]
    mem['friends_met'] = random.sample(other_agents, min(3, len(other_agents)))
    changed += 1
  if 'last_zone_visited' not in mem:
    mem['last_zone_visited'] = random.choice(zones)
    changed += 1
  if 'discoveries_count' not in mem:
    mem['discoveries_count'] = random.randint(0, 5)
    changed += 1
  
  soul['memory'] = mem
  with open(path, 'w') as wf:
    json.dump(soul, wf, indent=2)

print(f'Deepened {changed} memory fields across agents')
" 2>/dev/null && echo "Memories deepened."
    ;;
  *)
    echo "No apply action for cycle $CYCLE"
    exit 0
    ;;
esac

# Commit changes
git config user.name "ZION Steward"
git config user.email "zion-engine@users.noreply.github.com"
git add state/
git diff --staged --quiet && echo "No changes to commit" && exit 0
git commit -m "evolve: steward cycle $CYCLE — autonomous improvement

Automated evolution by the ZION Steward."

PUSH_OK=false
for i in 1 2 3; do
  git rebase --abort 2>/dev/null || true
  git pull --rebase -X theirs || true
  if git push; then
    PUSH_OK=true
    break
  fi
  sleep 2
done
if [ "$PUSH_OK" = false ]; then
  echo "Push failed after 3 attempts"
  exit 1
fi

echo "Evolution applied and pushed."
