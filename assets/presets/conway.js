(() => {
  if (!window.CTFdSolveFX) return;
  const { helpers, config } = CTFdSolveFX;

  const R_PENTOMINO = [[1,0],[2,0],[0,1],[1,1],[1,2]];
  const GLIDER      = [[1,0],[2,1],[0,2],[1,2],[2,2]];

  function stamp(grid, cols, rows, pattern, cx, cy) {
    for (const [dx, dy] of pattern) {
      const x = (cx + dx + cols) % cols;
      const y = (cy + dy + rows) % rows;
      grid[y * cols + x] = 1;
    }
  }

  CTFdSolveFX.register('conway', {
    celebration(onDone) {
      const overlay = helpers.makeOverlay();
      const canvas = overlay.querySelector('.solvefx-canvas');
      const W = window.innerWidth, H = window.innerHeight;
      const ctx = helpers.fitCanvas(canvas, W, H);

      const CELL = 12, GAP = 1;
      const cols = Math.ceil(W / CELL), rows = Math.ceil(H / CELL);
      const size = cols * rows;

      let grid = new Uint8Array(size);
      let prev = new Uint8Array(size);
      let next = new Uint8Array(size);


      for (let i = 0; i < size; i++) grid[i] = Math.random() < 0.28 ? 1 : 0;

      for (let i = 0; i < 6; i++) {
        stamp(grid, cols, rows, R_PENTOMINO,
              (Math.random() * cols) | 0, (Math.random() * rows) | 0);
      }
      for (let i = 0; i < 8; i++) {
        stamp(grid, cols, rows, GLIDER,
              (Math.random() * cols) | 0, (Math.random() * rows) | 0);
      }

      const hex = config.color.replace('#', '');
      const R = parseInt(hex.slice(0, 2), 16);
      const G = parseInt(hex.slice(2, 4), 16);
      const B = parseInt(hex.slice(4, 6), 16);
      const FADE = `rgb(${(R*0.25)|0},${(G*0.25)|0},${(B*0.25)|0})`;

      const step = () => {
        for (let y = 0; y < rows; y++) {
          const yN = (y - 1 + rows) % rows, yS = (y + 1) % rows;
          for (let x = 0; x < cols; x++) {
            const xW = (x - 1 + cols) % cols, xE = (x + 1) % cols;
            const n = grid[yN*cols+xW]+grid[yN*cols+x]+grid[yN*cols+xE]+
                      grid[y*cols+xW]+grid[y*cols+xE]+
                      grid[yS*cols+xW]+grid[yS*cols+x]+grid[yS*cols+xE];
            const c = grid[y*cols+x];
            next[y*cols+x] = (c && (n === 2 || n === 3)) || (!c && n === 3) ? 1 : 0;
          }
        }
        [prev, grid, next] = [grid, next, prev];
      };

      const draw = () => {
        ctx.fillStyle = '#0a0f08';
        ctx.fillRect(0, 0, W, H);
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            const i = y * cols + x;
            if (grid[i]) {
              ctx.fillStyle = config.color;
              ctx.fillRect(x * CELL, y * CELL, CELL - GAP, CELL - GAP);
            } else if (prev[i]) {
              ctx.fillStyle = FADE;
              ctx.fillRect(x * CELL, y * CELL, CELL - GAP, CELL - GAP);
            }
          }
        }
      };

      const STEP_MS = 70;
      const DURATION = 3000;
      const start = performance.now();
      let lastStep = start;
      let rafId;

      const frame = (t) => {
        if (t - lastStep >= STEP_MS) {
          step();
          lastStep = t;
        }
        draw();
        if (t - start < DURATION) rafId = requestAnimationFrame(frame);
        else dismiss();
      };

      const dismiss = () => {
        cancelAnimationFrame(rafId);
        overlay.classList.add('solvefx-out');
        setTimeout(() => overlay.remove(), 600);
        onDone();
      };

      draw();
      rafId = requestAnimationFrame(frame);
      overlay.addEventListener('click', dismiss);
      setTimeout(dismiss, config.maxDurationMs);
    },
  });
})();
