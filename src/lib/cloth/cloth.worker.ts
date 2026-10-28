/// <reference lib="webworker" />
// Cloth simulation for the hero curtain.
// Runs off the main thread: the page posts the stage state every frame and
// gets the vertex positions back in the same (transferred) buffer.
//
// Units are CSS pixels. x runs right, y runs up (so the viewport is y in [-H, 0]),
// z points at the viewer.
import type { FromWorker, Grab, Shape, Stage, ToWorker } from './types';

declare const self: DedicatedWorkerGlobalScope;

const STEP = 1 / 120;      // fixed physics step
const DAMP = 0.975;        // velocity kept per step
const ITERATIONS = 6;      // constraint relaxation passes per step
const RIGHT = 1.04;        // cloth runs past the right edge so its side hem never shows
const ROD = 70;            // the rod sits just above the viewport
const PLEAT = 0.42;        // radians between pleats along the rod

const POINTER = { reach: 160, push: 1.1, press: 4.5, drag: 0.028, maxSweep: 2.2 };
const GRAB_LIFT = 60;

// Where the leading edge rests when the curtain is fully open, as
// [height fraction, x fraction of the width]. It bellies left around the
// middle and sweeps back towards the floor, like a drape caught on a tie-back.
const PROFILE: [number, number][] = [
  [0, 0.52], [0.1, 0.505], [0.22, 0.486], [0.34, 0.468], [0.46, 0.457],
  [0.56, 0.459], [0.64, 0.47], [0.72, 0.492], [0.8, 0.526], [0.87, 0.566],
  [0.93, 0.625], [0.97, 0.68], [1, 0.74],
];

interface Cloth {
  W: number; H: number; cols: number; rows: number; shape: Shape; dy: number;
  pos: Float32Array; prev: Float32Array; free: Float32Array;
  a: Int32Array; b: Int32Array; rest: Float32Array; stiff: Float32Array;
  grab: Grab;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (x: number, a: number, b: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function edgeAt(v: number, shape: Shape) {
  let x = PROFILE[PROFILE.length - 1][1];
  for (let i = 1; i < PROFILE.length; i++) {
    if (v <= PROFILE[i][0]) {
      const [v0, x0] = PROFILE[i - 1];
      const [v1, x1] = PROFILE[i];
      x = x0 + (x1 - x0) * (v - v0) / (v1 - v0);
      break;
    }
  }
  // `cover` shrinks how far across the screen the drape reaches.
  return 1 - (1 - x) * shape.cover;
}

function build(W: number, H: number, cols: number, rows: number, shape: Shape): Cloth {
  const n = cols * rows;
  const pos = new Float32Array(n * 3);
  const prev = new Float32Array(n * 3);
  const restWidth = (RIGHT - shape.closed) * W;
  const dx = restWidth / (cols - 1);
  const dy = (H * 1.4 + ROD) / (rows - 1);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = (r * cols + c) * 3;
      pos[i] = shape.closed * W + c * dx;
      pos[i + 1] = ROD - r * dy;
      pos[i + 2] = Math.sin(c * PLEAT + shape.phase) * 20;
      prev[i] = pos[i]; prev[i + 1] = pos[i + 1]; prev[i + 2] = pos[i + 2];
    }
  }

