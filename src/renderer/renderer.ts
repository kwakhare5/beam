import {
  bindArtFallback,
  bindClearAll,
  bindFileDrag,
  bindFilesActions,
  bindPanelTabs,
  formatSize,
  iconSprite,
  musicClock,
  panel,
  pill,
  transportControls,
  type PanelData,
  type Tab
} from './ui';
import { MASCOTS } from './ui/shared/mascots';
import type { AddResult, CopyResult, FileChange, HelperState, MusicState, ShelfFile } from '../shared/ipc';

type BeamApi = {
  getPathForFile(file: File): string;
  addFiles(paths: string[]): Promise<AddResult>;
  pickFiles(): Promise<AddResult | null>;
  copyFiles(paths: string[], source: 'row' | 'all'): Promise<CopyResult>;
  startFileDrag(paths: string[]): void;
  removeFile(path: string): Promise<FileChange>;
  clearFiles(): Promise<FileChange>;
  openPanel(): void;
  panelCollapsed(): void;
  setPillSize(width: number, height: number): void;
  beginWindowDrag(x: number, y: number): void;
  moveWindowDrag(x: number, y: number): void;
  endWindowDrag(x: number, y: number): void;
  onPanelOpen(callback: (files: ShelfFile[]) => void): void;
  onPanelDismiss(callback: () => void): void;
  onMusicState(callback: (state: MusicState | null) => void): void;
  onHelperState(callback: (state: HelperState) => void): void;
  musicCommand(cmd: 'toggle' | 'next' | 'prev'): Promise<{ ok: boolean; error?: string }>;
  reportPanelTiming(ms: number, reduced: boolean): void;
};

declare global {
  interface Window {
    beam?: BeamApi;
  }
}

document.body.insertAdjacentHTML('afterbegin', iconSprite());
bindArtFallback(document);

const app = document.querySelector<HTMLElement>('#app');

if (app) {
  app.innerHTML = pill({
    state: 'idle',
    title: 'Beam'
  });
}

const pillEl = app?.querySelector<HTMLElement>('.pill') ?? null;
let shelfCount = 0;
let shelfMissing = false;
let music: MusicState | null = null;
let helperOk = true;
let musicBase = 0;
let override: { state: string; label: string } | null = null;
let noticeTimer: number | undefined;
let musicClearTimer: number | undefined;
const QUIET_AFTER = 20000;
const QUIET_RETURN = 2000;
let quiet = false;
let quietTimer: number | undefined;
let pillHovered = false;

function fileLabel(count: number): string {
  return count === 1 ? '1 file' : `${count} files`;
}

function setPip(state: 'playing' | 'paused' | 'danger' | null): void {
  const wrap = pillEl?.querySelector('.mascot-wrap');
  if (!wrap) return;
  let pip = wrap.querySelector<HTMLElement>('.media-pip');
  if (!state) {
    pip?.remove();
    return;
  }
  if (!pip) {
    pip = document.createElement('span');
    pip.setAttribute('aria-hidden', 'true');
    wrap.appendChild(pip);
  }
  pip.className = `media-pip ${state}`;
}

function setMark(art: string | null): void {
  const mark = pillEl?.querySelector<HTMLImageElement>('.mascot');
  if (!mark) return;
  mark.classList.toggle('pill-art', Boolean(art));
  mark.classList.remove('art-fallback-img');
  delete mark.dataset.fallback;
  mark.src = art ?? MASCOTS.master;
}

function renderControls(state: string): void {
  if (!pillEl) return;
  const show = Boolean(music) && (state === 'playing' || state === 'paused');
  const existing = pillEl.querySelector<HTMLElement>('.controls');
  if (!show) {
    pillEl.classList.remove('has-controls');
    existing?.remove();
    return;
  }
  pillEl.classList.add('has-controls');
  const toggle = existing?.querySelector<HTMLButtonElement>('[data-action="toggle"]');
  if (toggle && (toggle.getAttribute('aria-label') === 'Pause') === music!.playing) return;
  const markup = transportControls(music!.playing);
  if (existing) existing.outerHTML = markup;
  else pillEl.insertAdjacentHTML('beforeend', markup);
}

