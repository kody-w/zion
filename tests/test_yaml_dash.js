// test_yaml_dash.js — Tests for YamlDash live YAML dashboard module
'use strict';

var assert = require('assert');
var YamlDash = require('../src/js/yaml_dash.js');

var passed = 0;
var failed = 0;
var errors = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    process.stdout.write('  ✓ ' + name + '\n');
  } catch (e) {
    failed++;
    errors.push({ name: name, error: e });
    process.stdout.write('  ✗ ' + name + '\n    ' + e.message + '\n');
  }
}

function suite(name, fn) {
  console.log('\n' + name);
  fn();
}

// ─── jsonToYaml ──────────────────────────────────────────────────────────────

suite('jsonToYaml — primitives', function() {
  test('string', function() {
    assert.strictEqual(YamlDash.jsonToYaml('hello'), 'hello\n');
  });
  test('integer', function() {
    assert.strictEqual(YamlDash.jsonToYaml(42), '42\n');
  });
  test('negative integer', function() {
    assert.strictEqual(YamlDash.jsonToYaml(-7), '-7\n');
  });
  test('float', function() {
    assert.strictEqual(YamlDash.jsonToYaml(3.14), '3.14\n');
  });
  test('zero', function() {
    assert.strictEqual(YamlDash.jsonToYaml(0), '0\n');
  });
  test('true', function() {
    assert.strictEqual(YamlDash.jsonToYaml(true), 'true\n');
  });
  test('false', function() {
    assert.strictEqual(YamlDash.jsonToYaml(false), 'false\n');
  });
  test('null', function() {
    assert.strictEqual(YamlDash.jsonToYaml(null), 'null\n');
  });
  test('empty string', function() {
    assert.strictEqual(YamlDash.jsonToYaml(''), "''\n");
  });
});

suite('jsonToYaml — string quoting', function() {
  test('string true', function() {
    assert.strictEqual(YamlDash.jsonToYaml('true'), "'true'\n");
  });
  test('string false', function() {
    assert.strictEqual(YamlDash.jsonToYaml('false'), "'false'\n");
  });
  test('string yes', function() {
    assert.strictEqual(YamlDash.jsonToYaml('yes'), "'yes'\n");
  });
  test('string no', function() {
    assert.strictEqual(YamlDash.jsonToYaml('no'), "'no'\n");
  });
  test('string on', function() {
    assert.strictEqual(YamlDash.jsonToYaml('on'), "'on'\n");
  });
  test('string off', function() {
    assert.strictEqual(YamlDash.jsonToYaml('off'), "'off'\n");
  });
  test('string null word', function() {
    assert.strictEqual(YamlDash.jsonToYaml('null'), "'null'\n");
  });
  test('string tilde', function() {
    assert.strictEqual(YamlDash.jsonToYaml('~'), "'~'\n");
  });
  test('string numeric integer', function() {
    assert.strictEqual(YamlDash.jsonToYaml('42'), "'42'\n");
  });
  test('string numeric float', function() {
    assert.strictEqual(YamlDash.jsonToYaml('3.14'), "'3.14'\n");
  });
  test('string negative numeric', function() {
    assert.strictEqual(YamlDash.jsonToYaml('-7'), "'-7'\n");
  });
  test('string with colon space', function() {
    assert.strictEqual(YamlDash.jsonToYaml('key: value'), "'key: value'\n");
  });
  test('string starting with hash', function() {
    assert.strictEqual(YamlDash.jsonToYaml('#comment'), "'#comment'\n");
  });
  test('string starting with @', function() {
    assert.strictEqual(YamlDash.jsonToYaml('@mention'), "'@mention'\n");
  });
  test('string starting with &', function() {
    assert.strictEqual(YamlDash.jsonToYaml('&anchor'), "'&anchor'\n");
  });
  test('string starting with *', function() {
    assert.strictEqual(YamlDash.jsonToYaml('*alias'), "'*alias'\n");
  });
  test('string starting with |', function() {
    assert.strictEqual(YamlDash.jsonToYaml('|block'), "'|block'\n");
  });
  test('string starting with >', function() {
    assert.strictEqual(YamlDash.jsonToYaml('>fold'), "'>fold'\n");
  });
  test('string starting with !', function() {
    assert.strictEqual(YamlDash.jsonToYaml('!tag'), "'!tag'\n");
  });
  test('string starting with %', function() {
    assert.strictEqual(YamlDash.jsonToYaml('%tag'), "'%tag'\n");
  });
  test('string starting with [', function() {
    assert.strictEqual(YamlDash.jsonToYaml('[not a list]'), "'[not a list]'\n");
  });
  test('string starting with {', function() {
    assert.strictEqual(YamlDash.jsonToYaml('{not a dict}'), "'{not a dict}'\n");
  });
  test('string with single quote', function() {
    assert.strictEqual(YamlDash.jsonToYaml("it's"), "'it''s'\n");
  });
  test('case-insensitive TRUE', function() {
    assert.strictEqual(YamlDash.jsonToYaml('TRUE'), "'TRUE'\n");
  });
  test('case-insensitive False', function() {
    assert.strictEqual(YamlDash.jsonToYaml('False'), "'False'\n");
  });
  test('case-insensitive YES', function() {
    assert.strictEqual(YamlDash.jsonToYaml('YES'), "'YES'\n");
  });
  test('plain string not quoted', function() {
    assert.strictEqual(YamlDash.jsonToYaml('hello world'), 'hello world\n');
  });
  test('ISO timestamp quoted', function() {
    assert.strictEqual(YamlDash.jsonToYaml('2026-02-21T00:00:00Z'), "'2026-02-21T00:00:00Z'\n");
  });
  test('date string quoted', function() {
    assert.strictEqual(YamlDash.jsonToYaml('2026-02-21'), "'2026-02-21'\n");
  });
  test('colon at end of string', function() {
    assert.strictEqual(YamlDash.jsonToYaml('key:'), "'key:'\n");
  });
  test('string starting with double quote', function() {
    var result = YamlDash.jsonToYaml('"quoted"');
    assert.ok(result.indexOf('"quoted"') !== -1);
  });
  test('string starting with space', function() {
    var result = YamlDash.jsonToYaml(' leading space');
    assert.ok(result.indexOf("'") === 0 || result.indexOf("'") !== -1);
  });
});

