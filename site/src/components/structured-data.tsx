import { FAQ } from '../content/site';

const SITE = 'https://beamm.vercel.app';
const REPO = 'https://github.com/kwakhare5/beam';

const ORGANIZATION = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE}/#organization`,
  name: 'Beam',
  alternateName: 'beam.',
  url: SITE,
  logo: `${SITE}/mascot.svg`,
  sameAs: [REPO]
};

const WEBSITE = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE}/#website`,
  name: 'beam.',
  url: SITE,
  description:
    'A free, offline Windows 11 bar above the taskbar with live music controls, a file shelf, a countdown timer, and a month calendar.',
  inLanguage: 'en',
  publisher: { '@id': `${SITE}/#organization` }
};

const APP = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  '@id': `${SITE}/#app`,
  name: 'Beam',
  alternateName: 'beam.',
  url: SITE,
  image: `${SITE}/og.png`,
  screenshot: `${SITE}/og.png`,
  description:
    'Beam is a free, offline Windows 11 desktop app that sits above the taskbar. It shows the live media session, holds dropped files on a shelf, runs a countdown timer, and shows the month.',
  applicationCategory: 'UtilitiesApplication',
  applicationSubCategory: 'Desktop customization',
  operatingSystem: 'Windows 11',
  softwareVersion: '0.1.0',
  isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  featureList: [
    'Live media controls for the current Windows media session',
    'Album art and play, pause, previous, and next on the bar',
    'A file shelf for dropped files with copy and drag-out',
    'A countdown timer that keeps running while the bar is hidden',
    'A month calendar with navigation and Today',
    'Quiet mode after 10 seconds, woken by the cursor coming near',
    'Offline operation with no account and no network requests'
  ],
  sameAs: [REPO],
  publisher: { '@id': `${SITE}/#organization` }
};

const FAQ_PAGE = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  '@id': `${SITE}/#faq`,
  mainEntity: FAQ.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: { '@type': 'Answer', text: item.answer }
  }))
};

export const siteGraph = [ORGANIZATION, WEBSITE, APP];
export const faqGraph = FAQ_PAGE;
