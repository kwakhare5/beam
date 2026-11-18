import { pageMetadata } from '../../lib/page-meta';
import { Subpage } from '../../components/subpage';

export const metadata = pageMetadata(
  'about',
  'Beam is a free, offline Windows 11 app that puts music controls, a file shelf, a timer, and the month in one small bar above the taskbar.',
  '/about'
);

const FACTS = [
  ['Platform', 'Windows 11'],
  ['Price', 'Free'],
  ['Account', 'Not required'],
  ['Network', 'None in the app'],
  ['License', 'MIT'],
  ['Shortcut', 'Alt + Space (fallback: Ctrl + Shift + Space)'],
  ['Status', 'v0.1.1 published'],
  ['Source', 'GitHub']
];

export default function AboutPage() {
  return (
    <Subpage>
      <p className="text-[15px] text-muted">About</p>
      <h1 className="mt-4 text-[clamp(2.2rem,5.6vw,3.9rem)] font-semibold leading-[1]">a small bar, explained.</h1>

      <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-muted">
        Beam is a free, offline Windows 11 app. It sits above the taskbar as a small bar that hugs its content and keeps
        four things one click away: the current track, a file shelf, a countdown, and the month.
      </p>

      <dl className="mt-10 grid grid-cols-1 gap-x-8 gap-y-4 border-y border-hairline py-6 text-[14px] sm:grid-cols-2">
        {FACTS.map(([term, value]) => (
          <div key={term} className="flex justify-between gap-6 sm:block">
            <dt className="text-muted">{term}</dt>
            <dd className="mt-1 font-medium">{value}</dd>
          </div>
        ))}
      </dl>

      <h2 className="mt-12 text-2xl font-semibold">what it does.</h2>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
        The bar reads the live Windows media session, so play, pause, previous, and next work with any player Windows
        knows about. Dropped files stay as paths on a shelf and can be copied or dragged into Explorer. The timer keeps
        running while the bar is hidden and chimes once at zero. The calendar moves between months and returns to today.
      </p>

      <h2 className="mt-10 text-2xl font-semibold">what it never does.</h2>
      <ul className="mt-4 flex max-w-2xl flex-col gap-2 text-[15px] leading-relaxed text-muted">
        <li>No account, sign-in, cloud, or sync.</li>
        <li>No network requests from the app.</li>
        <li>No copies of your files; the shelf stores paths in memory and clears when you quit.</li>
        <li>No claims beyond Windows 11, the system it is built and tested on.</li>
      </ul>

    </Subpage>
  );
}
