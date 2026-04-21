(() => {
  if (window.CTFdSolveFX) return;

  const injected = window.__CTFdSolveFXConfig || {};

  const SOUND_PRESETS = {
    chime:   [523.25, 659.25, 783.99, 1046.50, 1318.51],
    arcade:  [659.25, 783.99, 987.77, 1174.66, 1567.98],
    fanfare: [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98],
    bell:    [440.00, 554.37, 659.25, 880.00],
    retro:   [783.99, 987.77, 1174.66, 1479.98, 1760.00],
    descend: [1318.51, 1046.50, 783.99, 659.25, 523.25],
  };

  const API = (window.CTFdSolveFX = {
    config: {
      color: injected.color || '#72ec0b',
      textColor: injected.text_color || '#ffffff',
      label: injected.label || 'S O L V E D',
      sub: injected.sub || 'FLAG ACCEPTED',
      tag: injected.tag || 'click anywhere to dismiss',
      soundEnabled: injected.sound_enabled !== false,
      soundPreset: injected.sound_preset || 'chime',
      maxDurationMs: injected.max_duration_ms || 3500,
      solveUrlRegex: /\/api\/v1\/challenges\/attempt/,
    },
    SOUND_PRESETS,
    _presets: {},
    _active: injected.preset || 'pulse',
    register(name, preset) { this._presets[name] = preset; },
    use(name) {
      if (!this._presets[name]) throw new Error(`Unknown preset: ${name}`);
      this._active = name;
    },
    fire() { celebrate(); },
    helpers: {},
  });

  const helpers = API.helpers;

  helpers.makeOverlay = () => {
    document.querySelectorAll('.solvefx-overlay').forEach(e => e.remove());
    const overlay = document.createElement('div');
    overlay.className = 'solvefx-overlay';
    overlay.style.setProperty('--solvefx-color', API.config.color);
    overlay.style.setProperty('--solvefx-text-color', API.config.textColor);
    overlay.innerHTML = `
      <canvas class="solvefx-canvas"></canvas>
      <div class="solvefx-text">
        <div class="solvefx-label"></div>
        <div class="solvefx-sub"></div>
        <div class="solvefx-tag"></div>
      </div>`;
    overlay.querySelector('.solvefx-label').textContent = API.config.label;
    overlay.querySelector('.solvefx-sub').textContent = API.config.sub;
    overlay.querySelector('.solvefx-tag').textContent = API.config.tag;
    document.body.appendChild(overlay);
    return overlay;
  };

  helpers.fitCanvas = (canvas, width, height) => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr; canvas.height = height * dpr;
    canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  };

  helpers.chime = (notes) => {
    if (!API.config.soundEnabled) return;
    if (!notes) notes = SOUND_PRESETS[API.config.soundPreset] || SOUND_PRESETS.chime;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.value = 0.18;
      master.connect(ctx.destination);
      notes.forEach((freq, i) => {
        const t = now + i * 0.07;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.5, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.connect(g).connect(master);
        osc.start(t); osc.stop(t + 0.4);
      });
      const cT = now + 0.35;
      notes.slice(0, 4).forEach(freq => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0, cT);
        g.gain.linearRampToValueAtTime(0.13, cT + 0.03);
        g.gain.exponentialRampToValueAtTime(0.001, cT + 1.4);
        osc.connect(g).connect(master);
        osc.start(cT); osc.stop(cT + 1.5);
      });
      const noise = ctx.createBufferSource();
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      noise.buffer = buf;
      const nf = ctx.createBiquadFilter(); nf.type = 'highpass'; nf.frequency.value = 2000;
      const ng = ctx.createGain(); ng.gain.value = 0.25;
      noise.connect(nf).connect(ng).connect(master);
      noise.start(now);
    } catch (e) {}
  };

  function currentPreset() { return API._presets[API._active] || {}; }

  let celebrating = false;
  function celebrate() {
    if (celebrating) return;
    celebrating = true;
    const preset = currentPreset();
    try { helpers.chime(); } catch (e) {}
    const done = () => { celebrating = false; };
    try {
      if (preset.celebration) preset.celebration(done);
      else done();
    } catch (e) { done(); }
  }

  // solve detection
  function hookResponseJson() {
    if (Response.prototype.json.__solvefxHooked) return;
    const orig = Response.prototype.json;
    const wrapped = async function () {
      const data = await orig.call(this);
      try {
        if (this.url && API.config.solveUrlRegex.test(this.url) &&
            data && data.data && data.data.status === 'correct') celebrate();
      } catch (e) {}
      return data;
    };
    wrapped.__solvefxHooked = true;
    Response.prototype.json = wrapped;
  }

  function hookFetch() {
    const orig = window.fetch;
    if (!orig || orig.__solvefxHooked) return;
    const wrapped = async function (...args) {
      const res = await orig.apply(this, args);
      try {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';
        if (API.config.solveUrlRegex.test(url)) {
          res.clone().json().then(d => {
            if (d && d.data && d.data.status === 'correct') celebrate();
          }).catch(() => {});
        }
      } catch (e) {}
      return res;
    };
    wrapped.__solvefxHooked = true;
    window.fetch = wrapped;
  }

  function hookXHR() {
    const OX = window.XMLHttpRequest;
    if (!OX || OX.__solvefxHooked) return;
    const origOpen = OX.prototype.open;
    const origSend = OX.prototype.send;
    OX.prototype.open = function (method, url) {
      this.__solvefxUrl = url;
      return origOpen.apply(this, arguments);
    };
    OX.prototype.send = function () {
      this.addEventListener('load', () => {
        try {
          if (API.config.solveUrlRegex.test(this.__solvefxUrl || '')) {
            const d = JSON.parse(this.responseText);
            if (d && d.data && d.data.status === 'correct') celebrate();
          }
        } catch (e) {}
      });
      return origSend.apply(this, arguments);
    };
    OX.__solvefxHooked = true;
  }

  function hookCTFd(tries = 0) {
    const api = window.CTFd && window.CTFd.api;
    if (!api || !api.post_challenge_attempt) {
      if (tries < 50) setTimeout(() => hookCTFd(tries + 1), 200);
      return;
    }
    if (api.post_challenge_attempt.__solvefxHooked) return;
    const orig = api.post_challenge_attempt.bind(api);
    const wrapped = async function (...args) {
      const res = await orig(...args);
      try {
        const inner = res && res.data && (res.data.data || res.data);
        if (inner && inner.status === 'correct') celebrate();
      } catch (e) {}
      return res;
    };
    wrapped.__solvefxHooked = true;
    api.post_challenge_attempt = wrapped;
  }

  const init = () => {
    hookResponseJson();
    hookFetch();
    hookXHR();
    hookCTFd();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
