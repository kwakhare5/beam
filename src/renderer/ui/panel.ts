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
  calendar: Date;
  settings: SettingsData;
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
      `<button type="button" class="tab" role="tab" id="tab-${tab.id}" aria-controls="panel-${tab.id}"${tab.id === active ? ' aria-selected="true"' : ''}>${icon(tab.icon)}${tab.label}</button>`
  ).join('');

  const settings = `<button type="button" class="tab settings" role="tab" id="tab-settings" aria-controls="panel-settings" aria-label="Settings"${active === 'settings' ? ' aria-selected="true"' : ''}>${icon('sliders')}</button>`;

  return `<div class="tabs" role="tablist" aria-label="Beam panels">${buttons}${settings}</div>`;
}

export function panel(tab: Tab, data: PanelData): string {
  const body =
    tab === 'music'
      ? musicPanel(data.music)
      : tab === 'files'
        ? filesPanel(data.files, data.filesCopied)
        : tab === 'timer'
          ? timerPanel(data.timer)
          : tab === 'calendar'
            ? calendarPanel(data.calendar)
            : settingsPanel(data.settings);

  return `<div class="panel">${tabs(tab)}${body}</div>`;
}
