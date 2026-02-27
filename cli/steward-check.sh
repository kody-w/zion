#!/bin/bash
# steward-check.sh — Generates a health report and returns a Copilot prompt
# if intervention is needed. Exit code 0 = healthy, 1 = needs attention.
set -e
cd "$(dirname "$0")/.."

ISSUES=""

# 1. Check for failed workflows (last 10 runs)
FAILURES=$(gh run list --limit 10 --json conclusion,name,databaseId -q '[.[] | select(.conclusion=="failure") | select(.name != "ZION Steward (Copilot Autopilot)")]' 2>/dev/null)
FAIL_COUNT=$(echo "$FAILURES" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")

if [ "$FAIL_COUNT" -gt "0" ]; then
  FAILED_NAMES=$(echo "$FAILURES" | python3 -c "
import sys,json
runs=json.load(sys.stdin)
for r in runs[:3]:
  print(f'  - {r[\"name\"]} (run {r[\"databaseId\"]})')
" 2>/dev/null)
  ISSUES="${ISSUES}FAILED WORKFLOWS ($FAIL_COUNT):\n$FAILED_NAMES\n\n"
fi

# 2. Check lobby host is running
LOBBY_STATUS=$(gh run list --workflow="lobby-host.yml" --limit 1 --json status -q '.[0].status' 2>/dev/null || echo "unknown")
if [ "$LOBBY_STATUS" != "in_progress" ] && [ "$LOBBY_STATUS" != "queued" ] && [ "$LOBBY_STATUS" != "pending" ]; then
  ISSUES="${ISSUES}LOBBY HOST NOT RUNNING (status: $LOBBY_STATUS)\n\n"
fi

# 3. Check economy health
ECON_CHECK=$(python3 -c "
import json
d=json.load(open('state/economy.json'))
b=d.get('balances',{})
total=sum(v for k,v in b.items() if k not in ('TREASURY','SYSTEM'))
players=len([k for k in b if k not in ('TREASURY','SYSTEM')])
treasury=b.get('TREASURY',0)
issues=[]
if total == 0: issues.append('Total Spark is ZERO')
if treasury < 0: issues.append(f'Treasury is negative: {treasury}')
if players == 0: issues.append('No players have balances')
print('|'.join(issues) if issues else 'ok')
" 2>/dev/null || echo "error")
if [ "$ECON_CHECK" != "ok" ]; then
  ISSUES="${ISSUES}ECONOMY ISSUE: $ECON_CHECK\n\n"
fi

# 4. Check player count
PLAYER_COUNT=$(python3 -c "
import json
d=json.load(open('state/players.json'))
print(len(d.get('players',{})))
" 2>/dev/null || echo "0")
if [ "$PLAYER_COUNT" -lt "50" ]; then
  ISSUES="${ISSUES}LOW PLAYER COUNT: only $PLAYER_COUNT players (expected 100)\n\n"
fi

# 5. Check game-tick freshness (was state updated recently?)
LAST_TICK=$(gh run list --workflow="game-tick.yml" --limit 1 --json conclusion,updatedAt -q '.[0]' 2>/dev/null)
TICK_CONCLUSION=$(echo "$LAST_TICK" | python3 -c "import sys,json; print(json.load(sys.stdin).get('conclusion','?'))" 2>/dev/null || echo "?")
if [ "$TICK_CONCLUSION" = "failure" ]; then
  ISSUES="${ISSUES}GAME TICK FAILING\n\n"
fi

# 6. Check for state file corruption
for f in state/players.json state/world.json state/economy.json state/chat.json; do
  if [ -f "$f" ]; then
    python3 -c "import json; json.load(open('$f'))" 2>/dev/null || ISSUES="${ISSUES}CORRUPT STATE FILE: $f\n\n"
  fi
done

# Report
echo "=== ZION Steward Health Check ==="
echo "Players: $PLAYER_COUNT"
echo "Lobby: $LOBBY_STATUS"
echo "Economy: $ECON_CHECK"
echo "Game tick: $TICK_CONCLUSION"

if [ -z "$ISSUES" ]; then
  echo ""
  echo "✅ All systems healthy. No intervention needed."
  exit 0
else
  echo ""
  echo "⚠️ ISSUES DETECTED:"
  echo -e "$ISSUES"
  # Output the prompt for Copilot
  echo "---COPILOT-PROMPT---"
  echo "You are the ZION world steward. The automated health check found these issues:"
  echo -e "$ISSUES"
  echo "Investigate each issue and fix it. For failed workflows, check the logs and fix the root cause. For lobby host not running, re-trigger it. For economy issues, check state/economy.json. For state corruption, regenerate the file. Commit and push all fixes."
  exit 1
fi
