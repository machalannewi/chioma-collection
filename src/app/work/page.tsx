import type { Metadata } from 'next';
import WorkWall from '@/components/work/WorkWall';

export const metadata: Metadata = {
  title: 'Work',
  description: 'Every piece in the collection: interfaces, prototypes and hand-stitched embroidery.',
};

export default function WorkPage() {
  return <WorkWall />;
}
