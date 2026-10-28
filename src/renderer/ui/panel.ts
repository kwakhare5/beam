import { icon, type IconName } from './icons';
import type { Tab } from './types';
import { calendarPanel } from './tabs/calendar';
import { filesPanel, type FileRow } from './tabs/files';
import { musicPanel, type MusicData } from './tabs/music';
import { settingsPanel, type SettingsData } from './tabs/settings';
import { timerPanel, type TimerData } from './tabs/timer';

export interface PanelData {
  music: MusicData;
  files: FileRow[];
  filesCopied?: boolean;
  timer: TimerData;
  calendar: Date | { view: Date; today?: Date };
  settings: SettingsData;
}

const TABS: ReadonlyArray<{ id: Exclude<Tab, 'settings'>; label: string; icon: IconName }> = [
  { id: 'music', label: 'Music', icon: 'music' },
  { id: 'files', label: 'Files', icon: 'files' },
  { id: 'timer', label: 'Timer', icon: 'timer' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar' }
];

function tabs(active: Tab): string {
  const buttons = TABS.map((tab) => {
    const selected = tab.id === active;
    return `<button type="button" class="tab" role="tab" id="tab-${tab.id}" aria-controls="panel-${tab.id}" aria-selected="${selected}" tabindex="${selected ? 0 : -1}">${icon(tab.icon)}<span class="tab-label">${tab.label}</span></button>`;
  }).join('');

  const settings = `<button type="button" class="tab settings" role="tab" id="tab-settings" aria-controls="panel-settings" aria-label="Settings" aria-selected="${active === 'settings'}" tabindex="${active === 'settings' ? 0 : -1}">${icon('sliders')}</button>`;

  return `<div class="tabs" role="tablist" aria-label="Beam panels"><div class="tab-track" role="presentation">${buttons}</div>${settings}</div>`;
}

export function panel(tab: Tab, data: PanelData): string {
  const today = data.calendar instanceof Date ? data.calendar : data.calendar.today ?? new Date();
  const view = data.calendar instanceof Date ? data.calendar : data.calendar.view;

  const bodies =
    musicPanel(data.music, tab === 'music') +
    filesPanel(data.files, data.filesCopied, tab === 'files') +
    timerPanel(data.timer, tab === 'timer') +
    calendarPanel(today, tab === 'calendar', view) +
    settingsPanel(data.settings, tab === 'settings');

  return `<div class="panel">${tabs(tab)}${bodies}</div>`;
}

function activateTab(tab: HTMLElement): void {
  const panelEl = tab.closest('.panel');
  if (!panelEl) return;
  const id = tab.id.replace('tab-', '');
  for (const item of panelEl.querySelectorAll<HTMLElement>('[role="tab"]')) {
    const selected = item === tab;
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
  }
  for (const body of panelEl.querySelectorAll<HTMLElement>('[role="tabpanel"]')) {
    body.hidden = body.id !== `panel-${id}`;
  }
}

export function bindPanelTabs(root: Document | Element): void {
  root.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const tab = target.closest<HTMLElement>('[role="tab"]');
    if (tab) activateTab(tab);
  });

  root.addEventListener('keydown', (event) => {
    const key = (event as KeyboardEvent).key;
    if (key !== 'ArrowRight' && key !== 'ArrowLeft' && key !== 'Home' && key !== 'End') return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const tab = target.closest<HTMLElement>('[role="tab"]');
    if (!tab) return;
    const panelEl = tab.closest('.panel');
    if (!panelEl) return;
    const all = [...panelEl.querySelectorAll<HTMLElement>('[role="tab"]')];
    const index = all.indexOf(tab);
    if (index === -1) return;
    event.preventDefault();
    const next =
      key === 'Home'
        ? 0
        : key === 'End'
          ? all.length - 1
          : key === 'ArrowRight'
            ? (index + 1) % all.length
            : (index - 1 + all.length) % all.length;
    const nextTab = all[next];
    if (!nextTab) return;
    nextTab.focus();
    activateTab(nextTab);
  });
}
