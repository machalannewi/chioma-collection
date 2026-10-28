'use client';

// Curtain call: a pelmet cut from the curtain's cloth drops in, then the lines rise.
import { useEffect, useRef } from 'react';
import { SITE } from '@/lib/works';
import { fabricURL } from '@/lib/fabric';
import { gsap, prefersReduced } from '@/lib/motion';
import Clock from './Clock';

const SOCIALS = ['Dribbble', 'Behance', 'Instagram', 'LinkedIn'];

export default function Footer() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const footer = ref.current;
    if (!footer) return;
    footer.querySelector<HTMLElement>('.ft-valance')!.style.backgroundImage = `url(${fabricURL()})`;
    if (prefersReduced()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo('.ft-valance', { scaleY: 0.15 }, {
        scaleY: 1, ease: 'none',
        scrollTrigger: { trigger: footer, start: 'top bottom', end: 'top 35%', scrub: true },
      });
      gsap.timeline({ scrollTrigger: { trigger: footer, start: 'top 55%' } })
        .from('.ft-line', { yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: 0.1 })
        .from('.ft-fade', { autoAlpha: 0, y: 16, duration: 0.9, ease: 'power3.out', stagger: 0.08 }, 0.3);
    }, footer);
    return () => ctx.revert();
  }, []);

  return (
    <footer className="ft" id="contact" ref={ref}>
      <div className="valance ft-valance" aria-hidden="true"><div className="valance-pleats" /></div>
      <div className="ft-body wrap">
        <div className="grid">
          <h2 className="label ft-fade">( Curtain call )</h2>
          <div>
            <p className="ft-title">
              <span className="ft-mask"><span className="ft-line">Let’s make</span></span>
              <span className="ft-mask"><span className="ft-line">something together.</span></span>
            </p>
            <a className="ft-email ft-fade" href={`mailto:${SITE.email}`} data-cursor="email">
              <span className="ft-email-text">{SITE.email}</span>
              <span className="ft-email-tag">Send an email ↗</span>
            </a>
          </div>
        </div>
        <div className="ft-bottom ft-fade">
          <ul className="ft-links">
            {SOCIALS.map((name) => (
              <li key={name}><a className="ft-link" href="#" data-cursor="hover">{name}</a></li>
            ))}
          </ul>
          <span className="ft-time">{SITE.city}, <Clock /></span>
        </div>
        <div className="ft-base">
          <span>© {new Date().getFullYear()} {SITE.name} · Screens &amp; thread</span>
          <a className="ft-link" href="#top" data-cursor="hover">Back to top ↑</a>
        </div>
      </div>
    </footer>
  );
}
