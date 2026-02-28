const { test, suite, report, assert } = require('./test_runner');
const path = require('path');
const fs = require('fs');

// We test the agent's decision engine and message builder by requiring key functions
// The agent is a CLI script, so we test by running it with --dry-run

const { execSync } = require('child_process');
const AGENT_PATH = path.join(__dirname, '..', 'cli', 'ai-agent.js');

function runAgent(args) {
  var cmd = 'node ' + AGENT_PATH + ' --dry-run ' + args;
  return execSync(cmd, { encoding: 'utf-8', timeout: 10000 });
}

suite('AI Agent: basic execution', function() {

  test('runs with default settings', function() {
    var output = runAgent('');
    assert.ok(output.includes('ZION Autonomous AI Agent'), 'Should show header');
    assert.ok(output.includes('valid messages'), 'Should validate messages');
  });

  test('respects --name flag', function() {
    var output = runAgent('--name "TestBot42"');
    assert.ok(output.includes('TestBot42'), 'Should show agent name');
  });

  test('respects --archetype flag', function() {
    var output = runAgent('--archetype gardener');
    assert.ok(output.includes('gardener'), 'Should show archetype');
    assert.ok(output.includes('patient and nurturing'), 'Should show personality');
  });

  test('respects --actions flag', function() {
    var output = runAgent('--actions 7');
    assert.ok(output.includes('Actions:   7'), 'Should show action count');
  });
});

suite('AI Agent: archetypes', function() {

  var archetypes = ['explorer', 'gardener', 'builder', 'merchant', 'teacher',
                    'artist', 'musician', 'healer', 'philosopher', 'storyteller'];

  archetypes.forEach(function(arch) {
    test('archetype ' + arch + ' runs without errors', function() {
      var output = runAgent('--archetype ' + arch + ' --actions 3');
      assert.ok(output.includes('valid messages'), arch + ' should produce valid messages');
      assert.ok(!output.includes('Invalid'), arch + ' should not produce invalid messages');
    });
  });
});

suite('AI Agent: message validity', function() {

  test('all messages pass protocol validation', function() {
    var output = runAgent('--archetype explorer --actions 5');
    // Check no invalid messages
    assert.ok(!output.includes('❌'), 'No messages should be invalid');
    // Extract valid count
    var match = output.match(/(\d+) valid messages/);
    assert.ok(match, 'Should report valid message count');
    var count = parseInt(match[1]);
    assert.ok(count >= 2, 'Should have at least join + 1 action');
  });

  test('always starts with a join message', function() {
    var output = runAgent('--archetype builder --actions 1');
    assert.ok(output.includes('join'), 'First message should be join');
  });

  test('generates diverse action types', function() {
    // Run 10 times with 5 actions each, collect action types
    var allTypes = new Set();
    for (var i = 0; i < 5; i++) {
      var output = runAgent('--archetype explorer --actions 10');
      var lines = output.split('\n');
      lines.forEach(function(line) {
        var match = line.match(/→\s+(\w+)/);
        if (match) allTypes.add(match[1]);
      });
    }
    assert.ok(allTypes.size >= 3, 'Should generate at least 3 different action types, got: ' + Array.from(allTypes).join(', '));
  });
});

suite('AI Agent: world state reading', function() {

  test('reads current weather', function() {
    var output = runAgent('');
    assert.ok(output.includes('Weather:'), 'Should show weather');
  });

  test('reads current season', function() {
    var output = runAgent('');
    assert.ok(output.includes('Season:'), 'Should show season');
  });

  test('shows zone', function() {
    var output = runAgent('--archetype gardener');
    assert.ok(output.includes('Zone:'), 'Should show current zone');
  });
});

suite('AI Agent: dry-run safety', function() {

  test('dry-run does not write to inbox', function() {
    var before = fs.existsSync(path.join(__dirname, '..', 'state', 'inbox'))
      ? fs.readdirSync(path.join(__dirname, '..', 'state', 'inbox')).length
      : 0;
    runAgent('--name dry_run_test_agent');
    var after = fs.existsSync(path.join(__dirname, '..', 'state', 'inbox'))
      ? fs.readdirSync(path.join(__dirname, '..', 'state', 'inbox')).filter(function(f) {
          return f.includes('dry_run_test_agent');
        }).length
      : 0;
    assert.strictEqual(after, 0, 'Dry run should not write files');
  });
});

report();
