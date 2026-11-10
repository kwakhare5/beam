import type { Metadata } from 'next';

export const SITE = 'https://beamm.vercel.app';
const OG_ALT = 'beam. — music, files, time — all in one place.';

export function pageMetadata(title: string, description: string, path: string): Metadata {
  const full = `${title} — beam.`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      url: `${SITE}${path}`,
      siteName: 'beam.',
      title: full,
      description,
      images: [{ url: '/og.png', width: 1200, height: 630, alt: OG_ALT }]
    },
    twitter: {
      card: 'summary_large_image',
      title: full,
      description,
      images: ['/og.png']
    }
  };
}
