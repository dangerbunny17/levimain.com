// Hero animation: a Destiny-style hexagon sigil over drifting, connected particles.
const TAU = Math.PI * 2;
const MAIN = '#ffffff';
const BG = '#0000aa';
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
let W, H, DPR, CX, CY, R;
const wide = matchMedia('(min-width: 1000px)'); // must match the breakpoint in style.css

// ---------- particles ----------
let parts = [];
const mouse = { x: -1e4, y: -1e4 };

function makeParticles() {
  const n = Math.min(120, Math.round((W * H) / 13000));
  while (parts.length < n) parts.push({
    x: Math.random() * W, y: Math.random() * H,
    vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30,
    r: 1.2 + Math.random() * 1.6,
  });
  parts.length = n;
}

addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
document.documentElement.addEventListener('mouseleave', () => { mouse.x = mouse.y = -1e4; });

function resize() {
  DPR = Math.min(devicePixelRatio || 1, 2);
  W = innerWidth; H = innerHeight;
  cv.width = W * DPR; cv.height = H * DPR;
  const quip = document.getElementById('quip');
  if (wide.matches) {
    // desktop: animation on the left, quip fills the right (see style.css)
    CX = W * 0.3; CY = H / 2;
    R = Math.min(W * 0.2, H * 0.34);
    quip.style.top = '';
  } else {
    CX = W / 2; CY = H * 0.45;
    R = Math.min(W * 0.4, H * 0.32);
    quip.style.top = (CY + R * 1.3) + 'px';
  }
  makeParticles();
}

// ---------- drawing helpers ----------
const clamp01 = v => Math.max(0, Math.min(1, v));
const ease = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
// Eased 0 -> 1 progress between times a and b.
const seg = (u, a, b) => ease(clamp01((u - a) / (b - a)));

function pen(color, alpha = 1, width = 1) {
  ctx.strokeStyle = ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = width;
}

function circle(r) { ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke(); }
function polar(r, a) { return [Math.cos(a) * r, Math.sin(a) * r]; }

function shape(points) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
}

// The sides of a polygon drawn as long straight lines that run past the corners.
// a = distance from center to each line, half = half the line length.
function sideLines(a, half, rot, sides) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const th = rot + (i / sides) * TAU, nx = Math.cos(th), ny = Math.sin(th);
    ctx.moveTo(nx * a - ny * half, ny * a + nx * half);
    ctx.lineTo(nx * a + ny * half, ny * a - nx * half);
  }
  ctx.stroke();
}

// Isometric cube made of three rhombi. spread pushes the faces apart.
function cube(r, spread) {
  [[-Math.PI / 2, 1], [Math.PI / 6, 0.62], [(5 * Math.PI) / 6, 0.34]].forEach(([dir, shade]) => {
    const [ox, oy] = polar(spread, dir);
    pen(MAIN, shade);
    ctx.save(); ctx.translate(ox, oy);
    shape([[0, 0], polar(r, dir - Math.PI / 3), polar(r, dir), polar(r, dir + Math.PI / 3)]);
    ctx.restore();
  });
}

// ---------- scene ----------
// 6 s loop: lines stretch out, hold, pull back, then everything turns 60° while the cube splits and closes.
function sigil(t, s) {
  const P = 6, u = t % P, k = Math.floor(t / P);
  const ext = seg(u, 0.2, 1.4) - seg(u, 3.2, 4.4);
  const turn = (k + seg(u, 4.6, 5.6)) * (Math.PI / 3);
  const split = seg(u, 4.4, 5) - seg(u, 5.3, 5.9);

  pen(MAIN, 0.35, s * 0.012); circle(s * 0.92);
  pen(MAIN, 0.6, s * 0.015); circle(s * 0.64);

  ctx.save(); ctx.rotate(turn);
  pen(MAIN, 0.95, s * 0.018); sideLines(s * 0.5, s * (0.29 + 0.62 * ext), 0, 6);
  ctx.restore();

  ctx.save(); ctx.rotate(-turn);
  pen(MAIN, 0.45, s * 0.012); sideLines(s * 0.42, s * (0.24 + 0.6 * (1 - ext)), Math.PI / 6, 6);
  ctx.restore();

  const [mx, my] = polar(s * 0.92, turn - Math.PI / 2);
  pen(MAIN, 1); ctx.fillRect(mx - s * 0.025, my - s * 0.025, s * 0.05, s * 0.05);

  ctx.save(); ctx.rotate(turn); cube(s * 0.2, s * 0.08 * split); ctx.restore();
}

// ---------- frame ----------
function backdrop(dt) {
  ctx.fillStyle = BG; ctx.globalAlpha = 1; ctx.fillRect(0, 0, W, H);

  for (const p of parts) {
    const dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.hypot(dx, dy);
    if (d < 120 && d > 0) { const push = (1 - d / 120) * 240 * dt; p.x += (dx / d) * push; p.y += (dy / d) * push; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
    if (p.y < -10) p.y = H + 10; else if (p.y > H + 10) p.y = -10;
  }

  for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
    const a = parts[i], b = parts[j], d = Math.hypot(a.x - b.x, a.y - b.y);
    if (d < 140) { pen(MAIN, 0.55 * (1 - d / 140), 1); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  }

  pen(MAIN, 0.95);
  for (const p of parts) { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill(); }

  pen(MAIN, 0.5, 1.5);
  const m = 24, s = 18;
  ctx.beginPath();
  for (const [x, y, dx, dy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) {
    ctx.moveTo(x + dx * s, y); ctx.lineTo(x, y); ctx.lineTo(x, y + dy * s);
  }
  ctx.stroke();
}

function render(t, dt) {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  backdrop(dt);
  ctx.save(); ctx.translate(CX, CY);
  sigil(t, R);
  ctx.restore();
}

// ---------- frame-rate counter (only shown at /?fps) ----------
const fpsEl = new URLSearchParams(location.search).has('fps') ? document.body.appendChild(document.createElement('div')) : null;
let frames = 0, fpsStart = performance.now(), last = performance.now();
if (fpsEl) {
  fpsEl.className = 'fps';
  fpsEl.textContent = reduce ? 'reduced motion: animation off' : '-- fps';
}

function loop(ms) {
  render(ms / 1000, Math.min(0.05, (ms - last) / 1000));
  last = ms;
  if (fpsEl) {
    frames++;
    if (ms - fpsStart >= 500) {
      fpsEl.textContent = Math.round((frames * 1000) / (ms - fpsStart)) + ' fps';
      frames = 0; fpsStart = ms;
    }
  }
  requestAnimationFrame(loop);
}

addEventListener('resize', () => { resize(); if (reduce) render(2, 0); });
resize();
if (reduce) render(2, 0); else requestAnimationFrame(loop);
