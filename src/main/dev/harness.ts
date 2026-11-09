import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { screen, type BrowserWindow } from 'electron';
import { IPC, type MusicState } from '../../shared/ipc';
import type { Bridge } from '../bridge';
import type { MusicPayload } from '../music';
import type { Shelf } from '../shelf';

export interface HarnessContext {
  window: () => BrowserWindow | null;
  shelf: Shelf;
  bridge: Bridge;
  music: () => MusicState | null;
  liveApp: () => string;
  sendMusic: () => void;
}

export type DevHooks = {
  panel: boolean;
  reset: boolean;
  idle: boolean;
  settings: string;
  fullscreen: boolean;
  drop: boolean;
  copy: boolean;
  dragout: boolean;
  missing: boolean;
  clear: boolean;
  empty: boolean;
  music: boolean;
  musicCmd: boolean;
  musicTab: boolean;
  sessions: boolean;
  ui: boolean;
  uiPhase: string;
  timer: boolean;
  timerHidden: boolean;
  timerScaleMs: number;
};

export function readHooks(env: NodeJS.ProcessEnv = process.env): DevHooks {
  const scale = Number(env.BEAM_TIMER_SCALE_MS ?? '');
  return {
    panel: env.BEAM_PANEL_TEST === '1',
    reset: env.BEAM_RESET_TEST === '1',
    idle: env.BEAM_IDLE_TEST === '1',
    settings: env.BEAM_SETTINGS_TEST ?? '',
    fullscreen: env.BEAM_FULLSCREEN_TEST === '1',
    drop: env.BEAM_DROP_TEST === '1',
    copy: env.BEAM_COPY_TEST === '1',
    dragout: env.BEAM_DRAGOUT_TEST === '1',
    missing: env.BEAM_MISSING_TEST === '1',
    clear: env.BEAM_CLEAR_TEST === '1',
    empty: env.BEAM_EMPTY_TEST === '1',
    music: env.BEAM_MUSIC_TEST === '1',
    musicCmd: env.BEAM_MUSIC_CMD_TEST === '1',
    musicTab: env.BEAM_MUSIC_TAB_TEST === '1',
    sessions: env.BEAM_MUSIC_SESSIONS_TEST === '1',
    ui: env.BEAM_UI_TEST === '1',
    uiPhase: env.BEAM_UI_TEST_PHASE ?? 'all',
    timer: env.BEAM_TIMER_TEST === '1',
    timerHidden: env.BEAM_TIMER_HIDDEN_TEST === '1',
    timerScaleMs: Number.isFinite(scale) && scale > 0 ? scale : 60_000
  };
}

export interface DevActions {
  openPanel: () => void;
  closePanel: () => void;
  resetPosition: () => void;
  trayToggle: () => void;
}

function runTask(label: string, task: () => Promise<void>): void {
  void task().catch((error: unknown) => console.error(`[${label}] error`, error));
}

export function afterShow(hooks: DevHooks, target: BrowserWindow, startHiddenTimer: () => void): void {
  if (hooks.timerHidden) {
    setTimeout(() => {
      if (!target.isDestroyed()) startHiddenTimer();
    }, 1500);
  }
  if (hooks.idle) {
    setTimeout(() => {
      if (!target.isDestroyed()) probeIdle(target);
    }, 800);
  }
}

