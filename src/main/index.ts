import { app, BrowserWindow } from 'electron';
import { join } from 'node:path';
import { Bridge } from './bridge';

app.disableHardwareAcceleration();

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  let win: BrowserWindow | null = null;
  const bridge = new Bridge(join(app.getAppPath(), 'native', 'BeamBridge', 'dist', 'BeamBridge.exe'));

  function createWindow(): void {
    win = new BrowserWindow({
      width: 144,
      height: 44,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      resizable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      show: false,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });

    win.once('ready-to-show', () => {
      win?.showInactive();
    });

    win.on('closed', () => {
      win = null;
    });

    void win.loadFile(join(__dirname, '../renderer/index.html'));
  }

  app.on('second-instance', () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.showInactive();
  });

  app.whenReady().then(() => {
    bridge.start();
    void bridge
      .ping()
      .then((version) => console.log(`[bridge] pong ${version}`))
      .catch((error: unknown) => console.error('[bridge] ping failed', error));
    createWindow();
  });

  app.on('will-quit', () => {
    bridge.stop();
  });

  app.on('window-all-closed', () => {
    app.quit();
  });
}
