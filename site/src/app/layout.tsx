import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'beam. — one bar for everything.',
  description: 'An offline Windows 11 floating pill for 1-click media controls, file shelf, countdown timer, and calendar. No cloud, no accounts, zero network requests.',
  icons: {
    icon: '/mascot.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen selection:bg-[#FFAA00]/25 selection:text-black">
        {children}
      </body>
    </html>
  );
}
