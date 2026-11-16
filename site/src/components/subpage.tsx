import Link from 'next/link';
import { REPO, DOWNLOAD_URL } from '../content/site';
import { StarLogo } from './brand';

export function Subpage({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-hairline">
        <nav className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between px-4 sm:px-5">
          <Link href="/" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
            <StarLogo size={20} />
            beam.
          </Link>
          <div className="flex items-center gap-4 text-[13px] text-muted sm:gap-5 sm:text-sm">
            <Link href="/#demo" className="transition-colors hover:text-ink">
              demo
            </Link>
            <a
              href={DOWNLOAD_URL}
              className="rounded-lg bg-ink px-3 py-1.5 font-medium text-white transition-colors hover:bg-black sm:px-3.5"
            >
              Download
            </a>
          </div>
        </nav>
      </header>

      <main id="content" className="mx-auto w-full max-w-3xl px-5 py-16">
        {children}
      </main>

      <footer className="border-t border-hairline">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-5 py-8 text-[13px] text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 Karan Wakhare · built in public</span>
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
        <div className="mx-auto w-full max-w-4xl px-5 pb-7">
          <p className="border-t border-hairline pt-4 text-[12px] text-muted">
            Built by{' '}
            <a
              href="https://karan30.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-ink underline decoration-hairline underline-offset-2 hover:no-underline"
            >
              Karan Wakhare
            </a>
            .
          </p>
        </div>
      </footer>
    </div>
  );
}
