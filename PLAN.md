# ZION — Implementation Plan

## Context

Build the ZION MMO from the constitution at `CONSTITUTION.md`. The game is a single HTML file served from GitHub Pages where human and AI players share one world via the same protocol. PeerJS for real-time P2P, Three.js for 3D rendering, GitHub OAuth for auth, JSON files for canonical state.

**Goal**: Write tests first, build everything, run tests until green, deploy to a public GitHub repo with GitHub Pages live so the user can open a URL and play.

**Deploy target**: `github.com/kodyw/zion` → `https://kodyw.github.io/zion/`

---

## Phase 1: Project Scaffolding

Create the full directory structure from the constitution:

```
zion/
├── CONSTITUTION.md          (already exists)
├── PLAN.md                  (this file)
├── CLAUDE.md
├── README.md
├── src/
│   ├── html/index.html      (shell template)
│   ├── css/
│   │   ├── tokens.css
│   │   ├── layout.css
│   │   ├── hud.css
│   │   └── world.css
│   └── js/
│       ├── main.js
│       ├── protocol.js
│       ├── network.js
│       ├── auth.js
│       ├── state.js
│       ├── intentions.js
│       ├── world.js
│       ├── zones.js
│       ├── creation.js
│       ├── economy.js
│       ├── social.js
│       ├── competition.js
│       ├── exploration.js
│       ├── physical.js
│       ├── xr.js
│       ├── hud.js
│       ├── input.js
│       └── audio.js
├── scripts/
│   ├── validate_message.py
│   ├── sync_state.py
│   ├── architect_genesis.py
│   ├── agent_autonomy.py
│   ├── game_tick.py
│   ├── economy_engine.py
│   ├── anchor_validate.py
│   ├── bundle.sh
│   └── pii_scan.py
├── tests/
│   ├── test_runner.js        (vanilla JS test framework — no deps)
│   ├── test_protocol.js
│   ├── test_state.js
│   ├── test_intentions.js
│   ├── test_economy.js
│   ├── test_zones.js
│   ├── test_social.js
│   ├── test_creation.js
│   ├── test_competition.js
│   ├── test_exploration.js
│   ├── test_physical.js
│   ├── test_validate_message.py
│   ├── test_game_tick.py
│   ├── test_economy_engine.py
│   └── run_all.sh            (runs JS + Python tests)
├── state/
│   ├── world.json
│   ├── players.json
│   ├── economy.json
│   ├── gardens.json
│   ├── structures.json
│   ├── discoveries.json
│   ├── anchors.json
│   ├── chat.json
│   ├── actions.json
│   ├── changes.json
│   ├── competitions.json
│   ├── federation.json
│   ├── founding/
│   │   └── agents.json
│   ├── souls/               (empty at genesis, populated by agent_autonomy)
│   └── inbox/               (empty at genesis)
├── docs/
│   └── index.html           (bundled single-file client)
├── .github/
│   └── workflows/
│       ├── agent-autonomy.yml
│       ├── game-tick.yml
│       ├── sync-state.yml
│       ├── validate-pr.yml
│       ├── anchor-review.yml
│       └── pii-scan.yml
└── .well-known/
    ├── feeddata-general
    └── mcp.json
```

---

## Phase 2: Test Suite (Write First, Run Later)

### Testing Approach
- **JS tests**: Vanilla test runner (`tests/test_runner.js`) — zero dependencies, runs in Node.js. Uses `assert` from Node stdlib. Exports a simple `test(name, fn)` / `assert` pattern. Each test file is a standalone Node script.
- **Python tests**: `unittest` (stdlib). Each test file runs standalone.
- **Shell runner**: `tests/run_all.sh` runs all JS tests via `node` and all Python tests via `python3`, reports pass/fail.

### Test Matrix (Cradle to Grave)

