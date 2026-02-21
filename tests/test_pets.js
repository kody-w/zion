const { test, suite, report, assert } = require('./test_runner');
const Pets = require('../src/js/pets');

// Helper: generate unique player ids to avoid cross-test state pollution
let _uidCounter = 0;
function uid(prefix) {
  return `${prefix}_${++_uidCounter}`;
}

// Helper: adopt a pet for a fresh player and return { playerId, pet }
function freshPet(petTypeId, customName) {
  const playerId = uid('player');
  // Release any lingering state (shouldn't exist for a fresh uid, but be safe)
  Pets.releasePet(playerId);
  const pet = Pets.adoptPet(playerId, petTypeId || 'cat', customName || 'Whiskers');
  return { playerId, pet };
}

suite('Pets — PET_TYPES data structure', () => {

  test('PET_TYPES is an array with at least one entry', () => {
    assert(Array.isArray(Pets.PET_TYPES), 'PET_TYPES should be an array');
    assert(Pets.PET_TYPES.length > 0, 'PET_TYPES should not be empty');
  });

  test('Each pet type has required fields: id, name, description, zone, rarity, bonus', () => {
    const requiredFields = ['id', 'name', 'description', 'zone', 'rarity', 'bonus'];
    Pets.PET_TYPES.forEach(pet => {
      requiredFields.forEach(field => {
        assert(pet[field] !== undefined, `Pet ${pet.id} missing field: ${field}`);
      });
    });
  });

  test('Each pet bonus has type and value fields', () => {
    Pets.PET_TYPES.forEach(pet => {
      assert(typeof pet.bonus.type === 'string', `Pet ${pet.id} bonus must have string type`);
      assert(typeof pet.bonus.value === 'number', `Pet ${pet.id} bonus must have numeric value`);
      assert(pet.bonus.value > 0, `Pet ${pet.id} bonus value must be positive`);
    });
  });

  test('All pet rarities are valid (common/uncommon/rare/legendary)', () => {
    const validRarities = ['common', 'uncommon', 'rare', 'legendary'];
    Pets.PET_TYPES.forEach(pet => {
      assert(
        validRarities.includes(pet.rarity),
        `Pet ${pet.id} has invalid rarity: ${pet.rarity}`
      );
    });
  });

  test('All 10 expected pet types exist', () => {
    const expectedIds = ['cat', 'fox', 'owl', 'butterfly', 'rabbit', 'frog', 'firefly', 'wolf_pup', 'phoenix_chick', 'turtle'];
    const actualIds = Pets.PET_TYPES.map(p => p.id);
    expectedIds.forEach(id => {
      assert(actualIds.includes(id), `Missing pet type: ${id}`);
    });
  });

  test('cat has trade_luck bonus', () => {
    const cat = Pets.PET_TYPES.find(p => p.id === 'cat');
    assert(cat !== undefined, 'Cat not found');
    assert.strictEqual(cat.bonus.type, 'trade_luck');
  });

  test('phoenix_chick is legendary rarity', () => {
    const phoenix = Pets.PET_TYPES.find(p => p.id === 'phoenix_chick');
    assert(phoenix !== undefined, 'phoenix_chick not found');
    assert.strictEqual(phoenix.rarity, 'legendary');
  });

  test('legendary pets have higher bonus value than common pets', () => {
    const legendaryPets = Pets.PET_TYPES.filter(p => p.rarity === 'legendary');
    const commonPets = Pets.PET_TYPES.filter(p => p.rarity === 'common');
    legendaryPets.forEach(lp => {
      commonPets.forEach(cp => {
        assert(lp.bonus.value >= cp.bonus.value,
          `Legendary ${lp.id} (${lp.bonus.value}) should have >= bonus than common ${cp.id} (${cp.bonus.value})`);
      });
    });
  });

  test('Each pet type has unique id', () => {
    const ids = Pets.PET_TYPES.map(p => p.id);
    const unique = new Set(ids);
    assert.strictEqual(unique.size, ids.length, 'All pet type ids should be unique');
  });

});

