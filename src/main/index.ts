import { app, BrowserWindow } from 'electron';
import { join } from 'node:path';
import { Bridge, type HelperEvent } from './bridge';

type MusicPayload = {
  app: string;
  title: string;
  artist: string;
  album: string;
  artPath: string | null;
  playing: boolean;
  positionMs: number;
  durationMs: number;
};

app.disableHardwareAcceleration();

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  let win: BrowserWindow | null = null;
  const onHelperEvent = (event: HelperEvent): void => {
    if (event.evt !== 'music.changed') return;
    const music = event.payload as MusicPayload | null;
    if (!music) {
      console.log('[music] none');
      return;
    }
    console.log(`[music] ${music.title} - ${music.artist} (${music.app})`);
    console.log(`[music] art ${music.artPath ?? 'none'}`);
  };
  const bridge = new Bridge(
    join(app.getAppPath(), 'native', 'BeamBridge', 'dist', 'BeamBridge.exe'),
    onHelperEvent
  );

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

  let quitting = false;

  app.on('will-quit', (event) => {
    if (quitting) return;
    quitting = true;
    event.preventDefault();
    void bridge.stop().finally(() => app.quit());
  });

  app.on('window-all-closed', () => {
    app.quit();
  });
}
