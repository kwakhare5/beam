import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('beam', {
  dragTestEnabled: (): Promise<boolean> => ipcRenderer.invoke('beam:drag-test:enabled'),
  startDragTest: (): void => ipcRenderer.send('beam:drag-test'),
  openPanel: (): void => ipcRenderer.send('beam:panel:request-open'),
  panelCollapsed: (): void => ipcRenderer.send('beam:panel:collapsed'),
  beginWindowDrag: (x: number, y: number): void => ipcRenderer.send('beam:window:drag-start', x, y),
  moveWindowDrag: (x: number, y: number): void => ipcRenderer.send('beam:window:drag-move', x, y),
  endWindowDrag: (x: number, y: number): void => ipcRenderer.send('beam:window:drag-end', x, y),
  onPanelOpen: (callback: () => void): void => {
    ipcRenderer.on('beam:panel:open', () => callback());
  },
  onPanelDismiss: (callback: () => void): void => {
    ipcRenderer.on('beam:panel:dismiss', () => callback());
  },
  reportPanelTiming: (ms: number, reduced: boolean): void =>
    ipcRenderer.send('beam:panel:timing', ms, reduced)
});