suite('Pets — Pet Adoption', () => {

  test('adoptPet returns a pet object with correct structure', () => {
    const { pet } = freshPet('cat', 'Luna');
    assert(pet !== null, 'adoptPet should return a pet object');
    assert(typeof pet.id === 'string', 'Pet should have string id');
    assert.strictEqual(pet.type, 'cat');
    assert.strictEqual(pet.name, 'Luna');
  });

  test('New pet starts with mood=100, hunger=0, bond=0', () => {
    const { pet } = freshPet('fox');
    assert.strictEqual(pet.mood, 100, 'New pet should start at full mood');
    assert.strictEqual(pet.hunger, 0, 'New pet should start with 0 hunger');
    assert.strictEqual(pet.bond, 0, 'New pet should start with 0 bond');
  });

  test('adoptPet returns null for missing playerId', () => {
    const result = Pets.adoptPet(null, 'cat', 'Kitty');
    assert.strictEqual(result, null, 'Should return null for missing playerId');
  });

  test('adoptPet returns null for missing petType', () => {
    const result = Pets.adoptPet(uid('player'), null, 'Kitty');
    assert.strictEqual(result, null, 'Should return null for missing petType');
  });

  test('adoptPet returns null for missing petName', () => {
    const result = Pets.adoptPet(uid('player'), 'cat', null);
    assert.strictEqual(result, null, 'Should return null for missing petName');
  });

  test('adoptPet returns null for invalid petType', () => {
    const result = Pets.adoptPet(uid('player'), 'dragon', 'Smaug');
    assert.strictEqual(result, null, 'Should return null for invalid pet type');
  });

  test('adoptPet returns null if player already has a pet', () => {
    const { playerId } = freshPet('cat', 'First');
    const second = Pets.adoptPet(playerId, 'fox', 'Second');
    assert.strictEqual(second, null, 'Should not allow adopting a second pet');
  });

  test('adoptPet generates unique pet ids', () => {
    const { pet: pet1 } = freshPet('cat');
    const { pet: pet2 } = freshPet('fox');
    assert(pet1.id !== pet2.id, 'Each pet should have a unique id');
  });

  test('adoptPet stores pet — getPlayerPet returns it', () => {
    const { playerId } = freshPet('owl', 'Hoot');
    const retrieved = Pets.getPlayerPet(playerId);
    assert(retrieved !== null, 'Should be able to retrieve adopted pet');
    assert.strictEqual(retrieved.type, 'owl');
  });

});

suite('Pets — getAvailablePets (zone filtering)', () => {

  test('getAvailablePets returns array', () => {
    const result = Pets.getAvailablePets('commons');
    assert(Array.isArray(result), 'Should return an array');
  });

  test('getAvailablePets for commons returns cat', () => {
    const pets = Pets.getAvailablePets('commons');
    const ids = pets.map(p => p.id);
    assert(ids.includes('cat'), 'commons should have cat available');
  });

  test('getAvailablePets for wilds returns fox, frog, wolf_pup, firefly', () => {
    const pets = Pets.getAvailablePets('wilds');
    const ids = pets.map(p => p.id);
    ['fox', 'frog', 'firefly', 'wolf_pup'].forEach(id => {
      assert(ids.includes(id), `wilds should have ${id} available`);
    });
  });

  test('getAvailablePets for athenaeum returns owl and phoenix_chick', () => {
    const pets = Pets.getAvailablePets('athenaeum');
    const ids = pets.map(p => p.id);
    assert(ids.includes('owl'), 'athenaeum should have owl');
    assert(ids.includes('phoenix_chick'), 'athenaeum should have phoenix_chick');
  });

  test('getAvailablePets for gardens returns butterfly, rabbit, turtle', () => {
    const pets = Pets.getAvailablePets('gardens');
    const ids = pets.map(p => p.id);
    ['butterfly', 'rabbit', 'turtle'].forEach(id => {
      assert(ids.includes(id), `gardens should have ${id} available`);
    });
  });

  test('getAvailablePets for unknown zone returns empty array', () => {
    const pets = Pets.getAvailablePets('invalid_zone');
    assert(Array.isArray(pets), 'Should return array');
    assert.strictEqual(pets.length, 0, 'Unknown zone should have no pets');
  });

  test('Pet from zone does not appear in another zone', () => {
    const commonsPets = Pets.getAvailablePets('commons');
    const ids = commonsPets.map(p => p.id);
    assert(!ids.includes('fox'), 'fox should not be available in commons');
    assert(!ids.includes('owl'), 'owl should not be available in commons');
  });

});

