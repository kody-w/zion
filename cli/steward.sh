#!/bin/bash
# steward.sh — ZION World Steward
# Monitors game state, workflow health, and world vitals.
# Runs continuously, logging observations and taking corrective action.

cd "$(dirname "$0")/.."
ROOT=$(pwd)
LOG="$ROOT/cli/steward.log"

log() {
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $1" | tee -a "$LOG"
}

check_world() {
  log "=== STEWARD CHECK ==="
  
  # Player count and distribution
  PLAYER_INFO=$(python3 -c "
import json
d=json.load(open('state/players.json'))
players=d['players']
zones={}
for p in players.values():
  z=p.get('position',{}).get('zone','?')
  zones[z]=zones.get(z,0)+1
print(f'Players: {len(players)}')
for z,c in sorted(zones.items(), key=lambda x:-x[1]):
  print(f'  {z}: {c}')
" 2>/dev/null)
  log "$PLAYER_INFO"
  
  # Economy health
  ECON=$(python3 -c "
import json
d=json.load(open('state/economy.json'))
b=d.get('balances',{})
total=sum(v for k,v in b.items() if k not in ('TREASURY','SYSTEM'))
treasury=b.get('TREASURY',0)
players=len([k for k in b if k not in ('TREASURY','SYSTEM')])
avg=total//players if players>0 else 0
print(f'Economy: {total} Spark across {players} players (avg {avg}), Treasury: {treasury}')
" 2>/dev/null)
  log "$ECON"
  
  # World state
  WORLD=$(python3 -c "
import json
w=json.load(open('state/world.json'))
print(f'World: weather={w.get(\"weather\",\"?\")}, season={w.get(\"season\",\"?\")}')
" 2>/dev/null)
  log "$WORLD"
  
  # Recent chat activity
  CHAT_COUNT=$(python3 -c "
import json
d=json.load(open('state/chat.json'))
msgs=d.get('messages',d) if isinstance(d,dict) else d
print(f'Chat: {len(msgs)} messages')
" 2>/dev/null)
  log "$CHAT_COUNT"
  
  # Workflow health
  LOBBY_STATUS=$(gh run list --workflow="lobby-host.yml" --limit 1 --json status,conclusion -q '.[0].status' 2>/dev/null)
  TICK_STATUS=$(gh run list --workflow="game-tick.yml" --limit 1 --json status,conclusion -q '.[0].status' 2>/dev/null)
  AGENT_STATUS=$(gh run list --workflow="agent-autonomy.yml" --limit 1 --json status,conclusion -q '.[0].status' 2>/dev/null)
  log "Workflows: lobby=$LOBBY_STATUS, game-tick=$TICK_STATUS, agents=$AGENT_STATUS"
  
  # Check for failures
  FAILURES=$(gh run list --limit 10 --json conclusion,name -q '[.[] | select(.conclusion=="failure")] | length' 2>/dev/null)
  if [ "$FAILURES" -gt "0" ] 2>/dev/null; then
    log "⚠ WARNING: $FAILURES recent workflow failures detected"
    gh run list --limit 10 --json conclusion,name,createdAt -q '.[] | select(.conclusion=="failure") | "\(.name) at \(.createdAt)"' 2>/dev/null | while read line; do
      log "  FAILED: $line"
    done
  else
    log "✓ All workflows healthy"
  fi
  
  # Git status (uncommitted changes?)
  CHANGES=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
  if [ "$CHANGES" -gt "0" ]; then
    log "⚠ $CHANGES uncommitted changes in repo"
  fi
  
  log "=== CHECK COMPLETE ==="
  echo ""
}

# Main loop
log "ZION Steward starting. Monitoring every 5 minutes."
log "Press Ctrl+C to stop."

while true; do
  check_world
  sleep 300  # 5 minutes
done
