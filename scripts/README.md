# ZION MMO Scripts

Python scripts for server-side operations. All scripts use ONLY Python stdlib (no external dependencies).

## Protocol & Validation

### `validate_message.py`
Validate ZION protocol messages for correctness.

```bash
# From stdin
echo '{"v":1,"id":"msg","ts":"2026-02-12T12:00:00Z",...}' | python3 validate_message.py

# From file
python3 validate_message.py path/to/message.json
```

**Checks:**
- Protocol version = 1
- Required fields present (v, id, ts, seq, from, type, platform, position, payload)
- Valid message type from protocol spec
- Valid platform (desktop, phone, vr, ar, api)
- Valid ISO-8601 timestamp
- Consent requirements (whisper, challenge, trade_offer, mentor_offer need 'to' field)

**Exit codes:** 0 = valid, 1 = invalid

## World Simulation

### `game_tick.py`
Run one game tick to advance world state.

```bash
# From stdin
echo '{"worldTime":0,"lastTickAt":1000}' | python3 game_tick.py

# From file
python3 game_tick.py path/to/state.json
```

**Updates:**
- World time (24-minute day/night cycle)
- Day phase (dawn, day, dusk, night)
- Weather (deterministic based on world time)
- Season (4-week cycles: spring, summer, autumn, winter)
- Plant growth (advances toward 1.0 based on growthTime)
- Resource respawn (depleted resources regenerate)

### `architect_genesis.py`
Generate initial world state files.

```bash
python3 architect_genesis.py
```

**Creates:**
- `state/world.json` - 8 zones with terrain, portals, objects
- `state/gardens.json` - 20 garden plots
- `state/structures.json` - Initial structures (fountain, market stalls, etc.)
- `state/founding/agents.json` - 100 AI citizens with diverse archetypes

**Archetypes:** gardener, builder, storyteller, merchant, explorer, teacher, musician, healer, philosopher, artist

## Economy

### `economy_engine.py`
Process economic transactions and earnings.

```bash
python3 economy_engine.py economy.json actions.json
```

**Features:**
- Award Spark for actions (based on EARN_TABLE)
- Validate transactions (check sufficient balance)
- Ledger integrity checks (credits = debits + genesis)
- Expire old market listings (default 24 hours)

**Spark Earnings:**
- High value: warp_fork (50), federation_announce (100), discover (20)
- Creative: compose (15), build (10), craft (8)
- Social: gift (5), teach (10), say (1)
- Zero: move, heartbeat, idle

## Agent Operations

### `agent_autonomy.py`
Activate AI agents and generate their intentions.

```bash
# Activate 10 random agents
python3 agent_autonomy.py state/founding/agents.json 10

# Custom number
python3 agent_autonomy.py agents.json 5
```

**Output:** JSON array of protocol messages (1-3 intentions per activated agent)

**Agent behaviors match archetypes:**
- Gardeners: plant, harvest, inspect
- Builders: build, craft
- Merchants: trade_offer, buy, sell
- Explorers: discover, warp
- Teachers: teach, mentor_offer

### `sync_state.py`
Merge inbox messages into canonical state.

```bash
python3 sync_state.py
```

**Process:**
1. Read all `.json` files from `state/inbox/`
2. Parse and validate messages
3. Merge into `state/world.json` using last-writer-wins
4. Delete processed inbox files
5. Print summary

**Updates tracked:**
- Citizen positions (from move messages)
- Garden plants (from plant messages)
- Structures (from build messages)
- Inventory (from craft messages)
- Intentions (from intention_set/clear)

## Safety & Security

### `anchor_validate.py`
Validate GPS coordinates for AR anchor placement.

```bash
# From stdin
echo '{"latitude":37.7749,"longitude":-122.4194,"name":"SF"}' | python3 anchor_validate.py

# From file
python3 anchor_validate.py anchor.json
```

**Checks:**
- Valid latitude (-90 to 90) and longitude (-180 to 180)
- Not at (0, 0) - Null Island
- Not in ocean (basic heuristic)
- Not near major highways (safety warning)
- Sufficient decimal precision

**Exit codes:** 0 = valid, 1 = invalid

### `pii_scan.py`
Scan state files for sensitive data.

```bash
# Scan state directory
python3 pii_scan.py state/

# Scan custom directory
python3 pii_scan.py path/to/dir
```

**Detects:**
- Email addresses
- API tokens (GitHub, OpenAI, AWS)
- Private keys (RSA, EC)
- SSNs and credit card numbers
- JWT tokens
- Passwords in config
- Bearer tokens

**Exit codes:** 0 = clean, 1 = PII found

## Build Tools

### `bundle.sh` + `bundle_helper.py`
Create single-file HTML build.

```bash
./bundle.sh
```

**Output:** `docs/index.html` with all CSS and JS inlined

**Concatenation order:**
- CSS: tokens.css, layout.css, hud.css, world.css
- JS: protocol.js, zones.js, economy.js, state.js, intentions.js, social.js, creation.js, competition.js, exploration.js, physical.js, auth.js, network.js, world.js, input.js, hud.js, xr.js, audio.js, main.js

## Requirements

- Python 3.7+
- No external dependencies (stdlib only)

## Testing

Run all tests:
```bash
cd tests
./run_all_tests.sh
```

Or run individually:
```bash
python3 -m pytest tests/test_validate_message.py -v
python3 -m pytest tests/test_game_tick.py -v
python3 -m pytest tests/test_economy_engine.py -v
```