  // How much the breeze moves each node: nothing at the rod, the edges or the floor.
  const free = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const v = Math.floor(i / cols) / (rows - 1);
    const u = (i % cols) / (cols - 1);
    free[i] = Math.min(1, v / 0.55) * smooth(u, 0.04, 0.32) * (1 - smooth(v, 0.68, 0.92));
  }

  const a: number[] = [], b: number[] = [], rest: number[] = [], stiff: number[] = [];
  const link = (r0: number, c0: number, r1: number, c1: number, k: number) => {
    if (r1 >= rows || c1 >= cols || c1 < 0) return;
    a.push(r0 * cols + c0);
    b.push(r1 * cols + c1);
    rest.push(Math.hypot((c1 - c0) * dx, (r1 - r0) * dy));
    stiff.push(k);
  };
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      link(r, c, r, c + 1, 1);      // structure
      link(r, c, r + 1, c, 1);
      link(r, c, r + 1, c + 1, 0.5); // shear
      link(r, c, r + 1, c - 1, 0.5);
      link(r, c, r, c + 2, 0.5);    // bend: keeps folds round instead of creased
      link(r, c, r, c + 3, 0.22);
      link(r, c, r + 2, c, 0.5);
    }
  }

  return {
    W, H, cols, rows, shape, pos, prev, free, dy,
    a: Int32Array.from(a), b: Int32Array.from(b),
    rest: Float32Array.from(rest), stiff: Float32Array.from(stiff),
    grab: { index: -1, dx: 0, dy: 0, held: [] },
  };
}