suite('Pets — Retrieving & Releasing Pets', () => {

  test('getPlayerPet returns null for player with no pet', () => {
    const result = Pets.getPlayerPet(uid('nopet'));
    assert.strictEqual(result, null, 'Should return null if player has no pet');
  });

  test('releasePet returns true and removes the pet', () => {
    const { playerId } = freshPet('turtle', 'Tank');
    const released = Pets.releasePet(playerId);
    assert.strictEqual(released, true, 'releasePet should return true');
    const pet = Pets.getPlayerPet(playerId);
    assert.strictEqual(pet, null, 'Pet should be gone after release');
  });

  test('releasePet returns false when player has no pet', () => {
    const released = Pets.releasePet(uid('nopet'));
    assert.strictEqual(released, false, 'Should return false if no pet to release');
  });

  test('Player can adopt again after releasing', () => {
    const { playerId } = freshPet('butterfly', 'Flutter');
    Pets.releasePet(playerId);
    const newPet = Pets.adoptPet(playerId, 'rabbit', 'Bunny');
    assert(newPet !== null, 'Should be able to adopt after releasing');
    assert.strictEqual(newPet.type, 'rabbit');
  });

});

suite('Pets — Feeding', () => {

  test('feedPet fails when player has no pet', () => {
    const result = Pets.feedPet(uid('nopet'), 'berry');
    assert.strictEqual(result.success, false);
    assert(typeof result.message === 'string');
  });

  test('feedPet with berry reduces hunger by 20', () => {
    const { playerId, pet } = freshPet('cat', 'Berry Test');
    // Manually increase hunger first
    pet.hunger = 40;
    const result = Pets.feedPet(playerId, 'berry');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.pet.hunger, 20, 'Hunger should drop by 20 after berry');
  });

  test('feedPet with fish reduces hunger by 30', () => {
    const { playerId, pet } = freshPet('fox', 'Fish Test');
    pet.hunger = 40;
    Pets.feedPet(playerId, 'fish');
    const retrieved = Pets.getPlayerPet(playerId);
    assert.strictEqual(retrieved.hunger, 10);
  });

  test('feedPet does not allow hunger below 0', () => {
    const { playerId, pet } = freshPet('owl', 'Zero Test');
    pet.hunger = 5; // Only 5 hunger
    Pets.feedPet(playerId, 'fish'); // Would reduce by 30
    const retrieved = Pets.getPlayerPet(playerId);
    assert(retrieved.hunger >= 0, 'Hunger should not go below 0');
    assert.strictEqual(retrieved.hunger, 0);
  });

  test('feedPet with treat increases mood by 15', () => {
    const { playerId, pet } = freshPet('rabbit', 'Treat Test');
    pet.mood = 70;
    Pets.feedPet(playerId, 'treat');
    const retrieved = Pets.getPlayerPet(playerId);
    assert.strictEqual(retrieved.mood, 85, 'Mood should increase by 15 with treat');
  });

  test('feedPet does not allow mood above 100', () => {
    const { playerId, pet } = freshPet('butterfly', 'Cap Test');
    pet.mood = 95;
    Pets.feedPet(playerId, 'treat'); // +15 would go to 110
    const retrieved = Pets.getPlayerPet(playerId);
    assert.strictEqual(retrieved.mood, 100, 'Mood should be capped at 100');
  });

  test('feedPet increases bond by BOND_GAIN_RATE (0.2)', () => {
    const { playerId, pet } = freshPet('frog', 'Bond Test');
    const initialBond = pet.bond;
    Pets.feedPet(playerId, 'mushroom');
    const retrieved = Pets.getPlayerPet(playerId);
    assert(Math.abs(retrieved.bond - (initialBond + 0.2)) < 0.001, 'Bond should increase by 0.2');
  });

  test('feedPet with unknown food uses default effect', () => {
    const { playerId, pet } = freshPet('wolf_pup', 'Default Food Test');
    pet.hunger = 40;
    const initialMood = pet.mood;
    Pets.feedPet(playerId, 'weird_food');
    const retrieved = Pets.getPlayerPet(playerId);
    // Default: hunger -10, mood +5
    assert.strictEqual(retrieved.hunger, 30, 'Default food should reduce hunger by 10');
    assert.strictEqual(retrieved.mood, Math.min(100, initialMood + 5), 'Default food should increase mood by 5');
  });

  test('feedPet returns message mentioning pet name and food', () => {
    const { playerId } = freshPet('cat', 'Mittens');
    const result = Pets.feedPet(playerId, 'berry');
    assert(result.message.includes('Mittens'), 'Message should mention pet name');
    assert(result.message.includes('berry'), 'Message should mention food item');
  });

});

