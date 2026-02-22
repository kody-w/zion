// test_xss_quest_inventory.js — Verify XSS prevention in quest, item pickup, and inventory panels
var fs = require('fs');
var path = require('path');
var passed = 0;
var failed = 0;

function assert(cond, msg) {
  if (!cond) { failed++; console.log('FAIL: ' + msg); }
  else { passed++; }
}

var hudSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'js', 'hud.js'), 'utf8');

// === Quest title escaping ===
// All quest.title references in innerHTML should use escapeHtml
var questTitleMatches = hudSource.match(/quest\.title/g) || [];
assert(questTitleMatches.length > 0, 'Should have quest.title references');

// Count unescaped quest.title in innerHTML contexts (should be 0)
var lines = hudSource.split('\n');
var unescapedQuestTitles = 0;
lines.forEach(function(line) {
  if (line.indexOf('quest.title') !== -1 && line.indexOf('innerHTML') === -1) {
    // Check if it's in an innerHTML context nearby
    if (line.indexOf("+ quest.title +") !== -1 && line.indexOf('escapeHtml') === -1) {
      unescapedQuestTitles++;
    }
  }
});
// The escaped pattern is: escapeHtml(quest.title)
var escapedQuestTitleCount = (hudSource.match(/escapeHtml\(quest\.title\)/g) || []).length;
assert(escapedQuestTitleCount >= 5, 'Should have 5+ escapeHtml(quest.title) calls, found ' + escapedQuestTitleCount);

// === showItemPickup escaping ===
var pickupFunc = hudSource.substring(
  hudSource.indexOf('function showItemPickup'),
  hudSource.indexOf('function showItemPickup') + 800
);
assert(pickupFunc.indexOf('escapeHtml(itemName)') !== -1,
  'showItemPickup should escape itemName');
assert(pickupFunc.indexOf('escapeHtml(icon') !== -1,
  'showItemPickup should escape icon');

// === Inventory slot escaping ===
// Find the inventory rendering section with item.icon and item.name
var invSection = hudSource.substring(
  hudSource.indexOf("'<div style=\"font-size:32px;margin-bottom:4px;\">"),
  hudSource.indexOf("'<div style=\"font-size:32px;margin-bottom:4px;\">") + 300
);
assert(invSection.indexOf('escapeHtml(item.icon)') !== -1,
  'Inventory slot should escape item.icon');
assert(invSection.indexOf('escapeHtml(item.name)') !== -1,
  'Inventory slot should escape item.name');

// === Quest description escaping ===
var escapedQuestDescCount = (hudSource.match(/escapeHtml\(quest\.description\)/g) || []).length;
assert(escapedQuestDescCount >= 2, 'Should have 2+ escapeHtml(quest.description), found ' + escapedQuestDescCount);

// === Quickbar uses textContent not innerHTML for item icon ===
var quickbarSection = hudSource.substring(
  hudSource.indexOf('contentDiv.textContent = item.icon') || 0,
  (hudSource.indexOf('contentDiv.textContent = item.icon') || 0) + 50
);
assert(quickbarSection.indexOf('textContent') !== -1,
  'Quickbar should use textContent for item icon (not innerHTML)');

console.log(passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
