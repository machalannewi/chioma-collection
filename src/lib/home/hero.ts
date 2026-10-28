// The hero: loader specimen, the curtain opening, and the curtain closing again on scroll.
import { Curtain, STAGE } from '../cloth/curtain';
import { gsap, ScrollTrigger, $, smooth, isMobile, prefersReduced } from '../motion';

const SEEN = 'seen-loader';
const seenLoader = () => { try { return sessionStorage.getItem(SEEN) === '1'; } catch { return false; } };
const markLoader = () => { try { sessionStorage.setItem(SEEN, '1'); } catch { /* private mode */ } };

interface HeroOptions {
  /** Resolves when the artwork and cloth are ready to be revealed. */
  ready: Promise<void>;
  stopScroll: () => void;
  startScroll: () => void;
}

export function hero(root: HTMLElement, { ready, stopScroll, startScroll }: HeroOptions): () => void {
  const reduced = prefersReduced();
  const section = $('.cu', root)!;
  const loaderEl = $('.ld', root);

  STAGE.open = reduced ? 1 : 0; // the cloth settles closed, then the intro draws it open
  STAGE.close = 0;
  const curtain = new Curtain(section, { mobile: isMobile(), still: reduced });

  const ctx = gsap.context(() => {
    if (reduced) return;
    // Scrolling away draws the curtain closed again.
    ScrollTrigger.create({
      trigger: section, start: 'top top', end: 'bottom 20%',
      onUpdate: (st) => {
        STAGE.close = smooth(st.progress, 0.05, 0.95);
        section.style.setProperty('--close', STAGE.close.toFixed(3));
      },
    });
  }, root);

  let intro: gsap.core.Timeline | null = null;
  if (!reduced) {
    ctx.add(() => {
      gsap.set('.cu-rise', { yPercent: 110 });
      gsap.set('.cu-fade', { autoAlpha: 0, y: 12 });
      intro = gsap.timeline({ paused: true })
        .to(STAGE, { open: 1, duration: 3.2, ease: 'power2.inOut' }, 0.2)
        .to('.cu-rise', { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.1 }, 1.4)
        .to('.cu-fade', { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08 }, 1.8);
    });
  }

  let live = true;
  const reveal = () => { if (live) intro?.play(); };
  // React owns the loader's node, so it is hidden rather than removed.
  const hideLoader = () => { if (loaderEl) loaderEl.style.display = 'none'; };
  let skip: (() => void) | null = null;

  // The specimen plays once per visit; coming back from a project skips straight to the curtain.
  if (!loaderEl || reduced || seenLoader()) {
    hideLoader();
    ready.then(reveal);
  } else {
    markLoader();
    stopScroll();
    const counter = $('.ld-count', loaderEl)!;
    const count = { v: 0 };
    ctx.add(() => {
      const tl = gsap.timeline({ paused: true, onComplete: () => { hideLoader(); startScroll(); } })
        .from('.ld-word', { yPercent: 45, autoAlpha: 0, duration: 1.1, ease: 'expo.out' }, 0)
        .from('.ld-guide', { scaleX: 0, duration: 1.2, ease: 'expo.inOut' }, 0)
        .from('.ld-meta', { autoAlpha: 0, duration: 0.6, stagger: 0.1 }, 0.2)
        .to(count, {
          v: 100, duration: 1.5, ease: 'power2.inOut',
          onUpdate: () => { counter.textContent = String(Math.round(count.v)).padStart(3, '0'); },
        }, 0)
        .addLabel('split', '+=0.15')
        .to('.ld-guide, .ld-meta', { autoAlpha: 0, duration: 0.3 }, 'split')
        .to('.ld-top', { yPercent: -100, duration: 1.15, ease: 'expo.inOut' }, 'split')
        .to('.ld-bottom', { yPercent: 100, duration: 1.15, ease: 'expo.inOut' }, 'split')
        .add(reveal, 'split+=0.3');
      // Hold at the split until the artwork and the cloth are ready.
      tl.addPause('split', () => { ready.then(() => { if (live) tl.play(); }); });
      skip = () => { if (tl.time() < tl.labels.split - 0.05) tl.seek(tl.labels.split - 0.05); };
      loaderEl.addEventListener('click', skip);
      tl.play();
    });
  }

  return () => {
    live = false;
    if (skip) loaderEl?.removeEventListener('click', skip);
    ctx.revert();
    curtain.destroy();
    STAGE.open = 1;
    STAGE.close = 0;
    startScroll();
  };
}
