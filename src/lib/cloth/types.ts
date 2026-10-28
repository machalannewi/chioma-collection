// Messages shared by the curtain (main thread) and the cloth worker.

export interface Stage {
  open: number;      // 0 closed → 1 open, tweened by the intro
  close: number;     // 0 → 1 as the hero scrolls away
  pointerX: number;  // px within the hero; -9999 when the pointer is elsewhere
  pointerY: number;
  moveX: number;     // recent pointer travel, decays every frame
  moveY: number;
}

export interface Shape {
  cover: number;     // how far across the screen the open drape reaches
  closed: number;    // leading-edge x (fraction of width) when closed
  phase: number;
  tie: number;       // tie-back row, as a fraction of the rows
}

export interface Held { p: number; x: number; y: number; z: number; w: number }
export interface Grab { index: number; dx: number; dy: number; held: Held[] }

export type ToWorker =
  | { type: 'init'; W: number; H: number; cols: number; rows: number; shape: Shape; stage: Stage }
  | { type: 'tick'; dt: number; time: number; still: boolean; stage: Stage; grab: Grab; buf: Float32Array };

export interface FromWorker { buf: Float32Array }