suite('jsonToYaml — simple dict', function() {
  test('single key', function() {
    assert.strictEqual(YamlDash.jsonToYaml({ name: 'zion' }), 'name: zion\n');
  });
  test('multiple keys', function() {
    var result = YamlDash.jsonToYaml({ a: 1, b: 2 });
    assert.ok(result.indexOf('a: 1\n') !== -1);
    assert.ok(result.indexOf('b: 2\n') !== -1);
  });
  test('mixed types', function() {
    var data = { name: 'zion', version: 1, active: true, meta: null };
    var result = YamlDash.jsonToYaml(data);
    assert.ok(result.indexOf('name: zion\n') !== -1);
    assert.ok(result.indexOf('version: 1\n') !== -1);
    assert.ok(result.indexOf('active: true\n') !== -1);
    assert.ok(result.indexOf('meta: null\n') !== -1);
  });
  test('empty dict', function() {
    assert.strictEqual(YamlDash.jsonToYaml({}), '{}\n');
  });
  test('key needing quoting (true)', function() {
    var result = YamlDash.jsonToYaml({ 'true': 'val' });
    assert.ok(result.indexOf("'true': val\n") !== -1);
  });
  test('numeric key needs quoting', function() {
    var result = YamlDash.jsonToYaml({ '42': 'answer' });
    assert.ok(result.indexOf("'42': answer\n") !== -1);
  });
});

suite('jsonToYaml — simple list', function() {
  test('string list', function() {
    assert.strictEqual(YamlDash.jsonToYaml(['a', 'b', 'c']), '- a\n- b\n- c\n');
  });
  test('number list', function() {
    assert.strictEqual(YamlDash.jsonToYaml([1, 2, 3]), '- 1\n- 2\n- 3\n');
  });
  test('mixed list', function() {
    assert.strictEqual(YamlDash.jsonToYaml(['hello', 42, true, null]), '- hello\n- 42\n- true\n- null\n');
  });
  test('empty list', function() {
    assert.strictEqual(YamlDash.jsonToYaml([]), '[]\n');
  });
});

