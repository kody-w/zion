// Test that 6 previously inaccessible HUD panels now have keyboard triggers
(function() {
  var passed = 0;
  var failed = 0;

  function assert(condition, msg) {
    if (condition) {
      console.log('  ok - ' + msg);
      passed++;
    } else {
      console.log('  FAIL - ' + msg);
      failed++;
    }
  }

  console.log('HUD panel keyboard triggers');
  console.log('');

  var fs = require('fs');
  var inputSrc = fs.readFileSync(__dirname + '/../src/js/input.js', 'utf8');
  var mainSrc = fs.readFileSync(__dirname + '/../src/js/main.js', 'utf8');

  // Each panel needs: hotkey in input.js AND handler in main.js
  var panels = [
    { key: ';', action: 'toggleLeaderboard', panel: 'showLeaderboardPanel' },
    { key: '[', action: 'toggleEconomyViz', panel: 'showEconomyVizPanel' },
    { key: ']', action: 'toggleAmendments', panel: 'showAmendmentPanel' },
    { key: '\\\\', action: 'toggleReplay', panel: 'showReplayPanel' },
    { key: '-', action: 'toggleYamlInspector', panel: 'showYamlInspectorPanel' },
    { key: '=', action: 'toggleNearbyAnchors', panel: 'showNearbyAnchorsPanel' }
  ];

  console.log('Keyboard bindings in input.js');
  for (var i = 0; i < panels.length; i++) {
    var p = panels[i];
    // Check input.js has the action
    var actionPattern = new RegExp("'" + p.action + "'");
    assert(actionPattern.test(inputSrc), p.key + ' key triggers ' + p.action);
  }

  console.log('');
  console.log('Action handlers in main.js');
  for (var j = 0; j < panels.length; j++) {
    var p2 = panels[j];
    // Check main.js has the case handler
    var casePattern = new RegExp("case '" + p2.action + "'");
    assert(casePattern.test(mainSrc), 'handleLocalAction has case for ' + p2.action);

    // Check it calls the HUD panel function
    var panelPattern = new RegExp(p2.panel);
    assert(panelPattern.test(mainSrc), p2.action + ' calls HUD.' + p2.panel);
  }

  console.log('');
  console.log('HUD module exports');

  var HUD = require('../src/js/hud');
  var panelFunctions = [
    'showLeaderboardPanel',
    'showEconomyVizPanel',
    'showAmendmentPanel',
    'showReplayPanel',
    'showYamlInspectorPanel',
    'showNearbyAnchorsPanel'
  ];

  for (var k = 0; k < panelFunctions.length; k++) {
    assert(typeof HUD[panelFunctions[k]] === 'function', panelFunctions[k] + ' exported from HUD');
  }

  console.log('');
  console.log('Help panel includes new shortcuts');

  var hudSrc = fs.readFileSync(__dirname + '/../src/js/hud.js', 'utf8');
  var helpShortcuts = ['Leaderboard', 'Economy Viz', 'Amendments', 'Replay', 'YAML Inspector', 'Nearby Anchors'];
  for (var h = 0; h < helpShortcuts.length; h++) {
    assert(hudSrc.indexOf(helpShortcuts[h]) !== -1, helpShortcuts[h] + ' listed in help panel');
  }

  console.log('');
  console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
})();
