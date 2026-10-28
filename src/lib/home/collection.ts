// Act I: the programme's thumbnails peel off into a pile, which fans into a ring
// and scatters around the copy. Once separated, every card is a link to its piece.
import type Lenis from 'lenis';
import { gsap, $, $$, clamp01, lerp, smooth, easeOut, easeInOut, isMobile, prefersReduced } from '../motion';

interface Card {
  el: HTMLAnchorElement;
  thumb: HTMLElement | null;   // the inline thumbnail in the programme this card flies out of
  lift: { v: number };
  pileRot: number; pileX: number; pileY: number; tilt: number; drift: number;
}

export function collection(section: HTMLElement, lenis: Lenis | null): () => void {
  const reduced = prefersReduced();
  const mobile = isMobile();
  const copy = $('.rw-copy', section)!;
  const rand = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646; })();

  const cards: Card[] = $$<HTMLAnchorElement>('.rw-card', section).map((el) => ({
    el,
    thumb: $(`.pg .dc-word[data-work="${el.dataset.slug}"] .dc-thumb`),
    lift: { v: 0 },
    pileRot: (rand() - 0.5) * 16,
    pileX: (rand() - 0.5) * 22,
    pileY: (rand() - 0.5) * 22,
    tilt: (rand() - 0.5) * 12,
    drift: 0.85 + rand() * 0.3,
  }));

  const state = { peel: reduced ? 1 : 0, p: reduced ? 1 : 0 };
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let hovered = -1;
  let ready = false;

  const layout = () => {
    const { peel, p } = state;
    const vw = section.clientWidth, vh = section.clientHeight;
    const rect = section.getBoundingClientRect();
    const midX = rect.left + rect.width / 2, midY = rect.top + rect.height / 2;
    const n = cards.length;
    const ring = Math.min(vw, vh) * (mobile ? 0.3 : 0.27);
    const toRing = easeInOut(clamp01((p - 0.04) / 0.32));
    const out = easeInOut(clamp01((p - 0.42) / 0.38));
    const spin = p * Math.PI * 0.9;
    const rx = lerp(ring, vw * (mobile ? 0.38 : 0.39), out);
    const ry = lerp(ring, vh * (mobile ? 0.38 : 0.37), out);
    // Nudge the scattered ring down a touch so the top card clears the nav pill.
    const drop = vh * 0.035 * out;
    // The pile hangs high, close to the words it came from, then settles to the centre once pinned.
    const settle = p > 0 ? 0.3 + 0.7 * easeOut(clamp01(p / 0.3)) : 0.3 * smooth(peel, 0.6, 1) ** 2;
    const pileLift = -vh * 0.3 * (1 - settle);
    // The whole arrangement leans gently towards the pointer.
    const tiltX = pointer.y * 6 * toRing, tiltY = -pointer.x * 8 * toRing;
    const dim = smooth(p, 0.9, 1);

    cards.forEach((c, i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2 + spin;
      let x = lerp(c.pileX + ((i % 3) - 1) * 8, Math.cos(a) * rx * lerp(1, c.drift, out), toRing);
      // The top of the scattered ring is flattened so those cards sit below the nav.
      const sinA = Math.sin(a) * (Math.sin(a) < 0 ? lerp(1, 0.84, out) : 1);
      let y = lerp(c.pileY - i * 2.5, sinA * ry * lerp(1, c.drift, out), toRing) + pileLift + drop;
      let rot = lerp(c.pileRot, c.tilt, toRing);
      let sx = 1, sy = 1, alpha = 1;

      if (peel < 1) {
        const t = smooth(peel - i * 0.04, 0, 0.6);
        if (c.thumb) {
          // Peel the card off its thumbnail and arc it down into the pile.
          const r = c.thumb.getBoundingClientRect();
          const w = c.el.offsetWidth, h = c.el.offsetHeight;
          const arc = Math.sin(Math.PI * t);
          x = lerp(r.left + r.width / 2 - midX, x, t);
          y = lerp(r.top + r.height / 2 - midY, y, t) - arc * 60;
          sx = lerp(r.width / w, 1, t);
          sy = lerp(r.height / h, 1, t);
          rot = lerp(0, rot, t) + arc * (i % 2 ? 10 : -10);
          if (!reduced) c.thumb.style.visibility = peel > 0 ? 'hidden' : '';
          alpha = peel > 0 ? 1 : 0;
        } else {
          alpha = t;
          sx = sy = lerp(0.6, 1, t);
          y += (1 - t) * 40;
        }
      } else if (c.thumb && !reduced) {
        c.thumb.style.visibility = 'hidden';
      }

      const L = c.lift.v;
      sx *= 1 + 0.12 * L;
      sy *= 1 + 0.12 * L;
      rot *= 1 - L;
      if (hovered >= 0 && hovered !== i) alpha *= 1 - 0.45 * dim;

      c.el.style.visibility = alpha > 0.001 ? 'visible' : 'hidden';
      c.el.style.opacity = alpha.toFixed(3);
      c.el.style.zIndex = String(L > 0.01 ? 1000 : toRing > 0.6 ? 100 + Math.round(y + vh) : (c.thumb ? 300 : 100) + i);
      c.el.style.transform =
        `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) perspective(900px) ` +
        `rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg) rotate(${rot.toFixed(2)}deg) ` +
        `scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
    });

    const shown = smooth(p, 0.78, 0.95);
    copy.style.visibility = shown > 0.001 ? 'visible' : 'hidden';
    copy.style.opacity = String(shown);
    copy.style.translate = `-50% calc(-50% + ${((1 - shown) * 20).toFixed(1)}px)`;

    // Only once the cards have fully separated do they become links.
    const nowReady = p > 0.92;
    if (nowReady !== ready) {
      ready = nowReady;
      section.classList.toggle('is-ready', ready);
      cards.forEach((c) => { c.el.tabIndex = ready ? 0 : -1; });
      if (!ready && hovered >= 0) cards[hovered].el.dispatchEvent(new Event('pointerleave'));
    }
  };

  const offs: (() => void)[] = [];
  cards.forEach((c, i) => {
    const enter = () => {
      if (!ready) return;
      hovered = i;
      gsap.to(c.lift, { v: 1, duration: 0.5, ease: 'power3.out', onUpdate: layout });
    };
    const leave = () => {
      if (hovered === i) hovered = -1;
      gsap.to(c.lift, { v: 0, duration: 0.45, ease: 'power3.out', onUpdate: layout });
    };
    for (const [type, fn] of [['pointerenter', enter], ['pointerleave', leave], ['focus', enter], ['blur', leave]] as const) {
      c.el.addEventListener(type, fn);
      offs.push(() => c.el.removeEventListener(type, fn));
    }
  });

  const ctx = gsap.context(() => {
    if (reduced) return;
    // The cards peel off the programme's thumbnails as the section scrolls in…
    gsap.to(state, {
      peel: 1, ease: 'none', onUpdate: layout,
      scrollTrigger: { trigger: section, start: 'top 72%', end: 'top top', scrub: 1, invalidateOnRefresh: true },
    });
    // …then the section pins while the pile fans into a ring and scatters around the copy.
    gsap.to(state, {
      p: 1, ease: 'none', onUpdate: layout,
      scrollTrigger: {
        trigger: section, start: 'top top', end: () => (mobile ? '+=180%' : '+=260%'),
        pin: true, anticipatePin: 1, scrub: 1, invalidateOnRefresh: true, onRefresh: layout,
      },
    });
  });

  const onPointer = (e: PointerEvent) => {
    pointer.tx = (e.clientX / innerWidth - 0.5) * 2;
    pointer.ty = (e.clientY / innerHeight - 0.5) * 2;
  };
  const lean = () => {
    const dx = pointer.tx - pointer.x, dy = pointer.ty - pointer.y;
    if (Math.abs(dx) + Math.abs(dy) < 0.001) return;
    pointer.x += dx * 0.06;
    pointer.y += dy * 0.06;
    if (state.p > 0.15) layout();
  };
  // While the pile is still forming, the thumbnails move with the page, so keep following them.
  const onScroll = () => { if (state.peel > 0 && state.peel < 1) layout(); };
  if (!reduced) {
    window.addEventListener('pointermove', onPointer, { passive: true });
    gsap.ticker.add(lean);
    lenis?.on('scroll', onScroll);
  }
  window.addEventListener('resize', layout);
  layout();

  return () => {
    ctx.revert();
    offs.forEach((off) => off());
    window.removeEventListener('pointermove', onPointer);
    window.removeEventListener('resize', layout);
    gsap.ticker.remove(lean);
    lenis?.off('scroll', onScroll);
    cards.forEach((c) => { if (c.thumb) c.thumb.style.visibility = ''; });
  };
}
