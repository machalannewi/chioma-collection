// /work: an endless wall of every piece. Point, drag, scroll or pinch to explore.
import { WORKS, type Work } from './works';
import { VIEWS, type ViewName } from './art';
import { gsap, $$, prefersReduced } from './motion';

const COLS = 7, ROWS = 5;
const SIZES = [0.24, 0.17, 0.21, 0.16, 0.23, 0.19];   // tile width, as a share of the wall's width
const START = 2 * COLS + 3;                           // the slot the camera opens on, under the title
const EMPTY = new Set([START, START - COLS, START + COLS]);
const ZOOM: [number, number] = [0.7, 1.8];
const POINT = { speed: 520, dead: 0.18 };             // pointing at an edge pans that way
const DRIFT = 40;                                     // px/s when nobody is touching anything
const IDLE = 1500;                                    // ms before the drift resumes

export interface Tile { work: Work; view: ViewName; ratio: number }

// Each piece contributes three tiles; dealing them out in turn spreads every project across the wall.
const TILE_VIEWS: ViewName[] = ['card', 'detail', 'scene'];
export const TILES: Tile[] = TILE_VIEWS.flatMap((view) =>
  WORKS.map((work) => ({ work, view, ratio: VIEWS[view].w / VIEWS[view].h })));

interface Box { x: number; y: number; w: number; h: number }
interface Wall { TW: number; TH: number; items: Box[]; start: { x: number; y: number } }

const noise = (n: number) => { const t = Math.sin(n * 12.9898) * 43758.5453; return t - Math.floor(t); };
const slots = [...Array(COLS * ROWS).keys()].filter((i) => !EMPTY.has(i));

function measure(vw: number, vh: number): Wall {
  const span = vw < 768 ? vw * 2.2 : vw;   // phones get a bigger wall so tiles stay legible
  const cw = span * 0.27;
  const ch = Math.max(vh * 0.38, span * 0.22);
  const items = TILES.map((tile, i) => {
    const slot = slots[i];
    const row = Math.floor(slot / COLS), col = slot % COLS;
    const w = span * SIZES[i % SIZES.length] * Math.sqrt(tile.ratio / 1.4);
    const h = w / tile.ratio + 12;
    const cx = (col + 0.5 + (row % 2 ? 0.5 : 0)) * cw + (noise(i + 1) - 0.5) * cw * 0.36;
    const cy = (row + 0.5) * ch + (noise(i + 101) - 0.5) * ch * 0.36;
    return { x: cx - w / 2, y: cy - h / 2, w, h };
  });
  const startRow = Math.floor(START / COLS);
  const start = { x: ((START % COLS) + 0.5 + (startRow % 2 ? 0.5 : 0)) * cw, y: (startRow + 0.5) * ch };
  return { TW: cw * COLS, TH: ch * ROWS, items, start };
}