function renderPill(): void {
  if (!pillEl) return;
  const idle = !override && !music && shelfCount === 0;
  const quietState = helperOk && idle && quiet && !pillHovered;
  const state = helperOk
    ? override?.state ??
      (music ? (music.playing ? 'playing' : 'paused') : shelfCount > 0 ? 'files' : quietState ? 'quiet' : 'idle')
    : 'error';
  const label = helperOk
    ? override?.label ?? (music ? music.title : shelfCount > 0 ? fileLabel(shelfCount) : quietState ? '' : 'Beam')
    : 'Connection lost';
  const musicVisual = helperOk && Boolean(music) && state !== 'files' && state !== 'drag' && state !== 'error';
  pillEl.dataset.state = state;
  pillEl.classList.toggle('expands', musicVisual);
  setMark(musicVisual && music ? music.art : null);
  setPip(
    !helperOk
      ? 'danger'
      : shelfMissing
        ? 'danger'
        : musicVisual && music
          ? music.playing
            ? 'playing'
            : 'paused'
          : null
  );
  renderControls(state);
  const title = pillEl.querySelector<HTMLElement>('.title');
  if (title) {
    title.textContent = label;
    title.title = label;
  }
}

function setPill(state: string, label: string): void {
  wakePill();
  override = { state, label };
  renderPill();
}

function showShelf(): void {
  override = null;
  quiet = false;
  renderPill();
  scheduleQuiet();
}

function idleEligible(): boolean {
  return (
    helperOk &&
    !music &&
    shelfCount === 0 &&
    !override &&
    !pillHovered &&
    !pillEl?.matches(':hover') &&
    !document.body.classList.contains('is-open')
  );
}

function scheduleQuiet(delay = QUIET_AFTER): void {
  if (quietTimer !== undefined) {
    window.clearTimeout(quietTimer);
    quietTimer = undefined;
  }
  if (!idleEligible()) {
    quiet = false;
    return;
  }
  quietTimer = window.setTimeout(() => {
    quietTimer = undefined;
    quiet = idleEligible();
    renderPill();
  }, delay);
}

function wakePill(): void {
  if (quietTimer !== undefined) {
    window.clearTimeout(quietTimer);
    quietTimer = undefined;
  }
  if (quiet) {
    quiet = false;
    renderPill();
  }
}

function resetQuiet(): void {
  quiet = false;
  scheduleQuiet();
}

const beam = window.beam;

const panelData: PanelData = {
  music: { title: '', subtitle: '', playing: false, positionMs: 0, durationMs: 0 },
  files: [],
  timer: { mode: 'idle', digits: '25:00', note: 'Pick a length', preset: '25' },
  calendar: new Date(),
  settings: { startup: false, shortcut: 'Alt + Space', volume: 60, theme: 'dark' },
  enabledTabs: ['music', 'files']
};

let activeTab: Tab = 'music';
let panelEl: HTMLElement | null = null;
let wrapEl: HTMLElement | null = null;
let reportPillSize: () => void = () => {};

function applyFiles(files: ShelfFile[]): void {
  panelData.files = files.map((file) => ({
    path: file.path,
    name: file.name,
    size: formatSize(file.sizeBytes),
    kind: file.kind,
    missing: file.missing
  }));
  shelfCount = files.length;
  shelfMissing = files.some((file) => file.missing);
  showShelf();
  renderPanel();
}

function applyAddResult(result: AddResult): void {
  applyFiles(result.files);
  if (noticeTimer !== undefined) window.clearTimeout(noticeTimer);
  if (result.truncated) {
    setPill('files', `Max ${result.limit}`);
    noticeTimer = window.setTimeout(() => {
      noticeTimer = undefined;
      showShelf();
    }, 2400);
  } else {
    noticeTimer = undefined;
  }
}

let undoPath: string | null = null;
let undoTimer: number | undefined;

function setFilesStatus(text: string): void {
  const node = wrapEl?.querySelector<HTMLElement>('[data-files-status]');
  if (node) node.textContent = text;
}

