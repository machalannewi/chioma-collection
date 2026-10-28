// Client-only: paints on <canvas>. Import from components after mount.
// Placeholder artwork for the collection, painted on canvas so the site works
// without any image files. To use real photos, add them to PHOTOS below:
//   PHOTOS.ledger = { card: '/images/ledger.jpg', scene: '/images/ledger-wide.jpg' }
// Any view without a photo falls back to the painted artwork.

const W = 560, H = 640;   // artwork is drawn in this space, at 2× for crisp crops

export type ViewName = 'card' | 'scene' | 'strip' | 'detail' | 'tall' | 'wide' | 'close';
export interface View { w: number; h: number; zoom: number; focus?: 0 | 1 }
export interface Paintable { slug: string; focus?: [number, number][] }
type Ctx = CanvasRenderingContext2D;
type Rand = () => number;

export const PHOTOS: Partial<Record<string, Partial<Record<ViewName, string>>>> = {};

const DRAW: Record<string, (ctx: Ctx, rand: Rand) => void> = { ledger, wildflower, haven, monogram, mise, dusk, bloom, sampler, kit, knots, portrait };

// Each view is a frame onto the artwork: its size, how far it zooms in,
// and which of the work's two focus points it centres on.
export const VIEWS: Record<ViewName, View> = {
  card: { w: 560, h: 640, zoom: 1 },
  scene: { w: 1600, h: 900, zoom: 1 },
  strip: { w: 1600, h: 760, zoom: 1.1, focus: 1 },
  detail: { w: 900, h: 900, zoom: 1.6, focus: 0 },
  tall: { w: 880, h: 1100, zoom: 1.3, focus: 1 },
  wide: { w: 1600, h: 900, zoom: 1.05, focus: 0 },
  close: { w: 900, h: 900, zoom: 2, focus: 1 },
};

const bases = new Map<string, HTMLCanvasElement>();
const views = new Map<string, string>();

function base(slug: string): HTMLCanvasElement {
  if (!bases.has(slug)) {
    const c = document.createElement('canvas');
    c.width = W * 2; c.height = H * 2;
    const ctx = c.getContext('2d')!;
    ctx.scale(2, 2);
    DRAW[slug](ctx, rng(hash(slug)));
    bases.set(slug, c);
  }
  return bases.get(slug)!;
}

export function paint(work: Paintable, view: ViewName = 'card'): string {
  const photo = PHOTOS[work.slug]?.[view];
  if (photo) return photo;
  const key = `${work.slug}:${view}`;
  const cached = views.get(key);
  if (cached) return cached;
  const v = VIEWS[view];
  readFonts();
  const art = base(work.slug);
  const c = document.createElement('canvas');
  c.width = v.w; c.height = v.h;
  const ctx = c.getContext('2d')!;
  // The backdrop colour, sampled from the artwork's corner, fills any margin.
  const [r, g, b] = art.getContext('2d')!.getImageData(6, 6, 1, 1).data;
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, v.w, v.h);
  const [fx, fy] = v.focus === undefined ? [0.5, 0.5] : work.focus?.[v.focus] ?? [0.5, 0.5];
  const s = Math.max(v.h / art.height, v.zoom === 1 ? 0 : v.w / art.width) * v.zoom;
  const dw = art.width * s, dh = art.height * s;
  const dx = Math.min(0, Math.max(v.w - dw, v.w / 2 - fx * dw));
  const dy = Math.min(0, Math.max(v.h - dh, v.h / 2 - fy * dh));
  ctx.drawImage(art, dw < v.w ? (v.w - dw) / 2 : dx, dh < v.h ? (v.h - dh) / 2 : dy, dw, dh);
  if (dw < v.w) {
    // Feather the artwork's side edges into the margin.
    const edge = (x0: number, x1: number) => {
      const grad = ctx.createLinearGradient(x0, 0, x1, 0);
      grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(Math.min(x0, x1), 0, Math.abs(x1 - x0), v.h);
    };
    const left = (v.w - dw) / 2;
    edge(left, left + 40);
    edge(left + dw, left + dw - 40);
  }
  const url = c.toDataURL('image/jpeg', 0.86);
  views.set(key, url);
  return url;
}

// ---------------------------------------------------------------- helpers

