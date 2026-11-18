import { pageMetadata } from '../../lib/page-meta';
import { Subpage } from '../../components/subpage';

const REPO = 'https://github.com/kwakhare5/beam';

export const metadata = pageMetadata('changelog', 'What changed in the beam preview, newest first.', '/changelog');

const ENTRIES = [
  {
    date: '2026-11-16',
    title: 'the installed app',
    items: [
      'v0.1.1 ships as a one-click installer: Start Menu and desktop shortcuts, an entry in Windows Apps, and no admin prompt.',
      'First launch opens the panel once, so a new install shows the whole app instead of just the bar.',
      'English-only build cuts about 50 MB of installed size.'
    ]
  },
  {
    date: '2026-11-15',
    title: 'the windows build',
    items: [
      'v0.1.0 shipped as a portable Windows 11 exe.',
      'The bar, panel, music, files, timer, calendar, and settings shipped together.'
    ]
  },
  {
    date: '2026-11-11',
    title: 'the bar, simplified',
    items: [
      'Click the bar to open the panel, and it opens to whatever the bar is showing: music, a running timer, or your files.',
      'When music plays, hovering expands the bar into previous, play, next, and panel at proper 24px targets.',
      'The bar now hugs its content, and the star and label center as one unit; the timer cancel is always visible.'
    ]
  },
  {
    date: '2026-11-04',
    title: 'trust pass',
    items: [
      'Keyboard control: the bar takes focus, Enter or Space opens the panel, and a focus ring shows where you are.',
      'Alt + Space toggles the panel, with Ctrl + Shift + Space as the fallback.',
      'Add files opens the Windows picker, and you can undo a cleared shelf for five seconds.',
      'The bar dims to a quiet star after 10 seconds, and the window only clips to its visible shape.',
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
      'The bar remembers its position.'
    ]
  }
];

export default function ChangelogPage() {
  return (
    <Subpage>
      <h1 className="text-[clamp(2.2rem,5.6vw,3.9rem)] font-semibold leading-[1]">changelog.</h1>

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

      <p className="mt-10 text-[13px] text-muted">
        Every change, with its proof, lives in the{' '}
        <a
          href={`${REPO}/blob/main/JOURNAL.md`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-hairline underline-offset-2 hover:text-ink"
        >
          work journal
        </a>
        .
      </p>
    </Subpage>
  );
}