function renderUndo(): void {
  if (!wrapEl) return;
  const note = wrapEl.querySelector<HTMLElement>('[data-files-status]');
  const button = wrapEl.querySelector<HTMLElement>('[data-files-undo]');
  if (!note || !button) return;
  const empty = Boolean(wrapEl.querySelector('.drop-well'));
  note.textContent = undoPath ? 'Removed' : empty ? '' : 'Files clear on quit';
  button.hidden = undoPath === null;
}

function clearUndo(): void {
  undoPath = null;
  if (undoTimer !== undefined) {
    window.clearTimeout(undoTimer);
    undoTimer = undefined;
  }
  renderUndo();
}

async function removeRow(path: string): Promise<void> {
  if (!beam) return;
  const result = await beam.removeFile(path);
  if (!result.ok) {
    setFilesStatus('Remove failed');
    return;
  }
  applyFiles(result.files);
  clearUndo();
  undoPath = path;
  renderUndo();
  undoTimer = window.setTimeout(() => {
    undoPath = null;
    undoTimer = undefined;
    renderUndo();
  }, 5000);
}

async function clearShelf(): Promise<void> {
  if (!beam) return;
  const result = await beam.clearFiles();
  if (!result.ok) {
    setFilesStatus('Clear failed');
    return;
  }
  clearUndo();
  applyFiles(result.files);
}

function renderPanel(): void {
  if (!app) return;
  if (!wrapEl) {
    wrapEl = document.createElement('div');
    wrapEl.className = 'panel-wrap';
    app.appendChild(wrapEl);
    bindPanelTabs(wrapEl);
    wrapEl.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const tab = target.closest<HTMLElement>('[role="tab"]');
      if (tab) activeTab = tab.id.replace('tab-', '') as Tab;
    });
    wrapEl.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') return;
      const root = event.currentTarget;
      if (!(root instanceof HTMLElement)) return;
      const selected = root.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
      if (selected) activeTab = selected.id.replace('tab-', '') as Tab;
    });
    bindClearAll(wrapEl);
    wrapEl.addEventListener('beam:files:clear', () => {
      void clearShelf();
    });
    if (beam) {
      bindFilesActions(wrapEl, (paths, source) => beam.copyFiles(paths, source), (path) => {
        void removeRow(path);
      });
      bindFileDrag(wrapEl, (paths) => beam.startFileDrag(paths));
      wrapEl.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (target.closest('[data-files-undo]')) {
          const path = undoPath;
          if (!path) return;
          clearUndo();
          void beam
            .addFiles([path])
            .then((result) => {
              applyAddResult(result);
              setFilesStatus('Restored');
              window.setTimeout(() => renderUndo(), 2500);
            })
            .catch(() => setFilesStatus('Undo failed'));
          return;
        }
        if (!target.closest('[data-add-files]')) return;
        void beam
          .pickFiles()
          .then((result) => {
            if (result) applyAddResult(result);
          })
          .catch((error: unknown) => {
            console.error('[files] pick failed', error);
            setFilesStatus('Add failed');
          });
      });
      wrapEl.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const action = target.closest<HTMLElement>('.music-controls [data-action]')?.dataset.action;
        if (action === 'prev' || action === 'toggle' || action === 'next') {
          event.stopPropagation();
          void beam.musicCommand(action).catch((error: unknown) => console.error('[music] command failed', error));
        }
      });
    }
  }
  wrapEl.innerHTML = panel(activeTab, panelData);
  panelEl = wrapEl.querySelector<HTMLElement>('.panel');
  renderUndo();
}

