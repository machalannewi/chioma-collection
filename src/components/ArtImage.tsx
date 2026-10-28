'use client';

// An <img> of a piece's artwork. The artwork is painted on canvas in the browser,
// so the image fills in after mount (or uses a real photo from PHOTOS in art.ts).
import { useEffect, useState, type ImgHTMLAttributes } from 'react';
import { paint, type ViewName } from '@/lib/art';
import { workBySlug } from '@/lib/works';
import { fontsReady } from '@/lib/motion';

interface Props extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  slug: string;
  view?: ViewName;
}

export default function ArtImage({ slug, view = 'card', alt = '', ...rest }: Props) {
  const [src, setSrc] = useState<string>();
  useEffect(() => {
    let live = true;
    const work = workBySlug(slug);
    if (work) fontsReady().then(() => { if (live) setSrc(paint(work, view)); });
    return () => { live = false; };
  }, [slug, view]);
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt={alt} {...rest} /> : <span className="art-pending" aria-hidden="true" />;
}
