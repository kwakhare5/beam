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

export type CopyResult = { ok: boolean; count: number; error?: string };

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

export const IPC = {
  filesAdd: 'beam:files:add',
  filesPick: 'beam:files:pick',
  filesCopy: 'beam:files:copy',
  filesDrag: 'beam:files:drag',
  filesRemove: 'beam:files:remove',
  filesClear: 'beam:files:clear',
  musicCommand: 'beam:music:command',
  musicState: 'beam:music:state',
  helperState: 'beam:helper:state',
  panelOpen: 'beam:panel:open',
  panelDismiss: 'beam:panel:dismiss',
  panelRequestOpen: 'beam:panel:request-open',
  panelCollapsed: 'beam:panel:collapsed',
  panelTiming: 'beam:panel:timing',
  pillSize: 'beam:pill:size',
  windowDragStart: 'beam:window:drag-start',
  windowDragMove: 'beam:window:drag-move',
  windowDragEnd: 'beam:window:drag-end'
} as const;
