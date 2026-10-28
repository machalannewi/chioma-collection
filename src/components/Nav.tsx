'use client';

// The dark nav pill and the full-screen menu it opens.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { SITE } from '@/lib/works';
import { gsap } from '@/lib/motion';
import { useScroll } from './SmoothScroll';

const LINKS = [
  { no: '01', label: 'About', href: '/#about' },
  { no: '02', label: 'Work', href: '/work/' },
  { no: '03', label: 'Process', href: '/#process' },
  { no: '04', label: 'Contact', href: '#contact' },
];

// The work wall has no footer, so "Contact" goes home where there is one.
const PAGES_WITHOUT_FOOTER = ['/work', '/work/'];

export default function Nav() {
  const pathname = usePathname();
  const scroll = useScroll();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const ctx = gsap.context(() => {
      tl.current = gsap.timeline({ paused: true })
        .set(panel, { visibility: 'visible' })
        .fromTo(panel, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.8, ease: 'expo.inOut' })
        .from('.mn-word', { yPercent: 105, duration: 0.9, ease: 'expo.out', stagger: 0.06 }, 0.35)
        .from('.mn-num, .mn-arrow, .mn-foot', { autoAlpha: 0, duration: 0.6, stagger: 0.03 }, 0.5);
    }, panel);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (open) { tl.current?.timeScale(1).play(); scroll.stop(); } else { tl.current?.timeScale(1.6).reverse(); scroll.start(); }
  }, [open, scroll]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Close the menu whenever the route changes.
  useEffect(() => { setOpen(false); }, [pathname]);

  const hrefFor = (href: string) => (href === '#contact' && PAGES_WITHOUT_FOOTER.includes(pathname) ? '/#contact' : href);

  const follow = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    const [path, hash] = href.split('#');
    const samePage = !path || path === pathname;
    if (!hash || !samePage) return; // let Next navigate
    e.preventDefault();
    setOpen(false);
    window.setTimeout(() => scroll.scrollTo(`#${hash}`), open ? 450 : 0);
  };

  return (
    <>
      <header className="nv">
        <a className="nv-icon" href={`mailto:${SITE.email}`} aria-label={`Email ${SITE.name}`} data-cursor="hover">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3.5 6 8.5 7 8.5-7" />
          </svg>
        </a>
        <Link className="nv-name" href="/" aria-label={`${SITE.name}, home`} data-cursor="hover" onClick={(e) => follow(e, '/#top')}>
          c<i>.</i>
        </Link>
        <button
          className={`nv-menu${open ? ' is-open' : ''}`}
          aria-expanded={open}
          aria-controls="menu"
          data-cursor="hover"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="nv-menu-label">Menu</span>
          <span className="nv-menu-lines"><i /><i /></span>
        </button>
      </header>

      <div className="mn" id="menu" aria-hidden={!open} ref={panelRef}>
        <nav>
          <ul>
            {LINKS.map(({ no, label, href }) => (
              <li key={label}>
                <Link className="mn-link" href={hrefFor(href)} onClick={(e) => follow(e, hrefFor(href))} tabIndex={open ? 0 : -1}>
                  <span className="mn-num">{no}</span>
                  <span className="mn-word">{label}</span>
                  <span className="mn-arrow">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mn-foot">
          <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
          <span>Screens &amp; thread</span>
          <span>UI/UX designer, {SITE.city}</span>
        </div>
      </div>
    </>
  );
}