export function scheduleReady(
  hooks: DevHooks,
  target: BrowserWindow,
  ctx: HarnessContext,
  actions: DevActions
): void {
  const later = (ms: number, label: string, task: () => Promise<void>): void => {
    setTimeout(() => {
      if (!target.isDestroyed()) runTask(label, task);
    }, ms);
  };

  if (hooks.panel) {
    setTimeout(() => {
      if (target.isDestroyed()) return;
      actions.openPanel();
      console.log('[panel] test-open');
    }, 8000);
    setTimeout(() => {
      if (target.isDestroyed()) return;
      actions.closePanel();
      console.log('[panel] test-dismiss');
    }, 9600);
  }
  if (hooks.reset) {
    setTimeout(() => {
      if (!target.isDestroyed()) actions.resetPosition();
    }, 1200);
  }
  if (hooks.drop) later(1200, 'drop', () => runDropTest(target));
  if (hooks.copy) later(1200, 'copy', () => runCopyTest(target, actions.openPanel));
  if (hooks.dragout) later(1200, 'dragout', () => runDragoutTest(target, actions.openPanel, actions.closePanel));
  if (hooks.missing) later(1200, 'missing', () => runMissingTest(target, actions.openPanel, actions.closePanel));
  if (hooks.clear) later(1200, 'clear', () => runClearTest(target, actions.openPanel));
  if (hooks.empty) later(1200, 'empty', () => runEmptyTest(target, actions.openPanel));
  if (hooks.settings) {
    const start = (): void => {
      if (target.isDestroyed()) return;
      runTask('settings', () => runSettingsTest(target, hooks.settings === '1' ? 'on' : 'off', actions.openPanel));
    };
    if (target.isVisible()) setTimeout(start, 1200);
    else target.once('show', () => setTimeout(start, 1200));
  }
  if (hooks.musicTab) later(1200, 'music', () => runMusicTabTest(ctx, target, actions.openPanel));
  if (hooks.ui) later(1200, 'ui', () => runUiTest(ctx, target, hooks.uiPhase));
  if (hooks.timer) later(1200, 'timer', () => runTimerTest(target, actions.openPanel));
}

let musicCmdStarted = false;
let musicSessionsStarted = false;

export function onMusicPayload(
  hooks: DevHooks,
  payload: MusicPayload | null,
  ctx: HarnessContext,
  applyMusic: () => void
): void {
  if (hooks.sessions && !musicSessionsStarted) {
    musicSessionsStarted = true;
    runTask('sessions', () => runMusicSessionsTest(ctx));
  }
  if (hooks.music) {
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
  applyMusic();
  if (hooks.musicCmd && !musicCmdStarted && payload && (payload.title || payload.artist)) {
    musicCmdStarted = true;
    runTask('music', () => runMusicCommandTest(ctx));
  }
}

export function onFullscreen(
  hooks: DevHooks,
  active: boolean,
  target: BrowserWindow,
  actions: { trayToggle: () => void; timerPhase: () => string }
): void {
  if (active) {
    if (hooks.fullscreen) {
      setTimeout(() => {
        if (!target.isDestroyed()) actions.trayToggle();
      }, 1500);
    }
    return;
  }
  if (hooks.timerHidden && actions.timerPhase() === 'done') {
    setTimeout(() => {
      if (target.isDestroyed()) return;
      void target.webContents
        .executeJavaScript(`document.querySelector('.pill')?.dataset.state ?? null`)
        .then((state: unknown) => console.log(`[timer] hidden shown state=${String(state)}`))
        .catch(() => {});
    }, 700);
  }
}

export function probeMusic(target: BrowserWindow, started: number, attempt = 0): void {
  if (target.isDestroyed()) return;
  void target.webContents
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
      if (attempt < 20) setTimeout(() => probeMusic(target, started, attempt + 1), 100);
    });
}

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function moveCursor(x: number, y: number): void {
  const script = `Add-Type -TypeDefinition 'using System;using System.Runtime.InteropServices;public static class BeamNear{[DllImport("user32.dll")]public static extern bool SetCursorPos(int x,int y);}';[BeamNear]::SetCursorPos(${Math.round(x)},${Math.round(y)}) | Out-Null`;
  spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true, timeout: 5000 });
}

export async function waitForMusic(check: () => boolean, ms: number): Promise<boolean> {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (check()) return true;
    await delay(40);
  }
  return check();
}

