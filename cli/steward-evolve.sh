#!/bin/bash
# steward-evolve.sh — Proactive world evolution tasks
# Called by the steward workflow to autonomously improve ZION.
# Returns an evolution prompt for Copilot if there's work to do.
set -e
cd "$(dirname "$0")/.."

# Evolution agenda — tasks rotate every 2 hours
HOUR=$(date -u +%H)
CYCLE=$(( (HOUR / 2) % 12 ))

echo "=== ZION Evolution Check (cycle $CYCLE, hour $HOUR UTC) ==="

case $CYCLE in
  0)
    # Cycle 0: Enrich agent conversations
    TOPIC_COUNT=$(python3 -c "
import json, os
souls_dir = 'state/souls'
unique_greets = set()
for f in os.listdir(souls_dir):
  if not f.endswith('.json'): continue
  s = json.load(open(os.path.join(souls_dir, f)))
  for i in s.get('intentions', []):
    if i.get('action',{}).get('type') == 'say':
      unique_greets.add(i['action']['params'].get('text','')[:50])
print(len(unique_greets))
" 2>/dev/null || echo "0")
    echo "Unique agent greetings: $TOPIC_COUNT"
    if [ "$TOPIC_COUNT" -lt "80" ]; then
      echo "---EVOLVE-PROMPT---"
      echo "ZION has $TOPIC_COUNT unique agent greeting messages across 100 souls in state/souls/. Many agents share similar greetings. Update 10-15 soul files to give agents more unique, personality-driven greeting text that reflects their archetype and name. A gardener should talk about plants, a scholar about knowledge, etc. Only modify the intention action params text fields. Keep changes minimal. Commit with message 'evolve: enrich agent greetings (cycle $CYCLE)'."
    fi
    ;;
  1)
    # Cycle 1: Add more chat variety to the world
    CHAT_COUNT=$(python3 -c "
import json
d = json.load(open('state/chat.json'))
msgs = d.get('messages', d) if isinstance(d, dict) else d
# Count unique messages (deduplicated)
unique = set()
for m in msgs:
  t = m.get('text', m.get('message', ''))
  if t: unique.add(t[:50])
print(len(unique))
" 2>/dev/null || echo "0")
    echo "Unique chat messages: $CHAT_COUNT"
    if [ "$CHAT_COUNT" -lt "150" ]; then
      echo "---EVOLVE-PROMPT---"
      echo "The ZION chat log (state/chat.json) has only $CHAT_COUNT unique messages. The world feels repetitive. Add 20 new diverse chat messages from different agents — conversations about discoveries, trade, weather, zone events, greetings to newcomers. Make them feel natural and in-character based on each agent's soul file in state/souls/. Commit with message 'evolve: add chat variety (cycle $CYCLE)'."
    fi
    ;;
  2)
    # Cycle 2: Check and improve economy distribution
    ECON_HEALTH=$(python3 -c "
import json
d = json.load(open('state/economy.json'))
b = d.get('balances', {})
vals = [v for k,v in b.items() if k not in ('TREASURY','SYSTEM') and v > 0]
if not vals:
  print('empty')
else:
  avg = sum(vals) / len(vals)
  maxv = max(vals)
  minv = min(vals)
  gini = sum(abs(x-y) for x in vals for y in vals) / (2 * len(vals) * sum(vals)) if sum(vals) > 0 else 0
  print(f'avg={avg:.0f} max={maxv} min={minv} gini={gini:.3f} players={len(vals)}')
" 2>/dev/null || echo "error")
    echo "Economy: $ECON_HEALTH"
    ;;
  3)
    # Cycle 3: Verify tests still pass
    echo "Running test suite..."
    TEST_RESULT=$(cd /tmp && node $OLDPWD/tests/test_cli_renderer.js 2>&1 | tail -1)
    echo "Renderer tests: $TEST_RESULT"
    TEST_RESULT2=$(cd /tmp && node $OLDPWD/tests/test_cli_input.js 2>&1 | tail -1)
    echo "Input tests: $TEST_RESULT2"
    TEST_RESULT3=$(cd /tmp && node $OLDPWD/tests/test_cli_protocol.js 2>&1 | tail -1)
    echo "Protocol tests: $TEST_RESULT3"
    # Check for failures
    if echo "$TEST_RESULT $TEST_RESULT2 $TEST_RESULT3" | grep -q "failed"; then
      echo "---EVOLVE-PROMPT---"
      echo "Some ZION tests are failing. Results: Renderer=[$TEST_RESULT] Input=[$TEST_RESULT2] Protocol=[$TEST_RESULT3]. Investigate and fix the failing tests. Run the tests, read the error messages, fix the code, run tests again until green. Commit with message 'fix: repair failing tests (cycle $CYCLE)'."
    fi
    ;;
  4)
    # Cycle 4: Check state file health and consistency
    echo "Checking state consistency..."
    STATE_CHECK=$(python3 -c "
import json, os
issues = []
# Check all players have valid positions
p = json.load(open('state/players.json'))
for pid, data in p.get('players', {}).items():
  pos = data.get('position', {})
  if 'zone' not in pos:
    issues.append(f'{pid} missing zone')
  elif pos['zone'] not in ['nexus','gardens','athenaeum','studio','wilds','agora','commons','arena']:
    issues.append(f'{pid} invalid zone: {pos[\"zone\"]}')
# Check economy has no negative balances (except allowed)
e = json.load(open('state/economy.json'))
for pid, bal in e.get('balances', {}).items():
  if bal < 0 and pid not in ('TREASURY', 'SYSTEM'):
    issues.append(f'{pid} negative balance: {bal}')
print('|'.join(issues[:5]) if issues else 'ok')
" 2>/dev/null || echo "error")
    echo "State: $STATE_CHECK"
    if [ "$STATE_CHECK" != "ok" ] && [ "$STATE_CHECK" != "error" ]; then
      echo "---EVOLVE-PROMPT---"
      echo "ZION state files have consistency issues: $STATE_CHECK. Fix the affected state files (state/players.json, state/economy.json). Players should have valid zone names, no negative balances. Commit with message 'fix: repair state consistency (cycle $CYCLE)'."
    fi
    ;;
  5)
    # Cycle 5: Enrich world.json zone objects
    OBJECT_COUNT=$(python3 -c "
import json
w = json.load(open('state/world.json'))
total = 0
for zid, zdata in w.get('zones', {}).items():
  total += len(zdata.get('objects', []))
print(total)
" 2>/dev/null || echo "0")
    echo "World objects: $OBJECT_COUNT"
    ;;
  6)
    # Cycle 6: Re-trigger lobby host if not running
    LOBBY_STATUS=$(gh run list --workflow="lobby-host.yml" --limit 1 --json status -q '.[0].status' 2>/dev/null || echo "unknown")
    echo "Lobby host status: $LOBBY_STATUS"
    if [ "$LOBBY_STATUS" = "completed" ] || [ "$LOBBY_STATUS" = "failure" ] || [ "$LOBBY_STATUS" = "cancelled" ]; then
      echo "Re-triggering lobby host..."
      gh workflow run lobby-host.yml --field duration_minutes=330 2>/dev/null || true
      echo "Lobby host re-triggered."
    fi
    ;;
  7)
    # Cycle 7: Agent soul memory evolution
    MEMORY_DEPTH=$(python3 -c "
import json, os
souls_dir = 'state/souls'
total_memory_keys = 0
for f in os.listdir(souls_dir):
  if not f.endswith('.json'): continue
  s = json.load(open(os.path.join(souls_dir, f)))
  total_memory_keys += len(s.get('memory', {}).keys())
avg = total_memory_keys / 100
print(f'{avg:.1f}')
" 2>/dev/null || echo "0")
    echo "Avg memory keys per soul: $MEMORY_DEPTH"
    if python3 -c "exit(0 if float('$MEMORY_DEPTH') < 5 else 1)" 2>/dev/null; then
      echo "---EVOLVE-PROMPT---"
      echo "ZION agent souls (state/souls/) have shallow memory — only $MEMORY_DEPTH keys per soul on average. Enrich 10 random soul files by adding memory fields like: friends_met (list of agent IDs they've interacted with), favorite_activity, mood (happy/curious/contemplative), discoveries_count, last_zone_visited. Keep it JSON-valid and consistent with the existing memory format. Commit with message 'evolve: deepen agent memory (cycle $CYCLE)'."
    fi
    ;;
  8)
    # Cycle 8: Check discoveries are accumulating
    DISC_COUNT=$(python3 -c "
import json
d = json.load(open('state/discoveries.json'))
discs = d.get('discoveries', d) if isinstance(d, dict) else d
print(len(discs) if isinstance(discs, list) else len(discs.keys()) if isinstance(discs, dict) else 0)
" 2>/dev/null || echo "0")
    echo "Total discoveries: $DISC_COUNT"
    ;;
  9)
    # Cycle 9: Community health — guild and social activity
    GUILD_COUNT=$(python3 -c "
import json
g = json.load(open('state/guilds.json'))
guilds = g.get('guilds', {})
print(len(guilds))
" 2>/dev/null || echo "0")
    echo "Active guilds: $GUILD_COUNT"
    ;;
  10)
    # Cycle 10: Bundle integrity check
    echo "Checking bundle..."
    if [ -f "docs/index.html" ]; then
      SIZE=$(wc -c < docs/index.html | tr -d ' ')
      echo "Bundle size: $SIZE bytes"
      if [ "$SIZE" -lt "100000" ]; then
        echo "---EVOLVE-PROMPT---"
        echo "The ZION bundle (docs/index.html) is suspiciously small ($SIZE bytes). It should be ~5MB. Run ./scripts/bundle.sh to rebuild and commit if changed. Commit with message 'fix: rebuild bundle (cycle $CYCLE)'."
      fi
    fi
    ;;
  11)
    # Cycle 11: Full system status report
    echo "=== FULL STATUS REPORT ==="
    python3 -c "
import json, os
p = json.load(open('state/players.json'))
e = json.load(open('state/economy.json'))
w = json.load(open('state/world.json'))
c = json.load(open('state/chat.json'))
msgs = c.get('messages', c) if isinstance(c, dict) else c
print(f'Players: {len(p.get(\"players\",{}))}')
print(f'Economy: {sum(v for k,v in e.get(\"balances\",{}).items() if k not in (\"TREASURY\",\"SYSTEM\"))} Spark')
print(f'Weather: {w.get(\"weather\",\"?\")}')
print(f'Chat: {len(msgs)} messages')
print(f'Souls: {len(os.listdir(\"state/souls\"))} files')
" 2>/dev/null
    ;;
esac

echo "=== Evolution check complete ==="
