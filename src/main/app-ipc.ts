import { BrowserWindow, dialog, ipcMain, nativeImage } from 'electron';
import { statSync } from 'node:fs';
import { IPC, type AddResult, type CopyResult, type ShelfFile, type TimerSnapshot } from '../shared/ipc';
import { MAX_SHELF, type Shelf } from './shelf';
import { trayIconPath } from './paths';
import type { Bridge } from './bridge';
import type { BeamTimer } from './timer';
import type { MusicService } from './music';
import { WINDOW_HEIGHT, WINDOW_WIDTH } from './geometry';

export type AppIpcDeps = {
  window: BrowserWindow;
  shelf: Shelf;
  bridge: Bridge;
  timer: BeamTimer;
  music: MusicService;
  windowDrag: {
    start: (x: number, y: number) => void;
    move: (x: number, y: number) => void;
    end: (x: number, y: number) => void;
  };
  setPillSize: (width: number, height: number) => void;
  setPicking: (picking: boolean) => void;
  openPanel: () => void;
  panelCollapsed: () => void;
  timerScale: number;
};

function readPoint(x: unknown, y: unknown): { x: number; y: number } | null {
  if (typeof x !== 'number' || !Number.isFinite(x)) return null;
  if (typeof y !== 'number' || !Number.isFinite(y)) return null;
  return { x, y };
}

export function registerAppIpc(deps: AppIpcDeps): void {
  const { window, shelf, bridge, timer, music } = deps;

  ipcMain.on(IPC.windowDragStart, (event, x: unknown, y: unknown) => {
    const point = readPoint(x, y);
    if (event.sender !== window.webContents || !point) return;
    deps.windowDrag.start(point.x, point.y);
  });
  ipcMain.on(IPC.windowDragMove, (event, x: unknown, y: unknown) => {
    const point = readPoint(x, y);
    if (event.sender !== window.webContents || !point) return;
    deps.windowDrag.move(point.x, point.y);
  });
  ipcMain.on(IPC.windowDragEnd, (event, x: unknown, y: unknown) => {
    const point = readPoint(x, y);
    if (event.sender !== window.webContents || !point) return;
    deps.windowDrag.end(point.x, point.y);
  });

  ipcMain.handle(IPC.filesAdd, (event, paths: unknown): AddResult => {
    if (event.sender !== window.webContents) {
      return { count: shelf.count, accepted: 0, truncated: false, limit: MAX_SHELF, files: shelf.rows() };
    }
    const list = Array.isArray(paths)
      ? paths.filter((path): path is string => typeof path === 'string' && path.length > 0 && !path.includes('\0'))
      : [];
    const result = shelf.add(list);
    console.log(`[files] add=${list.length} accepted=${result.accepted} count=${result.count} truncated=${result.truncated}`);
    return result;
  });

  ipcMain.handle(IPC.filesPick, async (event): Promise<AddResult | null> => {
    if (event.sender !== window.webContents) return null;
    deps.setPicking(true);
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
      deps.setPicking(false);
    }
  });

  ipcMain.handle(IPC.filesCopy, async (event, payload: unknown): Promise<CopyResult> => {
    if (event.sender !== window.webContents) return { ok: false, error: 'untrusted sender' };
    const data = payload as { paths?: unknown; source?: unknown } | null;
    const source = data?.source === 'row' || data?.source === 'all' ? data.source : null;
    const requested = Array.isArray(data?.paths)
      ? data.paths.filter((path): path is string => typeof path === 'string' && path.length > 0)
      : [];
    const paths = shelf.canonical(requested);
    if (!source || !paths) {
      console.error(`[files] copy rejected source=${source} requested=${requested.length}`);
      return { ok: false, error: 'paths must come from the shelf' };
    }
    try {
      await bridge.copy(paths);
      console.log(`[files] copy=${paths.length} source=${source} ok=true`);
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[files] copy=${paths.length} source=${source} ok=false ${message}`);
      return { ok: false, error: message };
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

  ipcMain.handle(IPC.musicSeek, async (event, positionMs: unknown): Promise<{ ok: boolean; error?: string }> => {
    if (event.sender !== window.webContents) return { ok: false, error: 'untrusted sender' };
    const current = music.current;
    if (!current) return { ok: false, error: 'no active media session' };
    if (typeof positionMs !== 'number' || !Number.isFinite(positionMs) || positionMs < 0) {
      console.error(`[music] seek rejected ${String(positionMs)}`);
      return { ok: false, error: 'invalid position' };
    }
    const target = Math.round(Math.min(positionMs, current.durationMs));
    try {
      await bridge.musicSeek(target);
      console.log(`[music] seek=${target} ok=true`);
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[music] seek=${target} ok=false ${message}`);
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
    console.log(`[timer] start id=${snapshot.id} minutes=${value} scale=${deps.timerScale}`);
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
    deps.setPillSize(
      Math.max(1, Math.min(WINDOW_WIDTH, Math.round(width))),
      Math.max(1, Math.min(WINDOW_HEIGHT, Math.round(height)))
    );
  });

  ipcMain.on(IPC.panelRequestOpen, (event) => {
    if (event.sender !== window.webContents) return;
    deps.openPanel();
  });

  ipcMain.on(IPC.panelCollapsed, (event) => {
    if (event.sender !== window.webContents) return;
    deps.panelCollapsed();
  });

  ipcMain.on(IPC.panelTiming, (event, ms: number, reduced: boolean) => {
    if (event.sender !== window.webContents) return;
    console.log(`[panel] open ${ms}ms reduced=${reduced}`);
  });
}
