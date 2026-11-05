import { app } from 'electron';
import { join } from 'node:path';

export const helperPath = (): string =>
  app.isPackaged
    ? join(process.resourcesPath, 'BeamBridge.exe')
    : join(app.getAppPath(), 'native', 'BeamBridge', 'dist', 'BeamBridge.exe');

export const trayIconPath = (): string =>
  app.isPackaged ? join(process.resourcesPath, 'tray.ico') : join(app.getAppPath(), 'assets', 'tray.ico');
