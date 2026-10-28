'use client';

// A thread-red dot that trails the pointer. Elements opt in with data-cursor:
// "hover" grows it into a ring; "grab", "pull", "email", "view", "drag" show a label.
import { useEffect, useRef } from 'react';
import { gsap, hasFinePointer, prefersReduced } from '@/lib/motion';

const LABELS: Record<string, string> = { grab: 'Grab', pull: 'Pull', email: 'Write', view: 'View', drag: 'Drag' };

export default function Cursor() {
  const ref = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current, label = labelRef.current;
    if (!el || !label || !hasFinePointer() || prefersReduced()) return;
    document.documentElement.classList.add('has-cursor');
    let x = -100, y = -100, cx = x, cy = y;
    let target: Element | null = null;
    const move = (e: PointerEvent) => { x = e.clientX; y = e.clientY; target = e.target as Element; };
    const leave = () => { target = null; el.classList.add('is-hidden'); };
    const enter = () => el.classList.remove('is-hidden');
    const tick = () => {
      cx += (x - cx) * 0.24;
      cy += (y - cy) * 0.24;
      el.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      // Read the mode every frame: some elements flip their data-cursor without the target changing.
      const mode = target?.closest<HTMLElement>('[data-cursor]')?.dataset.cursor ?? '';
      el.classList.toggle('is-hover', mode === 'hover');
      el.classList.toggle('is-label', mode in LABELS);
      if (mode in LABELS && label.textContent !== LABELS[mode]) label.textContent = LABELS[mode];
    };
    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerleave', leave);
    document.addEventListener('pointerenter', enter);
    gsap.ticker.add(tick);
    return () => {
      document.documentElement.classList.remove('has-cursor');
      window.removeEventListener('pointermove', move);
      document.removeEventListener('pointerleave', leave);
      document.removeEventListener('pointerenter', enter);
      gsap.ticker.remove(tick);
    };
  }, []);

  return (
    <div className="cursor" aria-hidden="true" ref={ref}>
      <span className="cursor-dot" />
      <span className="cursor-label" ref={labelRef} />
    </div>
  );
}
