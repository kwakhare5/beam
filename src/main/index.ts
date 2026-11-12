import { app, BrowserWindow, dialog, globalShortcut, nativeImage, Notification, screen } from 'electron';
import { join } from 'node:path';
import { Bridge, type HelperEvent } from './bridge';
import { BeamTimer } from './timer';
import { IPC, type TimerSnapshot } from '../shared/ipc';
import { getSettingsPath, loadSettings, saveSettings, SETTINGS_DEFAULTS, type BeamSettings } from './settings';
import { helperPath, trayIconPath } from './paths';
import { createTray } from './tray';
import {
  anchorBounds,
  clampToWorkArea,
  isCursorNear,
  PANEL_HEIGHT,
  PANEL_WIDTH,
  placeWindow,
  savedPillBounds,
  WINDOW_HEIGHT,
  WINDOW_WIDTH
} from './geometry';
import { Shelf } from './shelf';
import { DEFAULT_HOTKEY, registerHotkey } from './hotkey';
import { isStartupEnabled } from './startup';
import { MusicService, type MusicPayload } from './music';
import { PanelController } from './panel';
import { registerSettingsIpc } from './settings-ipc';
import { registerAppIpc } from './app-ipc';

app.disableHardwareAcceleration();
app.setAppUserModelId('com.beam.app');

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  type HarnessModule = typeof import('./dev/harness');
  let harnessModule: HarnessModule | null = null;

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

  let win: BrowserWindow | null = null;
  let tray: ReturnType<typeof createTray> | null = null;
  let pickingFiles = false;
  let hiddenByFullscreen = false;
  let hiddenByUser = false;
  let pillSize = { width: 78, height: 30 };
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
  const openPanel = (tab?: 'settings'): void => panel.show(tab);
  const closePanel = (): void => panel.hide();
  let settings: BeamSettings = { version: 1, position: null, ...SETTINGS_DEFAULTS };
  let pillPosition: Electron.Rectangle = {
    x: 0,
    y: 0,
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT
  };
  let windowDrag: { pointerX: number; pointerY: number; bounds: Electron.Rectangle } | null = null;
  const hooks = dev()?.readHooks() ?? null;
  const timerScale = hooks?.timerScaleMs ?? 60_000;
  let helperOk = true;
  let liveMusicApp = '';

  const music = new MusicService((view) => {
    if (!win || win.isDestroyed()) return;
    win.webContents.send(IPC.musicState, view);
    if (hooks?.music && view) dev()?.probeMusic(win, Date.now());
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
    if (!payload) {
      console.log('[music] none');
    } else {
      console.log(`[music] ${payload.title} - ${payload.artist} (${payload.app})`);
      console.log(`[music] art ${payload.art ? 'yes' : 'none'}`);
    }
    if (hooks) dev()?.onMusicPayload(hooks, payload, harnessCtx, () => music.apply(payload));
    else music.apply(payload);
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

  const harnessCtx: import('./dev/harness').HarnessContext = {
    window: () => win,
    shelf,
    bridge,
    music: () => music.current,
    liveApp: () => liveMusicApp,
    sendMusic: () => music.sendCurrent()
  };

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
          if (target.isDestroyed() || panel.open || windowDrag) return;
          placeWindow(target, false);
          pillPosition = target.getBounds();
        }, 500);
      }
      if (hooks) {
        dev()?.afterShow(hooks, target, () => {
          const snapshot = timer.start(4);
          console.log(`[timer] hidden start id=${snapshot.id} minutes=4`);
        });
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
    console.log(
      `[settings] loaded theme=${settings.theme} volume=${settings.volume} shortcut=${settings.shortcut || 'default'} startup=${isStartupEnabled()}`
    );
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
      let near = false;
      const pollNear = (): void => {
        if (window.isDestroyed()) return;
        const next = isCursorNear(screen.getCursorScreenPoint(), pillPosition);
        if (next === near) return;
        near = next;
        window.webContents.send(IPC.pillNear, next);
      };
      const nearPoll = setInterval(pollNear, 250);
      window.webContents.once('did-finish-load', () => {
        near = false;
        pollNear();
      });
      window.once('closed', () => clearInterval(nearPoll));
      const showPill = (source: string): void => {
        if (window.isDestroyed()) return;
        hiddenByFullscreen = false;
        hiddenByUser = false;
        if (window.webContents.isLoading()) return;
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
          if (hiddenByUser) return;
          if (!window.isVisible()) {
            hiddenByFullscreen = true;
            return;
          }
          hidePill();
          if (hooks) {
            dev()?.onFullscreen(hooks, true, window, {
              trayToggle,
              timerPhase: () => timer.snapshot().phase
            });
          }
          return;
        }
        if (hiddenByFullscreen) showPill('fullscreen exit');
        if (hooks) {
          dev()?.onFullscreen(hooks, false, window, {
            trayToggle,
            timerPhase: () => timer.snapshot().phase
          });
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
        () => {
          if (!win || win.isDestroyed()) return;
          if (!win.isVisible()) showPill('tray');
          openPanel('settings');
        },
        () => resetPosition(),
        () => trayToggle(),
        () => hideFromTray(),
        () => quitWithConfirm()
      );
      console.log('[tray] ready');
      const hotkey = registerHotkey(trayToggle, settings.shortcut || DEFAULT_HOTKEY);
      settings.startup = isStartupEnabled();
      if (hotkey && hotkey !== settings.shortcut) {
        settings.shortcut = hotkey;
        saveSettings(settings);
      }
      if (hotkey) {
        const preferred = settings.shortcut || DEFAULT_HOTKEY;
        console.log(`[hotkey] ${hotkey}${hotkey !== preferred ? ` (${preferred} taken)` : ''}`);
      } else console.error('[hotkey] registration failed');

      registerAppIpc({
        window,
        shelf,
        bridge,
        timer,
        music,
        windowDrag: {
          start: (x, y) => startDrag(x, y),
          move: (x, y) => moveDrag(x, y),
          end: (x, y) => endDrag(x, y)
        },
        setPillSize: (width, height) => {
          pillSize = { width, height };
          if (!panel.open) applyWindowShape(window);
        },
        setPicking: (picking) => {
          pickingFiles = picking;
        },
        openPanel: () => openPanel(),
        panelCollapsed: () => panel.collapsed(),
        timerScale
      });

      registerSettingsIpc({
        window,
        settings,
        save: () => saveSettings(settings),
        resetPosition,
        trayToggle
      });

      if (hooks) {
        dev()?.scheduleReady(hooks, window, harnessCtx, {
          openPanel,
          closePanel,
          resetPosition,
          trayToggle
        });
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
