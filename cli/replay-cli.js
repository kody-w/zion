#!/usr/bin/env node
/**
 * ZION Replay CLI — Time-travel through world history
 *
 * Usage:
 *   node cli/replay-cli.js                          # summarize all changes
 *   node cli/replay-cli.js --at 2026-02-27T12:00:00 # reconstruct state at time
 *   node cli/replay-cli.js --from 2026-02-27 --to 2026-02-28  # time range
 *   node cli/replay-cli.js --agent agent_001        # filter by agent
 *   node cli/replay-cli.js --type craft,compose     # filter by type
 */
'use strict';

var fs = require('fs');
var path = require('path');
var Replay = require('../src/js/replay');

var CHANGES_PATH = path.join(__dirname, '..', 'state', 'changes.json');

// Parse args
var args = {};
for (var i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === '--at') args.at = process.argv[++i];
  else if (process.argv[i] === '--from') args.from = process.argv[++i];
  else if (process.argv[i] === '--to') args.to = process.argv[++i];
  else if (process.argv[i] === '--agent') args.agent = process.argv[++i];
  else if (process.argv[i] === '--type') args.type = process.argv[++i];
  else if (process.argv[i] === '--json') args.json = true;
  else if (process.argv[i] === '--help' || process.argv[i] === '-h') {
    console.log('ZION Replay CLI — Time-travel through world history\n');
    console.log('Usage:');
    console.log('  replay-cli.js                        Summarize all changes');
    console.log('  replay-cli.js --at <ISO-timestamp>   Reconstruct state at time');
    console.log('  replay-cli.js --from <ts> --to <ts>  Filter time range');
    console.log('  replay-cli.js --agent <id>           Filter by agent');
    console.log('  replay-cli.js --type craft,compose   Filter by type(s)');
    console.log('  replay-cli.js --json                 Output raw JSON');
    process.exit(0);
  }
}

// Load changes
var raw;
try {
  raw = JSON.parse(fs.readFileSync(CHANGES_PATH, 'utf-8'));
} catch (e) {
  console.error('Error reading', CHANGES_PATH, ':', e.message);
  process.exit(1);
}

var changes = Replay.parseChanges(raw);
console.log('Loaded ' + changes.length + ' changes\n');

// Apply filters
if (args.from || args.to) {
  var from = args.from ? new Date(args.from).getTime() : 0;
  var to = args.to ? new Date(args.to).getTime() : Date.now();
  changes = Replay.filterByTimeRange(changes, from, to);
  console.log('After time filter: ' + changes.length + ' changes');
}

if (args.agent) {
  changes = Replay.filterByAgent(changes, args.agent);
  console.log('After agent filter (' + args.agent + '): ' + changes.length + ' changes');
}

if (args.type) {
  var types = args.type.split(',');
  changes = Replay.filterByType(changes, types);
  console.log('After type filter (' + args.type + '): ' + changes.length + ' changes');
}

// Replay to specific time
if (args.at) {
  console.log('\n⏪ Replaying to ' + args.at + '...');
  var result = Replay.replayToTime(changes, args.at);
  console.log('Applied: ' + result.applied + ', Skipped: ' + result.skipped);
  console.log('\n📸 State snapshot at ' + args.at + ':');

  if (args.json) {
    console.log(JSON.stringify(result.state, null, 2));
  } else {
    var st = result.state;
    console.log('  Players:    ' + Object.keys(st.players || {}).length);
    console.log('  Weather:    ' + (st.world && st.world.weather || 'unknown'));
    console.log('  Structures: ' + Object.keys(st.structures || {}).length);
    console.log('  Gardens:    ' + Object.keys(st.gardens || {}).length);
    console.log('  Chat msgs:  ' + (st.chat || []).length);
    console.log('  Changes:    ' + (st.changes || []).length);
  }
  process.exit(0);
}

// Default: show summary
var summary = Replay.summarizeChanges(changes);

console.log('📊 Summary:');
console.log('  Total changes: ' + summary.total);
console.log('  Time range:    ' + (summary.timeRange.first || '?') + ' → ' + (summary.timeRange.last || '?'));

console.log('\n  By Type:');
var typeSorted = Object.entries(summary.byType).sort(function(a, b) { return b[1] - a[1]; });
typeSorted.forEach(function(entry) {
  var bar = '█'.repeat(Math.ceil(entry[1] / Math.max(1, summary.total) * 40));
  console.log('    ' + entry[0].padEnd(16) + entry[1].toString().padStart(5) + '  ' + bar);
});

console.log('\n  Top Agents:');
var agentSorted = Object.entries(summary.byAgent).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 10);
agentSorted.forEach(function(entry) {
  console.log('    ' + entry[0].padEnd(16) + entry[1].toString().padStart(5));
});

console.log('\n  By Zone:');
var zoneSorted = Object.entries(summary.byZone).sort(function(a, b) { return b[1] - a[1]; });
zoneSorted.forEach(function(entry) {
  console.log('    ' + entry[0].padEnd(16) + entry[1].toString().padStart(5));
});

// Full state replay
console.log('\n⏪ Full replay...');
var fullResult = Replay.replayToState(changes);
console.log('Applied: ' + fullResult.applied + ', Skipped: ' + fullResult.skipped);
console.log('Final state: ' + Object.keys(fullResult.state.players || {}).length + ' players, ' +
  Object.keys(fullResult.state.structures || {}).length + ' structures');