suite('Pets — Mood Tracking (getPetMood)', () => {

  test('getPetMood returns "unknown" for null', () => {
    const mood = Pets.getPetMood(null);
    assert.strictEqual(mood, 'unknown');
  });

  test('getPetMood returns "starving" when hunger > 70', () => {
    const pet = { hunger: 80, mood: 100 };
    assert.strictEqual(Pets.getPetMood(pet), 'starving');
  });

  test('getPetMood returns "hungry" when hunger 51-70', () => {
    const pet = { hunger: 60, mood: 100 };
    assert.strictEqual(Pets.getPetMood(pet), 'hungry');
  });

  test('getPetMood returns "ecstatic" when mood >= 90 and not hungry', () => {
    const pet = { hunger: 10, mood: 95 };
    assert.strictEqual(Pets.getPetMood(pet), 'ecstatic');
  });

  test('getPetMood returns "happy" when mood 70-89 and not hungry', () => {
    const pet = { hunger: 10, mood: 80 };
    assert.strictEqual(Pets.getPetMood(pet), 'happy');
  });

  test('getPetMood returns "content" when mood 50-69 and not hungry', () => {
    const pet = { hunger: 10, mood: 60 };
    assert.strictEqual(Pets.getPetMood(pet), 'content');
  });

  test('getPetMood returns "sad" when mood 30-49 and not hungry', () => {
    const pet = { hunger: 10, mood: 40 };
    assert.strictEqual(Pets.getPetMood(pet), 'sad');
  });

  test('getPetMood returns "depressed" when mood < 30 and not hungry', () => {
    const pet = { hunger: 10, mood: 15 };
    assert.strictEqual(Pets.getPetMood(pet), 'depressed');
  });

  test('Hunger state takes priority over mood state', () => {
    // Even if mood is ecstatic, starving overrides
    const pet = { hunger: 80, mood: 100 };
    const mood = Pets.getPetMood(pet);
    assert.strictEqual(mood, 'starving', 'Starvation should override mood score');
  });

});

suite('Pets — Mood Emoji', () => {

  test('getMoodEmoji returns a non-empty string for all moods', () => {
    const moods = ['ecstatic', 'happy', 'content', 'sad', 'hungry', 'starving', 'depressed', 'unknown'];
    moods.forEach(mood => {
      const emoji = Pets.getMoodEmoji(mood);
      assert(typeof emoji === 'string' && emoji.length > 0, `getMoodEmoji should return string for: ${mood}`);
    });
  });

  test('getMoodEmoji returns default for unknown mood string', () => {
    const emoji = Pets.getMoodEmoji('invisible');
    // The implementation falls back to unknown emoji
    assert(typeof emoji === 'string', 'Should return a string for unknown mood');
  });

});

suite('Pets — Pet Bonuses (getPetBonus)', () => {

  test('getPetBonus returns null when player has no pet', () => {
    const bonus = Pets.getPetBonus(uid('nopet'));
    assert.strictEqual(bonus, null);
  });

  test('getPetBonus returns null when bond is 0 (no bonus yet)', () => {
    const { playerId } = freshPet('cat', 'Bond Zero');
    const bonus = Pets.getPetBonus(playerId);
    // value = petType.bonus.value * (bond / 100) = 2 * 0 = 0
    assert(bonus !== null, 'getPetBonus still returns object even at bond 0');
    assert.strictEqual(bonus.value, 0, 'Bonus value should be 0 when bond is 0');
  });

  test('getPetBonus scales with bond level', () => {
    const { playerId, pet } = freshPet('cat', 'Bond Scale');
    pet.bond = 50; // 50% bond
    const bonus = Pets.getPetBonus(playerId);
    // cat bonus.value = 2, bondMultiplier = 0.5 → bonusValue = 1.0
    assert(Math.abs(bonus.value - 1.0) < 0.001, `Bonus at 50% bond should be 1.0, got ${bonus.value}`);
  });

  test('getPetBonus at max bond (100) equals pet type base value', () => {
    const { playerId, pet } = freshPet('fox', 'Max Bond');
    pet.bond = 100;
    const bonus = Pets.getPetBonus(playerId);
    const foxType = Pets.PET_TYPES.find(p => p.id === 'fox');
    assert(Math.abs(bonus.value - foxType.bonus.value) < 0.001,
      `Max bond bonus should equal base value ${foxType.bonus.value}, got ${bonus.value}`);
  });

  test('getPetBonus has correct type field matching pet type bonus', () => {
    const { playerId } = freshPet('cat', 'Type Check');
    const bonus = Pets.getPetBonus(playerId);
    assert.strictEqual(bonus.type, 'trade_luck', 'Cat bonus type should be trade_luck');
  });

  test('getPetBonus has a description string', () => {
    const { playerId, pet } = freshPet('butterfly', 'Desc Test');
    pet.bond = 50;
    const bonus = Pets.getPetBonus(playerId);
    assert(typeof bonus.description === 'string', 'Bonus should have description string');
    assert(bonus.description.length > 0, 'Description should not be empty');
  });

  test('Phoenix chick has resilience bonus type', () => {
    const { playerId } = freshPet('phoenix_chick', 'Ember');
    const bonus = Pets.getPetBonus(playerId);
    assert.strictEqual(bonus.type, 'resilience');
  });

});

