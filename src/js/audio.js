(function(exports) {
  // Procedural audio system using Web Audio API
  // All audio is generated procedurally - no external files

  var audioContext = null;
  var masterGain = null;
  var isMuted = false;
  var currentAmbient = null;
  var volumeLevels = { master: 0.5, music: 0.5, sfx: 0.5 };
  var activeNoiseSources = []; // Global tracker for all white noise sources

  /**
   * Initialize audio context
   * @returns {AudioContext|null}
   */
  function initAudio() {
    if (typeof AudioContext === 'undefined' && typeof webkitAudioContext === 'undefined') {
      console.warn('Web Audio API not available');
      return null;
    }

    // Defer AudioContext creation until first user gesture to avoid browser warnings
    var resumeEvents = ['click', 'touchstart', 'keydown'];
    function createOnGesture() {
      if (audioContext) return;
      try {
        audioContext = new (AudioContext || webkitAudioContext)();
        masterGain = audioContext.createGain();
        if (masterGain) {
          masterGain.connect(audioContext.destination);
          masterGain.gain.value = 0.15;
        }
        if (audioContext.state === 'suspended') {
          audioContext.resume();
        }
        console.log('Audio system initialized (after user gesture)');
      } catch (err) {
        console.error('Failed to initialize audio:', err);
      }
      resumeEvents.forEach(function(evt) {
        document.removeEventListener(evt, createOnGesture);
      });
    }
    resumeEvents.forEach(function(evt) {
      document.addEventListener(evt, createOnGesture, { once: false });
    });

    console.log('Audio system deferred until user gesture');
    return true;
  }

  /**
   * Create brown noise buffer (warm, natural 1/f² spectrum)
   * @returns {AudioBufferSourceNode|null}
   */
  function createWhiteNoise(maxDurationSec) {
    if (!audioContext) return null;

    try {
      const bufferSize = 2 * audioContext.sampleRate;
      const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      // Brown noise: integrate white noise for warm 1/f² rolloff
      var lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        var white = Math.random() * 2 - 1;
        lastOut = (lastOut + (0.02 * white)) / 1.02;
        output[i] = lastOut * 3.5; // normalize amplitude
      }

      const whiteNoise = audioContext.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;
      whiteNoise.start();

      // Track globally so we can kill orphans
      activeNoiseSources.push(whiteNoise);
      whiteNoise.onended = function() {
        var idx = activeNoiseSources.indexOf(whiteNoise);
        if (idx !== -1) activeNoiseSources.splice(idx, 1);
      };

      // Safety cutoff: auto-stop after maxDurationSec (default 60s)
      var safeDur = maxDurationSec || 60;
      setTimeout(function() {
        try { whiteNoise.stop(); } catch(e) {}
        try { whiteNoise.disconnect(); } catch(e) {}
      }, safeDur * 1000);

      return whiteNoise;
    } catch (err) {
      console.error('Error creating white noise:', err);
      return null;
    }
  }

  /**
   * Stop and disconnect all tracked noise sources (safety net for orphans)
   */
  function killAllNoiseSources() {
    for (var i = 0; i < activeNoiseSources.length; i++) {
      try { activeNoiseSources[i].stop(); } catch(e) {}
      try { activeNoiseSources[i].disconnect(); } catch(e) {}
    }
    activeNoiseSources = [];
  }

  /**
   * Play zone-specific ambient sound
   * @param {string} zone - Zone identifier
   */
  function playAmbient(zone) {
    if (!audioContext || !masterGain) return;

    // Resume context if needed
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    // Stop current ambient
    if (currentAmbient) {
      stopAmbient();
    }

    try {
      switch (zone) {
        case 'nexus':
          currentAmbient = playNexusAmbient();
          break;
        case 'gardens':
          currentAmbient = playGardensAmbient();
          break;
        case 'athenaeum':
          currentAmbient = playAthenaeumAmbient();
          break;
        case 'studio':
          currentAmbient = playStudioAmbient();
          break;
        case 'wilds':
          currentAmbient = playWildsAmbient();
          break;
        case 'agora':
          currentAmbient = playAgoraAmbient();
          break;
        case 'commons':
          currentAmbient = playCommonsAmbient();
          break;
        case 'arena':
          currentAmbient = playArenaAmbient();
          break;
        default:
          currentAmbient = null;
      }
    } catch (err) {
      console.error('Error playing ambient:', err);
    }
  }

  /**
   * Stop current ambient sound
   */
  function stopAmbient() {
    if (!currentAmbient) return;

    try {
      // Stop all oscillators
      if (currentAmbient.oscillators && Array.isArray(currentAmbient.oscillators)) {
        currentAmbient.oscillators.forEach(osc => {
          if (osc && osc.stop) {
            try { osc.stop(); } catch (e) {}
          }
        });
      }

      // Stop and disconnect all nodes
      if (currentAmbient.nodes && Array.isArray(currentAmbient.nodes)) {
        currentAmbient.nodes.forEach(node => {
          if (node) {
            if (node.stop) {
              try { node.stop(); } catch (e) {}
            }
            if (node.disconnect) {
              try { node.disconnect(); } catch (e) {}
            }
          }
        });
      }

      // Disconnect gain
      if (currentAmbient.gain && currentAmbient.gain.disconnect) {
        try { currentAmbient.gain.disconnect(); } catch (e) {}
      }

      // Clear all intervals
      if (currentAmbient.intervals && Array.isArray(currentAmbient.intervals)) {
        currentAmbient.intervals.forEach(id => clearInterval(id));
      }

      // Clear all timeouts
      if (currentAmbient.timeouts && Array.isArray(currentAmbient.timeouts)) {
        currentAmbient.timeouts.forEach(id => clearTimeout(id));
      }

      // Call cleanup function if exists
      if (currentAmbient.cleanup && typeof currentAmbient.cleanup === 'function') {
        currentAmbient.cleanup();
      }
    } catch (err) {
      console.error('Error stopping ambient:', err);
    }

    currentAmbient = null;
    killAllNoiseSources();
  }

  /**
   * NEXUS - Sacred gathering place
   * Deep drone + ethereal pad + crystalline chimes
   */
  function playNexusAmbient() {
    if (!audioContext || !masterGain) return null;

    const nodes = [];
    const oscillators = [];
    const timeouts = [];

    try {
      // Deep resonant drone - C2 (65Hz) with octave harmonics
      const drone1 = audioContext.createOscillator();
      const drone2 = audioContext.createOscillator();
      const droneGain = audioContext.createGain();

      drone1.type = 'sine';
      drone1.frequency.value = 65.41; // C2
      drone2.type = 'sine';
      drone2.frequency.value = 130.81; // C3

      droneGain.gain.value = 0.03;

      drone1.connect(droneGain);
      drone2.connect(droneGain);
      droneGain.connect(masterGain);

      drone1.start();
      drone2.start();

      oscillators.push(drone1, drone2);
      nodes.push(droneGain);

      // Ethereal pad - C4, E4, G4 triad with slow LFO
      const pad1 = audioContext.createOscillator();
      const pad2 = audioContext.createOscillator();
      const pad3 = audioContext.createOscillator();
      const lfo = audioContext.createOscillator();
      const lfoGain = audioContext.createGain();
      const padGain = audioContext.createGain();

      pad1.type = 'sine';
      pad1.frequency.value = 261.63; // C4
      pad2.type = 'sine';
      pad2.frequency.value = 329.63; // E4
      pad3.type = 'sine';
      pad3.frequency.value = 392.00; // G4

      lfo.type = 'sine';
      lfo.frequency.value = 0.2; // Slow modulation
      lfoGain.gain.value = 0.01; // Subtle volume modulation

      padGain.gain.value = 0.02;

      lfo.connect(lfoGain);
      lfoGain.connect(padGain.gain);

      pad1.connect(padGain);
      pad2.connect(padGain);
      pad3.connect(padGain);
      padGain.connect(masterGain);

      pad1.start();
      pad2.start();
      pad3.start();
      lfo.start();

      oscillators.push(pad1, pad2, pad3, lfo);
      nodes.push(lfoGain, padGain);

      // Crystalline chimes - random high notes with delays
      function playChime() {
        if (!audioContext || !masterGain) return;

        const chime = audioContext.createOscillator();
        const chimeGain = audioContext.createGain();
        const delay1 = audioContext.createDelay();
        const delay2 = audioContext.createDelay();
        const delayGain1 = audioContext.createGain();
        const delayGain2 = audioContext.createGain();

        chime.type = 'sine';
        chime.frequency.value = 400 + Math.random() * 400;

        chimeGain.gain.value = 0.015;
        chimeGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 2.5);

        delay1.delayTime.value = 0.4;
        delay2.delayTime.value = 0.7;
        delayGain1.gain.value = 0.1;
        delayGain2.gain.value = 0.06;

        chime.connect(chimeGain);
        chimeGain.connect(masterGain);
        chimeGain.connect(delay1);
        chimeGain.connect(delay2);
        delay1.connect(delayGain1);
        delay2.connect(delayGain2);
        delayGain1.connect(masterGain);
        delayGain2.connect(masterGain);

        chime.start();
        chime.stop(audioContext.currentTime + 2.5);

        const nextChime = setTimeout(playChime, 8000 + Math.random() * 12000);
        timeouts.push(nextChime);
      }

      const firstChime = setTimeout(playChime, 2000);
      timeouts.push(firstChime);

      return { oscillators, nodes, timeouts };
    } catch (err) {
      console.error('Error in nexus ambient:', err);
      return null;
    }
  }

  /**
   * GARDENS - Lush natural space
   * Bird chorus + gentle stream + breeze + crickets + rustling leaves
   */
  function playGardensAmbient() {
    if (!audioContext || !masterGain) return null;

    const nodes = [];
    const timeouts = [];
    const intervals = [];

    try {
      // Gentle stream - filtered white noise with LFO
      const stream = createWhiteNoise();
      if (stream) {
        const streamFilter = audioContext.createBiquadFilter();
        const streamLfo = audioContext.createOscillator();
        const streamLfoGain = audioContext.createGain();
        const streamGain = audioContext.createGain();

        streamFilter.type = 'lowpass';
        streamFilter.frequency.value = 400;

        streamLfo.type = 'sine';
        streamLfo.frequency.value = 0.5;
        streamLfoGain.gain.value = 100; // Modulate filter frequency

        streamGain.gain.value = 0.025;

        streamLfo.connect(streamLfoGain);
        streamLfoGain.connect(streamFilter.frequency);

        stream.connect(streamFilter);
        streamFilter.connect(streamGain);
        streamGain.connect(masterGain);

        streamLfo.start();

        nodes.push(stream, streamFilter, streamLfo, streamLfoGain, streamGain);
      }

      // Breeze - very low filtered noise
      const breeze = createWhiteNoise();
      if (breeze) {
        const breezeFilter = audioContext.createBiquadFilter();
        const breezeGain = audioContext.createGain();

        breezeFilter.type = 'lowpass';
        breezeFilter.frequency.value = 200;
        breezeGain.gain.value = 0.012;

        breeze.connect(breezeFilter);
        breezeFilter.connect(breezeGain);
        breezeGain.connect(masterGain);

        nodes.push(breeze, breezeFilter, breezeGain);
      }

      // Bird chorus - multiple chirp generators
      function chirp() {
        if (!audioContext || !masterGain) return;

        const bird = audioContext.createOscillator();
        const birdGain = audioContext.createGain();

        bird.type = 'sine';
        bird.frequency.value = 600 + Math.random() * 1200;

        const duration = 0.1 + Math.random() * 0.2;
        birdGain.gain.value = 0.06;
        birdGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

        bird.connect(birdGain);
        birdGain.connect(masterGain);

        bird.start();
        bird.stop(audioContext.currentTime + duration);

        const nextChirp = setTimeout(chirp, 500 + Math.random() * 3500);
        timeouts.push(nextChirp);
      }

      for (let i = 0; i < 3; i++) {
        const firstChirp = setTimeout(chirp, Math.random() * 2000);
        timeouts.push(firstChirp);
      }

      // Crickets - oscillating high frequency with AM
      const cricket = audioContext.createOscillator();
      const cricketAm = audioContext.createOscillator();
      const cricketAmGain = audioContext.createGain();
      const cricketGain = audioContext.createGain();

      cricket.type = 'sine';
      cricket.frequency.value = 4500;

      cricketAm.type = 'sine';
      cricketAm.frequency.value = 20; // 20 Hz modulation
      cricketAmGain.gain.value = 0.015;

      cricketGain.gain.value = 0.015;

      cricketAm.connect(cricketAmGain);
      cricketAmGain.connect(cricketGain.gain);

      cricket.connect(cricketGain);
      cricketGain.connect(masterGain);

      cricket.start();
      cricketAm.start();

      nodes.push(cricket, cricketAm, cricketAmGain, cricketGain);

      // Rustling leaves
      function rustle() {
        if (!audioContext || !masterGain) return;

        const noise = createWhiteNoise(2);
        if (noise) {
          const rustleFilter = audioContext.createBiquadFilter();
          const rustleGain = audioContext.createGain();

          rustleFilter.type = 'bandpass';
          rustleFilter.frequency.value = 2000;
          rustleFilter.Q.value = 2;

          rustleGain.gain.value = 0.04;
          rustleGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);

          noise.connect(rustleFilter);
          rustleFilter.connect(rustleGain);
          rustleGain.connect(masterGain);

          setTimeout(() => {
            try {
              if (noise.stop) noise.stop();
              if (rustleFilter.disconnect) rustleFilter.disconnect();
              if (rustleGain.disconnect) rustleGain.disconnect();
            } catch (e) {}
          }, 400);
        }

        const nextRustle = setTimeout(rustle, 2000 + Math.random() * 3000);
        timeouts.push(nextRustle);
      }

      const firstRustle = setTimeout(rustle, 1000);
      timeouts.push(firstRustle);

      return { nodes, timeouts, intervals };
    } catch (err) {
      console.error('Error in gardens ambient:', err);
      return null;
    }
  }

  /**
   * ATHENAEUM - Library/knowledge hall
   * Deep silence + page turning + quill writing + distant footsteps + clock ticking
   */
  function playAthenaeumAmbient() {
    if (!audioContext || !masterGain) return null;

    const nodes = [];
    const timeouts = [];
    const intervals = [];

    try {
      // Room tone - very quiet
      const roomTone = createWhiteNoise();
      if (roomTone) {
        const roomGain = audioContext.createGain();
        roomGain.gain.value = 0.01;

        roomTone.connect(roomGain);
        roomGain.connect(masterGain);

        nodes.push(roomTone, roomGain);
      }

      // Page turning
      function turnPage() {
        if (!audioContext || !masterGain) return;

        const page = createWhiteNoise(2);
        if (page) {
          const pageFilter = audioContext.createBiquadFilter();
          const pageGain = audioContext.createGain();

          pageFilter.type = 'highpass';
          pageFilter.frequency.value = 2000;

          pageGain.gain.value = 0.03;
          pageGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);

          page.connect(pageFilter);
          pageFilter.connect(pageGain);
          pageGain.connect(masterGain);

          setTimeout(() => {
            try {
              if (page.stop) page.stop();
              if (pageFilter.disconnect) pageFilter.disconnect();
              if (pageGain.disconnect) pageGain.disconnect();
            } catch (e) {}
          }, 150);
        }

        const nextPage = setTimeout(turnPage, 8000 + Math.random() * 7000);
        timeouts.push(nextPage);
      }

      const firstPage = setTimeout(turnPage, 3000);
      timeouts.push(firstPage);

      // Quill writing - intermittent
      function writeQuill() {
        if (!audioContext || !masterGain) return;

        const quill = createWhiteNoise(2);
        if (quill) {
          const quillFilter = audioContext.createBiquadFilter();
          const quillGain = audioContext.createGain();

          quillFilter.type = 'bandpass';
          quillFilter.frequency.value = 3000;
          quillFilter.Q.value = 5;

          quillGain.gain.value = 0.05;

          quill.connect(quillFilter);
          quillFilter.connect(quillGain);
          quillGain.connect(masterGain);

          setTimeout(() => {
            try {
              if (quill.stop) quill.stop();
              if (quillFilter.disconnect) quillFilter.disconnect();
              if (quillGain.disconnect) quillGain.disconnect();
            } catch (e) {}
          }, 200 + Math.random() * 500);
        }

        const nextQuill = setTimeout(writeQuill, 5000 + Math.random() * 10000);
        timeouts.push(nextQuill);
      }

      const firstQuill = setTimeout(writeQuill, 5000);
      timeouts.push(firstQuill);

      // Distant footsteps
      function footstep() {
        if (!audioContext || !masterGain) return;

        const step = audioContext.createOscillator();
        const stepGain = audioContext.createGain();

        step.type = 'sine';
        step.frequency.value = 60;

        stepGain.gain.value = 0.03;
        stepGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.05);

        step.connect(stepGain);
        stepGain.connect(masterGain);

        step.start();
        step.stop(audioContext.currentTime + 0.05);

        const nextStep = setTimeout(footstep, 5000 + Math.random() * 5000);
        timeouts.push(nextStep);
      }

      const firstStep = setTimeout(footstep, 2000);
      timeouts.push(firstStep);

      // Clock ticking
      function tick() {
        if (!audioContext || !masterGain) return;

        const click = audioContext.createOscillator();
        const clickGain = audioContext.createGain();

        click.type = 'sine';
        click.frequency.value = 800;

        clickGain.gain.value = 0.02;
        clickGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.02);

        click.connect(clickGain);
        clickGain.connect(masterGain);

        click.start();
        click.stop(audioContext.currentTime + 0.02);
      }

      const tickInterval = setInterval(tick, 1000);
      intervals.push(tickInterval);

      return { nodes, timeouts, intervals };
    } catch (err) {
      console.error('Error in athenaeum ambient:', err);
      return null;
    }
  }

  /**
   * STUDIO - Creative workshop
   * Rhythmic tapping + metallic chimes + creative hum + melodic phrases
   */
  function playStudioAmbient() {
    if (!audioContext || !masterGain) return null;

    const nodes = [];
    const oscillators = [];
    const timeouts = [];
    const intervals = [];

    try {
      // Creative energy hum - 110Hz with modulation
      const hum = audioContext.createOscillator();
      const humLfo = audioContext.createOscillator();
      const humLfoGain = audioContext.createGain();
      const humGain = audioContext.createGain();

      hum.type = 'sine';
      hum.frequency.value = 110;

      humLfo.type = 'sine';
      humLfo.frequency.value = 0.3;
      humLfoGain.gain.value = 2;

      humGain.gain.value = 0.03;

      humLfo.connect(humLfoGain);
      humLfoGain.connect(hum.frequency);

      hum.connect(humGain);
      humGain.connect(masterGain);

      hum.start();
      humLfo.start();

      oscillators.push(hum, humLfo);
      nodes.push(humLfoGain, humGain);

      // Rhythmic tapping
      function tap() {
        if (!audioContext || !masterGain) return;

        const thud = audioContext.createOscillator();
        const thudGain = audioContext.createGain();

        thud.type = 'sine';
        thud.frequency.value = 100 + Math.random() * 200;

        thudGain.gain.value = 0.05;
        thudGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.08);

        thud.connect(thudGain);
        thudGain.connect(masterGain);

        thud.start();
        thud.stop(audioContext.currentTime + 0.08);

        const nextTap = setTimeout(tap, 500 + Math.random() * 1500);
        timeouts.push(nextTap);
      }

      const firstTap = setTimeout(tap, 500);
      timeouts.push(firstTap);

      // Metallic chimes
      function chime() {
        if (!audioContext || !masterGain) return;

        const bell = audioContext.createOscillator();
        const bellGain = audioContext.createGain();

        bell.type = 'triangle';
        bell.frequency.value = 500 + Math.random() * 700;

        bellGain.gain.value = 0.04;
        bellGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1.2);

        bell.connect(bellGain);
        bellGain.connect(masterGain);

        bell.start();
        bell.stop(audioContext.currentTime + 1.2);

        const nextChime = setTimeout(chime, 3000 + Math.random() * 5000);
        timeouts.push(nextChime);
      }

      const firstChime = setTimeout(chime, 2000);
      timeouts.push(firstChime);

      // Melodic phrases
      function melody() {
        if (!audioContext || !masterGain) return;

        const notes = [261.63, 293.66, 329.63, 392.00, 440.00]; // C, D, E, G, A
        const numNotes = 3 + Math.floor(Math.random() * 3);

        for (let i = 0; i < numNotes; i++) {
          const note = audioContext.createOscillator();
          const noteGain = audioContext.createGain();

          note.type = 'sine';
          note.frequency.value = notes[Math.floor(Math.random() * notes.length)];

          const startTime = audioContext.currentTime + i * 0.2;
          noteGain.gain.setValueAtTime(0, startTime);
          noteGain.gain.linearRampToValueAtTime(0.03, startTime + 0.05);
          noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

          note.connect(noteGain);
          noteGain.connect(masterGain);

          note.start(startTime);
          note.stop(startTime + 0.4);
        }

        const nextMelody = setTimeout(melody, 15000 + Math.random() * 15000);
        timeouts.push(nextMelody);
      }

      const firstMelody = setTimeout(melody, 10000);
      timeouts.push(firstMelody);

      return { oscillators, nodes, timeouts, intervals };
    } catch (err) {
      console.error('Error in studio ambient:', err);
      return null;
    }
  }

  /**
   * WILDS - Untamed wilderness
   * Heavy wind + wolf howls + thunder + rustling + owl hoots
   */
  function playWildsAmbient() {
    if (!audioContext || !masterGain) return null;

    const nodes = [];
    const timeouts = [];
    const intervals = [];

    try {
      // Heavy wind with varying intensity
      const wind = createWhiteNoise();
      if (wind) {
        const windFilter = audioContext.createBiquadFilter();
        const windGain = audioContext.createGain();

        windFilter.type = 'lowpass';
        windFilter.frequency.value = 150;
        windGain.gain.value = 0.05;

        wind.connect(windFilter);
        windFilter.connect(windGain);
        windGain.connect(masterGain);

        nodes.push(wind, windFilter, windGain);

        // Vary wind intensity
        function varyWind() {
          if (!windGain || !audioContext) return;
          const target = 0.05 + Math.random() * 0.06;
          windGain.gain.linearRampToValueAtTime(target, audioContext.currentTime + 3);
        }

        const windInterval = setInterval(varyWind, 4000);
        intervals.push(windInterval);
      }

      // Wolf howls
      function howl() {
        if (!audioContext || !masterGain) return;

        const wolf = audioContext.createOscillator();
        const wolfVibrato = audioContext.createOscillator();
        const wolfVibratoGain = audioContext.createGain();
        const wolfGain = audioContext.createGain();

        wolf.type = 'sine';
        wolf.frequency.value = 400;

        wolfVibrato.type = 'sine';
        wolfVibrato.frequency.value = 5;
        wolfVibratoGain.gain.value = 15;

        wolfGain.gain.value = 0.04;

        wolfVibrato.connect(wolfVibratoGain);
        wolfVibratoGain.connect(wolf.frequency);

        wolf.connect(wolfGain);
        wolfGain.connect(masterGain);

        wolf.start();
        wolfVibrato.start();

        wolf.frequency.linearRampToValueAtTime(600, audioContext.currentTime + 1);
        wolf.frequency.linearRampToValueAtTime(400, audioContext.currentTime + 2);
        wolfGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 2.5);

        wolf.stop(audioContext.currentTime + 2.5);
        wolfVibrato.stop(audioContext.currentTime + 2.5);

        const nextHowl = setTimeout(howl, 20000 + Math.random() * 20000);
        timeouts.push(nextHowl);
      }

      const firstHowl = setTimeout(howl, 5000);
      timeouts.push(firstHowl);

      // Thunder rumble
      function thunder() {
        if (!audioContext || !masterGain) return;

        const rumble = createWhiteNoise(2);
        if (rumble) {
          const rumbleFilter = audioContext.createBiquadFilter();
          const rumbleGain = audioContext.createGain();

          rumbleFilter.type = 'lowpass';
          rumbleFilter.frequency.value = 60;

          rumbleGain.gain.value = 0.04;
          rumbleGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 2);

          rumble.connect(rumbleFilter);
          rumbleFilter.connect(rumbleGain);
          rumbleGain.connect(masterGain);

          setTimeout(() => {
            try {
              if (rumble.stop) rumble.stop();
              if (rumbleFilter.disconnect) rumbleFilter.disconnect();
              if (rumbleGain.disconnect) rumbleGain.disconnect();
            } catch (e) {}
          }, 2500);
        }

        const nextThunder = setTimeout(thunder, 30000 + Math.random() * 30000);
        timeouts.push(nextThunder);
      }

      const firstThunder = setTimeout(thunder, 15000);
      timeouts.push(firstThunder);

      // Rustling underbrush
      function rustle() {
        if (!audioContext || !masterGain) return;

        const brush = createWhiteNoise(2);
        if (brush) {
          const brushFilter = audioContext.createBiquadFilter();
          const brushGain = audioContext.createGain();

          brushFilter.type = 'bandpass';
          brushFilter.frequency.value = 1000;
          brushFilter.Q.value = 2;

          brushGain.gain.value = 0.05;
          brushGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);

          brush.connect(brushFilter);
          brushFilter.connect(brushGain);
          brushGain.connect(masterGain);

          setTimeout(() => {
            try {
              if (brush.stop) brush.stop();
              if (brushFilter.disconnect) brushFilter.disconnect();
              if (brushGain.disconnect) brushGain.disconnect();
            } catch (e) {}
          }, 400);
        }

        const nextRustle = setTimeout(rustle, 3000 + Math.random() * 4000);
        timeouts.push(nextRustle);
      }

      const firstRustle = setTimeout(rustle, 2000);
      timeouts.push(firstRustle);

      // Owl hoots
      function hoot() {
        if (!audioContext || !masterGain) return;

        // Two-tone hoot
        const hoot1 = audioContext.createOscillator();
        const hoot1Gain = audioContext.createGain();

        hoot1.type = 'sine';
        hoot1.frequency.value = 350;

        hoot1Gain.gain.value = 0.04;
        hoot1Gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);

        hoot1.connect(hoot1Gain);
        hoot1Gain.connect(masterGain);

        hoot1.start();
        hoot1.stop(audioContext.currentTime + 0.3);

        // Second hoot
        const hoot2 = audioContext.createOscillator();
        const hoot2Gain = audioContext.createGain();

        hoot2.type = 'sine';
        hoot2.frequency.value = 280;

        hoot2Gain.gain.setValueAtTime(0, audioContext.currentTime + 0.35);
        hoot2Gain.gain.linearRampToValueAtTime(0.04, audioContext.currentTime + 0.4);
        hoot2Gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.7);

        hoot2.connect(hoot2Gain);
        hoot2Gain.connect(masterGain);

        hoot2.start(audioContext.currentTime + 0.35);
        hoot2.stop(audioContext.currentTime + 0.7);

        const nextHoot = setTimeout(hoot, 15000 + Math.random() * 10000);
        timeouts.push(nextHoot);
      }

      const firstHoot = setTimeout(hoot, 8000);
      timeouts.push(firstHoot);

      return { nodes, timeouts, intervals };
    } catch (err) {
      console.error('Error in wilds ambient:', err);
      return null;
    }
  }

  /**
   * AGORA - Marketplace
   * Crowd murmur + vendor calls + coin sounds + cart wheels
   */
  function playAgoraAmbient() {
    if (!audioContext || !masterGain) return null;

    const nodes = [];
    const timeouts = [];
    const intervals = [];

    try {
      // Crowd murmur - bandpass filtered noise with modulation
      const crowd = createWhiteNoise();
      if (crowd) {
        const crowdFilter = audioContext.createBiquadFilter();
        const crowdLfo = audioContext.createOscillator();
        const crowdLfoGain = audioContext.createGain();
        const crowdGain = audioContext.createGain();

        crowdFilter.type = 'bandpass';
        crowdFilter.frequency.value = 500;
        crowdFilter.Q.value = 1;

        crowdLfo.type = 'sine';
        crowdLfo.frequency.value = 0.4;
        crowdLfoGain.gain.value = 0.02;

        crowdGain.gain.value = 0.03;

        crowdLfo.connect(crowdLfoGain);
        crowdLfoGain.connect(crowdGain.gain);

        crowd.connect(crowdFilter);
        crowdFilter.connect(crowdGain);
        crowdGain.connect(masterGain);

        crowdLfo.start();

        nodes.push(crowd, crowdFilter, crowdLfo, crowdLfoGain, crowdGain);
      }

      // Vendor calls - short melodic phrases
      function vendorCall() {
        if (!audioContext || !masterGain) return;

        const notes = [220, 247, 262, 294, 330, 349, 392, 440, 494];
        const numNotes = 2 + Math.floor(Math.random() * 2);

        for (let i = 0; i < numNotes; i++) {
          const call = audioContext.createOscillator();
          const callGain = audioContext.createGain();

          call.type = 'sine';
          call.frequency.value = notes[Math.floor(Math.random() * notes.length)];

          const startTime = audioContext.currentTime + i * 0.15;
          callGain.gain.setValueAtTime(0, startTime);
          callGain.gain.linearRampToValueAtTime(0.04, startTime + 0.05);
          callGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

          call.connect(callGain);
          callGain.connect(masterGain);

          call.start(startTime);
          call.stop(startTime + 0.25);
        }

        const nextCall = setTimeout(vendorCall, 8000 + Math.random() * 7000);
        timeouts.push(nextCall);
      }

      const firstCall = setTimeout(vendorCall, 3000);
      timeouts.push(firstCall);

      // Coin sounds
      function coinDrop() {
        if (!audioContext || !masterGain) return;

        const coin = audioContext.createOscillator();
        const coinGain = audioContext.createGain();

        coin.type = 'triangle';
        coin.frequency.value = 2000 + Math.random() * 1000;

        coinGain.gain.value = 0.03;
        coinGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15);

        coin.connect(coinGain);
        coinGain.connect(masterGain);

        coin.start();
        coin.stop(audioContext.currentTime + 0.15);

        const nextCoin = setTimeout(coinDrop, 3000 + Math.random() * 5000);
        timeouts.push(nextCoin);
      }

      const firstCoin = setTimeout(coinDrop, 2000);
      timeouts.push(firstCoin);

      // Cart wheels rumbling
      function cartRumble() {
        if (!audioContext || !masterGain) return;

        const cart = createWhiteNoise(2);
        if (cart) {
          const cartFilter = audioContext.createBiquadFilter();
          const cartGain = audioContext.createGain();

          cartFilter.type = 'lowpass';
          cartFilter.frequency.value = 80;

          cartGain.gain.value = 0.04;
          cartGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 2);

          cart.connect(cartFilter);
          cartFilter.connect(cartGain);
          cartGain.connect(masterGain);

          setTimeout(() => {
            try {
              if (cart.stop) cart.stop();
              if (cartFilter.disconnect) cartFilter.disconnect();
              if (cartGain.disconnect) cartGain.disconnect();
            } catch (e) {}
          }, 2500);
        }

        const nextCart = setTimeout(cartRumble, 15000 + Math.random() * 15000);
        timeouts.push(nextCart);
      }

      const firstCart = setTimeout(cartRumble, 5000);
      timeouts.push(firstCart);

      return { nodes, timeouts, intervals };
    } catch (err) {
      console.error('Error in agora ambient:', err);
      return null;
    }
  }

  /**
   * COMMONS - Building/community area
   * Hammering + sawing + chatter + fire crackling
   */
  function playCommonsAmbient() {
    if (!audioContext || !masterGain) return null;

    const nodes = [];
    const timeouts = [];
    const intervals = [];

    try {
      // Friendly chatter
      const chatter = createWhiteNoise();
      if (chatter) {
        const chatterFilter = audioContext.createBiquadFilter();
        const chatterGain = audioContext.createGain();

        chatterFilter.type = 'bandpass';
        chatterFilter.frequency.value = 450;
        chatterFilter.Q.value = 1.5;

        chatterGain.gain.value = 0.018;

        chatter.connect(chatterFilter);
        chatterFilter.connect(chatterGain);
        chatterGain.connect(masterGain);

        nodes.push(chatter, chatterFilter, chatterGain);
      }

      // Fire crackling - continuous random bursts
      function crackle() {
        if (!audioContext || !masterGain) return;

        const fire = createWhiteNoise(2);
        if (fire) {
          const fireFilter = audioContext.createBiquadFilter();
          const fireGain = audioContext.createGain();

          fireFilter.type = 'bandpass';
          fireFilter.frequency.value = 1500 + Math.random() * 1500;
          fireFilter.Q.value = 3;

          const gain = 0.01 + Math.random() * 0.02;
          fireGain.gain.value = gain;
          fireGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);

          fire.connect(fireFilter);
          fireFilter.connect(fireGain);
          fireGain.connect(masterGain);

          setTimeout(() => {
            try {
              if (fire.stop) fire.stop();
              if (fireFilter.disconnect) fireFilter.disconnect();
              if (fireGain.disconnect) fireGain.disconnect();
            } catch (e) {}
          }, 150);
        }

        const nextCrackle = setTimeout(crackle, 100 + Math.random() * 300);
        timeouts.push(nextCrackle);
      }

      const firstCrackle = setTimeout(crackle, 500);
      timeouts.push(firstCrackle);

      // Hammering - rhythmic with pauses
      let hammerActive = true;
      function hammer() {
        if (!audioContext || !masterGain || !hammerActive) return;

        const thunk = audioContext.createOscillator();
        const thunkGain = audioContext.createGain();

        thunk.type = 'square';
        thunk.frequency.value = 80;

        thunkGain.gain.value = 0.06;
        thunkGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);

        thunk.connect(thunkGain);
        thunkGain.connect(masterGain);

        thunk.start();
        thunk.stop(audioContext.currentTime + 0.1);

        const nextHammer = setTimeout(hammer, 800 + Math.random() * 400);
        timeouts.push(nextHammer);
      }

      function toggleHammer() {
        hammerActive = !hammerActive;
        if (hammerActive) {
          hammer();
        }
      }

      const firstHammer = setTimeout(hammer, 1000);
      timeouts.push(firstHammer);

      const hammerToggle = setInterval(toggleHammer, 8000);
      intervals.push(hammerToggle);

      // Sawing - filtered noise sweep
      let sawActive = false;
      function saw() {
        if (!audioContext || !masterGain || !sawActive) return;

        const sawNoise = createWhiteNoise(2);
        if (sawNoise) {
          const sawFilter = audioContext.createBiquadFilter();
          const sawGain = audioContext.createGain();

          sawFilter.type = 'bandpass';
          sawFilter.frequency.value = 400;
          sawFilter.Q.value = 5;

          sawGain.gain.value = 0.04;

          sawNoise.connect(sawFilter);
          sawFilter.connect(sawGain);
          sawGain.connect(masterGain);

          sawFilter.frequency.linearRampToValueAtTime(1000, audioContext.currentTime + 0.5);

          setTimeout(() => {
            try {
              if (sawNoise.stop) sawNoise.stop();
              if (sawFilter.disconnect) sawFilter.disconnect();
              if (sawGain.disconnect) sawGain.disconnect();
            } catch (e) {}
          }, 550);
        }

        const nextSaw = setTimeout(saw, 1000);
        timeouts.push(nextSaw);
      }

      function toggleSaw() {
        sawActive = !sawActive;
        if (sawActive) {
          saw();
        }
      }

      const sawToggle = setInterval(toggleSaw, 6000);
      intervals.push(sawToggle);

      return { nodes, timeouts, intervals };
    } catch (err) {
      console.error('Error in commons ambient:', err);
      return null;
    }
  }

  /**
   * ARENA - Competition grounds
   * Crowd roar + drum beats + clash sounds + horn call
   */
  function playArenaAmbient() {
    if (!audioContext || !masterGain) return null;

    const nodes = [];
    const timeouts = [];
    const intervals = [];

    try {
      // Crowd roar with periodic swells
      const crowd = createWhiteNoise();
      if (crowd) {
        const crowdFilter = audioContext.createBiquadFilter();
        const crowdGain = audioContext.createGain();

        crowdFilter.type = 'bandpass';
        crowdFilter.frequency.value = 600;
        crowdFilter.Q.value = 0.8;

        crowdGain.gain.value = 0.035;

        crowd.connect(crowdFilter);
        crowdFilter.connect(crowdGain);
        crowdGain.connect(masterGain);

        nodes.push(crowd, crowdFilter, crowdGain);

        // Periodic swells
        function swell() {
          if (!crowdGain || !audioContext) return;
          crowdGain.gain.linearRampToValueAtTime(0.04, audioContext.currentTime + 2);
          crowdGain.gain.linearRampToValueAtTime(0.06, audioContext.currentTime + 4);
        }

        const swellInterval = setInterval(swell, 12000);
        intervals.push(swellInterval);
      }

      // Drum beats - rhythmic at 120 BPM
      function drumBeat() {
        if (!audioContext || !masterGain) return;

        const drum = audioContext.createOscillator();
        const drumGain = audioContext.createGain();

        drum.type = 'sine';
        drum.frequency.value = 55;

        drumGain.gain.value = 0.08;
        drumGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15);

        drum.connect(drumGain);
        drumGain.connect(masterGain);

        drum.start();
        drum.stop(audioContext.currentTime + 0.15);
      }

      const drumInterval = setInterval(drumBeat, 500); // 120 BPM
      intervals.push(drumInterval);

      // Clash sounds
      function clash() {
        if (!audioContext || !masterGain) return;

        const metal = createWhiteNoise(2);
        if (metal) {
          const metalFilter = audioContext.createBiquadFilter();
          const metalGain = audioContext.createGain();

          metalFilter.type = 'bandpass';
          metalFilter.frequency.value = 3000;
          metalFilter.Q.value = 3;

          metalGain.gain.value = 0.06;
          metalGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);

          metal.connect(metalFilter);
          metalFilter.connect(metalGain);
          metalGain.connect(masterGain);

          setTimeout(() => {
            try {
              if (metal.stop) metal.stop();
              if (metalFilter.disconnect) metalFilter.disconnect();
              if (metalGain.disconnect) metalGain.disconnect();
            } catch (e) {}
          }, 250);
        }

        const nextClash = setTimeout(clash, 5000 + Math.random() * 5000);
        timeouts.push(nextClash);
      }

      const firstClash = setTimeout(clash, 3000);
      timeouts.push(firstClash);

      // Horn call
      function hornCall() {
        if (!audioContext || !masterGain) return;

        const horn = audioContext.createOscillator();
        const hornGain = audioContext.createGain();

        horn.type = 'sawtooth';
        horn.frequency.value = 220;

        hornGain.gain.setValueAtTime(0, audioContext.currentTime);
        hornGain.gain.linearRampToValueAtTime(0.05, audioContext.currentTime + 0.2);
        hornGain.gain.linearRampToValueAtTime(0.05, audioContext.currentTime + 0.8);
        hornGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1);

        horn.connect(hornGain);
        hornGain.connect(masterGain);

        horn.start();
        horn.stop(audioContext.currentTime + 1);

        const nextHorn = setTimeout(hornCall, 20000 + Math.random() * 10000);
        timeouts.push(nextHorn);
      }

      const firstHorn = setTimeout(hornCall, 10000);
      timeouts.push(firstHorn);

      return { nodes, timeouts, intervals };
    } catch (err) {
      console.error('Error in arena ambient:', err);
      return null;
    }
  }

  /**
   * Play UI sound effect
   * @param {string} type - Sound type
   */
  function playSound(type) {
    if (!audioContext || !masterGain) return;

    // Resume context if needed
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    try {
      switch (type) {
        case 'chat':
          playChatSound();
          break;
        case 'warp':
          playWarpSound();
          break;
        case 'harvest':
          playHarvestSound();
          break;
        case 'build':
          playBuildSound();
          break;
        case 'trade':
          playTradeSound();
          break;
        case 'trade_request':
          playTradeRequestSound();
          break;
        case 'discover':
          playDiscoverSound();
          break;
        case 'challenge':
          playChallengeSound();
          break;
        case 'levelup':
          playLevelUpSound();
          break;
        case 'level_up':
          playLevelUpSound();
          break;
        case 'error':
          playErrorSound();
          break;
        case 'notification':
          playNotificationSound();
          break;
        case 'craft_complete':
          playCraftCompleteSound();
          break;
        case 'quest_accept':
          playQuestAcceptSound();
          break;
        case 'quest_complete':
          playQuestCompleteSound();
          break;
        case 'item_pickup':
          playItemPickupSound();
          break;
        case 'npc_greet':
          playNPCGreetSound();
          break;
        case 'portal_enter':
          playPortalEnterSound();
          break;
        case 'build_place':
          playBuildPlaceSound();
          break;
        case 'footstep':
          playFootstepSound();
          break;
        case 'zone_enter':
          playZoneEntrySwoosh();
          break;
        case 'shutter':
          playShutterSound();
          break;
        case 'coin':
          playCoinSound();
          break;
        default:
          console.warn('Unknown sound type:', type);
      }
    } catch (err) {
      console.error('Error playing sound:', err);
    }
  }

  /**
   * Chat sound - two-tone blip ascending
   */
  function playChatSound() {
    if (!audioContext || !masterGain) return;

    const blip1 = audioContext.createOscillator();
    const blip1Gain = audioContext.createGain();

    blip1.type = 'sine';
    blip1.frequency.value = 600;

    blip1Gain.gain.value = 0.05;
    blip1Gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.05);

    blip1.connect(blip1Gain);
    blip1Gain.connect(masterGain);

    blip1.start();
    blip1.stop(audioContext.currentTime + 0.05);

    const blip2 = audioContext.createOscillator();
    const blip2Gain = audioContext.createGain();

    blip2.type = 'sine';
    blip2.frequency.value = 900;

    blip2Gain.gain.setValueAtTime(0, audioContext.currentTime + 0.05);
    blip2Gain.gain.linearRampToValueAtTime(0.05, audioContext.currentTime + 0.06);
    blip2Gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);

    blip2.connect(blip2Gain);
    blip2Gain.connect(masterGain);

    blip2.start(audioContext.currentTime + 0.05);
    blip2.stop(audioContext.currentTime + 0.1);
  }

  /**
   * Warp sound - sweeping whoosh with reverb
   */
  function playWarpSound() {
    if (!audioContext || !masterGain) return;

    const warp = audioContext.createOscillator();
    const warpGain = audioContext.createGain();
    const delay1 = audioContext.createDelay();
    const delay2 = audioContext.createDelay();
    const delayGain1 = audioContext.createGain();
    const delayGain2 = audioContext.createGain();

    warp.type = 'sawtooth';
    warp.frequency.value = 800;
    warp.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.5);

    warpGain.gain.value = 0.06;
    warpGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);

    delay1.delayTime.value = 0.1;
    delay2.delayTime.value = 0.2;
    delayGain1.gain.value = 0.1;
    delayGain2.gain.value = 0.06;

    warp.connect(warpGain);
    warpGain.connect(masterGain);
    warpGain.connect(delay1);
    warpGain.connect(delay2);
    delay1.connect(delayGain1);
    delay2.connect(delayGain2);
    delayGain1.connect(masterGain);
    delayGain2.connect(masterGain);

    warp.start();
    warp.stop(audioContext.currentTime + 0.5);
  }

  /**
   * Harvest sound - satisfying pluck with harmonic
   */
  function playHarvestSound() {
    if (!audioContext || !masterGain) return;

    const pluck = audioContext.createOscillator();
    const harmonic = audioContext.createOscillator();
    const pluckGain = audioContext.createGain();

    pluck.type = 'triangle';
    pluck.frequency.value = 330;

    harmonic.type = 'triangle';
    harmonic.frequency.value = 660;

    pluckGain.gain.value = 0.06;
    pluckGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);

    pluck.connect(pluckGain);
    harmonic.connect(pluckGain);
    pluckGain.connect(masterGain);

    pluck.start();
    harmonic.start();
    pluck.stop(audioContext.currentTime + 0.3);
    harmonic.stop(audioContext.currentTime + 0.3);
  }

  /**
   * Build sound - heavy thump + click
   */
  function playBuildSound() {
    if (!audioContext || !masterGain) return;

    const thump = audioContext.createOscillator();
    const thumpGain = audioContext.createGain();

    thump.type = 'square';
    thump.frequency.value = 80;

    thumpGain.gain.value = 0.06;
    thumpGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15);

    thump.connect(thumpGain);
    thumpGain.connect(masterGain);

    thump.start();
    thump.stop(audioContext.currentTime + 0.15);

    const click = audioContext.createOscillator();
    const clickGain = audioContext.createGain();

    click.type = 'sine';
    click.frequency.value = 2000;

    clickGain.gain.value = 0.04;
    clickGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.02);

    click.connect(clickGain);
    clickGain.connect(masterGain);

    click.start();
    click.stop(audioContext.currentTime + 0.02);
  }

  /**
   * Trade sound - coin ding with shimmer
   */
  function playTradeSound() {
    if (!audioContext || !masterGain) return;

    const coin1 = audioContext.createOscillator();
    const coin2 = audioContext.createOscillator();
    const wobble = audioContext.createOscillator();
    const wobbleGain = audioContext.createGain();
    const coinGain = audioContext.createGain();

    coin1.type = 'sine';
    coin1.frequency.value = 1200;

    coin2.type = 'sine';
    coin2.frequency.value = 1500;

    wobble.type = 'sine';
    wobble.frequency.value = 5;
    wobbleGain.gain.value = 3;

    coinGain.gain.value = 0.05;
    coinGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);

    wobble.connect(wobbleGain);
    wobbleGain.connect(coin1.frequency);
    wobbleGain.connect(coin2.frequency);

    coin1.connect(coinGain);
    coin2.connect(coinGain);
    coinGain.connect(masterGain);

    coin1.start();
    coin2.start();
    wobble.start();
    coin1.stop(audioContext.currentTime + 0.3);
    coin2.stop(audioContext.currentTime + 0.3);
    wobble.stop(audioContext.currentTime + 0.3);
  }

  /**
   * Discover sound - magical sparkle arpeggio
   */
  function playDiscoverSound() {
    if (!audioContext || !masterGain) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

    notes.forEach((freq, i) => {
      const note = audioContext.createOscillator();
      const noteGain = audioContext.createGain();

      note.type = 'sine';
      note.frequency.value = freq;

      const startTime = audioContext.currentTime + i * 0.08;
      noteGain.gain.setValueAtTime(0, startTime);
      noteGain.gain.linearRampToValueAtTime(0.05, startTime + 0.02);
      noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);

      note.connect(noteGain);
      noteGain.connect(masterGain);

      note.start(startTime);
      note.stop(startTime + 0.2);
    });
  }

  /**
   * Challenge sound - dramatic horn
   */
  function playChallengeSound() {
    if (!audioContext || !masterGain) return;

    const horn1 = audioContext.createOscillator();
    const horn2 = audioContext.createOscillator();
    const hornGain = audioContext.createGain();

    horn1.type = 'sawtooth';
    horn1.frequency.value = 220;

    horn2.type = 'sawtooth';
    horn2.frequency.value = 330;

    hornGain.gain.setValueAtTime(0, audioContext.currentTime);
    hornGain.gain.linearRampToValueAtTime(0.06, audioContext.currentTime + 0.1);
    hornGain.gain.linearRampToValueAtTime(0.06, audioContext.currentTime + 0.4);
    hornGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);

    horn1.connect(hornGain);
    horn2.connect(hornGain);
    hornGain.connect(masterGain);

    horn1.start();
    horn2.start();
    horn1.stop(audioContext.currentTime + 0.5);
    horn2.stop(audioContext.currentTime + 0.5);
  }

  /**
   * Level up sound - rising triumphant chord
   */
  function playLevelUpSound() {
    if (!audioContext || !masterGain) return;

    const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5

    notes.forEach((freq, i) => {
      const note = audioContext.createOscillator();
      const noteGain = audioContext.createGain();

      note.type = 'sine';
      note.frequency.value = freq;

      const startTime = audioContext.currentTime + i * 0.1;
      noteGain.gain.setValueAtTime(0, startTime);
      noteGain.gain.linearRampToValueAtTime(0.05, startTime + 0.1);
      noteGain.gain.linearRampToValueAtTime(0.03, startTime + 0.5);
      noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.8);

      note.connect(noteGain);
      noteGain.connect(masterGain);

      note.start(startTime);
      note.stop(startTime + 0.8);
    });
  }

  /**
   * Error sound - low buzz
   */
  function playErrorSound() {
    if (!audioContext || !masterGain) return;

    const buzz = audioContext.createOscillator();
    const buzzGain = audioContext.createGain();

    buzz.type = 'square';
    buzz.frequency.value = 100;

    buzzGain.gain.value = 0.04;
    buzzGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);

    buzz.connect(buzzGain);
    buzzGain.connect(masterGain);

    buzz.start();
    buzz.stop(audioContext.currentTime + 0.2);
  }

  /**
   * Notification sound - gentle bell
   */
  function playNotificationSound() {
    if (!audioContext || !masterGain) return;

    const bell = audioContext.createOscillator();
    const bellGain = audioContext.createGain();

    bell.type = 'sine';
    bell.frequency.value = 800;

    bellGain.gain.value = 0.05;
    bellGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.4);

    bell.connect(bellGain);
    bellGain.connect(masterGain);

    bell.start();
    bell.stop(audioContext.currentTime + 0.4);
  }

  /**
   * Trade request sound - soft notification bell (single warm tone)
   */
  function playTradeRequestSound() {
    if (!audioContext || !masterGain) return;

    const bell = audioContext.createOscillator();
    const bellGain = audioContext.createGain();

    bell.type = 'sine';
    bell.frequency.value = 700;

    bellGain.gain.value = 0.04;
    bellGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);

    bell.connect(bellGain);
    bellGain.connect(masterGain);

    bell.start();
    bell.stop(audioContext.currentTime + 0.5);
  }

  /**
   * Craft complete sound - satisfying metallic completion (anvil-like + sparkle)
   */
  function playCraftCompleteSound() {
    if (!audioContext || !masterGain) return;

    // Anvil strike - low metallic thump
    const anvil = audioContext.createOscillator();
    const anvilGain = audioContext.createGain();

    anvil.type = 'square';
    anvil.frequency.value = 120;

    anvilGain.gain.value = 0.06;
    anvilGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);

    anvil.connect(anvilGain);
    anvilGain.connect(masterGain);

    anvil.start();
    anvil.stop(audioContext.currentTime + 0.2);

    // Sparkle - high chime
    const sparkle1 = audioContext.createOscillator();
    const sparkle2 = audioContext.createOscillator();
    const sparkle3 = audioContext.createOscillator();
    const sparkleGain = audioContext.createGain();

    sparkle1.type = 'sine';
    sparkle1.frequency.value = 1800;
    sparkle2.type = 'sine';
    sparkle2.frequency.value = 2200;
    sparkle3.type = 'sine';
    sparkle3.frequency.value = 2600;

    const startTime = audioContext.currentTime + 0.1;
    sparkleGain.gain.setValueAtTime(0, startTime);
    sparkleGain.gain.linearRampToValueAtTime(0.04, startTime + 0.02);
    sparkleGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

    sparkle1.connect(sparkleGain);
    sparkle2.connect(sparkleGain);
    sparkle3.connect(sparkleGain);
    sparkleGain.connect(masterGain);

    sparkle1.start(startTime);
    sparkle2.start(startTime + 0.05);
    sparkle3.start(startTime + 0.1);
    sparkle1.stop(startTime + 0.4);
    sparkle2.stop(startTime + 0.45);
    sparkle3.stop(startTime + 0.5);
  }

  /**
   * Quest accept sound - adventurous ascending arpeggio (3 quick rising notes)
   */
  function playQuestAcceptSound() {
    if (!audioContext || !masterGain) return;

    const notes = [392.00, 493.88, 587.33]; // G4, B4, D5

    notes.forEach((freq, i) => {
      const note = audioContext.createOscillator();
      const noteGain = audioContext.createGain();

      note.type = 'sine';
      note.frequency.value = freq;

      const startTime = audioContext.currentTime + i * 0.08;
      noteGain.gain.setValueAtTime(0, startTime);
      noteGain.gain.linearRampToValueAtTime(0.05, startTime + 0.02);
      noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

      note.connect(noteGain);
      noteGain.connect(masterGain);

      note.start(startTime);
      note.stop(startTime + 0.25);
    });
  }

  /**
   * Quest complete sound - triumphant fanfare (3 notes harmonized)
   */
  function playQuestCompleteSound() {
    if (!audioContext || !masterGain) return;

    // Triumphant chord - C major (C5, E5, G5)
    const chord1 = audioContext.createOscillator();
    const chord2 = audioContext.createOscillator();
    const chord3 = audioContext.createOscillator();
    const chordGain = audioContext.createGain();

    chord1.type = 'sine';
    chord1.frequency.value = 523.25; // C5
    chord2.type = 'sine';
    chord2.frequency.value = 659.25; // E5
    chord3.type = 'sine';
    chord3.frequency.value = 783.99; // G5

    chordGain.gain.setValueAtTime(0, audioContext.currentTime);
    chordGain.gain.linearRampToValueAtTime(0.06, audioContext.currentTime + 0.1);
    chordGain.gain.linearRampToValueAtTime(0.04, audioContext.currentTime + 0.5);
    chordGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.8);

    chord1.connect(chordGain);
    chord2.connect(chordGain);
    chord3.connect(chordGain);
    chordGain.connect(masterGain);

    chord1.start();
    chord2.start();
    chord3.start();
    chord1.stop(audioContext.currentTime + 0.8);
    chord2.stop(audioContext.currentTime + 0.8);
    chord3.stop(audioContext.currentTime + 0.8);
  }

  /**
   * Item pickup sound - quick soft pop (short white noise burst)
   */
  function playItemPickupSound() {
    if (!audioContext || !masterGain) return;

    try {
      // Create short white noise burst
      const bufferSize = audioContext.sampleRate * 0.05; // 50ms
      const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = audioContext.createBufferSource();
      noise.buffer = buffer;

      const filter = audioContext.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1000;
      filter.Q.value = 1;

      const noiseGain = audioContext.createGain();
      noiseGain.gain.value = 0.05;
      noiseGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.08);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(masterGain);

      noise.start();
      noise.stop(audioContext.currentTime + 0.08);
    } catch (err) {
      console.error('Error in item pickup sound:', err);
    }
  }

  /**
   * NPC greet sound - warm gentle tone (single soft note)
   */
  function playNPCGreetSound() {
    if (!audioContext || !masterGain) return;

    const greet = audioContext.createOscillator();
    const greetGain = audioContext.createGain();

    greet.type = 'sine';
    greet.frequency.value = 440; // A4

    greetGain.gain.setValueAtTime(0, audioContext.currentTime);
    greetGain.gain.linearRampToValueAtTime(0.04, audioContext.currentTime + 0.05);
    greetGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.35);

    greet.connect(greetGain);
    greetGain.connect(masterGain);

    greet.start();
    greet.stop(audioContext.currentTime + 0.35);
  }

  /**
   * Portal enter sound - whooshing magical sound (filtered noise sweep)
   */
  function playPortalEnterSound() {
    if (!audioContext || !masterGain) return;

    try {
      // Create noise for whoosh
      const bufferSize = audioContext.sampleRate * 0.8;
      const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = audioContext.createBufferSource();
      noise.buffer = buffer;

      // Sweeping filter for magical effect
      const filter = audioContext.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 200;
      filter.frequency.exponentialRampToValueAtTime(4000, audioContext.currentTime + 0.8);
      filter.Q.value = 5;

      const whooshGain = audioContext.createGain();
      whooshGain.gain.value = 0.06;
      whooshGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.8);

      noise.connect(filter);
      filter.connect(whooshGain);
      whooshGain.connect(masterGain);

      noise.start();
      noise.stop(audioContext.currentTime + 0.8);

      // Add ethereal tone
      const tone = audioContext.createOscillator();
      const toneGain = audioContext.createGain();

      tone.type = 'sine';
      tone.frequency.value = 800;
      tone.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.8);

      toneGain.gain.value = 0.03;
      toneGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.8);

      tone.connect(toneGain);
      toneGain.connect(masterGain);

      tone.start();
      tone.stop(audioContext.currentTime + 0.8);
    } catch (err) {
      console.error('Error in portal enter sound:', err);
    }
  }

  /**
   * Build place sound - solid thunk (low frequency impact)
   */
  function playBuildPlaceSound() {
    if (!audioContext || !masterGain) return;

    const thunk = audioContext.createOscillator();
    const thunkGain = audioContext.createGain();

    thunk.type = 'square';
    thunk.frequency.value = 60;

    thunkGain.gain.value = 0.06;
    thunkGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.12);

    thunk.connect(thunkGain);
    thunkGain.connect(masterGain);

    thunk.start();
    thunk.stop(audioContext.currentTime + 0.12);
  }

  /**
   * Zone entry swoosh — white noise burst + descending sine sweep
   */
  function playZoneEntrySwoosh() {
    if (!audioContext || !masterGain) return;
    try {
      var now = audioContext.currentTime;
      // White noise burst (40ms) through bandpass
      var bufSize = Math.floor(audioContext.sampleRate * 0.04);
      var buf = audioContext.createBuffer(1, bufSize, audioContext.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < bufSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      var noise = audioContext.createBufferSource();
      noise.buffer = buf;
      var bandpass = audioContext.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.value = 400;
      bandpass.Q.value = 1.0;
      var noiseGain = audioContext.createGain();
      noiseGain.gain.setValueAtTime(0.04, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      noise.connect(bandpass);
      bandpass.connect(noiseGain);
      noiseGain.connect(masterGain);
      noise.start(now);
      noise.stop(now + 0.04);

      // Descending sine sweep 600Hz -> 200Hz over 0.3s
      var sweep = audioContext.createOscillator();
      sweep.type = 'sine';
      sweep.frequency.setValueAtTime(600, now);
      sweep.frequency.exponentialRampToValueAtTime(200, now + 0.3);
      var sweepGain = audioContext.createGain();
      sweepGain.gain.setValueAtTime(0.03, now);
      sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      sweep.connect(sweepGain);
      sweepGain.connect(masterGain);
      sweep.start(now);
      sweep.stop(now + 0.4);
    } catch (err) {
      console.error('Error in zone entry swoosh:', err);
    }
  }

  /**
   * Photo mode shutter click — two rapid noise clicks
   */
  function playShutterSound() {
    if (!audioContext || !masterGain) return;
    try {
      var now = audioContext.currentTime;
      // First click
      var bufSize = Math.floor(audioContext.sampleRate * 0.005);
      var buf = audioContext.createBuffer(1, bufSize, audioContext.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < bufSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      var click1 = audioContext.createBufferSource();
      click1.buffer = buf;
      var hp1 = audioContext.createBiquadFilter();
      hp1.type = 'highpass';
      hp1.frequency.value = 3000;
      var g1 = audioContext.createGain();
      g1.gain.value = 0.04;
      click1.connect(hp1);
      hp1.connect(g1);
      g1.connect(masterGain);
      click1.start(now);
      click1.stop(now + 0.005);

      // Second click after 30ms gap
      var click2 = audioContext.createBufferSource();
      click2.buffer = buf;
      var hp2 = audioContext.createBiquadFilter();
      hp2.type = 'highpass';
      hp2.frequency.value = 3000;
      var g2 = audioContext.createGain();
      g2.gain.value = 0.04;
      click2.connect(hp2);
      hp2.connect(g2);
      g2.connect(masterGain);
      click2.start(now + 0.035);
      click2.stop(now + 0.04);
    } catch (err) {
      console.error('Error in shutter sound:', err);
    }
  }

  /**
   * Coin chime - quick ascending two-tone for Spark earn
   */
  function playCoinSound() {
    if (!audioContext || !masterGain) return;
    try {
      var now = audioContext.currentTime;
      // Tone 1: 880Hz sine, 40ms
      var osc1 = audioContext.createOscillator();
      var g1 = audioContext.createGain();
      osc1.type = 'sine';
      osc1.frequency.value = 880;
      g1.gain.setValueAtTime(0.04, now);
      g1.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc1.connect(g1);
      g1.connect(masterGain);
      osc1.start(now);
      osc1.stop(now + 0.05);
      // Tone 2: 1320Hz sine, 60ms (starts at 50ms)
      var osc2 = audioContext.createOscillator();
      var g2 = audioContext.createGain();
      osc2.type = 'sine';
      osc2.frequency.value = 1320;
      g2.gain.setValueAtTime(0.04, now + 0.05);
      g2.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
      osc2.connect(g2);
      g2.connect(masterGain);
      osc2.start(now + 0.05);
      osc2.stop(now + 0.12);
    } catch (err) {
      console.error('Error in coin sound:', err);
    }
  }

  /**
   * Footstep sound - very subtle soft step (tiny noise burst, vary pitch slightly)
   */
  function playFootstepSound() {
    if (!audioContext || !masterGain) return;

    try {
      // Create very short white noise burst
      const bufferSize = audioContext.sampleRate * 0.03; // 30ms
      const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = audioContext.createBufferSource();
      noise.buffer = buffer;

      const filter = audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 300 + Math.random() * 200; // Vary pitch slightly
      filter.Q.value = 0.5;

      const stepGain = audioContext.createGain();
      stepGain.gain.value = 0.05; // Very subtle
      stepGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.05);

      noise.connect(filter);
      filter.connect(stepGain);
      stepGain.connect(masterGain);

      noise.start();
      noise.stop(audioContext.currentTime + 0.05);
    } catch (err) {
      console.error('Error in footstep sound:', err);
    }
  }

  /**
   * Play footstep sound
   * @param {string} terrain - Terrain type
   */
  function playFootstep(terrain) {
    if (!audioContext || !masterGain) return;

    // Resume context if needed
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    try {
      switch (terrain) {
        case 'grass':
          playGrassFootstep();
          break;
        case 'stone':
          playStoneFootstep();
          break;
        case 'sand':
          playSandFootstep();
          break;
        case 'water':
          playWaterFootstep();
          break;
        case 'wood':
          playWoodFootstep();
          break;
        default:
          playDefaultFootstep();
      }
    } catch (err) {
      console.error('Error playing footstep:', err);
    }
  }

  /**
   * Grass footstep - soft crunch
   */
  function playGrassFootstep() {
    if (!audioContext || !masterGain) return;

    const grass = createWhiteNoise(2);
    if (grass) {
      const grassFilter = audioContext.createBiquadFilter();
      const grassGain = audioContext.createGain();

      grassFilter.type = 'lowpass';
      grassFilter.frequency.value = 500;

      grassGain.gain.value = 0.08;
      grassGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.08);

      grass.connect(grassFilter);
      grassFilter.connect(grassGain);
      grassGain.connect(masterGain);

      setTimeout(() => {
        try {
          if (grass.stop) grass.stop();
          if (grassFilter.disconnect) grassFilter.disconnect();
          if (grassGain.disconnect) grassGain.disconnect();
        } catch (e) {}
      }, 100);
    }
  }

  /**
   * Stone footstep - hard tap
   */
  function playStoneFootstep() {
    if (!audioContext || !masterGain) return;

    const thud = audioContext.createOscillator();
    const thudGain = audioContext.createGain();

    thud.type = 'sine';
    thud.frequency.value = 200;

    thudGain.gain.value = 0.04;
    thudGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.05);

    thud.connect(thudGain);
    thudGain.connect(masterGain);

    thud.start();
    thud.stop(audioContext.currentTime + 0.05);

    const click = audioContext.createOscillator();
    const clickGain = audioContext.createGain();

    click.type = 'sine';
    click.frequency.value = 3000;

    clickGain.gain.value = 0.05;
    clickGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.02);

    click.connect(clickGain);
    clickGain.connect(masterGain);

    click.start();
    click.stop(audioContext.currentTime + 0.02);
  }

  /**
   * Sand footstep - soft swish
   */
  function playSandFootstep() {
    if (!audioContext || !masterGain) return;

    const sand = createWhiteNoise(2);
    if (sand) {
      const sandFilter = audioContext.createBiquadFilter();
      const sandGain = audioContext.createGain();

      sandFilter.type = 'lowpass';
      sandFilter.frequency.value = 300;

      sandGain.gain.value = 0.07;
      sandGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);

      sand.connect(sandFilter);
      sandFilter.connect(sandGain);
      sandGain.connect(masterGain);

      setTimeout(() => {
        try {
          if (sand.stop) sand.stop();
          if (sandFilter.disconnect) sandFilter.disconnect();
          if (sandGain.disconnect) sandGain.disconnect();
        } catch (e) {}
      }, 120);
    }
  }

  /**
   * Water footstep - splash with bubbles
   */
  function playWaterFootstep() {
    if (!audioContext || !masterGain) return;

    const splash = createWhiteNoise(2);
    if (splash) {
      const splashFilter = audioContext.createBiquadFilter();
      const splashGain = audioContext.createGain();

      splashFilter.type = 'bandpass';
      splashFilter.frequency.value = 800;
      splashFilter.Q.value = 2;

      splashGain.gain.value = 0.04;
      splashGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.12);

      splash.connect(splashFilter);
      splashFilter.connect(splashGain);
      splashGain.connect(masterGain);

      setTimeout(() => {
        try {
          if (splash.stop) splash.stop();
          if (splashFilter.disconnect) splashFilter.disconnect();
          if (splashGain.disconnect) splashGain.disconnect();
        } catch (e) {}
      }, 150);
    }

    // Bubbles
    for (let i = 0; i < 2; i++) {
      setTimeout(() => {
        const bubble = audioContext.createOscillator();
        const bubbleGain = audioContext.createGain();

        bubble.type = 'sine';
        bubble.frequency.value = 1500 + Math.random() * 1500;

        bubbleGain.gain.value = 0.03;
        bubbleGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.05);

        bubble.connect(bubbleGain);
        bubbleGain.connect(masterGain);

        bubble.start();
        bubble.stop(audioContext.currentTime + 0.05);
      }, i * 50);
    }
  }

  /**
   * Wood footstep - hollow knock
   */
  function playWoodFootstep() {
    if (!audioContext || !masterGain) return;

    const knock = audioContext.createOscillator();
    const knockGain = audioContext.createGain();

    knock.type = 'sine';
    knock.frequency.value = 150;

    knockGain.gain.value = 0.04;
    knockGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.06);

    knock.connect(knockGain);
    knockGain.connect(masterGain);

    knock.start();
    knock.stop(audioContext.currentTime + 0.06);
  }

  /**
   * Default footstep - generic soft thud
   */
  function playDefaultFootstep() {
    if (!audioContext || !masterGain) return;

    const thud = audioContext.createOscillator();
    const thudGain = audioContext.createGain();

    thud.type = 'sine';
    thud.frequency.value = 100;

    thudGain.gain.value = 0.08;
    thudGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.07);

    thud.connect(thudGain);
    thudGain.connect(masterGain);

    thud.start();
    thud.stop(audioContext.currentTime + 0.07);
  }

  /**
   * Set volume for a channel
   * @param {string} channel - 'master', 'music', or 'sfx'
   * @param {number} level - 0-1
   */
  function setVolume(channel, level) {
    if (typeof channel === 'number') {
      level = channel;
      channel = 'master';
    }
    var clampedLevel = Math.max(0, Math.min(1, level));
    volumeLevels[channel] = clampedLevel;
    if (channel === 'master' && masterGain) {
      masterGain.gain.value = clampedLevel;
    }
    if (channel === 'music') {
      setMusicVolume(clampedLevel);
    }
  }

  /**
   * Mute audio
   */
  function mute() {
    if (!masterGain) return;

    isMuted = true;
    masterGain.gain.value = 0;
  }

  /**
   * Unmute audio
   */
  function unmute() {
    if (!masterGain) return;

    isMuted = false;
    masterGain.gain.value = 0.15;
  }

  /**
   * Stop all sounds
   */
  function stopAll() {
    stopAmbient();
    stopTimeAmbient();
    stopWeatherAmbient();
    stopZoneAmbient();
    killAllNoiseSources();
  }

  // ============================================================================
  // TIME-OF-DAY AMBIENT LAYERS
  // ============================================================================

  let currentTimeAmbient = null;

  // Night cricket ambient layer
  var cricketLayer = null;

  function playNightCricketLayer() {
    if (!audioContext || !masterGain) return null;
    try {
      var layerGain = audioContext.createGain();
      layerGain.gain.value = 0.006;

      // Cricket 1: 3200Hz pulsed at ~12Hz (softer, lower pitch)
      var cricket1 = audioContext.createOscillator();
      cricket1.type = 'sine';
      cricket1.frequency.value = 3200;
      var lfo1 = audioContext.createOscillator();
      lfo1.type = 'sine';
      lfo1.frequency.value = 12;
      var lfoGain1 = audioContext.createGain();
      lfoGain1.gain.value = 0.3;
      lfo1.connect(lfoGain1);
      var cricket1Gain = audioContext.createGain();
      cricket1Gain.gain.value = 0.3;
      lfoGain1.connect(cricket1Gain.gain);
      cricket1.connect(cricket1Gain);
      cricket1Gain.connect(layerGain);

      // Cricket 2: 3400Hz slightly offset timing
      var cricket2 = audioContext.createOscillator();
      cricket2.type = 'sine';
      cricket2.frequency.value = 3400;
      var lfo2 = audioContext.createOscillator();
      lfo2.type = 'sine';
      lfo2.frequency.value = 10;
      var lfoGain2 = audioContext.createGain();
      lfoGain2.gain.value = 0.3;
      lfo2.connect(lfoGain2);
      var cricket2Gain = audioContext.createGain();
      cricket2Gain.gain.value = 0.3;
      lfoGain2.connect(cricket2Gain.gain);
      cricket2.connect(cricket2Gain);
      cricket2Gain.connect(layerGain);

      layerGain.connect(masterGain);
      cricket1.start();
      cricket2.start();
      lfo1.start();
      lfo2.start();

      return {
        oscillators: [cricket1, cricket2, lfo1, lfo2],
        nodes: [cricket1Gain, cricket2Gain, lfoGain1, lfoGain2, layerGain],
        gainNode: layerGain
      };
    } catch (err) {
      console.error('Error in cricket layer:', err);
      return null;
    }
  }

  function stopCricketLayer() {
    if (!cricketLayer) return;
    try {
      if (cricketLayer.gainNode) {
        cricketLayer.gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 2);
      }
      var cl = cricketLayer;
      setTimeout(function() {
        if (cl.oscillators) {
          cl.oscillators.forEach(function(o) { try { o.stop(); } catch(e) {} });
        }
      }, 2100);
      cricketLayer = null;
    } catch (err) {
      console.error('Error stopping crickets:', err);
    }
  }

  /**
   * Update ambient sounds based on time of day
   * @param {string} timePeriod - dawn, morning, midday, afternoon, evening, night
   */
  function updateAmbientForTime(timePeriod) {
    if (!audioContext || !masterGain) return;

    // Resume context if needed
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    // Stop current time ambient
    stopTimeAmbient();

    try {
      switch (timePeriod) {
        case 'dawn':
          currentTimeAmbient = playDawnAmbient();
          break;
        case 'morning':
          currentTimeAmbient = playMorningAmbient();
          break;
        case 'midday':
          currentTimeAmbient = playMiddayAmbient();
          break;
        case 'afternoon':
          currentTimeAmbient = playAfternoonAmbient();
          break;
        case 'evening':
          currentTimeAmbient = playEveningAmbient();
          break;
        case 'night':
          currentTimeAmbient = playNightAmbient();
          break;
        default:
          currentTimeAmbient = null;
      }

      // Night cricket layer
      if (timePeriod === 'night' || timePeriod === 'evening') {
        if (!cricketLayer) {
          cricketLayer = playNightCricketLayer();
        }
      } else if (timePeriod === 'dawn' || timePeriod === 'morning') {
        stopCricketLayer();
      } else {
        stopCricketLayer();
      }
    } catch (err) {
      console.error('Error updating time ambient:', err);
    }
  }

  /**
   * Stop current time-of-day ambient
   */
  function stopTimeAmbient() {
    if (!currentTimeAmbient) return;

    try {
      if (currentTimeAmbient.oscillators && Array.isArray(currentTimeAmbient.oscillators)) {
        currentTimeAmbient.oscillators.forEach(osc => {
          if (osc && osc.stop) {
            try { osc.stop(); } catch (e) {}
          }
        });
      }

      if (currentTimeAmbient.nodes && Array.isArray(currentTimeAmbient.nodes)) {
        currentTimeAmbient.nodes.forEach(node => {
          if (node) {
            if (node.stop) {
              try { node.stop(); } catch (e) {}
            }
            if (node.disconnect) {
              try { node.disconnect(); } catch (e) {}
            }
          }
        });
      }

      if (currentTimeAmbient.intervals && Array.isArray(currentTimeAmbient.intervals)) {
        currentTimeAmbient.intervals.forEach(id => clearInterval(id));
      }

      if (currentTimeAmbient.timeouts && Array.isArray(currentTimeAmbient.timeouts)) {
        currentTimeAmbient.timeouts.forEach(id => clearTimeout(id));
      }

      if (currentTimeAmbient.cleanup && typeof currentTimeAmbient.cleanup === 'function') {
        currentTimeAmbient.cleanup();
      }
    } catch (err) {
      console.error('Error stopping time ambient:', err);
    }

    currentTimeAmbient = null;
    killAllNoiseSources();
  }

  /**
   * Dawn ambient (5-7): Bird chirps, gentle wind
   */
  function playDawnAmbient() {
    if (!audioContext || !masterGain) return null;

    const nodes = [];
    const timeouts = [];

    try {
      // Gentle wind
      const wind = createWhiteNoise();
      if (wind) {
        const windFilter = audioContext.createBiquadFilter();
        const windGain = audioContext.createGain();

        windFilter.type = 'lowpass';
        windFilter.frequency.value = 180;
        windGain.gain.value = 0.02;

        wind.connect(windFilter);
        windFilter.connect(windGain);
        windGain.connect(masterGain);

        nodes.push(wind, windFilter, windGain);
      }

      // Morning bird chirps - high frequency with fast attack/decay
      function dawnChirp() {
        if (!audioContext || !masterGain) return;

        const bird = audioContext.createOscillator();
        const birdGain = audioContext.createGain();

        bird.type = 'sine';
        bird.frequency.value = 800 + Math.random() * 1000;

        const duration = 0.05 + Math.random() * 0.1;
        birdGain.gain.value = 0.04;
        birdGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

        bird.connect(birdGain);
        birdGain.connect(masterGain);

        bird.start();
        bird.stop(audioContext.currentTime + duration);

        const nextChirp = setTimeout(dawnChirp, 800 + Math.random() * 2000);
        timeouts.push(nextChirp);
      }

      for (let i = 0; i < 2; i++) {
        const firstChirp = setTimeout(dawnChirp, Math.random() * 1000);
        timeouts.push(firstChirp);
      }

      return { nodes, timeouts };
    } catch (err) {
      console.error('Error in dawn ambient:', err);
      return null;
    }
  }

  /**
   * Morning ambient (7-12): Active birds, gentle breeze, insect buzzes
   */
  function playMorningAmbient() {
    if (!audioContext || !masterGain) return null;

    const nodes = [];
    const timeouts = [];

    try {
      // Gentle breeze
      const breeze = createWhiteNoise();
      if (breeze) {
        const breezeFilter = audioContext.createBiquadFilter();
        const breezeGain = audioContext.createGain();

        breezeFilter.type = 'lowpass';
        breezeFilter.frequency.value = 200;
        breezeGain.gain.value = 0.025;

        breeze.connect(breezeFilter);
        breezeFilter.connect(breezeGain);
        breezeGain.connect(masterGain);

        nodes.push(breeze, breezeFilter, breezeGain);
      }

      // Active bird chorus
      function morningChirp() {
        if (!audioContext || !masterGain) return;

        const bird = audioContext.createOscillator();
        const birdGain = audioContext.createGain();

        bird.type = 'sine';
        bird.frequency.value = 700 + Math.random() * 1200;

        const duration = 0.08 + Math.random() * 0.15;
        birdGain.gain.value = 0.05;
        birdGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

        bird.connect(birdGain);
        birdGain.connect(masterGain);

        bird.start();
        bird.stop(audioContext.currentTime + duration);

        const nextChirp = setTimeout(morningChirp, 400 + Math.random() * 2500);
        timeouts.push(nextChirp);
      }

      for (let i = 0; i < 3; i++) {
        const firstChirp = setTimeout(morningChirp, Math.random() * 1500);
        timeouts.push(firstChirp);
      }

      // Occasional insect buzzes
      function buzz() {
        if (!audioContext || !masterGain) return;

        const insect = audioContext.createOscillator();
        const insectGain = audioContext.createGain();

        insect.type = 'sawtooth';
        insect.frequency.value = 250 + Math.random() * 100;

        insectGain.gain.value = 0.02;
        insectGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);

        insect.connect(insectGain);
        insectGain.connect(masterGain);

        insect.start();
        insect.stop(audioContext.currentTime + 0.3);

        const nextBuzz = setTimeout(buzz, 8000 + Math.random() * 12000);
        timeouts.push(nextBuzz);
      }

      const firstBuzz = setTimeout(buzz, 5000);
      timeouts.push(firstBuzz);

      return { nodes, timeouts };
    } catch (err) {
      console.error('Error in morning ambient:', err);
      return null;
    }
  }

  /**
   * Midday ambient (12-14): Cicada-like sustained tones, warm breeze
   */
  function playMiddayAmbient() {
    if (!audioContext || !masterGain) return null;

    const nodes = [];
    const oscillators = [];
    const timeouts = [];

    try {
      // Warm breeze
      const breeze = createWhiteNoise();
      if (breeze) {
        const breezeFilter = audioContext.createBiquadFilter();
        const breezeGain = audioContext.createGain();

        breezeFilter.type = 'lowpass';
        breezeFilter.frequency.value = 220;
        breezeGain.gain.value = 0.03;

        breeze.connect(breezeFilter);
        breezeFilter.connect(breezeGain);
        breezeGain.connect(masterGain);

        nodes.push(breeze, breezeFilter, breezeGain);
      }

      // Cicada-like sustained tone with AM
      const cicada = audioContext.createOscillator();
      const cicadaAm = audioContext.createOscillator();
      const cicadaAmGain = audioContext.createGain();
      const cicadaGain = audioContext.createGain();

      cicada.type = 'sine';
      cicada.frequency.value = 3500 + Math.random() * 500;

      cicadaAm.type = 'sine';
      cicadaAm.frequency.value = 15 + Math.random() * 10;
      cicadaAmGain.gain.value = 0.02;

      cicadaGain.gain.value = 0.04;

      cicadaAm.connect(cicadaAmGain);
      cicadaAmGain.connect(cicadaGain.gain);

      cicada.connect(cicadaGain);
      cicadaGain.connect(masterGain);

      cicada.start();
      cicadaAm.start();

      oscillators.push(cicada, cicadaAm);
      nodes.push(cicadaAmGain, cicadaGain);

      // Occasional bird (quieter in heat)
      function middayChirp() {
        if (!audioContext || !masterGain) return;

        const bird = audioContext.createOscillator();
        const birdGain = audioContext.createGain();

        bird.type = 'sine';
        bird.frequency.value = 600 + Math.random() * 800;

        const duration = 0.1 + Math.random() * 0.15;
        birdGain.gain.value = 0.03;
        birdGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

        bird.connect(birdGain);
        birdGain.connect(masterGain);

        bird.start();
        bird.stop(audioContext.currentTime + duration);

        const nextChirp = setTimeout(middayChirp, 3000 + Math.random() * 5000);
        timeouts.push(nextChirp);
      }

      const firstChirp = setTimeout(middayChirp, 2000);
      timeouts.push(firstChirp);

      return { nodes, oscillators, timeouts };
    } catch (err) {
      console.error('Error in midday ambient:', err);
      return null;
    }
  }

  /**
   * Afternoon ambient (14-18): Softer birds, rustling leaves
   */
  function playAfternoonAmbient() {
    if (!audioContext || !masterGain) return null;

    const nodes = [];
    const timeouts = [];

    try {
      // Gentle breeze
      const breeze = createWhiteNoise();
      if (breeze) {
        const breezeFilter = audioContext.createBiquadFilter();
        const breezeGain = audioContext.createGain();

        breezeFilter.type = 'lowpass';
        breezeFilter.frequency.value = 190;
        breezeGain.gain.value = 0.025;

        breeze.connect(breezeFilter);
        breezeFilter.connect(breezeGain);
        breezeGain.connect(masterGain);

        nodes.push(breeze, breezeFilter, breezeGain);
      }

      // Softer bird calls
      function afternoonChirp() {
        if (!audioContext || !masterGain) return;

        const bird = audioContext.createOscillator();
        const birdGain = audioContext.createGain();

        bird.type = 'sine';
        bird.frequency.value = 500 + Math.random() * 900;

        const duration = 0.1 + Math.random() * 0.2;
        birdGain.gain.value = 0.04;
        birdGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

        bird.connect(birdGain);
        birdGain.connect(masterGain);

        bird.start();
        bird.stop(audioContext.currentTime + duration);

        const nextChirp = setTimeout(afternoonChirp, 1500 + Math.random() * 4000);
        timeouts.push(nextChirp);
      }

      for (let i = 0; i < 2; i++) {
        const firstChirp = setTimeout(afternoonChirp, Math.random() * 2000);
        timeouts.push(firstChirp);
      }

      // Rustling leaves
      function rustle() {
        if (!audioContext || !masterGain) return;

        const noise = createWhiteNoise(2);
        if (noise) {
          const rustleFilter = audioContext.createBiquadFilter();
          const rustleGain = audioContext.createGain();

          rustleFilter.type = 'bandpass';
          rustleFilter.frequency.value = 1800 + Math.random() * 400;
          rustleFilter.Q.value = 2;

          rustleGain.gain.value = 0.03;
          rustleGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.4);

          noise.connect(rustleFilter);
          rustleFilter.connect(rustleGain);
          rustleGain.connect(masterGain);

          setTimeout(() => {
            try {
              if (noise.stop) noise.stop();
              if (rustleFilter.disconnect) rustleFilter.disconnect();
              if (rustleGain.disconnect) rustleGain.disconnect();
            } catch (e) {}
          }, 450);
        }

        const nextRustle = setTimeout(rustle, 2500 + Math.random() * 3500);
        timeouts.push(nextRustle);
      }

      const firstRustle = setTimeout(rustle, 1500);
      timeouts.push(firstRustle);

      return { nodes, timeouts };
    } catch (err) {
      console.error('Error in afternoon ambient:', err);
      return null;
    }
  }

  /**
   * Evening ambient (18-21): Cricket chirps, owl hoots, gentle wind
   */
  function playEveningAmbient() {
    if (!audioContext || !masterGain) return null;

    const nodes = [];
    const oscillators = [];
    const timeouts = [];

    try {
      // Gentle wind
      const wind = createWhiteNoise();
      if (wind) {
        const windFilter = audioContext.createBiquadFilter();
        const windGain = audioContext.createGain();

        windFilter.type = 'lowpass';
        windFilter.frequency.value = 170;
        windGain.gain.value = 0.02;

        wind.connect(windFilter);
        windFilter.connect(windGain);
        windGain.connect(masterGain);

        nodes.push(wind, windFilter, windGain);
      }

      // Cricket chirps - rapid oscillator pulses
      const cricket = audioContext.createOscillator();
      const cricketAm = audioContext.createOscillator();
      const cricketAmGain = audioContext.createGain();
      const cricketGain = audioContext.createGain();

      cricket.type = 'sine';
      cricket.frequency.value = 4000 + Math.random() * 500;

      cricketAm.type = 'sine';
      cricketAm.frequency.value = 18 + Math.random() * 8;
      cricketAmGain.gain.value = 0.025;

      cricketGain.gain.value = 0.03;

      cricketAm.connect(cricketAmGain);
      cricketAmGain.connect(cricketGain.gain);

      cricket.connect(cricketGain);
      cricketGain.connect(masterGain);

      cricket.start();
      cricketAm.start();

      oscillators.push(cricket, cricketAm);
      nodes.push(cricketAmGain, cricketGain);

      // Owl hoots - low frequency with vibrato
      function hoot() {
        if (!audioContext || !masterGain) return;

        const owl = audioContext.createOscillator();
        const owlVibrato = audioContext.createOscillator();
        const owlVibratoGain = audioContext.createGain();
        const owlGain = audioContext.createGain();

        owl.type = 'sine';
        owl.frequency.value = 320;

        owlVibrato.type = 'sine';
        owlVibrato.frequency.value = 4;
        owlVibratoGain.gain.value = 8;

        owlGain.gain.value = 0.05;
        owlGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.4);

        owlVibrato.connect(owlVibratoGain);
        owlVibratoGain.connect(owl.frequency);

        owl.connect(owlGain);
        owlGain.connect(masterGain);

        owl.start();
        owlVibrato.start();

        owl.stop(audioContext.currentTime + 0.4);
        owlVibrato.stop(audioContext.currentTime + 0.4);

        const nextHoot = setTimeout(hoot, 12000 + Math.random() * 12000);
        timeouts.push(nextHoot);
      }

      const firstHoot = setTimeout(hoot, 5000);
      timeouts.push(firstHoot);

      return { nodes, oscillators, timeouts };
    } catch (err) {
      console.error('Error in evening ambient:', err);
      return null;
    }
  }

  /**
   * Night ambient (21-5): Deep crickets, occasional owl, quiet wind, distant howl
   */
  function playNightAmbient() {
    if (!audioContext || !masterGain) return null;

    const nodes = [];
    const oscillators = [];
    const timeouts = [];

    try {
      // Very quiet wind
      const wind = createWhiteNoise();
      if (wind) {
        const windFilter = audioContext.createBiquadFilter();
        const windGain = audioContext.createGain();

        windFilter.type = 'lowpass';
        windFilter.frequency.value = 150;
        windGain.gain.value = 0.015;

        wind.connect(windFilter);
        windFilter.connect(windGain);
        windGain.connect(masterGain);

        nodes.push(wind, windFilter, windGain);
      }

      // Deep crickets
      const cricket = audioContext.createOscillator();
      const cricketAm = audioContext.createOscillator();
      const cricketAmGain = audioContext.createGain();
      const cricketGain = audioContext.createGain();

      cricket.type = 'sine';
      cricket.frequency.value = 3500 + Math.random() * 300;

      cricketAm.type = 'sine';
      cricketAm.frequency.value = 15 + Math.random() * 5;
      cricketAmGain.gain.value = 0.02;

      cricketGain.gain.value = 0.025;

      cricketAm.connect(cricketAmGain);
      cricketAmGain.connect(cricketGain.gain);

      cricket.connect(cricketGain);
      cricketGain.connect(masterGain);

      cricket.start();
      cricketAm.start();

      oscillators.push(cricket, cricketAm);
      nodes.push(cricketAmGain, cricketGain);

      // Occasional owl
      function nightHoot() {
        if (!audioContext || !masterGain) return;

        const owl = audioContext.createOscillator();
        const owlVibrato = audioContext.createOscillator();
        const owlVibratoGain = audioContext.createGain();
        const owlGain = audioContext.createGain();

        owl.type = 'sine';
        owl.frequency.value = 280;

        owlVibrato.type = 'sine';
        owlVibrato.frequency.value = 4;
        owlVibratoGain.gain.value = 6;

        owlGain.gain.value = 0.04;
        owlGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);

        owlVibrato.connect(owlVibratoGain);
        owlVibratoGain.connect(owl.frequency);

        owl.connect(owlGain);
        owlGain.connect(masterGain);

        owl.start();
        owlVibrato.start();

        owl.stop(audioContext.currentTime + 0.5);
        owlVibrato.stop(audioContext.currentTime + 0.5);

        const nextHoot = setTimeout(nightHoot, 18000 + Math.random() * 18000);
        timeouts.push(nextHoot);
      }

      const firstHoot = setTimeout(nightHoot, 8000);
      timeouts.push(firstHoot);

      // Distant wolf-like howl (very rare)
      function distantHowl() {
        if (!audioContext || !masterGain) return;

        const wolf = audioContext.createOscillator();
        const wolfVibrato = audioContext.createOscillator();
        const wolfVibratoGain = audioContext.createGain();
        const wolfGain = audioContext.createGain();

        wolf.type = 'sine';
        wolf.frequency.value = 350;

        wolfVibrato.type = 'sine';
        wolfVibrato.frequency.value = 4;
        wolfVibratoGain.gain.value = 10;

        wolfGain.gain.value = 0.03;

        wolfVibrato.connect(wolfVibratoGain);
        wolfVibratoGain.connect(wolf.frequency);

        wolf.connect(wolfGain);
        wolfGain.connect(masterGain);

        wolf.start();
        wolfVibrato.start();

        wolf.frequency.linearRampToValueAtTime(500, audioContext.currentTime + 1.2);
        wolf.frequency.linearRampToValueAtTime(350, audioContext.currentTime + 2);
        wolfGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 2.5);

        wolf.stop(audioContext.currentTime + 2.5);
        wolfVibrato.stop(audioContext.currentTime + 2.5);

        const nextHowl = setTimeout(distantHowl, 60000 + Math.random() * 60000);
        timeouts.push(nextHowl);
      }

      const firstHowl = setTimeout(distantHowl, 30000);
      timeouts.push(firstHowl);

      return { nodes, oscillators, timeouts };
    } catch (err) {
      console.error('Error in night ambient:', err);
      return null;
    }
  }

  // ============================================================================
  // WEATHER AMBIENT LAYERS
  // ============================================================================

  let currentWeatherAmbient = null;

  /**
   * Update ambient sounds based on weather
   * @param {string} weather - clear, cloudy, rain, snow
   */
  function updateAmbientForWeather(weather) {
    if (!audioContext || !masterGain) return;

    // Resume context if needed
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    // Stop current weather ambient
    stopWeatherAmbient();

    try {
      switch (weather) {
        case 'clear':
          // Normal ambient, no additional layer
          currentWeatherAmbient = null;
          break;
        case 'cloudy':
          currentWeatherAmbient = playCloudyAmbient();
          break;
        case 'rain':
          currentWeatherAmbient = playRainAmbient();
          break;
        case 'snow':
          currentWeatherAmbient = playSnowAmbient();
          break;
        default:
          currentWeatherAmbient = null;
      }
    } catch (err) {
      console.error('Error updating weather ambient:', err);
    }
  }

  /**
   * Stop current weather ambient
   */
  function stopWeatherAmbient() {
    if (!currentWeatherAmbient) return;

    try {
      if (currentWeatherAmbient.oscillators && Array.isArray(currentWeatherAmbient.oscillators)) {
        currentWeatherAmbient.oscillators.forEach(osc => {
          if (osc && osc.stop) {
            try { osc.stop(); } catch (e) {}
          }
        });
      }

      if (currentWeatherAmbient.nodes && Array.isArray(currentWeatherAmbient.nodes)) {
        currentWeatherAmbient.nodes.forEach(node => {
          if (node) {
            if (node.stop) {
              try { node.stop(); } catch (e) {}
            }
            if (node.disconnect) {
              try { node.disconnect(); } catch (e) {}
            }
          }
        });
      }

      if (currentWeatherAmbient.intervals && Array.isArray(currentWeatherAmbient.intervals)) {
        currentWeatherAmbient.intervals.forEach(id => clearInterval(id));
      }

      if (currentWeatherAmbient.timeouts && Array.isArray(currentWeatherAmbient.timeouts)) {
        currentWeatherAmbient.timeouts.forEach(id => clearTimeout(id));
      }

      if (currentWeatherAmbient.cleanup && typeof currentWeatherAmbient.cleanup === 'function') {
        currentWeatherAmbient.cleanup();
      }
    } catch (err) {
      console.error('Error stopping weather ambient:', err);
    }

    currentWeatherAmbient = null;
    killAllNoiseSources();
  }

  /**
   * Cloudy ambient - gentle wind increase
   */
  function playCloudyAmbient() {
    if (!audioContext || !masterGain) return null;

    const nodes = [];

    try {
      const wind = createWhiteNoise();
      if (wind) {
        const windFilter = audioContext.createBiquadFilter();
        const windGain = audioContext.createGain();

        windFilter.type = 'lowpass';
        windFilter.frequency.value = 200;
        windGain.gain.value = 0.03;

        wind.connect(windFilter);
        windFilter.connect(windGain);
        windGain.connect(masterGain);

        nodes.push(wind, windFilter, windGain);
      }

      return { nodes };
    } catch (err) {
      console.error('Error in cloudy ambient:', err);
      return null;
    }
  }

  /**
   * Rain ambient - rain sound, occasional thunder
   */
  function playRainAmbient() {
    if (!audioContext || !masterGain) return null;

    const nodes = [];
    const timeouts = [];

    try {
      // Rain sound - white noise filtered through bandpass at ~4000Hz
      const rain = createWhiteNoise();
      if (rain) {
        const rainFilter = audioContext.createBiquadFilter();
        const rainGain = audioContext.createGain();

        rainFilter.type = 'bandpass';
        rainFilter.frequency.value = 4000;
        rainFilter.Q.value = 0.5;

        rainGain.gain.value = 0.05;

        rain.connect(rainFilter);
        rainFilter.connect(rainGain);
        rainGain.connect(masterGain);

        nodes.push(rain, rainFilter, rainGain);
      }

      // Occasional thunder
      function thunder() {
        if (!audioContext || !masterGain) return;

        const rumble = createWhiteNoise(2);
        if (rumble) {
          const rumbleFilter = audioContext.createBiquadFilter();
          const rumbleGain = audioContext.createGain();

          rumbleFilter.type = 'lowpass';
          rumbleFilter.frequency.value = 80;

          rumbleGain.gain.value = 0.05;
          rumbleGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 2.5);

          rumble.connect(rumbleFilter);
          rumbleFilter.connect(rumbleGain);
          rumbleGain.connect(masterGain);

          setTimeout(() => {
            try {
              if (rumble.stop) rumble.stop();
              if (rumbleFilter.disconnect) rumbleFilter.disconnect();
              if (rumbleGain.disconnect) rumbleGain.disconnect();
            } catch (e) {}
          }, 3000);
        }

        const nextThunder = setTimeout(thunder, 25000 + Math.random() * 35000);
        timeouts.push(nextThunder);
      }

      const firstThunder = setTimeout(thunder, 15000);
      timeouts.push(firstThunder);

      return { nodes, timeouts };
    } catch (err) {
      console.error('Error in rain ambient:', err);
      return null;
    }
  }

  /**
   * Snow ambient - very quiet, muffled ambient, soft wind
   */
  function playSnowAmbient() {
    if (!audioContext || !masterGain) return null;

    const nodes = [];

    try {
      // Soft wind
      const wind = createWhiteNoise();
      if (wind) {
        const windFilter = audioContext.createBiquadFilter();
        const windGain = audioContext.createGain();

        windFilter.type = 'lowpass';
        windFilter.frequency.value = 120;
        windGain.gain.value = 0.015;

        wind.connect(windFilter);
        windFilter.connect(windGain);
        windGain.connect(masterGain);

        nodes.push(wind, windFilter, windGain);
      }

      return { nodes };
    } catch (err) {
      console.error('Error in snow ambient:', err);
      return null;
    }
  }

  // ============================================================================
  // ZONE-SPECIFIC ENHANCEMENTS
  // ============================================================================

  let currentZoneAmbient = null;

  /**
   * Set zone-specific ambient layer (on top of base ambient)
   * @param {string} zone - Zone identifier
   */
  var crossfadeTimer = null;

  function setZoneAmbient(zone) {
    if (!audioContext || !masterGain) return;

    // Resume context if needed
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    // Clear any pending crossfade
    if (crossfadeTimer) {
      clearTimeout(crossfadeTimer);
      crossfadeTimer = null;
    }

    // Crossfade: stop old ambient immediately (kill noise sources), keep gain fade for smoothness
    var oldAmbient = currentZoneAmbient;
    if (oldAmbient) {
      // Fade out gain gracefully
      try {
        if (oldAmbient.gainNode) {
          oldAmbient.gainNode.gain.setValueAtTime(oldAmbient.gainNode.gain.value, audioContext.currentTime);
          oldAmbient.gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 1);
        }
      } catch(e) {}

      // Stop all sources immediately to prevent orphaned noise
      try {
        if (oldAmbient.oscillators && Array.isArray(oldAmbient.oscillators)) {
          oldAmbient.oscillators.forEach(function(osc) {
            if (osc && osc.stop) { try { osc.stop(); } catch(e) {} }
          });
        }
        if (oldAmbient.nodes && Array.isArray(oldAmbient.nodes)) {
          oldAmbient.nodes.forEach(function(node) {
            if (node) {
              if (node.stop) { try { node.stop(); } catch(e) {} }
              if (node.disconnect) { try { node.disconnect(); } catch(e) {} }
            }
          });
        }
        if (oldAmbient.intervals && Array.isArray(oldAmbient.intervals)) {
          oldAmbient.intervals.forEach(function(id) { clearInterval(id); });
        }
        if (oldAmbient.timeouts && Array.isArray(oldAmbient.timeouts)) {
          oldAmbient.timeouts.forEach(function(id) { clearTimeout(id); });
        }
        if (oldAmbient.cleanup && typeof oldAmbient.cleanup === 'function') {
          oldAmbient.cleanup();
        }
      } catch(err) {}

      killAllNoiseSources();
      currentZoneAmbient = null;
    }

    // Start new zone ambient immediately (will overlap with fading old one)
    try {
      switch (zone) {
        case 'nexus':
          currentZoneAmbient = playNexusZoneLayer();
          break;
        case 'gardens':
          currentZoneAmbient = playGardensZoneLayer();
          break;
        case 'athenaeum':
          currentZoneAmbient = playAthenaeumZoneLayer();
          break;
        case 'studio':
          currentZoneAmbient = playStudioZoneLayer();
          break;
        case 'wilds':
          currentZoneAmbient = playWildsZoneLayer();
          break;
        case 'agora':
          currentZoneAmbient = playAgoraZoneLayer();
          break;
        case 'commons':
          currentZoneAmbient = playCommonsZoneLayer();
          break;
        case 'arena':
          currentZoneAmbient = playArenaZoneLayer();
          break;
        default:
          currentZoneAmbient = null;
      }

      // Fade in new ambient over 3 seconds
      if (currentZoneAmbient && currentZoneAmbient.gainNode) {
        var gain = currentZoneAmbient.gainNode;
        var targetVal = gain.gain.value || 0.3;
        gain.gain.setValueAtTime(0, audioContext.currentTime);
        gain.gain.linearRampToValueAtTime(targetVal, audioContext.currentTime + 3);
      }
    } catch (err) {
      console.error('Error setting zone ambient:', err);
    }
  }

  /**
   * Stop current zone ambient layer
   */
  function stopZoneAmbient() {
    if (!currentZoneAmbient) return;

    try {
      if (currentZoneAmbient.oscillators && Array.isArray(currentZoneAmbient.oscillators)) {
        currentZoneAmbient.oscillators.forEach(osc => {
          if (osc && osc.stop) {
            try { osc.stop(); } catch (e) {}
          }
        });
      }

      if (currentZoneAmbient.nodes && Array.isArray(currentZoneAmbient.nodes)) {
        currentZoneAmbient.nodes.forEach(node => {
          if (node) {
            if (node.stop) {
              try { node.stop(); } catch (e) {}
            }
            if (node.disconnect) {
              try { node.disconnect(); } catch (e) {}
            }
          }
        });
      }

      if (currentZoneAmbient.intervals && Array.isArray(currentZoneAmbient.intervals)) {
        currentZoneAmbient.intervals.forEach(id => clearInterval(id));
      }

      if (currentZoneAmbient.timeouts && Array.isArray(currentZoneAmbient.timeouts)) {
        currentZoneAmbient.timeouts.forEach(id => clearTimeout(id));
      }

      if (currentZoneAmbient.cleanup && typeof currentZoneAmbient.cleanup === 'function') {
        currentZoneAmbient.cleanup();
      }
    } catch (err) {
      console.error('Error stopping zone ambient:', err);
    }

    currentZoneAmbient = null;
    killAllNoiseSources();
  }

  /**
   * Nexus zone layer - subtle crystalline resonance (high sine waves with slow LFO)
   */
  function playNexusZoneLayer() {
    if (!audioContext || !masterGain) return null;

    const oscillators = [];
    const nodes = [];

    try {
      // Soft crystalline shimmer — two detuned sines at gentle frequencies
      const crystal1 = audioContext.createOscillator();
      const crystal2 = audioContext.createOscillator();
      const lfo = audioContext.createOscillator();
      const lfoGain = audioContext.createGain();
      const layerGain = audioContext.createGain();

      crystal1.type = 'sine';
      crystal1.frequency.value = 523; // C5 — much gentler than 2000Hz

      crystal2.type = 'sine';
      crystal2.frequency.value = 659; // E5 — harmonic interval

      lfo.type = 'sine';
      lfo.frequency.value = 0.12;
      lfoGain.gain.value = 8; // subtle vibrato

      layerGain.gain.value = 0.012; // very quiet

      lfo.connect(lfoGain);
      lfoGain.connect(crystal1.frequency);
      lfoGain.connect(crystal2.frequency);

      crystal1.connect(layerGain);
      crystal2.connect(layerGain);
      layerGain.connect(masterGain);

      crystal1.start();
      crystal2.start();
      lfo.start();

      oscillators.push(crystal1, crystal2, lfo);
      nodes.push(lfoGain, layerGain);

      return { oscillators, nodes, gainNode: layerGain };
    } catch (err) {
      console.error('Error in nexus zone layer:', err);
      return null;
    }
  }

  /**
   * Gardens zone layer - water trickling, more birds
   */
  function playGardensZoneLayer() {
    if (!audioContext || !masterGain) return null;

    const nodes = [];
    const timeouts = [];

    try {
      // Water trickling - filtered noise with LFO
      const water = createWhiteNoise();
      if (water) {
        const waterFilter = audioContext.createBiquadFilter();
        const waterLfo = audioContext.createOscillator();
        const waterLfoGain = audioContext.createGain();
        const waterGain = audioContext.createGain();

        waterFilter.type = 'highpass';
        waterFilter.frequency.value = 2000;

        waterLfo.type = 'sine';
        waterLfo.frequency.value = 0.8;
        waterLfoGain.gain.value = 50;

        waterGain.gain.value = 0.03;

        waterLfo.connect(waterLfoGain);
        waterLfoGain.connect(waterFilter.frequency);

        water.connect(waterFilter);
        waterFilter.connect(waterGain);
        waterGain.connect(masterGain);

        waterLfo.start();

        nodes.push(water, waterFilter, waterLfo, waterLfoGain, waterGain);
      }

      return { nodes, timeouts, gainNode: nodes.length > 0 ? nodes[nodes.length - 1] : null };
    } catch (err) {
      console.error('Error in gardens zone layer:', err);
      return null;
    }
  }

  /**
   * Athenaeum zone layer - echo/reverb quality, page rustling
   */
  function playAthenaeumZoneLayer() {
    if (!audioContext || !masterGain) return null;

    const nodes = [];
    const timeouts = [];

    try {
      // Page rustling - short noise bursts
      function pageRustle() {
        if (!audioContext || !masterGain) return;

        const page = createWhiteNoise(2);
        if (page) {
          const pageFilter = audioContext.createBiquadFilter();
          const pageGain = audioContext.createGain();

          pageFilter.type = 'highpass';
          pageFilter.frequency.value = 2500;

          pageGain.gain.value = 0.02;
          pageGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.08);

          page.connect(pageFilter);
          pageFilter.connect(pageGain);
          pageGain.connect(masterGain);

          setTimeout(() => {
            try {
              if (page.stop) page.stop();
              if (pageFilter.disconnect) pageFilter.disconnect();
              if (pageGain.disconnect) pageGain.disconnect();
            } catch (e) {}
          }, 100);
        }

        const nextRustle = setTimeout(pageRustle, 10000 + Math.random() * 10000);
        timeouts.push(nextRustle);
      }

      const firstRustle = setTimeout(pageRustle, 5000);
      timeouts.push(firstRustle);

      return { nodes, timeouts, gainNode: null };
    } catch (err) {
      console.error('Error in athenaeum zone layer:', err);
      return null;
    }
  }

  /**
   * Studio zone layer - creative sounds (random melodic tones, tapping)
   */
  function playStudioZoneLayer() {
    if (!audioContext || !masterGain) return null;

    const nodes = [];
    const timeouts = [];

    try {
      // Random melodic tones
      function creativeNote() {
        if (!audioContext || !masterGain) return;

        const notes = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00];
        const note = audioContext.createOscillator();
        const noteGain = audioContext.createGain();

        note.type = 'sine';
        note.frequency.value = notes[Math.floor(Math.random() * notes.length)];

        noteGain.gain.value = 0.025;
        noteGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);

        note.connect(noteGain);
        noteGain.connect(masterGain);

        note.start();
        note.stop(audioContext.currentTime + 0.3);

        const nextNote = setTimeout(creativeNote, 8000 + Math.random() * 12000);
        timeouts.push(nextNote);
      }

      const firstNote = setTimeout(creativeNote, 4000);
      timeouts.push(firstNote);

      return { nodes, timeouts, gainNode: null };
    } catch (err) {
      console.error('Error in studio zone layer:', err);
      return null;
    }
  }

  /**
   * Wilds zone layer - dense nature sounds, rushing water
   */
  function playWildsZoneLayer() {
    if (!audioContext || !masterGain) return null;

    const nodes = [];

    try {
      // Rushing water - white noise with bandpass
      const water = createWhiteNoise();
      if (water) {
        const waterFilter = audioContext.createBiquadFilter();
        const waterGain = audioContext.createGain();

        waterFilter.type = 'bandpass';
        waterFilter.frequency.value = 800;
        waterFilter.Q.value = 1;

        waterGain.gain.value = 0.04;

        water.connect(waterFilter);
        waterFilter.connect(waterGain);
        waterGain.connect(masterGain);

        nodes.push(water, waterFilter, waterGain);
      }

      return { nodes, gainNode: nodes.length > 0 ? nodes[nodes.length - 1] : null };
    } catch (err) {
      console.error('Error in wilds zone layer:', err);
      return null;
    }
  }

  /**
   * Agora zone layer - crowd murmur, occasional calls
   */
  function playAgoraZoneLayer() {
    if (!audioContext || !masterGain) return null;

    const nodes = [];
    const timeouts = [];

    try {
      // Enhanced crowd murmur
      const crowd = createWhiteNoise();
      if (crowd) {
        const crowdFilter = audioContext.createBiquadFilter();
        const crowdGain = audioContext.createGain();

        crowdFilter.type = 'bandpass';
        crowdFilter.frequency.value = 450;
        crowdFilter.Q.value = 1.2;

        crowdGain.gain.value = 0.025;

        crowd.connect(crowdFilter);
        crowdFilter.connect(crowdGain);
        crowdGain.connect(masterGain);

        nodes.push(crowd, crowdFilter, crowdGain);
      }

      return { nodes, timeouts, gainNode: nodes.length > 0 ? nodes[nodes.length - 1] : null };
    } catch (err) {
      console.error('Error in agora zone layer:', err);
      return null;
    }
  }

  /**
   * Commons zone layer - homey sounds (crackling fire, wind chimes)
   */
  function playCommonsZoneLayer() {
    if (!audioContext || !masterGain) return null;

    const nodes = [];
    const timeouts = [];

    try {
      // Wind chimes - random high notes
      function chime() {
        if (!audioContext || !masterGain) return;

        const bell = audioContext.createOscillator();
        const bellGain = audioContext.createGain();

        bell.type = 'sine';
        bell.frequency.value = 800 + Math.random() * 600;

        bellGain.gain.value = 0.03;
        bellGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1.5);

        bell.connect(bellGain);
        bellGain.connect(masterGain);

        bell.start();
        bell.stop(audioContext.currentTime + 1.5);

        const nextChime = setTimeout(chime, 5000 + Math.random() * 8000);
        timeouts.push(nextChime);
      }

      const firstChime = setTimeout(chime, 3000);
      timeouts.push(firstChime);

      return { nodes, timeouts, gainNode: null };
    } catch (err) {
      console.error('Error in commons zone layer:', err);
      return null;
    }
  }

  /**
   * Arena zone layer - echoing space (slight delay)
   */
  function playArenaZoneLayer() {
    if (!audioContext || !masterGain) return null;

    const nodes = [];

    try {
      // Subtle echo ambiance
      const echo = createWhiteNoise(2);
      if (echo) {
        const echoFilter = audioContext.createBiquadFilter();
        const echoDelay = audioContext.createDelay();
        const echoDelayGain = audioContext.createGain();
        const echoGain = audioContext.createGain();

        echoFilter.type = 'bandpass';
        echoFilter.frequency.value = 700;
        echoFilter.Q.value = 0.8;

        echoDelay.delayTime.value = 0.3;
        echoDelayGain.gain.value = 0.3;

        echoGain.gain.value = 0.02;

        echo.connect(echoFilter);
        echoFilter.connect(echoGain);
        echoGain.connect(masterGain);
        echoGain.connect(echoDelay);
        echoDelay.connect(echoDelayGain);
        echoDelayGain.connect(masterGain);

        nodes.push(echo, echoFilter, echoDelay, echoDelayGain, echoGain);
      }

      return { nodes, gainNode: nodes.length > 0 ? nodes[nodes.length - 1] : null };
    } catch (err) {
      console.error('Error in arena zone layer:', err);
      return null;
    }
  }

  // ============================================================================
  // NPC SOUNDS
  // ============================================================================

  /**
   * Play NPC activity sound
   * @param {string} type - hammer, music, garden, trade, teach, heal
   */
  function playNPCSound(type) {
    if (!audioContext || !masterGain) return;

    // Resume context if needed
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    try {
      switch (type) {
        case 'hammer':
          playNPCHammerSound();
          break;
        case 'music':
          playNPCMusicSound();
          break;
        case 'garden':
          playNPCGardenSound();
          break;
        case 'trade':
          playNPCTradeSound();
          break;
        case 'teach':
          playNPCTeachSound();
          break;
        case 'heal':
          playNPCHealSound();
          break;
        default:
          console.warn('Unknown NPC sound type:', type);
      }
    } catch (err) {
      console.error('Error playing NPC sound:', err);
    }
  }

  /**
   * NPC hammer sound - metallic clang
   */
  function playNPCHammerSound() {
    if (!audioContext || !masterGain) return;

    const hammer = audioContext.createOscillator();
    const hammerGain = audioContext.createGain();

    hammer.type = 'square';
    hammer.frequency.value = 90;

    hammerGain.gain.value = 0.08;
    hammerGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);

    hammer.connect(hammerGain);
    hammerGain.connect(masterGain);

    hammer.start();
    hammer.stop(audioContext.currentTime + 0.2);

    // Metal ring
    const ring = audioContext.createOscillator();
    const ringGain = audioContext.createGain();

    ring.type = 'sine';
    ring.frequency.value = 2500;

    ringGain.gain.value = 0.04;
    ringGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);

    ring.connect(ringGain);
    ringGain.connect(masterGain);

    ring.start();
    ring.stop(audioContext.currentTime + 0.3);
  }

  /**
   * NPC music sound - short melodic phrase
   */
  function playNPCMusicSound() {
    if (!audioContext || !masterGain) return;

    const notes = [392.00, 440.00, 493.88]; // G4, A4, B4

    notes.forEach((freq, i) => {
      const note = audioContext.createOscillator();
      const noteGain = audioContext.createGain();

      note.type = 'sine';
      note.frequency.value = freq;

      const startTime = audioContext.currentTime + i * 0.15;
      noteGain.gain.setValueAtTime(0, startTime);
      noteGain.gain.linearRampToValueAtTime(0.05, startTime + 0.02);
      noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

      note.connect(noteGain);
      noteGain.connect(masterGain);

      note.start(startTime);
      note.stop(startTime + 0.25);
    });
  }

  /**
   * NPC garden sound - rustling, digging
   */
  function playNPCGardenSound() {
    if (!audioContext || !masterGain) return;

    const rustle = createWhiteNoise(2);
    if (rustle) {
      const rustleFilter = audioContext.createBiquadFilter();
      const rustleGain = audioContext.createGain();

      rustleFilter.type = 'bandpass';
      rustleFilter.frequency.value = 1200;
      rustleFilter.Q.value = 2;

      rustleGain.gain.value = 0.06;
      rustleGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);

      rustle.connect(rustleFilter);
      rustleFilter.connect(rustleGain);
      rustleGain.connect(masterGain);

      setTimeout(() => {
        try {
          if (rustle.stop) rustle.stop();
          if (rustleFilter.disconnect) rustleFilter.disconnect();
          if (rustleGain.disconnect) rustleGain.disconnect();
        } catch (e) {}
      }, 350);
    }
  }

  /**
   * NPC trade sound - coin clink
   */
  function playNPCTradeSound() {
    if (!audioContext || !masterGain) return;

    const coin = audioContext.createOscillator();
    const coinGain = audioContext.createGain();

    coin.type = 'triangle';
    coin.frequency.value = 1800 + Math.random() * 500;

    coinGain.gain.value = 0.06;
    coinGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);

    coin.connect(coinGain);
    coinGain.connect(masterGain);

    coin.start();
    coin.stop(audioContext.currentTime + 0.2);
  }

  /**
   * NPC teach sound - book thump and page turn
   */
  function playNPCTeachSound() {
    if (!audioContext || !masterGain) return;

    // Book thump
    const thump = audioContext.createOscillator();
    const thumpGain = audioContext.createGain();

    thump.type = 'sine';
    thump.frequency.value = 80;

    thumpGain.gain.value = 0.05;
    thumpGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);

    thump.connect(thumpGain);
    thumpGain.connect(masterGain);

    thump.start();
    thump.stop(audioContext.currentTime + 0.1);

    // Page turn
    setTimeout(() => {
      const page = createWhiteNoise(2);
      if (page) {
        const pageFilter = audioContext.createBiquadFilter();
        const pageGain = audioContext.createGain();

        pageFilter.type = 'highpass';
        pageFilter.frequency.value = 2200;

        pageGain.gain.value = 0.04;
        pageGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15);

        page.connect(pageFilter);
        pageFilter.connect(pageGain);
        pageGain.connect(masterGain);

        setTimeout(() => {
          try {
            if (page.stop) page.stop();
            if (pageFilter.disconnect) pageFilter.disconnect();
            if (pageGain.disconnect) pageGain.disconnect();
          } catch (e) {}
        }, 180);
      }
    }, 100);
  }

  /**
   * NPC heal sound - gentle sparkle
   */
  function playNPCHealSound() {
    if (!audioContext || !masterGain) return;

    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5

    notes.forEach((freq, i) => {
      const note = audioContext.createOscillator();
      const noteGain = audioContext.createGain();

      note.type = 'sine';
      note.frequency.value = freq;

      const startTime = audioContext.currentTime + i * 0.1;
      noteGain.gain.setValueAtTime(0, startTime);
      noteGain.gain.linearRampToValueAtTime(0.04, startTime + 0.02);
      noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

      note.connect(noteGain);
      noteGain.connect(masterGain);

      note.start(startTime);
      note.stop(startTime + 0.3);
    });
  }

  // ========================================================================
  // PROCEDURAL MUSIC SYSTEM — Generative ambient music per zone/time
  // ========================================================================

  var musicState = {
    playing: false,
    zone: null,
    timeOfDay: 'day',
    volume: 0.12,
    oscillators: [],
    gains: [],
    nextNoteTime: 0,
    noteIndex: 0,
    chordIndex: 0,
    arpIndex: 0,
    beatTimer: null,
    padNodes: [],
    melodyTimeout: null
  };

  // Musical scales (frequencies in Hz)
  var SCALES = {
    // Pentatonic scales in 432Hz tuning — warm, focus-friendly
    nexus:     [256.87, 288.33, 323.63, 384.91, 432.00, 513.74, 576.65, 647.25],  // C major pentatonic
    gardens:   [288.33, 323.63, 363.27, 432.00, 484.90, 576.65, 647.25, 726.53],  // D major pentatonic
    athenaeum: [242.45, 272.18, 323.63, 363.27, 407.75, 484.90, 544.36, 647.25],  // B minor pentatonic
    studio:    [323.63, 363.27, 407.75, 484.90, 544.36, 647.25, 726.53, 815.51],  // E major pentatonic
    wilds:     [216.00, 256.87, 288.33, 323.63, 384.91, 432.00, 513.74, 576.65],  // A minor pentatonic
    agora:     [342.88, 384.91, 432.00, 513.74, 576.65, 685.76, 769.82, 864.00],  // F major pentatonic
    commons:   [288.33, 342.88, 384.91, 432.00, 513.74, 576.65, 685.76, 769.82],  // D mixolydian penta
    arena:     [192.43, 228.84, 256.87, 288.33, 342.88, 384.91, 457.69, 513.74]   // G minor pentatonic
  };

  // Chord progressions per zone (indices into the scale)
  var CHORD_PROGRESSIONS = {
    nexus:     [[0, 2, 4], [1, 3, 5], [2, 4, 6], [0, 3, 5]],
    gardens:   [[0, 2, 4], [2, 4, 6], [1, 3, 5], [0, 2, 5]],
    athenaeum: [[0, 2, 4], [1, 3, 5], [0, 3, 5], [2, 4, 6]],
    studio:    [[0, 2, 4], [1, 4, 6], [2, 4, 6], [0, 3, 5]],
    wilds:     [[0, 2, 4], [1, 3, 5], [0, 2, 5], [1, 4, 6]],
    agora:     [[0, 2, 4], [1, 3, 5], [2, 4, 6], [0, 2, 5]],
    commons:   [[0, 2, 4], [2, 4, 6], [1, 3, 5], [0, 3, 5]],
    arena:     [[0, 2, 4], [0, 3, 5], [1, 4, 6], [2, 4, 6]]
  };

  // Tempo and feel per zone (beat duration in seconds)
  var ZONE_MUSIC_STYLE = {
    nexus:     { beatDuration: 2.8, padVolume: 0.07, melodyChance: 0.15, melodyVolume: 0.03, type: 'ethereal' },
    gardens:   { beatDuration: 2.4, padVolume: 0.06, melodyChance: 0.2,  melodyVolume: 0.035, type: 'pastoral' },
    athenaeum: { beatDuration: 3.2, padVolume: 0.05, melodyChance: 0.1,  melodyVolume: 0.025, type: 'mysterious' },
    studio:    { beatDuration: 2.0, padVolume: 0.06, melodyChance: 0.25, melodyVolume: 0.04, type: 'creative' },
    wilds:     { beatDuration: 3.0, padVolume: 0.04, melodyChance: 0.12, melodyVolume: 0.03, type: 'nature' },
    agora:     { beatDuration: 1.8, padVolume: 0.05, melodyChance: 0.2,  melodyVolume: 0.035, type: 'lively' },
    commons:   { beatDuration: 2.4, padVolume: 0.06, melodyChance: 0.18, melodyVolume: 0.03, type: 'warm' },
    arena:     { beatDuration: 2.0, padVolume: 0.07, melodyChance: 0.15, melodyVolume: 0.035, type: 'dramatic' }
  };

  // Time-of-day modifiers
  var TIME_MODIFIERS = {
    dawn:    { tempoMult: 0.8, volumeMult: 0.6, melodyMult: 0.5, octaveShift: 0 },
    morning: { tempoMult: 0.9, volumeMult: 0.8, melodyMult: 0.8, octaveShift: 0 },
    midday:  { tempoMult: 1.0, volumeMult: 1.0, melodyMult: 1.0, octaveShift: 0 },
    afternoon: { tempoMult: 1.0, volumeMult: 0.9, melodyMult: 0.9, octaveShift: 0 },
    evening: { tempoMult: 0.85, volumeMult: 0.7, melodyMult: 0.6, octaveShift: -1 },
    night:   { tempoMult: 0.7, volumeMult: 0.4, melodyMult: 0.3, octaveShift: -1 }
  };

  function startMusic(zone, timeOfDay) {
    if (!audioContext || !masterGain) return;
    zone = zone || 'nexus';
    timeOfDay = timeOfDay || 'midday';

    // Stop existing music if playing
    if (musicState.playing) {
      stopMusic();
    }

    musicState.zone = zone;
    musicState.timeOfDay = timeOfDay;
    musicState.playing = true;
    musicState.chordIndex = 0;
    musicState.noteIndex = 0;
    musicState.arpIndex = 0;

    // Start the pad drone
    playPadChord();

    // Schedule melody notes
    scheduleMelody();
  }

  function playPadChord() {
    if (!audioContext || !masterGain || !musicState.playing) return;

    var zone = musicState.zone || 'nexus';
    var scale = SCALES[zone] || SCALES.nexus;
    var progression = CHORD_PROGRESSIONS[zone] || CHORD_PROGRESSIONS.nexus;
    var style = ZONE_MUSIC_STYLE[zone] || ZONE_MUSIC_STYLE.nexus;
    var timeMod = TIME_MODIFIERS[musicState.timeOfDay] || TIME_MODIFIERS.midday;

    var chordIndices = progression[musicState.chordIndex % progression.length];
    var beatDur = style.beatDuration / timeMod.tempoMult;
    var chordDuration = beatDur * 4; // 4 beats per chord

    // Clean up old pad nodes
    cleanupPadNodes();

    // Create pad oscillators for each note in the chord
    for (var i = 0; i < chordIndices.length; i++) {
      var noteIdx = chordIndices[i];
      var freq = scale[noteIdx % scale.length];

      // Apply octave shift for time of day
      if (timeMod.octaveShift < 0) freq *= 0.5;
      if (timeMod.octaveShift > 0) freq *= 2;

      // Pad uses two detuned oscillators for warmth
      for (var d = 0; d < 2; d++) {
        var osc = audioContext.createOscillator();
        var gain = audioContext.createGain();
        var filter = audioContext.createBiquadFilter();

        osc.type = (style.type === 'ethereal' || style.type === 'mysterious') ? 'sine' : 'triangle';
        osc.frequency.value = freq + (d === 0 ? -1.5 : 1.5); // lo-fi warm detune

        filter.type = 'lowpass';
        filter.frequency.value = 500;
        filter.Q.value = 0.7;

        var padVol = style.padVolume * timeMod.volumeMult * musicState.volume;
        var now = audioContext.currentTime;

        // Fade in
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(padVol, now + chordDuration * 0.15);
        // Sustain
        gain.gain.setValueAtTime(padVol, now + chordDuration * 0.7);
        // Fade out
        gain.gain.linearRampToValueAtTime(0, now + chordDuration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);

        osc.start(now);
        osc.stop(now + chordDuration + 0.1);

        musicState.padNodes.push({ osc: osc, gain: gain, filter: filter, endTime: now + chordDuration + 0.2 });
      }
    }

    // Arpeggio — occasionally play individual notes from the chord
    if (Math.random() < 0.6) {
      var arpDelay = beatDur * 0.5;
      for (var a = 0; a < 3; a++) {
        (function(arpIdx, delay) {
          setTimeout(function() {
            if (!musicState.playing || !audioContext) return;
            var arpFreq = scale[chordIndices[arpIdx % chordIndices.length] % scale.length];
            if (timeMod.octaveShift < 0) arpFreq *= 0.5;
            arpFreq *= 2; // One octave up for sparkle

            var arpOsc = audioContext.createOscillator();
            var arpGain = audioContext.createGain();

            arpOsc.type = 'sine';
            arpOsc.frequency.value = arpFreq;

            var arpVol = style.melodyVolume * timeMod.volumeMult * musicState.volume * 0.6;
            var t = audioContext.currentTime;
            arpGain.gain.setValueAtTime(0, t);
            arpGain.gain.linearRampToValueAtTime(arpVol, t + 0.05);
            arpGain.gain.exponentialRampToValueAtTime(0.001, t + beatDur * 0.8);

            arpOsc.connect(arpGain);
            arpGain.connect(masterGain);
            arpOsc.start(t);
            arpOsc.stop(t + beatDur);
          }, delay * 1000);
        })(a, arpDelay * (a + 1));
      }
    }

    // Schedule next chord
    musicState.chordIndex++;
    musicState.beatTimer = setTimeout(function() {
      if (musicState.playing) playPadChord();
    }, chordDuration * 1000);
  }

  function scheduleMelody() {
    if (!audioContext || !masterGain || !musicState.playing) return;

    var zone = musicState.zone || 'nexus';
    var scale = SCALES[zone] || SCALES.nexus;
    var style = ZONE_MUSIC_STYLE[zone] || ZONE_MUSIC_STYLE.nexus;
    var timeMod = TIME_MODIFIERS[musicState.timeOfDay] || TIME_MODIFIERS.midday;

    var melodyChance = style.melodyChance * timeMod.melodyMult;
    var beatDur = style.beatDuration / timeMod.tempoMult;

    // Random delay before next melody note
    var delay = beatDur * (1 + Math.random() * 3);

    musicState.melodyTimeout = setTimeout(function() {
      if (!musicState.playing || !audioContext) return;

      if (Math.random() < melodyChance) {
        // Pick a note from the scale — favor stepwise motion
        var direction = Math.random() < 0.5 ? 1 : -1;
        var step = Math.random() < 0.7 ? 1 : 2;
        musicState.noteIndex = Math.max(0, Math.min(scale.length - 1, musicState.noteIndex + direction * step));
        var freq = scale[musicState.noteIndex];
        if (timeMod.octaveShift < 0) freq *= 0.5;
        freq *= 2; // Melody one octave up

        var melOsc = audioContext.createOscillator();
        var melGain = audioContext.createGain();
        var melFilter = audioContext.createBiquadFilter();

        // Vary timbre by zone
        if (style.type === 'nature' || style.type === 'pastoral') {
          melOsc.type = 'sine';
        } else if (style.type === 'dramatic' || style.type === 'lively') {
          melOsc.type = 'triangle';
        } else {
          melOsc.type = Math.random() < 0.5 ? 'sine' : 'triangle';
        }

        melOsc.frequency.value = freq;

        melFilter.type = 'lowpass';
        melFilter.frequency.value = 700;

        var melVol = style.melodyVolume * timeMod.volumeMult * musicState.volume;
        var noteDur = beatDur * (0.5 + Math.random() * 1.5);
        var t = audioContext.currentTime;

        melGain.gain.setValueAtTime(0, t);
        melGain.gain.linearRampToValueAtTime(melVol, t + 0.03);
        melGain.gain.setValueAtTime(melVol * 0.8, t + noteDur * 0.5);
        melGain.gain.exponentialRampToValueAtTime(0.001, t + noteDur);

        melOsc.connect(melFilter);
        melFilter.connect(melGain);
        melGain.connect(masterGain);

        melOsc.start(t);
        melOsc.stop(t + noteDur + 0.1);

        // Occasionally add a harmony note
        if (Math.random() < 0.25) {
          var harmIdx = (musicState.noteIndex + 2) % scale.length;
          var harmFreq = scale[harmIdx] * 2;
          if (timeMod.octaveShift < 0) harmFreq *= 0.5;

          var harmOsc = audioContext.createOscillator();
          var harmGain = audioContext.createGain();

          harmOsc.type = 'sine';
          harmOsc.frequency.value = harmFreq;

          var harmVol = melVol * 0.4;
          harmGain.gain.setValueAtTime(0, t + 0.05);
          harmGain.gain.linearRampToValueAtTime(harmVol, t + 0.1);
          harmGain.gain.exponentialRampToValueAtTime(0.001, t + noteDur * 0.8);

          harmOsc.connect(harmGain);
          harmGain.connect(masterGain);
          harmOsc.start(t + 0.05);
          harmOsc.stop(t + noteDur);
        }
      }

      // Schedule next melody note
      scheduleMelody();
    }, delay * 1000);
  }

  function cleanupPadNodes() {
    var now = audioContext ? audioContext.currentTime : 0;
    musicState.padNodes = musicState.padNodes.filter(function(node) {
      if (now > node.endTime) {
        try {
          node.osc.disconnect();
          node.gain.disconnect();
          node.filter.disconnect();
        } catch (e) {}
        return false;
      }
      return true;
    });
  }

  function stopMusic() {
    musicState.playing = false;

    if (musicState.beatTimer) {
      clearTimeout(musicState.beatTimer);
      musicState.beatTimer = null;
    }
    if (musicState.melodyTimeout) {
      clearTimeout(musicState.melodyTimeout);
      musicState.melodyTimeout = null;
    }

    // Fade out all pad nodes
    for (var i = 0; i < musicState.padNodes.length; i++) {
      try {
        var node = musicState.padNodes[i];
        if (node.gain && audioContext) {
          node.gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);
        }
      } catch (e) {}
    }

    // Clean up after fade
    setTimeout(function() {
      for (var i = 0; i < musicState.padNodes.length; i++) {
        try {
          musicState.padNodes[i].osc.disconnect();
          musicState.padNodes[i].gain.disconnect();
          musicState.padNodes[i].filter.disconnect();
        } catch (e) {}
      }
      musicState.padNodes = [];
    }, 600);
  }

  function updateMusic(zone, timeOfDay) {
    if (!musicState.playing) return;
    if (zone && zone !== musicState.zone) {
      startMusic(zone, timeOfDay || musicState.timeOfDay);
    } else if (timeOfDay && timeOfDay !== musicState.timeOfDay) {
      musicState.timeOfDay = timeOfDay;
      // Time changes take effect on next chord cycle naturally
    }
  }

  function setMusicVolume(vol) {
    musicState.volume = Math.max(0, Math.min(1, vol));
  }

  function isMusicPlaying() {
    return musicState.playing;
  }

  // ─── Piano Accent System (BotW-style environmental cues) ──────────────────

  // Piano-like timbre: layered sine + soft triangle with fast attack, gentle decay
  // Each accent is a short melodic phrase triggered by world events

  var PIANO_ACCENTS = {
    dawn: {
      // Ascending bright arpeggio — C major pentatonic, hopeful
      notes: [261.63, 329.63, 392.00, 523.25, 659.25],
      noteSpacing: 0.12,
      noteDuration: 0.6,
      volume: 0.05
    },
    morning: {
      // Warm arpeggiated phrase — G major, gentle awakening
      notes: [392.00, 493.88, 587.33, 783.99, 987.77, 783.99],
      noteSpacing: 0.1,
      noteDuration: 0.5,
      volume: 0.04
    },
    dusk: {
      // Descending gentle — Am pentatonic, wistful
      notes: [880.00, 659.25, 523.25, 440.00, 329.63],
      noteSpacing: 0.15,
      noteDuration: 0.7,
      volume: 0.04
    },
    night: {
      // Low mysterious — Dm tones, sparse and atmospheric
      notes: [146.83, 174.61, 220.00, 196.00, 146.83],
      noteSpacing: 0.22,
      noteDuration: 0.9,
      volume: 0.04
    },
    zone_discovery: {
      // Flourish — ascending with a resolving turn, wonder
      notes: [392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 659.25, 783.99],
      noteSpacing: 0.09,
      noteDuration: 0.45,
      volume: 0.06
    },
    quest_complete: {
      // Triumphant fanfare phrase — C major with octave leap
      notes: [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50, 1318.51],
      noteSpacing: 0.1,
      noteDuration: 0.5,
      volume: 0.06
    },
    achievement: {
      // Playful ascending — sparkling discovery
      notes: [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50],
      noteSpacing: 0.08,
      noteDuration: 0.4,
      volume: 0.06
    }
  };

  function playPianoAccent(type) {
    if (!audioContext || !masterGain) return;
    var accent = PIANO_ACCENTS[type];
    if (!accent) return;

    // Resume context if suspended
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    var musicVol = volumeLevels.music !== undefined ? volumeLevels.music : 0.5;
    var baseVol = accent.volume * musicVol;

    try {
      for (var i = 0; i < accent.notes.length; i++) {
        (function(idx) {
          var freq = accent.notes[idx];
          var startTime = audioContext.currentTime + idx * accent.noteSpacing;

          // Layer 1: sine wave (fundamental — warm piano body)
          var osc1 = audioContext.createOscillator();
          var gain1 = audioContext.createGain();
          osc1.type = 'sine';
          osc1.frequency.value = freq;
          gain1.gain.setValueAtTime(0, startTime);
          gain1.gain.linearRampToValueAtTime(baseVol, startTime + 0.015);
          gain1.gain.exponentialRampToValueAtTime(baseVol * 0.6, startTime + accent.noteDuration * 0.3);
          gain1.gain.exponentialRampToValueAtTime(0.001, startTime + accent.noteDuration);
          osc1.connect(gain1);
          gain1.connect(masterGain);
          osc1.start(startTime);
          osc1.stop(startTime + accent.noteDuration + 0.05);

          // Layer 2: triangle wave (soft harmonic — adds "hammer" brightness)
          var osc2 = audioContext.createOscillator();
          var gain2 = audioContext.createGain();
          osc2.type = 'triangle';
          osc2.frequency.value = freq * 2; // octave above for shimmer
          gain2.gain.setValueAtTime(0, startTime);
          gain2.gain.linearRampToValueAtTime(baseVol * 0.3, startTime + 0.01);
          gain2.gain.exponentialRampToValueAtTime(0.001, startTime + accent.noteDuration * 0.5);
          osc2.connect(gain2);
          gain2.connect(masterGain);
          osc2.start(startTime);
          osc2.stop(startTime + accent.noteDuration * 0.5 + 0.05);

          // Layer 3: very quiet high sine for soft attack (reduced from 4x to 3x, minimal volume)
          var osc3 = audioContext.createOscillator();
          var gain3 = audioContext.createGain();
          osc3.type = 'sine';
          osc3.frequency.value = freq * 3;
          gain3.gain.setValueAtTime(0, startTime);
          gain3.gain.linearRampToValueAtTime(baseVol * 0.03, startTime + 0.005);
          gain3.gain.exponentialRampToValueAtTime(0.001, startTime + 0.06);
          osc3.connect(gain3);
          gain3.connect(masterGain);
          osc3.start(startTime);
          osc3.stop(startTime + 0.1);
        })(i);
      }
    } catch (err) {
      // Graceful degradation — no crash if Web Audio fails
    }
  }

  function getPianoAccentTypes() {
    return PIANO_ACCENTS;
  }

  // Export public API
  exports.initAudio = initAudio;
  exports.playAmbient = playAmbient;
  exports.playSound = playSound;
  exports.playFootstep = playFootstep;
  exports.setVolume = setVolume;
  exports.mute = mute;
  exports.unmute = unmute;
  exports.stopAll = stopAll;

  // Time-of-day and weather ambient
  exports.updateAmbientTime = updateAmbientForTime;
  exports.updateAmbientWeather = updateAmbientForWeather;
  exports.setZoneAmbient = setZoneAmbient;

  // NPC sounds
  exports.playNPCSound = playNPCSound;

  // Music system
  exports.startMusic = startMusic;
  exports.stopMusic = stopMusic;
  exports.updateMusic = updateMusic;
  exports.setMusicVolume = setMusicVolume;
  exports.isMusicPlaying = isMusicPlaying;

  // Piano accent system
  exports.playPianoAccent = playPianoAccent;
  exports.getPianoAccentTypes = getPianoAccentTypes;

})(typeof module !== 'undefined' ? module.exports : (window.Audio = {}));
