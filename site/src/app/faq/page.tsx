import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { StarLogo } from '../star';

const REPO = 'https://github.com/kwakhare5/beam';
const RELEASES = `${REPO}/releases/latest`;

export const metadata: Metadata = {
  title: 'questions',
  description:
    'Short answers about beam: accounts, storage, SmartScreen, the Alt + Space shortcut, Windows versions, uninstall, and the demo.'
};

const QUESTIONS = [
  {
    question: 'Does beam need an account?',
    answer: 'No. There is no sign-in, no cloud, and no sync. The app makes no network requests.'
  },
  {
    question: 'What does it store on my PC?',
    answer:
      'The bar’s position, in %APPDATA%\\Beam\\settings.json. Files on the shelf are paths kept in memory, and they clear when you quit.'
  },
  {
    question: 'Windows says it’s unsafe. What now?',
    answer:
      'The preview is unsigned, so SmartScreen warns once. Choose More info, then Run anyway. The full source is on GitHub.'
  },
  {
    question: 'Alt + Space is already taken.',
    answer: 'Beam falls back to Ctrl + Shift + Space when Windows will not give it Alt + Space.'
  },
  {
    question: 'Which Windows versions work?',
    answer: 'Windows 11. That is the system the preview is built and tested on.'
  },
  {
    question: 'How do I remove it?',
    answer: 'Delete the exe. To clear the saved position too, delete %APPDATA%\\Beam.'
  },
  {
    question: 'Does the demo send anything?',
    answer:
      'No. It runs the app’s renderer in the page with two local audio files. The only requests are for the site’s own files.'
  },
  {
    question: 'Can I copy files out of the demo?',
    answer: 'No. A browser cannot write to Explorer, so copy and drag-out wait for the Windows app.'
  }
];

export default function FaqPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-hairline">
        <nav className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between px-4 sm:px-5">
          <Link href="/" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
            <StarLogo size={20} />
            beam.
          </Link>
          <div className="flex items-center gap-4 text-[13px] text-muted sm:gap-5 sm:text-sm">
            <Link href="/" className="transition-colors hover:text-ink">
              back to beam
            </Link>
            <a
              href={RELEASES}
              className="rounded-lg bg-ink px-3 py-1.5 font-medium text-white transition-colors hover:bg-black sm:px-3.5"
            >
              download
            </a>
          </div>
        </nav>
      </header>

      <main id="content" className="mx-auto w-full max-w-3xl px-5 py-16">
        <p className="text-[15px] text-muted">Short answers about the preview.</p>
        <h1 className="mt-4 text-[clamp(2.2rem,5.6vw,3.9rem)] font-semibold leading-[1]">questions.</h1>

        <div className="mt-10 border-t border-hairline">
          {QUESTIONS.map((item) => (
            <details key={item.question} className="group border-b border-hairline">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[16px] font-medium">
                {item.question}
                <Plus
                  className="h-4 w-4 shrink-0 text-muted transition-transform duration-200 group-open:rotate-45"
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
              </summary>
              <p className="max-w-xl pb-5 text-[15px] leading-relaxed text-muted">{item.answer}</p>
            </details>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <a
            href={RELEASES}
            className="rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black"
          >
            Download for Windows
          </a>
          <a
            href={`${REPO}/issues`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-hairline bg-surface px-4 py-2.5 text-sm font-medium transition-colors hover:bg-hover"
          >
            Ask on GitHub
          </a>
        </div>
      </main>
    </div>
  );
}
