import type { Metadata } from 'next';
import Link from 'next/link';
import { StarLogo } from '../../components/brand';

const REPO = 'https://github.com/kwakhare5/beam';
const RELEASES = `${REPO}/releases/latest`;

export const metadata: Metadata = {
  title: 'changelog',
  description: 'What changed in the beam preview, newest first.'
};

const ENTRIES = [
  {
    date: '2026-11-04',
    title: 'trust pass',
    items: [
      'Keyboard control: the bar takes focus, Enter or Space opens the panel, and a focus ring shows where you are.',
      'Alt + Space toggles the panel, with Ctrl + Shift + Space as the fallback.',
      'Add files opens the Windows picker, and a cleared shelf can be undone for five seconds.',
      'The bar dims to a quiet star after 20 seconds, and the window only clips to its visible shape.',
      'The bar hides while a fullscreen window owns the screen, and the tray brings it back.'
    ]
  },
  {
    date: '2026-11-02',
    title: 'music, files, time',
    items: [
      'The live track, cover art, and previous / play / next sit on the bar and in the Music tab.',
      'Dropped files stay on a shelf: copy them, drag them into Explorer, see missing files, clear them all.',
      'A countdown that keeps real time through sleep, and a month calendar with Today.',
      'The bar remembers its position and restores it on the right monitor.'
    ]
  }
];

export default function ChangelogPage() {
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
        <p className="text-[15px] text-muted">What changed in the preview, newest first.</p>
        <h1 className="mt-4 text-[clamp(2.2rem,5.6vw,3.9rem)] font-semibold leading-[1]">changelog.</h1>

        <div className="mt-10 flex flex-col gap-10">
          {ENTRIES.map((entry) => (
            <article key={entry.date} className="border-t border-hairline pt-6">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="text-[16px] font-semibold">{entry.title}</h2>
                <time dateTime={entry.date} className="text-[13px] text-muted">
                  {entry.date}
                </time>
              </div>
              <ul className="mt-3 flex flex-col gap-2">
                {entry.items.map((item) => (
                  <li key={item} className="flex gap-3 text-[15px] leading-relaxed text-muted">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <a
            href={`${REPO}/blob/main/JOURNAL.md`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black"
          >
            Read the journal
          </a>
          <Link
            href="/"
            className="rounded-lg border border-hairline bg-surface px-4 py-2.5 text-sm font-medium transition-colors hover:bg-hover"
          >
            Back to beam
          </Link>
        </div>
      </main>
    </div>
  );
}
