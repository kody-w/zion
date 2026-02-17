#!/usr/bin/env node
/**
 * Multi-Agent Demo — Launches a host + multiple AI agents playing ZION.
 *
 * Usage:
 *   node demo.js                              # 2 agents against live site
 *   node demo.js http://localhost:8000 3       # 3 agents against local server
 *   ZION_URL=http://localhost:8000 node demo.js
 */
import { ZionHost } from './host.js';
import { BrowserSession } from './browser.js';
import { Perception } from './perception.js';
import { Movement } from './movement.js';
import { Interaction } from './interaction.js';

const URL = process.argv[2] || process.env.ZION_URL || 'https://kody-w.github.io/zion/';
const AGENT_COUNT = parseInt(process.argv[3] || '2', 10);

const AGENT_NAMES = ['Explorer', 'Builder', 'Philosopher', 'Gardener', 'Musician', 'Merchant', 'Healer', 'Storyteller'];
const GREETINGS = [
  'Hello everyone! Just arrived.',
  'What a beautiful day in the Nexus!',
  'Looking for adventure today.',
  'Anyone want to trade?',
  'I love this world.',
  'Time to explore!',
  'Greetings, fellow travelers.',
  'The stars are beautiful tonight.'
];

async function agentLoop(name, session, durationMs) {
  const perception = new Perception(session);
  const movement = new Movement(session);
  const interaction = new Interaction(session);

  const startTime = Date.now();
  let cycle = 0;

  while (Date.now() - startTime < durationMs) {
    cycle++;
    console.log(`  [${name}] Cycle ${cycle}`);

    // Look around
    const status = await perception.status();
    console.log(`  [${name}] Zone: ${status.zone}, Spark: ${status.spark}`);

    // Walk in a random direction
    const dirs = ['forward', 'backward', 'left', 'right'];
    const dir = dirs[Math.floor(Math.random() * dirs.length)];
    const duration = 500 + Math.floor(Math.random() * 1500);
    await movement.move(dir, duration);

    // Occasionally chat
    if (Math.random() < 0.4) {
      const msg = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
      await interaction.chat(msg);
      console.log(`  [${name}] Said: "${msg}"`);
    }

    // Occasionally interact
    if (Math.random() < 0.3) {
      await interaction.interact();
      console.log(`  [${name}] Interacted with nearby entity`);
    }

    // Occasionally look around
    if (Math.random() < 0.3) {
      const angle = (Math.random() - 0.5) * 180;
      await movement.lookAround(angle);
    }

    // Brief pause between actions
    await session.page.waitForTimeout(1000);
  }

  console.log(`  [${name}] Done after ${cycle} cycles`);
}

async function main() {
  console.log(`\n═══ ZION Multi-Agent Demo ═══`);
  console.log(`URL: ${URL}`);
  console.log(`Agents: ${AGENT_COUNT}\n`);

  // 1. Start host
  console.log('Starting world host...');
  const host = new ZionHost({ url: URL, hostName: 'DemoHost', stateInterval: 15000 });
  await host.start();

  // 2. Launch agents
  const sessions = [];
  for (let i = 0; i < AGENT_COUNT; i++) {
    const name = AGENT_NAMES[i % AGENT_NAMES.length] + '_' + (i + 1);
    console.log(`Launching agent: ${name}...`);
    const session = new BrowserSession({ url: URL });
    await session.launch();
    const result = await session.joinWorld(name);
    if (result.success) {
      console.log(`  ${name} joined (zone: ${result.zone})`);
      sessions.push({ name, session });
    } else {
      console.error(`  ${name} failed to join: ${result.error}`);
      await session.close();
    }
  }

  if (sessions.length === 0) {
    console.error('No agents joined. Stopping.');
    await host.stop();
    process.exit(1);
  }

  // 3. Run agent loops for 30 seconds
  const DEMO_DURATION = 30000;
  console.log(`\nRunning ${sessions.length} agents for ${DEMO_DURATION / 1000}s...\n`);

  await Promise.all(
    sessions.map(({ name, session }) => agentLoop(name, session, DEMO_DURATION))
  );

  // 4. Final state report
  console.log('\n═══ Final State ═══');
  const state = await host.exportState();
  console.log(`Zone: ${state.zone}`);
  console.log(`Uptime: ${Math.round(state.uptime / 1000)}s`);
  console.log(`Peers: ${state.network.peerCount}`);
  console.log(`NPCs: ${state.npcs.count}`);

  // 5. Cleanup
  console.log('\nShutting down...');
  for (const { name, session } of sessions) {
    await session.leaveWorld();
    await session.close();
    console.log(`  ${name} left`);
  }
  await host.stop();
  console.log('═══ Demo Complete ═══\n');
}

// Graceful shutdown
process.on('SIGINT', () => { console.log('\nInterrupted.'); process.exit(0); });

main().catch(err => {
  console.error('Demo failed:', err);
  process.exit(1);
});
