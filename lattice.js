// Hero animation: a spinning 3D wireframe (icosahedron + inner octahedron) with orbit rings.
const TAU = Math.PI * 2;
const MAIN = '#ff7a1f';
const ALERT = '#ff2e57';
const BG = '#050607';
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
let W, H, DPR, CX, CY, R;

function resize() {
  DPR = Math.min(devicePixelRatio || 1, 2);
  W = innerWidth; H = innerHeight;
  cv.width = W * DPR; cv.height = H * DPR;
  CX = W / 2; CY = H * 0.45;
  R = Math.min(W * 0.4, H * 0.32);
  document.getElementById('quip').style.top = (CY + R * 1.3) + 'px';
}

// ---------- drawing helpers ----------
function pen(color, alpha = 1, width = 1) {
  ctx.strokeStyle = ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = width;
}

function core(t, size) {
  const p = 0.5 + 0.5 * Math.sin(t * 2.2);
  pen(MAIN, 1);
  ctx.shadowBlur = 12 + 26 * p; ctx.shadowColor = MAIN;
  ctx.beginPath(); ctx.arc(0, 0, size * (1 + 0.3 * p), 0, TAU); ctx.fill();
  ctx.shadowBlur = 0;
}

// ---------- geometry ----------
const PHI = (1 + Math.sqrt(5)) / 2;

const ICO = (() => {
  const v = [], L = Math.hypot(1, PHI);
  for (const a of [-1, 1]) for (const b of [-1, 1]) v.push([0, a, b * PHI], [a, b * PHI, 0], [b * PHI, 0, a]);
  const verts = v.map(p => p.map(n => n / L));
  const edge = 2 / L, edges = [];
  for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) {
    const d = Math.hypot(...verts[i].map((n, k) => n - verts[j][k]));
    if (Math.abs(d - edge) < 1e-3) edges.push([i, j]);
  }
  return { verts, edges };
})();

const OCTA = (() => {
  const verts = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]], edges = [];
  for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) if (Math.floor(i / 2) !== Math.floor(j / 2)) edges.push([i, j]);
  return { verts, edges };
})();

function rot3([x, y, z], ax, ay) {
  let c = Math.cos(ay), s = Math.sin(ay);
  [x, z] = [x * c + z * s, -x * s + z * c];
  c = Math.cos(ax); s = Math.sin(ax);
  [y, z] = [y * c - z * s, y * s + z * c];
  return [x, y, z];
}

function proj([x, y, z], scale) {
  const f = 3 / (3 + z);
  return [x * scale * f, y * scale * f, z];
}

// Draws a shape's edges, brighter when closer to the viewer. Returns projected vertices.
function wire(shape, scale, ax, ay, color, baseAlpha, width) {
  const p = shape.verts.map(v => proj(rot3(v, ax, ay), scale));
  for (const [i, j] of shape.edges) {
    const depth = (p[i][2] + p[j][2]) / 2; // -1 near, +1 far
    pen(color, baseAlpha * (0.25 + 0.75 * (1 - (depth + 1) / 2)), width);
    ctx.beginPath(); ctx.moveTo(p[i][0], p[i][1]); ctx.lineTo(p[j][0], p[j][1]); ctx.stroke();
  }
  return p;
}

// ---------- scene ----------
function lattice(t) {
  for (let k = 0; k < 3; k++) {
    const tilt = 0.4 + k * 1.05, spin = t * 0.12 * (k % 2 ? 1 : -1) + k;
    ctx.setLineDash([3, 6]); pen(MAIN, 0.3, 1);
    ctx.beginPath();
    for (let i = 0; i <= 96; i++) {
      const u = (i / 96) * TAU;
      const [x, y] = proj(rot3([Math.cos(u) * 1.3, Math.sin(u) * 1.3, 0], tilt, spin), R * 0.8);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke(); ctx.setLineDash([]);
    const u = t * (0.5 + k * 0.25) + k * 2;
    const [mx, my] = proj(rot3([Math.cos(u) * 1.3, Math.sin(u) * 1.3, 0], tilt, spin), R * 0.8);
    pen(k === 1 ? ALERT : MAIN, 1); ctx.fillRect(mx - 3, my - 3, 6, 6);
  }

  const p = wire(ICO, R * 0.85, t * 0.23, t * 0.31, MAIN, 1, 1.4);
  pen(MAIN, 0.08, 1);
  ctx.beginPath();
  for (const v of p) { ctx.moveTo(0, 0); ctx.lineTo(v[0], v[1]); }
  ctx.stroke();
  for (const v of p) {
    pen(MAIN, 0.35 + 0.65 * (1 - (v[2] + 1) / 2));
    ctx.fillRect(v[0] - 2.5, v[1] - 2.5, 5, 5);
  }

  wire(OCTA, R * 0.38, -t * 0.5, t * 0.4, ALERT, 0.95, 1.2);
  core(t, R * 0.04);
}

// ---------- frame ----------
function backdrop() {
  ctx.fillStyle = BG; ctx.globalAlpha = 1; ctx.fillRect(0, 0, W, H);

  pen(MAIN, 0.045, 1);
  ctx.beginPath();
  const g = 48, ox = CX % g, oy = CY % g;
  for (let x = ox; x < W; x += g) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let y = oy; y < H; y += g) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();

  pen(MAIN, 0.5, 1.5);
  const m = 24, s = 18;
  ctx.beginPath();
  for (const [x, y, dx, dy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) {
    ctx.moveTo(x + dx * s, y); ctx.lineTo(x, y); ctx.lineTo(x, y + dy * s);
  }
  ctx.stroke();
}

function render(t) {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  backdrop();
  ctx.save(); ctx.translate(CX, CY);
  lattice(t);
  ctx.restore();
}

function loop(ms) { render(ms / 1000); requestAnimationFrame(loop); }

addEventListener('resize', () => { resize(); if (reduce) render(20); });
resize();
if (reduce) render(20); else requestAnimationFrame(loop);
