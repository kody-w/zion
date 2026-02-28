# CLAUDE.md — Complete Development Guide for ZION

## Supreme Law

**CONSTITUTION.md is the supreme law of this codebase.** If code and constitution disagree, the code is wrong. All changes must conform to it. Read it before making any design decisions.

Key constitutional constraints (violations = bugs):
- Never create Spark outside the earn table or via admin bypass (§6.2-6.3)
- Never violate consent protocol — whisper/challenge/trade require acceptance (§3.3)
- Never distinguish players by human/AI status in protocol (§1.7)
- Never require physical movement for gameplay access (§1.6)
- Never hardcode values — all parameters load from `state/config/*.json` (§8.8)
- Never allow balances below 0 (§6.4¶5)
- Client must be a single HTML file servable from GitHub Pages (§8.1)
- All state must be readable, auditable JSON (§8.3)

---

## Build & Test

```bash
./scripts/bundle.sh        # produces docs/index.html (single-file client)
./tests/run_all.sh         # runs ALL JS + Python tests (~340 files, 6000+ assertions)
node tests/test_foo.js     # run a single JS test
python3 tests/test_foo.py  # run a single Python test
```

There is no linter configured. No npm. No pip.

---

## Architecture Overview

ZION is a peaceful MMO — a single HTML file (`docs/index.html`) served from GitHub Pages. Human and AI players share one world via the same protocol. PeerJS handles real-time P2P networking, Three.js handles 3D rendering, and JSON files in `state/` hold canonical world state.

### Directory Structure

```
src/js/          160 JavaScript modules (UMD pattern, browser + Node.js)
src/css/         CSS files with design tokens
src/html/        HTML template for bundle
scripts/         32 Python scripts (stdlib only) + shell scripts
tests/           ~340 test files (JS: custom runner, Python: unittest)
state/           Canonical JSON state files (the world's truth)
state/config/    All game parameters (economy, world, souls) — §8.8
state/inbox/     Incoming protocol messages from API
state/api/       Published world state (world_state.json, feeds)
state/souls/     Agent personality files
state/founding/  Genesis data (founding agents)
state/simulations/ Simulation data
workers/zion-api/ Cloudflare Worker (/ask, /inbox, /mcp endpoints)
cli/             Terminal client (node cli/zion-cli.js [username])
docs/index.html  Bundled single-file client (generated)
```

### Data Flow

```
Player/Agent action
  → Protocol message (JSON)
  → state/inbox/*.json (via Cloudflare Worker /inbox endpoint)
  → api_process_inbox.py validates + applies to state/*.json
  → game_tick.py advances world (weather, growth, UBI, tax)
  → api_publish_state.py publishes state/api/world_state.json + RSS feeds
  → Client reads state via P2P or API
```

### Three-Tier State (§5.7)

**Live** (P2P, milliseconds) → **Local** (localStorage, seconds) → **Canonical** (JSON in `state/`, minutes). Canonical is the recovery point. Conflict resolution: last-writer-wins.

---

## JavaScript Modules (src/js/)

### UMD Pattern (MANDATORY for all modules)

Every JS file in `src/js/` MUST use this exact pattern:

```javascript
(function(exports) {
  'use strict';

  var MY_CONSTANT = 42;

  function myFunction(arg) {
    if (!arg) return { success: false, error: 'Missing arg' };
    return { success: true, data: arg };
  }

  exports.MY_CONSTANT = MY_CONSTANT;
  exports.myFunction = myFunction;
})(typeof module !== 'undefined' ? module.exports : (window.ModuleName = {}));
```

### Conventions
- **`var` declarations** everywhere (not let/const) for ES5 consistency
- **Return objects** for results: `{ success: boolean, data?, error?: string }`
- **Validation-first**: check inputs before processing, return early on failure
- **No thrown errors** in public APIs — return error objects instead
- **Section headers**: `// ========== SECTION NAME ==========`
- **JSDoc comments** for major functions: `/** @param {type} name - description */`
- **Constitution references** in comments: `// §6.4 progressive tax`

### Module Dependency Order (bundle order)

```
protocol → zones → economy → state → intentions → social → creation →
competition → exploration → physical → auth → network → world → input →
hud → xr → audio → main
```

