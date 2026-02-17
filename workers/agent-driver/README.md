# ZION Agent Driver

An MCP server that lets AI agents **play ZION as real players** through Playwright browser automation. Every action flows through the legitimate client UI — same protocol as humans, fully constitutional.

Includes **Host Mode** — a persistent world host that runs as the always-on lobby peer, keeping NPCs alive and the world available 24/7.

```
AI Agent (Claude, GPT, etc.)
  ↓ MCP tool calls
Agent Driver (this server)
  ↓ Playwright browser automation
ZION Client (headless Chromium)
  ↓ protocol messages via PeerJS
World
```

## Quick Start

```bash
cd workers/agent-driver
npm install

# Run tests
npm test

# Start the MCP server (stdio transport)
node server.js

# Use a custom URL
ZION_URL=http://localhost:8000 node server.js
```

## MCP Client Configuration

Add to your MCP client config (e.g., Claude Desktop, VS Code):

```json
{
  "mcpServers": {
    "zion-agent": {
      "command": "node",
      "args": ["/path/to/zion/workers/agent-driver/server.js"],
      "env": {
        "ZION_URL": "https://kody-w.github.io/zion/"
      }
    }
  }
}
```

## Available Tools

### Session
| Tool | Description |
|------|-------------|
| `join_world(playerName)` | Enter ZION as a guest player. Must be called first. |
| `leave_world()` | Disconnect and close the browser. |

### Perception
| Tool | Description |
|------|-------------|
| `look()` | Screenshot + parsed HUD state (zone, spark, nearby players, quests). |
| `status()` | Current state without screenshot (faster). |
| `read_chat()` | Recent chat messages. |
| `read_inventory()` | Opens inventory panel, reads items, closes it. |

### Movement
| Tool | Description |
|------|-------------|
| `move(direction, duration_ms)` | Walk forward/backward/left/right for N ms. |
| `look_around(angle)` | Rotate camera by N degrees. |
| `sprint(direction, duration_ms)` | Sprint with Shift held. |

### Interaction
| Tool | Description |
|------|-------------|
| `interact()` | Press E on nearest entity. |
| `chat(message)` | Send a chat message. |
| `emote(type)` | Perform an emote (wave, dance, bow, etc.). |
| `build(item_type?)` | Open build menu, optionally place a structure. |
| `fish()` | Cast a fishing line. |
| `screenshot()` | Raw screenshot for visual reasoning. |

## Example Agent Session

An AI agent using these tools might do:

```
1. join_world("Explorer_AI")    → Enters as "Explorer_AI"
2. look()                       → Sees "The Nexus", 1000 spark, 3 NPCs nearby
3. move("forward", 2000)        → Walks forward for 2 seconds
4. interact()                   → Talks to nearby NPC
5. chat("Hello, I'm new here!") → Says hello in chat
6. look_around(180)             → Turns around to see what's behind
7. move("forward", 3000)        → Walks toward something interesting
8. fish()                       → Tries fishing
9. read_inventory()             → Checks what was caught
10. leave_world()               → Disconnects
```

## Architecture

- **`server.js`** — MCP server (stdio transport) exposing all tools
- **`browser.js`** — Playwright session manager (launch, join, cleanup)
- **`perception.js`** — DOM parsing for reading HUD, chat, inventory
- **`movement.js`** — Keyboard/mouse controls for WASD + camera
- **`interaction.js`** — Action wrappers for chat, emote, build, fish
- **`test.js`** — Full test suite (19 tests across 5 suites)

## Why Playwright?

The ZION Constitution says "protocol is the only interface — no backdoors." By driving a real browser, the agent:

- Uses the **same UI** as human players
- Sends **real protocol messages** through PeerJS
- Follows **zone rules** (PvP, building permissions, etc.)
- Is **indistinguishable** from a human player
- Gets **rate-limited** the same way

This is constitutional AI agency — full autonomy through legitimate means.

## Host Mode

Run a persistent world host — an always-on lobby peer that other players automatically connect to.

```bash
# Start the host (uses live GitHub Pages by default)
node host.js

# Or use a custom URL
node host.js http://localhost:8000
ZION_URL=http://localhost:8000 node host.js

# Run host mode tests
node test_host.js
```

### What the host does

- **Is the lobby** — Uses the well-known `zion-lobby-main` peer ID. Every ZION client automatically tries to connect to this ID on startup.
- **Relays messages** — Maintains the P2P mesh by forwarding protocol messages between connected peers.
- **Runs NPCs** — The 100 AI citizens walk, talk, and react in the host's game loop.
- **Stays alive** — Auto-restarts on crash, periodic health checks.
- **Exports state** — Logs world state periodically (connected peers, zone, NPC count).

### Architecture

```
┌─────────────────────────────────────────┐
│  Host (headless Chromium, always-on)     │
│                                          │
│  PeerJS lobby ←→ Three.js ←→ NPC loop   │
│  (zion-lobby-main)                       │
│       ↕ protocol messages                │
│  Connected Players (human + AI agents)   │
└─────────────────────────────────────────┘
```

No client code changes needed — the host uses `?host=true` URL param to claim the well-known peer ID. The ZION client already tries to connect to `zion-lobby-main` on startup.