#### T1: Protocol (`test_protocol.js`)
- Create valid message for every type (join, leave, heartbeat, idle, move, warp, say, shout, whisper, emote, build, plant, craft, compose, harvest, trade_offer, trade_accept, trade_decline, buy, sell, gift, teach, learn, mentor_offer, mentor_accept, challenge, accept_challenge, forfeit, score, discover, anchor_place, inspect, intention_set, intention_clear, warp_fork, return_home, federation_announce, federation_handshake)
- Validate message shape: v, id, ts, seq, from, type, platform, position, geo, payload
- Reject messages with missing required fields
- Reject messages with invalid type
- Reject messages with invalid platform values
- Validate position has x, y, z, zone
- Validate seq is monotonically increasing per player
- Validate ts is ISO-8601
- Validate id uniqueness

#### T2: State Management (`test_state.js`)
- Initialize empty state
- Set/get player state
- Set/get zone state
- Three-tier: write to live → flush to local → flush to canonical
- Canonical state is valid JSON
- State survives simulated disconnect (local tier persists)
- Merge conflict resolution: last-writer-wins
- State contains all required keys (world, players, economy, gardens, structures, discoveries, anchors, chat, actions, changes, competitions, federation)

#### T3: Intention Engine (`test_intentions.js`)
- Register an intention (valid format per §4.3)
- Reject intention with missing fields (id, trigger, action, priority, ttl, cooldown, max_fires)
- Max 10 intentions per player — 11th rejected
- TTL expiry: intention expires after ttl seconds
- Cooldown: intention doesn't re-fire within cooldown
- Max fires: intention stops after max_fires triggers
- Trigger evaluation: `player_nearby` fires when distance < threshold
- Trigger evaluation: `player_say` fires on keyword match
- Trigger evaluation: `timer` fires at interval
- Trigger evaluation: `zone_enter` fires on zone match
- Trigger evaluation: `garden_needs` fires on need match
- Action generation: produces valid protocol message
- Intentions are public (retrievable by any player)
- Full action overrides intention
- Intention respects consent (no auto-challenge, no auto-whisper)
- Clear intentions removes them

#### T4: Economy (`test_economy.js`)
- Initial Spark balance is 0 for new player
- First login of the day awards 10 Spark
- Planting + harvesting awards 5-15 Spark
- Crafting awards 5-50 Spark based on complexity
- Teaching awards 10-30 Spark
- Discovering a location awards 5-25 Spark
- Gifting awards small Spark to giver
- Trade: Spark transfers correctly between players
- Trade: items transfer correctly
- Cannot spend more Spark than balance
- Ledger records every transaction
- No admin minting (no way to create Spark outside earn table)
- Player-set prices on market listings

#### T5: Zone Rules (`test_zones.js`)
- 8 genesis zones exist: nexus, gardens, athenaeum, studio, wilds, agora, commons, arena
- Each zone has correct rules object (pvp, building, harvesting, trading, competition, safe)
- Nexus: pvp=false, safe=true, competition=false
- Arena: pvp=true, competition=true
- Gardens: harvesting=true, building=false
- Commons: building=true
- Zone rule enforcement: cannot build in no-build zone
- Zone rule enforcement: cannot initiate pvp in safe zone
- Zone portals: can warp between connected zones
- All zones connected to Nexus
- New player spawns in Nexus

#### T6: Social (`test_social.js`)
- `say` message visible to nearby players only (distance check)
- `shout` message visible to entire zone
- `whisper` requires consent
- `whisper` to non-consenting player rejected
- `emote` broadcast to nearby players
- Rate limiting: excessive messages throttled
- Harassment detection: repeated declined interactions flagged

#### T7: Creation (`test_creation.js`)
- `build` creates structure at position in valid zone
- `build` rejected in no-build zone
- `plant` creates garden entry with growth timer
- `harvest` only works on ready plants
- `craft` requires correct materials in inventory
- `craft` consumes materials, produces item
- `compose` creates art/music/writing entry
- Structures persist in state

#### T8: Competition (`test_competition.js`)
- `challenge` requires consent from target
- `accept_challenge` starts competition
- Competition only in zones where competition=true
- `forfeit` ends competition gracefully
- `score` records result
- Winner earns Spark
- PvP only between consenting players in Arena

#### T9: Exploration (`test_exploration.js`)
- `discover` records new discovery with type and description
- Discovery awards Spark based on rarity
- `inspect` returns info about target entity
- Discovery log persists in state
- Cannot re-discover same location (duplicate check)

