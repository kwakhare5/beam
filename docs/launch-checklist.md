# Launch checklist — Search Console, Bing, and the rest

## Google Search Console (needs Karan's Google login)

1. Open https://search.google.com/search-console
2. Add property → **URL prefix** → `https://beamm.vercel.app`
3. Choose **HTML tag**; copy the `<meta name="google-site-verification" ...>` line.
4. Send that line in chat. It goes into `site/src/app/layout.tsx` metadata, then push + deploy.
5. Back in Search Console, click **Verify**, then submit `https://beamm.vercel.app/sitemap.xml` under Sitemaps.

## Bing Webmaster Tools

1. Open https://www.bing.com/webmasters and sign in (Microsoft account).
2. **Import from Google Search Console** (works once step above is verified).
3. If import is unavailable: add site `https://beamm.vercel.app`, choose HTML meta tag, send the tag the same way.
4. Submit the sitemap if Bing did not import it.

IndexNow is already working (submitted 2026-11-15, returns 202).

## Already done

- `sitemap.xml`, `robots.txt`, canonical URLs, OG/Twitter metadata, JSON-LD (Organization, WebSite, SoftwareApplication, FAQPage), `llms.txt`, AI-crawler allowances.
- Vercel Analytics enabled; GitHub repo description, homepage, topics.
- Download checksum published; FAQ explains verification.

## Still open

- Custom domain: needs a purchase decision; then wire it into `SITE` in `site/src/lib/page-meta.ts` plus Vercel.
- Directory/backlink posts (Product Hunt, Show HN, Reddit, AlternativeTo, Betalist): drafts after Karan picks platforms.
- Post-bank evidence: recordings for hover, quiet, and install journeys.
- R7: second display is not detected by Windows; scaling and Windows 10 untested.
- Trust: installer unsigned; paid options (Store, certificate) deferred.
