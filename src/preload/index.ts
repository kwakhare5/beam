import { contextBridge, ipcRenderer, webUtils } from 'electron';
import { IPC, type AddResult, type CopyResult, type FileChange, type HelperState, type MusicState, type ShelfFile } from '../shared/ipc';

contextBridge.exposeInMainWorld('beam', {
  getPathForFile: (file: File): string => webUtils.getPathForFile(file),
  addFiles: (paths: string[]): Promise<AddResult> => ipcRenderer.invoke(IPC.filesAdd, paths),
  pickFiles: (): Promise<AddResult | null> => ipcRenderer.invoke(IPC.filesPick),
  copyFiles: (paths: string[], source: 'row' | 'all'): Promise<CopyResult> =>
    ipcRenderer.invoke(IPC.filesCopy, { paths, source }),
  startFileDrag: (paths: string[]): void => ipcRenderer.send(IPC.filesDrag, paths),
  removeFile: (path: string): Promise<FileChange> => ipcRenderer.invoke(IPC.filesRemove, path),
  clearFiles: (): Promise<FileChange> => ipcRenderer.invoke(IPC.filesClear),
  openPanel: (): void => ipcRenderer.send(IPC.panelRequestOpen),
  panelCollapsed: (): void => ipcRenderer.send(IPC.panelCollapsed),
  setPillSize: (width: number, height: number): void => ipcRenderer.send(IPC.pillSize, width, height),
  beginWindowDrag: (x: number, y: number): void => ipcRenderer.send(IPC.windowDragStart, x, y),
  moveWindowDrag: (x: number, y: number): void => ipcRenderer.send(IPC.windowDragMove, x, y),
  endWindowDrag: (x: number, y: number): void => ipcRenderer.send(IPC.windowDragEnd, x, y),
  onPanelOpen: (callback: (files: ShelfFile[]) => void): void => {
    ipcRenderer.on(IPC.panelOpen, (_event, files: ShelfFile[]) => callback(files));
  },
  onPanelDismiss: (callback: () => void): void => {
    ipcRenderer.on(IPC.panelDismiss, () => callback());
  },
  onMusicState: (callback: (state: MusicState | null) => void): void => {
    ipcRenderer.on(IPC.musicState, (_event, state: MusicState | null) => callback(state));
  },
  onHelperState: (callback: (state: HelperState) => void): void => {
    ipcRenderer.on(IPC.helperState, (_event, state: HelperState) => callback(state));
  },
  reportPanelTiming: (ms: number, reduced: boolean): void => ipcRenderer.send(IPC.panelTiming, ms, reduced),
  musicCommand: (cmd: 'toggle' | 'next' | 'prev'): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke(IPC.musicCommand, cmd)
});