function tickMusicProgress(): void {
  if (!music || !music.playing || music.durationMs <= 0) return;
  const elapsed = Math.min(music.durationMs, music.positionMs + (performance.now() - musicBase));
  panelData.music.positionMs = elapsed;
  if (!document.body.classList.contains('is-open')) return;
  const bar = wrapEl?.querySelector<HTMLElement>('.panel-music [data-music-bar]');
  if (!bar) return;
  const duration = music.durationMs;
  bar.setAttribute('aria-valuenow', String(Math.round(elapsed / 1000)));
  bar.setAttribute('aria-valuetext', `${musicClock(elapsed)} of ${musicClock(duration)}`);
  const fill = bar.querySelector<HTMLElement>('.track-fill');
  if (fill) fill.style.width = `${Math.round((elapsed / duration) * 100)}%`;
  const times = bar.parentElement?.querySelectorAll<HTMLElement>('.track-times span');
  if (times && times.length === 2) {
    const [elapsedEl, totalEl] = times;
    if (elapsedEl) elapsedEl.textContent = musicClock(elapsed);
    if (totalEl) totalEl.textContent = musicClock(duration);
  }
}

window.setInterval(tickMusicProgress, 1000);

let closingTimer: number | undefined;

function dismissPanel(): void {
  if (!document.body.classList.contains('is-open')) return;
  document.body.classList.remove('is-open');
  document.body.classList.add('is-closing');
  if (closingTimer !== undefined) window.clearTimeout(closingTimer);
  closingTimer = window.setTimeout(() => {
    closingTimer = undefined;
    document.body.classList.remove('is-closing');
  }, 200);
  setTimeout(() => beam?.panelCollapsed(), 160);
  setTimeout(() => reportPillSize(), 220);
  scheduleQuiet();
}

document.body.addEventListener('click', (event) => {
  if (!document.body.classList.contains('is-open')) return;
  const target = event.target;
  if (!(target instanceof Element) || target.closest('.panel')) return;
  dismissPanel();
});

