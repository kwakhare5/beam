import type { MetadataRoute } from 'next';
import { SITE } from '../lib/page-meta';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      {
        userAgent: [
          'GPTBot',
          'OAI-SearchBot',
          'ChatGPT-User',
          'PerplexityBot',
          'ClaudeBot',
          'Claude-SearchBot',
          'Google-Extended',
          'Applebot-Extended'
        ],
        allow: '/'
      }
    ],
    sitemap: `${SITE}/sitemap.xml`
  };
}
