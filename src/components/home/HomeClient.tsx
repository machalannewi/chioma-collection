'use client';

// The home page. Markup is plain JSX; the motion lives in src/lib/home/*
// and is wired up once the page has mounted.
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { WORKS, SITE, workURL } from '@/lib/works';
import { ScrollTrigger, $, $$, fontsReady, reveals, prefersReduced, gsap } from '@/lib/motion';
import { hero } from '@/lib/home/hero';
import { hoverCards } from '@/lib/home/hoverCards';
import { collection } from '@/lib/home/collection';
import ArtImage from '../ArtImage';
import Clock from '../Clock';
import { useScroll } from '../SmoothScroll';

const STEPS = [
  ['Listen', 'I learn who it’s for, what they need, and where things snag today.'],
  ['Sketch', 'Research turns into rough flows and pencil drafts, shared early so we agree on direction.'],
  ['Pattern', 'Wireframes become a system; a drawing becomes a pattern to transfer. Structure before colour.'],
  ['Stitch', 'High-fidelity screens and hand stitches — tested, prototyped, unpicked and redone until it sits right.'],
  ['Finish', 'Hand-off files and a living design system — or a framed hoop, backed and ready to hang.'],
];

function Word({ work, children }: { work: string; children: string }) {
  return (
    <button className={`dc-word${work === 'portrait' ? ' pr-portrait' : ''}`} data-work={work} data-cursor="hover">
      {children}<span className="dc-thumb" aria-hidden="true" />
    </button>
  );
}