function hash(s: string): number { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; }
function rng(seed: number): Rand {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let SANS = 'Inter, system-ui, sans-serif';
let SERIF = 'Fraunces, Georgia, serif';
function readFonts() {
  const css = getComputedStyle(document.documentElement);
  SANS = css.getPropertyValue('--font-sans').trim() || SANS;
  SERIF = css.getPropertyValue('--font-display').trim() || SERIF;
}

function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}
function fillRR(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string | CanvasGradient) { rr(ctx, x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); }
function text(ctx: Ctx, str: string, x: number, y: number, size: number, color: string, weight = 500, font = SANS, align: CanvasTextAlign = 'left') {
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x, y);
}
function bars(ctx: Ctx, x: number, y: number, widths: number[], h: number, gap: number, color: string) {
  widths.forEach((w, i) => fillRR(ctx, x, y + i * (h + gap), w, h, h / 2, color));
}
function backdrop(ctx: Ctx, color: string, rand: Rand, grain = 0.05) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 2200; i++) {
    ctx.fillStyle = rand() < 0.5 ? `rgba(0,0,0,${grain * rand()})` : `rgba(255,255,255,${grain * rand()})`;
    ctx.fillRect(rand() * W, rand() * H, 1.4, 1.4);
  }
}
function softShadow(ctx: Ctx, blur: number, y: number, alpha = 0.35) {
  ctx.shadowColor = `rgba(30,18,10,${alpha})`;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetY = y;
}
function noShadow(ctx: Ctx) { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; }

// A phone with its screen drawn by `screen(ctx, w, h)` in local coordinates.
function phone(ctx: Ctx, cx: number, cy: number, w: number, h: number, angle: number, bg: string, screen: (c: Ctx, w: number, h: number) => void) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  softShadow(ctx, 40, 24);
  fillRR(ctx, -w / 2, -h / 2, w, h, w * 0.16, '#121212');
  noShadow(ctx);
  const p = w * 0.04;
  ctx.save();
  rr(ctx, -w / 2 + p, -h / 2 + p, w - p * 2, h - p * 2, w * 0.13);
  ctx.clip();
  ctx.translate(-w / 2 + p, -h / 2 + p);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w - p * 2, h - p * 2);
  screen(ctx, w - p * 2, h - p * 2);
  ctx.restore();
  fillRR(ctx, -w * 0.13, -h / 2 + p + 6, w * 0.26, 14, 7, '#121212'); // island
  ctx.restore();
}

// --- embroidery

function linen(ctx: Ctx, x: number, y: number, w: number, h: number, color: string, rand: Rand, weave = 0.06) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.lineWidth = 1;
  for (let i = 0; i < w; i += 2.2) {
    ctx.strokeStyle = `rgba(0,0,0,${weave * (0.4 + rand())})`;
    ctx.beginPath(); ctx.moveTo(x + i, y); ctx.lineTo(x + i, y + h); ctx.stroke();
  }
  for (let j = 0; j < h; j += 2.2) {
    ctx.strokeStyle = `rgba(255,255,255,${weave * (0.3 + rand())})`;
    ctx.beginPath(); ctx.moveTo(x, y + j); ctx.lineTo(x + w, y + j); ctx.stroke();
  }
}

function hoop(ctx: Ctx, cx: number, cy: number, r: number, fabric: string, rand: Rand, inside: () => void) {
  // fabric overhang behind the ring
  softShadow(ctx, 50, 26, 0.4);
  ctx.beginPath(); ctx.arc(cx, cy, r + 14, 0, Math.PI * 2);
  ctx.fillStyle = fabric; ctx.fill();
  noShadow(ctx);
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
  linen(ctx, cx - r, cy - r, r * 2, r * 2, fabric, rand);
  inside();
  // tension shading towards the ring
  const g = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.16)');
  ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.restore();
  // wooden rings
  const wood = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  wood.addColorStop(0, '#e2b882'); wood.addColorStop(0.5, '#c89560'); wood.addColorStop(1, '#a8743f');
  ctx.lineWidth = 15; ctx.strokeStyle = wood;
  ctx.beginPath(); ctx.arc(cx, cy, r + 7, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(80,45,15,0.5)';
  ctx.beginPath(); ctx.arc(cx, cy, r + 1, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, r + 14, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,240,215,0.45)';
  ctx.beginPath(); ctx.arc(cx, cy, r + 9, Math.PI * 1.05, Math.PI * 1.45); ctx.stroke();
  // brass clamp
  ctx.save();
  ctx.translate(cx, cy - r - 7);
  const brass = ctx.createLinearGradient(-16, 0, 16, 0);
  brass.addColorStop(0, '#9c7a3c'); brass.addColorStop(0.5, '#f0d48c'); brass.addColorStop(1, '#8a6a30');
  fillRR(ctx, -15, -16, 30, 22, 4, brass);
  fillRR(ctx, -4, -34, 8, 20, 3, brass);
  ctx.beginPath(); ctx.arc(0, -36, 7, 0, Math.PI * 2); ctx.fillStyle = brass; ctx.fill();
  ctx.restore();
}

