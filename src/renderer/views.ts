import mascotDone from '../../assets/mascot/star-done.svg';
import mascotFiles from '../../assets/mascot/star-files.svg';
import mascotIdle from '../../assets/mascot/star-idle.svg';
import mascotMusic from '../../assets/mascot/star-music.svg';
import mascotTimer from '../../assets/mascot/star-timer.svg';

export type IconName =
  | 'play'
  | 'pause'
  | 'prev'
  | 'next'
  | 'music'
  | 'files'
  | 'timer'
  | 'calendar'
  | 'sliders'
  | 'x'
  | 'alert'
  | 'copy'
  | 'trash'
  | 'file'
  | 'folder'
  | 'monitor'
  | 'check'
  | 'plus';

export type MascotName = 'idle' | 'music' | 'files' | 'timer' | 'done';

const MASCOTS: Record<MascotName, string> = {
  idle: mascotIdle,
  music: mascotMusic,
  files: mascotFiles,
  timer: mascotTimer,
  done: mascotDone
};

function esc(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function icon(name: IconName, px?: number): string {
  return `<svg${px ? ` style="width:${px}px;height:${px}px"` : ''}><use href="#i-${name}"/></svg>`;
}

export function iconSprite(): string {
  return `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <symbol id="i-play" viewBox="0 0 24 24"><polygon points="6 3 20 12 6 21" fill="currentColor" stroke="none"/></symbol>
  <symbol id="i-pause" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none"/></symbol>
  <symbol id="i-prev" viewBox="0 0 24 24"><polygon points="19 20 9 12 19 4" fill="currentColor" stroke="none"/><rect x="4" y="5" width="2" height="14" rx="1" fill="currentColor" stroke="none"/></symbol>
  <symbol id="i-next" viewBox="0 0 24 24"><polygon points="5 4 15 12 5 20" fill="currentColor" stroke="none"/><rect x="18" y="5" width="2" height="14" rx="1" fill="currentColor" stroke="none"/></symbol>
  <symbol id="i-music" viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></symbol>
  <symbol id="i-files" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></symbol>
  <symbol id="i-timer" viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/></symbol>
  <symbol id="i-calendar" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></symbol>
  <symbol id="i-sliders" viewBox="0 0 24 24"><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2.4"/><circle cx="15" cy="17" r="2.4"/></symbol>
  <symbol id="i-x" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></symbol>
  <symbol id="i-alert" viewBox="0 0 24 24"><path d="M12 3l9 16H3z"/><path d="M12 9v5"/><circle cx="12" cy="17" r=".8" fill="currentColor" stroke="none"/></symbol>
  <symbol id="i-copy" viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></symbol>
  <symbol id="i-trash" viewBox="0 0 24 24"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/></symbol>
  <symbol id="i-file" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></symbol>
  <symbol id="i-folder" viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></symbol>
  <symbol id="i-monitor" viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></symbol>
  <symbol id="i-check" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></symbol>
  <symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol>
</svg>`;
}

export type PillSize = 'idle' | 'hover';

export type PillState = 'idle' | 'hover' | 'playing' | 'paused' | 'timer' | 'done' | 'files' | 'drag';

export interface PillData {
  size: PillSize;
  state: PillState;
  title: string;
  artist: string;
  mascot?: MascotName;
  mascotIcon?: IconName;
  mascotOpacity?: number;
  controls?: boolean;
  primaryIcon?: 'play' | 'pause';
  primaryFocus?: boolean;
  mutedTitle?: boolean;
  dangerArtist?: boolean;
  digits?: string;
  badge?: string;
  badgeTone?: 'accent' | 'warn';
}

export function pill(data: PillData): string {
  const mascot = data.mascot
    ? `<img class="mascot" src="${MASCOTS[data.mascot]}" alt=""${data.mascotOpacity !== undefined ? ` style="opacity:${data.mascotOpacity}"` : ''} />`
    : data.mascotIcon
      ? `<svg class="mascot"><use href="#i-${data.mascotIcon}"/></svg>`
      : '';

  const title = `<div class="title"${data.mutedTitle ? ' style="color:var(--muted)"' : ''}>${esc(data.title)}</div>`;
  const artist = `<div class="artist"${data.dangerArtist ? ' style="color:var(--danger)"' : ''}>${esc(data.artist)}</div>`;

  const controls = data.controls
    ? `<div class="controls">
      <button class="icon-btn">${icon('prev')}</button>
      <button class="icon-btn primary"${data.primaryFocus ? ' style="outline:2px solid var(--accent); outline-offset:2px"' : ''}>${icon(data.primaryIcon ?? 'play')}</button>
      <button class="icon-btn">${icon('next')}</button>
    </div>`
    : '';

  const digits = data.digits ? `<div class="digits accent">${esc(data.digits)}</div>` : '';
  const badge = data.badge
    ? `<span class="badge${data.badgeTone ? ` ${data.badgeTone}` : ''}">${esc(data.badge)}</span>`
    : '';

  return `<div class="pill" data-size="${data.size}" data-state="${data.state}">${mascot}<div class="meta">${title}${artist}</div>${controls}${digits}${badge}</div>`;
}

export type Tab = 'music' | 'files' | 'timer' | 'calendar' | 'settings';

export interface FileRow {
  name: string;
  size: string;
  kind?: 'file' | 'folder';
  missing?: boolean;
}

export interface PanelData {
  music: { title: string; subtitle: string };
  files: FileRow[];
  timer: { digits: string; note: string; preset: '5' | '10' | '25' | 'custom' };
  calendar: Date;
  settings: { startup: boolean; shortcut: string; volume: string; theme: string };
}

const TABS: ReadonlyArray<{ id: Exclude<Tab, 'settings'>; label: string; icon: IconName }> = [
  { id: 'music', label: 'Music', icon: 'music' },
  { id: 'files', label: 'Files', icon: 'files' },
  { id: 'timer', label: 'Timer', icon: 'timer' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar' }
];

function tabs(active: Tab): string {
  const buttons = TABS.map(
    (tab) =>
      `<button class="tab"${tab.id === active ? ' aria-selected="true"' : ''}>${icon(tab.icon)}${tab.label}</button>`
  ).join('');
  return `<div class="tabs">${buttons}<button class="tab settings"${active === 'settings' ? ' aria-selected="true"' : ''}>${icon('sliders')}</button></div>`;
}

function musicPanel(data: PanelData['music']): string {
  return `<div class="panel-body">
    <div class="art"></div>
    <div><div class="panel-title">${esc(data.title)}</div><div class="panel-sub">${esc(data.subtitle)}</div></div>
    <div class="controls" style="opacity:1; justify-content:center; gap:22px; margin-top:auto">
      <button class="icon-btn">${icon('prev')}</button>
      <button class="icon-btn primary">${icon('play', 24)}</button>
      <button class="icon-btn">${icon('next')}</button>
    </div>
    <div class="panel-sub" style="text-align:center">No seek bar in v1</div>
  </div>`;
}

function filesPanel(rows: FileRow[]): string {
  const list = rows
    .map((row) => {
      const rowIcon: IconName = row.missing ? 'alert' : row.kind === 'folder' ? 'folder' : 'file';
      return `<div class="row${row.missing ? ' missing' : ''}">${icon(rowIcon)}<span class="name">${esc(row.name)}</span><span class="size">${esc(row.size)}</span></div>`;
    })
    .join('');
  return `<div class="panel-body">
    ${list}
    <div class="actions">
      <button class="btn primary">${icon('copy')}Copy All</button>
      <button class="btn ghost">${icon('plus')}Add</button>
      <button class="btn danger">${icon('trash')}Clear</button>
    </div>
  </div>`;
}

const PRESETS: ReadonlyArray<{ id: PanelData['timer']['preset']; label: string }> = [
  { id: '5', label: '5 min' },
  { id: '10', label: '10 min' },
  { id: '25', label: '25 min' },
  { id: 'custom', label: 'Custom' }
];

function timerPanel(data: PanelData['timer']): string {
  const presets = PRESETS.map(
    (preset) => `<button class="btn${preset.id === data.preset ? '' : ' ghost'}">${preset.label}</button>`
  ).join('');
  return `<div class="panel-body">
    <div class="presets">${presets}</div>
    <div class="timer-face">
      <div class="digits accent">${esc(data.digits)}</div>
      <div class="panel-sub">${esc(data.note)}</div>
    </div>
    <div class="actions" style="justify-content:center">
      <button class="btn primary">${icon('play')}Start</button>
      <button class="btn ghost">Cancel</button>
    </div>
  </div>`;
}

function calendarPanel(now: Date): string {
  const year = now.getFullYear();
  const month = now.getMonth();
  const start = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const cells: string[] = [];

  for (let i = start - 1; i >= 0; i--) {
    cells.push(`<div class="cal-cell other">${prevDays - i}</div>`);
  }
  for (let day = 1; day <= days; day++) {
    cells.push(`<div class="cal-cell${day === now.getDate() ? ' today' : ''}">${day}</div>`);
  }
  let next = 1;
  while (cells.length % 7 !== 0) {
    cells.push(`<div class="cal-cell other">${next++}</div>`);
  }

  const title = now.toLocaleString(undefined, { month: 'long', year: 'numeric' });
  const dows = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day) => `<div class="cal-dow">${day}</div>`).join('');

  return `<div class="panel-body">
    <div class="cal-head"><span>${esc(title)}</span><span class="panel-sub">local time</span></div>
    <div class="cal-grid">${dows}${cells.join('')}</div>
  </div>`;
}