suite('jsonToYaml — nested structures', function() {
  test('nested dict', function() {
    var data = { position: { x: 10, y: 20, z: 30 } };
    var result = YamlDash.jsonToYaml(data);
    assert.strictEqual(result, 'position:\n  x: 10\n  y: 20\n  z: 30\n');
  });
  test('deeply nested dict', function() {
    var data = { a: { b: { c: { d: 'deep' } } } };
    var result = YamlDash.jsonToYaml(data);
    assert.strictEqual(result, 'a:\n  b:\n    c:\n      d: deep\n');
  });
  test('dict with list', function() {
    var data = { tags: ['alpha', 'beta'] };
    var result = YamlDash.jsonToYaml(data);
    assert.strictEqual(result, 'tags:\n  - alpha\n  - beta\n');
  });
  test('list of dicts', function() {
    var data = [{ name: 'a' }, { name: 'b' }];
    var result = YamlDash.jsonToYaml(data);
    assert.strictEqual(result, '- name: a\n- name: b\n');
  });
  test('dict with empty nested dict', function() {
    var data = { config: {} };
    assert.strictEqual(YamlDash.jsonToYaml(data), 'config: {}\n');
  });
  test('dict with empty nested list', function() {
    var data = { items: [] };
    assert.strictEqual(YamlDash.jsonToYaml(data), 'items: []\n');
  });
  test('list of dicts with nested', function() {
    var data = [
      { name: 'a', pos: { x: 1, y: 2 } },
      { name: 'b', pos: { x: 3, y: 4 } }
    ];
    var result = YamlDash.jsonToYaml(data);
    assert.ok(result.indexOf('- name: a\n  pos:\n    x: 1\n    y: 2\n') !== -1);
    assert.ok(result.indexOf('- name: b\n  pos:\n    x: 3\n    y: 4\n') !== -1);
  });
  test('nested list of lists', function() {
    var data = [[1, 2], [3, 4]];
    var result = YamlDash.jsonToYaml(data);
    assert.ok(result.indexOf('- - 1\n  - 2\n') !== -1);
    assert.ok(result.indexOf('- - 3\n  - 4\n') !== -1);
  });
});

suite('jsonToYaml — multi-line strings', function() {
  test('multi-line string uses block scalar', function() {
    var result = YamlDash.jsonToYaml('line1\nline2');
    assert.ok(result.indexOf('|') !== -1);
    assert.ok(result.indexOf('line1') !== -1);
    assert.ok(result.indexOf('line2') !== -1);
  });
  test('multi-line string with trailing newline', function() {
    var result = YamlDash.jsonToYaml('line1\nline2\n');
    assert.ok(result.indexOf('|') !== -1);
    assert.ok(result.indexOf('|-') === -1, 'trailing newline should use | not |-');
  });
  test('multi-line without trailing newline uses |-', function() {
    var result = YamlDash.jsonToYaml('line1\nline2');
    assert.ok(result.indexOf('|-') !== -1);
  });
});

// ─── ZION-specific shapes ────────────────────────────────────────────────────

suite('jsonToYaml — ZION protocol message shape', function() {
  test('protocol message', function() {
    var msg = {
      v: 1,
      id: 'msg-abc-123',
      ts: '2026-02-21T12:00:00Z',
      seq: 0,
      from: 'kody-w',
      type: 'say',
      platform: 'api',
      position: { x: 0, y: 0, z: 0, zone: 'nexus' },
      geo: { lat: null, lon: null },
      payload: { message: 'Hello ZION!' }
    };
    var result = YamlDash.jsonToYaml(msg);
    assert.ok(result.indexOf('v: 1\n') !== -1);
    assert.ok(result.indexOf('id: msg-abc-123\n') !== -1);
    assert.ok(result.indexOf("ts: '2026-02-21T12:00:00Z'\n") !== -1);
    assert.ok(result.indexOf('seq: 0\n') !== -1);
    assert.ok(result.indexOf('from: kody-w\n') !== -1);
    assert.ok(result.indexOf('type: say\n') !== -1);
    assert.ok(result.indexOf('platform: api\n') !== -1);
    assert.ok(result.indexOf('position:\n') !== -1);
    assert.ok(result.indexOf('  zone: nexus\n') !== -1);
    assert.ok(result.indexOf('geo:\n') !== -1);
    assert.ok(result.indexOf('  lat: null\n') !== -1);
    assert.ok(result.indexOf('payload:\n') !== -1);
    assert.ok(result.indexOf('  message: Hello ZION!\n') !== -1);
  });
});