// Satin stitch: fill a path with close parallel threads.
function satin(ctx: Ctx, path: () => void, angle: number, color: string, light: string) {
  ctx.save();
  path(); ctx.clip();
  ctx.translate(W / 2, H / 2); ctx.rotate(angle); ctx.translate(-W / 2, -H / 2);
  ctx.lineCap = 'round';
  for (let i = -W; i < W * 2; i += 2.6) {
    ctx.lineWidth = 2.4; ctx.strokeStyle = color;
    ctx.beginPath(); ctx.moveTo(i, -H); ctx.lineTo(i, H * 2); ctx.stroke();
    ctx.lineWidth = 0.7; ctx.strokeStyle = light;
    ctx.beginPath(); ctx.moveTo(i - 0.6, -H); ctx.lineTo(i - 0.6, H * 2); ctx.stroke();
  }
  ctx.restore();
  // a darker edge where the threads tuck in
  ctx.save(); path(); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.stroke(); ctx.restore();
}

// Back stitch along whatever path `trace` lays out.
function stitchPath(ctx: Ctx, trace: () => void, color: string, width = 3, dash: number[] = [8, 2.6]) {
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.setLineDash(dash);
  ctx.lineWidth = width + 1; ctx.strokeStyle = 'rgba(0,0,0,0.22)';
  ctx.translate(0.8, 1.2); trace(); ctx.stroke();
  ctx.translate(-0.8, -1.2);
  ctx.lineWidth = width; ctx.strokeStyle = color; trace(); ctx.stroke();
  ctx.lineWidth = width * 0.3; ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.translate(-0.5, -0.5); trace(); ctx.stroke();
  ctx.restore();
}

function knot(ctx: Ctx, x: number, y: number, r: number, color: string) {
  ctx.beginPath(); ctx.arc(x + 0.8, y + 1.2, r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
  ctx.lineWidth = 0.9; ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0.5, 4); ctx.stroke();
  ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.35, r * 0.28, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fill();
}

// Lazy daisy: a looped petal held down by a tiny tack.
function daisy(ctx: Ctx, x: number, y: number, len: number, angle: number, color: string) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(angle);
  ctx.lineWidth = 2.6; ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.ellipse(len / 2 + 0.8, 1, len / 2, len / 5, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = color;
  ctx.beginPath(); ctx.ellipse(len / 2, 0, len / 2, len / 5, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(len - 1, 0); ctx.lineTo(len + 3, 0); ctx.stroke();
  ctx.restore();
}

function crossStitch(ctx: Ctx, x: number, y: number, s: number, color: string) {
  ctx.lineCap = 'round';
  ctx.lineWidth = s * 0.26;
  for (const [sty, off] of [['rgba(0,0,0,0.25)', 0.8], [color, 0]] as [string, number][]) {
    ctx.strokeStyle = sty;
    ctx.beginPath(); ctx.moveTo(x + 2 + off, y + s - 2 + off); ctx.lineTo(x + s - 2 + off, y + 2 + off); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 2 + off, y + 2 + off); ctx.lineTo(x + s - 2 + off, y + s - 2 + off); ctx.stroke();
  }
}

// ---------------------------------------------------------------- UI pieces

