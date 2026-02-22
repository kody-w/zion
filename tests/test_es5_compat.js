// test_es5_compat.js — Verify all source files use ES5-compatible syntax
// No const/let, no arrow functions, no default parameters

var fs = require('fs');
var path = require('path');
var passed = 0;
var failed = 0;

function assert(cond, msg) {
  if (!cond) { failed++; console.log('FAIL: ' + msg); }
  else { passed++; }
}

var srcDir = path.join(__dirname, '..', 'src', 'js');
var files = fs.readdirSync(srcDir).filter(function(f) { return f.endsWith('.js'); });

assert(files.length > 20, 'Should have 20+ source files, got ' + files.length);

files.forEach(function(filename) {
  var filepath = path.join(srcDir, filename);
  var code = fs.readFileSync(filepath, 'utf8');
  var lines = code.split('\n');

  // Check for const declarations (not inside strings/comments)
  var constCount = 0;
  lines.forEach(function(line, i) {
    var trimmed = line.trim();
    // Skip comments
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
    // Match const at word boundary used as declaration
    if (/\bconst\s+\w/.test(trimmed)) {
      // Make sure it's not inside a string
      var beforeConst = trimmed.split(/\bconst\b/)[0];
      var singleQuotes = (beforeConst.match(/'/g) || []).length;
      var doubleQuotes = (beforeConst.match(/"/g) || []).length;
      if (singleQuotes % 2 === 0 && doubleQuotes % 2 === 0) {
        constCount++;
      }
    }
  });
  assert(constCount === 0, filename + ' should have 0 const declarations, found ' + constCount);

  // Check for let declarations
  var letCount = 0;
  lines.forEach(function(line, i) {
    var trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
    if (/\blet\s+\w/.test(trimmed)) {
      var beforeLet = trimmed.split(/\blet\b/)[0];
      var singleQuotes = (beforeLet.match(/'/g) || []).length;
      var doubleQuotes = (beforeLet.match(/"/g) || []).length;
      if (singleQuotes % 2 === 0 && doubleQuotes % 2 === 0) {
        letCount++;
      }
    }
  });
  assert(letCount === 0, filename + ' should have 0 let declarations, found ' + letCount);

  // Check for arrow functions (=> not inside strings)
  var arrowCount = 0;
  lines.forEach(function(line) {
    var trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
    // Match => that's likely an arrow function (preceded by ) or identifier)
    if (/\)\s*=>|[\w$]\s*=>/.test(trimmed)) {
      var beforeArrow = trimmed.split('=>')[0];
      var singleQuotes = (beforeArrow.match(/'/g) || []).length;
      var doubleQuotes = (beforeArrow.match(/"/g) || []).length;
      if (singleQuotes % 2 === 0 && doubleQuotes % 2 === 0) {
        arrowCount++;
      }
    }
  });
  assert(arrowCount === 0, filename + ' should have 0 arrow functions, found ' + arrowCount);

  // Check for default parameters in function declarations
  var defaultParamCount = 0;
  lines.forEach(function(line) {
    var trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
    // Match function declarations with default params
    if (/function\s+\w+\([^)]*=\s*[^)]+\)/.test(trimmed)) {
      defaultParamCount++;
    }
  });
  assert(defaultParamCount === 0, filename + ' should have 0 ES6 default params, found ' + defaultParamCount);
});

// Verify specific functions were converted correctly
var economy = require('../src/js/economy.js');
assert(typeof economy.earnSpark === 'function', 'economy.earnSpark should be a function');

var protocol = require('../src/js/protocol.js');
assert(typeof protocol.createMessage === 'function', 'protocol.createMessage should be a function');

var inventory = require('../src/js/inventory.js');
assert(typeof inventory.addItem === 'function', 'inventory.addItem should be a function');
assert(typeof inventory.removeItem === 'function', 'inventory.removeItem should be a function');
assert(typeof inventory.hasItem === 'function', 'inventory.hasItem should be a function');

// Test that default params still work correctly
// economy.earnSpark with missing details should not throw
var testLedger = { balances: {}, transactions: [], players: {} };
var result = economy.earnSpark(testLedger, 'test-player', 'harvest');
assert(result !== undefined, 'earnSpark with missing details param should not throw');

// protocol.createMessage with missing opts should not throw
var msg = protocol.createMessage('join', 'player1', { name: 'Test' });
assert(msg && msg.type === 'join', 'createMessage with missing opts should work');

console.log(passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