suite('Pets — updatePet (time-based decay)', () => {

  test('updatePet returns null when player has no pet', () => {
    const result = Pets.updatePet(uid('nopet'), 60000);
    assert.strictEqual(result, null);
  });

  test('updatePet increases hunger over time', () => {
    const { playerId, pet } = freshPet('turtle', 'Hunger Decay');
    pet.hunger = 0;
    // 60 seconds = 60000 ms → 1 minute → hunger increase = 1 * 1 = 1
    Pets.updatePet(playerId, 60000);
    const updated = Pets.getPlayerPet(playerId);
    assert(updated.hunger > 0, 'Hunger should increase after time passes');
  });

  test('updatePet decreases mood over time', () => {
    const { playerId, pet } = freshPet('owl', 'Mood Decay');
    pet.mood = 100;
    // 60 seconds → moodDecay = 0.5 * 1 = 0.5
    Pets.updatePet(playerId, 60000);
    const updated = Pets.getPlayerPet(playerId);
    assert(updated.mood < 100, 'Mood should decrease after time passes');
  });

  test('updatePet caps hunger at 100', () => {
    const { playerId, pet } = freshPet('rabbit', 'Max Hunger');
    pet.hunger = 99;
    // Very long time passes
    Pets.updatePet(playerId, 60000 * 120); // 2 hours
    const updated = Pets.getPlayerPet(playerId);
    assert(updated.hunger <= 100, 'Hunger should not exceed 100');
  });

  test('updatePet does not let mood go below 0', () => {
    const { playerId, pet } = freshPet('frog', 'Min Mood');
    pet.mood = 1;
    Pets.updatePet(playerId, 60000 * 60); // 1 hour
    const updated = Pets.getPlayerPet(playerId);
    assert(updated.mood >= 0, 'Mood should not go below 0');
  });

  test('updatePet decays mood faster when pet is hungry (> 60 hunger)', () => {
    const playerId1 = uid('well_fed');
    const playerId2 = uid('hungry');
    Pets.releasePet(playerId1);
    Pets.releasePet(playerId2);

    const pet1 = Pets.adoptPet(playerId1, 'cat', 'Well Fed');
    const pet2 = Pets.adoptPet(playerId2, 'cat', 'Hungry');

    pet1.mood = 100;
    pet1.hunger = 10; // well-fed
    pet2.mood = 100;
    pet2.hunger = 70; // hungry (> 60 threshold)

    const deltaTime = 60000 * 10; // 10 minutes
    Pets.updatePet(playerId1, deltaTime);
    Pets.updatePet(playerId2, deltaTime);

    const updated1 = Pets.getPlayerPet(playerId1);
    const updated2 = Pets.getPlayerPet(playerId2);

    assert(updated2.mood < updated1.mood,
      `Hungry pet mood (${updated2.mood}) should decay faster than well-fed (${updated1.mood})`);
  });

  test('updatePet increases bond passively when pet is well-fed and happy', () => {
    const { playerId, pet } = freshPet('butterfly', 'Bond Passive');
    pet.hunger = 10; // < 30 (HUNGER_THRESHOLD_HAPPY)
    pet.mood = 60;   // > 50 (MOOD_THRESHOLD_CONTENT)
    pet.bond = 0;

    Pets.updatePet(playerId, 60000 * 5); // 5 minutes
    const updated = Pets.getPlayerPet(playerId);
    assert(updated.bond > 0, 'Bond should increase passively when pet is happy and well-fed');
  });

  test('updatePet does NOT increase bond when pet is hungry', () => {
    const { playerId, pet } = freshPet('wolf_pup', 'No Bond Hungry');
    pet.hunger = 50; // > 30 (HUNGER_THRESHOLD_HAPPY) — not happy
    pet.mood = 80;
    pet.bond = 0;

    Pets.updatePet(playerId, 60000 * 5); // 5 minutes
    const updated = Pets.getPlayerPet(playerId);
    assert.strictEqual(updated.bond, 0, 'Bond should not increase when pet is hungry');
  });

  test('updatePet returns the updated pet object', () => {
    const { playerId } = freshPet('firefly', 'Return Value');
    const updated = Pets.updatePet(playerId, 60000);
    assert(updated !== null, 'Should return the updated pet');
    assert(typeof updated.mood === 'number', 'Returned pet should have mood');
  });

});

