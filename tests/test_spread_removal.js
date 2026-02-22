// test_spread_removal.js — Verify no ES6 spread operators remain in critical files
var fs = require('fs');
var path = require('path');
var passed = 0;
var failed = 0;

function assert(cond, msg) {
  if (!cond) { failed++; console.log('FAIL: ' + msg); }
  else { passed++; }
}

var filesToCheck = ['state.js', 'exploration.js', 'zones.js'];
var srcDir = path.join(__dirname, '..', 'src', 'js');

filesToCheck.forEach(function(filename) {
  var code = fs.readFileSync(path.join(srcDir, filename), 'utf8');
  var lines = code.split('\n');
  var spreadCount = 0;

  lines.forEach(function(line, i) {
    var trimmed = line.trim();
    // Skip comments
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
    // Skip string content (lines that are purely string assignments)
    if (trimmed.match(/^\s*['"][^'"]*\.\.\.[^'"]*['"]/)) return;
    // Check for actual spread operator usage (not in strings/comments)
    if (/\.\.\.\w/.test(trimmed)) {
      // Make sure it's not inside a string
      var beforeSpread = trimmed.split('...')[0];
      var singleQuotes = (beforeSpread.match(/'/g) || []).length;
      var doubleQuotes = (beforeSpread.match(/"/g) || []).length;
      if (singleQuotes % 2 === 0 && doubleQuotes % 2 === 0) {
        spreadCount++;
      }
    }
  });

  assert(spreadCount === 0, filename + ' should have 0 spread operators, found ' + spreadCount);
});

// Verify Object.assign used instead in state.js gift handler
var stateCode = fs.readFileSync(path.join(srcDir, 'state.js'), 'utf8');
var giftSection = stateCode.substring(stateCode.indexOf("case 'gift'"), stateCode.indexOf("case 'gift'") + 800);
assert(giftSection.indexOf('Object.assign') !== -1, 'Gift handler should use Object.assign instead of spread');

// Verify Object.assign used in exploration.js inspect
var explorationCode = fs.readFileSync(path.join(srcDir, 'exploration.js'), 'utf8');
assert(explorationCode.indexOf('Object.assign({}, garden') !== -1, 'Exploration inspect should use Object.assign for garden data');

// Verify zones.js election sort uses .slice() not spread
var zonesCode = fs.readFileSync(path.join(srcDir, 'zones.js'), 'utf8');
assert(zonesCode.indexOf('election.candidates || []).slice().sort') !== -1 ||
       zonesCode.indexOf('.slice().sort') !== -1,
  'Zones election sort should use .slice() not [...spread]');

// Verify input.js has no shorthand properties in click handler
var inputCode = fs.readFileSync(path.join(srcDir, 'input.js'), 'utf8');
var clickIdx = inputCode.indexOf("onAction('click'");
var clickSection = inputCode.substring(clickIdx, clickIdx + 100);
assert(clickSection.indexOf('x: x') !== -1, 'Click handler should use x: x not shorthand {x}');
assert(clickSection.indexOf('y: y') !== -1, 'Click handler should use y: y not shorthand {y}');

console.log(passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