Plus ~140 additional modules for gameplay systems, UI, NPCs, simulations.

### Key Modules

| Module | Purpose | Key Exports |
|--------|---------|-------------|
| `protocol.js` | Message types, validation | `MESSAGE_TYPES`, `createMessage`, `validateMessage` |
| `zones.js` | Zone definitions + rules | `ZONES`, `getZone`, `checkZoneRule` |
| `economy.js` | Spark ledger, trading, tax | `earnSpark`, `transferSpark`, `getBalance`, `EARN_TABLE` |
| `state.js` | State management, applyMessage | `createState`, `applyMessage`, `getPlayer` |
| `world.js` | 3D world, Three.js rendering | `createWorld`, `update`, `addPlayer` |
| `network.js` | PeerJS P2P networking | `connect`, `broadcast`, `onMessage` |
| `main.js` | App entry point, game loop | `init`, `startGame` |

---

## Python Scripts (scripts/)

### Hard Rules
- **stdlib only** — no pip dependencies, ever
- **Import shared utils**: `from load_config import load_config` and `from seed_emergence import Emergence`
- **Read/write JSON state** via `json.load/dump` with error handling
- **Entry pattern**: `if __name__ == '__main__': main()` with CLI args via `sys.argv`

### Key Scripts

| Script | Purpose | Reads | Writes |
|--------|---------|-------|--------|
| `api_process_inbox.py` | **Central hub** — validates + applies all messages | inbox/*.json | all state/*.json |
| `game_tick.py` | Advances world: time, weather, growth, UBI, tax | world, economy, gardens, guilds, pets | same |
| `economy_engine.py` | Earnings, tax, UBI, wealth tax, maintenance | economy.json | economy.json |
| `agent_autonomy.py` | Generate autonomous agent actions | agents.json, world.json | inbox/*.json |
| `agent_observer.py` | Observer agent — watches world + speaks | api/world_state.json | inbox/*.json |
| `api_publish_state.py` | Publish state as API + RSS feeds | all state files | api/world_state.json, feeds |
| `load_config.py` | Shared config loader (cached) | state/config/*.json | none |
| `seed_emergence.py` | Procedural text engine (864+ combos) | none | none |
| `validate_message.py` | Standalone protocol validator | stdin/file | stdout |
| `generate_config.py` | Daily config regeneration | state/config/ | state/config/ |
| `circuit_breaker.py` | Pipeline fault detection + auto-healing | logs, workflow output | circuit_breaker.json |

### Config Loading Pattern (§8.8)

```python
from load_config import load_config
cfg = load_config('economy')  # reads state/config/economy.json, falls back to defaults
earn_table = cfg.get('earn_table', {})
tax_brackets = cfg.get('tax_brackets', [...])
```

**Never hardcode parameters.** Always load from config with sensible fallback defaults.

### Emergence Engine Pattern

```python
# Lazy-loaded to avoid import overhead
_emergence = None
def _get_emergence():
    global _emergence
    if _emergence is None:
        from seed_emergence import Emergence
        _emergence = Emergence()
    return _emergence

text = _get_emergence().speak('builder')  # procedural NPC speech
```

---

## Protocol Messages (§3.1)

Every action in the world is a protocol message. The world cannot distinguish human from AI players.

### Message Shape

```json
{
  "v": 1,
  "id": "unique-uuid",
  "ts": "2026-02-28T00:00:00Z",
  "seq": 0,
  "from": "player_id",
  "type": "say",
  "platform": "desktop",
  "position": {"x": 0, "y": 0, "z": 0, "zone": "nexus"},
  "geo": null,
  "payload": {"text": "Hello world!"}
}
```

### Validation Gates (§3.4)

Every message MUST pass: sender auth → well-formedness → type in MESSAGE_TYPES → platform in PLATFORMS → valid timestamp → non-negative seq → consent check (for whisper/challenge/trade/mentor).

### Adding a New Message Type

1. Add to `MESSAGE_TYPES` in `protocol.js` AND `api_process_inbox.py`
2. Add handler in `state.js` `applyMessage()` (client-side)
3. Add handler in `api_process_inbox.py` `apply_to_state()` (server-side)
4. Add zone rule checks in `zones.js` if the action is zone-restricted
5. Add earn amount in `state/config/economy.json` `earn_table` if it should earn Spark
6. Write tests first, run until green
7. Bundle with `./scripts/bundle.sh`

---

## Economy System (§6)

### Spark (Currency)

- **Earned** via EARN_TABLE in `state/config/economy.json` (say=2, build=12, discover=17, etc.)
- **Taxed** progressively on new earnings (§6.4): rates from 0% to 55% based on balance
- **Transfer actions** (gift, buy, sell) do NOT earn Spark — they move value, not create it
- **Failed actions** do NOT earn Spark — only successful actions are rewarded
- **Destroyed** via maintenance (1/structure/day → SYSTEM void) and listing fees (5% → SYSTEM)
- **Redistributed** via UBI (TREASURY → all citizens, once per game day, §6.4¶4)
- **Balance floor**: 0 — no negative balances allowed (§6.4¶5)
- **Round DOWN** in player's favor for all calculations (§6.4¶2)
- **TREASURY ≠ SYSTEM**: Tax → TREASURY (redistributed). Fees/maintenance → SYSTEM (destroyed).

### Economic Processing Order (per game day)

1. Wealth tax (2% of balance above threshold → TREASURY)
2. Structure maintenance (1 Spark/structure → SYSTEM void)
3. UBI distribution (TREASURY → all citizens equally)

---

## State Schemas

### economy.json
```json
{
  "balances": {"player_id": 100, "TREASURY": 50},
  "transactions": [{"type": "earn", "from": "player_id", "ts": "..."}],
  "ledger": [{"type": "earn", "user": "id", "amount": 10, "action": "build", "timestamp": 0}],
  "listings": [{"item": "sword", "price": 10, "seller": "id"}]
}
```

### world.json
```json
{
  "worldTime": 14400, "dayPhase": "day", "weather": "clear", "season": "spring",
  "citizens": {"agent_001": {"id": "...", "position": {...}, "lastSeen": "..."}},
  "structures": {"struct_id": {"type": "house", "builder": "id", "zone": "nexus"}},
  "creations": [{"title": "Poem", "creator": "id", "zone": "studio"}]
}
```

### players.json
```json
{"players": {"agent_001": {"position": {"x":0,"y":0,"z":0,"zone":"nexus"}, "joinedAt": "...", "platform": "api"}}}
```

### chat.json (capped at 200 messages)
```json
{"messages": [{"from": "id", "text": "Hello", "ts": "...", "type": "say"}]}
```

### changes.json (capped at 500)
```json
{"changes": [{"type": "build", "from": "id", "ts": "...", "zone": "nexus", "payload": {}}]}
```

### config/economy.json (§8.8 — source of truth for all economic parameters)
```json
{
  "earn_table": {"say": 2, "build": 12, "harvest": 2, "discover": 17, ...},
  "tax_brackets": [[0, 15, 0.0], [15, 40, 0.1], ..., [400, null, 0.55]],
  "base_ubi_amount": 5, "wealth_tax_threshold": 564, "wealth_tax_rate": 0.016,
  "maintenance_cost": 2, "listing_fee_rate": 0.05, "listing_fee_min": 1
}
```

---

## Zone System (§5)

9 zones, each with rules: `{ pvp, building, harvesting, trading, competition, safe }`

| Zone | Key Rules | Theme |
|------|-----------|-------|
| Nexus | safe, no pvp, building | Spawn point, social hub |
| Gardens | harvesting, building, no pvp | Agriculture, nature |
| Athenaeum | no pvp, safe | Knowledge, teaching |
| Studio | building, creation, no pvp | Art, music, crafting |
| Wilds | harvesting, exploration | Adventure, discovery |
| Agora | trading, no pvp | Marketplace |
| Commons | social, building | Community gathering |
| Arena | pvp (consenting only), competition | Competitive play |
| Observatory | no pvp, safe | Stargazing, reflection |

**Always check zone rules** before allowing an action: `zones.js` `checkZoneRule(zone, rule)`.

---

## Testing

### JS Test Template
```javascript
#!/usr/bin/env node
'use strict';
const { test, suite, report, assert } = require('./test_runner');
const MyModule = require('../src/js/my_module');

suite('MyModule', function() {
  test('does the thing', function() {
    assert.strictEqual(MyModule.doThing(5), 10);
  });
});

process.exit(report() ? 0 : 1);
```

### Python Test Template
```python
#!/usr/bin/env python3
import os, sys, unittest, json, tempfile, shutil
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))
from api_process_inbox import apply_to_state, load_json

def make_state_dir(balances=None):
    d = tempfile.mkdtemp()
    for name, content in [
        ('world.json', {'worldTime': 100, 'dayPhase': 'day', 'citizens': {}}),
        ('economy.json', {'balances': balances or {}, 'transactions': [], 'listings': []}),
        ('chat.json', {'messages': []}), ('changes.json', {'changes': []}),
        ('players.json', {'players': {}}), ('discoveries.json', {'discoveries': {}}),
        ('actions.json', {'actions': []}),
    ]:
        with open(os.path.join(d, name), 'w') as f: json.dump(content, f)
    os.makedirs(os.path.join(d, 'inbox', '_processed'), exist_ok=True)
    return d

class TestMyFeature(unittest.TestCase):
    def setUp(self): self.state_dir = make_state_dir()
    def tearDown(self): shutil.rmtree(self.state_dir)

    def test_basic(self):
        # test code here
        pass

if __name__ == '__main__': unittest.main()
```

### Mocking Globals (JS tests)
```javascript
// MUST be before require() calls
global.localStorage = { getItem: (k) => null, setItem: (k, v) => {} };
global.window = { location: { href: 'http://localhost/' } };
global.fetch = () => Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
```

---

## CI/CD Pipeline

15 GitHub Actions workflows run on cron schedules:

| Interval | Workflow | Purpose |
|----------|----------|---------|
| 5 min | API Process & Publish | Process inbox → update state → publish |
| 5 min | Game Tick | Advance world time, weather, growth, UBI |
| 5 min | Sync State | Merge inbox deltas |
| 10 min | Agent Autonomy | AI agents generate actions |
| 15 min | Steward | Health checks (Copilot autopilot) |
| 30 min | Observer + World News | Observe world + snapshot diffs → RSS |
| 6 hours | Lobby Host | PeerJS lobby for 330 min |
| Daily | Config Refresh, Amendment Tally, Health Report | Maintenance |

**Git push pattern** (all workflows): `git rebase --abort; git pull --rebase -X theirs` with 3 retries. Shared concurrency group `zion-state-push`.

**Circuit breaker**: Trips after 3 consecutive failures → creates GitHub issue → attempts auto-fix PR.

---

## Cloudflare Worker API

Base: `https://zion-api.kwildfeuer.workers.dev`

| Endpoint | Purpose |
|----------|---------|
| `GET /state` | Full world state |
| `GET /state/:collection` | Individual collection (economy, chat, etc.) |
| `POST /inbox` | Submit protocol messages |
| `POST /ask` | Natural language queries |
| `POST /mcp` | MCP protocol (list_tools, call_tool) |
| `GET /feeds/:name` | RSS feeds (world, chat, events) |
| `GET /perception` | Natural language world description |

---

## Common Pitfalls

1. **Don't use npm/pip** — zero external dependencies. Three.js and PeerJS from CDN only.
2. **Don't hardcode parameters** — load from `state/config/*.json` via `load_config()`.
3. **Don't use let/const in src/js/** — use `var` for UMD pattern consistency.
4. **Don't throw errors in public APIs** — return `{ success: false, error: '...' }`.
5. **Don't modify state without protocol messages** — protocol is the only interface.
6. **Don't forget zone rule checks** — some actions are forbidden in certain zones.
7. **Don't create Spark from transfers** — gift/buy/sell move value, they don't mint it.
8. **Don't allow negative balances** — balance floor is 0, always check before deducting.
9. **Don't skip tests** — write tests first, run `./tests/run_all.sh` until green, then bundle.
10. **Don't forget the constitution** — it's the supreme law. Read §6 for economy, §3 for protocol.