function step(cloth: Cloth, stage: Stage, time: number, dt: number, settling: boolean) {
  const { W, H, cols, rows, pos, prev, a, b, rest, stiff, free, shape, grab } = cloth;
  const n = cols * rows;
  const gravity = 2200 * dt * dt;
  const wind = settling ? 0 : 480 * dt * dt;
  const gust = 0.7 + 0.3 * Math.sin(time * 0.45 + shape.phase) * Math.sin(time * 0.19 + 1.3);

  // Verlet integration. The leading column carries the weighted hem, so it falls harder.
  for (let i = 0; i < n; i++) {
    const p = i * 3;
    const vx = (pos[p] - prev[p]) * DAMP;
    const vy = (pos[p + 1] - prev[p + 1]) * DAMP;
    const vz = (pos[p + 2] - prev[p + 2]) * DAMP;
    prev[p] = pos[p]; prev[p + 1] = pos[p + 1]; prev[p + 2] = pos[p + 2];
    const ripple = Math.sin(pos[p + 1] * 0.0028 + pos[p] * 0.0016 - time * 0.75 + shape.phase);
    pos[p] += vx;
    pos[p + 1] += vy - (i % cols === 0 ? gravity * 1.6 : gravity);
    pos[p + 2] += vz - wind * gust * ripple * free[i];
  }

  const open = stage.open * (1 - stage.close);
  const right = RIGHT * W;
  const rodLead = lerp(shape.closed, edgeAt(0, shape), open) * W;
  const floor = -H - 600;
  const tieRow = Math.round(rows * shape.tie);
  const tieX = lerp(shape.closed, edgeAt(0.45, shape) + 0.03, open) * W;
  const hemLead = lerp(shape.closed, edgeAt(1, shape), open) * W;
  const hemY = -H * 1.22;

  for (let it = 0; it < ITERATIONS; it++) {
    for (let k = 0; k < a.length; k++) {
      const p = a[k] * 3, q = b[k] * 3;
      const dx = pos[q] - pos[p], dy = pos[q + 1] - pos[p + 1], dz = pos[q + 2] - pos[p + 2];
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      const s = (d - rest[k]) / d * 0.5 * stiff[k];
      pos[p] += dx * s; pos[p + 1] += dy * s; pos[p + 2] += dz * s;
      pos[q] -= dx * s; pos[q + 1] -= dy * s; pos[q + 2] -= dz * s;
    }

    // A hand holding a fistful of cloth.
    if (grab.index >= 0) {
      for (const h of grab.held) {
        const p = h.p * 3;
        pos[p] += (h.x + grab.dx - pos[p]) * h.w;
        pos[p + 1] += (h.y + grab.dy - pos[p + 1]) * h.w;
        pos[p + 2] += (h.z + GRAB_LIFT - pos[p + 2]) * h.w;
      }
    }

    // The rod: rings bunch up towards the right as the curtain opens.
    for (let c = 0; c < cols; c++) {
      const p = c * 3;
      pos[p] = rodLead + (right - rodLead) * c / (cols - 1);
      pos[p + 1] = ROD;
      pos[p + 2] = Math.sin(c * PLEAT + shape.phase) * 42 * (0.45 + 0.55 * open);
    }

    // The leading edge is guided (not pinned) along the drape silhouette.
    for (let r = 2; r < rows; r++) {
      const p = r * cols * 3;
      const v = Math.min(1, Math.max(0, -pos[p + 1] / H));
      const x = lerp(shape.closed, edgeAt(v, shape), open) * W;
      pos[p] += (x - pos[p]) * 0.2;
    }

    // The hem pools below the fold of the screen.
    for (let c = 0; c < cols; c++) {
      const p = ((rows - 1) * cols + c) * 3;
      pos[p] = hemLead + (right - hemLead) * c / (cols - 1);
      pos[p + 1] = hemY;
      pos[p + 2] = Math.sin(c * PLEAT + shape.phase + 1.7) * 30 * open;
    }

    // Tie-back: gathers the inner part of one row towards the side.
    for (let c = 1; c < Math.round(cols * 0.4); c++) {
      const p = (tieRow * cols + c) * 3;
      pos[p] += (tieX + c * 2 - pos[p]) * 0.05 * open;
    }

    // Side hem stays tucked behind the right edge.
    for (let r = 1; r < rows; r++) {
      const p = (r * cols + cols - 1) * 3;
      pos[p] += (right - pos[p]) * 0.2;
    }

    for (let i = 0; i < n; i++) {
      const p = i * 3;
      if (pos[p + 1] < floor) pos[p + 1] = floor;
    }
  }

  // Friction for whatever lies on the floor.
  for (let i = 0; i < n; i++) {
    const p = i * 3;
    if (pos[p + 1] <= floor + 0.5) {
      prev[p] = pos[p] - (pos[p] - prev[p]) * 0.3;
      prev[p + 2] = pos[p + 2] - (pos[p + 2] - prev[p + 2]) * 0.3;
    }
  }

  // The pointer brushes past: pushes cloth aside, drags it along, presses it back.
  if (!settling && grab.index < 0 && stage.pointerX > -9000) {
    const px = stage.pointerX, py = -stage.pointerY;
    const clamp = (v: number) => Math.max(-POINTER.maxSweep, Math.min(POINTER.maxSweep, v));
    const sweepX = clamp(stage.moveX * POINTER.drag);
    const sweepY = clamp(-stage.moveY * POINTER.drag) * 0.35;
    const reach = POINTER.reach;
    const last = Math.floor(rows * 0.82) * cols;
    for (let i = cols; i < last; i++) {
      const p = i * 3;
      const dx = pos[p] - px, dy = pos[p + 1] - py;
      const d2 = dx * dx + dy * dy;
      if (d2 >= reach * reach) continue;
      const d = Math.sqrt(d2) || 1;
      const t = 1 - d / reach;
      const f = t * t;
      pos[p] += dx / d * f * POINTER.push + sweepX * t;
      pos[p + 1] += dy / d * f * POINTER.push * 0.5 + sweepY * t;
      pos[p + 2] -= f * POINTER.press;
    }
  }
}

let cloth: Cloth | null = null;
let carry = 0;

const send = (buf: Float32Array) => {
  buf.set(cloth!.pos);
  const msg: FromWorker = { buf };
  self.postMessage(msg, [buf.buffer]);
};

self.onmessage = (e: MessageEvent<ToWorker>) => {
  const msg = e.data;
  if (msg.type === 'init') {
    cloth = build(msg.W, msg.H, msg.cols, msg.rows, msg.shape);
    // Let it hang for a moment so the first frame is already at rest.
    for (let i = 0; i < 200; i++) step(cloth, msg.stage, 0, STEP, true);
    carry = 0;
    send(new Float32Array(cloth.pos.length));
    return;
  }
  if (!cloth) return;
  cloth.grab = msg.grab;
  carry = Math.min(carry + msg.dt, STEP * 4);
  while (carry >= STEP) {
    step(cloth, msg.stage, msg.time, STEP, msg.still);
    carry -= STEP;
  }
  send(msg.buf);
};

export {};
