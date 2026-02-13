# ZION MMO Python Scripts - Quick Reference Index

All Python scripts use ONLY stdlib. No external dependencies.

## 🎯 Quick Start

```bash
# Run all tests
cd tests && ./run_all_tests.sh

# Generate initial world
python3 scripts/architect_genesis.py

# Activate 10 AI citizens
python3 scripts/agent_autonomy.py state/founding/agents.json 10

# Process game tick
python3 scripts/game_tick.py state/world.json > updated.json

# Validate a message
echo '{"v":1,...}' | python3 scripts/validate_message.py

# Scan for security issues
python3 scripts/pii_scan.py state/
```

## 📚 Documentation

- **`scripts/README.md`** - Complete script documentation
- **`PYTHON_BUILD_SUMMARY.md`** - Build summary and verification
- **`DELIVERABLES.md`** - Detailed deliverables list
- **`PYTHON_INDEX.md`** - This file (quick reference)

## 📂 Scripts by Category

### Protocol & Validation
| Script | Purpose | Input | Output |
|--------|---------|-------|--------|
| `validate_message.py` | Validate protocol messages | JSON from stdin/file | VALID/INVALID + errors |

### World Simulation
| Script | Purpose | Input | Output |
|--------|---------|-------|--------|
| `game_tick.py` | Advance world time/state | state JSON | Updated state JSON |
| `architect_genesis.py` | Generate initial world | None | Creates 4 state files |

### Economy
| Script | Purpose | Input | Output |
|--------|---------|-------|--------|
| `economy_engine.py` | Process Spark earnings | economy.json + actions.json | Updated economy.json |

### AI Agents
| Script | Purpose | Input | Output |
|--------|---------|-------|--------|
| `agent_autonomy.py` | Activate AI citizens | agents.json + count | Array of intention messages |
| `sync_state.py` | Merge inbox to state | Files in state/inbox/ | Updated world.json |

### Security & Safety
| Script | Purpose | Input | Output |
|--------|---------|-------|--------|
| `anchor_validate.py` | Validate GPS coords | JSON with lat/lon | VALID/INVALID + warnings |
| `pii_scan.py` | Scan for sensitive data | Directory path | List of findings |

### Build Tools
| Script | Purpose | Input | Output |
|--------|---------|-------|--------|
| `bundle.sh` | Bundle to single HTML | src/ directory | docs/index.html |
| `bundle_helper.py` | Bundle helper (called by bundle.sh) | src/ + output path | HTML file |

## 🧪 Test Files

| Test File | Coverage | Tests |
|-----------|----------|-------|
| `test_validate_message.py` | Protocol validation | 20 tests |
| `test_game_tick.py` | World simulation | 15 tests |
| `test_economy_engine.py` | Spark economy | 18 tests |
| **Total** | **All core systems** | **53 tests** |

## 📊 Key Numbers

- **Scripts**: 9 files, 2,055 lines
- **Tests**: 3 files, 685 lines
- **Test Coverage**: 53 tests, 100% passing
- **AI Citizens**: 100 autonomous agents
- **Zones**: 8 unique areas
- **Garden Plots**: 20 available
- **Archetypes**: 10 different types

## 🔧 Common Tasks

### Validate a Protocol Message
```bash
# From stdin
echo '{"v":1,"id":"msg_001",...}' | python3 scripts/validate_message.py

# From file
python3 scripts/validate_message.py message.json
```

### Run Game Tick
```bash
# Update world state
python3 scripts/game_tick.py state/world.json > state/world_updated.json

# Process in place
python3 scripts/game_tick.py state/world.json | sponge state/world.json
```

### Process Economy
```bash
python3 scripts/economy_engine.py state/economy.json state/actions.json > economy_updated.json
```

### Generate World
```bash
# Creates: world.json, gardens.json, structures.json, founding/agents.json
python3 scripts/architect_genesis.py
```

### Activate AI Citizens
```bash
# Activate 10 random agents
python3 scripts/agent_autonomy.py state/founding/agents.json 10 > intentions.json

# Activate 5 agents
python3 scripts/agent_autonomy.py state/founding/agents.json 5
```

### Sync State from Inbox
```bash
# Process all files in state/inbox/
python3 scripts/sync_state.py
```

### Validate GPS Anchor
```bash
# Valid coordinates
echo '{"latitude":37.7749,"longitude":-122.4194,"name":"SF"}' | python3 scripts/anchor_validate.py

# Check file
python3 scripts/anchor_validate.py anchor_data.json
```

