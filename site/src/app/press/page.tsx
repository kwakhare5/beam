import { pageMetadata } from '../../lib/page-meta';
import { Subpage } from '../../components/subpage';
import { REPO } from '../../content/site';

export const metadata = pageMetadata(
  'press',
  'Beam press kit: boilerplate, fast facts, the logo, the social card, and the live demo.',
  '/press'
);

const FACTS = [
  ['Name', 'Beam (written beam.)'],
  ['Maker', 'Karan Wakhare'],
  ['Platform', 'Windows 11'],
  ['Price', 'Free'],
  ['Status', 'Preview; Windows build not published'],
  ['Size', '69–127×30 pixels at rest, hugged'],
  ['Account', 'Not required'],
  ['Network', 'None in the app'],
  ['Source', REPO]
];

export default function PressPage() {
  return (
    <Subpage>
      <p className="text-[15px] text-muted">Press kit</p>
      <h1 className="mt-4 text-[clamp(2.2rem,5.6vw,3.9rem)] font-semibold leading-[1]">beam. at a glance.</h1>
      <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-muted">
        Everything needed to write about Beam. If something is missing, open an issue on GitHub.
      </p>

      <h2 className="mt-12 text-2xl font-semibold">boilerplate.</h2>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
        Beam is a free, offline Windows 11 app that replaces several taskbar detours with one small floating bar. It shows
        the current track with real controls, holds dropped files on a shelf, runs a countdown, and keeps the month one
        click away. There is no account, no cloud, and no network request from the app. Beam is built in public by Karan
        Wakhare.
      </p>

      <h2 className="mt-10 text-2xl font-semibold">fast facts.</h2>
      <dl className="mt-5 grid grid-cols-1 gap-x-8 gap-y-3 border-y border-hairline py-6 text-[14px] sm:grid-cols-2">
        {FACTS.map(([term, value]) => (
          <div key={term} className="flex justify-between gap-6 sm:block">
            <dt className="text-muted">{term}</dt>
            <dd className="mt-1 break-all font-medium">{value}</dd>
          </div>
        ))}
      </dl>

      <h2 className="mt-10 text-2xl font-semibold">assets.</h2>
      <img
        src="/og.png"
        width={1200}
        height={630}
        alt="beam. — music, files, time — all in one place."
        className="mt-4 w-full rounded-xl border border-hairline"
        loading="lazy"
      />
      <p className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[14px]">
        <a href="/og.png" download className="underline decoration-hairline underline-offset-2 hover:text-ink">
          og.png (1200×630)
        </a>
        <a href="/mascot.svg" download className="underline decoration-hairline underline-offset-2 hover:text-ink">
          mascot.svg
        </a>
        <a
          href={`${REPO}/raw/main/assets/mascot/beam-mascot.svg`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-hairline underline-offset-2 hover:text-ink"
        >
          source mark
        </a>
      </p>

      <h2 className="mt-10 text-2xl font-semibold">demo and source.</h2>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
        The{' '}
        <a href="/#demo" className="underline decoration-hairline underline-offset-2 hover:text-ink">
          live demo
        </a>{' '}
        runs the real panel with two local audio tracks. The code and the build journal live on{' '}
        <a href={REPO} target="_blank" rel="noopener noreferrer" className="underline decoration-hairline underline-offset-2 hover:text-ink">
          GitHub
        </a>
        . The Windows build is not published yet.
      </p>
    </Subpage>
  );
}
