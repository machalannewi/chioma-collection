import type { Metadata, Viewport } from 'next';
import { DM_Mono, Fraunces, Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import Cursor from '@/components/Cursor';
import Nav from '@/components/Nav';
import SmoothScroll from '@/components/SmoothScroll';
import { SITE } from '@/lib/works';
import './globals.css';

const inter = Inter({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--font-inter', display: 'swap' });
// Variable font (no fixed weights), so the optical-size axis comes along.
const fraunces = Fraunces({
  subsets: ['latin'], style: ['normal', 'italic'], axes: ['opsz'],
  variable: '--font-fraunces', display: 'swap',
});
const dmMono = DM_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-dm-mono', display: 'swap' });

export const metadata: Metadata = {
  title: { default: `${SITE.name} — UI/UX Designer & Embroidery Artist`, template: `%s | ${SITE.name}` },
  description: `${SITE.name} designs calm, obvious interfaces and stitches slow, hand-made pieces. A collection of screens and thread.`,
};

export const viewport: Viewport = { themeColor: '#151b2a' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} ${dmMono.variable}`}>
      {/* Browser extensions and devtools often add attributes to <body> before React loads. */}
      <body suppressHydrationWarning>
        <SmoothScroll>
          <Cursor />
          <Nav />
          {children}
        </SmoothScroll>
      </body>
    </html>
  );
}
