'use client';

// Lenis smooth scrolling, kept in step with GSAP's ScrollTrigger.
// Also handles in-page #anchor links on every page.
import Lenis from 'lenis';
import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { gsap, ScrollTrigger, prefersReduced } from '@/lib/motion';

interface ScrollApi {
  lenis: () => Lenis | null;
  scrollTo: (hash: string, immediate?: boolean) => void;
  stop: () => void;
  start: () => void;
}

const ScrollContext = createContext<ScrollApi>({
  lenis: () => null, scrollTo: () => {}, stop: () => {}, start: () => {},
});

export const useScroll = () => useContext(ScrollContext);

// The work wall handles its own wheel and drag input, so it scrolls nothing.
const NO_SCROLL = ['/work', '/work/'];

export default function SmoothScroll({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    if (prefersReduced() || NO_SCROLL.includes(pathname)) return;
    const lenis = new Lenis({ lerp: 0.1 });
    lenisRef.current = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    const raf = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [pathname]);

  const scrollTo = useCallback((hash: string, immediate = false) => {
    const target: HTMLElement | 0 | null = hash === '#top' || hash === '#' ? 0 : document.querySelector<HTMLElement>(hash);
    if (target === null) return;
    const lenis = lenisRef.current;
    if (lenis) lenis.scrollTo(target, immediate ? { immediate: true } : { duration: 1.6 });
    else if (target === 0) window.scrollTo({ top: 0, behavior: immediate ? 'auto' : 'smooth' });
    else target.scrollIntoView({ behavior: immediate ? 'auto' : 'smooth' });
  }, []);

  // Plain in-page anchors (tabs, "Back to top") scroll smoothly.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element).closest?.('a[href^="#"]');
      if (!a || e.defaultPrevented) return;
      const hash = a.getAttribute('href')!;
      if (hash.length < 2) return;
      e.preventDefault();
      scrollTo(hash);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [scrollTo]);

  const api = useMemo<ScrollApi>(() => ({
    lenis: () => lenisRef.current,
    scrollTo,
    stop: () => lenisRef.current?.stop(),
    start: () => lenisRef.current?.start(),
  }), [scrollTo]);

  return <ScrollContext.Provider value={api}>{children}</ScrollContext.Provider>;
}
