'use client';

// The case study's motion: current-tab tracking, title rise, and pictures that open like blinds.
import { useEffect } from 'react';
import { gsap, ScrollTrigger, $, $$, prefersReduced, reveals } from '@/lib/motion';
import { useScroll } from '../SmoothScroll';

export default function CaseMotion() {
  const scroll = useScroll();

  useEffect(() => {
    const root = $('.case');
    if (!root) return;
    const ctx = gsap.context(() => {
      // Highlight the tab for whichever section is on screen.
      $$('[data-tab]', root).forEach((el) => {
        ScrollTrigger.create({
          trigger: el, start: 'top 45%', end: 'bottom 45%',
          onToggle: (st) => {
            if (!st.isActive) return;
            $$('[data-tab-link]', root).forEach((a) => a.classList.toggle('is-current', a.dataset.tabLink === el.dataset.tab));
            $(`[data-tab-link="${el.dataset.tab}"]`, root)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
          },
        });
      });
      $('[data-tab-link="intro"]', root)?.classList.add('is-current');
      reveals(root);
      if (prefersReduced()) return;

      gsap.from('.case-rise', { yPercent: 105, duration: 1.2, ease: 'expo.out', delay: 0.1 });
      gsap.from('.case-hero .label, .case-back, .case-fade, .case-tabs', { autoAlpha: 0, y: 12, duration: 0.9, ease: 'power3.out', stagger: 0.06, delay: 0.3 });
      // Pictures open like a blind being raised, and settle from a slight zoom.
      $$('.case-reveal-pic', root).forEach((fig) => {
        gsap.timeline({ scrollTrigger: { trigger: fig, start: 'top 90%' } })
          .fromTo(fig, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: 'expo.inOut' })
          .fromTo(fig, { '--zoom': 1.15 }, { '--zoom': 1, duration: 1.6, ease: 'expo.out' }, 0.1);
      });
      gsap.fromTo('.case-next > :first-child', { yPercent: -8 }, {
        yPercent: 8, ease: 'none',
        scrollTrigger: { trigger: '.case-next', start: 'top bottom', end: 'bottom top', scrub: true },
      });
    }, root);
    ScrollTrigger.refresh();
    if (location.hash.length > 1) scroll.scrollTo(location.hash, true);
    return () => ctx.revert();
  }, [scroll]);

  return null;
}