#### T10: Physical Realm (`test_physical.js`)
- Anchor creation with valid GPS coordinates
- Anchor rejected at invalid coordinates (0,0)
- Anchor types: zone_portal, resource_node, discovery_point, gathering_spot, garden_plot
- Warmth accumulation from GPS movement
- Warmth bonus is minor (cosmetic-adjacent, not power)
- System functions fully without location access

#### T11: Python Validation (`test_validate_message.py`)
- Validate well-formed messages pass
- Reject malformed JSON
- Reject missing required fields
- Reject invalid message types
- Reject invalid platform values
- Reject out-of-order sequence numbers
- Validate consent requirements for whisper/challenge/trade/mentor

#### T12: Game Tick (`test_game_tick.py`)
- Day/night cycle: 24-minute cycle produces correct phase
- Weather generation: produces valid weather type
- Season calculation: cycles over real weeks
- Plant growth: advances growth state over time
- Resource respawn: depleted resources regenerate

#### T13: Economy Engine (`test_economy_engine.py`)
- Spark generation for all activity types matches earn table
- Transaction validation: sufficient balance required
- Ledger integrity: sum of all credits = sum of all debits + genesis amount
- Market listing creation and purchase

#### T14: Integration Tests (in test_runner — run after build)
- Full message round-trip: create → validate → apply to state → verify state changed
- Player lifecycle: join → move → say → build → trade → leave → rejoin (state preserved)
- Intention lifecycle: set → trigger fires → action generated → cooldown → ttl expires
- Economy lifecycle: login → earn Spark → list item → buy item → check balances
- Zone travel: spawn in Nexus → warp to Gardens → plant → warp to Agora → sell harvest

---

## Phase 3: Build Order

Build in dependency order. Each module is a JS file that exports functions (ES modules). Browser globals used as fallback for the bundled single-file version.

### Layer 1: Core (no dependencies on other modules)

**3.1 `src/js/protocol.js`** — Message creation & validation
- `createMessage(type, from, payload, opts)` → returns valid message object
- `validateMessage(msg)` → returns {valid, errors[]}
- `MESSAGE_TYPES` — enum of all valid types
- `CONSENT_REQUIRED_TYPES` — set of types needing consent
- `PLATFORMS` — valid platform values
- UUID generation for message IDs
- ISO-8601 timestamp generation
- Per-player sequence counter management

**3.2 `src/js/zones.js`** — Zone definitions & rule enforcement
- `ZONES` — map of zone_id → {name, description, rules, portals[], terrain, bounds}
- `getZoneRules(zoneId)` → rules object
- `isActionAllowed(action, zoneId)` → boolean
- `getConnectedZones(zoneId)` → portal list
- `getSpawnZone()` → "nexus"
- All 8 genesis zones defined with correct rules per §5.4-5.5

**3.3 `src/js/economy.js`** — Spark ledger & trading
- `createLedger()` → empty ledger
- `earnSpark(playerId, activity, details)` → amount earned
- `spendSpark(playerId, amount)` → success/fail
- `transferSpark(from, to, amount)` → success/fail
- `getBalance(playerId)` → number
- `createMarketListing(playerId, item, price)` → listing
- `buyListing(buyerId, listingId)` → success/fail
- `EARN_TABLE` — activity → Spark amount mapping per §6.2
- `getTransactionLog(playerId)` → transactions[]

### Layer 2: State & Engine (depends on Layer 1)

**3.4 `src/js/state.js`** — Three-tier state management
- `createWorldState()` → initial empty state with all required keys
- `getLiveState()` / `setLiveState(path, value)` — in-memory
- `flushToLocal()` — live → localStorage
- `loadFromLocal()` — localStorage → live
- `flushToCanonical()` → JSON string (for GitHub persistence)
- `loadFromCanonical(json)` — GitHub JSON → live
- `applyMessage(state, message)` → new state (pure function, the heart of the world)
- `resolveConflict(stateA, stateB)` → merged state (last-writer-wins)
- State schema: world, players, economy, gardens, structures, discoveries, anchors, chat, actions, changes, competitions, federation