function settingsPanel(data: PanelData['settings']): string {
  return `<div class="panel-body">
    <div class="setting"><div>Start with Windows<span class="hint">launches the pill at login</span></div><div class="switch${data.startup ? ' on' : ''}"></div></div>
    <div class="setting"><div>Toggle shortcut<span class="hint">click to rebind</span></div><span class="kbd">${esc(data.shortcut)}</span></div>
    <div class="setting"><div>Chime volume<span class="hint">plays once when the timer ends</span></div><span class="kbd">${esc(data.volume)}</span></div>
    <div class="setting"><div>Theme<span class="hint">light or dark, remembered</span></div><span class="kbd">${esc(data.theme)}</span></div>
    <div class="setting"><div>Reset position<span class="hint">back to the taskbar anchor</span></div><button class="btn ghost">Reset</button></div>
  </div>`;
}

export function panel(tab: Tab, data: PanelData): string {
  const body =
    tab === 'music'
      ? musicPanel(data.music)
      : tab === 'files'
        ? filesPanel(data.files)
        : tab === 'timer'
          ? timerPanel(data.timer)
          : tab === 'calendar'
            ? calendarPanel(data.calendar)
            : settingsPanel(data.settings);

  return `<div class="panel">${tabs(tab)}${body}</div>`;
}
