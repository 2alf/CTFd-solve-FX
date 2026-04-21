(() => {
  if (!window.CTFdSolveFX) return;
  const { helpers, config } = CTFdSolveFX;

  const perm = new Uint8Array(512);
  {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  }
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const mix = (a, b, t) => a + t * (b - a);
  const grad = (h, x, y, z) => {
    h &= 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : (h === 12 || h === 14) ? x : z;
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
  };
  function perlin(x, y, z) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
    x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
    const u = fade(x), v = fade(y), w = fade(z);
    const A = perm[X] + Y, AA = perm[A] + Z, AB = perm[A + 1] + Z;
    const B = perm[X + 1] + Y, BA = perm[B] + Z, BB = perm[B + 1] + Z;
    return mix(
      mix(
        mix(grad(perm[AA], x, y, z),     grad(perm[BA], x - 1, y, z),     u),
        mix(grad(perm[AB], x, y - 1, z), grad(perm[BB], x - 1, y - 1, z), u), v),
      mix(
        mix(grad(perm[AA + 1], x, y, z - 1),     grad(perm[BA + 1], x - 1, y, z - 1),     u),
        mix(grad(perm[AB + 1], x, y - 1, z - 1), grad(perm[BB + 1], x - 1, y - 1, z - 1), u), v),
      w);
  }

  const noise = (x, y, z) => perlin(x, y, z) * 0.5 + 0.5;

  CTFdSolveFX.register('flow', {
    celebration(onDone) {
      const overlay = helpers.makeOverlay();
      const canvas = overlay.querySelector('.solvefx-canvas');
      const W = window.innerWidth, H = window.innerHeight;
      const ctx = helpers.fitCanvas(canvas, W, H);

      const NUM = 1800;
      const NOISE_SCALE = 100;
      const STRENGTH = 1;
      const D = 22;

      const particles = new Array(NUM);
      for (let i = 0; i < NUM; i++) {
        particles[i] = {
          x: Math.random() * W,
          y: Math.random() * H,
          speed: 2 + Math.random() * 6,
        };
      }

      ctx.fillStyle = '#0a0f08';
      ctx.fillRect(0, 0, W, H);

      const hex = config.color.replace('#', '');
      const R = parseInt(hex.slice(0, 2), 16);
      const G = parseInt(hex.slice(2, 4), 16);
      const B = parseInt(hex.slice(4, 6), 16);
      const pr = Math.min(255, R + 60);
      const pg = Math.min(255, G + 60);
      const pb = Math.min(255, B + 60);
      const PARTICLE = `rgba(${pr},${pg},${pb},0.9)`;

      const DURATION = 3200;
      const start = performance.now();
      let rafId, frameCount = 0;

      const frame = (t) => {
        ctx.fillStyle = 'rgba(0,0,0,0.04)';
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = PARTICLE;
        frameCount++;
        for (let i = 0; i < NUM; i++) {
          const p = particles[i];
          const angle = noise(p.x / NOISE_SCALE, p.y / NOISE_SCALE, frameCount / NOISE_SCALE) *
                        Math.PI * 2 * STRENGTH;
          const dx = Math.sin(angle);
          let dy = Math.tan(angle);
          if (!Number.isFinite(dy) || Math.abs(dy) > 10) dy = (dy < 0 ? -1 : 1) * 10;
          p.x += dx * p.speed * D;
          p.y += dy * p.speed * D;
          if (p.x < 0 || p.x > W || p.y < 0 || p.y > H) {
            p.x = Math.random() * W;
            p.y = Math.random() * H;
          }

          ctx.fillRect(p.x, p.y, 2, 2);
        }

        if (t - start < DURATION) rafId = requestAnimationFrame(frame);
        else dismiss();
      };

      const dismiss = () => {
        cancelAnimationFrame(rafId);
        overlay.classList.add('solvefx-out');
        setTimeout(() => overlay.remove(), 600);
        onDone();
      };

      rafId = requestAnimationFrame(frame);
      overlay.addEventListener('click', dismiss);
      setTimeout(dismiss, config.maxDurationMs);
    },
  });
})();
