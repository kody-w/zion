(function(exports) {
  // Procedural audio using Web Audio API
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
      masterGain.connect(audioContext.destination);
      masterGain.gain.value = 0.5; // Default volume

      console.log('Audio system initialized');
      return audioContext;
    } catch (err) {
      console.error('Failed to initialize audio:', err);
      return null;
    }
  }

  /**
   * Play zone-specific ambient sound
   * @param {string} zone - Zone identifier
   */
  function playAmbient(zone) {
    if (!audioContext || !masterGain) return;

    // Stop current ambient
    if (currentAmbient) {
      stopAmbient();
    }

    switch (zone) {
      case 'nexus':
        currentAmbient = playNexusAmbient();
        break;
      case 'gardens':
        currentAmbient = playGardensAmbient();
        break;
      case 'wilds':
        currentAmbient = playWildsAmbient();
        break;
      case 'arena':
        currentAmbient = playArenaAmbient();
        break;
      default:
        currentAmbient = playSilence();
    }
  }

  /**
   * Nexus ambient - gentle pad
   */
  function playNexusAmbient() {
    const osc1 = audioContext.createOscillator();
    const osc2 = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc1.type = 'sine';
    osc1.frequency.value = 220; // A3
    osc2.type = 'sine';
    osc2.frequency.value = 330; // E4

    gain.gain.value = 0.05; // Very subtle
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(masterGain);

    osc1.start();
    osc2.start();

    return { oscillators: [osc1, osc2], gain };
  }

  /**
   * Gardens ambient - nature sounds (birds)
   */
  function playGardensAmbient() {
    const nodes = [];

    // Simulate bird chirps with random short notes
    function chirp() {
      if (!audioContext) return;

      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();

      osc.type = 'sine';
      osc.frequency.value = 800 + Math.random() * 400;

      gain.gain.value = 0.1;
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start();
      osc.stop(audioContext.currentTime + 0.2);

      // Random next chirp
      setTimeout(chirp, 1000 + Math.random() * 3000);
    }

    chirp();

    // Background breeze
    const noise = createWhiteNoise();
    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 300;

    const breezeGain = audioContext.createGain();
    breezeGain.gain.value = 0.03;

    noise.connect(filter);
    filter.connect(breezeGain);
    breezeGain.connect(masterGain);

    return { nodes: [noise, filter, breezeGain] };
  }

  /**
   * Wilds ambient - wind
   */
  function playWildsAmbient() {
    const noise = createWhiteNoise();
    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;

    const gain = audioContext.createGain();
    gain.gain.value = 0.08;

    // Vary wind intensity
    setInterval(() => {
      if (gain && audioContext) {
        const targetGain = 0.05 + Math.random() * 0.06;
        gain.gain.linearRampToValueAtTime(targetGain, audioContext.currentTime + 2);
      }
    }, 3000);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    return { nodes: [noise, filter, gain] };
  }

  /**
   * Arena ambient - crowd murmur
   */
  function playArenaAmbient() {
    const noise = createWhiteNoise();
    const filter = audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 400;
    filter.Q.value = 2;

    const gain = audioContext.createGain();
    gain.gain.value = 0.06;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    return { nodes: [noise, filter, gain] };
  }

  /**
   * Silence (no ambient)
   */
  function playSilence() {
    return null;
  }

  /**
   * Stop current ambient sound
   */
  function stopAmbient() {
    if (!currentAmbient) return;

    try {
      if (currentAmbient.oscillators) {
        currentAmbient.oscillators.forEach(osc => osc.stop());
      }
      if (currentAmbient.nodes) {
        currentAmbient.nodes.forEach(node => {
          if (node.stop) node.stop();
          if (node.disconnect) node.disconnect();
        });
      }
      if (currentAmbient.gain) {
        currentAmbient.gain.disconnect();
      }
    } catch (err) {
      console.error('Error stopping ambient:', err);
    }

    currentAmbient = null;
  }

  /**
   * Create white noise buffer
   */
  function createWhiteNoise() {
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
  }

  /**
   * Play UI sound effect
   * @param {string} type - Sound type: 'chat', 'warp', 'harvest', 'build', 'trade', 'discover'
   */
  function playSound(type) {
    if (!audioContext || !masterGain) return;

    switch (type) {
      case 'chat':
        playBlip();
        break;
      case 'warp':
        playSwoosh();
        break;
      case 'harvest':
        playPluck();
        break;
      case 'build':
        playThunk();
        break;
      case 'trade':
        playDing();
        break;
      case 'discover':
        playSparkle();
        break;
    }
  }

  /**
   * Chat blip
   */
  function playBlip() {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.value = 800;

    gain.gain.value = 0.2;
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start();
    osc.stop(audioContext.currentTime + 0.1);
  }

  /**
   * Warp swoosh
   */
  function playSwoosh() {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.type = 'sawtooth';
    osc.frequency.value = 400;
    osc.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.3);

    gain.gain.value = 0.2;
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start();
    osc.stop(audioContext.currentTime + 0.3);
  }

  /**
   * Harvest pluck
   */
  function playPluck() {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.type = 'triangle';
    osc.frequency.value = 330;

    gain.gain.value = 0.3;
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start();
    osc.stop(audioContext.currentTime + 0.2);
  }

  /**
   * Build thunk
   */
  function playThunk() {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.type = 'square';
    osc.frequency.value = 100;

    gain.gain.value = 0.2;
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start();
    osc.stop(audioContext.currentTime + 0.15);
  }

  /**
   * Trade ding
   */
  function playDing() {
    const osc1 = audioContext.createOscillator();
    const osc2 = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc1.type = 'sine';
    osc1.frequency.value = 800;
    osc2.type = 'sine';
    osc2.frequency.value = 1000;

    gain.gain.value = 0.2;
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(masterGain);

    osc1.start();
    osc2.start();
    osc1.stop(audioContext.currentTime + 0.4);
    osc2.stop(audioContext.currentTime + 0.4);
  }

  /**
   * Discover sparkle chord
   */
  function playSparkle() {
    const frequencies = [523, 659, 784]; // C, E, G (C major chord)
    const oscillators = [];

    frequencies.forEach((freq, i) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.value = 0.15;
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5 + i * 0.1);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(audioContext.currentTime + i * 0.05);
      osc.stop(audioContext.currentTime + 0.5 + i * 0.1);

      oscillators.push(osc);
    });
  }

  /**
   * Set master volume
   * @param {number} level - 0-1
   */
  function setVolume(level) {
    if (!masterGain) return;
    masterGain.gain.value = Math.max(0, Math.min(1, level));
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
    // Individual sound effects stop themselves
  }

  // Export public API
  exports.initAudio = initAudio;
  exports.playAmbient = playAmbient;
  exports.playSound = playSound;
  exports.setVolume = setVolume;
  exports.mute = mute;
  exports.unmute = unmute;
  exports.stopAll = stopAll;

})(typeof module !== 'undefined' ? module.exports : (window.Audio = {}));