suite('jsonToYaml — soul file shape', function() {
  test('soul shape', function() {
    var soul = {
      id: 'agent_001',
      name: 'Sage',
      archetype: 'philosopher',
      personality: ['curious', 'calm', 'deep-thinking'],
      home_zone: 'athenaeum',
      intentions: [
        {
          id: 'intent_001',
          trigger: { condition: 'player_nearby', params: { distance_lt: 5 } },
          action: { type: 'say', params: { message: 'Welcome, seeker.' } },
          priority: 10,
          ttl: 300,
          cooldown: 60,
          max_fires: 10
        }
      ],
      memory: {}
    };
    var result = YamlDash.jsonToYaml(soul);
    assert.ok(result.indexOf('id: agent_001\n') !== -1);
    assert.ok(result.indexOf('archetype: philosopher\n') !== -1);
    assert.ok(result.indexOf('personality:\n') !== -1);
    assert.ok(result.indexOf('  - curious\n') !== -1);
    assert.ok(result.indexOf('intentions:\n') !== -1);
    assert.ok(result.indexOf('    trigger:\n') !== -1);
    assert.ok(result.indexOf('      condition: player_nearby\n') !== -1);
    assert.ok(result.indexOf('memory: {}\n') !== -1);
  });
});

suite('jsonToYaml — economy shape', function() {
  test('economy ledger', function() {
    var economy = {
      balances: {
        agent_001: 150,
        agent_002: 75,
        TREASURY: 500
      },
      transactions: [
        {
          type: 'craft',
          from: 'agent_001',
          ts: '2026-02-21T10:00:00Z',
          payload: { item: 'wooden_chair', spark_earned: 15 }
        }
      ]
    };
    var result = YamlDash.jsonToYaml(economy);
    assert.ok(result.indexOf('balances:\n') !== -1);
    assert.ok(result.indexOf('  agent_001: 150\n') !== -1);
    assert.ok(result.indexOf('  TREASURY: 500\n') !== -1);
    assert.ok(result.indexOf('transactions:\n') !== -1);
    assert.ok(result.indexOf('  - type: craft\n') !== -1);
    assert.ok(result.indexOf('    from: agent_001\n') !== -1);
  });
});

// ─── buildTree ───────────────────────────────────────────────────────────────

