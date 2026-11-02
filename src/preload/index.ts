import { contextBridge, ipcRenderer, webUtils } from 'electron';

type ShelfFile = {
  path: string;
  name: string;
  sizeBytes: number;
  kind: 'file' | 'folder';
  missing: boolean;
};

type CopyResult = { ok: boolean; count: number; error?: string };

type MusicState = {
  title: string;
  artist: string;
  playing: boolean;
  art: string | null;
  positionMs: number;
  durationMs: number;
};

contextBridge.exposeInMainWorld('beam', {
  getPathForFile: (file: File): string => webUtils.getPathForFile(file),
  addFiles: (paths: string[]): Promise<{ count: number; accepted: number; truncated: boolean; limit: number }> =>
    ipcRenderer.invoke('beam:files:add', paths),
  copyFiles: (paths: string[], source: 'row' | 'all'): Promise<CopyResult> =>
    ipcRenderer.invoke('beam:files:copy', { paths, source }),
  startFileDrag: (paths: string[]): void => ipcRenderer.send('beam:files:drag', paths),
  removeFile: (path: string): Promise<{ ok: boolean; files: ShelfFile[] }> =>
    ipcRenderer.invoke('beam:files:remove', path),
  clearFiles: (): Promise<{ ok: boolean; files: ShelfFile[] }> => ipcRenderer.invoke('beam:files:clear'),
  openPanel: (): void => ipcRenderer.send('beam:panel:request-open'),
  panelCollapsed: (): void => ipcRenderer.send('beam:panel:collapsed'),
  beginWindowDrag: (x: number, y: number): void => ipcRenderer.send('beam:window:drag-start', x, y),
  moveWindowDrag: (x: number, y: number): void => ipcRenderer.send('beam:window:drag-move', x, y),
  endWindowDrag: (x: number, y: number): void => ipcRenderer.send('beam:window:drag-end', x, y),
  onPanelOpen: (callback: (files: ShelfFile[]) => void): void => {
    ipcRenderer.on('beam:panel:open', (_event, files: ShelfFile[]) => callback(files));
  },
  onPanelDismiss: (callback: () => void): void => {
    ipcRenderer.on('beam:panel:dismiss', () => callback());
  },
  onMusicState: (callback: (state: MusicState | null) => void): void => {
    ipcRenderer.on('beam:music:state', (_event, state: MusicState | null) => callback(state));
  },
  reportPanelTiming: (ms: number, reduced: boolean): void =>
    ipcRenderer.send('beam:panel:timing', ms, reduced),
  musicCommand: (cmd: 'toggle' | 'next' | 'prev'): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('beam:music:command', cmd)
});
