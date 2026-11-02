// Page transitions, one style per game. Layers: the clicked cover (a fixed "flyer" copy) on top,
// a 2D canvas in the work's colour below it, covering everything else.
// Enter: the colour spreads from the cover while the cover flies to where the work page's hero
// image sits; the work page then opens with the cover already in place and fades its text in.
// Return ("← All works"): the home page opens covered, the colour recedes into the cover's slot
// and the cover flies back from the hero position into it.
(() => {
  const RETURN_KEY = "portfolio-return";
  const ENTER_KEY = "portfolio-enter";
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

  const clamp01 = (t) => Math.min(1, Math.max(0, t));
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOutBack = (t) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);
  const hash = (i, j) => {
    let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };

  const STYLES = {
    // BIT ROT: memory cells flip over in discrete steps; a few glitch yellow at the front.
    bitrot: {
      bg: "#101820",
      accent: "#e8c832",
      duration: 760,
      draw(ctx, p, o) {
        const C = 36, STEPS = 12;
        const q = p * (1 + 1 / STEPS);
        for (let j = 0; j * C < o.h; j++) {
          for (let i = 0; i * C < o.w; i++) {
            const d = Math.hypot(i * C + C / 2 - o.x, j * C + C / 2 - o.y) / o.reach;
            const at = Math.floor((d * 0.85 + hash(i, j) * 0.15) * STEPS) / STEPS;
            if (q >= at + 1 / STEPS) {
              ctx.fillStyle = this.bg;
              ctx.fillRect(i * C, j * C, C, C);
            } else if (q >= at) {
              ctx.fillStyle = hash(j + 7, i + 3) < 0.22 ? this.accent : this.bg;
              ctx.fillRect(i * C + 4, j * C + 4, C - 8, C - 8);
            }
          }
        }
      },
    },
    // Platuzzle: room-sized blocks snap open outward from the cover, with a small overshoot.
    platuzzle: {
      bg: "#d7d7d7",
      ink: "#111111",
      duration: 820,
      draw(ctx, p, o) {
        const C = 120;
        const ox = o.x - C / 2 - Math.ceil((o.x - C / 2) / C) * C;
        const oy = o.y - C / 2 - Math.ceil((o.y - C / 2) / C) * C;
        const cols = Math.ceil((o.w - ox) / C), rows = Math.ceil((o.h - oy) / C);
        const ci = Math.round((o.x - C / 2 - ox) / C), cj = Math.round((o.y - C / 2 - oy) / C);
        const maxM = Math.max(ci, cols - 1 - ci) + Math.max(cj, rows - 1 - cj) || 1;
        ctx.lineWidth = 1.5;
        for (let j = 0; j < rows; j++) {
          for (let i = 0; i < cols; i++) {
            const start = ((Math.abs(i - ci) + Math.abs(j - cj)) / maxM) * 0.68;
            const local = clamp01((p - start) / 0.32);
            if (local <= 0) continue;
            const s = Math.min(easeOutBack(local), 1.08) * C;
            const cx = ox + i * C + C / 2, cy = oy + j * C + C / 2;
            ctx.fillStyle = this.bg;
            ctx.fillRect(cx - s / 2, cy - s / 2, s, s);
            if (local < 1) {
              ctx.strokeStyle = this.ink;
              ctx.strokeRect(cx - s / 2, cy - s / 2, s, s);
            }
          }
        }
      },
    },
    // Lightpath: an amber light front sweeps outward; darkness settles in behind it.
    lightpath: {
      bg: "#06090d",
      duration: 950,
      draw(ctx, p, o) {
        const r = easeInOut(p) * (o.reach + 140);
        ctx.fillStyle = this.bg;
        ctx.beginPath();
        ctx.arc(o.x, o.y, Math.max(0, r - 50), 0, Math.PI * 2);
        ctx.fill();
        const g = ctx.createRadialGradient(o.x, o.y, Math.max(0, r - 110), o.x, o.y, r + 30);
        g.addColorStop(0, "rgba(200,168,48,0)");
        g.addColorStop(0.5, "rgba(200,168,48,0.45)");
        g.addColorStop(0.72, "rgba(255,228,150,0.55)");
        g.addColorStop(1, "rgba(200,168,48,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(o.x, o.y, r + 30, 0, Math.PI * 2);
        ctx.fill();
      },
    },
  };

  function makeCanvas() {
    const canvas = document.createElement("canvas");
    canvas.className = "veil";
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.ceil(innerWidth * dpr);
    canvas.height = Math.ceil(innerHeight * dpr);
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    return {canvas, ctx};
  }

  function origin(link) {
    const r = (link.querySelector(".shot") || link).getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    return {x, y, w: innerWidth, h: innerHeight,
      reach: Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))};
  }

  // Plays p from 0→1 (forward) or 1→0 (backward), redrawing every frame.
  function play(style, ctx, o, forward) {
    return new Promise((resolve) => {
      const t0 = performance.now();
      const frame = (now) => {
        const t = clamp01((now - t0) / style.duration);
        ctx.clearRect(0, 0, o.w, o.h);
        style.draw(ctx, forward ? t : 1 - t, o);
        if (t < 1) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
  }

  const modified = (e) => e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;

  const box = (r) => ({left: r.left, top: r.top, width: r.width, height: r.height});

  function flyer(src, rect) {
    const img = document.createElement("img");
    img.className = "shot cover flyer";
    img.src = src;
    img.alt = "";
    place(img, rect);
    document.body.appendChild(img);
    return img;
  }
  function place(el, r) {
    Object.assign(el.style, {left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px"});
  }
  // Moves el from one rect to another (2D translate + scale only).
  function fly(el, from, to, ms) {
    place(el, to);
    const dx = from.left - to.left, dy = from.top - to.top;
    const sx = from.width / to.width, sy = from.height / to.height;
    if (Math.abs(dx) + Math.abs(dy) + Math.abs(sx - 1) * 100 < 2) return Promise.resolve();
    return el.animate(
      [{transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`}, {transform: "none"}],
      {duration: ms, easing: "cubic-bezier(0.65, 0, 0.35, 1)", fill: "both"},
    ).finished;
  }
  // Where the work page's hero image will sit (mirrors .hero in style.css); null on narrow screens.
  function predictedHero() {
    if (innerWidth <= 700) return null;
    const probe = document.createElement("div");      // work pages scroll: leave room for a scrollbar
    probe.style.cssText = "position:absolute;visibility:hidden;width:100px;overflow:scroll";
    document.body.appendChild(probe);
    const vw = innerWidth - (probe.offsetWidth - probe.clientWidth);
    probe.remove();
    const h = Math.min(innerHeight - 160, 560), w = (h * 630) / 500;
    return {left: Math.max(48, (vw - 1240) / 2 + 48), top: (innerHeight - h) / 2, width: w, height: h};
  }

  // One transition at a time: while one plays, every link click is swallowed, so a double click
  // (or a click on another cover) cannot start a second transition on top of the first.
  let busy = false;
  document.addEventListener("click", (e) => {
    if (busy && e.target.closest("a")) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);

  // Enter a work.
  document.addEventListener("click", (e) => {
    const link = e.target.closest("a.entry[data-style]");
    const style = link && STYLES[link.dataset.style];
    if (!style || modified(e) || reduceMotion.matches) return;
    e.preventDefault();
    busy = true;
    const shot = link.querySelector(".shot");
    const from = box(shot.getBoundingClientRect());
    const to = predictedHero() || from;
    const el = flyer(shot.getAttribute("src"), from);
    shot.style.visibility = "hidden";
    const {ctx} = makeCanvas();
    const o = origin(link);
    Promise.all([play(style, ctx, o, true), fly(el, from, to, style.duration)]).then(() => {
      ctx.fillStyle = style.bg;
      ctx.fillRect(0, 0, o.w, o.h);
      sessionStorage.setItem(ENTER_KEY, JSON.stringify({src: shot.getAttribute("src"), rect: to}));
      location.href = link.href;
    });
  });

  // Arriving on a work page: the cover takes over from the flyer, then the text fades in.
  const root = document.documentElement;
  const entering = sessionStorage.getItem(ENTER_KEY);
  sessionStorage.removeItem(ENTER_KEY);
  const hero = document.querySelector(".hero .shot");
  if (entering && hero && !reduceMotion.matches) {
    const {src, rect} = JSON.parse(entering);
    const to = box(hero.getBoundingClientRect());
    const el = flyer(src, rect);
    fly(el, rect, to, 380).then(() => {
      root.classList.remove("arriving");
      setTimeout(() => el.remove(), 340);
    });
  } else {
    root.classList.remove("arriving");
  }

  // Leave a work page through "← All works": remember which work it was.
  document.addEventListener("click", (e) => {
    if (!e.target.closest("a[data-return]") || modified(e)) return;
    const theme = [...document.body.classList].find((c) => c.startsWith("theme-"));
    sessionStorage.setItem(RETURN_KEY, JSON.stringify({
      page: location.pathname.split("/").pop(),
      style: theme ? theme.slice(6) : "",
      rect: hero ? box(hero.getBoundingClientRect()) : null,
    }));
  });

  // Arriving home from a work page: the colour recedes into the work's cover while the cover
  // flies back from the hero position into its slot.
  const pending = sessionStorage.getItem(RETURN_KEY);
  if (pending) {
    sessionStorage.removeItem(RETURN_KEY);
    const {page, style: name, rect} = JSON.parse(pending);
    const link = document.querySelector(`a.entry[href="${page}"]`);
    const style = STYLES[name];
    if (link && style && !reduceMotion.matches) {
      const shot = link.querySelector(".shot");
      const {canvas, ctx} = makeCanvas();
      ctx.fillStyle = style.bg;                 // full cover before the first paint
      ctx.fillRect(0, 0, innerWidth, innerHeight);
      shot.style.visibility = "hidden";
      const el = rect && flyer(shot.getAttribute("src"), rect);
      busy = true;
      const start = () => {
        const home = box(shot.getBoundingClientRect());
        Promise.all([
          play(style, ctx, origin(link), false),
          el ? fly(el, rect, home, style.duration) : null,
        ]).then(() => {
          shot.style.visibility = "";
          if (el) el.remove();
          canvas.remove();
          busy = false;
        });
      };
      if (document.readyState === "complete") setTimeout(start, 0);
      else addEventListener("load", () => setTimeout(start, 0), {once: true});
    }
  }

  // Back/forward cache restores: drop any leftover overlay.
  addEventListener("pageshow", (e) => {
    if (!e.persisted) return;
    busy = false;
    document.querySelectorAll(".veil, .flyer").forEach((v) => v.remove());
    document.querySelectorAll(".entry .shot").forEach((s) => (s.style.visibility = ""));
    root.classList.remove("arriving");
  });

  // Section blocks ease in when they scroll into view and ease out when they leave.
  // The hero is left alone: the flying cover lands on it.
  if ("IntersectionObserver" in window && !reduceMotion.matches) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) e.target.classList.toggle("in", e.isIntersecting);
    }, {threshold: 0.12});
    document.querySelectorAll("main.work .section:not(.hero)").forEach((section) => {
      [...section.children].forEach((block, i) => {
        block.classList.add("reveal");
        block.style.transitionDelay = `${i * 70}ms`;
        io.observe(block);
      });
    });
  }

  // Inspection hook for previewing a frame: one style at progress p, with the cover on top.
  window.__previewTransition = (name, p, page) => {
    document.querySelectorAll(".veil, .flyer").forEach((v) => v.remove());
    const link = document.querySelector(`a.entry[href="${page}"]`);
    const shot = link.querySelector(".shot");
    const from = box(shot.getBoundingClientRect()), to = predictedHero() || from;
    const k = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    const {ctx} = makeCanvas();
    STYLES[name].draw(ctx, p, origin(link));
    flyer(shot.getAttribute("src"), {
      left: from.left + (to.left - from.left) * k, top: from.top + (to.top - from.top) * k,
      width: from.width + (to.width - from.width) * k, height: from.height + (to.height - from.height) * k,
    });
  };
})();