export async function clickTransport(ctx: HarnessContext, action: 'prev' | 'toggle' | 'next'): Promise<boolean> {
  const win = ctx.window();
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

export async function runMusicCommandTest(ctx: HarnessContext): Promise<void> {
  const win = ctx.window();
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

  const start = ctx.music();
  if (!start) {
    console.log('[music] cmd skipped=no-session');
    return;
  }

  let started = Date.now();
  const fromPlaying = start.playing;
  const clicked = await clickTransport(ctx, 'toggle');
  const flipped = clicked && (await waitForMusic(() => { const view = ctx.music(); return view !== null && view.playing !== fromPlaying; }, 6000));
  console.log(
    `[music] toggle ${JSON.stringify({
      from: fromPlaying,
      to: ctx.music()?.playing ?? null,
      ok: flipped,
      ms: Date.now() - started
    })}`
  );

  const current = ctx.music();
  if (current && !current.playing) {
    started = Date.now();
    const back = await clickTransport(ctx, 'toggle');
    const resumed = back && (await waitForMusic(() => ctx.music()?.playing === true, 6000));
    console.log(
      `[music] resume ${JSON.stringify({
        from: false,
        to: ctx.music()?.playing ?? null,
        ok: resumed,
        ms: Date.now() - started
      })}`
    );
  }

  const beforeTitle = ctx.music()?.title ?? '';
  started = Date.now();
  const nextClicked = await clickTransport(ctx, 'next');
  const nextChanged =
    nextClicked && (await waitForMusic(() => { const view = ctx.music(); return view !== null && view.title !== beforeTitle; }, 8000));
  console.log(
    `[music] next ${JSON.stringify({
      from: beforeTitle,
      to: ctx.music()?.title ?? '',
      ok: nextChanged,
      ms: Date.now() - started
    })}`
  );

  const afterTitle = ctx.music()?.title ?? '';
  started = Date.now();
  const prevClicked = await clickTransport(ctx, 'prev');
  const prevChanged =
    prevClicked && (await waitForMusic(() => { const view = ctx.music(); return view !== null && view.title !== afterTitle; }, 8000));
  console.log(
    `[music] prev ${JSON.stringify({
      from: afterTitle,
      to: ctx.music()?.title ?? '',
      ok: prevChanged,
      ms: Date.now() - started
    })}`
  );
  console.log('[music] cmd done');
}

export async function runMusicTabTest(ctx: HarnessContext, target: BrowserWindow, openPanel: () => void): Promise<void> {
  const deadline = Date.now() + 12000;
  while (!ctx.music() && Date.now() < deadline) {
    await delay(200);
  }
  if (!ctx.music()) {
    console.log('[music] tab skipped=no-session');
    return;
  }
  if (target.isDestroyed()) return;

  const payload = { ...ctx.music() };
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
      subtitle: panel?.querySelector('.music-artist-name')?.textContent ?? null,
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
    const second = (await target.webContents.executeJavaScript(probe)) as {
      bar?: { now: number; max: number; fill: string | null };
    };
    console.log(`[music] tabtick ${JSON.stringify(second)}`);

    const seekBar = (await target.webContents.executeJavaScript(
      `(() => {
        const rect = document.querySelector('#panel-music [data-music-bar]')?.getBoundingClientRect();
        return rect ? { x: rect.x, y: rect.y, w: rect.width, h: rect.height } : null;
      })()`
    )) as { x: number; y: number; w: number; h: number } | null;
    let seekTarget = -1;
    let seekDom = -1;
    let seekMax = -1;
    let seekFill: string | null = null;
    if (seekBar) {
      seekTarget = Math.round((Number(second.bar?.max ?? 0) || 0) * 0.7);
      const x = Math.round(seekBar.x + seekBar.w * 0.7);
      const y = Math.round(seekBar.y + seekBar.h / 2);
      target.webContents.sendInputEvent({ type: 'mouseMove', x, y });
      await delay(60);
      target.webContents.sendInputEvent({ type: 'mouseDown', x, y, button: 'left', clickCount: 1 });
      await delay(80);
      target.webContents.sendInputEvent({ type: 'mouseUp', x, y, button: 'left', clickCount: 1 });
      await delay(900);
      const afterSeek = (await target.webContents.executeJavaScript(probe)) as {
        bar?: { now: number; max: number; fill: string | null };
      };
      seekDom = Number(afterSeek.bar?.now ?? -1);
      seekMax = Number(afterSeek.bar?.max ?? -1);
      seekFill = afterSeek.bar?.fill ?? null;
    }

    const beforeToggle = ctx.music()?.playing ?? false;
    const toggleTo = async (want: boolean): Promise<boolean> => {
      await target.webContents.executeJavaScript(`document.querySelector('#panel-music [data-action="toggle"]')?.click()`);
      return waitForMusic(() => {
        const view = ctx.music();
        return view !== null && view.playing === want;
      }, 8000);
    };
    const flipped = await toggleTo(!beforeToggle);
    const playerAfterSeek = ctx.music() ? Math.round(ctx.music()!.positionMs / 1000) : -1;
    const restored = await toggleTo(beforeToggle);
    console.log(`[music] tabtoggle ${JSON.stringify({ from: beforeToggle, flipped, restored })}`);
    if (seekBar) {
      console.log(
        `[music] tabseek ${JSON.stringify({
          ok: Math.abs(seekDom - seekTarget) <= 4 && Math.abs(playerAfterSeek - seekTarget) <= 6,
          target: seekTarget,
          dom: seekDom,
          player: playerAfterSeek,
          max: seekMax,
          fill: seekFill
        })}`
      );
    } else {
      console.log('[music] tabseek {"ok":false,"reason":"no-bar"}');
    }

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

export async function runUiTest(ctx: HarnessContext, target: BrowserWindow, phase: string): Promise<void> {
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
  // A live track turns the hovered pill's middle into transports, so the centre click only
  // opens the panel when no session exists. With music, open through the hover chevron.
  const openPanel = async (): Promise<boolean> => {
    await park();
    if (ctx.music()) {
      const at = await point('.pill');
      if (at) target.webContents.sendInputEvent({ type: 'mouseMove', x: at.x, y: at.y });
      await wait(260);
      return click('.pill [data-action="panel"]');
    }
    return click('.pill');
  };

  await wait(500);
  const start = await snap();
  ui('start', { phase, state: start.state, music: Boolean(ctx.music()), chevron: start.chevron, w: start.w, h: start.h, viewport: start.viewport });
  if (ctx.music()) ui('quiet', { skipped: 'music' });

  if (phase === 'chevron') {
    const musicStop = Date.now() + 5000;
    while (!ctx.music() && Date.now() < musicStop) await wait(100);
    if (!ctx.music()) {
      ui('chevron', { skipped: 'no-music' });
      console.log('[ui] done');
      return;
    }
    await park();
    const pillAt = await point('.pill');
    if (pillAt) target.webContents.sendInputEvent({ type: 'mouseMove', x: pillAt.x, y: pillAt.y });
    await wait(260);
    const clicked = await click('.pill [data-action="panel"]');
    const chevron = await until((state) => state.open, 3000);
    ui('chevron', { ok: clicked && chevron.ok, selected: chevron.snap.selected });
    console.log('[ui] done');
    return;
  }

  const dir = join(tmpdir(), 'beam-uitest');
  mkdirSync(dir, { recursive: true });
  const paths = ['ui-one.txt', 'ui-two.txt', 'ui-three.txt'].map((name) => join(dir, name));
  paths.forEach((path, index) => writeFileSync(path, `beam ${index}\n`));
  // CDP Input.dispatchDragEvent collapses every synthetic drag to dragenter in this Electron,
  // so the shelf is filled through the same IPC the picker uses.
  const added = (await target.webContents.executeJavaScript(
    `window.beam.addFiles(${JSON.stringify(paths)}).then((result) => ({ accepted: result.accepted, count: result.count }))`
  )) as { accepted: number; count: number };
  const dropped = await until(() => ctx.shelf.count === 3, 3000);
  ui('add', { accepted: added.accepted, shelf: ctx.shelf.count, ok: dropped.ok, state: dropped.snap.state, label: dropped.snap.label });

  const openedClick = await openPanel();
  const opened = await until((state) => state.open, 3000);
  ui('open', {
    ok: opened.ok && openedClick,
    selected: opened.snap.selected,
    want: ctx.music() ? 'music' : 'files',
    chevron: opened.snap.chevron
  });
  await click('#tab-files');
  await wait(150);

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
      shelf: ctx.shelf.count
    });
  } else {
    ui('undo', { ok: false, reason: 'no-remove-button' });
  }

  await click('#tab-timer');
  await wait(150);
  const idleTimer = await snap();
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
    actionBottom: running.snap.actionBottom,
    idleFaceTop: idleTimer.faceTop,
    idleActionBottom: idleTimer.actionBottom
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

  if (phase === 'quiet') {
    ui('chevron', { skipped: 'quiet-phase' });
  } else if (ctx.music()) {
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

  const reopenedClick = await openPanel();
  const reopened = await until((state) => state.open, 3000);
  ui('lastused', { ok: reopened.ok && reopenedClick, selected: reopened.snap.selected });
  escape();
  await until((state) => !state.open, 3000);
  await wait(250);

  if (ctx.music()) {
    target.webContents.send(IPC.musicState, null);
    const dropped2 = await until((state) => state.state !== 'playing' && state.state !== 'paused', 2000);
    ui('nullstate', { ok: dropped2.ok, state: dropped2.snap.state });
    ctx.sendMusic();
    await wait(300);
  } else {
    ui('nullstate', { skipped: 'no-music' });
  }

  await openPanel();
  await until((state) => state.open, 3000);
  await click('#tab-files');
  await wait(200);
  await click('#panel-files .clear-all');
  await wait(150);
  await click('#panel-files .clear-all');
  const cleared = await until(() => ctx.shelf.count === 0, 3000);
  const clearSnap = await snap();
  ui('clear', { ok: cleared.ok, shelf: ctx.shelf.count, rows: clearSnap.rows, state: clearSnap.state, label: clearSnap.label });
  escape();
  await until((state) => !state.open, 3000);
  await wait(400);
  await park();

  await openPanel();
  await until((state) => state.open, 3000);
  await click('#tab-settings');
  await wait(200);
  const settingsUi = (await target.webContents.executeJavaScript(
    `(() => {
      const body = document.querySelector('#panel-settings');
      return {
        rows: body ? body.querySelectorAll('.setting').length : 0,
        startup: Boolean(body?.querySelector('[data-setting="startup"]')),
        chord: Boolean(body?.querySelector('[data-setting="shortcut"]')),
        volume: Boolean(body?.querySelector('[data-volume-step="10"]')),
        theme: Boolean(body?.querySelector('[data-setting="theme"]')),
        reset: Boolean(body?.querySelector('[data-setting="reset"]')),
        themeName: document.documentElement.dataset.theme ?? null,
        selected: [...document.querySelectorAll('[role="tab"][aria-selected="true"]')].map((tab) =>
          tab.id.replace('tab-', '')
        )
      };
    })()`
  )) as {
    rows: number;
    startup: boolean;
    chord: boolean;
    volume: boolean;
    theme: boolean;
    reset: boolean;
    themeName: string | null;
    selected: string[];
  };
  ui('settings', settingsUi);
  escape();
  await until((state) => !state.open, 3000);
  await wait(300);
  await park();

  if (!ctx.music()) {
    const workArea = screen.getPrimaryDisplay().workArea;
    moveCursor(workArea.x + 8, workArea.y + 8);
    let quiet = await snap();
    const quietDeadline = Date.now() + 30000;
    while (Date.now() < quietDeadline && quiet.state !== 'quiet' && quiet.state !== 'playing' && quiet.state !== 'paused') {
      await wait(200);
      quiet = await snap();
    }
    if (quiet.state === 'quiet') {
      await wait(250);
      quiet = await snap();
    }
    const quietOk = quiet.state === 'quiet' && quiet.w === 26 && quiet.h === 26;
    ui('quiet', { ok: quietOk, state: quiet.state, w: quiet.w, h: quiet.h, viewport: quiet.viewport });
    if (quietOk) {
      const bounds = target.getBounds();
      const centerX = Math.round(bounds.x + bounds.width / 2);
      const centerY = Math.round(bounds.y + bounds.height / 2);
      moveCursor(centerX + 32, centerY);
      const near = await until((state) => state.state !== 'quiet' && state.w === 94, 3000);
      ui('near', { ok: near.ok, state: near.snap.state, w: near.snap.w });
      moveCursor(workArea.x + 8, workArea.y + 8);
      const leftAt = Date.now();
      const away = await until((state) => state.state === 'quiet' && state.w === 26, 4500);
      ui('nearleave', { ok: away.ok, state: away.snap.state, w: away.snap.w, ms: Date.now() - leftAt });
      if (away.ok) {
        const at = await point('.pill');
        if (at) target.webContents.sendInputEvent({ type: 'mouseMove', x: at.x, y: at.y });
        const woke = await until((state) => state.state !== 'quiet' && state.w === 94, 3000);
        ui('quietwake', { ok: woke.ok, state: woke.snap.state, w: woke.snap.w });
      }
    }
  }
  console.log('[ui] done');
}

