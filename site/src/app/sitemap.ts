import type { MetadataRoute } from 'next';

const site = 'https://beamm.vercel.app';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: `${site}/`, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${site}/changelog`, lastModified, changeFrequency: 'weekly', priority: 0.6 }
  ];
}
