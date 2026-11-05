'use client';

import Link from 'next/link';
import { ArrowUpRight, CalendarDays, FolderOpen, Music2, Plus, Timer } from 'lucide-react';
import { HandArrow, StarLogo } from '../components/brand';
import { LiveDemo } from '../components/live-demo';

const REPO = 'https://github.com/kwakhare5/beam';
const RELEASES = `${REPO}/releases/latest`;

const FEATURES = [
  {
    icon: Music2,
    title: 'music',
    body: 'Whatever is playing, from any app Windows knows about. Previous, play, and next without leaving what you were doing.',
    chip: 'bg-blue-tint',
    ink: 'text-blue-bright'
  },
  {
    icon: FolderOpen,
    title: 'files',
    body: 'Drop files on the bar to keep them close. Copy them all at once, or drag one into Explorer.',
    chip: 'bg-orange-tint',
    ink: 'text-orange'
  },
  {
    icon: Timer,
    title: 'timer',
    body: 'A countdown that keeps real time through sleep. Pick a preset, or set any length.',
    chip: 'bg-green-tint',
    ink: 'text-green'
  },
  {
    icon: CalendarDays,
    title: 'calendar',
    body: 'This month at a glance. Move between months, or jump back to today.',
    chip: 'bg-purple-tint',
    ink: 'text-purple'
  }
];