**3.5 `src/js/intentions.js`** — Intention system engine
- `registerIntention(playerId, intention)` → success/fail
- `clearIntentions(playerId)` → void
- `getIntentions(playerId)` → intentions[]
- `evaluateTriggers(playerId, worldState, deltaTime)` → actions[]
- `isIntentionExpired(intention, now)` → boolean
- `canIntentionFire(intention, now)` → boolean (cooldown + max_fires)
- Trigger evaluators: one function per trigger type (§4.5)
- Action generators: produce valid protocol messages from intention actions (§4.6)
- Max 10 intentions per player enforcement
- Consent check: intentions cannot produce consent-required actions without prior consent

### Layer 3: Systems (depends on Layer 1 + 2)

**3.6 `src/js/social.js`** — Chat, emotes, consent tracking
- `handleSay(msg, state)` → nearby player IDs who receive it
- `handleShout(msg, state)` → zone player IDs who receive it
- `handleWhisper(msg, state)` → success/fail (consent check)
- `handleEmote(msg, state)` → nearby player IDs
- `grantConsent(from, to, type)` → void
- `revokeConsent(from, to, type)` → void
- `hasConsent(from, to, type)` → boolean
- `checkRateLimit(playerId, now)` → allowed boolean
- Proximity calculation: Euclidean distance in 3D

**3.7 `src/js/creation.js`** — Building, planting, crafting, composing
- `handleBuild(msg, state)` → new state (zone rule check)
- `handlePlant(msg, state)` → new state (creates garden entry with growth timer)
- `handleHarvest(msg, state)` → new state + items (growth check)
- `handleCraft(msg, state)` → new state (material check, consumption, production)
- `handleCompose(msg, state)` → new state (creates art entry)
- `RECIPES` — craft recipe definitions
- `PLANT_SPECIES` — plant types with growth times
- `STRUCTURE_TYPES` — buildable structure types

**3.8 `src/js/competition.js`** — Arena competitions
- `handleChallenge(msg, state)` → pending challenge
- `handleAcceptChallenge(msg, state)` → active competition
- `handleForfeit(msg, state)` → ended competition
- `handleScore(msg, state)` → recorded result + Spark awards
- Zone check: competition only in competition-enabled zones
- Consent enforcement

**3.9 `src/js/exploration.js`** — Discovery & mapping
- `handleDiscover(msg, state)` → new discovery entry + Spark
- `handleInspect(msg, state)` → entity info
- `isDuplicate(playerId, location, state)` → boolean
- Discovery rarity calculation

**3.10 `src/js/physical.js`** — Geolocation, anchors, Warmth
- `createAnchor(msg, state)` → new anchor (validation)
- `validateAnchorLocation(lat, lon)` → safe boolean
- `calculateWarmth(gpsHistory)` → warmth value
- `getWarmthBonus(warmth)` → multiplier (minor, cosmetic-adjacent)
- `ANCHOR_TYPES` — zone_portal, resource_node, discovery_point, gathering_spot, garden_plot
- Null-safe: everything works without geolocation

### Layer 4: Client (depends on all above)

**3.11 `src/js/auth.js`** — GitHub OAuth
- `initiateOAuth()` → redirect to GitHub
- `handleCallback(code)` → exchange for token
- `getProfile(token)` → {username, avatar_url}
- `isAuthenticated()` → boolean
- `getUsername()` → string
- Token stored in localStorage
- OAuth app client ID configured (needs GitHub OAuth App setup)

**3.12 `src/js/network.js`** — PeerJS mesh
- `initMesh(peerId)` → connect to PeerJS cloud
- `broadcastMessage(msg)` → send to all connected peers
- `onMessage(callback)` → register handler
- `getPeers()` → connected peer IDs
- `connectToPeer(peerId)` → establish connection
- Peer discovery: use a known "lobby" peer ID derived from world ID
- Automatic reconnection on disconnect
- Message deduplication (by message ID)

**3.13 `src/js/world.js`** — Three.js scene & rendering
- `initScene(container)` → Three.js scene, camera, renderer
- `loadZone(zoneId)` → generate terrain, objects, portals for zone
- `addPlayer(playerId, position)` → player mesh in scene
- `movePlayer(playerId, position)` → animate movement
- `removePlayer(playerId)` → remove from scene
- `updateDayNight(worldTime)` → lighting changes
- `updateWeather(weatherType)` → visual effects
- Zone-specific terrain generators (procedural, not assets)
- Portal meshes (glowing archways between zones)
- Player meshes (simple capsule + name label)

