import { app, BrowserWindow, ipcMain, nativeImage, screen } from 'electron';
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { Bridge, type HelperEvent } from './bridge';
import { getSettingsPath, loadSettings, saveSettings, type BeamSettings, type SavedPosition } from './settings';
import { createTray } from './tray';

const WINDOW_WIDTH = 136;
const WINDOW_HEIGHT = 42;
const PILL_HEIGHT = 30;
const PANEL_WIDTH = 452;
const PANEL_HEIGHT = 316;
const PILL_GAP = 12;
const MAX_SHELF = 50;

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

function clampToWorkArea(bounds: Electron.Rectangle, workArea: Electron.Rectangle): Electron.Rectangle {
  return {
    x: Math.round(Math.min(Math.max(bounds.x, workArea.x), workArea.x + workArea.width - bounds.width)),
    y: Math.round(Math.min(Math.max(bounds.y, workArea.y), workArea.y + workArea.height - bounds.height)),
    width: bounds.width,
    height: bounds.height
  };
}

function savedPillBounds(saved: SavedPosition | null): Electron.Rectangle | null {
  if (!saved) return null;
  const bounds = { x: saved.x, y: saved.y, width: WINDOW_WIDTH, height: WINDOW_HEIGHT };
  const display = screen.getAllDisplays().find(({ workArea }) => {
    return (
      bounds.x + bounds.width > workArea.x &&
      bounds.x < workArea.x + workArea.width &&
      bounds.y + bounds.height > workArea.y &&
      bounds.y < workArea.y + workArea.height
    );
  });
  if (!display) {
    console.log('[settings] saved monitor is gone; anchoring on the primary display');
    return null;
  }
  return clampToWorkArea(bounds, display.workArea);
}

