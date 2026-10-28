import { icon } from '../shared/icons';
import type { Tab } from './tab-meta';
import { CONTENT_TABS } from './tab-meta';
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

function tabs(active: Tab): string {
  const buttons = CONTENT_TABS.map((tab) => {
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

export { bindPanelTabs } from './tab-nav';
