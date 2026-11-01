// Home background: a quiet grid of dots. Near the pointer the dots grow into outlined squares,
// easing in and out (a nod to Platuzzle's block transition). 2D canvas only.
(() => {
  const STEP = 36;            // grid spacing, px
  const RADIUS = 170;         // reach of the pointer, px
  const MAX = 24;             // largest square side, px
  const DOT = 2;              // resting dot size, px
  const INK = "48, 48, 48";
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const canvas = document.createElement("canvas");
  canvas.className = "home-bg";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);
  const ctx = canvas.getContext("2d");

  let w = 0, h = 0, cols = 0, rows = 0, size = new Float32Array(0);
  const pointer = {x: -1e4, y: -1e4};

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    w = innerWidth; h = innerHeight;
    canvas.width = Math.ceil(w * dpr);
    canvas.height = Math.ceil(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(w / STEP) + 1;
    rows = Math.ceil(h / STEP) + 1;
    size = new Float32Array(cols * rows);
    draw();
  }

  // Target size for a cell: smooth falloff with distance from the pointer.
  function target(cx, cy) {
    const d = Math.hypot(cx - pointer.x, cy - pointer.y) / RADIUS;
    if (d >= 1) return 0;
    const t = 1 - d;
    return t * t * (3 - 2 * t);
  }

  // Returns true while any cell is still moving.
  function step() {
    let moving = false;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const k = j * cols + i;
        const goal = target(i * STEP + STEP / 2, j * STEP + STEP / 2);
        const next = size[k] + (goal - size[k]) * 0.16;
        if (Math.abs(next - goal) > 0.002) moving = true;
        size[k] = Math.abs(next - goal) > 0.002 ? next : goal;
      }
    }
    return moving;
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 1;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const s = size[j * cols + i];
        const cx = i * STEP + STEP / 2, cy = j * STEP + STEP / 2;
        if (s < 0.08) {
          ctx.fillStyle = `rgba(${INK}, 0.12)`;
          ctx.fillRect(cx - DOT / 2, cy - DOT / 2, DOT, DOT);
          continue;
        }
        const side = DOT + (MAX - DOT) * s;
        ctx.fillStyle = `rgba(250, 250, 250, ${0.75 * s})`;
        ctx.fillRect(cx - side / 2, cy - side / 2, side, side);
        ctx.strokeStyle = `rgba(${INK}, ${0.12 + 0.24 * s})`;
        ctx.strokeRect(Math.round(cx - side / 2) + 0.5, Math.round(cy - side / 2) + 0.5, Math.round(side), Math.round(side));
      }
    }
  }

  let running = false;
  function tick() {
    const moving = step();
    draw();
    if (moving) requestAnimationFrame(tick);
    else running = false;
  }
  function kick() {
    if (!running) { running = true; requestAnimationFrame(tick); }
  }

  if (!still) {
    addEventListener("pointermove", (e) => { pointer.x = e.clientX; pointer.y = e.clientY; kick(); });
    document.addEventListener("pointerleave", () => { pointer.x = pointer.y = -1e4; kick(); });
    addEventListener("blur", () => { pointer.x = pointer.y = -1e4; kick(); });
  }
  addEventListener("resize", resize);
  resize();
})();
