import type { MetadataRoute } from 'next';

const site = 'https://beamm.vercel.app';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${site}/`, lastModified: '2026-11-05', changeFrequency: 'weekly', priority: 1 },
    { url: `${site}/changelog`, lastModified: '2026-11-05', changeFrequency: 'weekly', priority: 0.6 }
  ];
}