**3.14 `src/js/input.js`** — Input → protocol messages
- `initInput()` → bind keyboard/mouse/touch
- WASD/arrow keys → `move` messages
- Click on portal → `warp` message
- Enter key → open chat → `say`/`shout`/`whisper` message
- Click on resource → `harvest` message
- Build mode (B key) → `build` messages
- Platform detection: desktop vs touch vs VR controller
- Gesture mapping for VR/AR (WebXR input sources)

**3.15 `src/js/hud.js`** — UI overlay
- Chat window (scrolling, input field)
- Minimap (zone overview)
- Player info (name, Spark balance, zone)
- Nearby players list
- Intention indicators
- Zone name display
- Play timer / break reminder (§5.3)
- Responsive: adapts to screen size

**3.16 `src/js/xr.js`** — WebXR integration
- `initXR()` → check WebXR support
- `enterVR()` → immersive VR session
- `enterAR()` → AR session with camera passthrough
- Safety warning before AR mode (§8.6)
- Speed detection: pause AR at driving speed
- Fallback: everything works without WebXR

**3.17 `src/js/audio.js`** — Sound
- `initAudio()` → AudioContext
- Ambient sounds per zone (procedural/simple oscillators)
- UI sounds (chat message, portal warp, harvest)
- Volume control
- Mute toggle
- No audio files — all procedural (keeps single-file constraint)

**3.18 `src/js/main.js`** — Entry point & game loop
- Platform detection (desktop/phone/vr/ar)
- Auth flow → network init → state load → world render → input bind → HUD init
- Game loop: `requestAnimationFrame` → process messages → evaluate intentions → update world → render
- Handles join/leave lifecycle
- Coordinates all modules

### Layer 5: CSS

**3.19 `src/css/tokens.css`** — Design tokens
- Colors (earthy, peaceful palette), typography, spacing scale

**3.20 `src/css/layout.css`** — Responsive layout
- Canvas fills viewport, HUD overlays

**3.21 `src/css/hud.css`** — HUD styling
- Chat panel, minimap, player info, zone label

**3.22 `src/css/world.css`** — World-specific
- Portal glow effects, loading states

### Layer 6: HTML Shell

**3.23 `src/html/index.html`** — Template
- Minimal HTML5 document
- CDN script tags: Three.js, PeerJS
- Inline CSS (from tokens + layout + hud + world)
- Inline JS (from all modules, in dependency order)
- Canvas element for Three.js
- HUD container elements
- OAuth callback handler

### Layer 7: Python Scripts

**3.24 `scripts/validate_message.py`** — Protocol validation (mirrors protocol.js)
- Same validation rules as JS, for server-side/CI use
- Reads from stdin or file, outputs valid/invalid + errors

**3.25 `scripts/game_tick.py`** — World simulation
- Day/night cycle calculation
- Weather generation (seeded random)
- Season determination
- Plant growth advancement
- Resource respawn
- Reads state JSON, outputs updated state JSON

**3.26 `scripts/economy_engine.py`** — Economy processing
- Spark generation for queued activities
- Transaction processing
- Market listing expiry
- Reads economy.json + actions.json, outputs updated economy.json

**3.27 `scripts/architect_genesis.py`** — World generation
- Creates initial world.json with 8 zones
- Seeds initial resources in each zone
- Creates garden plots, structures, trade routes
- Creates founding/agents.json with 100 AI citizens

**3.28 `scripts/agent_autonomy.py`** — Agent activation
- Reads agents.json, picks N agents to activate
- For each: reads soul file, generates intention messages
- Outputs action messages for agents to submit

