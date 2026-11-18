import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowUpRight, Plus } from 'lucide-react';
import { FAQ, FEATURES, REPO, DOWNLOAD_URL, VERSION } from '../content/site';
import { StarLogo } from '../components/brand';
import { faqGraph } from '../components/structured-data';
import { LiveDemo } from '../components/live-demo';

export const metadata: Metadata = {
  alternates: { canonical: '/' }
};

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
            <a href="#features" className="hidden transition-colors hover:text-ink min-[360px]:block">
              features
            </a>
            <a href="#demo" className="transition-colors hover:text-ink">
              demo
            </a>
            <a href="#faq" className="transition-colors hover:text-ink">
              faq
            </a>
            <a
              href={DOWNLOAD_URL}
              className="rounded-lg bg-ink px-3 py-1.5 font-medium text-white transition-colors hover:bg-black sm:px-3.5"
            >
              Download
            </a>
          </div>
        </nav>
      </header>

      <main id="content" className="mx-auto w-full max-w-4xl px-5">
        <section className="pb-10 pt-16 sm:pt-20">
          <p className="text-[15px] text-muted">Beam is a free, offline Windows 11 app that sits above your taskbar.</p>

          <h1 className="relative mt-8 inline-block text-[clamp(2.2rem,5.6vw,3.9rem)] font-semibold leading-[1] sm:mt-9">
            meet
            <StarLogo
              size={44}
              className="mx-1 inline-block h-[0.72em] w-[0.72em] align-[-0.06em]"
            />
            beam.
          </h1>

          <p className="mt-3 text-[20px] font-medium text-ink sm:text-[22px]">
            music, files, time, all using Alt + Space.
          </p>

          <p className="mt-2 font-hand text-2xl text-orange sm:text-3xl">no windows to manage.</p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href={DOWNLOAD_URL}
              className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-surface px-4 py-2.5 text-sm font-medium transition-colors hover:bg-hover"
            >
              Download
              <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.75} />
            </a>
            <a
              href="#demo"
              className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black"
            >
              See it live
            </a>
            <span className="text-[13px] text-muted">{VERSION} · Windows 11 · installer</span>
          </div>
        </section>

        <section id="demo" className="pb-14">
          <div className="mb-2 flex flex-col items-center">
            <p className="font-hand text-2xl text-purple">go on, click the star.</p>
          </div>
          <LiveDemo />
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

        </section>

        <section id="faq" className="border-t border-hairline py-14">
          <h2 className="text-2xl font-semibold sm:text-[28px]">questions.</h2>

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
            Download the installer for Windows 11. It installs per-user with no admin prompt, and adds Beam to your Start Menu. It is an unsigned early preview, so SmartScreen asks once. Choose More info, then Run anyway.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a
              href={DOWNLOAD_URL}
              className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black"
            >
              Download
              <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.75} />
            </a>
            <a
              href="#demo"
              className="rounded-lg border border-hairline bg-surface px-4 py-2.5 text-sm font-medium transition-colors hover:bg-hover"
            >
              See it live
            </a>
          </div>

          <dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-4 border-t border-hairline pt-6 text-[13px] sm:grid-cols-4">
            <div>
              <dt className="text-muted">System</dt>
              <dd className="mt-1">Windows 11</dd>
            </div>
            <div>
              <dt className="text-muted">Status</dt>
              <dd className="mt-1">{VERSION}</dd>
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
            Found a bug?{' '}
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
            <span>© 2026 Karan Wakhare · built in public</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/about" prefetch={false} className="py-1 transition-colors hover:text-ink">
              about
            </Link>
            <Link href="/privacy" prefetch={false} className="py-1 transition-colors hover:text-ink">
              privacy
            </Link>
            <Link href="/changelog" prefetch={false} className="py-1 transition-colors hover:text-ink">
              changelog
            </Link>
            <a href={REPO} target="_blank" rel="noopener noreferrer" className="py-1 transition-colors hover:text-ink">
              github
            </a>
          </div>
        </div>
      </footer>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqGraph).replace(/</g, '\\u003c') }}
      />
    </div>
  );
}