suite('buildTree — basic structure', function() {
  test('primitive string builds leaf node', function() {
    var tree = YamlDash.buildTree('hello', 'root');
    assert.strictEqual(tree.type, 'string');
    assert.strictEqual(tree.value, 'hello');
    assert.strictEqual(tree.path, 'root');
    assert.strictEqual(tree.depth, 0);
    assert.ok(Array.isArray(tree.children));
    assert.strictEqual(tree.children.length, 0);
  });

  test('number builds leaf node', function() {
    var tree = YamlDash.buildTree(42, 'num');
    assert.strictEqual(tree.type, 'number');
    assert.strictEqual(tree.value, 42);
  });

  test('boolean builds leaf node', function() {
    var tree = YamlDash.buildTree(true, 'flag');
    assert.strictEqual(tree.type, 'boolean');
    assert.strictEqual(tree.value, true);
  });

  test('null builds null node', function() {
    var tree = YamlDash.buildTree(null, 'nul');
    assert.strictEqual(tree.type, 'null');
    assert.strictEqual(tree.value, null);
  });

  test('object builds object node', function() {
    var tree = YamlDash.buildTree({ a: 1, b: 'two' }, 'obj');
    assert.strictEqual(tree.type, 'object');
    assert.strictEqual(tree.children.length, 2);
  });

  test('array builds array node', function() {
    var tree = YamlDash.buildTree([1, 2, 3], 'arr');
    assert.strictEqual(tree.type, 'array');
    assert.strictEqual(tree.children.length, 3);
  });

  test('children have correct keys', function() {
    var tree = YamlDash.buildTree({ name: 'zion', count: 5 }, 'root');
    var keys = tree.children.map(function(c) { return c.key; });
    assert.ok(keys.indexOf('name') !== -1);
    assert.ok(keys.indexOf('count') !== -1);
  });

  test('children have correct paths', function() {
    var tree = YamlDash.buildTree({ pos: { x: 1 } }, 'root');
    var pos = tree.children[0];
    assert.strictEqual(pos.path, 'root.pos');
    var x = pos.children[0];
    assert.strictEqual(x.path, 'root.pos.x');
  });

  test('children have correct depths', function() {
    var tree = YamlDash.buildTree({ pos: { x: 1 } }, 'root', 0);
    var pos = tree.children[0];
    assert.strictEqual(pos.depth, 1);
    var x = pos.children[0];
    assert.strictEqual(x.depth, 2);
  });

  test('array children have index keys', function() {
    var tree = YamlDash.buildTree(['a', 'b', 'c'], 'list');
    assert.strictEqual(tree.children[0].key, '0');
    assert.strictEqual(tree.children[1].key, '1');
    assert.strictEqual(tree.children[2].key, '2');
  });

  test('array children have correct paths', function() {
    var tree = YamlDash.buildTree(['a', 'b'], 'list');
    assert.strictEqual(tree.children[0].path, 'list[0]');
    assert.strictEqual(tree.children[1].path, 'list[1]');
  });

  test('new nodes default to collapsed', function() {
    var tree = YamlDash.buildTree({ a: { b: 1 } }, 'root');
    assert.strictEqual(tree.collapsed, true);
    assert.strictEqual(tree.children[0].collapsed, true);
  });

  test('default path is empty string', function() {
    var tree = YamlDash.buildTree({ x: 1 });
    assert.strictEqual(tree.path, '');
  });
});

suite('buildTree — deeply nested', function() {
  test('5 levels deep correct types and paths', function() {
    var data = { a: { b: { c: { d: { e: 'leaf' } } } } };
    var tree = YamlDash.buildTree(data, 'root');
    var node = tree; // root object
    var keys = ['a', 'b', 'c', 'd'];
    for (var i = 0; i < keys.length; i++) {
      node = node.children[0];
      assert.strictEqual(node.key, keys[i]);
      assert.strictEqual(node.type, 'object');
    }
    var leaf = node.children[0];
    assert.strictEqual(leaf.key, 'e');
    assert.strictEqual(leaf.type, 'string');
    assert.strictEqual(leaf.value, 'leaf');
    assert.strictEqual(leaf.depth, 5);
  });

  test('large array has all children', function() {
    var data = [];
    for (var i = 0; i < 100; i++) {
      data.push(i);
    }
    var tree = YamlDash.buildTree(data, 'big');
    assert.strictEqual(tree.children.length, 100);
  });

  test('mixed types in object', function() {
    var data = {
      str: 'hello',
      num: 42,
      bool: true,
      nul: null,
      arr: [1, 2],
      obj: { nested: true }
    };
    var tree = YamlDash.buildTree(data, 'root');
    var types = {};
    tree.children.forEach(function(c) { types[c.key] = c.type; });
    assert.strictEqual(types.str, 'string');
    assert.strictEqual(types.num, 'number');
    assert.strictEqual(types.bool, 'boolean');
    assert.strictEqual(types.nul, 'null');
    assert.strictEqual(types.arr, 'array');
    assert.strictEqual(types.obj, 'object');
  });
});

// ─── toggleNode ──────────────────────────────────────────────────────────────

