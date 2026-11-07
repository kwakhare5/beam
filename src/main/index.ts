import { app, BrowserWindow, dialog, globalShortcut, ipcMain, nativeImage, Notification, screen } from 'electron';
import { statSync } from 'node:fs';
import { join } from 'node:path';
import { Bridge, type HelperEvent } from './bridge';
import { BeamTimer } from './timer';
import { IPC, type AddResult, type CopyResult, type ShelfFile, type TimerSnapshot } from '../shared/ipc';
import { getSettingsPath, loadSettings, saveSettings, type BeamSettings } from './settings';
import { helperPath, trayIconPath } from './paths';
import { createTray } from './tray';
import {
  anchorBounds,
  clampToWorkArea,
  PANEL_HEIGHT,
  PANEL_WIDTH,
  PILL_HEIGHT,
  placeWindow,
  savedPillBounds,
  WINDOW_HEIGHT,
  WINDOW_WIDTH
} from './geometry';
import { MAX_SHELF, Shelf } from './shelf';
import { registerHotkey } from './hotkey';
import { MusicService, type MusicPayload } from './music';
import { PanelController } from './panel';

function readPoint(x: unknown, y: unknown): { x: number; y: number } | null {
  if (typeof x !== 'number' || !Number.isFinite(x)) return null;
  if (typeof y !== 'number' || !Number.isFinite(y)) return null;
  return { x, y };
}