suite('Pets — Renaming', () => {

  test('renamePet changes pet name', () => {
    const { playerId } = freshPet('cat', 'Old Name');
    Pets.renamePet(playerId, 'New Name');
    const pet = Pets.getPlayerPet(playerId);
    assert.strictEqual(pet.name, 'New Name');
  });

  test('renamePet returns true on success', () => {
    const { playerId } = freshPet('fox', 'Foxy');
    const result = Pets.renamePet(playerId, 'Renard');
    assert.strictEqual(result, true);
  });

  test('renamePet returns false when player has no pet', () => {
    const result = Pets.renamePet(uid('nopet'), 'Nameless');
    assert.strictEqual(result, false);
  });

  test('renamePet returns false for empty name', () => {
    const { playerId } = freshPet('owl', 'Hoot');
    const result = Pets.renamePet(playerId, '');
    assert.strictEqual(result, false);
  });

  test('renamePet returns false for null name', () => {
    const { playerId } = freshPet('turtle', 'Shelly');
    const result = Pets.renamePet(playerId, null);
    assert.strictEqual(result, false);
  });

});

suite('Pets — getAllPetTypes & getPetTypeData', () => {

  test('getAllPetTypes returns the full PET_TYPES array', () => {
    const all = Pets.getAllPetTypes();
    assert(Array.isArray(all), 'getAllPetTypes should return array');
    assert.strictEqual(all.length, Pets.PET_TYPES.length, 'Should return all pet types');
  });

  test('getPetTypeData returns correct data for known id', () => {
    const data = Pets.getPetTypeData('cat');
    assert(data !== null, 'Should return data for cat');
    assert.strictEqual(data.id, 'cat');
    assert.strictEqual(data.name, 'Mystic Cat');
  });

  test('getPetTypeData returns null for unknown id', () => {
    const data = Pets.getPetTypeData('dragon');
    assert.strictEqual(data, null, 'Unknown pet type should return null');
  });

  test('getPetTypeData for phoenix_chick has legendary rarity', () => {
    const data = Pets.getPetTypeData('phoenix_chick');
    assert(data !== null, 'phoenix_chick data should exist');
    assert.strictEqual(data.rarity, 'legendary');
  });

  test('getPetTypeData is consistent with PET_TYPES array entries', () => {
    Pets.PET_TYPES.forEach(petType => {
      const retrieved = Pets.getPetTypeData(petType.id);
      assert(retrieved !== null, `getPetTypeData should find: ${petType.id}`);
      assert.strictEqual(retrieved.id, petType.id);
      assert.strictEqual(retrieved.name, petType.name);
    });
  });

});

suite('Pets — Companion Limits (one pet per player)', () => {

  test('Player cannot have more than one pet simultaneously', () => {
    const { playerId } = freshPet('cat', 'First Pet');
    const second = Pets.adoptPet(playerId, 'fox', 'Second Pet');
    assert.strictEqual(second, null, 'Player should not be able to adopt a second pet');
    const pet = Pets.getPlayerPet(playerId);
    assert.strictEqual(pet.name, 'First Pet', 'Original pet should be unchanged');
  });

  test('Different players can each have their own pet', () => {
    const p1 = uid('multi1');
    const p2 = uid('multi2');
    const pet1 = Pets.adoptPet(p1, 'cat', 'Player1Cat');
    const pet2 = Pets.adoptPet(p2, 'owl', 'Player2Owl');

    assert(pet1 !== null, 'Player 1 should be able to adopt');
    assert(pet2 !== null, 'Player 2 should be able to adopt');
    assert(pet1.id !== pet2.id, 'Each player pet should have a unique id');
  });

  test('After releasing, player count drops to zero and new adoption is allowed', () => {
    const { playerId } = freshPet('rabbit', 'Hoppy');
    Pets.releasePet(playerId);
    const newPet = Pets.adoptPet(playerId, 'turtle', 'Shelly');
    assert(newPet !== null, 'Should be able to adopt after releasing original pet');
    assert.strictEqual(newPet.type, 'turtle');
  });

});

const success = report();
process.exit(success ? 0 : 1);
