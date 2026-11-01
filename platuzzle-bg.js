// Platuzzle page background: the game's tilted-square pattern, mirrored (opposite tilt and
// opposite size diagonal) and inverted (lighter squares on grey). Each of the three sizes is
// its own depth layer that follows the mouse: large squares are in front and move least,
// small ones are furthest back and move most. Past the first screen the whole background
// warms up and the squares fade toward it, so the text below reads cleanly. 2D canvas only.
(() => {
  const SPACING = 72;
  const ANGLE = (-23 * Math.PI) / 180;              // the game tilts +23°; mirrored here
  const SIZES = [0.175, 0.29, 0.4];                  // side / spacing, small → large (from the game)
  const SHIFT = [14, 8, 4];                          // max mouse offset per layer in px, back → front
  // [background, squares] on the first screen, and once scrolled past it
  const HERO = [[215, 215, 215], [230, 230, 230]];
  const READ = [[224, 219, 209], [229, 225, 216]];
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const rgb = (c) => `rgb(${c.join(", ")})`;
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const canvas = document.createElement("canvas");
  canvas.className = "pz-bg";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);
  const ctx = canvas.getContext("2d");

  let w = 0, h = 0;
  const target = {x: 0, y: 0}, cur = {x: 0, y: 0};

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    w = innerWidth; h = innerHeight;
    canvas.width = Math.ceil(w * dpr);
    canvas.height = Math.ceil(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  // 0 on the first screen, 1 once the next section fills most of the viewport
  const progress = () => Math.min(1, Math.max(0, (scrollY - h * 0.15) / (h * 0.6)));

  let shown = -1;
  function draw() {
    const t = progress();
    const bg = mix(HERO[0], READ[0], t), fg = mix(HERO[1], READ[1], t);
    if (t !== shown) {                                // keep cards and the page edge in step
      document.body.style.setProperty("--paper", rgb(bg));
      shown = t;
    }
    ctx.fillStyle = rgb(bg);
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = rgb(fg);
    const cos = Math.cos(ANGLE), sin = Math.sin(ANGLE);
    for (let layer = 0; layer < 3; layer++) {         // back (small) first, front (large) last
      const half = (SIZES[layer] * SPACING) / 2;
      const ox = cur.x * SHIFT[layer], oy = cur.y * SHIFT[layer];
      ctx.beginPath();
      for (let j = -1; j * SPACING < h + SPACING; j++) {
        for (let i = -1; i * SPACING < w + SPACING; i++) {
          if ((((i + j) % 3) + 3) % 3 !== layer) continue;   // sizes cycle along the "/" diagonal
          const cx = i * SPACING + SPACING / 2 + ox, cy = j * SPACING + SPACING / 2 + oy;
          ctx.moveTo(cx + (-half * cos + half * sin), cy + (-half * sin - half * cos));
          ctx.lineTo(cx + (half * cos + half * sin), cy + (half * sin - half * cos));
          ctx.lineTo(cx + (half * cos - half * sin), cy + (half * sin + half * cos));
          ctx.lineTo(cx + (-half * cos - half * sin), cy + (-half * sin + half * cos));
          ctx.closePath();
        }
      }
      ctx.fill();
    }
  }

  // Ease toward the mouse; stop redrawing once settled.
  let running = false;
  function tick() {
    cur.x += (target.x - cur.x) * 0.08;
    cur.y += (target.y - cur.y) * 0.08;
    draw();
    if (Math.abs(target.x - cur.x) + Math.abs(target.y - cur.y) > 0.002) requestAnimationFrame(tick);
    else running = false;
  }

  if (!still) {
    addEventListener("mousemove", (e) => {
      target.x = -(e.clientX / w - 0.5) * 2;          // layers drift away from the pointer
      target.y = -(e.clientY / h - 0.5) * 2;
      if (!running) { running = true; requestAnimationFrame(tick); }
    });
  }
  let queued = false;
  addEventListener("scroll", () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; draw(); });
  }, {passive: true});
  addEventListener("resize", resize);
  resize();
})();