app.disableHardwareAcceleration();
app.setAppUserModelId('com.beam.app');

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  let win: BrowserWindow | null = null;
  let tray: ReturnType<typeof createTray> | null = null;
  let pickingFiles = false;
  let hiddenByFullscreen = false;
  let hiddenByUser = false;
  let pillSize = { width: 94, height: 30 };
  let shapeFailed = false;

  function applyWindowShape(target: BrowserWindow): void {
    if (target.isDestroyed()) return;
    try {
      if (panel.open) {
        target.setShape([{ x: 0, y: 0, width: PANEL_WIDTH, height: PANEL_HEIGHT }]);
        return;
      }
      const halo = 6;
      const width = Math.min(WINDOW_WIDTH, Math.max(1, Math.round(pillSize.width + halo * 2)));
      const height = Math.min(WINDOW_HEIGHT, Math.max(1, Math.round(pillSize.height + halo * 2)));
      target.setShape([
        {
          x: Math.round((WINDOW_WIDTH - width) / 2),
          y: Math.round((WINDOW_HEIGHT - height) / 2),
          width,
          height
        }
      ]);
    } catch (error) {
      if (!shapeFailed) {
        shapeFailed = true;
        console.error('[window] setShape failed', error);
      }
    }
  }
  let fullscreenActive = false;
  const shelf = new Shelf();
  const panel = new PanelController(() => win, () => pillPosition, () => shelf.rows(), applyWindowShape);
  const openPanel = (): void => panel.show();
  const closePanel = (): void => panel.hide();
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
  const fullscreenTest = process.env.BEAM_FULLSCREEN_TEST === '1';
  const dropTest = process.env.BEAM_DROP_TEST === '1';
  const copyTest = process.env.BEAM_COPY_TEST === '1';
  const dragoutTest = process.env.BEAM_DRAGOUT_TEST === '1';
  const missingTest = process.env.BEAM_MISSING_TEST === '1';
  const clearTest = process.env.BEAM_CLEAR_TEST === '1';
  const emptyTest = process.env.BEAM_EMPTY_TEST === '1';
  const musicTest = process.env.BEAM_MUSIC_TEST === '1';
  const musicCmdTest = process.env.BEAM_MUSIC_CMD_TEST === '1';
  const musicTabTest = process.env.BEAM_MUSIC_TAB_TEST === '1';
  const musicSessionsTest = process.env.BEAM_MUSIC_SESSIONS_TEST === '1';
  const uiTest = process.env.BEAM_UI_TEST === '1';
  const uiTestPhase = process.env.BEAM_UI_TEST_PHASE ?? 'all';
  const timerTest = process.env.BEAM_TIMER_TEST === '1';
  const timerHiddenTest = process.env.BEAM_TIMER_HIDDEN_TEST === '1';
  const timerScale = ((): number => {
    const raw = Number(process.env.BEAM_TIMER_SCALE_MS ?? '');
    return Number.isFinite(raw) && raw > 0 ? raw : 60_000;
  })();
  let helperOk = true;
  let liveMusicApp = '';
  let musicCmdStarted = false;
  let musicSessionsStarted = false;

  const music = new MusicService((view) => {
    if (!win || win.isDestroyed()) return;
    win.webContents.send(IPC.musicState, view);
    if (musicTest && view) dev()?.probeMusic(win, Date.now());
  });

  function sendHelperState(): void {
    if (!win || win.isDestroyed()) return;
    win.webContents.send(IPC.helperState, { ok: helperOk });
  }

  function sendTimer(snapshot: TimerSnapshot = timer.snapshot()): void {
    if (!win || win.isDestroyed()) return;
    win.webContents.send(IPC.timerState, snapshot);
  }

  function showTimerAlert(): void {
    if (Notification.isSupported()) {
      const notice = new Notification({ title: 'Beam', body: 'Timer finished', silent: true });
      notice.on('click', () => {
        if (!win || win.isDestroyed()) return;
        hiddenByFullscreen = false;
        hiddenByUser = false;
        win.showInactive();
      });
      notice.show();
      console.log('[timer] notify shown=notification');
      return;
    }
    if (tray) {
      tray.displayBalloon({
        title: 'Beam',
        content: 'Timer finished',
        icon: nativeImage.createFromPath(trayIconPath()),
        noSound: true
      });
      console.log('[timer] notify shown=balloon');
      return;
    }
    console.log('[timer] notify shown=none');
  }

  const timer = new BeamTimer(
    timerScale,
    (snapshot) => sendTimer(snapshot),
    (alert) => {
      console.log(`[timer] done id=${alert.id} minutes=${alert.minutes} hidden=${hiddenByFullscreen}`);
      showTimerAlert();
    }
  );

  let onFullscreen: (active: boolean) => void = () => {};
  const onHelperEvent = (event: HelperEvent): void => {
    if (event.evt === 'fullscreen.changed') {
      const payload = event.payload as { active?: unknown } | null;
      fullscreenActive = payload?.active === true;
      onFullscreen(fullscreenActive);
      return;
    }
    if (event.evt !== 'music.changed') return;
    const payload = event.payload as MusicPayload | null;
    liveMusicApp = payload?.app ?? '';
    if (musicSessionsTest && !musicSessionsStarted) {
      musicSessionsStarted = true;
      runDev((harness) => harness.runMusicSessionsTest(harnessCtx), 'sessions');
    }
    if (!payload) {
      console.log('[music] none');
    } else {
      console.log(`[music] ${payload.title} - ${payload.artist} (${payload.app})`);
      console.log(`[music] art ${payload.art ? 'yes' : 'none'}`);
    }
    if (musicTest) {
      console.log(
        payload
          ? `[music] input ${JSON.stringify({
              title: payload.title,
              playing: payload.playing,
              hasArt: Boolean(payload.art)
            })}`
          : '[music] input null'
      );
    }
    music.apply(payload);
    if (musicCmdTest && !musicCmdStarted && payload && (payload.title || payload.artist)) {
      musicCmdStarted = true;
      runDev((harness) => harness.runMusicCommandTest(harnessCtx), 'music');
    }
  };
  const bridge = new Bridge(
    helperPath(),
    onHelperEvent,
    () => {
      helperOk = false;
      sendHelperState();
    },
    () => {
      console.log('[bridge] restarted');
      helperOk = true;
      sendHelperState();
      void bridge
        .ping()
        .then((version) => console.log(`[bridge] pong ${version}`))
        .catch((error: unknown) => {
          helperOk = false;
          sendHelperState();
          console.error('[bridge] restart ping failed', error);
        });
    }
  );

  type HarnessModule = typeof import('./dev/harness');
  let harnessModule: HarnessModule | null = null;
  const harnessCtx: import('./dev/harness').HarnessContext = {
    window: () => win,
    shelf,
    bridge,
    music: () => music.current,
    liveApp: () => liveMusicApp,
    sendMusic: () => music.sendCurrent()
  };

  function dev(): HarnessModule | null {
    if (app.isPackaged) return null;
    if (harnessModule) return harnessModule;
    try {
      harnessModule = require('./dev/harness') as HarnessModule;
    } catch (error) {
      console.error('[dev] harness unavailable', error);
      return null;
    }
    return harnessModule;
  }

  function runDev(task: (harness: HarnessModule) => Promise<void>, label: string): void {
    const harness = dev();
    if (!harness) return;
    void task(harness).catch((error: unknown) => console.error(`[${label}] error`, error));
  }

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
      if (!hiddenByFullscreen && !hiddenByUser) target.showInactive();
      applyWindowShape(target);
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
      if (timerHiddenTest) {
        setTimeout(() => {
          if (target.isDestroyed()) return;
          const snapshot = timer.start(4);
          console.log(`[timer] hidden start id=${snapshot.id} minutes=4`);
        }, 1500);
      }
      if (idleTest) {
        setTimeout(() => {
          if (!target.isDestroyed()) dev()?.probeIdle(target);
        }, 800);
      }
    });

    win.on('blur', () => {
      panel.dismissOnBlur(pickingFiles);
    });

    win.on('closed', () => {
      win = null;
    });

    win.webContents.on('will-navigate', (event) => {
      event.preventDefault();
    });

    win.webContents.on('did-finish-load', () => {
      music.sendCurrent();
      sendHelperState();
      sendTimer();
    });

    void win.loadFile(join(__dirname, '../renderer/index.html'));
  }

  app.on('second-instance', () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    hiddenByFullscreen = false;
    hiddenByUser = false;
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
      .then((version) => {
        helperOk = true;
        console.log(`[bridge] pong ${version}`);
        sendHelperState();
      })
      .catch((error: unknown) => {
        helperOk = false;
        sendHelperState();
        console.error('[bridge] ping failed', error);
      });

    createWindow(restoredBounds !== null);
    if (win) {
      const window = win;
      const showPill = (source: string): void => {
        if (window.isDestroyed()) return;
        hiddenByFullscreen = false;
        hiddenByUser = false;
        panel.reset();
        window.showInactive();
        console.log(`[fullscreen] shown (${source})`);
      };
      const hideFromTray = (): void => {
        if (window.isDestroyed()) return;
        hiddenByUser = true;
        hiddenByFullscreen = false;
        if (panel.open) closePanel();
        window.setBounds(pillPosition);
        window.hide();
        console.log('[window] hidden (tray)');
      };
      const quitWithConfirm = (): void => {
        if (window.isDestroyed()) {
          app.quit();
          return;
        }
        const count = shelf.count;
        if (count === 0) {
          app.quit();
          return;
        }
        const options = {
          type: 'warning' as const,
          title: 'Quit Beam?',
          message: `${count} ${count === 1 ? 'file' : 'files'} will be cleared`,
          detail: 'Beam keeps only file paths while it runs.',
          buttons: ['Keep Beam open', 'Quit and clear'],
          defaultId: 0,
          cancelId: 0,
          noLink: true
        };
        const choice = window.isVisible()
          ? dialog.showMessageBoxSync(window, options)
          : dialog.showMessageBoxSync(options);
        if (choice === 1) app.quit();
      };
      const hidePill = (): void => {
        if (window.isDestroyed()) return;
        windowDrag = null;
        if (panel.open) closePanel();
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
        if (panel.open) closePanel();
        else openPanel();
      };
      onFullscreen = (active: boolean): void => {
        if (window.isDestroyed()) return;
        if (active) {
          if (!window.isVisible() || hiddenByUser) return;
          hidePill();
          if (fullscreenTest) setTimeout(() => trayToggle(), 1500);
          return;
        }
        if (hiddenByFullscreen) showPill('fullscreen exit');
        if (timerHiddenTest && timer.snapshot().phase === 'done') {
          setTimeout(() => {
            if (window.isDestroyed()) return;
            void window.webContents
              .executeJavaScript(`document.querySelector('.pill')?.dataset.state ?? null`)
              .then((state: unknown) => console.log(`[timer] hidden shown state=${String(state)}`))
              .catch(() => {});
          }, 700);
        }
      };
      if (fullscreenActive) onFullscreen(true);
      const startDrag = (x: number, y: number): void => {
        if (panel.open || window.isDestroyed()) return;
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
        settings.position = { x: settled.x, y: settled.y };
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
        if (panel.open) closePanel();
        else if (!window.isDestroyed()) {
          window.setBounds(pillPosition);
          applyWindowShape(window);
        }
      };

      tray = createTray(
        () => {},
        () => resetPosition(),
        () => trayToggle(),
        () => hideFromTray(),
        () => quitWithConfirm()
      );
      console.log('[tray] ready');
      const hotkey = registerHotkey(trayToggle);
      if (hotkey === 'Alt+Space') console.log('[hotkey] Alt+Space');
      else if (hotkey) console.log(`[hotkey] ${hotkey} (Alt+Space taken)`);
      else console.error('[hotkey] registration failed');

      ipcMain.on(IPC.windowDragStart, (event, x: unknown, y: unknown) => {
        const point = readPoint(x, y);
        if (event.sender !== window.webContents || !point) return;
        startDrag(point.x, point.y);
      });
      ipcMain.on(IPC.windowDragMove, (event, x: unknown, y: unknown) => {
        const point = readPoint(x, y);
        if (event.sender !== window.webContents || !point) return;
        moveDrag(point.x, point.y);
      });
      ipcMain.on(IPC.windowDragEnd, (event, x: unknown, y: unknown) => {
        const point = readPoint(x, y);
        if (event.sender !== window.webContents || !point) return;
        endDrag(point.x, point.y);
      });

      ipcMain.handle(IPC.filesAdd, (event, paths: unknown): AddResult => {
        if (event.sender !== window.webContents) {
          return { count: shelf.count, accepted: 0, truncated: false, limit: MAX_SHELF, files: shelf.rows() };
        }
        const list = Array.isArray(paths)
          ? paths.filter((path): path is string => typeof path === 'string' && path.length > 0 && !path.includes('\0'))
          : [];
        const result = shelf.add(list);
        console.log(
          `[files] add=${list.length} accepted=${result.accepted} count=${result.count} truncated=${result.truncated}`
        );
        return result;
      });

      ipcMain.handle(IPC.filesPick, async (event): Promise<AddResult | null> => {
        if (event.sender !== window.webContents) return null;
        pickingFiles = true;
        try {
          const selection = await dialog.showOpenDialog(window, {
            title: 'Add files to Beam',
            buttonLabel: 'Add',
            properties: ['openFile', 'multiSelections']
          });
          if (selection.canceled || selection.filePaths.length === 0) return null;
          const result = shelf.add(selection.filePaths);
          console.log(
            `[files] pick=${selection.filePaths.length} accepted=${result.accepted} count=${result.count} truncated=${result.truncated}`
          );
          return result;
        } finally {
          pickingFiles = false;
        }
      });

      ipcMain.handle(IPC.filesCopy, async (event, payload: unknown): Promise<CopyResult> => {
        if (event.sender !== window.webContents) return { ok: false, count: 0, error: 'untrusted sender' };
        const data = payload as { paths?: unknown; source?: unknown } | null;
        const source = data?.source === 'row' || data?.source === 'all' ? data.source : null;
        const requested = Array.isArray(data?.paths)
          ? data.paths.filter((path): path is string => typeof path === 'string' && path.length > 0)
          : [];
        const paths = shelf.canonical(requested);
        if (!source || !paths) {
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

      ipcMain.on(IPC.filesDrag, (event, paths: unknown) => {
        if (event.sender !== window.webContents) return;
        const requested = Array.isArray(paths)
          ? paths.filter((path): path is string => typeof path === 'string' && path.length > 0)
          : [];
        const dragPaths = shelf.canonical(requested);
        if (!dragPaths) {
          console.error(`[files] drag rejected requested=${requested.length}`);
          return;
        }
        const missing = dragPaths.filter((path) => {
          try {
            statSync(path);
            return false;
          } catch {
            return true;
          }
        });
        const first = dragPaths[0];
        if (!first || missing.length) {
          console.error(`[files] drag rejected missing=${missing.length}`);
          return;
        }
        const icon = nativeImage.createFromPath(trayIconPath());
        console.log(`[files] drag=${dragPaths.length} ok=true`);
        event.sender.startDrag({ file: first, files: dragPaths, icon });
      });

      ipcMain.handle(IPC.filesRemove, (event, path: unknown): { ok: boolean; files: ShelfFile[] } => {
        if (event.sender !== window.webContents) return { ok: false, files: shelf.rows() };
        const removed = typeof path === 'string' ? shelf.remove(path) : null;
        if (!removed) {
          console.error(`[files] remove rejected path=${typeof path === 'string' ? path : 'invalid'}`);
          return { ok: false, files: shelf.rows() };
        }
        console.log(`[files] remove=${removed.index} count=${shelf.count} path=${removed.path}`);
        return { ok: true, files: shelf.rows() };
      });

      ipcMain.handle(IPC.filesClear, (event): { ok: boolean; files: ShelfFile[] } => {
        if (event.sender !== window.webContents) return { ok: false, files: shelf.rows() };
        const count = shelf.clear();
        console.log(`[files] clear=${count}`);
        return { ok: true, files: [] };
      });

      ipcMain.handle(IPC.musicCommand, async (event, cmd: unknown): Promise<{ ok: boolean; error?: string }> => {
        if (event.sender !== window.webContents) return { ok: false, error: 'untrusted sender' };
        const action = cmd === 'toggle' || cmd === 'next' || cmd === 'prev' ? cmd : null;
        if (!action) {
          console.error(`[music] cmd rejected ${String(cmd)}`);
          return { ok: false, error: 'unknown command' };
        }
        try {
          await bridge.music(action);
          console.log(`[music] cmd ${action} ok=true`);
          return { ok: true };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`[music] cmd ${action} ok=false ${message}`);
          return { ok: false, error: message };
        }
      });

      ipcMain.handle(IPC.timerStart, (event, minutes: unknown): TimerSnapshot | null => {
        if (event.sender !== window.webContents) return null;
        const value = typeof minutes === 'number' && Number.isFinite(minutes) ? Math.round(minutes) : 0;
        if (value < 1 || value > 999) {
          console.error(`[timer] start rejected minutes=${String(minutes)}`);
          return null;
        }
        const snapshot = timer.start(value);
        console.log(`[timer] start id=${snapshot.id} minutes=${value} scale=${timerScale}`);
        return snapshot;
      });

      ipcMain.handle(IPC.timerCancel, (event): TimerSnapshot | null => {
        if (event.sender !== window.webContents) return null;
        const snapshot = timer.cancel();
        console.log(`[timer] cancel id=${snapshot.id} phase=${snapshot.phase}`);
        return snapshot;
      });

      ipcMain.handle(IPC.timerDismiss, (event): TimerSnapshot | null => {
        if (event.sender !== window.webContents) return null;
        const snapshot = timer.dismiss();
        console.log(`[timer] dismiss id=${snapshot.id} phase=${snapshot.phase}`);
        return snapshot;
      });

      ipcMain.on(IPC.timerChimed, (event, id: unknown, ok: unknown) => {
        if (event.sender !== window.webContents) return;
        console.log(`[timer] chime id=${typeof id === 'number' ? id : 0} ok=${ok === true}`);
      });

      ipcMain.on(IPC.pillSize, (event, width: unknown, height: unknown) => {
        if (event.sender !== window.webContents) return;
        if (typeof width !== 'number' || !Number.isFinite(width)) return;
        if (typeof height !== 'number' || !Number.isFinite(height)) return;
        pillSize = {
          width: Math.max(1, Math.min(WINDOW_WIDTH, Math.round(width))),
          height: Math.max(1, Math.min(WINDOW_HEIGHT, Math.round(height)))
        };
        if (!panel.open) applyWindowShape(window);
      });

      ipcMain.on(IPC.panelRequestOpen, openPanel);
      ipcMain.on(IPC.panelCollapsed, () => {
        panel.collapsed();
      });
      ipcMain.on(IPC.panelTiming, (_event, ms: number, reduced: boolean) => {
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
        setTimeout(() => runDev((harness) => harness.runDropTest(window), 'drop'), 1200);
      }
      if (copyTest) {
        setTimeout(() => runDev((harness) => harness.runCopyTest(window, openPanel), 'copy'), 1200);
      }
      if (dragoutTest) {
        setTimeout(() => runDev((harness) => harness.runDragoutTest(window, openPanel, closePanel), 'dragout'), 1200);
      }
      if (missingTest) {
        setTimeout(() => runDev((harness) => harness.runMissingTest(window, openPanel, closePanel), 'missing'), 1200);
      }
      if (clearTest) {
        setTimeout(() => runDev((harness) => harness.runClearTest(window, openPanel), 'clear'), 1200);
      }
      if (emptyTest) {
        setTimeout(() => runDev((harness) => harness.runEmptyTest(window, openPanel), 'empty'), 1200);
      }
      if (musicTabTest) {
        setTimeout(() => {
          if (!window.isDestroyed()) runDev((harness) => harness.runMusicTabTest(harnessCtx, window, openPanel), 'music');
        }, 1200);
      }
      if (uiTest) {
        setTimeout(() => {
          if (!window.isDestroyed()) runDev((harness) => harness.runUiTest(harnessCtx, window, uiTestPhase), 'ui');
        }, 1200);
      }
      if (timerTest) {
        setTimeout(() => {
          if (!window.isDestroyed()) runDev((harness) => harness.runTimerTest(window, openPanel), 'timer');
        }, 1200);
      }
    }

  });

  let quitting = false;

  app.on('will-quit', (event) => {
    if (quitting) return;
    quitting = true;
    globalShortcut.unregisterAll();
    timer.dispose();
    event.preventDefault();
    void bridge.stop().finally(() => app.quit());
  });

  app.on('window-all-closed', () => {
    app.quit();
  });
}
