(function(exports) {
  // Pet companion system for ZION MMO

  // Pet type definitions with zones and rarities
  const PET_TYPES = [
    {
      id: 'cat',
      name: 'Mystic Cat',
      description: 'A wise feline Pingym that brings good fortune to trades',
      icon: '🐱',
      zone: 'commons',
      rarity: 'common',
      bonus: { type: 'trade_luck', value: 2 }
    },
    {
      id: 'fox',
      name: 'Spirit Fox',
      description: 'A clever fox with enhanced senses for discovering hidden places',
      icon: '🦊',
      zone: 'wilds',
      rarity: 'uncommon',
      bonus: { type: 'discovery_range', value: 2 }
    },
    {
      id: 'owl',
      name: 'Ancient Owl',
      description: 'A scholarly owl that helps unlock hidden lore',
      icon: '🦉',
      zone: 'athenaeum',
      rarity: 'uncommon',
      bonus: { type: 'lore_unlock', value: 2 }
    },
    {
      id: 'butterfly',
      name: 'Crystal Butterfly',
      description: 'A delicate butterfly that enhances garden growth',
      icon: '🦋',
      zone: 'gardens',
      rarity: 'common',
      bonus: { type: 'garden_growth', value: 2 }
    },
    {
      id: 'rabbit',
      name: 'Moon Rabbit',
      description: 'A gentle rabbit that brings peace and faster crafting',
      icon: '🐰',
      zone: 'gardens',
      rarity: 'common',
      bonus: { type: 'craft_speed', value: 2 }
    },
    {
      id: 'frog',
      name: 'Jade Frog',
      description: 'A lucky frog that attracts rare resources',
      icon: '🐸',
      zone: 'wilds',
      rarity: 'uncommon',
      bonus: { type: 'rare_resources', value: 2 }
    },
    {
      id: 'firefly',
      name: 'Ember Firefly',
      description: 'A glowing firefly that illuminates hidden paths',
      icon: '🪲',
      zone: 'wilds',
      rarity: 'rare',
      bonus: { type: 'vision_range', value: 3 }
    },
    {
      id: 'wolf_pup',
      name: 'Shadow Wolf Pup',
      description: 'A loyal wolf pup that boosts stamina and endurance',
      icon: '🐺',
      zone: 'wilds',
      rarity: 'rare',
      bonus: { type: 'stamina', value: 3 }
    },
    {
      id: 'phoenix_chick',
      name: 'Phoenix Chick',
      description: 'A rare phoenix chick that grants resilience and renewal',
      icon: '🐦',
      zone: 'athenaeum',
      rarity: 'legendary',
      bonus: { type: 'resilience', value: 5 }
    },
    {
      id: 'turtle',
      name: 'Ancient Turtle',
      description: 'A wise turtle that increases meditation effectiveness',
      icon: '🐢',
      zone: 'gardens',
      rarity: 'rare',
      bonus: { type: 'meditation', value: 3 }
    }
  ];

  // Pet state storage (in real game, this would be in database)
  const playerPets = {};

  // Pet care constants
  const PET_CONSTANTS = {
    HUNGER_DECAY_RATE: 1, // hunger increases by 1 per minute
    MOOD_DECAY_RATE: 0.5, // mood decreases by 0.5 per minute
    BOND_GAIN_RATE: 0.2, // bond increases by 0.2 when feeding/caring
    HUNGER_THRESHOLD_HAPPY: 30, // below 30 hunger = happy
    HUNGER_THRESHOLD_CONTENT: 60, // 30-60 = content
    MOOD_THRESHOLD_ECSTATIC: 90,
    MOOD_THRESHOLD_HAPPY: 70,
    MOOD_THRESHOLD_CONTENT: 50,
    MOOD_THRESHOLD_HUNGRY: 30
  };

  /**
   * Get pet types available in a specific zone
   * @param {string} zone - Zone identifier (commons, wilds, athenaeum, gardens)
   * @returns {Array} Array of pet types available in this zone
   */
  function getAvailablePets(zone) {
    return PET_TYPES.filter(pet => pet.zone === zone);
  }

  /**
   * Adopt a new pet
   * @param {string} playerId - Player identifier
   * @param {string} petType - Pet type id from PET_TYPES
   * @param {string} petName - Custom name for the pet
   * @returns {Object|null} Pet object or null if failed
   */
  function adoptPet(playerId, petType, petName) {
    if (!playerId || !petType || !petName) {
      console.error('Invalid adoption parameters');
      return null;
    }

    // Check if player already has a pet
    if (playerPets[playerId]) {
      console.warn('Player already has a pet. Release current pet first.');
      return null;
    }

    // Find pet type
    const petTypeData = PET_TYPES.find(p => p.id === petType);
    if (!petTypeData) {
      console.error('Invalid pet type:', petType);
      return null;
    }

    // Create pet state
    const pet = {
      id: generatePetId(),
      type: petType,
      name: petName,
      mood: 100, // Start happy
      hunger: 0, // Start well-fed
      bond: 0, // Build bond over time
      adopted_at: Date.now(),
      last_updated: Date.now()
    };

    playerPets[playerId] = pet;
    return pet;
  }

  /**
   * Get player's current pet
   * @param {string} playerId - Player identifier
   * @returns {Object|null} Pet object or null if no pet
   */
  function getPlayerPet(playerId) {
    return playerPets[playerId] || null;
  }

  /**
   * Feed the pet
   * @param {string} playerId - Player identifier
   * @param {string} foodItem - Food item type
   * @returns {Object} Result object with success, message, and updated pet
   */
  function feedPet(playerId, foodItem) {
    const pet = playerPets[playerId];
    if (!pet) {
      return { success: false, message: 'No pet to feed' };
    }

    // Food effectiveness
    const foodEffects = {
      'berry': { hunger: -20, mood: 5 },
      'fish': { hunger: -30, mood: 10 },
      'mushroom': { hunger: -15, mood: 3 },
      'bread': { hunger: -25, mood: 7 },
      'treat': { hunger: -10, mood: 15 },
      'default': { hunger: -10, mood: 5 }
    };

    const effect = foodEffects[foodItem] || foodEffects['default'];

    // Update pet state
    pet.hunger = Math.max(0, pet.hunger + effect.hunger);
    pet.mood = Math.min(100, pet.mood + effect.mood);
    pet.bond = Math.min(100, pet.bond + PET_CONSTANTS.BOND_GAIN_RATE);
    pet.last_updated = Date.now();

    return {
      success: true,
      message: `${pet.name} enjoyed the ${foodItem}!`,
      pet: pet
    };
  }

  /**
   * Update pet state over time (hunger/mood decay)
   * @param {string} playerId - Player identifier
   * @param {number} deltaTime - Time elapsed in milliseconds
   * @returns {Object|null} Updated pet or null
   */
  function updatePet(playerId, deltaTime) {
    const pet = playerPets[playerId];
    if (!pet) return null;

    const minutesElapsed = deltaTime / 60000; // Convert ms to minutes

    // Update hunger (increases over time)
    pet.hunger = Math.min(100, pet.hunger + (PET_CONSTANTS.HUNGER_DECAY_RATE * minutesElapsed));

    // Update mood (decreases over time, faster if hungry)
    let moodDecay = PET_CONSTANTS.MOOD_DECAY_RATE * minutesElapsed;
    if (pet.hunger > PET_CONSTANTS.HUNGER_THRESHOLD_CONTENT) {
      moodDecay *= 2; // Mood decays faster when hungry
    }
    pet.mood = Math.max(0, pet.mood - moodDecay);

    // Bond increases slightly over time (passive bonding)
    if (pet.hunger < PET_CONSTANTS.HUNGER_THRESHOLD_HAPPY && pet.mood > PET_CONSTANTS.MOOD_THRESHOLD_CONTENT) {
      pet.bond = Math.min(100, pet.bond + (0.1 * minutesElapsed));
    }

    pet.last_updated = Date.now();
    return pet;
  }

  /**
   * Get passive bonus from pet based on type and bond level
   * @param {string} playerId - Player identifier
   * @returns {Object|null} Bonus object with type and value, or null
   */
  function getPetBonus(playerId) {
    const pet = playerPets[playerId];
    if (!pet) return null;

    const petType = PET_TYPES.find(p => p.id === pet.type);
    if (!petType) return null;

    // Bonus scales with bond level
    const bondMultiplier = pet.bond / 100;
    const bonusValue = petType.bonus.value * bondMultiplier;

    return {
      type: petType.bonus.type,
      value: bonusValue,
      description: getBonusDescription(petType.bonus.type, bonusValue)
    };
  }

  /**
   * Rename pet
   * @param {string} playerId - Player identifier
   * @param {string} newName - New pet name
   * @returns {boolean} Success status
   */
  function renamePet(playerId, newName) {
    const pet = playerPets[playerId];
    if (!pet || !newName) return false;

    pet.name = newName;
    return true;
  }

  /**
   * Release pet back to the wild
   * @param {string} playerId - Player identifier
   * @returns {boolean} Success status
   */
  function releasePet(playerId) {
    if (!playerPets[playerId]) return false;
    delete playerPets[playerId];
    return true;
  }

  /**
   * Get pet mood description
   * @param {Object} pet - Pet object
   * @returns {string} Mood description
   */
  function getPetMood(pet) {
    if (!pet) return 'unknown';

    if (pet.hunger > 70) {
      return 'starving';
    } else if (pet.hunger > 50) {
      return 'hungry';
    }

    if (pet.mood >= PET_CONSTANTS.MOOD_THRESHOLD_ECSTATIC) {
      return 'ecstatic';
    } else if (pet.mood >= PET_CONSTANTS.MOOD_THRESHOLD_HAPPY) {
      return 'happy';
    } else if (pet.mood >= PET_CONSTANTS.MOOD_THRESHOLD_CONTENT) {
      return 'content';
    } else if (pet.mood >= PET_CONSTANTS.MOOD_THRESHOLD_HUNGRY) {
      return 'sad';
    } else {
      return 'depressed';
    }
  }

  /**
   * Get mood emoji indicator
   * @param {string} mood - Mood string
   * @returns {string} Emoji representing mood
   */
  function getMoodEmoji(mood) {
    const moodEmojis = {
      'ecstatic': '😄',
      'happy': '😊',
      'content': '🙂',
      'sad': '😟',
      'hungry': '😫',
      'starving': '😵',
      'depressed': '😢',
      'unknown': '😐'
    };
    return moodEmojis[mood] || moodEmojis['unknown'];
  }

  /**
   * Get bonus description
   * @param {string} bonusType - Type of bonus
   * @param {number} value - Bonus value
   * @returns {string} Description
   */
  function getBonusDescription(bonusType, value) {
    const descriptions = {
      'trade_luck': `+${value.toFixed(1)}% trade success`,
      'discovery_range': `+${value.toFixed(1)}% discovery radius`,
      'lore_unlock': `+${value.toFixed(1)}% lore unlock chance`,
      'garden_growth': `+${value.toFixed(1)}% garden growth rate`,
      'craft_speed': `+${value.toFixed(1)}% crafting speed`,
      'rare_resources': `+${value.toFixed(1)}% rare resource chance`,
      'vision_range': `+${value.toFixed(1)}% vision range`,
      'stamina': `+${value.toFixed(1)}% stamina`,
      'resilience': `+${value.toFixed(1)}% resilience`,
      'meditation': `+${value.toFixed(1)}% meditation effectiveness`
    };
    return descriptions[bonusType] || 'Unknown bonus';
  }

  /**
   * Generate unique pet ID
   * @returns {string} Unique ID
   */
  function generatePetId() {
    return 'pet_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get all pet types
   * @returns {Array} All pet types
   */
  function getAllPetTypes() {
    return PET_TYPES;
  }

  /**
   * Get pet type data
   * @param {string} petTypeId - Pet type ID
   * @returns {Object|null} Pet type data or null
   */
  function getPetTypeData(petTypeId) {
    return PET_TYPES.find(p => p.id === petTypeId) || null;
  }

  // Export public API
  exports.PET_TYPES = PET_TYPES;
  exports.getAvailablePets = getAvailablePets;
  exports.adoptPet = adoptPet;
  exports.getPlayerPet = getPlayerPet;
  exports.feedPet = feedPet;
  exports.updatePet = updatePet;
  exports.getPetBonus = getPetBonus;
  exports.renamePet = renamePet;
  exports.releasePet = releasePet;
  exports.getPetMood = getPetMood;
  exports.getMoodEmoji = getMoodEmoji;
  exports.getAllPetTypes = getAllPetTypes;
  exports.getPetTypeData = getPetTypeData;

})(typeof module !== 'undefined' ? module.exports : (window.Pets = {}));
