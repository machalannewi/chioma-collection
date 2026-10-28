// /work/[slug]: the case study for one piece. Server-rendered from src/lib/works.ts;
// the artwork and the motion fill in on the client.
import Link from 'next/link';
import { VIEWS, type ViewName } from '@/lib/art';
import { workURL, type Section, type Work } from '@/lib/works';
import ArtImage from '../ArtImage';
import CaseMotion from './CaseMotion';

// Image rows under each section, by view name (see VIEWS in art.ts).
// A work can override any of these with its own `rows` on a section.
const DEFAULT_ROWS: Record<string, ViewName[][]> = {
  overview: [['wide']],
  challenge: [['card', 'detail']],
  approach: [['tall', 'close']],
  outcome: [['strip']],
};

function Figure({ slug, view, alt, className = '' }: { slug: string; view: ViewName; alt: string; className?: string }) {
  const ratio = (VIEWS[view].w / VIEWS[view].h).toFixed(4);
  return (
    <figure className={`case-pic case-reveal-pic ${className}`} style={{ ['--ratio' as string]: ratio }}>
      <ArtImage slug={slug} view={view} alt={alt} loading="lazy" decoding="async" />
    </figure>
  );
}

function CaseSection({ work, section, index }: { work: Work; section: Section; index: number }) {
  const rows = section.rows ?? DEFAULT_ROWS[section.id] ?? [];
  return (
    <section className="case-section wrap" id={section.id} data-tab={section.id} aria-labelledby={`${section.id}-title`}>
      <div className="grid case-copy reveal">
        <p className="label">( {String(index + 1).padStart(2, '0')} — {section.label} )</p>
        <div className="case-words">
          <h2 className="case-heading" id={`${section.id}-title`}>{section.title}</h2>
          {section.body.map((p, j) => <p key={j} className={j === 0 ? 'case-lead' : ''}>{p}</p>)}
        </div>
      </div>
      {rows.length > 0 && (
        <div className="case-rows">
          {rows.map((row, r) => (
            <div className="case-row" key={r}>
              {row.map((view) => (
                <Figure key={view} slug={work.slug} view={view} alt={`${work.title}, ${section.label.toLowerCase()}`} />
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function CaseStudy({ work, next }: { work: Work; next: Work }) {
  const tabs = [{ id: 'intro', label: 'Intro' }, ...work.sections.map((s) => ({ id: s.id, label: s.label }))];
  const meta = Object.entries(work.meta);

  return (
    <main className="case" id="top">
      <nav className="case-tabs" aria-label="Sections">
        {tabs.map((t) => <a key={t.id} href={`#${t.id}`} data-tab-link={t.id} data-cursor="hover">{t.label}</a>)}
      </nav>

      <header className="case-hero wrap" id="intro" data-tab="intro">
        <div className="case-hero-text">
          <Link className="case-back" href="/work/" data-cursor="hover">← All work</Link>
          <p className="label">( {work.title} — No. {work.no} )</p>
          <h1 className="case-title"><span className="case-mask"><span className="case-rise">{work.intro}</span></span></h1>
        </div>
        <dl className="case-meta case-fade">
          {meta.map(([k, v], i) => (
            <div key={k} className={i === meta.length - 1 ? 'is-wide' : ''}><dt>{k}</dt><dd>{v}</dd></div>
          ))}
        </dl>
        <Figure slug={work.slug} view="scene" alt={`${work.title}, ${work.note}`} className="case-hero-pic" />
      </header>

      {work.sections.map((s, i) => <CaseSection key={s.id} work={work} section={s} index={i} />)}

      <Link className="case-next" href={workURL(next)} data-cursor="view">
        <ArtImage slug={next.slug} view="scene" loading="lazy" decoding="async" />
        <span className="case-next-label">( Next piece )</span>
        <span className="case-next-name">{next.title}<em>{next.kind === 'UI' ? 'Case study' : 'Embroidery'}</em></span>
      </Link>

      <CaseMotion />
    </main>
  );
}