export default function HomeClient() {
  const root = useRef<HTMLDivElement>(null);
  const scroll = useScroll();

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let live = true;
    const cleanups: (() => void)[] = [];
    const ready = fontsReady();

    cleanups.push(hero(el, { ready, stopScroll: scroll.stop, startScroll: scroll.start }));

    ready.then(() => {
      if (!live) return;
      // Artwork is painted with the web fonts, so everything that shows it waits for them.
      cleanups.push(hoverCards($('.pr', el)!));
      cleanups.push(hoverCards($('.pg', el)!));
      cleanups.push(collection($('.rw', el)!, scroll.lenis()));
      const ctx = gsap.context(() => {
        reveals(el);
        if (prefersReduced()) return;
        $$('.ps-row', el).forEach((row) => {
          gsap.fromTo(row.children, { opacity: 0.16 }, {
            opacity: 1, ease: 'none', stagger: 0.04,
            scrollTrigger: { trigger: row, start: 'top 88%', end: 'top 58%', scrub: true },
          });
        });
      }, el);
      cleanups.push(() => ctx.revert());
      ScrollTrigger.refresh();
      // Arriving from another page with a #section: jump there.
      if (location.hash.length > 1) requestAnimationFrame(() => scroll.scrollTo(location.hash, true));
    });

    return () => {
      live = false;
      cleanups.reverse().forEach((off) => off());
    };
  }, [scroll]);

  return (
    <div ref={root}>
      {/* Loader: a type specimen that splits like a stage door */}
      <div className="ld" aria-hidden="true">
        <div className="ld-half ld-top"><div className="ld-spec"><span className="ld-word">{SITE.name}</span></div></div>
        <div className="ld-half ld-bottom"><div className="ld-spec"><span className="ld-word">{SITE.name}</span></div></div>
        <div className="ld-guide"><span>( Baseline )</span></div>
        <div className="ld-meta ld-meta-top"><span>The Collection</span><span>Screens &amp; Thread</span></div>
        <div className="ld-meta ld-meta-bottom"><span>Threading the needle</span><span className="ld-count">000</span></div>
      </div>

      <main>
        {/* Hero */}
        <section className="cu" id="top" aria-label="Hero">
          <div className="cu-canvas" aria-hidden="true" />
          <ul className="st-bill" aria-label="Programme">
            <li className="cu-fade"><span>Act I</span> Screens</li>
            <li className="cu-fade"><span>Act II</span> Thread</li>
            <li className="cu-fade"><span>{SITE.city}</span> <Clock /></li>
          </ul>
          <p className="st-seat cu-fade">Take your seat ↓</p>
          <div className="cu-copy">
            <p className="st-now cu-fade">( Now showing )</p>
            <h1 className="cu-title"><span className="cu-line"><span className="cu-rise">{SITE.name}</span></span></h1>
            <p className="cu-sub">
              <span className="cu-line"><span className="cu-rise">A UI/UX designer &amp; embroidery artist</span></span>{' '}
              <span className="cu-line"><span className="cu-rise">stitching intentional experiences.</span></span>
            </p>
            <a className="cu-button cu-fade" href={`mailto:${SITE.email}`} data-cursor="hover">
              Reach out <span aria-hidden="true">→</span>
            </a>
          </div>
        </section>

        {/* Prologue */}
        <section className="pr wrap" id="about">
          <div className="grid">
            <h2 className="label reveal">( Prologue )</h2>
            <p className="lede reveal">
              I’m <Word work="portrait">{SITE.name}</Word>, a UI/UX designer and embroidery artist. By day I design
              interfaces that feel calm and obvious; by evening I sit with a hoop and a needle. Both are slow, patient
              crafts — every screen and every stitch is a small production, and I like to get the details right before
              the curtain goes up.
            </p>
          </div>
        </section>

        {/* The programme: its thumbnails peel off and fly down into the collection below */}
        <section className="pg wrap">
          <div className="grid">
            <h2 className="label reveal">( The programme )</h2>
            <div>
              <p className="lede reveal">
                I design <Word work="ledger">interfaces</Word> people understand at a glance,
                and <Word work="bloom">prototypes</Word> that let a team feel an idea before it’s built. Off screen,
                I hand-stitch <Word work="wildflower">florals</Word>, <Word work="monogram">monograms</Word> and{' '}
                <Word work="sampler">samplers</Word> — slow pieces that remind me every detail is placed on purpose.
              </p>
              <p className="hint reveal">
                <span className="hint-mouse">Hover the underlined words to see the work</span>
                <span className="hint-touch">Tap the underlined words to see the work</span>
              </p>
            </div>
          </div>
          <div className="dc-card" aria-live="polite"><div className="dc-card-inner"><span className="dc-card-caption" /></div></div>
        </section>

        {/* Act I: the collection */}
        <section className="rw" id="work">
          <div className="rw-guides" aria-hidden="true"><span /><span /><span /><span /></div>
          <div className="rw-cards">
            {WORKS.map((work) => (
              <Link
                key={work.slug}
                className="rw-card"
                href={workURL(work)}
                data-slug={work.slug}
                data-cursor="view"
                tabIndex={-1}
                aria-label={`${work.title} — ${work.note}. View the project`}
              >
                <ArtImage slug={work.slug} />
                <span className="rw-card-label"><span>No. {work.no}</span><em>{work.kind}</em></span>
              </Link>
            ))}
          </div>
          <div className="rw-copy">
            <p className="label">( Act I — The collection )</p>
            <h2 className="rw-title">Screens and stitches, made by the same patient hands.</h2>
            <Link className="rw-cta" href="/work/" data-cursor="hover">See all work <span aria-hidden="true">→</span></Link>
          </div>
        </section>

        {/* Act II: the process */}
        <section className="ps wrap" id="process">
          <div className="grid">
            <h2 className="label reveal">( Act II — The process )</h2>
            <div>
              <p className="ps-intro reveal">Whether it’s a product team or a single hoop, the process stays the same.</p>
              <ol className="ps-list">
                {STEPS.map(([title, body], i) => (
                  <li className="ps-row" key={title}>
                    <span className="ps-num">{String(i + 1).padStart(2, '0')}</span>
                    <h3>{title}</h3>
                    <p>{body}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
