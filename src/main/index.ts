import { app, BrowserWindow, dialog, globalShortcut, ipcMain, nativeImage, screen } from 'electron';
import { existsSync, mkdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { Bridge, type HelperEvent } from './bridge';
import { IPC, type AddResult, type CopyResult, type MusicState, type ShelfFile } from '../shared/ipc';
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
  art: string | null;
  playing: boolean;
  positionMs: number;
  durationMs: number;
};

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
  let pickingFiles = false;
  let hiddenByFullscreen = false;
  let hiddenByUser = false;
  let pillSize = { width: 94, height: 30 };
  let shapeFailed = false;

  function applyWindowShape(target: BrowserWindow): void {
    if (target.isDestroyed()) return;
    try {
      if (panelOpen) {
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
  let shelf: string[] = [];
  const shelfRows = (): ShelfFile[] =>
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
  const addPaths = (paths: string[]): AddResult => {
    let accepted = 0;
    let truncated = false;
    for (const path of paths) {
      if (shelf.some((held) => held.toLowerCase() === path.toLowerCase())) continue;
      if (shelf.length >= MAX_SHELF) {
        truncated = true;
        break;
      }
      shelf.push(path);
      accepted++;
    }
    return { count: shelf.length, accepted, truncated, limit: MAX_SHELF, files: shelfRows() };
  };
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
  let musicView: MusicState | null = null;
  let helperOk = true;
  let liveMusicApp = '';
  let musicRequest = 0;
  let musicCmdStarted = false;
  let musicSessionsStarted = false;

  function probeMusic(started: number, attempt = 0): void {
    if (!win || win.isDestroyed()) return;
    void win.webContents
      .executeJavaScript(
        `new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => {
          const pill = document.querySelector('.pill');
          const title = pill?.querySelector('.title');
          const mark = pill?.querySelector('.mascot');
          const pip = pill?.querySelector('.media-pip');
          resolve({
            state: pill?.dataset.state ?? null,
            label: title?.textContent ?? null,
            art: (mark?.getAttribute('src') ?? '').startsWith('data:image/png'),
            pip: pip ? (pip.classList.contains('paused') ? 'paused' : pip.classList.contains('danger') ? 'danger' : 'playing') : null
          });
        })))`
      )
      .then((probe: unknown) => {
        console.log(`[music] probe ${JSON.stringify({ ...(probe as object), ms: Date.now() - started })}`);
      })
      .catch(() => {
        if (attempt < 20) setTimeout(() => probeMusic(started, attempt + 1), 100);
      });
  }

  function sendMusic(): void {
    if (!win || win.isDestroyed()) return;
    win.webContents.send(IPC.musicState, musicView);
    if (musicTest && musicView) probeMusic(Date.now());
  }

  function sendHelperState(): void {
    if (!win || win.isDestroyed()) return;
    win.webContents.send(IPC.helperState, { ok: helperOk });
  }

  async function applyMusic(payload: MusicPayload | null): Promise<void> {
    const request = ++musicRequest;
    if (!payload || (!payload.title && !payload.artist)) {
      musicView = null;
      if (musicTest) console.log('[music] input null');
      sendMusic();
      return;
    }
    const art = payload.art ? `data:image/png;base64,${payload.art}` : null;
    if (request !== musicRequest) return;
    musicView = {
      title: payload.title,
      artist: payload.artist,
      playing: payload.playing,
      art,
      positionMs: payload.positionMs,
      durationMs: payload.durationMs
    };
    if (musicTest) {
      console.log(`[music] input ${JSON.stringify({ title: payload.title, playing: payload.playing, hasArt: Boolean(art) })}`);
    }
    sendMusic();
    if (musicCmdTest && !musicCmdStarted) {
      musicCmdStarted = true;
      void runMusicCommandTest().catch((error: unknown) => {
        console.error('[music] cmd error', error);
        console.log('[music] cmd done');
      });
    }
  }

  const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

  async function waitForMusic(check: () => boolean, ms: number): Promise<boolean> {
    const deadline = Date.now() + ms;
    while (Date.now() < deadline) {
      if (check()) return true;
      await delay(40);
    }
    return check();
  }

  async function clickTransport(action: 'prev' | 'toggle' | 'next'): Promise<boolean> {
    if (!win || win.isDestroyed()) return false;
    const point = (await win.webContents.executeJavaScript(
      `(() => {
        const button = document.querySelector('.controls [data-action="${action}"]');
        if (!button) return null;
        const rect = button.getBoundingClientRect();
        return { x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) };
      })()`
    )) as { x: number; y: number } | null;
    if (!point) return false;
    win.webContents.sendInputEvent({ type: 'mouseMove', x: point.x, y: point.y });
    await delay(80);
    win.webContents.sendInputEvent({
      type: 'mouseDown',
      x: point.x,
      y: point.y,
      button: 'left',
      clickCount: 1
    });
    win.webContents.sendInputEvent({
      type: 'mouseUp',
      x: point.x,
      y: point.y,
      button: 'left',
      clickCount: 1
    });
    return true;
  }

  async function runMusicCommandTest(): Promise<void> {
    if (!win || win.isDestroyed()) return;
    await delay(400);
    const pillPoint = (await win.webContents.executeJavaScript(
      `(() => {
        const rect = document.querySelector('.pill')?.getBoundingClientRect();
        return rect ? { x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) } : null;
      })()`
    )) as { x: number; y: number } | null;
    if (!pillPoint) {
      console.log('[music] cmd skipped=no-pill');
      return;
    }
    win.webContents.sendInputEvent({ type: 'mouseMove', x: pillPoint.x, y: pillPoint.y });
    await delay(260);

    const hover = (await win.webContents.executeJavaScript(
      `(() => {
        const pill = document.querySelector('.pill');
        const controls = pill?.querySelector('.controls');
        const meta = pill?.querySelector('.meta');
        return {
          hasControls: pill?.classList.contains('has-controls') ?? false,
          opacity: controls ? getComputedStyle(controls).opacity : null,
          metaOpacity: meta ? getComputedStyle(meta).opacity : null,
          buttons: [...(pill?.querySelectorAll('.controls [data-action]') ?? [])].map((button) => ({
            action: button.getAttribute('data-action'),
            label: button.getAttribute('aria-label')
          }))
        };
      })()`
    )) as {
      hasControls: boolean;
      opacity: string | null;
      metaOpacity: string | null;
      buttons: { action: string | null; label: string | null }[];
    };
    console.log(`[music] hover ${JSON.stringify(hover)}`);

    const start = musicView;
    if (!start) {
      console.log('[music] cmd skipped=no-session');
      return;
    }

    let started = Date.now();
    const fromPlaying = start.playing;
    const clicked = await clickTransport('toggle');
    const flipped = clicked && (await waitForMusic(() => musicView !== null && musicView.playing !== fromPlaying, 6000));
    console.log(
      `[music] toggle ${JSON.stringify({
        from: fromPlaying,
        to: musicView?.playing ?? null,
        ok: flipped,
        ms: Date.now() - started
      })}`
    );

    if (musicView && !musicView.playing) {
      started = Date.now();
      const back = await clickTransport('toggle');
      const resumed = back && (await waitForMusic(() => musicView?.playing === true, 6000));
      console.log(
        `[music] resume ${JSON.stringify({
          from: false,
          to: musicView?.playing ?? null,
          ok: resumed,
          ms: Date.now() - started
        })}`
      );
    }

    const beforeTitle = musicView?.title ?? '';
    started = Date.now();
    const nextClicked = await clickTransport('next');
    const nextChanged =
      nextClicked && (await waitForMusic(() => musicView !== null && musicView.title !== beforeTitle, 8000));
    console.log(
      `[music] next ${JSON.stringify({
        from: beforeTitle,
        to: musicView?.title ?? '',
        ok: nextChanged,
        ms: Date.now() - started
      })}`
    );

    const afterTitle = musicView?.title ?? '';
    started = Date.now();
    const prevClicked = await clickTransport('prev');
    const prevChanged =
      prevClicked && (await waitForMusic(() => musicView !== null && musicView.title !== afterTitle, 8000));
    console.log(
      `[music] prev ${JSON.stringify({
        from: afterTitle,
        to: musicView?.title ?? '',
        ok: prevChanged,
        ms: Date.now() - started
      })}`
    );
    console.log('[music] cmd done');
  }

  async function runMusicTabTest(target: BrowserWindow, openPanel: () => void): Promise<void> {
    const deadline = Date.now() + 12000;
    while (!musicView && Date.now() < deadline) {
      await delay(200);
    }
    if (!musicView) {
      console.log('[music] tab skipped=no-session');
      return;
    }
    if (target.isDestroyed()) return;

    const payload = { ...musicView };
    console.log(`[music] tabpayload ${JSON.stringify({ ...payload, art: Boolean(payload.art) })}`);

    const requests: string[] = [];
    const onMessage = (_event: Electron.Event, method: string, params: Record<string, unknown>): void => {
      if (method !== 'Network.requestWillBeSent') return;
      const request = params.request as { url?: string } | undefined;
      const url = request?.url ?? '';
      if (/^https?:/i.test(url)) requests.push(url);
    };

    const probe = `(() => {
      const panel = document.querySelector('#panel-music');
      const art = panel?.querySelector('.art');
      const bar = panel?.querySelector('[data-music-bar]');
      const fill = panel?.querySelector('.track-fill');
      const rect = art?.getBoundingClientRect();
      return {
        hidden: panel?.hidden ?? null,
        selected: document.querySelector('#tab-music')?.getAttribute('aria-selected') ?? null,
        title: panel?.querySelector('.panel-title')?.textContent ?? null,
        subtitle: panel?.querySelector('.panel-sub')?.textContent ?? null,
        art: (art?.getAttribute('src') ?? '').startsWith('data:image/png'),
        artW: rect ? Math.round(rect.width) : 0,
        artH: rect ? Math.round(rect.height) : 0,
        bar: bar
          ? {
              tag: bar.tagName,
              role: bar.getAttribute('role'),
              now: Number(bar.getAttribute('aria-valuenow')),
              max: Number(bar.getAttribute('aria-valuemax')),
              tabIndex: bar.tabIndex,
              fill: fill?.style.width ?? null
            }
          : null,
        slider: Boolean(panel?.querySelector('input[type="range"], [role="slider"]')),
        times: [...(panel?.querySelectorAll('.track-times span') ?? [])].map((span) => span.textContent),
        controls: [...(panel?.querySelectorAll('.music-controls [data-action]') ?? [])].map((button) => ({
          action: button.getAttribute('data-action'),
          label: button.getAttribute('aria-label')
        }))
      };
    })()`;

    target.webContents.debugger.attach('1.3');
    target.webContents.debugger.on('message', onMessage);
    try {
      await target.webContents.debugger.sendCommand('Network.enable');
      openPanel();
      await delay(400);
      await target.webContents.executeJavaScript(`document.querySelector('#tab-music')?.click()`);
      await delay(300);
      const first = await target.webContents.executeJavaScript(probe);
      console.log(`[music] tab ${JSON.stringify(first)}`);
      await delay(3000);
      const second = await target.webContents.executeJavaScript(probe);
      console.log(`[music] tabtick ${JSON.stringify(second)}`);

      const beforeToggle = musicView?.playing ?? false;
      await target.webContents.executeJavaScript(`document.querySelector('#panel-music [data-action="toggle"]')?.click()`);
      const flipped = await waitForMusic(() => musicView !== null && musicView.playing !== beforeToggle, 8000);
      await target.webContents.executeJavaScript(`document.querySelector('#panel-music [data-action="toggle"]')?.click()`);
      const restored = await waitForMusic(() => musicView !== null && musicView.playing === beforeToggle, 8000);
      console.log(`[music] tabtoggle ${JSON.stringify({ from: beforeToggle, flipped, restored })}`);

      console.log(`[music] net ${JSON.stringify({ requests })}`);
    } finally {
      target.webContents.debugger.removeListener('message', onMessage);
      target.webContents.debugger.detach();
      console.log('[music] tab done');
    }
  }

  type UiSnapshot = {
    viewport: number;
    state: string | null;
    label: string | null;
    digits: string | null;
    w: number;
    h: number;
    open: boolean;
    selected: string[];
    timerMode: string | null;
    faceTop: number | null;
    actionBottom: number | null;
    rows: number;
    undo: boolean;
    status: string | null;
    calTitle: string | null;
    chevron: boolean;
  };

  async function runUiTest(target: BrowserWindow): Promise<void> {
    const ui = (tag: string, data: unknown): void => console.log(`[ui] ${tag} ${JSON.stringify(data)}`);
    const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
    const snap = async (): Promise<UiSnapshot> =>
      (await target.webContents.executeJavaScript(
        `(() => {
          const pill = document.querySelector('.pill');
          const rect = pill?.getBoundingClientRect();
          const body = document.querySelector('#panel-timer');
          const face = body?.querySelector('.timer-face');
          const actions = body?.querySelector('.actions');
          const bRect = body?.getBoundingClientRect();
          const fRect = face?.getBoundingClientRect();
          const aRect = actions?.getBoundingClientRect();
          return {
            viewport: window.innerHeight,
            state: pill?.dataset.state ?? null,
            label: pill?.querySelector('.title')?.textContent ?? null,
            digits: document.querySelector('.pill .digits')?.textContent ?? null,
            w: rect ? Math.round(rect.width) : 0,
            h: rect ? Math.round(rect.height) : 0,
            open: document.body.classList.contains('is-open'),
            selected: [...document.querySelectorAll('[role="tab"][aria-selected="true"]')].map((tab) =>
              tab.id.replace('tab-', '')
            ),
            timerMode: body?.className ?? null,
            faceTop: bRect && fRect ? Math.round(fRect.top - bRect.top) : null,
            actionBottom: bRect && aRect ? Math.round(bRect.bottom - aRect.bottom) : null,
            rows: document.querySelectorAll('#panel-files .row').length,
            undo: Boolean(document.querySelector('[data-files-undo]')),
            status: document.querySelector('[data-files-status]')?.textContent ?? null,
            calTitle: document.querySelector('#panel-calendar .cal-title')?.textContent ?? null,
            chevron: Boolean(pill?.querySelector('[data-action="panel"]'))
          };
        })()`
      )) as UiSnapshot;
    const point = async (selector: string): Promise<{ x: number; y: number } | null> =>
      (await target.webContents.executeJavaScript(
        `(() => {
          const rect = document.querySelector(${JSON.stringify(selector)})?.getBoundingClientRect();
          return rect ? { x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) } : null;
        })()`
      )) as { x: number; y: number } | null;
    const clickAt = async (at: { x: number; y: number }): Promise<void> => {
      target.webContents.sendInputEvent({ type: 'mouseMove', x: at.x, y: at.y });
      await wait(60);
      target.webContents.sendInputEvent({ type: 'mouseDown', x: at.x, y: at.y, button: 'left', clickCount: 1 });
      target.webContents.sendInputEvent({ type: 'mouseUp', x: at.x, y: at.y, button: 'left', clickCount: 1 });
    };
    const click = async (selector: string): Promise<boolean> => {
      const at = await point(selector);
      if (!at) return false;
      await clickAt(at);
      return true;
    };
    const escape = (): void => {
      target.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' });
      target.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Escape' });
    };
    const until = async (
      want: (state: UiSnapshot) => boolean,
      ms: number
    ): Promise<{ ok: boolean; snap: UiSnapshot }> => {
      const deadline = Date.now() + ms;
      let current = await snap();
      while (Date.now() < deadline && !want(current)) {
        await wait(60);
        current = await snap();
      }
      return { ok: want(current), snap: current };
    };
    const park = async (): Promise<void> => {
      target.webContents.sendInputEvent({ type: 'mouseMove', x: 2, y: 2 });
      await wait(320);
    };

    await wait(500);
    const start = await snap();
    ui('start', { state: start.state, music: Boolean(musicView), chevron: start.chevron, w: start.w, h: start.h, viewport: start.viewport });
    if (musicView) ui('quiet', { skipped: 'music' });

    const dir = join(tmpdir(), 'beam-uitest');
    mkdirSync(dir, { recursive: true });
    const paths = ['ui-one.txt', 'ui-two.txt', 'ui-three.txt'].map((name) => join(dir, name));
    paths.forEach((path, index) => writeFileSync(path, `beam ${index}\n`));
    // CDP Input.dispatchDragEvent collapses every synthetic drag to dragenter in this Electron,
    // so the shelf is filled through the same IPC the picker uses.
    const added = (await target.webContents.executeJavaScript(
      `window.beam.addFiles(${JSON.stringify(paths)}).then((result) => ({ accepted: result.accepted, count: result.count }))`
    )) as { accepted: number; count: number };
    const dropped = await until((state) => shelf.length === 3, 3000);
    ui('add', { accepted: added.accepted, shelf: shelf.length, ok: dropped.ok, state: dropped.snap.state, label: dropped.snap.label });

    await park();
    await click('.pill');
    const opened = await until((state) => state.open, 3000);
    ui('open', { ok: opened.ok, selected: opened.snap.selected, chevron: opened.snap.chevron });

    const removeAt = await point('#panel-files .row [data-remove-path]');
    if (removeAt) {
      await clickAt(removeAt);
      const removed = await until((state) => state.rows === 2 && state.undo, 3000);
      const undoAt = await point('[data-files-undo]');
      if (undoAt) await clickAt(undoAt);
      const restored = await until((state) => state.rows === 3, 3000);
      ui('undo', {
        afterRemove: removed.snap.rows,
        afterUndo: restored.snap.rows,
        undoVisible: removed.snap.undo,
        status: restored.snap.status,
        shelf: shelf.length
      });
    } else {
      ui('undo', { ok: false, reason: 'no-remove-button' });
    }

    await click('#tab-timer');
    await wait(150);
    await click('#panel-timer [data-timer-preset="5"]');
    await wait(150);
    await click('#panel-timer [data-timer-start]');
    const running = await until((state) => state.state === 'timer', 2500);
    ui('timer', {
      ok: running.ok,
      state: running.snap.state,
      digits: running.snap.digits,
      mode: running.snap.timerMode,
      faceTop: running.snap.faceTop,
      actionBottom: running.snap.actionBottom
    });
    await click('#panel-timer [data-timer-cancel]');
    const cancelled = await until((state) => state.state !== 'timer', 2500);
    ui('timercancel', { ok: cancelled.ok, state: cancelled.snap.state, digits: cancelled.snap.digits });

    await click('#tab-calendar');
    await wait(150);
    const calBefore = (await snap()).calTitle;
    await click('#panel-calendar [data-cal-next]');
    await wait(150);
    const calNext = (await snap()).calTitle;
    await click('#panel-calendar [data-cal-today]');
    await wait(150);
    const calBack = (await snap()).calTitle;
    ui('calendar', { before: calBefore, next: calNext, back: calBack });

    escape();
    const closed = await until((state) => !state.open, 3000);
    ui('esc', { ok: closed.ok, open: closed.snap.open });

    if (musicView) {
      await park();
      const pillAt = await point('.pill');
      if (pillAt) target.webContents.sendInputEvent({ type: 'mouseMove', x: pillAt.x, y: pillAt.y });
      await wait(260);
      const clicked = await click('.pill [data-action="panel"]');
      const chevron = await until((state) => state.open, 3000);
      ui('chevron', { ok: clicked && chevron.ok, selected: chevron.snap.selected });
      escape();
      await until((state) => !state.open, 3000);
    } else {
      ui('chevron', { skipped: 'no-music' });
    }

    await park();
    await click('.pill');
    const reopened = await until((state) => state.open, 3000);
    ui('lastused', { ok: reopened.ok, selected: reopened.snap.selected });
    escape();
    await until((state) => !state.open, 3000);
    await wait(250);

    if (musicView) {
      target.webContents.send(IPC.musicState, null);
      const dropped2 = await until((state) => state.state !== 'playing' && state.state !== 'paused', 2000);
      ui('nullstate', { ok: dropped2.ok, state: dropped2.snap.state });
      sendMusic();
      await wait(300);
    } else {
      ui('nullstate', { skipped: 'no-music' });
    }

    await park();
    await click('.pill');
    await until((state) => state.open, 3000);
    await click('#tab-files');
    await wait(200);
    await click('#panel-files .clear-all');
    await wait(150);
    await click('#panel-files .clear-all');
    const cleared = await until((state) => shelf.length === 0, 3000);
    const clearSnap = await snap();
    ui('clear', { ok: cleared.ok, shelf: shelf.length, rows: clearSnap.rows, state: clearSnap.state, label: clearSnap.label });
    escape();
    await until((state) => !state.open, 3000);
    await wait(400);
    await park();

    if (!musicView) {
      let quiet = await snap();
      const quietDeadline = Date.now() + 24000;
      while (Date.now() < quietDeadline && quiet.state !== 'quiet' && quiet.state !== 'playing' && quiet.state !== 'paused') {
        await wait(200);
        quiet = await snap();
      }
      if (quiet.state === 'quiet') {
        await wait(250);
        quiet = await snap();
      }
      const quietOk = quiet.state === 'quiet' && quiet.w === 30 && quiet.h === 30;
      ui('quiet', { ok: quietOk, state: quiet.state, w: quiet.w, h: quiet.h, viewport: quiet.viewport });
      if (quietOk) {
        const at = await point('.pill');
        if (at) target.webContents.sendInputEvent({ type: 'mouseMove', x: at.x, y: at.y });
        const woke = await until((state) => state.state !== 'quiet', 3000);
        ui('quietwake', { ok: woke.ok, state: woke.snap.state, w: woke.snap.w });
      }
    }
    console.log('[ui] done');
  }

  async function pillSnapshot(): Promise<{ state: string | null; label: string | null }> {
    if (!win || win.isDestroyed()) return { state: null, label: null };
    try {
      return (await win.webContents.executeJavaScript(
        `(() => {
          const pill = document.querySelector('.pill');
          return {
            state: pill?.dataset.state ?? null,
            label: pill?.querySelector('.title')?.textContent ?? null
          };
        })()`
      )) as { state: string | null; label: string | null };
    } catch {
      return { state: null, label: null };
    }
  }

  async function pokeSession(
    picked: string,
    expect: { app: string; title: string | null },
    tag: string
  ): Promise<boolean> {
    const started = Date.now();
    await bridge.musicPick(picked);
    const seen: string[] = [];
    let matched = false;
    // Windows takes ~6s to hand the current session over, so the budget is 12s.
    while (Date.now() - started < 12000) {
      const snap = await pillSnapshot();
      if (snap.state) seen.push(snap.state);
      if (liveMusicApp === expect.app && (expect.title === null || snap.label === expect.title)) {
        matched = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const blank = seen.filter((state) => state === 'idle').length;
    console.log(
      `[sessions] ${tag} ${JSON.stringify({
        app: expect.app,
        title: expect.title ?? '',
        picked,
        matched,
        blank,
        ms: Date.now() - started
      })}`
    );
    return matched;
  }

  async function waitForPlaying(app: string, want: boolean, ms: number): Promise<boolean> {
    const deadline = Date.now() + ms;
    while (Date.now() < deadline) {
      const rows = await bridge.musicSessions();
      const row = rows.find((entry) => entry.app === app);
      if (row && row.playing === want) return true;
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    return false;
  }

  async function ensurePlaying(app: string): Promise<void> {
    const rows = await bridge.musicSessions();
    if (rows.find((entry) => entry.app === app)?.playing) return;
    await bridge.musicPick(app);
    await waitForPlaying(app, true, 8000);
  }

  async function runMusicSessionsTest(): Promise<void> {
    try {
      const sessions = await bridge.musicSessions();
      console.log(`[sessions] list ${JSON.stringify(sessions)}`);
      const current = sessions.find((row) => row.current) ?? null;
      const other = sessions.find((row) => !row.current) ?? null;
      if (sessions.length < 2 || !current || !other) {
        console.log(`[sessions] skip=one count=${sessions.length} other=${Boolean(other)}`);
        return;
      }
      // Windows never promotes a player that is only paused; it hands the current session over
      // when the player in front stops and another one is playing. So each leg starts the other
      // player and then stops the one in front, and the pill must land on the other app.
      await ensurePlaying(other.app);
      await pokeSession(current.app, { app: other.app, title: other.title }, 'switched');
      const fresh = await bridge.musicSessions();
      const back = fresh.find((row) => row.app === current.app) ?? current;
      await ensurePlaying(back.app);
      await pokeSession(other.app, { app: back.app, title: back.title }, 'back');
    } catch (error) {
      console.error('[sessions] error', error);
    } finally {
      console.log('[sessions] done');
    }
  }

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
    liveMusicApp = music?.app ?? '';
    if (musicSessionsTest && !musicSessionsStarted) {
      musicSessionsStarted = true;
      void runMusicSessionsTest().catch((error: unknown) => {
        console.error('[sessions] error', error);
      });
    }
    if (!music) {
      console.log('[music] none');
    } else {
      console.log(`[music] ${music.title} - ${music.artist} (${music.app})`);
      console.log(`[music] art ${music.art ? 'yes' : 'none'}`);
    }
    void applyMusic(music);
  };
  const bridge = new Bridge(
    join(app.getAppPath(), 'native', 'BeamBridge', 'dist', 'BeamBridge.exe'),
    onHelperEvent,
    () => {
      helperOk = false;
      sendHelperState();
    }
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
      if (panelOpen && !pickingFiles && win && !win.isDestroyed()) {
        panelOpen = false;
        win.webContents.send(IPC.panelDismiss);
      }
    });

    win.on('closed', () => {
      win = null;
    });

    win.webContents.on('will-navigate', (event) => {
      event.preventDefault();
    });

    win.webContents.on('did-finish-load', () => {
      sendMusic();
      sendHelperState();
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
      const openPanel = (): void => {
        if (panelOpen || window.isDestroyed() || !window.isVisible()) return;
        panelOpen = true;
        const bounds = panelBounds(window);
        window.setBounds(bounds);
        applyWindowShape(window);
        console.log(`[panel] bounds=${bounds.x},${bounds.y},${bounds.width},${bounds.height}`);
        window.focus();
        window.webContents.send(IPC.panelOpen, shelfRows());
      };
      const closePanel = (): void => {
        if (!panelOpen || window.isDestroyed()) return;
        panelOpen = false;
        window.webContents.send(IPC.panelDismiss);
      };
      const showPill = (source: string): void => {
        if (window.isDestroyed()) return;
        hiddenByFullscreen = false;
        hiddenByUser = false;
        panelOpen = false;
        window.showInactive();
        console.log(`[fullscreen] shown (${source})`);
      };
      const hideFromTray = (): void => {
        if (window.isDestroyed()) return;
        hiddenByUser = true;
        hiddenByFullscreen = false;
        if (panelOpen) closePanel();
        window.setBounds(pillPosition);
        window.hide();
        console.log('[window] hidden (tray)');
      };
      const quitWithConfirm = (): void => {
        if (window.isDestroyed()) {
          app.quit();
          return;
        }
        const count = shelf.length;
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
        if (panelOpen) {
          panelOpen = false;
          window.webContents.send(IPC.panelDismiss);
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
          if (!window.isVisible() || hiddenByUser) return;
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
      if (globalShortcut.register('Alt+Space', trayToggle)) {
        console.log('[hotkey] Alt+Space');
      } else if (globalShortcut.register('Ctrl+Shift+Space', trayToggle)) {
        console.log('[hotkey] Ctrl+Shift+Space (Alt+Space taken)');
      } else {
        console.error('[hotkey] registration failed');
      }

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
          return { count: shelf.length, accepted: 0, truncated: false, limit: MAX_SHELF, files: shelfRows() };
        }
        const list = Array.isArray(paths)
          ? paths.filter((path): path is string => typeof path === 'string' && path.length > 0 && !path.includes('\0'))
          : [];
        const result = addPaths(list);
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
          const result = addPaths(selection.filePaths);
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

      ipcMain.on(IPC.filesDrag, (event, paths: unknown) => {
        if (event.sender !== window.webContents) return;
        const requested = Array.isArray(paths)
          ? paths.filter((path): path is string => typeof path === 'string' && path.length > 0)
          : [];
        const held = new Map(shelf.map((path) => [path.toLowerCase(), path]));
        const canonical = requested.map((path) => held.get(path.toLowerCase()));
        const dragPaths = canonical.filter((path): path is string => path !== undefined);
        if (!requested.length || dragPaths.length !== requested.length) {
          console.error(`[files] drag rejected requested=${requested.length} inShelf=${dragPaths.length}`);
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
        const icon = nativeImage.createFromPath(join(app.getAppPath(), 'assets', 'tray.ico'));
        console.log(`[files] drag=${dragPaths.length} ok=true`);
        event.sender.startDrag({ file: first, files: dragPaths, icon });
      });

      ipcMain.handle(IPC.filesRemove, (event, path: unknown): { ok: boolean; files: ShelfFile[] } => {
        if (event.sender !== window.webContents) return { ok: false, files: shelfRows() };
        const requested = typeof path === 'string' ? path.toLowerCase() : '';
        const index = requested ? shelf.findIndex((held) => held.toLowerCase() === requested) : -1;
        if (index === -1) {
          console.error(`[files] remove rejected path=${typeof path === 'string' ? path : 'invalid'}`);
          return { ok: false, files: shelfRows() };
        }
        const removed = shelf[index] ?? '';
        shelf.splice(index, 1);
        console.log(`[files] remove=${index} count=${shelf.length} path=${removed}`);
        return { ok: true, files: shelfRows() };
      });

      ipcMain.handle(IPC.filesClear, (event): { ok: boolean; files: ShelfFile[] } => {
        if (event.sender !== window.webContents) return { ok: false, files: shelfRows() };
        const count = shelf.length;
        shelf = [];
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

      ipcMain.on(IPC.pillSize, (event, width: unknown, height: unknown) => {
        if (event.sender !== window.webContents) return;
        if (typeof width !== 'number' || !Number.isFinite(width)) return;
        if (typeof height !== 'number' || !Number.isFinite(height)) return;
        pillSize = {
          width: Math.max(1, Math.min(WINDOW_WIDTH, Math.round(width))),
          height: Math.max(1, Math.min(WINDOW_HEIGHT, Math.round(height)))
        };
        if (!panelOpen) applyWindowShape(window);
      });

      ipcMain.on(IPC.panelRequestOpen, openPanel);
      ipcMain.on(IPC.panelCollapsed, () => {
        if (window.isDestroyed()) return;
        panelOpen = false;
        window.setBounds(pillPosition);
        applyWindowShape(window);
        console.log(
          `[window] pill=${pillPosition.x},${pillPosition.y},${pillPosition.width},${pillPosition.height}`
        );
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
        setTimeout(() => {
          void runDropTest(window).catch((error: unknown) => console.error('[drop] failed', error));
        }, 1200);
      }
      if (copyTest) {
        setTimeout(() => {
          void runCopyTest(window, openPanel).catch((error: unknown) => console.error('[copy] failed', error));
        }, 1200);
      }
      if (dragoutTest) {
        setTimeout(() => {
          void runDragoutTest(window, openPanel, closePanel).catch((error: unknown) =>
            console.error('[dragout] failed', error)
          );
        }, 1200);
      }
      if (missingTest) {
        setTimeout(() => {
          void runMissingTest(window, openPanel, closePanel).catch((error: unknown) =>
            console.error('[missing] failed', error)
          );
        }, 1200);
      }
      if (clearTest) {
        setTimeout(() => {
          void runClearTest(window, openPanel).catch((error: unknown) => console.error('[clear] failed', error));
        }, 1200);
      }
      if (emptyTest) {
        setTimeout(() => {
          void runEmptyTest(window, openPanel).catch((error: unknown) => console.error('[empty] failed', error));
        }, 1200);
      }
      if (musicTabTest) {
        setTimeout(() => {
          if (!window.isDestroyed()) {
            void runMusicTabTest(window, openPanel).catch((error: unknown) =>
              console.error('[music] tab failed', error)
            );
          }
        }, 1200);
      }
      if (uiTest) {
        setTimeout(() => {
          if (!window.isDestroyed()) {
            void runUiTest(window).catch((error: unknown) => console.error('[ui] failed', error));
          }
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

    async function runDragoutTest(
      target: BrowserWindow,
      openPanel: () => void,
      closePanel: () => void
    ): Promise<void> {
      const dir = join(tmpdir(), 'beam-dragout');
      mkdirSync(dir, { recursive: true });
      const paths = ['alpha.txt', 'beta.txt', 'gamma.txt'].map((name) => join(dir, name));
      paths.forEach((path, index) => writeFileSync(path, `beam ${index}\n`));

      const point = (await target.webContents.executeJavaScript(
        `(() => { const pill = document.querySelector('.pill'); if (!pill) return null; const rect = pill.getBoundingClientRect(); return { x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.y + rect.height / 2) }; })()`
      )) as { x: number; y: number } | null;
      if (!point) {
        console.error('[dragout] pill missing');
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
      const row = (await target.webContents.executeJavaScript(
        `(() => {
          const row = document.querySelector('#panel-files [data-drag-path]');
          if (!row) return null;
          const rect = row.getBoundingClientRect();
          return { name: row.querySelector('.name')?.getAttribute('title') ?? '', x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
        })()`
      )) as { name: string; x: number; y: number } | null;
      if (!row) {
        console.error('[dragout] row missing');
        return;
      }
      const content = target.getContentBounds();
      const scale = screen.getDisplayMatching(content).scaleFactor;
      console.log(
        `[dragout] row=${row.name} x=${Math.round(content.x + row.x)} y=${Math.round(content.y + row.y)} scale=${scale}`
      );

      const marker = join(tmpdir(), 'beam-dragout-continue');
      for (let index = 0; index < 150; index++) {
        if (existsSync(marker)) break;
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      unlinkSync(paths[1]);
      closePanel();
      await new Promise((resolve) => setTimeout(resolve, 500));
      openPanel();
      await new Promise((resolve) => setTimeout(resolve, 500));
      await target.webContents.executeJavaScript(`document.querySelector('#tab-files')?.click()`);
      await new Promise((resolve) => setTimeout(resolve, 300));
      const guard = (await target.webContents.executeJavaScript(
        `(() => {
          const rows = [...document.querySelectorAll('#panel-files .row')];
          const names = (list) => list.map((row) => row.querySelector('.name')?.getAttribute('title')).join(',');
          const missing = rows.filter((row) => row.classList.contains('missing'));
          return {
            draggable: names(rows.filter((row) => row.hasAttribute('data-drag-path'))),
            missing: names(missing),
            missingDraggable: missing.some((row) => row.hasAttribute('data-drag-path'))
          };
        })()`
      )) as { draggable: string; missing: string; missingDraggable: boolean };
      console.log(
        `[dragout] guard draggable=${guard.draggable} missing=${guard.missing} missingDraggable=${guard.missingDraggable}`
      );
      await target.webContents.executeJavaScript(`window.beam.startFileDrag(['C:\\\\Windows\\\\not-on-the-shelf.txt'])`);
      await new Promise((resolve) => setTimeout(resolve, 300));
      console.log('[dragout] done');
    }

    async function runMissingTest(
      target: BrowserWindow,
      openPanel: () => void,
      closePanel: () => void
    ): Promise<void> {
      const dir = join(tmpdir(), 'beam-missing');
      mkdirSync(dir, { recursive: true });
      const paths = ['alpha.txt', 'beta.txt', 'gamma.txt'].map((name) => join(dir, name));
      paths.forEach((path, index) => writeFileSync(path, `beam ${index}\n`));

      const point = (await target.webContents.executeJavaScript(
        `(() => { const pill = document.querySelector('.pill'); if (!pill) return null; const rect = pill.getBoundingClientRect(); return { x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.y + rect.height / 2) }; })()`
      )) as { x: number; y: number } | null;
      if (!point) {
        console.error('[missing] pill missing');
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
      const start = (await target.webContents.executeJavaScript(
        `(() => ({ pip: !!document.querySelector('.pill .media-pip.danger'), rows: document.querySelectorAll('#panel-files .row').length }))()`
      )) as { pip: boolean; rows: number };
      console.log(`[missing] start pip=${start.pip} rows=${start.rows}`);

      unlinkSync(paths[1]);
      closePanel();
      await new Promise((resolve) => setTimeout(resolve, 500));
      openPanel();
      await new Promise((resolve) => setTimeout(resolve, 500));
      await target.webContents.executeJavaScript(`document.querySelector('#tab-files')?.click()`);
      await new Promise((resolve) => setTimeout(resolve, 300));
      const end = (await target.webContents.executeJavaScript(
        `(() => {
          const rows = [...document.querySelectorAll('#panel-files .row')];
          const gone = rows.filter((row) => row.classList.contains('missing'));
          return {
            badge: gone.map((row) => row.querySelector('.row-meta')?.textContent).join(','),
            title: gone.map((row) => row.querySelector('.row-meta')?.getAttribute('title')).join(','),
            copies: gone.reduce((count, row) => count + row.querySelectorAll('[data-copy-path]').length, 0),
            drags: rows.filter((row) => row.hasAttribute('data-drag-path')).length,
            pip: !!document.querySelector('.pill .media-pip.danger')
          };
        })()`
      )) as { badge: string; title: string; copies: number; drags: number; pip: boolean };
      console.log(
        `[missing] end badge=${end.badge} title=${end.title} copies=${end.copies} drags=${end.drags} pip=${end.pip}`
      );
      console.log('[missing] done');
    }

    type ShelfSnapshot = { rows: number; note: string; well: boolean; state: string; title: string };

    const shelfSnapshot = async (target: BrowserWindow): Promise<ShelfSnapshot> =>
      (await target.webContents.executeJavaScript(
        `(() => {
          const body = document.querySelector('#panel-files');
          const pill = document.querySelector('.pill');
          return {
            rows: body ? body.querySelectorAll('.row').length : -1,
            note: body?.querySelector('.shelf-note')?.textContent ?? '',
            well: !!body?.querySelector('.drop-well'),
            state: pill?.dataset.state ?? '',
            title: pill?.querySelector('.title')?.textContent ?? ''
          };
        })()`
      )) as ShelfSnapshot;

    async function runClearTest(target: BrowserWindow, openPanel: () => void): Promise<void> {
      const dir = join(tmpdir(), 'beam-clear');
      mkdirSync(dir, { recursive: true });
      const paths = ['alpha.txt', 'beta.txt', 'gamma.txt'].map((name) => join(dir, name));
      paths.forEach((path, index) => writeFileSync(path, `beam ${index}\n`));

      const point = (await target.webContents.executeJavaScript(
        `(() => { const pill = document.querySelector('.pill'); if (!pill) return null; const rect = pill.getBoundingClientRect(); return { x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.y + rect.height / 2) }; })()`
      )) as { x: number; y: number } | null;
      if (!point) {
        console.error('[clear] pill missing');
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
      const three = await shelfSnapshot(target);
      console.log(`[clear] three rows=${three.rows} note=${three.note} well=${three.well} state=${three.state} title=${three.title}`);

      await target.webContents.executeJavaScript(`document.querySelector('#panel-files [data-remove-path]')?.click()`);
      await new Promise((resolve) => setTimeout(resolve, 600));
      const removed = await shelfSnapshot(target);
      console.log(
        `[clear] removed rows=${removed.rows} note=${removed.note} well=${removed.well} state=${removed.state} title=${removed.title}`
      );

      await target.webContents.executeJavaScript(`document.querySelector('#panel-files .clear-all')?.click()`);
      await new Promise((resolve) => setTimeout(resolve, 300));
      await target.webContents.executeJavaScript(`document.querySelector('#panel-files .clear-all')?.click()`);
      await new Promise((resolve) => setTimeout(resolve, 600));
      const empty = await shelfSnapshot(target);
      console.log(`[clear] empty rows=${empty.rows} note=${empty.note} well=${empty.well} state=${empty.state} title=${empty.title}`);
      console.log('[clear] done');
    }

    async function runEmptyTest(target: BrowserWindow, openPanel: () => void): Promise<void> {
      openPanel();
      await new Promise((resolve) => setTimeout(resolve, 500));
      await target.webContents.executeJavaScript(`document.querySelector('#tab-files')?.click()`);
      await new Promise((resolve) => setTimeout(resolve, 300));
      const state = await shelfSnapshot(target);
      console.log(`[empty] rows=${state.rows} well=${state.well} state=${state.state} title=${state.title}`);
      console.log('[empty] done');
    }
  });

  let quitting = false;

  app.on('will-quit', (event) => {
    if (quitting) return;
    quitting = true;
    globalShortcut.unregisterAll();
    event.preventDefault();
    void bridge.stop().finally(() => app.quit());
  });

  app.on('window-all-closed', () => {
    app.quit();
  });
}
