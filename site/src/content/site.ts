import { CalendarDays, FolderOpen, Music2, Timer } from 'lucide-react';

export const REPO = 'https://github.com/kwakhare5/beam';

export const FEATURES = [
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
    body: 'A countdown that keeps running while the pill is hidden. Pick a preset, or set any length.',
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

export const FAQ = [
  {
    question: 'Does beam need an account?',
    answer: 'No. There is no sign-in, no cloud, and no sync. The app makes no network requests.'
  },
  {
    question: 'What does it store on my PC?',
    answer:
      'Your theme, volume, shortcut, startup choice, and the bar’s position live in %APPDATA%\\Beam\\settings.json. Files on the shelf are paths kept in memory, and they clear when you quit.'
  },
  {
    question: 'Windows says it’s unsafe. What now?',
    answer:
      'When the build ships it will be unsigned, so SmartScreen will warn once. Choose More info, then Run anyway. The full source is on GitHub.'
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
    answer: 'No. The demo runs the app’s panel in this page with two local audio files, and dropped files stay in the browser. The site uses Vercel’s cookie-free analytics; every other request is for the site’s own files.'
  },
  {
    question: 'Can I copy files out of the demo?',
    answer: 'No. A browser cannot write to Explorer, so copy and drag-out wait for the Windows app.'
  }
];