suite('toggleNode', function() {
  test('toggleNode expands a collapsed node', function() {
    var tree = YamlDash.buildTree({ a: { b: 1 } }, 'root');
    assert.strictEqual(tree.collapsed, true);
    YamlDash.toggleNode(tree, 'root');
    assert.strictEqual(tree.collapsed, false);
  });

  test('toggleNode collapses an expanded node', function() {
    var tree = YamlDash.buildTree({ a: 1 }, 'root');
    YamlDash.toggleNode(tree, 'root');
    assert.strictEqual(tree.collapsed, false);
    YamlDash.toggleNode(tree, 'root');
    assert.strictEqual(tree.collapsed, true);
  });

  test('toggleNode on child path', function() {
    var tree = YamlDash.buildTree({ pos: { x: 1 } }, 'root');
    YamlDash.toggleNode(tree, 'root.pos');
    var pos = tree.children[0];
    assert.strictEqual(pos.collapsed, false);
  });

  test('toggleNode does not affect other nodes', function() {
    var tree = YamlDash.buildTree({ a: { x: 1 }, b: { y: 2 } }, 'root');
    YamlDash.toggleNode(tree, 'root.a');
    var aNode = tree.children.filter(function(c) { return c.key === 'a'; })[0];
    var bNode = tree.children.filter(function(c) { return c.key === 'b'; })[0];
    assert.strictEqual(aNode.collapsed, false);
    assert.strictEqual(bNode.collapsed, true);
  });

  test('toggleNode on non-existent path is safe', function() {
    var tree = YamlDash.buildTree({ a: 1 }, 'root');
    assert.doesNotThrow(function() {
      YamlDash.toggleNode(tree, 'root.nonexistent');
    });
  });

  test('toggleNode on leaf is safe', function() {
    var tree = YamlDash.buildTree({ a: 1 }, 'root');
    assert.doesNotThrow(function() {
      YamlDash.toggleNode(tree, 'root.a');
    });
  });
});

// ─── getVisibleNodes ─────────────────────────────────────────────────────────

suite('getVisibleNodes', function() {
  test('root collapsed returns only root', function() {
    var tree = YamlDash.buildTree({ a: 1, b: 2 }, 'root');
    var visible = YamlDash.getVisibleNodes(tree);
    assert.strictEqual(visible.length, 1);
    assert.strictEqual(visible[0].path, 'root');
  });

  test('root expanded shows children', function() {
    var tree = YamlDash.buildTree({ a: 1, b: 2 }, 'root');
    YamlDash.toggleNode(tree, 'root');
    var visible = YamlDash.getVisibleNodes(tree);
    // root + 2 children = 3
    assert.strictEqual(visible.length, 3);
  });

  test('only top-level expanded, nested stays hidden', function() {
    var tree = YamlDash.buildTree({ pos: { x: 1, y: 2 } }, 'root');
    YamlDash.toggleNode(tree, 'root');
    var visible = YamlDash.getVisibleNodes(tree);
    // root + pos = 2 (pos.x and pos.y are hidden because pos is collapsed)
    assert.strictEqual(visible.length, 2);
  });

  test('fully expanded returns all nodes', function() {
    var tree = YamlDash.buildTree({ pos: { x: 1, y: 2 } }, 'root');
    YamlDash.toggleNode(tree, 'root');
    YamlDash.toggleNode(tree, 'root.pos');
    var visible = YamlDash.getVisibleNodes(tree);
    // root + pos + x + y = 4
    assert.strictEqual(visible.length, 4);
  });

  test('visible nodes are in traversal order', function() {
    var tree = YamlDash.buildTree({ a: 1, b: 2, c: 3 }, 'root');
    YamlDash.toggleNode(tree, 'root');
    var visible = YamlDash.getVisibleNodes(tree);
    assert.strictEqual(visible[0].path, 'root');
    var childPaths = visible.slice(1).map(function(n) { return n.key; });
    assert.ok(childPaths.indexOf('a') !== -1);
    assert.ok(childPaths.indexOf('b') !== -1);
    assert.ok(childPaths.indexOf('c') !== -1);
  });

  test('leaf node returns just itself', function() {
    var tree = YamlDash.buildTree(42, 'num');
    var visible = YamlDash.getVisibleNodes(tree);
    assert.strictEqual(visible.length, 1);
    assert.strictEqual(visible[0].value, 42);
  });
});

// ─── filterTree ──────────────────────────────────────────────────────────────

