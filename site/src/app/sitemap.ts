import type { MetadataRoute } from 'next';
import { SITE } from '../lib/page-meta';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: `${SITE}/`, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE}/about`, lastModified, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE}/changelog`, lastModified, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE}/press`, lastModified, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE}/privacy`, lastModified, changeFrequency: 'yearly', priority: 0.3 }
  ];
}