function panelBounds(window: BrowserWindow): Electron.Rectangle {
  const { workArea } = screen.getDisplayMatching(window.getBounds());
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

type ShelfRow = {
  path: string;
  name: string;
  sizeBytes: number;
  kind: 'file' | 'folder';
  missing: boolean;
};

type CopyResult = { ok: boolean; count: number; error?: string };

function readPoint(x: unknown, y: unknown): { x: number; y: number } | null {
  if (typeof x !== 'number' || !Number.isFinite(x)) return null;
  if (typeof y !== 'number' || !Number.isFinite(y)) return null;
  return { x, y };
}

app.disableHardwareAcceleration();

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  let win: BrowserWindow | null = null;
  let tray: ReturnType<typeof createTray> | null = null;
  let panelOpen = false;
  let hiddenByFullscreen = false;
  let fullscreenActive = false;
  let shelf: string[] = [];
  const shelfRows = (): ShelfRow[] =>
    shelf.map((path) => {
      try {
        const stats = statSync(path);
        return {
          path,
          name: basename(path),
          sizeBytes: stats.size,
          kind: stats.isDirectory() ? ('folder' as const) : ('file' as const),
          missing: false
        };
      } catch {
        return { path, name: basename(path), sizeBytes: 0, kind: 'file' as const, missing: true };
      }
    });
  let settings: BeamSettings = { version: 1, position: null };
  let pillPosition: Electron.Rectangle = {
    x: 0,
    y: 0,
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT
  };
  let windowDrag: { pointerX: number; pointerY: number; bounds: Electron.Rectangle } | null = null;
  const panelTest = process.env.BEAM_PANEL_TEST === '1';
  const resetTest = process.env.BEAM_RESET_TEST === '1';
  const idleTest = process.env.BEAM_IDLE_TEST === '1';
  const dragTest = process.env.BEAM_DRAG_TEST === '1';
  const fullscreenTest = process.env.BEAM_FULLSCREEN_TEST === '1';
  const dropTest = process.env.BEAM_DROP_TEST === '1';
  const copyTest = process.env.BEAM_COPY_TEST === '1';
  let onFullscreen: (active: boolean) => void = () => {};
  const onHelperEvent = (event: HelperEvent): void => {
    if (event.evt === 'fullscreen.changed') {
      const payload = event.payload as { active?: unknown } | null;
      fullscreenActive = payload?.active === true;
      onFullscreen(fullscreenActive);
      return;
    }
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

  function createWindow(restored: boolean): void {
    win = new BrowserWindow({
      ...pillPosition,
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
      if (!hiddenByFullscreen) target.showInactive();
      if (restored) {
        target.setBounds(pillPosition);
        console.log(
          `[window] restored=${pillPosition.x},${pillPosition.y},${pillPosition.width},${pillPosition.height}`
        );
        setTimeout(() => {
          if (!target.isDestroyed()) target.setBounds(pillPosition);
        }, 500);
      } else {
        placeWindow(target, true);
        pillPosition = target.getBounds();
        setTimeout(() => {
          if (target.isDestroyed()) return;
          placeWindow(target, false);
          pillPosition = target.getBounds();
        }, 500);
      }
      if (idleTest) {
        setTimeout(() => {
          if (target.isDestroyed()) return;
          void target.webContents
            .executeJavaScript(
              `(() => {
                const pill = document.querySelector('.pill');
                const mark = pill?.querySelector('.mascot');
                const title = pill?.querySelector('.title');
                if (!pill || !mark) return null;
                return {
                  state: pill.dataset.state,
                  markOpacity: getComputedStyle(mark).opacity,
                  shellOpacity: getComputedStyle(pill).opacity,
                  label: title?.textContent ?? null,
                  markMaster: (mark.getAttribute('src') ?? '').startsWith('data:image/svg+xml')
                };
              })()`
            )
            .then((probe: unknown) => console.log(`[idle] ${JSON.stringify(probe)}`))
            .catch((error: unknown) => console.error('[idle] probe failed', error));
        }, 800);
      }
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
    hiddenByFullscreen = false;
    win.showInactive();
  });

  app.whenReady().then(() => {
    settings = loadSettings();
    console.log(`[settings] path=${getSettingsPath()}`);
    const restoredBounds = savedPillBounds(settings.position);
    pillPosition = restoredBounds ?? anchorBounds();

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

    createWindow(restoredBounds !== null);
    if (win) {
      const window = win;
      const openPanel = (): void => {
        if (panelOpen || window.isDestroyed() || !window.isVisible()) return;
        panelOpen = true;
        const bounds = panelBounds(window);
        window.setBounds(bounds);
        console.log(`[panel] bounds=${bounds.x},${bounds.y},${bounds.width},${bounds.height}`);
        window.focus();
        window.webContents.send('beam:panel:open', shelfRows());
      };
      const closePanel = (): void => {
        if (!panelOpen || window.isDestroyed()) return;
        panelOpen = false;
        window.webContents.send('beam:panel:dismiss');
      };
      const showPill = (source: string): void => {
        if (window.isDestroyed()) return;
        hiddenByFullscreen = false;
        panelOpen = false;
        window.showInactive();
        console.log(`[fullscreen] shown (${source})`);
      };
      const hidePill = (): void => {
        if (window.isDestroyed()) return;
        windowDrag = null;
        if (panelOpen) {
          panelOpen = false;
          window.webContents.send('beam:panel:dismiss');
        }
        window.setBounds(pillPosition);
        hiddenByFullscreen = true;
        window.hide();
        console.log('[fullscreen] hidden');
      };
      const trayToggle = (): void => {
        if (window.isDestroyed()) return;
        if (!window.isVisible()) {
          showPill('tray');
          return;
        }
        if (panelOpen) closePanel();
        else openPanel();
      };
      onFullscreen = (active: boolean): void => {
        if (window.isDestroyed()) return;
        if (active) {
          if (!window.isVisible()) return;
          hidePill();
          if (fullscreenTest) setTimeout(() => trayToggle(), 1500);
          return;
        }
        if (hiddenByFullscreen) showPill('fullscreen exit');
      };
      if (fullscreenActive) onFullscreen(true);
      const startDrag = (x: number, y: number): void => {
        if (panelOpen || window.isDestroyed()) return;
        windowDrag = { pointerX: x, pointerY: y, bounds: window.getBounds() };
      };
      const moveDrag = (x: number, y: number): void => {
        if (!windowDrag || window.isDestroyed()) return;
        window.setBounds({
          x: Math.round(windowDrag.bounds.x + x - windowDrag.pointerX),
          y: Math.round(windowDrag.bounds.y + y - windowDrag.pointerY),
          width: windowDrag.bounds.width,
          height: windowDrag.bounds.height
        });
      };
      const endDrag = (x: number, y: number): void => {
        if (!windowDrag || window.isDestroyed()) return;
        moveDrag(x, y);
        const size = windowDrag.bounds;
        const current = window.getBounds();
        const display = screen.getDisplayMatching(current);
        const settled = clampToWorkArea(
          { x: current.x, y: current.y, width: size.width, height: size.height },
          display.workArea
        );
        window.setBounds(settled);
        pillPosition = settled;
        settings.position = { x: settled.x, y: settled.y, displayId: display.id };
        saveSettings(settings);
        console.log(
          `[move] end=${settled.x},${settled.y},${settled.width},${settled.height} display=${display.id}`
        );
        windowDrag = null;
      };
      const resetPosition = (): void => {
        windowDrag = null;
        settings.position = null;
        saveSettings(settings);
        pillPosition = anchorBounds();
        console.log(
          `[move] reset=${pillPosition.x},${pillPosition.y},${pillPosition.width},${pillPosition.height}`
        );
        if (panelOpen) closePanel();
        else if (!window.isDestroyed()) window.setBounds(pillPosition);
      };

      tray = createTray(
        () => {},
        () => resetPosition(),
        () => trayToggle()
      );
      console.log('[tray] ready');

      ipcMain.on('beam:window:drag-start', (event, x: unknown, y: unknown) => {
        const point = readPoint(x, y);
        if (event.sender !== window.webContents || !point) return;
        startDrag(point.x, point.y);
      });
      ipcMain.on('beam:window:drag-move', (event, x: unknown, y: unknown) => {
        const point = readPoint(x, y);
        if (event.sender !== window.webContents || !point) return;
        moveDrag(point.x, point.y);
      });
      ipcMain.on('beam:window:drag-end', (event, x: unknown, y: unknown) => {
        const point = readPoint(x, y);
        if (event.sender !== window.webContents || !point) return;
        endDrag(point.x, point.y);
      });

      ipcMain.handle('beam:files:add', (event, paths: unknown) => {
        if (event.sender !== window.webContents) {
          return { count: shelf.length, accepted: 0, truncated: false, limit: MAX_SHELF };
        }
        const list = Array.isArray(paths)
          ? paths.filter((path): path is string => typeof path === 'string' && path.length > 0 && !path.includes('\0'))
          : [];
        let accepted = 0;
        let truncated = false;
        for (const path of list) {
          if (shelf.some((held) => held.toLowerCase() === path.toLowerCase())) continue;
          if (shelf.length >= MAX_SHELF) {
            truncated = true;
            break;
          }
          shelf.push(path);
          accepted++;
        }
        console.log(`[files] add=${list.length} accepted=${accepted} count=${shelf.length} truncated=${truncated}`);
        return { count: shelf.length, accepted, truncated, limit: MAX_SHELF };
      });

      ipcMain.handle('beam:files:copy', async (event, payload: unknown): Promise<CopyResult> => {
        if (event.sender !== window.webContents) return { ok: false, count: 0, error: 'untrusted sender' };
        const data = payload as { paths?: unknown; source?: unknown } | null;
        const source = data?.source === 'row' || data?.source === 'all' ? data.source : null;
        const requested = Array.isArray(data?.paths)
          ? data.paths.filter((path): path is string => typeof path === 'string' && path.length > 0)
          : [];
        const held = new Map(shelf.map((path) => [path.toLowerCase(), path]));
        const canonical = requested.map((path) => held.get(path.toLowerCase()));
        const paths = canonical.filter((path): path is string => path !== undefined);
        if (!source || !requested.length || paths.length !== requested.length) {
          console.error(`[files] copy rejected source=${source} requested=${requested.length}`);
          return { ok: false, count: 0, error: 'paths must come from the shelf' };
        }
        try {
          await bridge.copy(paths);
          console.log(`[files] copy=${paths.length} source=${source} ok=true`);
          return { ok: true, count: paths.length };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`[files] copy=${paths.length} source=${source} ok=false ${message}`);
          return { ok: false, count: 0, error: message };
        }
      });

      ipcMain.on('beam:panel:request-open', openPanel);
      ipcMain.on('beam:panel:collapsed', () => {
        if (window.isDestroyed()) return;
        window.setBounds(pillPosition);
        console.log(
          `[window] pill=${pillPosition.x},${pillPosition.y},${pillPosition.width},${pillPosition.height}`
        );
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
      if (resetTest) {
        setTimeout(() => {
          if (!window.isDestroyed()) resetPosition();
        }, 1200);
      }
      if (dropTest) {
        setTimeout(() => {
          void runDropTest(window).catch((error: unknown) => console.error('[drop] failed', error));
        }, 1200);
      }
      if (copyTest) {
        setTimeout(() => {
          void runCopyTest(window, openPanel).catch((error: unknown) => console.error('[copy] failed', error));
        }, 1200);
      }
    }

    async function runDropTest(target: BrowserWindow): Promise<void> {
      const dir = join(tmpdir(), 'beam-droptest');
      mkdirSync(dir, { recursive: true });
      const write = (names: string[]): string[] => {
        const paths = names.map((name) => join(dir, name));
        for (const path of paths) writeFileSync(path, 'beam\n');
        return paths;
      };
      const first = write(['one.txt', 'two.txt', 'three.txt']);
      const many = write(Array.from({ length: 51 }, (_, index) => `extra-${String(index + 1).padStart(2, '0')}.txt`));

      const probe = async (tag: string): Promise<void> => {
        const dom = (await target.webContents.executeJavaScript(
          `(() => { const pill = document.querySelector('.pill'); const title = pill?.querySelector('.title'); return { state: pill?.dataset.state ?? null, title: title?.textContent ?? null }; })()`
        )) as { state: string | null; title: string | null };
        console.log(`[drop] ${tag} state=${dom.state} title=${dom.title}`);
      };

      const point = (await target.webContents.executeJavaScript(
        `(() => { const pill = document.querySelector('.pill'); if (!pill) return null; const rect = pill.getBoundingClientRect(); return { x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.y + rect.height / 2) }; })()`
      )) as { x: number; y: number } | null;
      if (!point) {
        console.error('[drop] pill missing');
        return;
      }

      target.webContents.debugger.attach('1.3');
      try {
        const drag = async (paths: string[]): Promise<void> => {
          const data = { items: [], files: paths, dragOperationsMask: 1 };
          for (const type of ['dragEnter', 'dragOver', 'drop']) {
            await target.webContents.debugger.sendCommand('Input.dispatchDragEvent', {
              type,
              x: point.x,
              y: point.y,
              data
            });
          }
        };

        await probe('start');
        await drag(first);
        await new Promise((resolve) => setTimeout(resolve, 400));
        await probe('three');
        await drag(many);
        await new Promise((resolve) => setTimeout(resolve, 300));
        await probe('capped');
        await new Promise((resolve) => setTimeout(resolve, 2600));
        await probe('settled');
      } finally {
        target.webContents.debugger.detach();
      }
    }

    async function runCopyTest(target: BrowserWindow, openPanel: () => void): Promise<void> {
      const dir = join(tmpdir(), 'beam-copytest');
      mkdirSync(dir, { recursive: true });
      const paths = ['alpha.txt', 'beta.txt', 'gamma.txt'].map((name) => join(dir, name));
      paths.forEach((path, index) => writeFileSync(path, `beam ${index}\n`));

      const point = (await target.webContents.executeJavaScript(
        `(() => { const pill = document.querySelector('.pill'); if (!pill) return null; const rect = pill.getBoundingClientRect(); return { x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.y + rect.height / 2) }; })()`
      )) as { x: number; y: number } | null;
      if (!point) {
        console.error('[copy] pill missing');
        return;
      }

      target.webContents.debugger.attach('1.3');
      try {
        const data = { items: [], files: paths, dragOperationsMask: 1 };
        for (const type of ['dragEnter', 'dragOver', 'drop']) {
          await target.webContents.debugger.sendCommand('Input.dispatchDragEvent', {
            type,
            x: point.x,
            y: point.y,
            data
          });
        }
      } finally {
        target.webContents.debugger.detach();
      }
      await new Promise((resolve) => setTimeout(resolve, 500));

      openPanel();
      await new Promise((resolve) => setTimeout(resolve, 500));
      await target.webContents.executeJavaScript(`document.querySelector('#tab-files')?.click()`);
      await new Promise((resolve) => setTimeout(resolve, 300));
      const panel = (await target.webContents.executeJavaScript(
        `(() => {
          const rows = [...document.querySelectorAll('#panel-files [data-copy-path]')];
          return {
            rows: rows.length,
            all: !!document.querySelector('#panel-files [data-copy-all]'),
            names: rows.map((button) => button.closest('.row')?.querySelector('.name')?.getAttribute('title')).join(','),
            sizes: [...document.querySelectorAll('#panel-files .row-meta')].map((node) => node.textContent).join(',')
          };
        })()`
      )) as { rows: number; all: boolean; names: string; sizes: string };
      console.log(`[copy] panel rows=${panel.rows} all=${panel.all} names=${panel.names} sizes=${panel.sizes}`);

      await target.webContents.executeJavaScript(`document.querySelector('#panel-files [data-copy-path]')?.click()`);
      await new Promise((resolve) => setTimeout(resolve, 4000));

      await target.webContents.executeJavaScript(`document.querySelector('#panel-files [data-copy-all]')?.click()`);
      await new Promise((resolve) => setTimeout(resolve, 600));
      console.log('[copy] done');
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