suite('filterTree', function() {
  test('empty query returns full tree', function() {
    var tree = YamlDash.buildTree({ name: 'zion', count: 5 }, 'root');
    var filtered = YamlDash.filterTree(tree, '');
    assert.ok(filtered !== null);
    assert.strictEqual(filtered.type, 'object');
  });

  test('matching key returns node', function() {
    var tree = YamlDash.buildTree({ name: 'zion', count: 5 }, 'root');
    var filtered = YamlDash.filterTree(tree, 'name');
    assert.ok(filtered !== null);
    // Should contain name child
    var visible = YamlDash.getVisibleNodes(filtered);
    var hasName = visible.some(function(n) { return n.key === 'name'; });
    assert.ok(hasName, 'filtered tree should show name node');
  });

  test('non-matching query returns null or empty', function() {
    var tree = YamlDash.buildTree({ name: 'zion' }, 'root');
    var filtered = YamlDash.filterTree(tree, 'xyznonexistent');
    // Either null or a tree with no visible children
    if (filtered !== null) {
      var visible = YamlDash.getVisibleNodes(filtered);
      var nonRoot = visible.filter(function(n) { return n.path !== 'root'; });
      assert.strictEqual(nonRoot.length, 0);
    }
  });

  test('case-insensitive matching', function() {
    var tree = YamlDash.buildTree({ Name: 'ZION' }, 'root');
    var filtered = YamlDash.filterTree(tree, 'name');
    assert.ok(filtered !== null);
  });

  test('value matching', function() {
    var tree = YamlDash.buildTree({ city: 'zion', zone: 'nexus' }, 'root');
    var filtered = YamlDash.filterTree(tree, 'nexus');
    assert.ok(filtered !== null);
    var visible = YamlDash.getVisibleNodes(filtered);
    var hasZone = visible.some(function(n) { return n.key === 'zone'; });
    assert.ok(hasZone, 'should find node with value nexus');
  });

  test('deep key matching expands parents', function() {
    var tree = YamlDash.buildTree({ pos: { x: 1, zone: 'nexus' } }, 'root');
    var filtered = YamlDash.filterTree(tree, 'zone');
    assert.ok(filtered !== null);
    // The result should expose the zone node
    var visible = YamlDash.getVisibleNodes(filtered);
    var hasZone = visible.some(function(n) { return n.key === 'zone'; });
    assert.ok(hasZone, 'deep matching should expose nested node');
  });
});

// ─── renderToText ─────────────────────────────────────────────────────────────

suite('renderToText', function() {
  test('collapsed object shows indicator', function() {
    var tree = YamlDash.buildTree({ a: 1, b: 2 }, 'root');
    var text = YamlDash.renderToText(tree);
    assert.ok(text.indexOf('▶') !== -1, 'collapsed should show ▶');
  });

  test('expanded object shows expanded indicator', function() {
    var tree = YamlDash.buildTree({ a: 1 }, 'root');
    YamlDash.toggleNode(tree, 'root');
    var text = YamlDash.renderToText(tree);
    assert.ok(text.indexOf('▼') !== -1, 'expanded should show ▼');
  });

  test('collapsed node shows child count badge', function() {
    var tree = YamlDash.buildTree({ a: 1, b: 2, c: 3 }, 'root');
    var text = YamlDash.renderToText(tree);
    assert.ok(text.indexOf('3') !== -1, 'should show child count');
  });

  test('leaf node shows its value', function() {
    var tree = YamlDash.buildTree({ name: 'zion' }, 'root');
    YamlDash.toggleNode(tree, 'root');
    var text = YamlDash.renderToText(tree);
    assert.ok(text.indexOf('zion') !== -1);
  });

  test('expanded=true shows all nodes', function() {
    var tree = YamlDash.buildTree({ pos: { x: 1 } }, 'root');
    var text = YamlDash.renderToText(tree, true);
    assert.ok(text.indexOf('pos') !== -1);
    assert.ok(text.indexOf('x') !== -1);
    assert.ok(text.indexOf('1') !== -1);
  });

  test('indentation increases with depth', function() {
    var tree = YamlDash.buildTree({ pos: { x: 1 } }, 'root');
    var text = YamlDash.renderToText(tree, true);
    var lines = text.split('\n').filter(function(l) { return l.trim(); });
    // Find x line — should have more leading spaces than pos
    var posLine = lines.find(function(l) { return l.indexOf('pos') !== -1; });
    var xLine = lines.find(function(l) { return l.indexOf('x') !== -1 && l.indexOf('pos') === -1; });
    if (posLine && xLine) {
      var posIndent = posLine.match(/^(\s*)/)[1].length;
      var xIndent = xLine.match(/^(\s*)/)[1].length;
      assert.ok(xIndent > posIndent, 'x should be more indented than pos');
    }
  });

  test('null value renders as null', function() {
    var tree = YamlDash.buildTree({ meta: null }, 'root');
    YamlDash.toggleNode(tree, 'root');
    var text = YamlDash.renderToText(tree);
    assert.ok(text.indexOf('null') !== -1);
  });

  test('boolean value renders as true/false', function() {
    var tree = YamlDash.buildTree({ active: false }, 'root');
    YamlDash.toggleNode(tree, 'root');
    var text = YamlDash.renderToText(tree);
    assert.ok(text.indexOf('false') !== -1);
  });
});

