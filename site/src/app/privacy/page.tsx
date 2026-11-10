import { pageMetadata } from '../../lib/page-meta';
import { Subpage } from '../../components/subpage';
import { REPO } from '../../content/site';

export const metadata = pageMetadata(
  'privacy',
  'What Beam stores, what this website collects, and what never leaves your PC.',
  '/privacy'
);

export default function PrivacyPage() {
  return (
    <Subpage>
      <p className="text-[15px] text-muted">Privacy</p>
      <h1 className="mt-4 text-[clamp(2.2rem,5.6vw,3.9rem)] font-semibold leading-[1]">privacy.</h1>
      <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-muted">
        Beam has no accounts, no cloud, and no advertising. This page explains exactly what is stored and what is not.
      </p>
      <p className="mt-4 text-[13px] text-muted">Last updated: 2026-11-11</p>

      <h2 className="mt-12 text-2xl font-semibold">the app.</h2>
      <ul className="mt-4 flex max-w-2xl flex-col gap-2 text-[15px] leading-relaxed text-muted">
        <li>The app makes no network requests. There is no account, sign-in, sync, or telemetry.</li>
        <li>Theme, volume, shortcut, startup choice, and the bar position are saved locally in %APPDATA%\Beam\settings.json.</li>
        <li>Files on the shelf stay as paths in memory. Beam never copies them, and the shelf clears when you quit.</li>
        <li>The clipboard changes only when you press copy, and the timer stores its deadline in memory while the app runs.</li>
      </ul>

      <h2 className="mt-10 text-2xl font-semibold">this website.</h2>
      <ul className="mt-4 flex max-w-2xl flex-col gap-2 text-[15px] leading-relaxed text-muted">
        <li>The site is a static build hosted by Vercel. Vercel processes standard request logs to serve and protect it.</li>
        <li>
          The site uses Vercel Web Analytics, which counts page views in aggregate without cookies or a persistent
          identifier. There are no ads and no advertising profiles.
        </li>
        <li>The demo plays two local audio files. Files you drop in the demo stay in your browser and are never uploaded.</li>
        <li>Links to GitHub and other sites open those sites, which have their own privacy policies.</li>
      </ul>

      <h2 className="mt-10 text-2xl font-semibold">questions.</h2>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
        Open an issue on{' '}
        <a href={`${REPO}/issues`} target="_blank" rel="noopener noreferrer" className="underline decoration-hairline underline-offset-2 hover:text-ink">
          GitHub
        </a>{' '}
        and ask.
      </p>
    </Subpage>
  );
}