export function mountWall(root: HTMLElement): () => void {
  const reduced = prefersReduced();
  const tiles = $$<HTMLAnchorElement>('.wx-tile', root);
  const offs: (() => void)[] = [];
  const on = <T extends Event>(target: EventTarget, type: string, fn: (e: T) => void, opts?: AddEventListenerOptions) => {
    target.addEventListener(type, fn as EventListener, opts);
    offs.push(() => target.removeEventListener(type, fn as EventListener, opts));
  };

  let vw = innerWidth, vh = innerHeight;
  let wall = measure(vw, vh);
  const size = () => wall.items.forEach((it, i) => { tiles[i].style.width = `${it.w}px`; });
  size();

  // `cam` is what's drawn; `aim` is where it's heading. Both are wall coordinates at the screen centre.
  const cam = { ...wall.start }, aim = { ...wall.start };
  const vel = { x: 0, y: 0 };            // fling velocity, wall px/s
  const travel = { x: 0, y: 0 };         // recent movement, used to steer the idle drift
  const heading = { x: 0.94, y: 0.33 };
  let zoom = reduced ? 1 : 0.86, zoomAim = 1;
  const zoomAt = { x: vw / 2, y: vh / 2 };
  const pointer = { x: vw / 2, y: vh / 2, inside: false, overTile: false };
  let drag: { x: number; y: number; t: number; moved: number } | null = null;
  let pinch: { d: number; x: number; y: number } | null = null;
  const touches = new Map<number, { x: number; y: number }>();
  let lastPoint = 0, lastInput = 0, pointing = 0, drifting = 1;

  const draw = () => {
    wall.items.forEach((it, i) => {
      const x = gsap.utils.wrap(-it.w * zoom - 40, -it.w * zoom - 40 + wall.TW * zoom, (it.x - cam.x) * zoom + vw / 2);
      const y = gsap.utils.wrap(-it.h * zoom - 40, -it.h * zoom - 40 + wall.TH * zoom, (it.y - cam.y) * zoom + vh / 2);
      tiles[i].style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${zoom.toFixed(4)})`;
    });
  };
  const nudge = (dx: number, dy: number) => { aim.x += dx; aim.y += dy; travel.x += dx * zoom; travel.y += dy * zoom; };
  const zoomBy = (k: number, x: number, y: number) => {
    zoomAim = gsap.utils.clamp(ZOOM[0], ZOOM[1], zoomAim * k);
    zoomAt.x = x; zoomAt.y = y;
  };
  // Dragging moves the wall under the finger exactly, so move both the camera and its aim.
  const grabMove = (dx: number, dy: number) => { nudge(-dx / zoom, -dy / zoom); cam.x -= dx / zoom; cam.y -= dy / zoom; };

  const tick = (_time: number, deltaMs: number) => {
    const dt = Math.min(deltaMs, 50) / 1000;
    const now = performance.now();
    const idle = !drag && !pinch && now - Math.max(lastPoint, lastInput) > IDLE;
    const isPointing = pointer.inside && !drag && lastPoint > lastInput && now - lastPoint < IDLE;
    const k = 1 - Math.exp(-dt * 2);
    drifting += ((idle ? 1 : 0) - drifting) * k;
    pointing += ((isPointing ? 1 : 0) - pointing) * k;

    if (pointing > 0.001 && !reduced) {
      // The further the pointer is from the centre, the faster the wall travels that way.
      const push = (v: number) => Math.sign(v) * Math.max(0, (Math.abs(v) - POINT.dead) / (1 - POINT.dead)) ** 1.6;
      const speed = POINT.speed * (pointer.overTile ? 0.15 : 1) * pointing * dt / zoom;
      nudge(push((pointer.x - vw / 2) / (vw / 2)) * speed, push((pointer.y - vh / 2) / (vh / 2)) * speed);
    }
    nudge(vel.x * dt, vel.y * dt);
    const fade = Math.exp(-dt * 1.5);
    travel.x *= fade; travel.y *= fade;
    const d = Math.hypot(travel.x, travel.y);
    if (d > 20) { heading.x = travel.x / d; heading.y = travel.y / d; }
    if (!reduced) {
      const s = DRIFT * drifting * (pointer.overTile ? 0.12 : 1) * dt / zoom;
      aim.x += heading.x * s; aim.y += heading.y * s;
    }
    const friction = Math.exp(-dt * 3.5);
    vel.x *= friction; vel.y *= friction;

    // Zoom around the pointer: keep the point under it fixed while the scale changes.
    const z = zoom + (zoomAim - zoom) * (1 - Math.exp(-dt * 9));
    if (z !== zoom) {
      const ox = (zoomAt.x - vw / 2) * (1 / zoom - 1 / z), oy = (zoomAt.y - vh / 2) * (1 / zoom - 1 / z);
      cam.x += ox; cam.y += oy; aim.x += ox; aim.y += oy;
      zoom = z;
    }
    const ease = 1 - Math.exp(-dt * 9);
    cam.x += (aim.x - cam.x) * ease;
    cam.y += (aim.y - cam.y) * ease;
    draw();
  };
  gsap.ticker.add(tick);
  offs.push(() => gsap.ticker.remove(tick));

  // ---- input
  on<WheelEvent>(root, 'wheel', (e) => {
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? vh : 1;
    lastInput = performance.now();
    if (e.ctrlKey) zoomBy(Math.exp(-e.deltaY * unit * 0.01), e.clientX, e.clientY);
    else nudge(e.deltaX * unit / zoom, e.deltaY * unit / zoom);
  }, { passive: false });

  const pinchState = () => {
    const [a, b] = [...touches.values()];
    return { d: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  };
  on<PointerEvent>(root, 'pointerdown', (e) => {
    if (e.button !== 0) return;
    lastInput = performance.now();
    vel.x = vel.y = 0;
    if (e.pointerType === 'touch') {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size === 2) { drag = null; pinch = pinchState(); return; }
    }
    drag = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 };
    root.dataset.cursor = 'drag';
  });
  on<PointerEvent>(window, 'pointermove', (e) => {
    const target = e.target as Element;
    pointer.inside = e.pointerType === 'mouse' && root.contains(target);
    pointer.overTile = !!target.closest?.('.wx-tile');
    pointer.x = e.clientX; pointer.y = e.clientY;
    if (drag || pinch) lastInput = performance.now(); else if (pointer.inside) lastPoint = performance.now();
    if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && touches.size === 2) {
      const next = pinchState();
      zoomBy(next.d / pinch.d, next.x, next.y);
      grabMove(next.x - pinch.x, next.y - pinch.y);
      pinch = next;
      root.dataset.dragged = '1';
      return;
    }
    if (!drag || e.buttons === 0) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    const now = performance.now(), ms = Math.max(1, now - drag.t);
    grabMove(dx, dy);
    vel.x = vel.x * 0.5 + (-dx / zoom / ms) * 1000 * 0.45;
    vel.y = vel.y * 0.5 + (-dy / zoom / ms) * 1000 * 0.45;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    Object.assign(drag, { x: e.clientX, y: e.clientY, t: now });
  });
  const release = (e: PointerEvent) => {
    touches.delete(e.pointerId);
    delete root.dataset.cursor;
    if (pinch) { if (touches.size < 2) pinch = null; vel.x = vel.y = 0; return; }
    if (drag && drag.moved > 8) root.dataset.dragged = '1'; else delete root.dataset.dragged;
    if (drag && performance.now() - drag.t > 80) vel.x = vel.y = 0; // held still before letting go: no fling
    drag = null;
  };
  on(window, 'pointerup', release);
  on(window, 'pointercancel', release);
  on(root, 'pointerleave', () => { pointer.inside = false; pointer.overTile = false; });
  on(window, 'blur', () => { pointer.inside = false; });
  // Safari trackpad pinch.
  let gestureStart = 1;
  on<Event & { scale: number; clientX?: number; clientY?: number }>(root, 'gesturestart', (e) => { e.preventDefault(); gestureStart = zoomAim; });
  on<Event & { scale: number; clientX?: number; clientY?: number }>(root, 'gesturechange', (e) => {
    e.preventDefault();
    zoomAim = gsap.utils.clamp(ZOOM[0], ZOOM[1], gestureStart * e.scale);
    zoomAt.x = e.clientX ?? pointer.x; zoomAt.y = e.clientY ?? pointer.y;
  });
  on<KeyboardEvent>(window, 'keydown', (e) => {
    const step = 180 / zoom;
    const keys: Record<string, () => void> = {
      ArrowLeft: () => nudge(-step, 0), ArrowRight: () => nudge(step, 0),
      ArrowUp: () => nudge(0, -step), ArrowDown: () => nudge(0, step),
      '+': () => zoomBy(1.25, vw / 2, vh / 2), '=': () => zoomBy(1.25, vw / 2, vh / 2), '-': () => zoomBy(0.8, vw / 2, vh / 2),
    };
    if (!keys[e.key] || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    lastInput = performance.now();
    keys[e.key]();
  });
  on(window, 'resize', () => {
    const fx = cam.x / wall.TW, fy = cam.y / wall.TH;
    vw = innerWidth; vh = innerHeight;
    wall = measure(vw, vh);
    size();
    cam.x = aim.x = fx * wall.TW;
    cam.y = aim.y = fy * wall.TH;
  });

  // ---- hover lights up one project; a drag never counts as a click
  const light = (slug: string | null) => tiles.forEach((t) => {
    t.classList.toggle('is-lit', slug !== null && t.dataset.slug === slug);
    t.classList.toggle('is-dim', slug !== null && t.dataset.slug !== slug);
  });
  tiles.forEach((t, i) => {
    on<PointerEvent>(t, 'pointerenter', (e) => { if (e.pointerType === 'mouse') light(t.dataset.slug ?? null); });
    on(t, 'pointerleave', () => light(null));
    // Capture phase, so a drag is cancelled before Next's <Link> navigates.
    on<MouseEvent>(t, 'click', (e) => {
      if (!root.dataset.dragged) return;
      e.preventDefault();
      e.stopPropagation();
      delete root.dataset.dragged;
    }, { capture: true });
    // Tabbing to a tile brings it to the middle of the screen.
    on(t, 'focus', () => {
      light(t.dataset.slug ?? null);
      const it = wall.items[i];
      const near = (v: number, span: number) => v - span * Math.round(v / span);
      aim.x = cam.x + near(it.x + it.w / 2 - cam.x, wall.TW);
      aim.y = cam.y + near(it.y + it.h / 2 - cam.y, wall.TH);
    });
    on(t, 'blur', () => light(null));
  });

  draw();
  const ctx = gsap.context(() => {
    if (reduced) return;
    gsap.fromTo('.wx-tile-inner', { opacity: 0, scale: 0.86 }, { opacity: 1, scale: 1, duration: 1.3, ease: 'expo.out', stagger: 0.02, clearProps: 'opacity,transform' });
    gsap.from('.wx-rise', { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.08, delay: 0.2 });
    gsap.from('.wx-fade', { autoAlpha: 0, duration: 0.8, delay: 0.6 });
  }, root);

  return () => {
    ctx.revert();
    offs.forEach((off) => off());
  };
}