if (app && beam) {
  let suppressClick = false;

  app.addEventListener('click', (event) => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    const action = (event.target as Element).closest<HTMLElement>('.pill [data-action]')?.dataset.action;
    if (action === 'panel') {
      beam.openPanel();
      return;
    }
    if (action === 'prev' || action === 'toggle' || action === 'next') {
      void beam.musicCommand(action).catch((error: unknown) => console.error('[music] command failed', error));
      return;
    }
    if (
      !document.body.classList.contains('is-open') &&
      !document.body.classList.contains('is-closing') &&
      !(event.target as Element).closest('button')
    ) {
      beam.openPanel();
    }
  });

  let dragDepth = 0;
  const hasFiles = (event: DragEvent): boolean => event.dataTransfer?.types.includes('Files') === true;
  const dragLabel = (count: number): string => `+${fileLabel(Math.max(1, count))}`;

  window.addEventListener('dragenter', (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    dragDepth += 1;
    setPill('drag', dragLabel(event.dataTransfer?.items.length ?? 1));
  });

  window.addEventListener('dragover', (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    setPill('drag', dragLabel(event.dataTransfer?.items.length ?? 1));
  });

  window.addEventListener('dragleave', (event) => {
    if (!hasFiles(event)) return;
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) showShelf();
  });

  window.addEventListener('dragend', () => {
    dragDepth = 0;
    showShelf();
  });

  window.addEventListener('drop', (event) => {
    event.preventDefault();
    dragDepth = 0;
    const files = Array.from(event.dataTransfer?.files ?? []);
    const paths = files.map((file) => beam.getPathForFile(file)).filter((path) => path.length > 0);
    if (!paths.length) {
      showShelf();
      return;
    }
    void beam
      .addFiles(paths)
      .then((result) => {
        applyAddResult(result);
      })
      .catch((error: unknown) => {
        console.error('[files] add failed', error);
        setFilesStatus('Add failed');
        showShelf();
      });
  });

  if (pillEl) {
    pillEl.draggable = false;
    pillEl.querySelectorAll('img').forEach((image) => {
      image.draggable = false;
    });
    pillEl.addEventListener('pointerenter', () => {
      pillHovered = true;
      wakePill();
    });
    pillEl.addEventListener('pointerleave', () => {
      pillHovered = false;
      scheduleQuiet(QUIET_RETURN);
    });
    let sizeFrame = 0;
    reportPillSize = (): void => {
      if (sizeFrame !== 0) return;
      sizeFrame = requestAnimationFrame(() => {
        sizeFrame = 0;
        if (!pillEl || document.body.classList.contains('is-open')) return;
        const rect = pillEl.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1) return;
        beam.setPillSize(Math.round(rect.width), Math.round(rect.height));
      });
    };
    const pillObserver = new ResizeObserver(() => reportPillSize());
    pillObserver.observe(pillEl);
    reportPillSize();
    let press: { id: number; x: number; y: number; dragging: boolean } | null = null;

    pillEl.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      if (document.body.classList.contains('is-open') || document.body.classList.contains('is-closing')) return;
      if ((event.target as Element).closest('button')) return;
      wakePill();
      suppressClick = false;
      press = { id: event.pointerId, x: event.screenX, y: event.screenY, dragging: false };
      pillEl.setPointerCapture(event.pointerId);
    });

    pillEl.addEventListener('pointermove', (event) => {
      if (!press || event.pointerId !== press.id) return;
      if (!press.dragging) {
        if (Math.hypot(event.screenX - press.x, event.screenY - press.y) < 4) return;
        press.dragging = true;
        beam.beginWindowDrag(event.screenX, event.screenY);
        return;
      }
      beam.moveWindowDrag(event.screenX, event.screenY);
    });

    const endPress = (event: PointerEvent): void => {
      if (!press || event.pointerId !== press.id) return;
      if (press.dragging) {
        beam.endWindowDrag(event.screenX, event.screenY);
        suppressClick = true;
      }
      press = null;
    };
    pillEl.addEventListener('pointerup', endPress);
    pillEl.addEventListener('pointercancel', endPress);
  }

  beam.onPanelOpen((files) => {
    wakePill();
    activeTab = music ? 'music' : files.length > 0 ? 'files' : activeTab;
    applyFiles(files);
    if (!panelEl) return;
    const el = panelEl;
    void el.offsetWidth;
    requestAnimationFrame(() => {
      let started = 0;
      let reported = false;
      const report = (): void => {
        if (reported) return;
        reported = true;
        beam.reportPanelTiming(
          started ? Math.round(performance.now() - started) : 260,
          window.matchMedia('(prefers-reduced-motion: reduce)').matches
        );
      };
      el.addEventListener('transitionrun', function begin(event) {
        if (event.target !== el || event.propertyName !== 'transform' || started) return;
        started = performance.now();
      });
      document.body.classList.add('is-open');
      el.addEventListener('transitionend', function done(event) {
        if (event.target !== el || event.propertyName !== 'transform') return;
        el.removeEventListener('transitionend', done);
        report();
      });
      setTimeout(report, 260);
    });
  });

  beam.onPanelDismiss(dismissPanel);

  beam.onHelperState((state) => {
    helperOk = state.ok;
    if (!helperOk) {
      music = null;
      panelData.music = { title: '', subtitle: '', playing: false, positionMs: 0, durationMs: 0 };
      quiet = false;
      if (quietTimer !== undefined) {
        window.clearTimeout(quietTimer);
        quietTimer = undefined;
      }
      if (wrapEl && document.body.classList.contains('is-open')) renderPanel();
    } else {
      scheduleQuiet();
    }
    renderPill();
  });

  beam.onMusicState((state) => {
    if (state) {
      if (musicClearTimer !== undefined) {
        window.clearTimeout(musicClearTimer);
        musicClearTimer = undefined;
      }
      music = state;
      musicBase = performance.now();
      panelData.music = {
        title: state.title,
        subtitle: state.artist,
        art: state.art ?? undefined,
        playing: state.playing,
        positionMs: state.positionMs,
        durationMs: state.durationMs
      };
      resetQuiet();
      renderPill();
      if (wrapEl && document.body.classList.contains('is-open')) renderPanel();
      return;
    }
    if (!music) return;
    if (musicClearTimer !== undefined) return;
    musicClearTimer = window.setTimeout(() => {
      musicClearTimer = undefined;
      music = null;
      panelData.music = { title: '', subtitle: '', playing: false, positionMs: 0, durationMs: 0 };
      resetQuiet();
      renderPill();
      if (wrapEl && document.body.classList.contains('is-open')) renderPanel();
    }, 500);
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') dismissPanel();
  });

  scheduleQuiet();
}

export {};
