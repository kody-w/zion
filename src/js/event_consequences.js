/**
 * ZION Event Consequences System
 * Extended voting consequences — player votes determine world state changes
 * with cascading effects. Auditable democracy ledger.
 */

(function(exports) {
  'use strict';

  // ---------------------------------------------------------------------------
  // CONSEQUENCE_TYPES — 10 consequence categories
  // ---------------------------------------------------------------------------
  var CONSEQUENCE_TYPES = [
    {
      id: 'zone_weather',
      name: 'Zone Weather Control',
      description: 'Vote on weather patterns for a zone',
      options: [
        {id: 'sunny', label: 'Clear Skies', effect: {gathering_bonus: 0.2, fishing_penalty: -0.1}},
        {id: 'rainy', label: 'Rain', effect: {garden_growth: 0.3, movement_penalty: -0.1}},
        {id: 'stormy', label: 'Storm', effect: {rare_spawn_bonus: 0.5, outdoor_penalty: -0.3}}
      ],
      duration: 500,
      cooldown: 1000,
      zone: null
    },
    {
      id: 'resource_access',
      name: 'Resource Access Control',
      description: 'Vote on who can access zone resources',
      options: [
        {id: 'open', label: 'Open Access', effect: {resource_bonus: 0.1, conflict_chance: 0.1}},
        {id: 'restricted', label: 'Restricted Access', effect: {resource_quality: 0.3, throughput_penalty: -0.2}},
        {id: 'guild_only', label: 'Guild Members Only', effect: {guild_resource_bonus: 0.4, outsider_penalty: -0.5}}
      ],
      duration: 600,
      cooldown: 1200,
      zone: null
    },
    {
      id: 'npc_leadership',
      name: 'NPC Leadership Election',
      description: 'Elect an NPC to lead zone activities',
      options: [
        {id: 'merchant_leader', label: 'Merchant Leader', effect: {trade_bonus: 0.25, craft_cost_reduction: 0.1}},
        {id: 'warrior_leader', label: 'Warrior Leader', effect: {defense_bonus: 0.3, combat_xp_bonus: 0.2}},
        {id: 'scholar_leader', label: 'Scholar Leader', effect: {xp_bonus: 0.2, research_speed: 0.3}},
        {id: 'no_leader', label: 'No Leader', effect: {independence_bonus: 0.1}}
      ],
      duration: 1000,
      cooldown: 2000,
      zone: null
    },
    {
      id: 'zone_rules',
      name: 'Zone Rule Setting',
      description: 'Vote on behavior rules for a zone',
      options: [
        {id: 'peaceful', label: 'Peaceful Zone', effect: {pvp_disabled: 1, cooperation_bonus: 0.2}},
        {id: 'contested', label: 'Contested Zone', effect: {pvp_enabled: 1, loot_bonus: 0.3}},
        {id: 'lawless', label: 'Lawless Zone', effect: {no_rules: 1, risk_reward_bonus: 0.5, safety_penalty: -0.3}}
      ],
      duration: 800,
      cooldown: 1600,
      zone: null
    },
    {
      id: 'market_regulation',
      name: 'Market Regulation',
      description: 'Vote on market trading rules and price controls',
      options: [
        {id: 'free_market', label: 'Free Market', effect: {price_freedom: 1, trade_volume_bonus: 0.2}},
        {id: 'price_caps', label: 'Price Caps', effect: {max_price_multiplier: 1.5, stability_bonus: 0.15}},
        {id: 'subsidized', label: 'Subsidized Goods', effect: {cost_reduction: 0.2, treasury_drain: 0.1}}
      ],
      duration: 700,
      cooldown: 1400,
      zone: 'agora'
    },
    {
      id: 'festival_theme',
      name: 'Festival Theme Selection',
      description: 'Vote on the theme for the next zone festival',
      options: [
        {id: 'harvest_festival', label: 'Harvest Festival', effect: {gathering_bonus: 0.4, food_abundance: 0.5}},
        {id: 'arts_festival', label: 'Arts Festival', effect: {creation_bonus: 0.4, reputation_bonus: 0.2}},
        {id: 'combat_festival', label: 'Combat Festival', effect: {combat_xp_bonus: 0.4, spectator_reward: 0.2}},
        {id: 'trade_festival', label: 'Trade Festival', effect: {trade_bonus: 0.4, merchant_reward: 0.3}}
      ],
      duration: 300,
      cooldown: 500,
      zone: null
    },
    {
      id: 'building_priority',
      name: 'Building Priority',
      description: 'Vote on which buildings to prioritize constructing',
      options: [
        {id: 'marketplace', label: 'Marketplace', effect: {trade_slots_bonus: 5, merchant_bonus: 0.2}},
        {id: 'barracks', label: 'Barracks', effect: {defense_bonus: 0.3, recruit_speed: 0.2}},
        {id: 'academy', label: 'Academy', effect: {xp_bonus: 0.25, skill_unlock_speed: 0.2}},
        {id: 'workshop', label: 'Workshop', effect: {craft_speed: 0.3, material_efficiency: 0.2}}
      ],
      duration: 900,
      cooldown: 1800,
      zone: null
    },
    {
      id: 'tax_rate',
      name: 'Tax Rate Adjustment',
      description: 'Vote on the local tax rate for zone transactions',
      options: [
        {id: 'no_tax', label: 'No Tax', effect: {tax_rate: 0, trade_volume_bonus: 0.3}},
        {id: 'low_tax', label: 'Low Tax (5%)', effect: {tax_rate: 0.05, public_goods_bonus: 0.1}},
        {id: 'moderate_tax', label: 'Moderate Tax (15%)', effect: {tax_rate: 0.15, public_goods_bonus: 0.3}},
        {id: 'high_tax', label: 'High Tax (30%)', effect: {tax_rate: 0.30, public_goods_bonus: 0.6, trade_penalty: -0.2}}
      ],
      duration: 1000,
      cooldown: 2000,
      zone: null
    },
    {
      id: 'event_schedule',
      name: 'Event Schedule',
      description: 'Vote on what events to schedule for the zone',
      options: [
        {id: 'daily_tournament', label: 'Daily Tournament', effect: {combat_event_frequency: 1, reward_bonus: 0.2}},
        {id: 'weekly_market', label: 'Weekly Market', effect: {trade_event_frequency: 1, price_bonus: 0.15}},
        {id: 'exploration_rally', label: 'Exploration Rally', effect: {explore_event_frequency: 1, discovery_bonus: 0.3}},
        {id: 'creative_showcase', label: 'Creative Showcase', effect: {creation_event_frequency: 1, art_reward: 0.25}}
      ],
      duration: 400,
      cooldown: 800,
      zone: null
    },
    {
      id: 'world_policy',
      name: 'World Policy',
      description: 'Vote on global policies affecting the entire world',
      options: [
        {id: 'open_borders', label: 'Open Borders', effect: {zone_transition_free: 1, global_trade_bonus: 0.1}},
        {id: 'zone_sovereignty', label: 'Zone Sovereignty', effect: {local_rule_bonus: 0.2, cross_zone_tax: 0.1}},
        {id: 'unified_economy', label: 'Unified Economy', effect: {global_price_stability: 0.3, trade_efficiency: 0.2}},
        {id: 'competitive_zones', label: 'Competitive Zones', effect: {zone_rivalry_bonus: 0.3, inter_zone_conflict: 0.2}}
      ],
      duration: 1500,
      cooldown: 3000,
      zone: 'global'
    }
  ];

  // ---------------------------------------------------------------------------
  // CASCADE_RULES — 15 cascade relationships
  // ---------------------------------------------------------------------------
  var CASCADE_RULES = [
    {
      trigger: {type: 'resource_access', option: 'restricted'},
      cascade: {type: 'market_price_surge', zone: 'agora', multiplier: 1.3, delay: 100},
      description: 'Restricting resources causes market price surge'
    },
    {
      trigger: {type: 'zone_weather', option: 'stormy'},
      cascade: {type: 'npc_shelter', zone: null, modifier: -0.5, delay: 50},
      description: 'Storm drives NPCs to seek shelter reducing zone activity'
    },
    {
      trigger: {type: 'market_regulation', option: 'free_market'},
      cascade: {type: 'wealth_concentration', zone: 'agora', multiplier: 1.2, delay: 200},
      description: 'Free market leads to wealth concentration over time'
    },
    {
      trigger: {type: 'zone_rules', option: 'lawless'},
      cascade: {type: 'crime_increase', zone: null, modifier: 0.4, delay: 75},
      description: 'Lawless zones see increased criminal activity'
    },
    {
      trigger: {type: 'tax_rate', option: 'high_tax'},
      cascade: {type: 'trade_migration', zone: null, modifier: -0.3, delay: 150},
      description: 'High taxes cause traders to migrate to lower-tax zones'
    },
    {
      trigger: {type: 'npc_leadership', option: 'merchant_leader'},
      cascade: {type: 'trade_network_expansion', zone: null, multiplier: 1.15, delay: 100},
      description: 'Merchant leader expands trade networks'
    },
    {
      trigger: {type: 'festival_theme', option: 'harvest_festival'},
      cascade: {type: 'food_surplus', zone: null, multiplier: 1.5, delay: 50},
      description: 'Harvest festival creates temporary food surplus'
    },
    {
      trigger: {type: 'building_priority', option: 'barracks'},
      cascade: {type: 'military_recruitment', zone: null, modifier: 0.3, delay: 200},
      description: 'New barracks spurs military recruitment'
    },
    {
      trigger: {type: 'world_policy', option: 'zone_sovereignty'},
      cascade: {type: 'cross_zone_tariffs', zone: 'global', multiplier: 1.1, delay: 300},
      description: 'Zone sovereignty leads to cross-zone tariffs'
    },
    {
      trigger: {type: 'zone_weather', option: 'rainy'},
      cascade: {type: 'crop_bonus', zone: null, multiplier: 1.3, delay: 100},
      description: 'Rain causes bonus crop growth in gardens'
    },
    {
      trigger: {type: 'resource_access', option: 'guild_only'},
      cascade: {type: 'guild_power_surge', zone: null, multiplier: 1.4, delay: 50},
      description: 'Guild-only access dramatically increases guild influence'
    },
    {
      trigger: {type: 'market_regulation', option: 'subsidized'},
      cascade: {type: 'treasury_strain', zone: 'global', modifier: -0.15, delay: 250},
      description: 'Subsidies strain the global treasury'
    },
    {
      trigger: {type: 'zone_rules', option: 'peaceful'},
      cascade: {type: 'tourist_influx', zone: null, multiplier: 1.25, delay: 100},
      description: 'Peaceful zones attract tourists and visitors'
    },
    {
      trigger: {type: 'event_schedule', option: 'daily_tournament'},
      cascade: {type: 'warrior_migration', zone: null, modifier: 0.35, delay: 75},
      description: 'Daily tournaments attract warriors from other zones'
    },
    {
      trigger: {type: 'building_priority', option: 'academy'},
      cascade: {type: 'scholar_migration', zone: null, modifier: 0.3, delay: 150},
      description: 'Academy construction attracts scholars and students'
    }
  ];

  // ---------------------------------------------------------------------------
  // Internal counters
  // ---------------------------------------------------------------------------
  var voteCounter = 0;
  var effectCounter = 0;

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------
  function generateVoteId() {
    voteCounter++;
    return 'vote_' + voteCounter + '_' + Date.now().toString(36);
  }

  function generateEffectId() {
    effectCounter++;
    return 'effect_' + effectCounter + '_' + Date.now().toString(36);
  }

  function getConsequenceType(typeId) {
    for (var i = 0; i < CONSEQUENCE_TYPES.length; i++) {
      if (CONSEQUENCE_TYPES[i].id === typeId) {
        return CONSEQUENCE_TYPES[i];
      }
    }
    return null;
  }

  function ensureStateFields(state) {
    if (!state.votes) state.votes = [];
    if (!state.activeEffects) state.activeEffects = [];
    if (!state.voteLedger) state.voteLedger = [];
    if (!state.zoneCooldowns) state.zoneCooldowns = {};
    return state;
  }

  // ---------------------------------------------------------------------------
  // createVoteState — create fresh state for event consequences
  // ---------------------------------------------------------------------------
  function createVoteState() {
    return {
      votes: [],
      activeEffects: [],
      voteLedger: [],
      zoneCooldowns: {}
    };
  }

  // ---------------------------------------------------------------------------
  // proposeVote(state, proposerId, consequenceTypeId, zone, currentTick)
  // ---------------------------------------------------------------------------
  function proposeVote(state, proposerId, consequenceTypeId, zone, currentTick) {
    ensureStateFields(state);

    var ctype = getConsequenceType(consequenceTypeId);
    if (!ctype) {
      return {success: false, vote: null, reason: 'Unknown consequence type: ' + consequenceTypeId};
    }

    // Check cooldown
    var cooldownKey = consequenceTypeId + '_' + (zone || 'global');
    var lastClose = state.zoneCooldowns[cooldownKey];
    if (lastClose !== undefined && currentTick < lastClose + ctype.cooldown) {
      var remaining = (lastClose + ctype.cooldown) - currentTick;
      return {success: false, vote: null, reason: 'Cooldown active. ' + remaining + ' ticks remaining'};
    }

    // Check for already open vote of same type in same zone
    for (var i = 0; i < state.votes.length; i++) {
      var v = state.votes[i];
      if (v.consequenceType === consequenceTypeId && v.zone === zone && v.status === 'open') {
        return {success: false, vote: null, reason: 'A vote of this type is already open in this zone'};
      }
    }

    // Build options with empty votes
    var options = [];
    for (var j = 0; j < ctype.options.length; j++) {
      var opt = ctype.options[j];
      options.push({
        id: opt.id,
        label: opt.label,
        effect: opt.effect,
        votes: 0,
        voters: []
      });
    }

    var vote = {
      id: generateVoteId(),
      consequenceType: consequenceTypeId,
      zone: zone,
      status: 'open',
      options: options,
      openedAt: currentTick,
      closesAt: currentTick + 500,
      appliedAt: null,
      result: null,
      effects: [],
      proposerId: proposerId
    };

    state.votes.push(vote);

    // Log to ledger
    state.voteLedger.push({
      tick: currentTick,
      event: 'vote_proposed',
      voteId: vote.id,
      consequenceType: consequenceTypeId,
      zone: zone,
      proposerId: proposerId
    });

    return {success: true, vote: vote, reason: null};
  }

  // ---------------------------------------------------------------------------
  // castVote(state, playerId, voteId, optionId)
  // ---------------------------------------------------------------------------
  function castVote(state, playerId, voteId, optionId) {
    ensureStateFields(state);

    var vote = getVoteById(state, voteId);
    if (!vote) {
      return {success: false, reason: 'Vote not found: ' + voteId};
    }

    if (vote.status !== 'open') {
      return {success: false, reason: 'Vote is not open. Status: ' + vote.status};
    }

    // Check player hasn't voted
    if (!canVote(state, playerId, voteId)) {
      return {success: false, reason: 'Player has already voted in this vote'};
    }

    // Find option
    var targetOption = null;
    for (var i = 0; i < vote.options.length; i++) {
      if (vote.options[i].id === optionId) {
        targetOption = vote.options[i];
        break;
      }
    }

    if (!targetOption) {
      return {success: false, reason: 'Option not found: ' + optionId};
    }

    targetOption.votes++;
    targetOption.voters.push(playerId);

    return {success: true, vote: vote, option: targetOption};
  }

  // ---------------------------------------------------------------------------
  // closeVoting(state, voteId, currentTick)
  // ---------------------------------------------------------------------------
  function closeVoting(state, voteId, currentTick) {
    ensureStateFields(state);

    var vote = getVoteById(state, voteId);
    if (!vote) {
      return {success: false, reason: 'Vote not found: ' + voteId};
    }

    if (vote.status !== 'open') {
      return {success: false, reason: 'Vote is not open. Status: ' + vote.status};
    }

    // Tally votes and find winner
    var maxVotes = -1;
    var winner = null;
    var totalVotes = 0;

    for (var i = 0; i < vote.options.length; i++) {
      totalVotes += vote.options[i].votes;
      if (vote.options[i].votes > maxVotes) {
        maxVotes = vote.options[i].votes;
        winner = vote.options[i];
      }
    }

    // If no votes cast, pick first option as default
    if (totalVotes === 0 && vote.options.length > 0) {
      winner = vote.options[0];
    }

    vote.status = 'closed';
    vote.result = winner ? winner.id : null;
    vote.appliedAt = currentTick;

    // Get consequence type to determine duration
    var ctype = getConsequenceType(vote.consequenceType);
    var duration = ctype ? ctype.duration : 500;

    // Apply effects
    var appliedEffects = [];
    if (winner && winner.effect) {
      var effectKeys = Object.keys(winner.effect);
      for (var k = 0; k < effectKeys.length; k++) {
        var effectType = effectKeys[k];
        var effectValue = winner.effect[effectType];
        var effect = {
          id: generateEffectId(),
          voteId: voteId,
          type: effectType,
          value: effectValue,
          zone: vote.zone,
          startTick: currentTick,
          endTick: currentTick + duration,
          description: winner.label + ' effect: ' + effectType + ' = ' + effectValue
        };
        state.activeEffects.push(effect);
        vote.effects.push(effect.id);
        appliedEffects.push(effect);
      }
    }

    // Set cooldown
    if (ctype) {
      var cooldownKey = vote.consequenceType + '_' + (vote.zone || 'global');
      state.zoneCooldowns[cooldownKey] = currentTick;
    }

    // Apply cascades
    var cascadeResult = applyCascades(state, voteId, currentTick);

    // Log to ledger
    state.voteLedger.push({
      tick: currentTick,
      event: 'vote_closed',
      voteId: voteId,
      result: vote.result,
      totalVotes: totalVotes,
      effects: appliedEffects.length
    });

    return {
      success: true,
      result: winner,
      effects: appliedEffects,
      cascades: cascadeResult.cascades,
      totalVotes: totalVotes
    };
  }

  // ---------------------------------------------------------------------------
  // applyCascades(state, voteId, currentTick)
  // ---------------------------------------------------------------------------
  function applyCascades(state, voteId, currentTick) {
    ensureStateFields(state);

    var vote = getVoteById(state, voteId);
    if (!vote || !vote.result) {
      return {cascades: []};
    }

    var cascadesApplied = [];

    for (var i = 0; i < CASCADE_RULES.length; i++) {
      var rule = CASCADE_RULES[i];
      if (rule.trigger.type === vote.consequenceType && rule.trigger.option === vote.result) {
        var cascadeZone = rule.cascade.zone === 'global' ? 'global' : (rule.cascade.zone || vote.zone);
        var cascadeStartTick = currentTick + (rule.cascade.delay || 0);
        var cascadeEndTick = cascadeStartTick + 500; // default cascade duration

        var effectValue = rule.cascade.multiplier !== undefined ? rule.cascade.multiplier : (rule.cascade.modifier || 0);

        var cascadeEffect = {
          id: generateEffectId(),
          voteId: voteId,
          type: rule.cascade.type,
          value: effectValue,
          zone: cascadeZone,
          startTick: cascadeStartTick,
          endTick: cascadeEndTick,
          description: rule.description,
          isCascade: true
        };

        state.activeEffects.push(cascadeEffect);
        cascadesApplied.push({
          description: rule.description,
          effect: cascadeEffect
        });
      }
    }

    if (cascadesApplied.length > 0) {
      state.voteLedger.push({
        tick: currentTick,
        event: 'cascades_applied',
        voteId: voteId,
        count: cascadesApplied.length
      });
    }

    return {cascades: cascadesApplied};
  }

  // ---------------------------------------------------------------------------
  // getActiveEffects(state, zone, currentTick)
  // ---------------------------------------------------------------------------
  function getActiveEffects(state, zone, currentTick) {
    ensureStateFields(state);
    var results = [];
    for (var i = 0; i < state.activeEffects.length; i++) {
      var eff = state.activeEffects[i];
      if (eff.startTick <= currentTick && eff.endTick > currentTick) {
        if (eff.zone === zone || eff.zone === 'global' || zone === null) {
          results.push(eff);
        }
      }
    }
    return results;
  }

  // ---------------------------------------------------------------------------
  // getEffectValue(state, zone, effectType, currentTick)
  // ---------------------------------------------------------------------------
  function getEffectValue(state, zone, effectType, currentTick) {
    ensureStateFields(state);
    var total = 0;
    var activeEffects = getActiveEffects(state, zone, currentTick);
    for (var i = 0; i < activeEffects.length; i++) {
      if (activeEffects[i].type === effectType) {
        total += activeEffects[i].value;
      }
    }
    return total;
  }

  // ---------------------------------------------------------------------------
  // expireEffects(state, currentTick)
  // ---------------------------------------------------------------------------
  function expireEffects(state, currentTick) {
    ensureStateFields(state);
    var remaining = [];
    var expired = [];
    for (var i = 0; i < state.activeEffects.length; i++) {
      var eff = state.activeEffects[i];
      if (eff.endTick <= currentTick) {
        expired.push(eff);
      } else {
        remaining.push(eff);
      }
    }
    state.activeEffects = remaining;

    // Also expire open votes past their close time
    for (var j = 0; j < state.votes.length; j++) {
      var vote = state.votes[j];
      if (vote.status === 'open' && vote.closesAt <= currentTick) {
        vote.status = 'expired';
        state.voteLedger.push({
          tick: currentTick,
          event: 'vote_expired',
          voteId: vote.id
        });
      }
    }

    return {expired: expired, remaining: remaining.length};
  }

  // ---------------------------------------------------------------------------
  // getOpenVotes(state, zone)
  // ---------------------------------------------------------------------------
  function getOpenVotes(state, zone) {
    ensureStateFields(state);
    var results = [];
    for (var i = 0; i < state.votes.length; i++) {
      var vote = state.votes[i];
      if (vote.status === 'open') {
        if (zone === undefined || zone === null || vote.zone === zone) {
          results.push(vote);
        }
      }
    }
    return results;
  }

  // ---------------------------------------------------------------------------
  // getVoteById(state, voteId)
  // ---------------------------------------------------------------------------
  function getVoteById(state, voteId) {
    ensureStateFields(state);
    for (var i = 0; i < state.votes.length; i++) {
      if (state.votes[i].id === voteId) {
        return state.votes[i];
      }
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // getVoteHistory(state, zone, count)
  // ---------------------------------------------------------------------------
  function getVoteHistory(state, zone, count) {
    ensureStateFields(state);
    var results = [];
    for (var i = 0; i < state.votes.length; i++) {
      var vote = state.votes[i];
      if (vote.status !== 'open') {
        if (zone === undefined || zone === null || vote.zone === zone) {
          results.push(vote);
        }
      }
    }
    // Sort by most recent first (openedAt descending)
    results.sort(function(a, b) { return b.openedAt - a.openedAt; });
    if (count !== undefined && count > 0) {
      results = results.slice(0, count);
    }
    return results;
  }

  // ---------------------------------------------------------------------------
  // getPlayerVotes(state, playerId)
  // ---------------------------------------------------------------------------
  function getPlayerVotes(state, playerId) {
    ensureStateFields(state);
    var results = [];
    for (var i = 0; i < state.votes.length; i++) {
      var vote = state.votes[i];
      // Check if player proposed it
      if (vote.proposerId === playerId) {
        results.push({vote: vote, role: 'proposer', optionVoted: null});
        continue;
      }
      // Check if player voted in it
      for (var j = 0; j < vote.options.length; j++) {
        var opt = vote.options[j];
        if (opt.voters.indexOf(playerId) !== -1) {
          results.push({vote: vote, role: 'voter', optionVoted: opt.id});
          break;
        }
      }
    }
    return results;
  }

  // ---------------------------------------------------------------------------
  // getConsequenceTypes()
  // ---------------------------------------------------------------------------
  function getConsequenceTypes() {
    return CONSEQUENCE_TYPES;
  }

  // ---------------------------------------------------------------------------
  // getCascadeRules()
  // ---------------------------------------------------------------------------
  function getCascadeRules() {
    return CASCADE_RULES;
  }

  // ---------------------------------------------------------------------------
  // getVoteLedger(state, fromTick, toTick)
  // ---------------------------------------------------------------------------
  function getVoteLedger(state, fromTick, toTick) {
    ensureStateFields(state);
    var results = [];
    for (var i = 0; i < state.voteLedger.length; i++) {
      var entry = state.voteLedger[i];
      var tick = entry.tick;
      if (fromTick !== undefined && tick < fromTick) continue;
      if (toTick !== undefined && tick > toTick) continue;
      results.push(entry);
    }
    return results;
  }

  // ---------------------------------------------------------------------------
  // getZoneEffectSummary(state, zone, currentTick)
  // ---------------------------------------------------------------------------
  function getZoneEffectSummary(state, zone, currentTick) {
    ensureStateFields(state);
    var activeEffects = getActiveEffects(state, zone, currentTick);
    var summary = {
      zone: zone,
      tick: currentTick,
      totalEffects: activeEffects.length,
      effectsByType: {},
      totalValue: 0
    };

    for (var i = 0; i < activeEffects.length; i++) {
      var eff = activeEffects[i];
      if (!summary.effectsByType[eff.type]) {
        summary.effectsByType[eff.type] = {count: 0, totalValue: 0, effects: []};
      }
      summary.effectsByType[eff.type].count++;
      summary.effectsByType[eff.type].totalValue += eff.value;
      summary.effectsByType[eff.type].effects.push(eff.id);
      summary.totalValue += eff.value;
    }

    return summary;
  }

  // ---------------------------------------------------------------------------
  // getWorldPolicy(state, currentTick)
  // ---------------------------------------------------------------------------
  function getWorldPolicy(state, currentTick) {
    ensureStateFields(state);
    var policies = [];

    // Find closed world_policy votes and get their applied effects
    for (var i = 0; i < state.votes.length; i++) {
      var vote = state.votes[i];
      if (vote.consequenceType === 'world_policy' && vote.status === 'closed' && vote.result) {
        // Check if effects are still active
        var hasActiveEffect = false;
        for (var j = 0; j < vote.effects.length; j++) {
          var effectId = vote.effects[j];
          for (var k = 0; k < state.activeEffects.length; k++) {
            if (state.activeEffects[k].id === effectId &&
                state.activeEffects[k].startTick <= currentTick &&
                state.activeEffects[k].endTick > currentTick) {
              hasActiveEffect = true;
              break;
            }
          }
        }
        if (hasActiveEffect) {
          policies.push({
            voteId: vote.id,
            policy: vote.result,
            appliedAt: vote.appliedAt,
            zone: vote.zone
          });
        }
      }
    }

    return {
      activePolicies: policies,
      count: policies.length
    };
  }

  // ---------------------------------------------------------------------------
  // canVote(state, playerId, voteId)
  // ---------------------------------------------------------------------------
  function canVote(state, playerId, voteId) {
    ensureStateFields(state);
    var vote = getVoteById(state, voteId);
    if (!vote) return false;
    if (vote.status !== 'open') return false;

    for (var i = 0; i < vote.options.length; i++) {
      if (vote.options[i].voters.indexOf(playerId) !== -1) {
        return false;
      }
    }
    return true;
  }

  // ---------------------------------------------------------------------------
  // getVoteResults(state, voteId)
  // ---------------------------------------------------------------------------
  function getVoteResults(state, voteId) {
    ensureStateFields(state);
    var vote = getVoteById(state, voteId);
    if (!vote) {
      return null;
    }

    var totalVotes = 0;
    for (var i = 0; i < vote.options.length; i++) {
      totalVotes += vote.options[i].votes;
    }

    var optionResults = [];
    for (var j = 0; j < vote.options.length; j++) {
      var opt = vote.options[j];
      var pct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 10000) / 100 : 0;
      optionResults.push({
        id: opt.id,
        label: opt.label,
        votes: opt.votes,
        percentage: pct,
        voters: opt.voters.slice()
      });
    }

    return {
      voteId: voteId,
      status: vote.status,
      result: vote.result,
      totalVotes: totalVotes,
      options: optionResults,
      openedAt: vote.openedAt,
      closesAt: vote.closesAt,
      appliedAt: vote.appliedAt
    };
  }

  // ---------------------------------------------------------------------------
  // Exports
  // ---------------------------------------------------------------------------
  exports.CONSEQUENCE_TYPES = CONSEQUENCE_TYPES;
  exports.CASCADE_RULES = CASCADE_RULES;
  exports.createVoteState = createVoteState;
  exports.proposeVote = proposeVote;
  exports.castVote = castVote;
  exports.closeVoting = closeVoting;
  exports.applyCascades = applyCascades;
  exports.getActiveEffects = getActiveEffects;
  exports.getEffectValue = getEffectValue;
  exports.expireEffects = expireEffects;
  exports.getOpenVotes = getOpenVotes;
  exports.getVoteById = getVoteById;
  exports.getVoteHistory = getVoteHistory;
  exports.getPlayerVotes = getPlayerVotes;
  exports.getConsequenceTypes = getConsequenceTypes;
  exports.getCascadeRules = getCascadeRules;
  exports.getVoteLedger = getVoteLedger;
  exports.getZoneEffectSummary = getZoneEffectSummary;
  exports.getWorldPolicy = getWorldPolicy;
  exports.canVote = canVote;
  exports.getVoteResults = getVoteResults;

})(typeof module !== 'undefined' ? module.exports : (window.EventConsequences = {}));
