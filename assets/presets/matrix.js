(() => {
  if (!window.CTFdSolveFX) return;
  const { helpers, config } = CTFdSolveFX;

  const CHARS = 'ｦｧｨｩｪｫｬｭｮｯｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉ0123456789{}[]<>#@$%&';
  const pick = () => CHARS[(Math.random() * CHARS.length) | 0];

  function brighten(hex, amt = 0.4) {
    const h = hex.replace('#', '');
    const r = Math.min(255, parseInt(h.slice(0, 2), 16) + 255 * amt) | 0;
    const g = Math.min(255, parseInt(h.slice(2, 4), 16) + 255 * amt) | 0;
    const b = Math.min(255, parseInt(h.slice(4, 6), 16) + 255 * amt) | 0;
    return `rgb(${r},${g},${b})`;
  }

  CTFdSolveFX.register('matrix', {
    celebration(onDone) {
      const overlay = helpers.makeOverlay();
      const canvas = overlay.querySelector('.solvefx-canvas');
      const W = window.innerWidth, H = window.innerHeight;
      const ctx = helpers.fitCanvas(canvas, W, H);

      const CHAR_H = 18, COL_W = 14;
      const cols = Math.ceil(W / COL_W), rows = Math.ceil(H / CHAR_H);
      const heads = Array.from({ length: cols }, () => -Math.random() * rows);
      const speeds = Array.from({ length: cols }, () => 0.4 + Math.random() * 0.8);

      ctx.font = `bold ${CHAR_H}px monospace`;
      ctx.fillStyle = '#0a0f08';
      ctx.fillRect(0, 0, W, H);

      const DURATION = 2600;
      const start = performance.now();
      let rafId;

      const frame = (t) => {
        ctx.fillStyle = 'rgba(10, 15, 8, 0.12)';
        ctx.fillRect(0, 0, W, H);
        for (let c = 0; c < cols; c++) {
          const headRow = Math.floor(heads[c]);
          if (headRow >= 0 && headRow < rows) {
            ctx.fillStyle = brighten(config.color, 0.55);
            ctx.fillText(pick(), c * COL_W, headRow * CHAR_H + CHAR_H);
          }
          ctx.fillStyle = config.color;
          for (let i = 1; i < 14; i++) {
            const r = headRow - i;
            if (r < 0 || r >= rows) continue;
            ctx.globalAlpha = Math.max(0, 1 - i / 14);
            ctx.fillText(pick(), c * COL_W, r * CHAR_H + CHAR_H);
          }
          ctx.globalAlpha = 1;
          heads[c] += speeds[c];
          if (heads[c] > rows + 15) heads[c] = -5 - Math.random() * 20;
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
