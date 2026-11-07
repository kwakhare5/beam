import type { Tab } from '../ui/panel/tab-meta';

export type LastUsed = Extract<Tab, 'music' | 'files' | 'timer' | 'calendar'>;

export const ENABLED_TABS: ReadonlyArray<Tab> = ['music', 'files', 'timer', 'calendar', 'settings'];

export function pickTab(lastUsed: LastUsed | null, hasMusic: boolean, rows: number): Tab {
  if (lastUsed && ENABLED_TABS.includes(lastUsed)) return lastUsed;
  return hasMusic ? 'music' : rows > 0 ? 'files' : 'music';
}