**3.29 `scripts/sync_state.py`** — State sync
- Reads inbox/*.json delta files
- Merges into canonical state files
- Resolves conflicts (last-writer-wins)

**3.30 `scripts/anchor_validate.py`** — Anchor safety
- Validates GPS coords aren't in dangerous locations
- Checks against known road/highway boundaries (basic)

**3.31 `scripts/bundle.sh`** — Build single HTML
- Reads src/html/index.html template
- Inlines all CSS files
- Inlines all JS files (in dependency order)
- Outputs docs/index.html
- Verifies output is a single valid HTML file

**3.32 `scripts/pii_scan.py`** — Security scan
- Scans all state JSON for email addresses, tokens, keys
- Exits non-zero if PII found

### Layer 8: Genesis Data

**3.33 `state/world.json`** — 8 zones with terrain, objects, portals
**3.34 `state/players.json`** — empty (players join dynamically)
**3.35 `state/economy.json`** — empty ledger
**3.36 `state/gardens.json`** — initial garden plots (seeded by architect)
**3.37 `state/structures.json`** — initial structures (seeded by architect)
**3.38 `state/discoveries.json`** — empty
**3.39 `state/anchors.json`** — empty
**3.40 `state/chat.json`** — empty
**3.41 `state/actions.json`** — empty
**3.42 `state/changes.json`** — empty
**3.43 `state/competitions.json`** — empty
**3.44 `state/federation.json`** — empty federations array
**3.45 `state/founding/agents.json`** — 100 AI citizens with archetypes

### Layer 9: GitHub Actions

**3.46 `.github/workflows/game-tick.yml`** — Runs game_tick.py on cron (every 5 min)
**3.47 `.github/workflows/sync-state.yml`** — Runs sync_state.py on cron (every 2 min)
**3.48 `.github/workflows/validate-pr.yml`** — Runs validate_message.py + pii_scan.py on PRs
**3.49 `.github/workflows/agent-autonomy.yml`** — Runs agent_autonomy.py on cron (every 10 min)
**3.50 `.github/workflows/anchor-review.yml`** — Runs anchor_validate.py on anchor PRs
**3.51 `.github/workflows/pii-scan.yml`** — Runs pii_scan.py on all PRs

### Layer 10: Docs

**3.52 `README.md`** — Quick start: "Open the URL, you're in"
**3.53 `CLAUDE.md`** — Dev guide for AI contributors
**3.54 `skill.md`** — Protocol guide for AI players
**3.55 `skill.json`** — Machine-readable protocol spec

---

## Phase 4: Run Tests & Fix

1. Run `tests/run_all.sh`
2. Fix any failures
3. Repeat until all green
4. Run bundle.sh → verify docs/index.html is valid single HTML
5. Open docs/index.html in browser → verify world renders
6. Open in two tabs → verify P2P connectivity

---

## Phase 5: Deploy

1. `git init` in /Users/kodyw/Projects/Zion
2. `gh repo create kodyw/zion --public` → github.com/kodyw/zion
3. `git remote add origin git@github.com:kodyw/zion.git` + push all code
4. Enable GitHub Pages via `gh api` (source: docs/ folder, main branch)
5. Live URL: https://kodyw.github.io/zion/
6. GitHub OAuth App: user creates at github.com/settings/developers, callback = https://kodyw.github.io/zion/
7. Update auth.js with OAuth client ID, re-bundle, push
8. Verify live URL loads and works

---

## Verification Checklist (from Constitution)

- [ ] Open docs/index.html locally → world renders, 8 zones visible
- [ ] GitHub OAuth → player spawns in The Nexus
- [ ] Two browser tabs → both players see each other (PeerJS)
- [ ] AI agent sends protocol messages → appears and acts in world
- [ ] Set intentions → auto-greet fires when player approaches
- [ ] Plant a garden → watch it grow over time
- [ ] Build a structure → persists after disconnect/reconnect
- [ ] Trade between players → Spark transfers, ledger updates
- [ ] Visit The Arena → challenge flow with consent works
- [ ] Check canonical state → JSON is valid and auditable
- [ ] Founding Hundred defined in agents.json
- [ ] Single HTML file, no external assets except CDN libs
- [ ] All protocol messages follow §3.1 format
- [ ] Zone rules enforced per §5.5
- [ ] Intention system works per Article IV
- [ ] Economy follows earn table per §6.2
- [ ] No admin backdoors — protocol is only interface
