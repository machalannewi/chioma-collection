// GSAP setup and the small maths helpers the motion code shares. Client-only.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (x: number, a: number, b: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const easeOut = (t: number) => 1 - (1 - t) ** 3;
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export const prefersReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const isMobile = () => window.matchMedia('(max-width: 767px)').matches;
export const hasFinePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

export const $ = <T extends Element = HTMLElement>(s: string, root: ParentNode = document) => root.querySelector<T>(s);
export const $$ = <T extends Element = HTMLElement>(s: string, root: ParentNode = document) => [...root.querySelectorAll<T>(s)];

// The artwork is painted with the web fonts, so painting waits for them (but never forever).
export function fontsReady(): Promise<void> {
  return Promise.race([
    document.fonts.ready.then(() => undefined),
    new Promise<void>((r) => setTimeout(r, 2500)),
  ]);
}

// Fades `.reveal` elements up as they scroll into view.
export function reveals(root: ParentNode = document) {
  if (prefersReduced()) return;
  $$('.reveal', root).forEach((el) => {
    gsap.from(el, { y: 28, autoAlpha: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
  });
}