// ─── edge cases ──────────────────────────────────────────────────────────────

suite('edge cases', function() {
  test('very deeply nested (7 levels)', function() {
    var data = { a: { b: { c: { d: { e: { f: { g: 'deep' } } } } } } };
    var tree = YamlDash.buildTree(data, 'root');
    // Navigate to g
    var node = tree;
    for (var i = 0; i < 6; i++) {
      node = node.children[0];
    }
    var leaf = node.children[0];
    assert.strictEqual(leaf.key, 'g');
    assert.strictEqual(leaf.value, 'deep');
    assert.strictEqual(leaf.depth, 7);
  });

  test('large array of objects', function() {
    var data = [];
    for (var i = 0; i < 50; i++) {
      data.push({ id: i, name: 'item' + i });
    }
    var yaml = YamlDash.jsonToYaml(data);
    assert.ok(yaml.indexOf('- id: 0\n') !== -1);
    assert.ok(yaml.indexOf('  name: item0\n') !== -1);
    var tree = YamlDash.buildTree(data, 'list');
    assert.strictEqual(tree.children.length, 50);
  });

  test('protocol message shape roundtrip', function() {
    var msg = {
      v: 1,
      id: 'msg-test',
      ts: '2026-02-21T12:00:00Z',
      seq: 0,
      from: 'tester',
      type: 'move',
      platform: 'api',
      position: { x: 10, y: 0, z: -5, zone: 'gardens' },
      geo: { lat: null, lon: null },
      payload: { speed: 1.5 }
    };
    var yaml = YamlDash.jsonToYaml(msg);
    var tree = YamlDash.buildTree(msg, 'msg');
    assert.ok(yaml.indexOf("ts: '2026-02-21T12:00:00Z'\n") !== -1);
    assert.strictEqual(tree.type, 'object');
    var tsNode = tree.children.filter(function(c) { return c.key === 'ts'; })[0];
    assert.strictEqual(tsNode.type, 'string');
    assert.strictEqual(tsNode.value, '2026-02-21T12:00:00Z');
  });

  test('economy shape tree structure', function() {
    var economy = {
      balances: { TREASURY: 500, player1: 100 },
      transactions: []
    };
    var tree = YamlDash.buildTree(economy, 'economy');
    var balancesNode = tree.children.filter(function(c) { return c.key === 'balances'; })[0];
    assert.strictEqual(balancesNode.type, 'object');
    assert.strictEqual(balancesNode.children.length, 2);
    var txNode = tree.children.filter(function(c) { return c.key === 'transactions'; })[0];
    assert.strictEqual(txNode.type, 'array');
    assert.strictEqual(txNode.children.length, 0);
  });

  test('jsonToYaml handles unicode', function() {
    var result = YamlDash.jsonToYaml({ name: 'Zo\u00eb' });
    assert.ok(result.indexOf('Zo\u00eb') !== -1);
  });

  test('string with backslash', function() {
    var result = YamlDash.jsonToYaml('path\\to\\file');
    assert.ok(result.indexOf('path\\to\\file') !== -1);
  });

  test('large integer', function() {
    assert.strictEqual(YamlDash.jsonToYaml(9999999999999), '9999999999999\n');
  });
});

// ─── Report ──────────────────────────────────────────────────────────────────

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (errors.length > 0) {
  console.log('\nFailures:');
  errors.forEach(function(e) {
    console.log('  ' + e.name + ': ' + e.error.message);
  });
  process.exit(1);
} else {
  process.exit(0);
}
