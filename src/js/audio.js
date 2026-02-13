(function(exports) {
  // Procedural audio system using Web Audio API
  // All audio is generated procedurally - no external files

  let audioContext = null;
  let masterGain = null;
  let isMuted = false;
  let currentAmbient = null;

  /**
   * Initialize audio context
   * @returns {AudioContext|null}
   */
  function initAudio() {
    if (typeof AudioContext === 'undefined' && typeof webkitAudioContext === 'undefined') {
      console.warn('Web Audio API not available');
      return null;
    }

    try {
      audioContext = new (AudioContext || webkitAudioContext)();

      // Create master gain node
      masterGain = audioContext.createGain();
      if (masterGain) {
        masterGain.connect(audioContext.destination);
        masterGain.gain.value = 0.5; // Default volume
      }

      // Resume context if suspended (browser autoplay policy)
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
      }

      console.log('Audio system initialized');
      return audioContext;
    } catch (err) {
      console.error('Failed to initialize audio:', err);
      return null;
    }
  }

  /**
   * Create white noise buffer
   * @returns {AudioBufferSourceNode|null}
   */
  function createWhiteNoise() {
    if (!audioContext) return null;

    try {
      const bufferSize = 2 * audioContext.sampleRate;
      const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = audioContext.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;
      whiteNoise.start();

      return whiteNoise;
    } catch (err) {
      console.error('Error creating white noise:', err);
      return null;
    }
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
        chime.frequency.value = 1000 + Math.random() * 1000;

        chimeGain.gain.value = 0.08;
        chimeGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1.5);

        delay1.delayTime.value = 0.3;
        delay2.delayTime.value = 0.5;
        delayGain1.gain.value = 0.3;
        delayGain2.gain.value = 0.2;

        chime.connect(chimeGain);
        chimeGain.connect(masterGain);
        chimeGain.connect(delay1);
        chimeGain.connect(delay2);
        delay1.connect(delayGain1);
        delay2.connect(delayGain2);
        delayGain1.connect(masterGain);
        delayGain2.connect(masterGain);

        chime.start();
        chime.stop(audioContext.currentTime + 1.5);

        const nextChime = setTimeout(playChime, 4000 + Math.random() * 4000);
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

        streamGain.gain.value = 0.04;

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
        breezeGain.gain.value = 0.02;

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

        const noise = createWhiteNoise();
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

        const page = createWhiteNoise();
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

        const quill = createWhiteNoise();
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
        windGain.gain.value = 0.08;

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

        const rumble = createWhiteNoise();
        if (rumble) {
          const rumbleFilter = audioContext.createBiquadFilter();
          const rumbleGain = audioContext.createGain();

          rumbleFilter.type = 'lowpass';
          rumbleFilter.frequency.value = 60;

          rumbleGain.gain.value = 0.12;
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

        const brush = createWhiteNoise();
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

        crowdGain.gain.value = 0.05;

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

        const cart = createWhiteNoise();
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

        chatterGain.gain.value = 0.03;

        chatter.connect(chatterFilter);
        chatterFilter.connect(chatterGain);
        chatterGain.connect(masterGain);

        nodes.push(chatter, chatterFilter, chatterGain);
      }

      // Fire crackling - continuous random bursts
      function crackle() {
        if (!audioContext || !masterGain) return;

        const fire = createWhiteNoise();
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

        const sawNoise = createWhiteNoise();
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

        crowdGain.gain.value = 0.06;

        crowd.connect(crowdFilter);
        crowdFilter.connect(crowdGain);
        crowdGain.connect(masterGain);

        nodes.push(crowd, crowdFilter, crowdGain);

        // Periodic swells
        function swell() {
          if (!crowdGain || !audioContext) return;
          crowdGain.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 2);
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

        const metal = createWhiteNoise();
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
        case 'discover':
          playDiscoverSound();
          break;
        case 'challenge':
          playChallengeSound();
          break;
        case 'levelup':
          playLevelUpSound();
          break;
        case 'error':
          playErrorSound();
          break;
        case 'notification':
          playNotificationSound();
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

    blip1Gain.gain.value = 0.15;
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
    blip2Gain.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.06);
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

    warpGain.gain.value = 0.2;
    warpGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);

    delay1.delayTime.value = 0.1;
    delay2.delayTime.value = 0.2;
    delayGain1.gain.value = 0.3;
    delayGain2.gain.value = 0.2;

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

    pluckGain.gain.value = 0.25;
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

    thumpGain.gain.value = 0.25;
    thumpGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15);

    thump.connect(thumpGain);
    thumpGain.connect(masterGain);

    thump.start();
    thump.stop(audioContext.currentTime + 0.15);

    const click = audioContext.createOscillator();
    const clickGain = audioContext.createGain();

    click.type = 'sine';
    click.frequency.value = 2000;

    clickGain.gain.value = 0.15;
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

    coinGain.gain.value = 0.2;
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
      noteGain.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
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
    hornGain.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.1);
    hornGain.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.4);
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
      noteGain.gain.linearRampToValueAtTime(0.15, startTime + 0.1);
      noteGain.gain.linearRampToValueAtTime(0.1, startTime + 0.5);
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

    buzzGain.gain.value = 0.1;
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

    bellGain.gain.value = 0.15;
    bellGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.4);

    bell.connect(bellGain);
    bellGain.connect(masterGain);

    bell.start();
    bell.stop(audioContext.currentTime + 0.4);
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

    const grass = createWhiteNoise();
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

    thudGain.gain.value = 0.1;
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

    const sand = createWhiteNoise();
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

    const splash = createWhiteNoise();
    if (splash) {
      const splashFilter = audioContext.createBiquadFilter();
      const splashGain = audioContext.createGain();

      splashFilter.type = 'bandpass';
      splashFilter.frequency.value = 800;
      splashFilter.Q.value = 2;

      splashGain.gain.value = 0.1;
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

    knockGain.gain.value = 0.12;
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
   * Set master volume
   * @param {number} level - 0-1
   */
  function setVolume(level) {
    if (!masterGain) return;

    const clampedLevel = Math.max(0, Math.min(1, level));
    masterGain.gain.value = clampedLevel;
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
    masterGain.gain.value = 0.5;
  }

  /**
   * Stop all sounds
   */
  function stopAll() {
    stopAmbient();
    // Individual sound effects stop themselves automatically
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

})(typeof module !== 'undefined' ? module.exports : (window.Audio = {}));
