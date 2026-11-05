import type { Metadata, Viewport } from 'next';
import './globals.css';

const site = 'https://beamm.vercel.app';
const title = 'beam. — one small bar for music, files, and time.';
const description =
  'A tiny Windows 11 bar above your taskbar: live music controls, a file shelf, a countdown, and the month. Offline, one click away, never in the way.';

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: title, template: '%s — beam.' },
  description,
  alternates: { canonical: '/' },
  icons: { icon: '/mascot.svg' },
  openGraph: {
    type: 'website',
    url: site,
    siteName: 'beam.',
    title,
    description,
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'beam. — one small bar for music, files, and time.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/og.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#f7f7f5',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a href="#content" className="skip-link">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
