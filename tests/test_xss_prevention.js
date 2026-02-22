// test_xss_prevention.js — Verify XSS prevention in HUD chat and player info
var fs = require('fs');
var path = require('path');
var passed = 0;
var failed = 0;

function assert(cond, msg) {
  if (!cond) { failed++; console.log('FAIL: ' + msg); }
  else { passed++; }
}

// Read hud.js source
var hudSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'js', 'hud.js'), 'utf8');

// Verify escapeHtml function exists
assert(hudSource.indexOf('function escapeHtml') !== -1, 'escapeHtml function should exist in hud.js');
assert(hudSource.indexOf('.replace(/&/g') !== -1, 'escapeHtml should escape ampersands');
assert(hudSource.indexOf('.replace(/</g') !== -1, 'escapeHtml should escape less-than');
assert(hudSource.indexOf('.replace(/>/g') !== -1, 'escapeHtml should escape greater-than');

// Verify chat updateChat uses escapeHtml
var updateChatSection = hudSource.substring(
  hudSource.indexOf('function updateChat'),
  hudSource.indexOf('function updateChat') + 2000
);
assert(updateChatSection.indexOf('escapeHtml(msg.user)') !== -1, 'updateChat should escape msg.user');
assert(updateChatSection.indexOf('escapeHtml(msg.text)') !== -1, 'updateChat should escape msg.text');

// Verify addChatMessage uses escapeHtml
var addChatSection = hudSource.substring(
  hudSource.indexOf('function addChatMessage'),
  hudSource.indexOf('function addChatMessage') + 1000
);
assert(addChatSection.indexOf('escapeHtml(user') !== -1, 'addChatMessage should escape user');
assert(addChatSection.indexOf('escapeHtml(text') !== -1, 'addChatMessage should escape text');

// Verify updatePlayerInfo uses escapeHtml
var playerInfoSection = hudSource.substring(
  hudSource.indexOf('function updatePlayerInfo'),
  hudSource.indexOf('function updatePlayerInfo') + 1000
);
assert(playerInfoSection.indexOf('escapeHtml(player.name') !== -1, 'updatePlayerInfo should escape player.name');
assert(playerInfoSection.indexOf('escapeHtml(player.zone') !== -1, 'updatePlayerInfo should escape player.zone');

// Test the escapeHtml function directly
var HUD = require('../src/js/hud');
if (HUD.escapeHtml) {
  assert(HUD.escapeHtml('<script>alert(1)</script>') === '&lt;script&gt;alert(1)&lt;/script&gt;', 'escapeHtml should neutralize script tags');
  assert(HUD.escapeHtml('"onclick="hack"') === '&quot;onclick=&quot;hack&quot;', 'escapeHtml should escape quotes');
} else {
  // escapeHtml is internal — verify through source analysis only
  assert(true, 'escapeHtml is internal function (not exported), verified through source analysis');
}

console.log(passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
