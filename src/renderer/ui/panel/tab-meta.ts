import type { IconName } from '../shared/icons';

export type Tab = 'music' | 'files' | 'timer' | 'calendar' | 'settings';

interface ContentTab {
  id: Exclude<Tab, 'settings'>;
  label: string;
  icon: IconName;
}

export const CONTENT_TABS: ReadonlyArray<ContentTab> = [
  { id: 'music', label: 'Music', icon: 'music' },
  { id: 'files', label: 'Files', icon: 'files' },
  { id: 'timer', label: 'Timer', icon: 'timer' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar' }
];
