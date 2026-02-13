// test_runner.js - Zero-dependency test framework for ZION
const assert = require('assert');

let passed = 0;
let failed = 0;
let errors = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    process.stdout.write(`  ✓ ${name}\n`);
  } catch (e) {
    failed++;
    errors.push({name, error: e});
    process.stdout.write(`  ✗ ${name}\n    ${e.message}\n`);
  }
}

function suite(name, fn) {
  console.log(`\n${name}`);
  fn();
}

function report() {
  console.log(`\n${passed} passed, ${failed} failed`);
  if (errors.length > 0) {
    console.log('\nFailures:');
    errors.forEach(e => console.log(`  ${e.name}: ${e.error.message}`));
  }
  return failed === 0;
}

// Deep equality helper
function deepEqual(a, b) {
  assert.deepStrictEqual(a, b);
}

module.exports = { test, suite, report, assert, deepEqual };
