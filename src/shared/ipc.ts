export type ShelfFile = {
  path: string;
  name: string;
  sizeBytes: number;
  kind: 'file' | 'folder';
  missing: boolean;
};

export type AddResult = {
  count: number;
  accepted: number;
  truncated: boolean;
  limit: number;
  files: ShelfFile[];
};

export type CopyResult = { ok: boolean; error?: string };

export type FileChange = { ok: boolean; files: ShelfFile[] };

export type MusicState = {
  title: string;
  artist: string;
  playing: boolean;
  art: string | null;
  positionMs: number;
  durationMs: number;
};

export type HelperState = { ok: boolean };

export type Theme = 'dark' | 'light';

export type SettingsSnapshot = {
  startup: boolean;
  shortcut: string;
  volume: number;
  theme: Theme;
  error?: string;
};

export type SettingsPatch = {
  startup?: boolean;
  shortcut?: string;
  volume?: number;
  theme?: Theme;
};

export type SettingsResult = { ok: boolean; settings: SettingsSnapshot };

export type TimerSnapshot = {
  phase: 'idle' | 'running' | 'done';
  minutes: number;
  remainingMs: number;
  id: number;
  alert: boolean;
};

export const IPC = {
  filesAdd: 'beam:files:add',
  filesPick: 'beam:files:pick',
  filesCopy: 'beam:files:copy',
  filesDrag: 'beam:files:drag',
  filesRemove: 'beam:files:remove',
  filesClear: 'beam:files:clear',
  musicCommand: 'beam:music:command',
  musicSeek: 'beam:music:seek',
  musicState: 'beam:music:state',
  helperState: 'beam:helper:state',
  timerStart: 'beam:timer:start',
  timerCancel: 'beam:timer:cancel',
  timerDismiss: 'beam:timer:dismiss',
  timerState: 'beam:timer:state',
  timerChimed: 'beam:timer:chimed',
  settingsGet: 'beam:settings:get',
  settingsSet: 'beam:settings:set',
  settingsState: 'beam:settings:state',
  settingsResetPosition: 'beam:settings:reset-position',
  panelOpen: 'beam:panel:open',
  panelDismiss: 'beam:panel:dismiss',
  panelRequestOpen: 'beam:panel:request-open',
  panelCollapsed: 'beam:panel:collapsed',
  panelTiming: 'beam:panel:timing',
  pillSize: 'beam:pill:size',
  pillNear: 'beam:pill:near',
  windowDragStart: 'beam:window:drag-start',
  windowDragMove: 'beam:window:drag-move',
  windowDragEnd: 'beam:window:drag-end'
} as const;
