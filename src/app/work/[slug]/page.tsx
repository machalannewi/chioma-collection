import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CaseStudy from '@/components/case/CaseStudy';
import Footer from '@/components/Footer';
import { WORKS } from '@/lib/works';

interface Props { params: { slug: string } }

// One static page per piece in src/lib/works.ts; anything else is a 404.
export const dynamicParams = false;
export const generateStaticParams = () => WORKS.map(({ slug }) => ({ slug }));

export function generateMetadata({ params }: Props): Metadata {
  const work = WORKS.find((w) => w.slug === params.slug);
  return work ? { title: `${work.title} — ${work.note}`, description: work.intro } : {};
}

export default function WorkDetailPage({ params }: Props) {
  const index = WORKS.findIndex((w) => w.slug === params.slug);
  if (index < 0) notFound();
  return (
    <>
      <CaseStudy work={WORKS[index]} next={WORKS[(index + 1) % WORKS.length]} />
      <Footer />
    </>
  );
}
