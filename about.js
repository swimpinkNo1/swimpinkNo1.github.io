(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  // Deliberate line breaks: each readable phrase becomes one playable string.
  const copy = [
    "I’m YH: artist and researcher.",
    "I begin with questions, then make",
    "things to explore them.",
    "Through sound, data and objects,",
    "I explore relationships between",
    "people, technology and nature.",
    "My background is visual storytelling.",
    "I hold an MA in Digital Arts and",
    "Humanities from UCC.",
    "I’m drawn to collaborations where",
    "artistic practice meets",
    "scientific inquiry."
];
  const strings = $('#strings');
  strings.replaceChildren();
  const transcript = document.createElement('p');
  transcript.className = 'sr-only';
  transcript.textContent = copy.join(' ');
  strings.append(transcript);
  const lines = copy.map((text, index) => {
    const el = document.createElement('div');
    el.className = 'string';
    el.tabIndex = 0;
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', `Pluck line ${index + 1}: ${text}`);
    const chars = Array.from(text, char => {
      const span = document.createElement('span');
      span.textContent = char;
      span.className = 'untyped';
      span.setAttribute('aria-hidden', 'true');
      el.append(span);
      return span;
    });
    strings.append(el);
    return {el, chars, modes: Array.from({length: 5}, () => ({q: 0, v: 0})), lastPluck: -1000, held: null};
  });
  const keyMap = new Map();
  const rows = ['1234567890', 'QWERTYUIOP', 'ASDFGHJKL', '⇧ZXCVBNM,.↵', ' '];
  rows.forEach(row => {
    const div = document.createElement('div');
    div.className = 'key-row';
    for (const character of row) {
      const key = document.createElement('button');
      key.type = 'button';
      key.className = 'key' + (character === ' ' ? ' space' : /[⇧↵]/.test(character) ? ' wide' : '');
      key.textContent = character === ' ' ? 'SPACE' : character === '⇧' ? 'SHIFT' : character === '↵' ? 'RETURN' : character;
      key.setAttribute('aria-label', character === ' ' ? 'Space' : key.textContent);
      keyMap.set(character, key);
      key.addEventListener('click', () => { manualKey(character); });
      div.append(key);
    }
    $('#keyboard').append(div);
  });
  let context, enabled = true;
  const voices = new Set();
  async function enableAudio() {
    if (!enabled) return;
    try {
      context ??= new (window.AudioContext || window.webkitAudioContext)();
      if (context.state !== 'running') await context.resume();
    } catch {
      enabled = false;
      $('#sound').textContent = 'Sound unavailable';
      $('#sound').setAttribute('aria-pressed', 'false');
    }
  }
  ['pointerdown', 'keydown'].forEach(type => document.addEventListener(type, () => { if (enabled) enableAudio(); }, {capture: true}));
  enableAudio();
  $('#sound').addEventListener('click', async () => {
    enabled = !enabled;
    $('#sound').setAttribute('aria-pressed', String(enabled));
    $('#sound').textContent = enabled ? '♪ Sound on' : '♪ Enable sound';
    if (enabled) { await enableAudio(); pluckSound(0, .45); }
    else { for (const voice of voices) { try {voice.stop();} catch {} } voices.clear(); }
  });
  function playBuffer(buffer, volume) {
    if (!enabled || context?.state !== 'running') return;
    // Bound simultaneous voices when rapidly brushing across several strings.
    if (voices.size >= 12) { const oldest = voices.values().next().value; oldest.stop(); voices.delete(oldest); }
    const source = context.createBufferSource(), gain = context.createGain();
    source.buffer = buffer;
    gain.gain.value = volume;
    source.connect(gain).connect(context.destination);
    voices.add(source);
    source.onended = () => { voices.delete(source); source.disconnect(); gain.disconnect(); };
    source.start();
  }
  function pluckSound(index, strength = 1) {
    if (!enabled || context?.state !== 'running') return;
    // Karplus–Strong: a short excitation travels around a damped delay loop.
    // These consonant pitches avoid dissonance when several lines are strummed.
    const frequency = [110, 123.47, 146.83, 164.81, 196, 220, 246.94, 293.66, 329.63, 392, 440, 493.88][index % 12];
    const rate = context.sampleRate, n = Math.round(rate / frequency);
    const buffer = context.createBuffer(1, rate * 2, rate), data = buffer.getChannelData(0);
    const delay = new Float32Array(n);
    for (let i = 0; i < n; i++) delay[i] = (Math.random() * 2 - 1) * .65;
    for (let i = 0; i < data.length; i++) {
      const j = i % n, sample = delay[j];
      delay[j] = .496 * (sample + delay[(j + 1) % n]);
      data[i] = sample * Math.min(1, i / 100) * Math.min(1, (data.length - i) / 1000);
    }
    playBuffer(buffer, Math.min(.65, .25 + strength * .25));
  }
  function clickSound(key = '') {
    if (!enabled || context?.state !== 'running') return;
    const rate = context.sampleRate;
    const returning = key === '↵', space = key === ' ';
    const duration = returning ? .22 : space ? .034 : .025;
    const buffer = context.createBuffer(1, Math.round(rate * duration), rate);
    const data = buffer.getChannelData(0);
    let previousNoise = 0;
    for (let i = 0; i < data.length; i++) {
      const t = i / rate, noise = Math.random() * 2 - 1;
      // A short, bright contact transient; remove the low pitched body tone.
      const bright = (noise - previousNoise) * .5;
      previousNoise = noise;
      if (returning) {
        const bell = (Math.sin(2*Math.PI*2050*t) + .2*Math.sin(2*Math.PI*4130*t)) * Math.exp(-t*23) * .15;
        data[i] = bell + bright * Math.exp(-t*55) * .36;
      } else {
        const impact = bright * Math.exp(-t*(space?270:390)) * .92;
        const metal = Math.sin(2*Math.PI*(space?1650:2850)*t) * Math.exp(-t*550) * .12;
        const release = t>.012 ? bright*Math.exp(-(t-.012)*550)*.19 : 0;
        data[i] = (impact + metal + release) * Math.min(1,i/8);
      }
    }
    playBuffer(buffer, returning ? .48 : space ? .54 : .50);
  }
  const keyTimers = new Map();
  function press(char) {
    let normalized = char.toUpperCase();
    if (/[’'“”]/.test(char)) normalized = '2';
    if (char === '+') normalized = '0';
    if (char === '&') normalized = '7';
    if (char === '—') normalized = ',';
    if (!keyMap.has(normalized) && Array.from(char).length === 1) normalized = ' ';
    const key = keyMap.get(normalized);
    if (!key) return;
    clearTimeout(keyTimers.get(key));
    key.classList.add('pressed');
    document.dispatchEvent(new CustomEvent('typewriter-strike', {detail:{key: normalized}}));
    keyTimers.set(key, setTimeout(() => key.classList.remove('pressed'), 65));
    if (char !== normalized && /[A-Z]/.test(char)) press('⇧');
    if (!reduced.matches) {
      $('#typebar').classList.remove('strike');
      void $('#typebar').offsetWidth;
      $('#typebar').classList.add('strike');
    }
  }
  let timer, lineIndex = 0, charIndex = 0, caret, writing = false;
  const input = document.createElement('textarea');
  input.className = 'visitor-input'; input.setAttribute('aria-label', 'Type on the typewriter paper');
  input.setAttribute('maxlength', '420'); input.spellcheck = false;
  $('#biography').append(input);
  const visitor = document.createElement('div'); visitor.className = 'visitor-words'; visitor.hidden = true;
  strings.after(visitor);
  function beginWriting(focus = false) {
    if (!writing) {
      clearTimeout(timer); writing = true; strings.hidden = true; visitor.hidden = false;
      $('#typing-status').textContent = 'Your words. Your sheet. (Nothing is saved.)';
      $('#progress').textContent = 'YOUR TURN / TYPE SOMETHING'; $('#skip').disabled = true;
      document.dispatchEvent(new CustomEvent('typewriter-finish'));
    }
    if (focus) input.focus({preventScroll: true});
  }
  function drawWriting() {
    visitor.textContent = input.value || 'Start typing…';
    visitor.classList.toggle('empty', !input.value);
    visitor.scrollTop = visitor.scrollHeight;
  }
  function manualKey(key) {
    if (key === '⇧') {press(key); return;}
    beginWriting();
    const value = key === '↵' ? '\n' : key;
    if (input.value.length + value.length <= 420) input.value += value;
    press(key); clickSound(key); drawWriting();
    if (key === '↵') document.dispatchEvent(new CustomEvent('typewriter-return', {detail:{line:12}}));
  }
  input.addEventListener('input', event => {
    beginWriting(); drawWriting();
    const key = event.inputType === 'insertLineBreak' ? '↵' : (event.data || ' ').slice(-1);
    press(key); clickSound(key);
  });
  input.addEventListener('keydown', event => {
    if (event.key === 'Backspace') {press(' '); clickSound(' ');}
    if (event.key === 'Escape') input.blur();
  });
  $('#write').addEventListener('click', () => {beginWriting(true); drawWriting();});
  function finish() {
    clearTimeout(timer);
    lines.forEach(line => line.chars.forEach(char => char.classList.remove('untyped', 'caret')));
    lineIndex = lines.length;
    $('#typing-status').textContent = 'An open-ended practice.';
    $('#skip').disabled = true;
    $('#progress').textContent = 'BRUSH · PULL · RELEASE';
    document.dispatchEvent(new CustomEvent('typewriter-finish'));
  }
  function typeNext() {
    if (document.hidden) return;
    if (lineIndex >= lines.length) { finish(); return; }
    const line = lines[lineIndex];
    if (charIndex >= line.chars.length) {
      lineIndex++; charIndex = 0; press('↵'); clickSound('↵');
      document.dispatchEvent(new CustomEvent('typewriter-return', {detail:{line:lineIndex}}));
      if (!reduced.matches && !$('.mechanical-stage').classList.contains('real-machine')) $('.paper').animate([{transform:'rotate(-.7deg) translateY(0)'},{transform:'rotate(-.6deg) translateY(-3px)'},{transform:'rotate(-.7deg) translateY(0)'}],{duration:170});
      timer = setTimeout(typeNext, 330); return;
    }
    caret?.classList.remove('caret');
    caret = line.chars[charIndex++];
    caret.classList.remove('untyped'); caret.classList.add('caret');
    const letter = caret.textContent;
    if (/[A-Z]/.test(letter)) press('⇧');
    press(letter); clickSound(letter);
    timer = setTimeout(typeNext, /[.,]/.test(letter) ? 170 : 46);
  }
  function replay() {
    writing = false; strings.hidden = false; visitor.hidden = true; input.value = ''; input.blur();
    document.dispatchEvent(new CustomEvent('typewriter-reset'));
    clearTimeout(timer); lineIndex = 0; charIndex = 0;
    lines.forEach(line => line.chars.forEach(char => char.classList.add('untyped')));
    $('#skip').disabled = false;
    $('#typing-status').textContent = 'A little introduction, in the making.';
    $('#progress').textContent = '01 / A LITTLE INTRODUCTION';
    if (reduced.matches) finish(); else typeNext();
  }
  $('#replay').addEventListener('click', replay);
  $('#skip').addEventListener('click', finish);
  let frame = 0, previous = 0;
  function wake() { if (!frame && !document.hidden && !reduced.matches) { previous = performance.now(); frame = requestAnimationFrame(animate); } }
  function impulse(line, x, strength) {
    if (reduced.matches) return;
    line.modes.forEach((mode, i) => {mode.v += Math.sin((i + 1) * Math.PI * x) * strength * 40 / (i + 1);});
    wake();
  }
  function pluck(line, index, x, strength) {
    const now = performance.now();
    if (now - line.lastPluck < 100) return;
    line.lastPluck = now;
    impulse(line, x, strength);
    pluckSound(index, Math.abs(strength) / 20);
  }
  function animate(now) {
    frame = 0;
    const dt = Math.min((now - previous) / 1000, .032); previous = now;
    let active = false;
    for (const line of lines) {
      for (let step = 0; step < 4; step++) {
        line.modes.forEach((mode, i) => {
          const omega = 17 * (i + 1), damping = 4.5 + i * 1.4;
          let target = 0;
          if (line.held) target = line.held.y * 2 * Math.sin((i + 1) * Math.PI * line.held.x) / ((i + 1) ** 2);
          mode.v += (-omega * omega * (mode.q - target) - damping * mode.v) * dt / 4;
          mode.q += mode.v * dt / 4;
        });
      }
      const moving = line.held || line.modes.some(mode => Math.abs(mode.q) > .015 || Math.abs(mode.v) > .08);
      active ||= Boolean(moving);
      line.chars.forEach((char, i) => {
        const x = (i + .5) / line.chars.length;
        let y = 0, slope = 0;
        if (moving) line.modes.forEach((mode, k) => {
          y += mode.q * Math.sin((k + 1) * Math.PI * x);
          slope += mode.q * (k + 1) * Math.PI * Math.cos((k + 1) * Math.PI * x) / line.el.clientWidth;
        });
        char.style.transform = moving ? `translateY(${y.toFixed(2)}px) rotate(${(Math.atan(slope) * 180 / Math.PI).toFixed(2)}deg)` : '';
      });
      if (!moving) line.modes.forEach(mode => {mode.q = 0; mode.v = 0;});
    }
    if (active) frame = requestAnimationFrame(animate);
  }
  lines.forEach((line, index) => {
    let down = null;
    function position(event) {
      const rect = line.el.getBoundingClientRect();
      const textWidth = line.chars.reduce((sum, char) => sum + char.offsetWidth, 0);
      const projectedTextWidth = rect.width * textWidth / line.el.clientWidth;
      return Math.max(.04, Math.min(.96, (event.clientX - rect.left) / projectedTextWidth));
    }
    line.el.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'touch' && !down) pluck(line, index, position(event), 12);
    });
    line.el.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      down = {id: event.pointerId, y: event.clientY};
      line.held = {x: position(event), y: 0};
      line.el.classList.add('dragging');
      line.el.setPointerCapture(event.pointerId);
      pluck(line, index, position(event), 10);
      wake();
    });
    line.el.addEventListener('pointermove', event => {
      if (!down) return;
      line.held = {x: position(event), y: Math.max(-65, Math.min(65, event.clientY - down.y))};
      wake();
    });
    function release() {
      if (!down) return;
      const strength = Math.min(1.5, Math.abs(line.held?.y || 0) / 35 + .3);
      down = null; line.held = null; line.el.classList.remove('dragging');
      pluckSound(index, strength); wake();
    }
    line.el.addEventListener('pointerup', release);
    line.el.addEventListener('pointercancel', release);
    line.el.addEventListener('lostpointercapture', release);
    line.el.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {event.preventDefault(); pluck(line, index, .5, 20);}
    });
  });
  document.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.repeat || event.target.closest('button,a,input,textarea,select,[role="button"]')) return;
    if (event.key.length === 1 || event.key === 'Enter' || event.key === 'Backspace') {
      event.preventDefault(); beginWriting(true);
      if (event.key === 'Backspace') { input.value = Array.from(input.value).slice(0,-1).join(''); drawWriting(); press(' '); clickSound(' '); }
      else manualKey(event.key === 'Enter' ? '↵' : event.key);
    }
  });
  document.addEventListener('visibilitychange', () => {
    clearTimeout(timer);
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
    else { if (!writing && lineIndex < lines.length) typeNext(); wake(); }
  });
  reduced.addEventListener('change', () => {
    if (reduced.matches) {
      if (!writing) finish(); cancelAnimationFrame(frame); frame = 0;
      lines.forEach(line => {line.held = null; line.modes.forEach(m => {m.q=0;m.v=0;});line.chars.forEach(c => c.style.transform='');});
    }
  });
  replay();
})();
