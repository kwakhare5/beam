import { app, BrowserWindow, ipcMain, nativeImage, screen } from 'electron';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Bridge, type HelperEvent } from './bridge';
import { createTray } from './tray';

const WINDOW_WIDTH = 136;
const WINDOW_HEIGHT = 42;
const PILL_HEIGHT = 30;
const PANEL_WIDTH = 452;
const PANEL_HEIGHT = 316;
const PILL_GAP = 12;

function placeWindow(window: BrowserWindow, resize: boolean): void {
  if (resize) window.setContentSize(WINDOW_WIDTH, WINDOW_HEIGHT);
  const { workArea } = screen.getPrimaryDisplay();
  const bounds = window.getBounds();
  const content = window.getContentBounds();
  // anchor against the content rect: Windows pads the frame height at non-100% scale
  const dx = Math.round(workArea.x + workArea.width / 2 - (content.x + content.width / 2));
  const dy = Math.round(
    workArea.y + workArea.height - PILL_GAP - (content.y + (content.height + PILL_HEIGHT) / 2)
  );
  window.setPosition(bounds.x + dx, bounds.y + dy);
  const placed = window.getBounds();
  const inner = window.getContentBounds();
  console.log(
    `[window] bounds=${placed.x},${placed.y},${placed.width},${placed.height}` +
      ` content=${inner.x},${inner.y},${inner.width},${inner.height}` +
      ` work=${workArea.x},${workArea.y},${workArea.width},${workArea.height}`
  );
}
function anchorBounds(): Electron.Rectangle {
  const { workArea } = screen.getPrimaryDisplay();
  const inset = (WINDOW_HEIGHT - PILL_HEIGHT) / 2;
  return {
    x: Math.round(workArea.x + (workArea.width - WINDOW_WIDTH) / 2),
    y: workArea.y + workArea.height - PILL_GAP - PILL_HEIGHT - inset,
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT
  };
}

function panelBounds(window: BrowserWindow): Electron.Rectangle {
  const { workArea } = screen.getPrimaryDisplay();
  const pill = window.getBounds();
  const center = pill.x + pill.width / 2;
  const x = Math.round(
    Math.min(
      Math.max(center - PANEL_WIDTH / 2, workArea.x + 8),
      workArea.x + workArea.width - PANEL_WIDTH - 8
    )
  );
  const lowerHalf = pill.y + pill.height / 2 > workArea.y + workArea.height / 2;
  const rawY = lowerHalf ? pill.y + pill.height - PANEL_HEIGHT : pill.y;
  const y = Math.round(
    Math.min(Math.max(rawY, workArea.y + 8), workArea.y + workArea.height - PANEL_HEIGHT - 8)
  );
  return { x, y, width: PANEL_WIDTH, height: PANEL_HEIGHT };
}

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
  let tray: ReturnType<typeof createTray> | null = null;
  let panelOpen = false;
  const panelTest = process.env.BEAM_PANEL_TEST === '1';
  const dragTest = process.env.BEAM_DRAG_TEST === '1';
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
      ...anchorBounds(),
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
      if (!win) return;
      const target = win;
      target.showInactive();
      placeWindow(target, true);
      setTimeout(() => {
        if (!target.isDestroyed()) placeWindow(target, false);
      }, 500);
    });

    win.on('blur', () => {
      if (panelOpen && win && !win.isDestroyed()) {
        panelOpen = false;
        win.webContents.send('beam:panel:dismiss');
      }
    });

    win.on('closed', () => {
      win = null;
    });

    win.webContents.on('will-navigate', (event) => {
      event.preventDefault();
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

    ipcMain.handle('beam:drag-test:enabled', () => dragTest);
    if (dragTest) {
      ipcMain.on('beam:drag-test', (event) => {
        const dir = join(tmpdir(), 'beam-dragtest');
        mkdirSync(dir, { recursive: true });
        const paths = ['one.txt', 'two.txt', 'three.txt'].map((name) => join(dir, name));
        for (const path of paths) writeFileSync(path, 'beam\n');
        console.log(`[drag] start ${paths.length} files`);
        event.sender.startDrag({ file: paths[0], files: paths, icon: nativeImage.createEmpty() });
      });
    }

    createWindow();
    if (win) {
      const window = win;
      const openPanel = (): void => {
        if (panelOpen || window.isDestroyed()) return;
        panelOpen = true;
        const bounds = panelBounds(window);
        window.setBounds(bounds);
        console.log(`[panel] bounds=${bounds.x},${bounds.y},${bounds.width},${bounds.height}`);
        window.focus();
        window.webContents.send('beam:panel:open');
      };
      const closePanel = (): void => {
        if (!panelOpen || window.isDestroyed()) return;
        panelOpen = false;
        window.webContents.send('beam:panel:dismiss');
      };
      tray = createTray(
        () => {},
        () => {
          if (!window.isDestroyed()) placeWindow(window, true);
        },
        () => (panelOpen ? closePanel() : openPanel())
      );
      console.log('[tray] ready');

      ipcMain.on('beam:panel:request-open', openPanel);
      ipcMain.on('beam:panel:collapsed', () => {
        if (!window.isDestroyed()) placeWindow(window, true);
      });
      ipcMain.on('beam:panel:timing', (_event, ms: number, reduced: boolean) => {
        console.log(`[panel] open ${ms}ms reduced=${reduced}`);
      });
      if (panelTest) {
        setTimeout(() => {
          openPanel();
          console.log('[panel] test-open');
        }, 8000);
        setTimeout(() => {
          closePanel();
          console.log('[panel] test-dismiss');
        }, 9600);
      }
    }
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
