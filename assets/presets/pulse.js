(() => {
  if (!window.CTFdSolveFX) return;
  const { helpers, config } = CTFdSolveFX;

  CTFdSolveFX.register('pulse', {
    celebration(onDone) {
      const overlay = helpers.makeOverlay();
      const canvas = overlay.querySelector('.solvefx-canvas');
      const W = window.innerWidth, H = window.innerHeight;
      const ctx = helpers.fitCanvas(canvas, W, H);
      const CELL = 18, GAP = 2;
      const cols = Math.ceil(W / CELL), rows = Math.ceil(H / CELL);
      const cx = (cols - 1) / 2, cy = (rows - 1) / 2;
      const maxDist = Math.hypot(cx, cy);
      const PULSE_SPEED = 28, PULSE_WIDTH = 4;
      const PULSES_AT = [0, 450, 900];
      const DURATION = 2400;
      const start = performance.now();
      let rafId;

      const hex = config.color.replace('#', '');
      const R = parseInt(hex.slice(0, 2), 16);
      const G = parseInt(hex.slice(2, 4), 16);
      const B = parseInt(hex.slice(4, 6), 16);

      const frame = (t) => {
        const elapsed = t - start;
        ctx.fillStyle = '#0a0f08';
        ctx.fillRect(0, 0, W, H);
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            const d = Math.hypot(x - cx, y - cy);
            let intensity = 0;
            for (const offset of PULSES_AT) {
              const pe = elapsed - offset;
              if (pe < 0) continue;
              const frontDist = (pe / 1000) * PULSE_SPEED;
              const delta = Math.abs(d - frontDist);
              if (delta < PULSE_WIDTH) intensity = Math.max(intensity, 1 - delta / PULSE_WIDTH);
            }
            const idle = Math.max(0, 0.08 - d / maxDist * 0.08);
            intensity = Math.max(intensity, idle);
            if (intensity > 0.02) {
              const r = Math.round(0x0a + (R - 0x0a) * intensity);
              const g = Math.round(0x0f + (G - 0x0f) * intensity);
              const b = Math.round(0x08 + (B - 0x08) * intensity);
              ctx.fillStyle = `rgb(${r},${g},${b})`;
              ctx.fillRect(x * CELL, y * CELL, CELL - GAP, CELL - GAP);
            }
          }
        }
        if (elapsed < DURATION) rafId = requestAnimationFrame(frame);
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
