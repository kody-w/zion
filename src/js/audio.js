(function(exports) {
  'use strict';

  // ── State ─────────────────────────────────────────────────────────────────

  var ctx = null;
  var masterGain = null;
  var muted = false;
  var volumes = { master: 0.5, music: 0.5, sfx: 0.5 };

  // Four independent ambient layers; each holds { nodes[], timeouts[], intervals[], cleanup? }
  var ambients = { base: null, time: null, weather: null, zone: null };

  // Noise source tracking (prevents orphaned sources)
  var activeNoiseSources = [];

  function killAllNoiseSources() {
    for (var i = 0; i < activeNoiseSources.length; i++) {
      try { activeNoiseSources[i].stop(); } catch(e) {}
      try { activeNoiseSources[i].disconnect(); } catch(e) {}
    }
    activeNoiseSources = [];
  }

  // ── Bootstrap ─────────────────────────────────────────────────────────────

  function initAudio() {
    if (typeof AudioContext === 'undefined' && typeof webkitAudioContext === 'undefined') {
      console.warn('Web Audio API not available');
      return null;
    }
    var events = ['click', 'touchstart', 'keydown'];
    function boot() {
      if (ctx) return;
      try {
        ctx = new (AudioContext || webkitAudioContext)();
        masterGain = ctx.createGain();
        masterGain.gain.value = 0.15;
        masterGain.connect(ctx.destination);
        if (ctx.state === 'suspended') ctx.resume();
        console.log('Audio system initialized');
      } catch (e) { console.error('Audio init failed:', e); }
      events.forEach(function(e) { document.removeEventListener(e, boot); });
    }
    events.forEach(function(e) { document.addEventListener(e, boot); });
    return true;
  }

  // ── Core helpers ──────────────────────────────────────────────────────────

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  // Looping brown-noise (warm 1/f²) buffer source
  function createWhiteNoise(maxDurationSec) {
    if (!ctx) return null;
    var safeDur = maxDurationSec || 60;
    var rate = ctx.sampleRate;
    var buf = ctx.createBuffer(1, rate * 2, rate);
    var d = buf.getChannelData(0);
    var lastOut = 0;
    for (var i = 0; i < d.length; i++) {
      var w = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.02 * w) / 1.02;
      d[i] = lastOut * 3.5;
    }
    var nSrc = ctx.createBufferSource();
    nSrc.buffer = buf;
    nSrc.loop = true;
    nSrc.start();
    activeNoiseSources.push(nSrc);
    nSrc.onended = function() {
      var idx = activeNoiseSources.indexOf(nSrc);
      if (idx !== -1) activeNoiseSources.splice(idx, 1);
    };
    setTimeout(function() {
      try { nSrc.stop(); } catch(e) {}
      try { nSrc.disconnect(); } catch(e) {}
    }, safeDur * 1000);
    return nSrc;
  }

  // Short white-noise burst (non-looping)
  function whiteNoise(dur) {
    if (!ctx) return null;
    dur = dur || 0.1;
    var n = Math.max(1, Math.floor(ctx.sampleRate * dur));
    var buf = ctx.createBuffer(1, n, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    var src = ctx.createBufferSource();
    src.buffer = buf;
    src.start();
    src.stop(ctx.currentTime + dur);
    return src;
  }

  // Single oscillator tone with linear attack / exponential release
  function tone(freq, oscType, gainVal, dur, startDelay) {
    if (!ctx || !masterGain) return;
    var t = ctx.currentTime + (startDelay || 0);
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = oscType || 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gainVal, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(masterGain);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  // Arpeggio: plays each note with uniform spacing; optional startOffset delays the whole phrase
  function arp(notes, spacing, oscType, gainVal, dur, startOffset) {
    if (!ctx || !masterGain) return;
    var base = ctx.currentTime + (startOffset || 0);
    for (var i = 0; i < notes.length; i++) {
      (function(freq, t) {
        var o = ctx.createOscillator();
        var g = ctx.createGain();
        o.type = oscType || 'sine';
        o.frequency.value = freq;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(gainVal || 0.05, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.001, t + (dur || 0.3));
        o.connect(g);
        g.connect(masterGain);
        o.start(t);
        o.stop(t + (dur || 0.3) + 0.05);
      })(notes[i], base + i * spacing);
    }
  }

  // ── Ambient engine ────────────────────────────────────────────────────────

  function makeState() {
    return { nodes: [], timeouts: [], intervals: [] };
  }

  // Single cleanup path for all ambient layers
  function stopState(state) {
    if (!state) return;
    state.timeouts.forEach(function(id) { clearTimeout(id); });
    state.intervals.forEach(function(id) { clearInterval(id); });
    state.nodes.forEach(function(n) {
      if (!n) return;
      try { if (n.stop) n.stop(); } catch (e) {}
      try { if (n.disconnect) n.disconnect(); } catch (e) {}
    });
    if (typeof state.cleanup === 'function') state.cleanup();
  }

  // Replace an ambient layer: stop old, start new
  function setAmbient(key, fn) {
    stopState(ambients[key]);
    ambients[key] = fn ? fn() : null;
  }

  // ── Zone base ambients ────────────────────────────────────────────────────

  function playAmbient(zone) {
    if (!ctx || !masterGain) return;
    resume();
    var fns = {
      nexus: nexusAmbient, gardens: gardensAmbient, athenaeum: athenaeumAmbient,
      studio: studioAmbient, wilds: wildsAmbient, agora: agoraAmbient,
      commons: commonsAmbient, arena: arenaAmbient
    };
    setAmbient('base', fns[zone] || null);
  }

  function nexusAmbient() {
    var s = makeState();
    try {
      // Deep C2–C3 drone
      var dg = ctx.createGain();
      dg.gain.value = 0.03;
      dg.connect(masterGain);
      [65.41, 130.81].forEach(function(f) {
        var o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
        o.connect(dg); o.start(); s.nodes.push(o);
      });
      s.nodes.push(dg);

      // Ethereal C-E-G pad with slow LFO tremolo
      var lfo = ctx.createOscillator(), lfog = ctx.createGain(), pg = ctx.createGain();
      lfo.type = 'sine'; lfo.frequency.value = 0.2;
      lfog.gain.value = 0.01;
      pg.gain.value = 0.02;
      lfo.connect(lfog); lfog.connect(pg.gain);
      [261.63, 329.63, 392.00].forEach(function(f) {
        var o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
        o.connect(pg); o.start(); s.nodes.push(o);
      });
      pg.connect(masterGain); lfo.start();
      s.nodes.push(lfo, lfog, pg);

      // Crystalline chimes with delay echo
      function chime() {
        if (!ctx || !masterGain) return;
        var freqs = [523.25, 659.25, 783.99, 1046.5, 1318.51];
        var f = freqs[Math.floor(Math.random() * freqs.length)];
        var o = ctx.createOscillator(), g = ctx.createGain();
        var del = ctx.createDelay(), dg2 = ctx.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.014, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5);
        del.delayTime.value = 0.45; dg2.gain.value = 0.07;
        o.connect(g); g.connect(masterGain); g.connect(del); del.connect(dg2); dg2.connect(masterGain);
        o.start(); o.stop(ctx.currentTime + 2.5);
        s.timeouts.push(setTimeout(chime, 8000 + Math.random() * 14000));
      }
      s.timeouts.push(setTimeout(chime, 2000));
    } catch (e) {}
    return s;
  }

  function gardensAmbient() {
    var s = makeState();
    try {
      // Babbling stream: brown noise → lowpass with LFO on filter cutoff
      var stream = createWhiteNoise();
      if (stream) {
        var sf = ctx.createBiquadFilter(), slfo = ctx.createOscillator();
        var slfog = ctx.createGain(), sg = ctx.createGain();
        sf.type = 'lowpass'; sf.frequency.value = 400;
        slfo.type = 'sine'; slfo.frequency.value = 0.5; slfog.gain.value = 100;
        sg.gain.value = 0.025;
        slfo.connect(slfog); slfog.connect(sf.frequency);
        stream.connect(sf); sf.connect(sg); sg.connect(masterGain); slfo.start();
        s.nodes.push(stream, sf, slfo, slfog, sg);
      }
      // Gentle breeze
      var breeze = createWhiteNoise();
      if (breeze) {
        var bf = ctx.createBiquadFilter(), bg = ctx.createGain();
        bf.type = 'lowpass'; bf.frequency.value = 200; bg.gain.value = 0.012;
        breeze.connect(bf); bf.connect(bg); bg.connect(masterGain);
        s.nodes.push(breeze, bf, bg);
      }
      // Birds with frequency glide for realism
      function bird() {
        if (!ctx || !masterGain) return;
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine';
        var f0 = 1200 + Math.random() * 1800;
        o.frequency.setValueAtTime(f0, ctx.currentTime);
        o.frequency.linearRampToValueAtTime(f0 * (0.8 + Math.random() * 0.5), ctx.currentTime + 0.08);
        var dur = 0.1 + Math.random() * 0.2;
        g.gain.setValueAtTime(0, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
        o.connect(g); g.connect(masterGain); o.start(); o.stop(ctx.currentTime + dur);
        s.timeouts.push(setTimeout(bird, 400 + Math.random() * 3000));
      }
      for (var i = 0; i < 3; i++) s.timeouts.push(setTimeout(bird, Math.random() * 2000));

      // Crickets: AM sine
      var cric = ctx.createOscillator(), cam = ctx.createOscillator();
      var camg = ctx.createGain(), cg = ctx.createGain();
      cric.type = 'sine'; cric.frequency.value = 4500;
      cam.type = 'sine'; cam.frequency.value = 20; camg.gain.value = 0.015; cg.gain.value = 0.015;
      cam.connect(camg); camg.connect(cg.gain);
      cric.connect(cg); cg.connect(masterGain); cric.start(); cam.start();
      s.nodes.push(cric, cam, camg, cg);

      // Leaf rustles
      function rustle() {
        if (!ctx || !masterGain) return;
        var n = whiteNoise(0.3);
        if (n) {
          var rf = ctx.createBiquadFilter(), rg = ctx.createGain();
          rf.type = 'bandpass'; rf.frequency.value = 2000; rf.Q.value = 2;
          rg.gain.value = 0.035; rg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
          n.connect(rf); rf.connect(rg); rg.connect(masterGain);
        }
        s.timeouts.push(setTimeout(rustle, 2000 + Math.random() * 3000));
      }
      s.timeouts.push(setTimeout(rustle, 1000));
    } catch (e) {}
    return s;
  }

  function athenaeumAmbient() {
    var s = makeState();
    try {
      // Quiet room tone
      var room = createWhiteNoise();
      if (room) {
        var rg = ctx.createGain(); rg.gain.value = 0.008;
        room.connect(rg); rg.connect(masterGain);
        s.nodes.push(room, rg);
      }
      // Clock tick every second
      s.intervals.push(setInterval(function() {
        if (!ctx || !masterGain) return;
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = 850;
        g.gain.value = 0.018; g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.022);
        o.connect(g); g.connect(masterGain); o.start(); o.stop(ctx.currentTime + 0.022);
      }, 1000));
      // Page turns
      function page() {
        if (!ctx || !masterGain) return;
        var n = whiteNoise(0.12);
        if (n) {
          var pf = ctx.createBiquadFilter(), pg = ctx.createGain();
          pf.type = 'highpass'; pf.frequency.value = 2000;
          pg.gain.value = 0.025; pg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
          n.connect(pf); pf.connect(pg); pg.connect(masterGain);
        }
        s.timeouts.push(setTimeout(page, 8000 + Math.random() * 7000));
      }
      s.timeouts.push(setTimeout(page, 3000));
      // Distant footsteps
      function step() {
        if (!ctx || !masterGain) return;
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = 65;
        g.gain.value = 0.025; g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
        o.connect(g); g.connect(masterGain); o.start(); o.stop(ctx.currentTime + 0.06);
        s.timeouts.push(setTimeout(step, 5000 + Math.random() * 5000));
      }
      s.timeouts.push(setTimeout(step, 3000));
    } catch (e) {}
    return s;
  }

  function studioAmbient() {
    var s = makeState();
    try {
      // Creative hum with slow FM
      var hum = ctx.createOscillator(), hlfo = ctx.createOscillator();
      var hlfog = ctx.createGain(), hg = ctx.createGain();
      hum.type = 'sine'; hum.frequency.value = 110;
      hlfo.type = 'sine'; hlfo.frequency.value = 0.3; hlfog.gain.value = 2; hg.gain.value = 0.025;
      hlfo.connect(hlfog); hlfog.connect(hum.frequency);
      hum.connect(hg); hg.connect(masterGain); hum.start(); hlfo.start();
      s.nodes.push(hum, hlfo, hlfog, hg);
      // Metallic chimes
      function chime() {
        if (!ctx || !masterGain) return;
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'triangle'; o.frequency.value = 500 + Math.random() * 700;
        g.gain.value = 0.035; g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
        o.connect(g); g.connect(masterGain); o.start(); o.stop(ctx.currentTime + 1.2);
        s.timeouts.push(setTimeout(chime, 3000 + Math.random() * 5000));
      }
      s.timeouts.push(setTimeout(chime, 2000));
      // Rhythmic tapping
      function tap() {
        if (!ctx || !masterGain) return;
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = 120 + Math.random() * 160;
        g.gain.value = 0.04; g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        o.connect(g); g.connect(masterGain); o.start(); o.stop(ctx.currentTime + 0.08);
        s.timeouts.push(setTimeout(tap, 600 + Math.random() * 1400));
      }
      s.timeouts.push(setTimeout(tap, 500));
      // Sparse melodic phrases
      function phrase() {
        if (!ctx || !masterGain) return;
        var scale = [261.63, 293.66, 329.63, 392.00, 440.00];
        var n = 3 + Math.floor(Math.random() * 3);
        for (var i = 0; i < n; i++) {
          tone(scale[Math.floor(Math.random() * scale.length)], 'sine', 0.025, 0.35, i * 0.2);
        }
        s.timeouts.push(setTimeout(phrase, 15000 + Math.random() * 15000));
      }
      s.timeouts.push(setTimeout(phrase, 10000));
    } catch (e) {}
    return s;
  }

  function wildsAmbient() {
    var s = makeState();
    try {
      // Heavy wind with gusts
      var wind = createWhiteNoise();
      if (wind) {
        var wf = ctx.createBiquadFilter(), wg = ctx.createGain();
        wf.type = 'lowpass'; wf.frequency.value = 150; wg.gain.value = 0.05;
        wind.connect(wf); wf.connect(wg); wg.connect(masterGain);
        s.nodes.push(wind, wf, wg);
        s.intervals.push(setInterval(function() {
          if (!wg || !ctx) return;
          wg.gain.linearRampToValueAtTime(0.05 + Math.random() * 0.06, ctx.currentTime + 3);
        }, 4000));
      }
      // Wolf howl
      function howl() {
        if (!ctx || !masterGain) return;
        var o = ctx.createOscillator(), vib = ctx.createOscillator();
        var vibg = ctx.createGain(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = 400;
        vib.type = 'sine'; vib.frequency.value = 5; vibg.gain.value = 15;
        g.gain.value = 0.04; g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5);
        vib.connect(vibg); vibg.connect(o.frequency);
        o.connect(g); g.connect(masterGain); o.start(); vib.start();
        o.frequency.linearRampToValueAtTime(600, ctx.currentTime + 1);
        o.frequency.linearRampToValueAtTime(400, ctx.currentTime + 2);
        o.stop(ctx.currentTime + 2.5); vib.stop(ctx.currentTime + 2.5);
        s.timeouts.push(setTimeout(howl, 20000 + Math.random() * 20000));
      }
      s.timeouts.push(setTimeout(howl, 5000));
      // Two-tone owl hoot
      function owl() {
        if (!ctx || !masterGain) return;
        var o1 = ctx.createOscillator(), g1 = ctx.createGain();
        o1.type = 'sine'; o1.frequency.value = 350;
        g1.gain.value = 0.04; g1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        o1.connect(g1); g1.connect(masterGain); o1.start(); o1.stop(ctx.currentTime + 0.35);
        var o2 = ctx.createOscillator(), g2 = ctx.createGain();
        o2.type = 'sine'; o2.frequency.value = 280;
        g2.gain.setValueAtTime(0, ctx.currentTime + 0.4);
        g2.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.45);
        g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
        o2.connect(g2); g2.connect(masterGain); o2.start(ctx.currentTime + 0.4); o2.stop(ctx.currentTime + 0.8);
        s.timeouts.push(setTimeout(owl, 15000 + Math.random() * 10000));
      }
      s.timeouts.push(setTimeout(owl, 8000));
      // Underbrush rustles
      function rustle() {
        if (!ctx || !masterGain) return;
        var n = whiteNoise(0.35);
        if (n) {
          var rf = ctx.createBiquadFilter(), rg = ctx.createGain();
          rf.type = 'bandpass'; rf.frequency.value = 1000; rf.Q.value = 2;
          rg.gain.value = 0.05; rg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
          n.connect(rf); rf.connect(rg); rg.connect(masterGain);
        }
        s.timeouts.push(setTimeout(rustle, 3000 + Math.random() * 4000));
      }
      s.timeouts.push(setTimeout(rustle, 2000));
    } catch (e) {}
    return s;
  }

  function agoraAmbient() {
    var s = makeState();
    try {
      // Crowd murmur with slow volume LFO
      var crowd = createWhiteNoise();
      if (crowd) {
        var cf = ctx.createBiquadFilter(), clfo = ctx.createOscillator();
        var clfog = ctx.createGain(), cg = ctx.createGain();
        cf.type = 'bandpass'; cf.frequency.value = 500; cf.Q.value = 1;
        clfo.type = 'sine'; clfo.frequency.value = 0.4; clfog.gain.value = 0.02; cg.gain.value = 0.03;
        clfo.connect(clfog); clfog.connect(cg.gain);
        crowd.connect(cf); cf.connect(cg); cg.connect(masterGain); clfo.start();
        s.nodes.push(crowd, cf, clfo, clfog, cg);
      }
      // Vendor calls
      function call() {
        if (!ctx || !masterGain) return;
        var scale = [220, 247, 262, 294, 330, 349, 392, 440];
        var n = 2 + Math.floor(Math.random() * 2);
        for (var i = 0; i < n; i++) {
          tone(scale[Math.floor(Math.random() * scale.length)], 'sine', 0.035, 0.22, i * 0.15);
        }
        s.timeouts.push(setTimeout(call, 8000 + Math.random() * 7000));
      }
      s.timeouts.push(setTimeout(call, 3000));
      // Coin clinks
      function coin() {
        if (!ctx || !masterGain) return;
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'triangle'; o.frequency.value = 2000 + Math.random() * 1000;
        g.gain.value = 0.025; g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        o.connect(g); g.connect(masterGain); o.start(); o.stop(ctx.currentTime + 0.15);
        s.timeouts.push(setTimeout(coin, 3000 + Math.random() * 5000));
      }
      s.timeouts.push(setTimeout(coin, 2000));
    } catch (e) {}
    return s;
  }

  function commonsAmbient() {
    var s = makeState();
    try {
      // Friendly chatter
      var chat = createWhiteNoise();
      if (chat) {
        var chatf = ctx.createBiquadFilter(), chatg = ctx.createGain();
        chatf.type = 'bandpass'; chatf.frequency.value = 450; chatf.Q.value = 1.5;
        chatg.gain.value = 0.015;
        chat.connect(chatf); chatf.connect(chatg); chatg.connect(masterGain);
        s.nodes.push(chat, chatf, chatg);
      }
      // Fire crackling: short white-noise bursts at random intervals
      function crackle() {
        if (!ctx || !masterGain) return;
        var n = whiteNoise(0.12);
        if (n) {
          var ff = ctx.createBiquadFilter(), fg = ctx.createGain();
          ff.type = 'bandpass'; ff.frequency.value = 1500 + Math.random() * 1500; ff.Q.value = 3;
          fg.gain.value = 0.015 + Math.random() * 0.02;
          fg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
          n.connect(ff); ff.connect(fg); fg.connect(masterGain);
        }
        s.timeouts.push(setTimeout(crackle, 100 + Math.random() * 300));
      }
      s.timeouts.push(setTimeout(crackle, 500));
      // Intermittent hammering
      var hammerOn = true;
      function hammer() {
        if (!ctx || !masterGain || !hammerOn) return;
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'square'; o.frequency.value = 80;
        g.gain.value = 0.055; g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        o.connect(g); g.connect(masterGain); o.start(); o.stop(ctx.currentTime + 0.1);
        s.timeouts.push(setTimeout(hammer, 800 + Math.random() * 400));
      }
      s.timeouts.push(setTimeout(hammer, 1000));
      s.intervals.push(setInterval(function() {
        hammerOn = !hammerOn;
        if (hammerOn) hammer();
      }, 8000));
    } catch (e) {}
    return s;
  }

  function arenaAmbient() {
    var s = makeState();
    try {
      // Crowd roar with periodic swells
      var crowd = createWhiteNoise();
      if (crowd) {
        var cf = ctx.createBiquadFilter(), cg = ctx.createGain();
        cf.type = 'bandpass'; cf.frequency.value = 600; cf.Q.value = 0.8; cg.gain.value = 0.035;
        crowd.connect(cf); cf.connect(cg); cg.connect(masterGain);
        s.nodes.push(crowd, cf, cg);
        s.intervals.push(setInterval(function() {
          if (!cg || !ctx) return;
          cg.gain.linearRampToValueAtTime(0.035 + Math.random() * 0.025, ctx.currentTime + 2);
        }, 12000));
      }
      // War drums at ~120 BPM
      s.intervals.push(setInterval(function() {
        if (!ctx || !masterGain) return;
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = 55;
        g.gain.value = 0.08; g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        o.connect(g); g.connect(masterGain); o.start(); o.stop(ctx.currentTime + 0.15);
      }, 500));
      // Metal clashes
      function clash() {
        if (!ctx || !masterGain) return;
        var n = whiteNoise(0.22);
        if (n) {
          var mf = ctx.createBiquadFilter(), mg = ctx.createGain();
          mf.type = 'bandpass'; mf.frequency.value = 3000; mf.Q.value = 3;
          mg.gain.value = 0.06; mg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
          n.connect(mf); mf.connect(mg); mg.connect(masterGain);
        }
        s.timeouts.push(setTimeout(clash, 5000 + Math.random() * 5000));
      }
      s.timeouts.push(setTimeout(clash, 3000));
      // Horn call
      function horn() {
        if (!ctx || !masterGain) return;
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sawtooth'; o.frequency.value = 220;
        g.gain.setValueAtTime(0, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.2);
        g.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.8);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);
        o.connect(g); g.connect(masterGain); o.start(); o.stop(ctx.currentTime + 1.1);
        s.timeouts.push(setTimeout(horn, 20000 + Math.random() * 10000));
      }
      s.timeouts.push(setTimeout(horn, 10000));
    } catch (e) {}
    return s;
  }

  // ── SFX ───────────────────────────────────────────────────────────────────

  var SFX = {
    chat: function() {
      tone(600, 'sine', 0.05, 0.05);
      tone(900, 'sine', 0.05, 0.05, 0.05);
    },
    warp: function() {
      if (!ctx || !masterGain) return;
      var o = ctx.createOscillator(), g = ctx.createGain();
      var del = ctx.createDelay(), dg = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(800, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.5);
      g.gain.value = 0.06; g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      del.delayTime.value = 0.15; dg.gain.value = 0.08;
      o.connect(g); g.connect(masterGain); g.connect(del); del.connect(dg); dg.connect(masterGain);
      o.start(); o.stop(ctx.currentTime + 0.5);
    },
    harvest: function() {
      tone(330, 'triangle', 0.06, 0.3);
      tone(660, 'triangle', 0.03, 0.3);
    },
    build: function() {
      tone(80, 'square', 0.06, 0.15);
      tone(2000, 'sine', 0.04, 0.02);
    },
    trade: function() {
      if (!ctx || !masterGain) return;
      var wob = ctx.createOscillator(), wobg = ctx.createGain(), cg = ctx.createGain();
      wob.type = 'sine'; wob.frequency.value = 5; wobg.gain.value = 3;
      cg.gain.value = 0.05; cg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      wob.connect(wobg);
      [1200, 1500].forEach(function(f) {
        var o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
        wobg.connect(o.frequency); o.connect(cg); o.start(); o.stop(ctx.currentTime + 0.3);
      });
      cg.connect(masterGain); wob.start(); wob.stop(ctx.currentTime + 0.3);
    },
    trade_request: function() { tone(700, 'sine', 0.04, 0.5); },
    discover: function() { arp([523.25, 659.25, 783.99, 1046.50], 0.08, 'sine', 0.05, 0.2); },
    challenge: function() {
      if (!ctx || !masterGain) return;
      var now = ctx.currentTime;
      [220, 330].forEach(function(f) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sawtooth'; o.frequency.value = f;
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.055, now + 0.1);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        o.connect(g); g.connect(masterGain); o.start(now); o.stop(now + 0.55);
      });
    },
    levelup: function() { arp([261.63, 329.63, 392.00, 523.25], 0.1, 'sine', 0.05, 0.7); },
    error: function() { tone(100, 'square', 0.04, 0.2); },
    notification: function() { tone(800, 'sine', 0.05, 0.4); },
    craft_complete: function() {
      tone(120, 'square', 0.06, 0.2);
      arp([1800, 2200, 2600], 0.05, 'sine', 0.035, 0.4, 0.1);
    },
    quest_accept: function() { arp([392.00, 493.88, 587.33], 0.08, 'sine', 0.05, 0.25); },
    quest_complete: function() {
      if (!ctx || !masterGain) return;
      var now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach(function(f) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.055, now + 0.1);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        o.connect(g); g.connect(masterGain); o.start(now); o.stop(now + 0.85);
      });
    },
    item_pickup: function() {
      if (!ctx || !masterGain) return;
      var n = whiteNoise(0.08);
      if (n) {
        var f = ctx.createBiquadFilter(), g = ctx.createGain();
        f.type = 'bandpass'; f.frequency.value = 1000; f.Q.value = 1;
        g.gain.value = 0.05; g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        n.connect(f); f.connect(g); g.connect(masterGain);
      }
    },
    npc_greet: function() { tone(440, 'sine', 0.04, 0.35); },
    portal_enter: function() {
      if (!ctx || !masterGain) return;
      var n = whiteNoise(0.8);
      if (n) {
        var f = ctx.createBiquadFilter(), g = ctx.createGain();
        f.type = 'bandpass';
        f.frequency.setValueAtTime(200, ctx.currentTime);
        f.frequency.exponentialRampToValueAtTime(4000, ctx.currentTime + 0.8);
        f.Q.value = 5; g.gain.value = 0.06; g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
        n.connect(f); f.connect(g); g.connect(masterGain);
      }
      var o = ctx.createOscillator(), og = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(800, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.8);
      og.gain.value = 0.03; og.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      o.connect(og); og.connect(masterGain); o.start(); o.stop(ctx.currentTime + 0.8);
    },
    build_place: function() { tone(60, 'square', 0.06, 0.12); },
    footstep: function() {
      if (!ctx || !masterGain) return;
      var n = whiteNoise(0.05);
      if (n) {
        var f = ctx.createBiquadFilter(), g = ctx.createGain();
        f.type = 'lowpass'; f.frequency.value = 300 + Math.random() * 200;
        g.gain.value = 0.05; g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        n.connect(f); f.connect(g); g.connect(masterGain);
      }
    },
    zone_enter: function() {
      if (!ctx || !masterGain) return;
      var now = ctx.currentTime;
      var n = whiteNoise(0.04);
      if (n) {
        var bp = ctx.createBiquadFilter(), ng = ctx.createGain();
        bp.type = 'bandpass'; bp.frequency.value = 400; bp.Q.value = 1;
        ng.gain.setValueAtTime(0.04, now); ng.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        n.connect(bp); bp.connect(ng); ng.connect(masterGain);
      }
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(600, now);
      o.frequency.exponentialRampToValueAtTime(200, now + 0.3);
      g.gain.setValueAtTime(0.03, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      o.connect(g); g.connect(masterGain); o.start(now); o.stop(now + 0.4);
    },
    shutter: function() {
      if (!ctx || !masterGain) return;
      var now = ctx.currentTime;
      [now, now + 0.035].forEach(function(t) {
        var n = whiteNoise(0.006);
        if (n) {
          var hp = ctx.createBiquadFilter(), g = ctx.createGain();
          hp.type = 'highpass'; hp.frequency.value = 3000; g.gain.value = 0.04;
          n.connect(hp); hp.connect(g); g.connect(masterGain);
        }
      });
    },
    coin: function() {
      tone(880, 'sine', 0.04, 0.04);
      tone(1320, 'sine', 0.04, 0.06, 0.05);
    }
  };
  SFX.level_up = SFX.levelup;

  function playSound(type) {
    if (!ctx || !masterGain) return;
    resume();
    if (SFX[type]) {
      try { SFX[type](); } catch (e) { console.error('SFX error:', type, e); }
    }
  }

  // ── Footsteps ─────────────────────────────────────────────────────────────

  var FOOTSTEPS = {
    grass: function() {
      var n = whiteNoise(0.1);
      if (n) {
        var f = ctx.createBiquadFilter(), g = ctx.createGain();
        f.type = 'lowpass'; f.frequency.value = 500;
        g.gain.value = 0.07; g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        n.connect(f); f.connect(g); g.connect(masterGain);
      }
    },
    stone: function() { tone(200, 'sine', 0.04, 0.05); tone(3000, 'sine', 0.05, 0.02); },
    sand: function() {
      var n = whiteNoise(0.12);
      if (n) {
        var f = ctx.createBiquadFilter(), g = ctx.createGain();
        f.type = 'lowpass'; f.frequency.value = 300;
        g.gain.value = 0.065; g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        n.connect(f); f.connect(g); g.connect(masterGain);
      }
    },
    water: function() {
      var n = whiteNoise(0.15);
      if (n) {
        var f = ctx.createBiquadFilter(), g = ctx.createGain();
        f.type = 'bandpass'; f.frequency.value = 800; f.Q.value = 2;
        g.gain.value = 0.04; g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        n.connect(f); f.connect(g); g.connect(masterGain);
      }
      tone(1500 + Math.random() * 700, 'sine', 0.025, 0.05);
      tone(1500 + Math.random() * 700, 'sine', 0.025, 0.05, 0.05);
    },
    wood: function() { tone(150, 'sine', 0.04, 0.06); },
    'default': function() { tone(100, 'sine', 0.07, 0.07); }
  };

  function playFootstep(terrain) {
    if (!ctx || !masterGain) return;
    resume();
    var fn = FOOTSTEPS[terrain] || FOOTSTEPS['default'];
    try { fn(); } catch (e) {}
  }

  // ── Volume / mute / stop ──────────────────────────────────────────────────

  function setVolume(channel, level) {
    if (typeof channel === 'number') { level = channel; channel = 'master'; }
    level = Math.max(0, Math.min(1, level));
    volumes[channel] = level;
    if (channel === 'master' && masterGain) masterGain.gain.value = level;
    if (channel === 'music') setMusicVolume(level);
  }

  function mute() { muted = true; if (masterGain) masterGain.gain.value = 0; }
  function unmute() { muted = false; if (masterGain) masterGain.gain.value = volumes.master || 0.15; }

  function stopAmbient() { setAmbient('base', null); killAllNoiseSources(); }
  function stopTimeAmbient() { setAmbient('time', null); killAllNoiseSources(); }
  function stopWeatherAmbient() { setAmbient('weather', null); killAllNoiseSources(); }
  function stopZoneAmbient() { setAmbient('zone', null); killAllNoiseSources(); }

  function stopAll() {
    ['base', 'time', 'weather', 'zone'].forEach(function(k) { setAmbient(k, null); });
    killAllNoiseSources();
    stopMusic();
  }

  // ── Time-of-day ambients ──────────────────────────────────────────────────
  //
  // Shared sub-layer builders used by multiple time periods

  function windLayer(s, gainVal) {
    var w = createWhiteNoise();
    if (!w) return;
    var f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'lowpass'; f.frequency.value = 180; g.gain.value = gainVal;
    w.connect(f); f.connect(g); g.connect(masterGain);
    s.nodes.push(w, f, g);
  }

  function chirpLayer(s, count, minFreq, maxFreq, minGap, maxGap, vol) {
    function bird() {
      if (!ctx || !masterGain) return;
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      var f0 = minFreq + Math.random() * (maxFreq - minFreq);
      o.frequency.setValueAtTime(f0, ctx.currentTime);
      o.frequency.linearRampToValueAtTime(f0 * (0.8 + Math.random() * 0.5), ctx.currentTime + 0.08);
      var dur = 0.08 + Math.random() * 0.15;
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      o.connect(g); g.connect(masterGain); o.start(); o.stop(ctx.currentTime + dur);
      s.timeouts.push(setTimeout(bird, minGap + Math.random() * (maxGap - minGap)));
    }
    for (var i = 0; i < count; i++) s.timeouts.push(setTimeout(bird, Math.random() * 2000));
  }

  function cricketAM(s, freq, modFreq, gainVal) {
    var o = ctx.createOscillator(), am = ctx.createOscillator();
    var amg = ctx.createGain(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    am.type = 'sine'; am.frequency.value = modFreq; amg.gain.value = gainVal * 0.8;
    g.gain.value = gainVal;
    am.connect(amg); amg.connect(g.gain);
    o.connect(g); g.connect(masterGain); o.start(); am.start();
    s.nodes.push(o, am, amg, g);
  }

  function hootLayer(s, freq, minGap, maxGap, vol) {
    function hoot() {
      if (!ctx || !masterGain) return;
      var o1 = ctx.createOscillator(), g1 = ctx.createGain();
      o1.type = 'sine'; o1.frequency.value = freq;
      g1.gain.value = vol; g1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      o1.connect(g1); g1.connect(masterGain); o1.start(); o1.stop(ctx.currentTime + 0.4);
      var o2 = ctx.createOscillator(), g2 = ctx.createGain();
      o2.type = 'sine'; o2.frequency.value = freq * 0.8;
      g2.gain.setValueAtTime(0, ctx.currentTime + 0.45);
      g2.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.5);
      g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.75);
      o2.connect(g2); g2.connect(masterGain); o2.start(ctx.currentTime + 0.45); o2.stop(ctx.currentTime + 0.75);
      s.timeouts.push(setTimeout(hoot, minGap + Math.random() * maxGap));
    }
    s.timeouts.push(setTimeout(hoot, 5000 + Math.random() * 5000));
  }

  function rustleLayer(s, minGap, maxGap, vol) {
    function rustle() {
      if (!ctx || !masterGain) return;
      var n = createWhiteNoise(2);
      if (n) {
        var f = ctx.createBiquadFilter(), g = ctx.createGain();
        f.type = 'bandpass'; f.frequency.value = 1800 + Math.random() * 400; f.Q.value = 2;
        g.gain.value = vol; g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        n.connect(f); f.connect(g); g.connect(masterGain);
      }
      s.timeouts.push(setTimeout(rustle, minGap + Math.random() * (maxGap - minGap)));
    }
    s.timeouts.push(setTimeout(rustle, 1500));
  }

  var TOD_AMBIENTS = {
    dawn: function() {
      var s = makeState();
      windLayer(s, 0.018);
      chirpLayer(s, 2, 800, 1800, 800, 2000, 0.04);
      return s;
    },
    morning: function() {
      var s = makeState();
      windLayer(s, 0.022);
      chirpLayer(s, 3, 700, 1900, 400, 2500, 0.048);
      function buzz() {
        if (!ctx || !masterGain) return;
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sawtooth'; o.frequency.value = 250 + Math.random() * 100;
        g.gain.value = 0.018; g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        o.connect(g); g.connect(masterGain); o.start(); o.stop(ctx.currentTime + 0.3);
        s.timeouts.push(setTimeout(buzz, 8000 + Math.random() * 12000));
      }
      s.timeouts.push(setTimeout(buzz, 5000));
      return s;
    },
    midday: function() {
      var s = makeState();
      windLayer(s, 0.027);
      cricketAM(s, 3500 + Math.random() * 500, 15 + Math.random() * 10, 0.035);
      chirpLayer(s, 1, 600, 1400, 3000, 5000, 0.028);
      return s;
    },
    afternoon: function() {
      var s = makeState();
      windLayer(s, 0.022);
      chirpLayer(s, 2, 500, 1400, 1500, 4000, 0.038);
      rustleLayer(s, 2500, 3500, 0.028);
      return s;
    },
    evening: function() {
      var s = makeState();
      windLayer(s, 0.018);
      cricketAM(s, 4000 + Math.random() * 500, 18 + Math.random() * 8, 0.025);
      hootLayer(s, 320, 12000, 12000, 0.045);
      return s;
    },
    night: function() {
      var s = makeState();
      windLayer(s, 0.013);
      cricketAM(s, 3500 + Math.random() * 300, 15 + Math.random() * 5, 0.022);
      hootLayer(s, 280, 18000, 18000, 0.038);
      function howl() {
        if (!ctx || !masterGain) return;
        var o = ctx.createOscillator(), vib = ctx.createOscillator();
        var vibg = ctx.createGain(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = 350;
        vib.type = 'sine'; vib.frequency.value = 4; vibg.gain.value = 10; g.gain.value = 0.028;
        vib.connect(vibg); vibg.connect(o.frequency);
        o.connect(g); g.connect(masterGain); o.start(); vib.start();
        o.frequency.linearRampToValueAtTime(500, ctx.currentTime + 1.2);
        o.frequency.linearRampToValueAtTime(350, ctx.currentTime + 2);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5);
        o.stop(ctx.currentTime + 2.5); vib.stop(ctx.currentTime + 2.5);
        s.timeouts.push(setTimeout(howl, 60000 + Math.random() * 60000));
      }
      s.timeouts.push(setTimeout(howl, 30000));
      return s;
    }
  };

  function updateAmbientForTime(period) {
    if (!ctx || !masterGain) return;
    resume();
    setAmbient('time', TOD_AMBIENTS[period] || null);
  }

  // ── Weather ambients ──────────────────────────────────────────────────────

  function updateAmbientForWeather(weather) {
    if (!ctx || !masterGain) return;
    resume();
    var fns = {
      cloudy: function() {
        var s = makeState(); windLayer(s, 0.028); return s;
      },
      rain: function() {
        var s = makeState();
        var rain = createWhiteNoise();
        if (rain) {
          var rf = ctx.createBiquadFilter(), rg = ctx.createGain();
          rf.type = 'bandpass'; rf.frequency.value = 4000; rf.Q.value = 0.5; rg.gain.value = 0.05;
          rain.connect(rf); rf.connect(rg); rg.connect(masterGain);
          s.nodes.push(rain, rf, rg);
        }
        function thunder() {
          if (!ctx || !masterGain) return;
          var n = whiteNoise(2.5);
          if (n) {
            var tf = ctx.createBiquadFilter(), tg = ctx.createGain();
            tf.type = 'lowpass'; tf.frequency.value = 80;
            tg.gain.value = 0.05; tg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5);
            n.connect(tf); tf.connect(tg); tg.connect(masterGain);
          }
          s.timeouts.push(setTimeout(thunder, 25000 + Math.random() * 35000));
        }
        s.timeouts.push(setTimeout(thunder, 15000));
        return s;
      },
      snow: function() {
        var s = makeState(); windLayer(s, 0.013); return s;
      }
    };
    setAmbient('weather', fns[weather] || null);
  }

  // ── Zone layers (additive on top of base ambient) ─────────────────────────

  var ZONE_LAYERS = {
    nexus: function() {
      var s = makeState();
      var o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
      var lfo = ctx.createOscillator(), lfog = ctx.createGain(), lg = ctx.createGain();
      o1.type = 'sine'; o1.frequency.value = 523;
      o2.type = 'sine'; o2.frequency.value = 659;
      lfo.type = 'sine'; lfo.frequency.value = 0.12; lfog.gain.value = 8; lg.gain.value = 0.01;
      lfo.connect(lfog); lfog.connect(o1.frequency); lfog.connect(o2.frequency);
      o1.connect(lg); o2.connect(lg); lg.connect(masterGain);
      o1.start(); o2.start(); lfo.start();
      s.nodes.push(o1, o2, lfo, lfog, lg);
      return s;
    },
    gardens: function() {
      var s = makeState();
      var w = createWhiteNoise();
      if (w) {
        var f = ctx.createBiquadFilter(), lfo = ctx.createOscillator();
        var lfog = ctx.createGain(), g = ctx.createGain();
        f.type = 'highpass'; f.frequency.value = 2000;
        lfo.type = 'sine'; lfo.frequency.value = 0.8; lfog.gain.value = 50; g.gain.value = 0.025;
        lfo.connect(lfog); lfog.connect(f.frequency);
        w.connect(f); f.connect(g); g.connect(masterGain); lfo.start();
        s.nodes.push(w, f, lfo, lfog, g);
      }
      return s;
    },
    athenaeum: function() {
      var s = makeState();
      function pr() {
        if (!ctx || !masterGain) return;
        var n = whiteNoise(0.1);
        if (n) {
          var f = ctx.createBiquadFilter(), g = ctx.createGain();
          f.type = 'highpass'; f.frequency.value = 2500;
          g.gain.value = 0.018; g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
          n.connect(f); f.connect(g); g.connect(masterGain);
        }
        s.timeouts.push(setTimeout(pr, 10000 + Math.random() * 10000));
      }
      s.timeouts.push(setTimeout(pr, 5000));
      return s;
    },
    studio: function() {
      var s = makeState();
      function note() {
        if (!ctx || !masterGain) return;
        var scale = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00];
        tone(scale[Math.floor(Math.random() * scale.length)], 'sine', 0.022, 0.3);
        s.timeouts.push(setTimeout(note, 8000 + Math.random() * 12000));
      }
      s.timeouts.push(setTimeout(note, 4000));
      return s;
    },
    wilds: function() {
      var s = makeState();
      var w = createWhiteNoise();
      if (w) {
        var f = ctx.createBiquadFilter(), g = ctx.createGain();
        f.type = 'bandpass'; f.frequency.value = 800; f.Q.value = 1; g.gain.value = 0.035;
        w.connect(f); f.connect(g); g.connect(masterGain);
        s.nodes.push(w, f, g);
      }
      return s;
    },
    agora: function() {
      var s = makeState();
      var c = createWhiteNoise();
      if (c) {
        var f = ctx.createBiquadFilter(), g = ctx.createGain();
        f.type = 'bandpass'; f.frequency.value = 450; f.Q.value = 1.2; g.gain.value = 0.022;
        c.connect(f); f.connect(g); g.connect(masterGain);
        s.nodes.push(c, f, g);
      }
      return s;
    },
    commons: function() {
      var s = makeState();
      function chime() {
        if (!ctx || !masterGain) return;
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = 800 + Math.random() * 600;
        g.gain.value = 0.028; g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
        o.connect(g); g.connect(masterGain); o.start(); o.stop(ctx.currentTime + 1.5);
        s.timeouts.push(setTimeout(chime, 5000 + Math.random() * 8000));
      }
      s.timeouts.push(setTimeout(chime, 3000));
      return s;
    },
    arena: function() {
      var s = makeState();
      var e = createWhiteNoise();
      if (e) {
        var ef = ctx.createBiquadFilter(), ed = ctx.createDelay();
        var edg = ctx.createGain(), eg = ctx.createGain();
        ef.type = 'bandpass'; ef.frequency.value = 700; ef.Q.value = 0.8;
        ed.delayTime.value = 0.3; edg.gain.value = 0.25; eg.gain.value = 0.018;
        e.connect(ef); ef.connect(eg); eg.connect(masterGain);
        eg.connect(ed); ed.connect(edg); edg.connect(masterGain);
        s.nodes.push(e, ef, ed, edg, eg);
      }
      return s;
    }
  };

  function setZoneAmbient(zone) {
    if (!ctx || !masterGain) return;
    resume();
    killAllNoiseSources();
    setAmbient('zone', ZONE_LAYERS[zone] || null);
  }

  // ── NPC sounds ────────────────────────────────────────────────────────────

  var NPC_SOUNDS = {
    hammer: function() { tone(90, 'square', 0.075, 0.2); tone(2500, 'sine', 0.035, 0.3); },
    music: function() { arp([392.00, 440.00, 493.88], 0.15, 'sine', 0.045, 0.25); },
    garden: function() {
      var n = whiteNoise(0.32);
      if (n) {
        var f = ctx.createBiquadFilter(), g = ctx.createGain();
        f.type = 'bandpass'; f.frequency.value = 1200; f.Q.value = 2;
        g.gain.value = 0.055; g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        n.connect(f); f.connect(g); g.connect(masterGain);
      }
    },
    trade: function() {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = 1800 + Math.random() * 500;
      g.gain.value = 0.055; g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      o.connect(g); g.connect(masterGain); o.start(); o.stop(ctx.currentTime + 0.2);
    },
    teach: function() {
      tone(80, 'sine', 0.045, 0.1);
      setTimeout(function() {
        if (!ctx || !masterGain) return;
        var n = whiteNoise(0.18);
        if (n) {
          var f = ctx.createBiquadFilter(), g = ctx.createGain();
          f.type = 'highpass'; f.frequency.value = 2200;
          g.gain.value = 0.035; g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
          n.connect(f); f.connect(g); g.connect(masterGain);
        }
      }, 100);
    },
    heal: function() { arp([523.25, 659.25, 783.99], 0.1, 'sine', 0.038, 0.3); }
  };

  function playNPCSound(type) {
    if (!ctx || !masterGain) return;
    resume();
    if (NPC_SOUNDS[type]) {
      try { NPC_SOUNDS[type](); } catch (e) {}
    }
  }

  // ── Procedural music system ───────────────────────────────────────────────

  var musicState = {
    playing: false, zone: null, timeOfDay: 'day', volume: 0.12,
    padNodes: [], beatTimer: null, melodyTimeout: null,
    chordIndex: 0, noteIndex: 0
  };

  var SCALES = {
    nexus:     [256.87, 288.33, 323.63, 384.91, 432.00, 513.74, 576.65, 647.25],
    gardens:   [288.33, 323.63, 363.27, 432.00, 484.90, 576.65, 647.25, 726.53],
    athenaeum: [242.45, 272.18, 323.63, 363.27, 407.75, 484.90, 544.36, 647.25],
    studio:    [323.63, 363.27, 407.75, 484.90, 544.36, 647.25, 726.53, 815.51],
    wilds:     [216.00, 256.87, 288.33, 323.63, 384.91, 432.00, 513.74, 576.65],
    agora:     [342.88, 384.91, 432.00, 513.74, 576.65, 685.76, 769.82, 864.00],
    commons:   [288.33, 342.88, 384.91, 432.00, 513.74, 576.65, 685.76, 769.82],
    arena:     [192.43, 228.84, 256.87, 288.33, 342.88, 384.91, 457.69, 513.74]
  };

  var CHORD_PROGRESSIONS = {
    nexus:     [[0,2,4],[1,3,5],[2,4,6],[0,3,5]],
    gardens:   [[0,2,4],[2,4,6],[1,3,5],[0,2,5]],
    athenaeum: [[0,2,4],[1,3,5],[0,3,5],[2,4,6]],
    studio:    [[0,2,4],[1,4,6],[2,4,6],[0,3,5]],
    wilds:     [[0,2,4],[1,3,5],[0,2,5],[1,4,6]],
    agora:     [[0,2,4],[1,3,5],[2,4,6],[0,2,5]],
    commons:   [[0,2,4],[2,4,6],[1,3,5],[0,3,5]],
    arena:     [[0,2,4],[0,3,5],[1,4,6],[2,4,6]]
  };

  var ZONE_MUSIC_STYLE = {
    nexus:     { beatDuration: 2.8, padVolume: 0.07, melodyChance: 0.15, melodyVolume: 0.03,  type: 'ethereal'   },
    gardens:   { beatDuration: 2.4, padVolume: 0.06, melodyChance: 0.2,  melodyVolume: 0.035, type: 'pastoral'   },
    athenaeum: { beatDuration: 3.2, padVolume: 0.05, melodyChance: 0.1,  melodyVolume: 0.025, type: 'mysterious' },
    studio:    { beatDuration: 2.0, padVolume: 0.06, melodyChance: 0.25, melodyVolume: 0.04,  type: 'creative'   },
    wilds:     { beatDuration: 3.0, padVolume: 0.04, melodyChance: 0.12, melodyVolume: 0.03,  type: 'nature'     },
    agora:     { beatDuration: 1.8, padVolume: 0.05, melodyChance: 0.2,  melodyVolume: 0.035, type: 'lively'     },
    commons:   { beatDuration: 2.4, padVolume: 0.06, melodyChance: 0.18, melodyVolume: 0.03,  type: 'warm'       },
    arena:     { beatDuration: 2.0, padVolume: 0.07, melodyChance: 0.15, melodyVolume: 0.035, type: 'dramatic'   }
  };

  var TIME_MOD = {
    dawn:      { tempoM: 0.8,  volM: 0.6, melM: 0.5, octShift:  0 },
    morning:   { tempoM: 0.9,  volM: 0.8, melM: 0.8, octShift:  0 },
    midday:    { tempoM: 1.0,  volM: 1.0, melM: 1.0, octShift:  0 },
    afternoon: { tempoM: 1.0,  volM: 0.9, melM: 0.9, octShift:  0 },
    evening:   { tempoM: 0.85, volM: 0.7, melM: 0.6, octShift: -1 },
    night:     { tempoM: 0.7,  volM: 0.4, melM: 0.3, octShift: -1 }
  };

  function startMusic(zone, timeOfDay) {
    if (!ctx || !masterGain) return;
    zone = zone || 'nexus'; timeOfDay = timeOfDay || 'midday';
    if (musicState.playing) stopMusic();
    musicState.zone = zone; musicState.timeOfDay = timeOfDay;
    musicState.playing = true; musicState.chordIndex = 0; musicState.noteIndex = 0;
    playPadChord();
    scheduleMelody();
  }

  function playPadChord() {
    if (!ctx || !masterGain || !musicState.playing) return;
    var zone = musicState.zone || 'nexus';
    var scale = SCALES[zone] || SCALES.nexus;
    var prog  = CHORD_PROGRESSIONS[zone] || CHORD_PROGRESSIONS.nexus;
    var style = ZONE_MUSIC_STYLE[zone] || ZONE_MUSIC_STYLE.nexus;
    var tmod  = TIME_MOD[musicState.timeOfDay] || TIME_MOD.midday;
    var chordIs  = prog[musicState.chordIndex % prog.length];
    var beatDur  = style.beatDuration / tmod.tempoM;
    var chordDur = beatDur * 4;
    cleanupPadNodes();
    for (var i = 0; i < chordIs.length; i++) {
      var freq = scale[chordIs[i] % scale.length];
      if (tmod.octShift < 0) freq *= 0.5;
      if (tmod.octShift > 0) freq *= 2;
      for (var d = 0; d < 2; d++) {
        var osc = ctx.createOscillator(), gain = ctx.createGain(), filter = ctx.createBiquadFilter();
        osc.type = (style.type === 'ethereal' || style.type === 'mysterious') ? 'sine' : 'triangle';
        osc.frequency.value = freq + (d === 0 ? -1.5 : 1.5);
        filter.type = 'lowpass'; filter.frequency.value = 500; filter.Q.value = 0.7;
        var vol = style.padVolume * tmod.volM * musicState.volume;
        var now = ctx.currentTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(vol, now + chordDur * 0.15);
        gain.gain.setValueAtTime(vol, now + chordDur * 0.7);
        gain.gain.linearRampToValueAtTime(0, now + chordDur);
        osc.connect(filter); filter.connect(gain); gain.connect(masterGain);
        osc.start(now); osc.stop(now + chordDur + 0.1);
        musicState.padNodes.push({ osc: osc, gain: gain, filter: filter, endTime: now + chordDur + 0.2 });
      }
    }
    // Occasional arpeggio sparkle
    if (Math.random() < 0.6) {
      var arpDelay = beatDur * 0.5;
      for (var a = 0; a < 3; a++) {
        (function(ai, delay) {
          setTimeout(function() {
            if (!musicState.playing || !ctx) return;
            var f = scale[chordIs[ai % chordIs.length] % scale.length];
            if (tmod.octShift < 0) f *= 0.5;
            f *= 2;
            var ao = ctx.createOscillator(), ag = ctx.createGain();
            ao.type = 'sine'; ao.frequency.value = f;
            var av = style.melodyVolume * tmod.volM * musicState.volume * 0.6;
            var t = ctx.currentTime;
            ag.gain.setValueAtTime(0, t);
            ag.gain.linearRampToValueAtTime(av, t + 0.05);
            ag.gain.exponentialRampToValueAtTime(0.001, t + beatDur * 0.8);
            ao.connect(ag); ag.connect(masterGain); ao.start(t); ao.stop(t + beatDur);
          }, delay * 1000);
        })(a, arpDelay * (a + 1));
      }
    }
    musicState.chordIndex++;
    musicState.beatTimer = setTimeout(function() {
      if (musicState.playing) playPadChord();
    }, chordDur * 1000);
  }

  function scheduleMelody() {
    if (!ctx || !masterGain || !musicState.playing) return;
    var zone  = musicState.zone || 'nexus';
    var scale = SCALES[zone] || SCALES.nexus;
    var style = ZONE_MUSIC_STYLE[zone] || ZONE_MUSIC_STYLE.nexus;
    var tmod  = TIME_MOD[musicState.timeOfDay] || TIME_MOD.midday;
    var beatDur = style.beatDuration / tmod.tempoM;
    musicState.melodyTimeout = setTimeout(function() {
      if (!musicState.playing || !ctx) return;
      if (Math.random() < style.melodyChance * tmod.melM) {
        var dir  = Math.random() < 0.5 ? 1 : -1;
        var step = Math.random() < 0.7 ? 1 : 2;
        musicState.noteIndex = Math.max(0, Math.min(scale.length - 1, musicState.noteIndex + dir * step));
        var freq = scale[musicState.noteIndex];
        if (tmod.octShift < 0) freq *= 0.5;
        freq *= 2;
        var mo = ctx.createOscillator(), mg = ctx.createGain(), melFilter = ctx.createBiquadFilter();
        mo.type = (style.type === 'nature' || style.type === 'pastoral') ? 'sine' :
                  (Math.random() < 0.5 ? 'sine' : 'triangle');
        mo.frequency.value = freq;
        melFilter.type = 'lowpass'; melFilter.frequency.value = 700;
        var vol = style.melodyVolume * tmod.volM * musicState.volume;
        var dur = beatDur * (0.5 + Math.random() * 1.5);
        var t = ctx.currentTime;
        mg.gain.setValueAtTime(0, t);
        mg.gain.linearRampToValueAtTime(vol, t + 0.03);
        mg.gain.setValueAtTime(vol * 0.8, t + dur * 0.5);
        mg.gain.exponentialRampToValueAtTime(0.001, t + dur);
        mo.connect(melFilter); melFilter.connect(mg); mg.connect(masterGain);
        mo.start(t); mo.stop(t + dur + 0.1);
        // Occasional harmony note
        if (Math.random() < 0.25) {
          var hf = scale[(musicState.noteIndex + 2) % scale.length] * 2;
          if (tmod.octShift < 0) hf *= 0.5;
          var ho = ctx.createOscillator(), hg = ctx.createGain();
          ho.type = 'sine'; ho.frequency.value = hf;
          hg.gain.setValueAtTime(0, t + 0.05);
          hg.gain.linearRampToValueAtTime(vol * 0.4, t + 0.1);
          hg.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.8);
          ho.connect(hg); hg.connect(masterGain); ho.start(t + 0.05); ho.stop(t + dur);
        }
      }
      scheduleMelody();
    }, beatDur * (1 + Math.random() * 3) * 1000);
  }

  function cleanupPadNodes() {
    var now = ctx ? ctx.currentTime : 0;
    musicState.padNodes = musicState.padNodes.filter(function(n) {
      if (now > n.endTime) {
        try { n.osc.disconnect(); n.gain.disconnect(); n.filter.disconnect(); } catch (e) {}
        return false;
      }
      return true;
    });
  }

  function stopMusic() {
    musicState.playing = false;
    if (musicState.beatTimer)    { clearTimeout(musicState.beatTimer);    musicState.beatTimer    = null; }
    if (musicState.melodyTimeout){ clearTimeout(musicState.melodyTimeout); musicState.melodyTimeout = null; }
    if (ctx) {
      musicState.padNodes.forEach(function(n) {
        try { n.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5); } catch (e) {}
      });
    }
    setTimeout(function() {
      musicState.padNodes.forEach(function(n) {
        try { n.osc.disconnect(); n.gain.disconnect(); n.filter.disconnect(); } catch (e) {}
      });
      musicState.padNodes = [];
    }, 600);
  }

  function updateMusic(zone, timeOfDay) {
    if (!musicState.playing) return;
    if (zone && zone !== musicState.zone) {
      startMusic(zone, timeOfDay || musicState.timeOfDay);
    } else if (timeOfDay && timeOfDay !== musicState.timeOfDay) {
      musicState.timeOfDay = timeOfDay;
    }
  }

  function setMusicVolume(vol) { musicState.volume = Math.max(0, Math.min(1, vol)); }
  function isMusicPlaying() { return musicState.playing; }

  // ── Piano accent system ───────────────────────────────────────────────────
  //
  // BotW-style environmental cues: layered sine + triangle for a piano-like timbre

  var PIANO_ACCENTS = {
    dawn:          { notes: [261.63, 329.63, 392.00, 523.25, 659.25],                              noteSpacing: 0.12, noteDuration: 0.6, volume: 0.05 },
    morning:       { notes: [392.00, 493.88, 587.33, 783.99, 987.77, 783.99],                      noteSpacing: 0.10, noteDuration: 0.5, volume: 0.04 },
    dusk:          { notes: [880.00, 659.25, 523.25, 440.00, 329.63],                              noteSpacing: 0.15, noteDuration: 0.7, volume: 0.04 },
    night:         { notes: [146.83, 174.61, 220.00, 196.00, 146.83],                              noteSpacing: 0.22, noteDuration: 0.9, volume: 0.04 },
    zone_discovery:{ notes: [392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 659.25, 783.99],      noteSpacing: 0.09, noteDuration: 0.45, volume: 0.06 },
    quest_complete:{ notes: [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50, 1318.51],           noteSpacing: 0.10, noteDuration: 0.5, volume: 0.06 },
    achievement:   { notes: [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50],                     noteSpacing: 0.08, noteDuration: 0.4, volume: 0.06 },
    level_up:      { notes: [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50],             noteSpacing: 0.10, noteDuration: 0.6, volume: 0.06 }
  };

  function playPianoAccent(type) {
    if (!ctx || !masterGain) return;
    var a = PIANO_ACCENTS[type];
    if (!a) return;
    resume();
    var baseVol = a.volume * (volumes.music !== undefined ? volumes.music : 0.5);
    try {
      a.notes.forEach(function(freq, i) {
        var t = ctx.currentTime + i * a.noteSpacing;
        // Layer 1: sine fundamental (warm body)
        var o1 = ctx.createOscillator(), g1 = ctx.createGain();
        o1.type = 'sine'; o1.frequency.value = freq;
        g1.gain.setValueAtTime(0, t);
        g1.gain.linearRampToValueAtTime(baseVol, t + 0.015);
        g1.gain.exponentialRampToValueAtTime(baseVol * 0.6, t + a.noteDuration * 0.3);
        g1.gain.exponentialRampToValueAtTime(0.001, t + a.noteDuration);
        o1.connect(g1); g1.connect(masterGain); o1.start(t); o1.stop(t + a.noteDuration + 0.05);
        // Layer 2: triangle octave above (hammer brightness, fades fast)
        var o2 = ctx.createOscillator(), g2 = ctx.createGain();
        o2.type = 'triangle'; o2.frequency.value = freq * 2;
        g2.gain.setValueAtTime(0, t);
        g2.gain.linearRampToValueAtTime(baseVol * 0.3, t + 0.01);
        g2.gain.exponentialRampToValueAtTime(0.001, t + a.noteDuration * 0.5);
        o2.connect(g2); g2.connect(masterGain); o2.start(t); o2.stop(t + a.noteDuration * 0.5 + 0.05);
      });
    } catch (e) {}
  }

  function getPianoAccentTypes() { return PIANO_ACCENTS; }

  // ── Exports ───────────────────────────────────────────────────────────────

  exports.initAudio            = initAudio;
  exports.playAmbient          = playAmbient;
  exports.playSound            = playSound;
  exports.playFootstep         = playFootstep;
  exports.setVolume            = setVolume;
  exports.mute                 = mute;
  exports.unmute               = unmute;
  exports.stopAll              = stopAll;
  exports.updateAmbientTime    = updateAmbientForTime;
  exports.updateAmbientWeather = updateAmbientForWeather;
  exports.setZoneAmbient       = setZoneAmbient;
  exports.playNPCSound         = playNPCSound;
  exports.startMusic           = startMusic;
  exports.stopMusic            = stopMusic;
  exports.updateMusic          = updateMusic;
  exports.setMusicVolume       = setMusicVolume;
  exports.isMusicPlaying       = isMusicPlaying;
  exports.playPianoAccent      = playPianoAccent;
  exports.getPianoAccentTypes  = getPianoAccentTypes;

})(typeof module !== 'undefined' ? module.exports : (window.Audio = {}));
