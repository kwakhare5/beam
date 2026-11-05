import type { MetadataRoute } from 'next';

const site = 'https://beamm.vercel.app';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${site}/sitemap.xml`
  };
}
