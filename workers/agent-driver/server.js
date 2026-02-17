#!/usr/bin/env node
/**
 * ZION Agent Driver — MCP Server
 *
 * An MCP server that lets AI agents play ZION through Playwright browser
 * automation. All actions flow through the real client UI, using the
 * same protocol as human players.
 *
 * Usage:
 *   node server.js                           # stdio transport (for MCP clients)
 *   ZION_URL=http://localhost:8000 node server.js  # custom URL
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { BrowserSession } from './browser.js';
import { Perception } from './perception.js';
import { Movement } from './movement.js';
import { Interaction } from './interaction.js';

const ZION_URL = process.env.ZION_URL || 'https://kody-w.github.io/zion/';

// Shared session state
let session = null;
let perception = null;
let movement = null;
let interaction = null;

function ensureSession() {
  if (!session || !session.isConnected()) {
    throw new Error('Not connected. Call join_world first.');
  }
}

// ── MCP Server ──────────────────────────────────────────────────────
const server = new Server(
  { name: 'zion-agent-driver', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// ── Session tools ───────────────────────────────────────────────────
server.tool(
  'join_world',
  'Join the ZION world as a guest player. Must be called first.',
  { playerName: z.string().describe('Your character name (max 39 chars)') },
  async ({ playerName }) => {
    if (session && session.isConnected()) {
      await session.close();
    }
    session = new BrowserSession({ url: ZION_URL });
    await session.launch();
    const result = await session.joinWorld(playerName);

    if (result.success) {
      perception = new Perception(session);
      movement = new Movement(session);
      interaction = new Interaction(session);
      const state = await perception.status();
      return { content: [{ type: 'text', text: JSON.stringify({ joined: true, ...state }, null, 2) }] };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ joined: false, error: result.error }) }] };
  }
);

server.tool(
  'leave_world',
  'Leave the ZION world and close the browser session.',
  {},
  async () => {
    if (session) {
      await session.leaveWorld();
      await session.close();
      session = null;
      perception = null;
      movement = null;
      interaction = null;
    }
    return { content: [{ type: 'text', text: '{"left": true}' }] };
  }
);

// ── Perception tools ────────────────────────────────────────────────
server.tool(
  'look',
  'Look at the world: returns a screenshot and parsed HUD state (zone, spark, nearby players, quests).',
  {},
  async () => {
    ensureSession();
    const state = await perception.look();
    const { screenshot, ...textState } = state;
    return {
      content: [
        { type: 'text', text: JSON.stringify(textState, null, 2) },
        { type: 'image', data: screenshot, mimeType: 'image/png' }
      ]
    };
  }
);

server.tool(
  'status',
  'Get current player status (zone, spark, nearby players) without a screenshot.',
  {},
  async () => {
    ensureSession();
    const state = await perception.status();
    return { content: [{ type: 'text', text: JSON.stringify(state, null, 2) }] };
  }
);

server.tool(
  'read_chat',
  'Read recent chat messages from the chat panel.',
  {},
  async () => {
    ensureSession();
    const messages = await perception.readChat();
    return { content: [{ type: 'text', text: JSON.stringify(messages, null, 2) }] };
  }
);

server.tool(
  'read_inventory',
  'Open and read the inventory panel, then close it.',
  {},
  async () => {
    ensureSession();
    const items = await perception.readInventory();
    return { content: [{ type: 'text', text: JSON.stringify(items, null, 2) }] };
  }
);

// ── Movement tools ──────────────────────────────────────────────────
server.tool(
  'move',
  'Walk in a direction for a given duration.',
  {
    direction: z.enum(['forward', 'backward', 'left', 'right']).describe('Movement direction'),
    duration_ms: z.number().min(100).max(5000).default(1000).describe('How long to walk in milliseconds')
  },
  async ({ direction, duration_ms }) => {
    ensureSession();
    const result = await movement.move(direction, duration_ms);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  'look_around',
  'Rotate the camera by dragging the mouse. Positive = right, negative = left.',
  { angle: z.number().min(-360).max(360).default(90).describe('Rotation angle in degrees') },
  async ({ angle }) => {
    ensureSession();
    const result = await movement.lookAround(angle);
    return {
      content: [
        { type: 'text', text: JSON.stringify({ angleTurned: result.angleTurned }, null, 2) },
        { type: 'image', data: result.screenshot, mimeType: 'image/png' }
      ]
    };
  }
);

server.tool(
  'sprint',
  'Sprint (Shift+direction) for a given duration.',
  {
    direction: z.enum(['forward', 'backward', 'left', 'right']).describe('Sprint direction'),
    duration_ms: z.number().min(100).max(5000).default(1000).describe('Sprint duration in ms')
  },
  async ({ direction, duration_ms }) => {
    ensureSession();
    const result = await movement.sprint(direction, duration_ms);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// ── Interaction tools ───────────────────────────────────────────────
server.tool(
  'interact',
  'Press E to interact with the nearest entity (NPC, resource, object).',
  {},
  async () => {
    ensureSession();
    const result = await interaction.interact();
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  'chat',
  'Send a chat message to nearby players.',
  { message: z.string().max(500).describe('The message to send') },
  async ({ message }) => {
    ensureSession();
    const result = await interaction.chat(message);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  'emote',
  'Perform an emote (wave, dance, bow, etc.).',
  { type: z.string().describe('Emote type (e.g., wave, dance, bow, cheer)') },
  async ({ type }) => {
    ensureSession();
    const result = await interaction.emote(type);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  'build',
  'Open the build menu and optionally place a structure.',
  { item_type: z.string().optional().describe('Type of structure to build (e.g., wall, bench, garden)') },
  async ({ item_type }) => {
    ensureSession();
    const result = await interaction.build(item_type);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  'fish',
  'Cast a fishing line (press X).',
  {},
  async () => {
    ensureSession();
    const result = await interaction.fish();
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  'screenshot',
  'Take a screenshot of the current view.',
  {},
  async () => {
    ensureSession();
    const result = await interaction.screenshot();
    return {
      content: [
        { type: 'image', data: result.image, mimeType: result.mimeType }
      ]
    };
  }
);

// ── Start ───────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