export async function runTimerTest(target: BrowserWindow, openPanel: () => void): Promise<void> {
  const log = (tag: string, data: unknown): void => console.log(`[timer] ui ${tag} ${JSON.stringify(data)}`);
  const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
  const read = async (): Promise<{ state: string | null; digits: string | null; panel: string | null; done: boolean }> =>
    (await target.webContents.executeJavaScript(
      `(() => {
        const pill = document.querySelector('.pill');
        const body = document.querySelector('#panel-timer');
        return {
          state: pill?.dataset.state ?? null,
          digits: pill?.querySelector('.digits')?.textContent ?? null,
          panel: body?.className ?? null,
          done: Boolean(body?.querySelector('.timer-done'))
        };
      })()`
    )) as { state: string | null; digits: string | null; panel: string | null; done: boolean };
  const until = async (
    want: (view: { state: string | null; digits: string | null; panel: string | null; done: boolean }) => boolean,
    ms: number
  ): Promise<{ ok: boolean; view: Awaited<ReturnType<typeof read>> }> => {
    const deadline = Date.now() + ms;
    let view = await read();
    while (Date.now() < deadline && !want(view)) {
      await wait(100);
      view = await read();
    }
    return { ok: want(view), view };
  };

  try {
    openPanel();
    await wait(500);
    await target.webContents.executeJavaScript(`document.querySelector('#tab-timer')?.click()`);
    await wait(200);
    await target.webContents.executeJavaScript(`document.querySelector('#panel-timer [data-timer-preset="5"]')?.click()`);
    await wait(150);
    await target.webContents.executeJavaScript(`document.querySelector('#panel-timer [data-timer-start]')?.click()`);
    const running = await until((view) => view.state === 'timer', 2500);
    log('run', { ok: running.ok, state: running.view.state, digits: running.view.digits, panel: running.view.panel });

    await target.webContents.executeJavaScript(`document.querySelector('#panel-timer [data-timer-cancel]')?.click()`);
    const cancelled = await until((view) => view.state !== 'timer', 2500);
    log('cancel', { ok: cancelled.ok, state: cancelled.view.state, digits: cancelled.view.digits });

    await target.webContents.executeJavaScript(`window.beam.startTimer(5)`);
    await wait(120);
    const replacedAt = Date.now();
    await target.webContents.executeJavaScript(`window.beam.startTimer(1)`);
    const completed = await until((view) => view.done, 6000);
    const elapsedMs = Date.now() - replacedAt;
    log('done', {
      ok: completed.ok,
      state: completed.view.state,
      digits: completed.view.digits,
      panel: completed.view.panel,
      elapsedMs
    });
    await wait(1200);

    await target.webContents.executeJavaScript(`document.querySelector('#panel-timer [data-timer-dismiss]')?.click()`);
    const dismissed = await until((view) => view.state !== 'done', 2500);
    log('dismiss', { ok: dismissed.ok, state: dismissed.view.state, done: dismissed.view.done });
  } catch (error) {
    console.error('[timer] ui failed', error);
  }
  console.log('[timer] ui done');
}