function ledger(ctx: Ctx, rand: Rand) {
  backdrop(ctx, '#c9d4c2', rand);
  ctx.beginPath(); ctx.arc(430, 150, 120, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fill();
  phone(ctx, W / 2, H / 2 + 10, 270, 560, -0.05, '#f6f3ec', (c, w) => {
    text(c, '9:41', 22, 34, 13, '#222', 600);
    text(c, 'Good morning, Ada', 22, 84, 13, '#6b6b62', 500);
    text(c, 'Your money', 22, 110, 22, '#1d1d1a', 600);
    fillRR(c, 16, 128, w - 32, 128, 18, '#20392f');
    text(c, 'Available balance', 32, 158, 11, 'rgba(244,236,220,0.7)', 500);
    text(c, '₦482,300', 32, 196, 30, '#f4ecdc', 600);
    text(c, '+4.2% this month', 32, 228, 11, '#a9d39b', 500);
    ['Send', 'Request', 'Top up'].forEach((s, i) => {
      fillRR(c, 16 + i * 80, 272, 72, 34, 17, i === 0 ? '#20392f' : '#e6e1d4');
      text(c, s, 52 + i * 80, 294, 11.5, i === 0 ? '#f4ecdc' : '#2b2b26', 600, SANS, 'center');
    });
    text(c, 'This week', 22, 338, 13, '#1d1d1a', 600);
    [38, 62, 30, 80, 54, 92, 46].forEach((h, i) => {
      fillRR(c, 26 + i * 31, 430 - h, 16, h, 6, i === 5 ? '#c4623f' : '#9db493');
    });
    [['Mama Put', '−₦3,500', '#e9b991'], ['Salary', '+₦350,000', '#9db493'], ['Data bundle', '−₦2,000', '#b9c3dd']].forEach(([n, a, col], i) => {
      const y = 456 + i * 40;
      c.beginPath(); c.arc(36, y + 12, 13, 0, Math.PI * 2); c.fillStyle = col; c.fill();
      text(c, n, 58, y + 17, 12, '#1d1d1a', 500);
      text(c, a, w - 22, y + 17, 12, '#1d1d1a', 600, SANS, 'right');
    });
  });
}

function haven(ctx: Ctx, rand: Rand) {
  backdrop(ctx, '#e9dccb', rand);
  // laptop-sized browser window
  ctx.save();
  softShadow(ctx, 50, 26);
  fillRR(ctx, 30, 120, 470, 340, 12, '#fbf8f3');
  noShadow(ctx);
  rr(ctx, 30, 120, 470, 340, 12); ctx.clip();
  ctx.fillStyle = '#efe9df'; ctx.fillRect(30, 120, 470, 28);
  ['#e7735b', '#e8b74f', '#7fb36a'].forEach((col, i) => { ctx.beginPath(); ctx.arc(48 + i * 15, 134, 4.5, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill(); });
  fillRR(ctx, 170, 127, 190, 14, 7, '#e2dbcf');
  ctx.fillStyle = '#2d3a5e'; ctx.fillRect(30, 148, 96, 312);
  text(ctx, 'haven', 46, 178, 15, '#f2ead9', 600, SERIF);
  ['Overview', 'Bookings', 'Guests', 'Rooms', 'Reports'].forEach((s, i) => {
    if (i === 1) fillRR(ctx, 38, 196 + i * 30 - 13, 80, 24, 6, 'rgba(255,255,255,0.12)');
    text(ctx, s, 48, 199 + i * 30 + 4, 10.5, i === 1 ? '#fff' : 'rgba(242,234,217,0.6)', 500);
  });
  text(ctx, 'Bookings', 144, 182, 18, '#1f2333', 600);
  [['Tonight', '24'], ['Arriving', '9'], ['Occupancy', '86%']].forEach(([l, v], i) => {
    fillRR(ctx, 144 + i * 114, 196, 104, 58, 8, '#f1ece3');
    text(ctx, l, 154 + i * 114, 216, 9.5, '#7b776d', 500);
    text(ctx, v, 154 + i * 114, 242, 19, '#1f2333', 600);
  });
  for (let r = 0; r < 4; r++) {
    for (let d = 0; d < 7; d++) {
      fillRR(ctx, 144 + d * 49, 268 + r * 44, 45, 40, 5, '#f5f1ea');
      text(ctx, String(r * 7 + d + 1), 149 + d * 49, 280 + r * 44, 8.5, '#9a958a', 500);
    }
  }
  ([[0, 1, 3, '#e9a989'], [1, 2, 4, '#9cb6d9'], [2, 0, 2, '#a7c49a'], [3, 3, 3, '#e8c879'], [2, 4, 3, '#e9a989']] as [number, number, number, string][]).forEach(([r, d, len, col]) => {
    fillRR(ctx, 147 + d * 49, 288 + r * 44, len * 49 - 8, 13, 4, col);
  });
  ctx.restore();
  // companion phone
  phone(ctx, 440, 430, 150, 300, 0.06, '#fbf8f3', (c, w) => {
    c.fillStyle = '#2d3a5e'; c.fillRect(0, 0, w, 92);
    text(c, 'Room 12', 14, 60, 15, '#f2ead9', 600, SERIF);
    text(c, 'Fri 14 — Sun 16', 14, 78, 9, 'rgba(242,234,217,0.7)', 500);
    bars(c, 14, 110, [100, 76, 88], 8, 9, '#e3ddd2');
    fillRR(c, 14, 172, w - 28, 50, 8, '#f1ece3');
    text(c, '₦96,000', 24, 202, 14, '#1f2333', 600);
    fillRR(c, 14, 236, w - 28, 26, 13, '#d9735a');
    text(c, 'Confirm', w / 2, 253, 10, '#fff', 600, SANS, 'center');
  });
}

function mise(ctx: Ctx, rand: Rand) {
  backdrop(ctx, '#f0c7a5', rand);
  const plate = (c: Ctx, cx: number, cy: number, r: number) => {
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fillStyle = '#f7f1e6'; c.fill();
    c.beginPath(); c.arc(cx, cy, r * 0.78, 0, Math.PI * 2); c.fillStyle = '#d2562e'; c.fill();
    for (let i = 0; i < 70; i++) {
      const a = rand() * Math.PI * 2, d = rand() * r * 0.7;
      c.beginPath(); c.ellipse(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 3.2, 1.6, rand() * 3, 0, Math.PI * 2);
      c.fillStyle = rand() < 0.75 ? '#e88a43' : '#7aa05a'; c.fill();
    }
    for (let i = 0; i < 4; i++) {
      c.beginPath(); c.ellipse(cx + r * 0.25 - i * 10, cy - r * 0.3 + i * 8, 10, 6, 0.6, 0, Math.PI * 2);
      c.fillStyle = '#9e3a1c'; c.fill();
    }
  };
  phone(ctx, 190, 320, 240, 490, -0.1, '#fffaf2', (c, w) => {
    c.fillStyle = '#f2e3cf'; c.fillRect(0, 0, w, 220);
    plate(c, w / 2, 120, 80);
    text(c, 'Jollof, slow-cooked', 18, 254, 18, '#2a1d14', 500, SERIF);
    text(c, '55 min  ·  Serves 4  ·  Easy', 18, 276, 10.5, '#8a7a6a', 500);
    bars(c, 18, 298, [190, 170, 140], 7, 9, '#eadfce');
    fillRR(c, 18, 372, w - 36, 40, 20, '#2a1d14');
    text(c, 'Start cooking', w / 2, 397, 12, '#fffaf2', 600, SANS, 'center');
  });
  phone(ctx, 395, 330, 220, 450, 0.08, '#2a1d14', (c, w) => {
    text(c, 'Step 3 of 7', 18, 70, 10.5, 'rgba(255,250,242,0.6)', 500);
    text(c, 'Simmer the base', 18, 98, 17, '#fffaf2', 500, SERIF);
    c.lineWidth = 10; c.strokeStyle = 'rgba(255,255,255,0.12)';
    c.beginPath(); c.arc(w / 2, 200, 62, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = '#e88a43'; c.lineCap = 'round';
    c.beginPath(); c.arc(w / 2, 200, 62, -Math.PI / 2, Math.PI * 0.9); c.stroke();
    text(c, '12:40', w / 2, 210, 24, '#fffaf2', 600, SANS, 'center');
    ['Tomato & pepper blend', 'Bay leaves, thyme', 'Stock, slowly'].forEach((s, i) => {
      const y = 300 + i * 34;
      fillRR(c, 18, y - 12, 16, 16, 4, i < 2 ? '#e88a43' : 'rgba(255,255,255,0.15)');
      text(c, s, 44, y + 1, 11, i < 2 ? 'rgba(255,250,242,0.5)' : '#fffaf2', 500);
    });
  });
}

function bloom(ctx: Ctx, rand: Rand) {
  backdrop(ctx, '#d8d2ea', rand);
  ctx.beginPath(); ctx.arc(110, 520, 140, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fill();
  phone(ctx, W / 2, H / 2 + 6, 270, 560, 0.04, '#fbf7f2', (c, w) => {
    c.fillStyle = '#efe4f4'; c.fillRect(0, 0, w, 300);
    c.beginPath(); c.arc(w / 2 + 40, 120, 46, 0, Math.PI * 2); c.fillStyle = '#f2b38f'; c.fill();
    c.fillStyle = '#8fae94';
    c.beginPath(); c.moveTo(0, 300); c.bezierCurveTo(60, 180, 140, 230, w, 200); c.lineTo(w, 300); c.fill();
    c.fillStyle = '#5f8a6a';
    c.beginPath(); c.moveTo(0, 300); c.bezierCurveTo(90, 240, 160, 290, w, 250); c.lineTo(w, 300); c.fill();
    for (let i = 0; i < 6; i++) {
      const x = 30 + i * 38, h = 30 + (i % 3) * 14;
      c.strokeStyle = '#3f6a4c'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(x, 300); c.lineTo(x, 300 - h); c.stroke();
      c.beginPath(); c.arc(x, 300 - h - 5, 6, 0, Math.PI * 2); c.fillStyle = i % 2 ? '#f6d06e' : '#f3a4b5'; c.fill();
    }
    text(c, 'Breathe in,', 24, 352, 26, '#2d2438', 400, SERIF);
    text(c, 'slowly.', 24, 384, 26, '#2d2438', 400, SERIF);
    bars(c, 24, 404, [200, 168], 7, 9, '#e6dfe9');
    [0, 1, 2].forEach((i) => fillRR(c, 24 + i * 16, 450, i === 0 ? 22 : 8, 8, 4, i === 0 ? '#2d2438' : '#d6cde0'));
    fillRR(c, 24, 474, w - 48, 44, 22, '#2d2438');
    text(c, 'Begin', w / 2, 501, 13, '#fbf7f2', 600, SANS, 'center');
  });
}

function kit(ctx: Ctx, rand: Rand) {
  backdrop(ctx, '#1f2430', rand, 0.08);
  text(ctx, 'Kit — v2.4', 40, 66, 12, 'rgba(240,233,220,0.55)', 500);
  text(ctx, 'Aa', 40, 170, 104, '#f0e9dc', 300, SERIF);
  text(ctx, 'Fraunces / Inter', 44, 200, 12, 'rgba(240,233,220,0.6)', 500);
  ['#c4623f', '#e2a83e', '#8fa775', '#2d3a5e', '#f0e9dc'].forEach((col, i) => {
    fillRR(ctx, 300 + (i % 3) * 72, 84 + Math.floor(i / 3) * 72, 62, 62, 10, col);
  });
  fillRR(ctx, 40, 240, 150, 46, 23, '#f0e9dc');
  text(ctx, 'Primary', 115, 268, 14, '#1f2430', 600, SANS, 'center');
  rr(ctx, 204, 240, 150, 46, 23); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(240,233,220,0.6)'; ctx.stroke();
  text(ctx, 'Secondary', 279, 268, 14, '#f0e9dc', 600, SANS, 'center');
  fillRR(ctx, 376, 248, 60, 32, 16, '#8fa775');
  ctx.beginPath(); ctx.arc(420, 264, 12, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
  fillRR(ctx, 40, 310, 300, 50, 10, '#2a3040');
  text(ctx, 'Email address', 56, 332, 10, 'rgba(240,233,220,0.5)', 500);
  text(ctx, 'ada@studio.ng', 56, 350, 13, '#f0e9dc', 500);
  ['Design', 'Research', 'Prototype'].forEach((s, i) => {
    rr(ctx, 40 + i * 104, 384, 94, 30, 15); ctx.fillStyle = i === 1 ? '#e2a83e' : 'rgba(255,255,255,0.08)'; ctx.fill();
    text(ctx, s, 87 + i * 104, 404, 11, i === 1 ? '#1f2430' : '#f0e9dc', 600, SANS, 'center');
  });
  fillRR(ctx, 40, 440, 480, 150, 14, '#2a3040');
  ['#e9a989', '#9cb6d9', '#a7c49a'].forEach((col, i) => {
    ctx.beginPath(); ctx.arc(80 + i * 26, 482, 18, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#2a3040'; ctx.stroke();
  });
  text(ctx, 'Card / Team', 170, 488, 14, '#f0e9dc', 600);
  bars(ctx, 60, 520, [380, 300, 220], 8, 10, 'rgba(240,233,220,0.12)');
}

// ---------------------------------------------------------------- thread pieces

function wildflower(ctx: Ctx, rand: Rand) {
  backdrop(ctx, '#e7dccb', rand);
  hoop(ctx, W / 2, H / 2 + 20, 210, '#f4eee2', rand, () => {
    const cx = W / 2, base = H / 2 + 200;
    const heads = [];
    for (let i = 0; i < 9; i++) {
      const x = cx - 120 + i * 30 + (rand() - 0.5) * 20;
      const top = H / 2 - 120 + rand() * 120;
      const bend = (rand() - 0.5) * 70;
      stitchPath(ctx, () => { ctx.beginPath(); ctx.moveTo(cx + (x - cx) * 0.3, base); ctx.quadraticCurveTo(x + bend, (top + base) / 2, x, top); }, '#5f7f4e', 2.6);
      heads.push([x, top]);
      const ly = top + 60 + rand() * 60;
      satin(ctx, () => { ctx.beginPath(); ctx.ellipse(x + bend * 0.4 + 12, ly, 16, 6, -0.6, 0, Math.PI * 2); }, -0.4, '#7e9b62', 'rgba(255,255,255,0.3)');
    }
    heads.forEach(([x, y], i) => {
      const kind = i % 3;
      if (kind === 0) {
        for (let p = 0; p < 8; p++) daisy(ctx, x, y, 22, p / 8 * Math.PI * 2, '#fbf7ef');
        for (let k = 0; k < 5; k++) knot(ctx, x + (rand() - 0.5) * 8, y + (rand() - 0.5) * 8, 3.4, '#e7b23d');
      } else if (kind === 1) {
        for (let p = 0; p < 6; p++) daisy(ctx, x, y, 18, p / 6 * Math.PI * 2 + 0.3, '#e9958a');
        knot(ctx, x, y, 4.5, '#b4432a');
      } else {
        for (let k = 0; k < 9; k++) knot(ctx, x + (rand() - 0.5) * 26, y + (rand() - 0.5) * 26, 3.6, '#7f9fd6');
      }
    });
  });
}

function monogram(ctx: Ctx, rand: Rand) {
  backdrop(ctx, '#2c3b32', rand, 0.08);
  hoop(ctx, W / 2, H / 2 + 20, 210, '#1d2b24', rand, () => {
    // satin-filled letter: stitch a thread field, then keep only the glyph
    const c = document.createElement('canvas'); c.width = W * 2; c.height = H * 2;
    const g = c.getContext('2d')!;
    g.scale(2, 2);
    satin(g, () => { g.beginPath(); g.rect(0, 0, W, H); }, 0.5, '#d9b25a', 'rgba(255,240,200,0.55)');
    g.globalCompositeOperation = 'destination-in';
    g.font = `400 300px ${SERIF}`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#000';
    g.fillText('C', W / 2, H / 2 + 34);
    ctx.save(); softShadow(ctx, 3, 2, 0.5); ctx.drawImage(c, 0, 0, W, H); ctx.restore();
    // wreath
    for (let i = 0; i < 26; i++) {
      const a = Math.PI * 0.62 + i / 26 * Math.PI * 1.76;
      const x = W / 2 + Math.cos(a) * 165, y = H / 2 + 20 + Math.sin(a) * 165;
      daisy(ctx, x, y, 16, a + (i % 2 ? 0.9 : -0.9) + Math.PI / 2, '#8fa775');
      if (i % 3 === 0) knot(ctx, x, y, 3.6, '#e9a08a');
    }
  });
}

function dusk(ctx: Ctx, rand: Rand) {
  backdrop(ctx, '#d6c3ad', rand);
  hoop(ctx, W / 2, H / 2 + 20, 210, '#efe6d6', rand, () => {
    const cy = H / 2 + 20;
    satin(ctx, () => { ctx.beginPath(); ctx.arc(W / 2 + 50, cy - 40, 48, 0, Math.PI * 2); }, 0.2, '#d9673f', 'rgba(255,220,190,0.45)');
    for (let r = 0; r < 4; r++) {
      const y = cy - 150 + r * 20;
      stitchPath(ctx, () => { ctx.beginPath(); ctx.moveTo(W / 2 - 200 + r * 30, y); ctx.lineTo(W / 2 + 120 - r * 40, y); }, '#9fb5cf', 2.2, [12, 9]);
    }
    const hills: [string, number][] = [['#c9a24a', 10], ['#8fa775', 60], ['#5e7d52', 110], ['#3f5a3d', 160]];
    hills.forEach(([col, off], h) => {
      const top = (x: number) => cy + off - 20 + Math.sin(x * 0.012 + h * 1.7) * 26;
      const path = () => {
        ctx.beginPath(); ctx.moveTo(W / 2 - 230, H);
        for (let x = W / 2 - 230; x <= W / 2 + 230; x += 10) ctx.lineTo(x, top(x));
        ctx.lineTo(W / 2 + 230, H); ctx.closePath();
      };
      ctx.save(); path(); ctx.fillStyle = 'rgba(0,0,0,0.03)'; ctx.fill(); ctx.clip();
      // seed stitches: tiny paired dashes at random angles
      ctx.lineCap = 'round'; ctx.lineWidth = 2.4;
      for (let i = 0; i < 900; i++) {
        const x = W / 2 - 230 + rand() * 460, y = cy - 60 + off + rand() * 260;
        const a = rand() * Math.PI;
        ctx.strokeStyle = col;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 5, y + Math.sin(a) * 5); ctx.stroke();
      }
      ctx.restore();
      stitchPath(ctx, () => {
        ctx.beginPath();
        for (let x = W / 2 - 230; x <= W / 2 + 230; x += 10) x === W / 2 - 230 ? ctx.moveTo(x, top(x)) : ctx.lineTo(x, top(x));
      }, col, 2.4);
    });
  });
}

function sampler(ctx: Ctx, rand: Rand) {
  backdrop(ctx, '#b8c4c8', rand);
  ctx.save();
  ctx.translate(W / 2, H / 2); ctx.rotate(-0.04); ctx.translate(-W / 2, -H / 2);
  softShadow(ctx, 40, 20);
  ctx.fillStyle = '#efe6d3'; ctx.fillRect(70, 70, 420, 500);
  noShadow(ctx);
  // aida grid
  const s = 14, x0 = 91, y0 = 91, n = 28, m = 33;
  for (let y = 0; y < m; y++) for (let x = 0; x < n; x++) {
    ctx.fillStyle = `rgba(120,100,70,${0.08 + rand() * 0.05})`;
    ctx.fillRect(x0 + x * s - 1, y0 + y * s - 1, 2, 2);
  }
  // border
  for (let x = 0; x < n; x++) { crossStitch(ctx, x0 + x * s, y0, s, '#b4432a'); crossStitch(ctx, x0 + x * s, y0 + (m - 1) * s, s, '#b4432a'); }
  for (let y = 1; y < m - 1; y++) { crossStitch(ctx, x0, y0 + y * s, s, '#b4432a'); crossStitch(ctx, x0 + (n - 1) * s, y0 + y * s, s, '#b4432a'); }
  const font: Record<string, string[]> = {
    U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
    X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
    '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
    '/': ['....#', '...#.', '...#.', '..#..', '.#...', '.#...', '#....'],
  };
  const word = (str: string, gx: number, gy: number, col: string) => [...str].forEach((ch, k) => (font[ch] ?? []).forEach((row, ry) => [...row].forEach((v, rx) => {
    if (v === '#') crossStitch(ctx, x0 + (gx + k * 6 + rx) * s, y0 + (gy + ry) * s, s, col);
  })));
  word('UI', 3, 4, '#2d3a5e');
  word('/', 15, 4, '#8fa775');
  word('UX', 20 - 3, 4, '#2d3a5e');
  // flower row
  for (let k = 0; k < 4; k++) {
    const gx = 3 + k * 6, gy = 15;
    [[1, 0], [0, 1], [2, 1], [1, 2], [1, 1]].forEach(([dx, dy], j) => crossStitch(ctx, x0 + (gx + dx) * s, y0 + (gy + dy) * s, s, j === 4 ? '#e2a83e' : '#e9958a'));
    [[1, 3], [1, 4], [0, 4], [2, 4]].forEach(([dx, dy]) => crossStitch(ctx, x0 + (gx + dx) * s, y0 + (gy + dy) * s, s, '#8fa775'));
  }
  word('+', 11, 22, '#b4432a');
  for (let x = 3; x < n - 3; x++) if (x % 2) crossStitch(ctx, x0 + x * s, y0 + 29 * s, s, '#2d3a5e');
  ctx.restore();
}

function knots(ctx: Ctx, rand: Rand) {
  backdrop(ctx, '#c66d4a', rand, 0.07);
  hoop(ctx, W / 2, H / 2 + 20, 210, '#f3ebdd', rand, () => {
    const palette = ['#2d3a5e', '#4d6aa0', '#8fa775', '#e2a83e', '#d9673f', '#b4432a'];
    for (let ring = 0; ring < 14; ring++) {
      const r = 10 + ring * 12.5;
      const count = Math.max(1, Math.round(r * Math.PI * 2 / 10));
      for (let i = 0; i < count; i++) {
        const a = i / count * Math.PI * 2 + ring * 0.3;
        knot(ctx, W / 2 + Math.cos(a) * r + (rand() - 0.5) * 2, H / 2 + 20 + Math.sin(a) * r + (rand() - 0.5) * 2, 4.4, palette[Math.floor(ring / 2.4)]);
      }
    }
  });
}

function portrait(ctx: Ctx, rand: Rand) {
  backdrop(ctx, '#e5d2c0', rand);
  hoop(ctx, W / 2, H / 2 + 20, 210, '#f7f1e6', rand, () => {
    ctx.save();
    ctx.font = `italic 300 112px ${SERIF}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.setLineDash([7, 2.6]);
    ctx.lineWidth = 3.2; ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.strokeText('hello', W / 2 + 1, H / 2 + 8);
    ctx.strokeStyle = '#b4432a';
    ctx.strokeText('hello', W / 2, H / 2 + 6);
    ctx.restore();
    text(ctx, 'I’M CHIOMA', W / 2, H / 2 + 92, 15, '#2d3a5e', 600, SANS, 'center');
    for (let i = 0; i < 5; i++) {
      const x = W / 2 - 120 + i * 60, y = H / 2 + 150 + Math.sin(i) * 10;
      for (let p = 0; p < 6; p++) daisy(ctx, x, y, 13, p / 6 * Math.PI * 2, i % 2 ? '#e9958a' : '#8fa775');
      knot(ctx, x, y, 3.4, '#e2a83e');
    }
  });
}
