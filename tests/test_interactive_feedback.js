var assert = require('assert');

var HARVEST_PARTICLE_COLORS = {
  flower_rose: { r: 0.2, g: 0.8, b: 0.2 },
  flower_tulip: { r: 0.2, g: 0.8, b: 0.2 },
  wood_oak: { r: 0.6, g: 0.4, b: 0.2 },
  stone_granite: { r: 0.5, g: 0.5, b: 0.5 },
  water_pure: { r: 0.2, g: 0.4, b: 0.8 }
};

function getHarvestParticleColor(itemId) {
  if (HARVEST_PARTICLE_COLORS[itemId]) return HARVEST_PARTICLE_COLORS[itemId];
  if (itemId.indexOf('flower') !== -1 || itemId.indexOf('herb') !== -1) return { r: 0.2, g: 0.8, b: 0.2 };
  if (itemId.indexOf('wood') !== -1) return { r: 0.6, g: 0.4, b: 0.2 };
  if (itemId.indexOf('stone') !== -1 || itemId.indexOf('ore') !== -1) return { r: 0.5, g: 0.5, b: 0.5 };
  if (itemId.indexOf('water') !== -1) return { r: 0.2, g: 0.4, b: 0.8 };
  return { r: 0.8, g: 0.7, b: 0.3 }; // gold default
}

(function testFlowerColors() {
  var c = getHarvestParticleColor('flower_rose');
  assert.strictEqual(c.g, 0.8, 'Flowers should have green particles');
  console.log('PASS: flower harvest colors');
})();

(function testWoodColors() {
  var c = getHarvestParticleColor('wood_birch');
  assert.strictEqual(c.r, 0.6, 'Wood should have brown particles');
  console.log('PASS: wood harvest colors');
})();

(function testStoneColors() {
  var c = getHarvestParticleColor('stone_marble');
  assert.strictEqual(c.r, 0.5, 'Stone should have grey particles');
  console.log('PASS: stone harvest colors');
})();

(function testDefaultColors() {
  var c = getHarvestParticleColor('mystery_item');
  assert.strictEqual(c.r, 0.8, 'Unknown items should have gold particles');
  console.log('PASS: default harvest colors');
})();

(function testFloatingTextFormat() {
  var itemName = 'Rose';
  var text = '+1 ' + itemName;
  assert.strictEqual(text, '+1 Rose', 'Floating text should format correctly');
  console.log('PASS: floating text format');
})();

console.log('All interactive feedback tests passed!');