const FAQ = [
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
      'No. It runs the app’s panel in this page with two local audio files. The only requests are for the site’s own files.'
  },
  {
    question: 'Can I copy files out of the demo?',
    answer: 'No. A browser cannot write to Explorer, so copy and drag-out wait for the Windows app.'
  }
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-hairline bg-paper">
        <nav className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between px-4 sm:px-5">
          <a href="#" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
            <StarLogo size={20} />
            beam.
          </a>

          <div className="flex items-center gap-3 text-[13px] text-muted sm:gap-5 sm:text-sm">
            <a href="#features" className="transition-colors hover:text-ink">
              features
            </a>
            <a href="#demo" className="transition-colors hover:text-ink">
              demo
            </a>
            <a href="#faq" className="transition-colors hover:text-ink">
              faq
            </a>
            <a
              href={REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-1 transition-colors hover:text-ink sm:flex"
            >
              github
              <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.75} />
            </a>
            <a
              href={RELEASES}
              className="rounded-lg bg-ink px-3 py-1.5 font-medium text-white transition-colors hover:bg-black sm:px-3.5"
            >
              download
            </a>
          </div>
        </nav>
      </header>

      <main id="content" className="mx-auto w-full max-w-4xl px-5">
        <section className="pb-10 pt-16 sm:pt-20">
          <p className="text-[15px] text-muted">A Windows 11 app that sits above your taskbar.</p>

          <h1 className="relative mt-4 inline-block text-[clamp(2.2rem,5.6vw,3.9rem)] font-semibold leading-[1]">
            meet beam.
            <StarLogo
              size={56}
              className="star-logo absolute -right-1 -top-4 h-10 w-10 sm:-right-2 sm:-top-6 sm:h-14 sm:w-14"
            />
          </h1>

          <p className="mt-3 text-[20px] font-medium text-ink sm:text-[22px]">music, files, time — all in one place.</p>

          <p className="mt-2 font-hand text-2xl text-orange sm:text-3xl">no windows to manage.</p>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted">
            Control what&apos;s playing, keep files close, start a countdown, check the month. One small bar, no account,
            no cloud.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href={RELEASES}
              className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M12 3v12m0 0-4-4m4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M5 19h14" strokeLinecap="round" />
              </svg>
              Download for Windows
            </a>
            <a
              href="#demo"
              className="rounded-lg border border-hairline bg-surface px-4 py-2.5 text-sm font-medium transition-colors hover:bg-hover"
            >
              See it live
            </a>
            <span className="text-[13px] text-muted">v0.1.0 early preview</span>
          </div>
        </section>

        <section id="demo" className="pb-14">
          <div className="relative mb-8 flex justify-center">
            <p className="font-hand text-2xl text-purple">go on, click the star.</p>
            <HandArrow className="absolute left-[calc(50%+22px)] top-1 text-purple" />
          </div>
          <div className="demo-fit">
            <LiveDemo />
          </div>
          <p className="mt-4 text-center text-[13px] text-muted">
            The real app, running in this page. The music is two free tracks, and the Files tab takes real dropped files.
            Copy and drag-out work in the Windows app.
          </p>
        </section>

        <section id="features" className="border-t border-hairline pt-14">
          <h2 className="text-2xl font-semibold sm:text-[28px]">what&apos;s inside.</h2>

          <div className="mt-4">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="flex gap-4 border-b border-hairline py-6 last:border-b-0">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${feature.chip}`}
                    aria-hidden="true"
                  >
                    <Icon className={`h-4 w-4 ${feature.ink}`} strokeWidth={1.9} />
                  </span>
                  <div>
                    <h3 className="text-[16px] font-semibold">{feature.title}</h3>
                    <p className="mt-1 max-w-lg text-[15px] leading-relaxed text-muted">{feature.body}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="py-8 text-[15px] leading-relaxed text-muted">
            That&apos;s the whole app. It rests at 94×30 pixels, opens with Alt + Space, and makes no network requests.
          </p>
        </section>

        <section id="faq" className="border-t border-hairline py-14">
          <h2 className="text-2xl font-semibold sm:text-[28px]">questions.</h2>
          <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-muted">Short answers about the preview.</p>

          <div className="mt-8 border-t border-hairline">
            {FAQ.map((item) => (
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
        </section>

        <section id="download" className="border-t border-hairline py-16">
          <StarLogo size={40} />
          <h2 className="mt-5 text-2xl font-semibold sm:text-[28px]">get beam.</h2>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-muted">
            One portable exe for Windows 11. No installer, no sign-in — run it, pin it, and it stays out of the way.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a
              href={RELEASES}
              className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black"
            >
              Download for Windows
            </a>
            <a
              href={`${REPO}#commands`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-surface px-4 py-2.5 text-sm font-medium transition-colors hover:bg-hover"
            >
              Build from source
              <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.75} />
            </a>
          </div>

          <dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-4 border-t border-hairline pt-6 text-[13px] sm:grid-cols-4">
            <div>
              <dt className="text-muted">System</dt>
              <dd className="mt-1">Windows 11</dd>
            </div>
            <div>
              <dt className="text-muted">Install</dt>
              <dd className="mt-1">Portable exe</dd>
            </div>
            <div>
              <dt className="text-muted">Shortcut</dt>
              <dd className="mt-1">Alt + Space</dd>
            </div>
            <div>
              <dt className="text-muted">Build</dt>
              <dd className="mt-1">Unsigned preview</dd>
            </div>
          </dl>

          <p className="mt-6 max-w-md text-[13px] leading-relaxed text-muted">
            The preview is unsigned, so Windows may ask once — the{' '}
            <a href="#faq" className="underline decoration-hairline underline-offset-2 hover:text-ink">
              FAQ
            </a>{' '}
            has the steps. Found a bug?{' '}
            <a
              href={`${REPO}/issues`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-hairline underline-offset-2 hover:text-ink"
            >
              Open an issue
            </a>
            .
          </p>
        </section>
      </main>

      <footer className="border-t border-hairline">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-5 py-8 text-[13px] text-muted sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <StarLogo size={14} />
            <span className="font-semibold text-ink">beam.</span>
            <span>© 2026 Karan · built in public</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <a href={REPO} target="_blank" rel="noopener noreferrer" className="py-1 transition-colors hover:text-ink">
              github
            </a>
            <a
              href={`${REPO}/blob/main/JOURNAL.md`}
              target="_blank"
              rel="noopener noreferrer"
              className="py-1 transition-colors hover:text-ink"
            >
              journal
            </a>
            <Link href="/changelog" prefetch={false} className="py-1 transition-colors hover:text-ink">
              changelog
            </Link>
            <a href="#faq" className="py-1 transition-colors hover:text-ink">
              faq
            </a>
            <a
              href={`${REPO}/blob/main/DESIGN.md`}
              target="_blank"
              rel="noopener noreferrer"
              className="py-1 transition-colors hover:text-ink"
            >
              design
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