export async function pillSnapshot(ctx: HarnessContext): Promise<{ state: string | null; label: string | null }> {
  const win = ctx.window();
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

// The suite's own players are the only rows whose title starts with 'Beam verify'. A real
// Chrome window carries the same app id as the test player, so rows are addressed by title
// and toggled by their live index; app-id picks would hit whatever tab came first.
const SUITE_TITLE = 'Beam verify';

function isSuiteRow(row: { title: string }): boolean {
  return row.title.startsWith(SUITE_TITLE);
}

async function suiteRow(ctx: HarnessContext, title: string) {
  const rows = await ctx.bridge.musicSessions();
  return rows.find((row) => row.title === title) ?? null;
}

export async function pokeSession(
  ctx: HarnessContext,
  picked: string,
  expect: { app: string; title: string | null },
  tag: string
): Promise<boolean> {
  const started = Date.now();
  const row = await suiteRow(ctx, picked);
  if (!row) {
    console.log(`[sessions] ${tag} ${JSON.stringify({ app: expect.app, title: expect.title ?? '', picked, matched: false, blank: 0, ms: 0 })}`);
    return false;
  }
  await ctx.bridge.musicPick(row.app, row.index, row.title);
  const seen: string[] = [];
  let matched = false;
  // Windows takes ~6s to hand the current session over, so the budget is 12s.
  while (Date.now() - started < 12000) {
    const snap = await pillSnapshot(ctx);
    if (snap.state) seen.push(snap.state);
    if (ctx.liveApp() === expect.app && (expect.title === null || snap.label === expect.title)) {
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

export async function ensurePlaying(ctx: HarnessContext, title: string): Promise<boolean> {
  const first = await suiteRow(ctx, title);
  if (!first) return false;
  if (first.playing) return true;
  await ctx.bridge.musicPick(first.app, first.index, first.title);
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 150));
    if ((await suiteRow(ctx, title))?.playing) return true;
  }
  return false;
}

export async function runMusicSessionsTest(ctx: HarnessContext): Promise<void> {
  try {
    const sessions = await ctx.bridge.musicSessions();
    console.log(`[sessions] list ${JSON.stringify(sessions)}`);
    const suite = sessions.filter(isSuiteRow);
    const current = suite.find((row) => row.current) ?? suite[0] ?? null;
    const other = suite.find((row) => row !== current) ?? null;
    if (suite.length < 2 || !current || !other) {
      console.log(`[sessions] skip=one count=${suite.length} other=${Boolean(other)}`);
      return;
    }
    // Windows never promotes a player that is only paused; it hands the current session over
    // when the player in front stops and another one is playing. So each leg starts the other
    // player and then stops the one in front, and the pill must land on the other app.
    if (!(await ensurePlaying(ctx, other.title))) {
      console.log(`[sessions] skip=one count=${suite.length} other=false`);
      return;
    }
    await pokeSession(ctx, current.title, { app: other.app, title: other.title }, 'switched');
    const fresh = await ctx.bridge.musicSessions();
    const back = fresh.find((row) => row.title === current.title) ?? current;
    await ensurePlaying(ctx, back.title);
    await pokeSession(ctx, other.title, { app: back.app, title: back.title }, 'back');
  } catch (error) {
    console.error('[sessions] error', error);
  } finally {
    console.log('[sessions] done');
  }
}


export async function runDropTest(target: BrowserWindow): Promise<void> {
  while (!target.isDestroyed()) {
    try {
      const dom = (await target.webContents.executeJavaScript(
        `(() => { const pill = document.querySelector('.pill'); const title = pill?.querySelector('.title'); return { state: pill?.dataset.state ?? null, title: title?.textContent ?? null }; })()`
      )) as { state: string | null; title: string | null };
      console.log(`[drop] watch state=${dom.state} title=${dom.title}`);
    } catch {
      if (target.isDestroyed()) return;
    }
    await delay(500);
  }
}

export async function runCopyTest(target: BrowserWindow, openPanel: () => void): Promise<void> {
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

export async function runDragoutTest(
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
  await target.webContents.executeJavaScript(`window.beam.startFileDrag(['C:\\\\Windows\\\\not-on-the-ctx.shelf.txt'])`);
  await new Promise((resolve) => setTimeout(resolve, 300));
  console.log('[dragout] done');
}

export async function runMissingTest(
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

export async function runClearTest(target: BrowserWindow, openPanel: () => void): Promise<void> {
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

  await new Promise((resolve) => setTimeout(resolve, 5600));
  const warning = await shelfSnapshot(target);
  console.log(
    `[clear] warning rows=${warning.rows} note=${warning.note} well=${warning.well} state=${warning.state} title=${warning.title}`
  );

  await target.webContents.executeJavaScript(`document.querySelector('#panel-files .clear-all')?.click()`);
  await new Promise((resolve) => setTimeout(resolve, 300));
  await target.webContents.executeJavaScript(`document.querySelector('#panel-files .clear-all')?.click()`);
  await new Promise((resolve) => setTimeout(resolve, 600));
  const empty = await shelfSnapshot(target);
  console.log(`[clear] empty rows=${empty.rows} note=${empty.note} well=${empty.well} state=${empty.state} title=${empty.title}`);
  console.log('[clear] done');
}

export async function runEmptyTest(target: BrowserWindow, openPanel: () => void): Promise<void> {
  openPanel();
  await new Promise((resolve) => setTimeout(resolve, 500));
  await target.webContents.executeJavaScript(`document.querySelector('#tab-files')?.click()`);
  await new Promise((resolve) => setTimeout(resolve, 300));
  const state = await shelfSnapshot(target);
  console.log(`[empty] rows=${state.rows} well=${state.well} state=${state.state} title=${state.title}`);
  console.log('[empty] done');
}

export function probeIdle(target: BrowserWindow): void {
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
}

export async function runSettingsTest(
  target: BrowserWindow,
  phase: string,
  openPanel: (tab?: 'settings') => void
): Promise<void> {
  try {
    const js = async <T>(code: string): Promise<T> => (await target.webContents.executeJavaScript(code)) as T;
    const point = async (selector: string): Promise<{ x: number; y: number } | null> =>
      (await js<{ x: number; y: number } | null>(`(() => {
        const rect = document.querySelector(${JSON.stringify(selector)})?.getBoundingClientRect();
        return rect ? { x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) } : null;
      })()`));
    const click = async (selector: string): Promise<boolean> => {
      const at = await point(selector);
      if (!at) return false;
      target.webContents.sendInputEvent({ type: 'mouseMove', x: at.x, y: at.y });
      await delay(60);
      target.webContents.sendInputEvent({ type: 'mouseDown', x: at.x, y: at.y, button: 'left', clickCount: 1 });
      target.webContents.sendInputEvent({ type: 'mouseUp', x: at.x, y: at.y, button: 'left', clickCount: 1 });
      return true;
    };
    const read = async (): Promise<{ startup: boolean; shortcut: string; volume: number; theme: string }> =>
      js(`window.beam.getSettings()`);
    const until = async <T>(get: () => Promise<T>, want: (value: T) => boolean, ms: number): Promise<T> => {
      const deadline = Date.now() + ms;
      let value = await get();
      while (Date.now() < deadline && !want(value)) {
        await delay(250);
        value = await get();
      }
      return value;
    };

    openPanel('settings');
    const rows = await until(
      () => js<number>(`document.querySelectorAll('#panel-settings .setting').length`),
      (count) => count === 5,
      3000
    );
    if (rows !== 5) throw new Error(`the Settings tab did not open (rows=${rows})`);

    if (phase === 'on') {
      if (!(await click('[data-setting="theme"]'))) throw new Error('no theme switch');
      const theme = await until(read, (value) => value.theme === 'light', 2000);
      const applied = await js<string>(`document.documentElement.dataset.theme`);
      if (theme.theme !== 'light' || applied !== 'light') throw new Error('the theme switch did not apply light');
      console.log(`[settings] test theme ${JSON.stringify({ ok: true, theme: theme.theme, applied })}`);

      await click('[data-volume-step="10"]');
      await delay(300);
      await click('[data-volume-step="10"]');
      const volume = await until(read, (value) => value.volume === 80, 2000);
      if (volume.volume !== 80) throw new Error(`the volume stepper left ${volume.volume}%`);
      console.log(`[settings] test volume ${JSON.stringify({ ok: true, volume: volume.volume })}`);

      if (!(await click('[data-setting="shortcut"]'))) throw new Error('no shortcut keycaps');
      const capturing = await until(
        () => js<boolean>(`Boolean(document.querySelector('.kbd.capturing'))`),
        Boolean,
        1500
      );
      if (!capturing) throw new Error('the shortcut did not enter capture');
      target.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'B', modifiers: ['control', 'alt'] });
      target.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'B', modifiers: ['control', 'alt'] });
      const chord = await until(read, (value) => value.shortcut === 'Ctrl+Alt+B', 2500);
      if (chord.shortcut !== 'Ctrl+Alt+B') throw new Error(`the chord stayed ${chord.shortcut}`);
      console.log(`[settings] test chord ${JSON.stringify({ ok: true, shortcut: chord.shortcut })}`);

      if (!(await click('[data-setting="startup"]'))) throw new Error('no startup switch');
      const startup = await until(read, (value) => value.startup, 3000);
      if (!startup.startup) throw new Error('the startup switch did not turn on');
      console.log(`[settings] test startup ${JSON.stringify({ ok: true, startup: startup.startup })}`);

      target.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' });
      target.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Escape' });
      await delay(600);
    } else {
      if (!(await click('[data-setting="startup"]'))) throw new Error('no startup switch');
      const startup = await until(read, (value) => !value.startup, 3000);
      if (startup.startup) throw new Error('the startup switch did not turn off');
      console.log(`[settings] test startup ${JSON.stringify({ ok: true, startup: startup.startup })}`);
    }
  } catch (error) {
    console.error('[settings] test error', error);
  } finally {
    console.log('[settings] test done');
  }
}