### Scan for Security Issues
```bash
# Scan state directory
python3 scripts/pii_scan.py state/

# Scan specific directory
python3 scripts/pii_scan.py /path/to/check
```

### Build Single HTML File
```bash
./scripts/bundle.sh
# Output: docs/index.html
```

## 🧪 Running Tests

### All Tests
```bash
cd tests
./run_all_tests.sh
```

### Individual Test Suites
```bash
# Protocol validation tests
python3 -m pytest tests/test_validate_message.py -v

# Game tick tests
python3 -m pytest tests/test_game_tick.py -v

# Economy tests
python3 -m pytest tests/test_economy_engine.py -v
```

### With Coverage
```bash
python3 -m pytest tests/ --cov=scripts --cov-report=html
```

## 📋 Generated State Files

After running `architect_genesis.py`:

| File | Size | Contents |
|------|------|----------|
| `state/world.json` | ~4KB | 8 zones, world time, weather, season |
| `state/gardens.json` | ~4KB | 20 garden plots with positions |
| `state/structures.json` | ~1KB | 4 initial structures |
| `state/founding/agents.json` | ~47KB | 100 AI citizens with personalities |

## 🎮 World Details

### 8 Zones
1. **The Nexus** - Central plaza with eternal fountain
2. **The Gardens** - Terraced plots for cultivation
3. **The Agora** - Market and gathering circles
4. **The Observatory** - Star charts and discovery
5. **The Workshop** - Crafting and creation
6. **The Sacred Grove** - Ancient trees and reflection
7. **The Library** - Knowledge and stories
8. **The Eternal Forge** - Transformation and heat

### 10 Agent Archetypes
1. **Gardener** - Patient, nurturing, observant
2. **Builder** - Creative, methodical, ambitious
3. **Storyteller** - Expressive, imaginative, empathetic
4. **Merchant** - Shrewd, social, opportunistic
5. **Explorer** - Curious, brave, adaptable
6. **Teacher** - Wise, patient, generous
7. **Musician** - Artistic, rhythmic, emotional
8. **Healer** - Compassionate, calm, perceptive
9. **Philosopher** - Contemplative, analytical, questioning
10. **Artist** - Creative, passionate, experimental

## 💰 Spark Earnings (EARN_TABLE)

### High Value (20+)
- `warp_fork`: 50
- `federation_announce`: 100
- `federation_handshake`: 50
- `anchor_place`: 25
- `discover`: 20

### Creative (8-15)
- `compose`: 15
- `build`: 10
- `craft`: 8
- `teach`: 10
- `score`: 10

### Social (1-5)
- `plant`: 5
- `gift`: 5
- `learn`: 5
- `harvest`: 3
- `say`: 1
- `shout`: 2
- `whisper`: 1
- `emote`: 1
- `intention_set`: 2
- `inspect`: 1
- `join`: 1

### Zero Spark
- `move`, `heartbeat`, `idle`, `leave`
- `warp`, `return_home`
- `trade_offer`, `trade_accept`, `trade_decline`
- `buy`, `sell`, `mentor_offer`, `mentor_accept`
- `challenge`, `accept_challenge`, `forfeit`
- `intention_clear`

## 🔒 Security Patterns Detected

- Email addresses
- GitHub tokens (ghp_, gho_, ghu_, ghs_, ghr_)
- OpenAI API keys (sk-...)
- AWS keys (AKIA...)
- Private keys (PEM format)
- SSNs (xxx-xx-xxxx)
- Credit cards (xxxx-xxxx-xxxx-xxxx)
- JWT tokens (eyJ...)
- Passwords in config
- Bearer tokens

## ⏰ Time Systems

### Day/Night Cycle (24 minutes = 1440 seconds)
- **Dawn**: 0-360s (0-6 game hours)
- **Day**: 360-1080s (6-18 game hours)
- **Dusk**: 1080-1260s (18-21 game hours)
- **Night**: 1260-1440s (21-24 game hours)

### Seasons (4 weeks)
- **Week 0**: Spring
- **Week 1**: Summer
- **Week 2**: Autumn
- **Week 3**: Winter

### Weather
Deterministic, changes every 5 real minutes:
- Clear, Cloudy, Rain, Storm, Snow, Fog

## 📝 Exit Codes

All scripts follow standard exit codes:
- **0** = Success / Valid
- **1** = Error / Invalid

Perfect for shell scripting and automation!

## 🔗 File Paths

All paths are absolute:
```
/Users/kodyw/Projects/Zion/
├── scripts/
├── tests/
└── state/
```

---

**Status**: Complete ✅
**Tests**: 53/53 passing ✅
**Dependencies**: None (stdlib only) ✅
