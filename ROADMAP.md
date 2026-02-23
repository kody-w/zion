# ZION Development Roadmap

ZION has 153 modules, 249+ passing tests, and deep interconnected systems — but the new player experience lacks feedback loops. Players log in, see a beautiful world with 100 AI citizens, and have zero guidance. The systems exist but the **action → visible consequence → motivation** cycle is missing.

This roadmap addresses that gap in five phases.

---

## Phase 1: First 10 Minutes *(current)*

**Goal:** A new player logs in and within 10 minutes has been greeted, given a quest, leveled up, earned an achievement, and knows how to chat.

### Features

| Feature | Description | Files |
|---------|-------------|-------|
| Onboarding fix | `PlayerOnboarding.createState()` export so onboarding state actually initializes | `player_onboarding.js`, `main.js` |
| NPC proximity greeting | First-time speech bubble + chime when player walks near an NPC | `main.js`, `npcs.js` |
| Tutorial quest auto-accept | Auto-assign `quest_nexus_001` on login if no active quests | `main.js` |
| Level-up celebration | Add `level_up` piano accent, boost particle count | `audio.js`, `main.js` |
| Achievement banner | Large purple/gold "ACHIEVEMENT UNLOCKED" banner in HUD | `hud.js`, `main.js` |
| Chat hint | Delayed "Press Enter to chat" notification 60s after login | `main.js` |

### Success Criteria
- `PlayerOnboarding.createState()` returns valid state object
- Walking near an NPC for the first time triggers a greeting notification
- New players start with an active quest in their quest log
- Level-up plays an ascending piano arpeggio + 40 gold particles
- Achievements display a distinct banner (not a generic toast)
- All 255+ tests pass, bundle loads with 0 console errors

---

## Phase 2: Alive World

**Goal:** The world feels dynamic — NPCs visibly do things, weather changes gameplay, resources regenerate on-screen, wildlife reacts to the player.

### Features

| Feature | Description | Files |
|---------|-------------|-------|
| NPC activity animations | NPCs play role-appropriate idle animations (gardener tends plants, builder hammers, musician plays) | `npcs.js`, `world.js` |
| Weather gameplay effects | Rain boosts garden yield, storms reduce visibility, snow slows movement | `world.js`, `main.js`, `zones.js` |
| Resource respawn visuals | Harvested nodes show regrowth animation over time instead of popping in | `world.js` |
| Ambient wildlife behavior | Butterflies flee players, fish jump at dawn, fireflies cluster near gardens | `world.js` |
| Footpath memory | Frequently-walked paths get worn textures showing player traffic patterns | `world.js`, `exploration.js` |

### Success Criteria
- NPCs are visibly active (not just standing still) at all times
- Weather changes trigger at least one gameplay modifier
- Harvested resources show 3-stage regrowth (empty → sprout → harvestable)
- Wildlife reacts to player proximity within 10 units
- High-traffic paths are visually distinct from untraveled terrain

---

## Phase 3: Social Fabric

**Goal:** Players can find, friend, group, and communicate with each other using the existing protocol.

### Features

| Feature | Description | Files |
|---------|-------------|-------|
| Friends list | Add/remove friends, see online status, quick-travel to friend | `social.js`, `hud.js`, `network.js` |
| Party system | Invite nearby players to party, shared quest progress, party chat | `social.js`, `hud.js`, `main.js` |
| Guild radar | Show guild members on minimap with distinct markers | `hud.js`, `social.js` |
| LFG board | Repurpose BountyBoard for "Looking For Group" postings | `bounty_board.js`, `hud.js` |
| Whisper tab | Private messaging tab in chat panel | `hud.js`, `network.js` |

### Success Criteria
- Players can add friends and see their online/offline status
- Party of 2+ shares quest objective progress
- Guild members appear as colored dots on the minimap
- LFG posts are visible zone-wide with one-click join
- Whisper messages are end-to-end between two players only

---

## Phase 4: Every Screen

**Goal:** ZION works well on mobile phones, tablets, and AR-capable devices.

### Features

| Feature | Description | Files |
|---------|-------------|-------|
| Mobile touch controls | Virtual joystick + tap targets for interact/chat/menu | `input.js`, `hud.js` |
| Responsive HUD | HUD panels reflow for narrow screens, collapse to icons | `hud.js`, CSS |
| Portrait mode | Camera and UI adapt to portrait orientation | `main.js`, `hud.js` |
| AR anchor visuals | Place ZION anchors in real-world AR view | `xr.js`, `world.js` |
| Geolocation integration | Geo-tagged anchors appear on a real-world map overlay | `xr.js`, `hud.js` |

### Success Criteria
- Mobile users can move, interact, chat, and access inventory without a keyboard
- HUD is usable on screens as narrow as 360px
- Portrait orientation doesn't break layout or camera
- AR mode renders at least one anchor in physical space
- Geo-anchors show within 100m of their real-world coordinates

---

## Phase 5: Multiverse

**Goal:** Multiple ZION worlds can federate — players travel between them carrying reputation and identity.

### Features

| Feature | Description | Files |
|---------|-------------|-------|
| Federation UI | Browse connected worlds, see their constitutions and population | `hud.js`, `network.js` |
| Rift portal visuals | Animated portal at zone edges connecting to other worlds | `world.js` |
| Cross-world travel | Step through a rift to load another world's state via PeerJS | `network.js`, `main.js` |
| Traveler's mark | Collectible marks from each visited world, shown on profile | `multiverse_reputation.js`, `hud.js` |
| World browser | Directory of public ZION instances with search and favorites | `hud.js`, `network.js` |

### Success Criteria
- Players can see a list of federated worlds with live player counts
- Rift portals render as visible, animated 3D objects
- Stepping through a rift loads the remote world within 5 seconds
- Traveler's marks persist across sessions and display on profile
- World browser lists at least 3 test worlds with ping times

---

## Implementation Order

Phases are sequential but features within a phase can be parallelized. Each phase follows TDD: write tests first, build until green, bundle, verify.

```
Phase 1 ← YOU ARE HERE
  ↓
Phase 2 (after Phase 1 ships and gets player feedback)
  ↓
Phase 3 (after world feels alive)
  ↓
Phase 4 (after social hooks are in place)
  ↓
Phase 5 (after mobile works)
```
