'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { WORKS, workURL } from '@/lib/works';
import { TILES, mountWall } from '@/lib/workWall';
import { fontsReady } from '@/lib/motion';
import ArtImage from '../ArtImage';

export default function WorkWall() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    // The wall takes over wheel and touch input, so the page itself never scrolls.
    document.documentElement.classList.add('wx-page');
    document.body.classList.add('wx-page');
    let live = true;
    let unmount: (() => void) | null = null;
    fontsReady().then(() => { if (live) unmount = mountWall(el); });
    return () => {
      live = false;
      unmount?.();
      document.documentElement.classList.remove('wx-page');
      document.body.classList.remove('wx-page');
    };
  }, []);

  return (
    <main className="wx" id="top" aria-label="The work" ref={root}>
      <div className="wx-tiles">
        {TILES.map(({ work, view, ratio }) => (
          <Link
            key={`${work.slug}-${view}`}
            className="wx-tile"
            href={workURL(work)}
            data-slug={work.slug}
            data-cursor="view"
            draggable={false}
            aria-label={`${work.title} — ${work.note}. View the project`}
          >
            <span className="wx-tile-inner">
              <ArtImage slug={work.slug} view={view} draggable={false} style={{ aspectRatio: ratio }} />
              <span className="wx-caption">
                {work.title}<em> — {work.kind === 'UI' ? 'View case study' : 'View the piece'}</em>
              </span>
            </span>
          </Link>
        ))}
      </div>
      <div className="wx-words">
        <p className="label wx-label wx-fade">( Act I — The collection )</p>
        <h1 className="wx-title">
          <span className="wx-line"><span className="wx-rise">Screens and stitches,</span></span>
          <span className="wx-line"><span className="wx-rise">made by the same</span></span>
          <span className="wx-line"><span className="wx-rise">patient hands.</span></span>
        </h1>
      </div>
      <div className="wx-foot wx-fade" aria-hidden="true">
        <span>{WORKS.length} pieces</span>
        <span className="wx-hint-mouse">Point, drag or scroll to explore · Pinch to zoom</span>
        <span className="wx-hint-touch">Drag to explore · Pinch to zoom</span>
      </div>
    </main>
  );
}
