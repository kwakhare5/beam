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
  calendar: { view: Date; today: Date };
  settings: SettingsData;
  enabledTabs?: ReadonlyArray<Tab>;
}

const ALL_TABS: ReadonlyArray<Tab> = ['music', 'files', 'timer', 'calendar', 'settings'];

function tabs(active: Tab, enabled: ReadonlyArray<Tab>): string {
  const buttons = CONTENT_TABS.filter((tab) => enabled.includes(tab.id))
    .map((tab) => {
      const selected = tab.id === active;
      return `<button type="button" class="tab" role="tab" id="tab-${tab.id}" aria-controls="panel-${tab.id}" aria-selected="${selected}" tabindex="${selected ? 0 : -1}">${icon(tab.icon)}<span class="tab-label">${tab.label}</span></button>`;
    })
    .join('');
  const settings = enabled.includes('settings')
    ? `<button type="button" class="tab tab-settings" role="tab" id="tab-settings" aria-controls="panel-settings" aria-label="Settings" title="Settings" aria-selected="${active === 'settings'}" tabindex="${active === 'settings' ? 0 : -1}">${icon('sliders')}</button>`
    : '';

  return `<div class="tabs" role="tablist" aria-label="Beam panels"><div class="tab-track">${buttons}</div>${settings}</div>`;
}

export function panel(tab: Tab, data: PanelData): string {
  const enabled = data.enabledTabs ?? ALL_TABS;
  const active = enabled.includes(tab) ? tab : enabled[0] ?? 'music';
  const { view, today } = data.calendar;

  const bodies = [
    enabled.includes('music') ? musicPanel(data.music, active === 'music') : '',
    enabled.includes('files') ? filesPanel(data.files, data.filesCopied, active === 'files') : '',
    enabled.includes('timer') ? timerPanel(data.timer, active === 'timer') : '',
    enabled.includes('calendar') ? calendarPanel(today, active === 'calendar', view) : '',
    enabled.includes('settings') ? settingsPanel(data.settings, active === 'settings') : ''
  ].join('');

  return `<div class="panel" tabindex="-1">${tabs(active, enabled)}${bodies}</div>`;
}

export { bindPanelTabs } from './tab-nav';
