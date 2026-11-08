import {
  bindArtFallback,
  bindClearAll,
  bindFileDrag,
  bindFilesActions,
  bindMusicSeek,
  bindPanelTabs,
  formatSize,
  iconSprite,
  panel,
  pill,
  transportControls,
  type PanelData,
  type Tab
} from './ui';
import { MASCOTS } from './ui/shared/mascots';
import chimeUrl from './assets/beam-chime.wav';
import { clampMinutes, clock, timerData as buildTimerData, type TimerPreset } from './core/timer';
import { ENABLED_TABS, pickTab, type LastUsed } from './core/tabs';
import { shiftMonth } from './core/calendar';
import { bindDropTarget, FileShelf, fileLabel } from './files';
import { QuietTimer, QUIET_AFTER, QUIET_RETURN } from './quiet';
import { MusicSession } from './music';
import { chordFromEvent, SettingsController } from './settings';
import type { AddResult, CopyResult, FileChange, HelperState, MusicState, SettingsPatch, SettingsSnapshot, ShelfFile, TimerSnapshot } from '../shared/ipc';

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
  onPanelOpen(callback: (files: ShelfFile[], tab?: 'settings') => void): void;
  onPanelDismiss(callback: () => void): void;
  onMusicState(callback: (state: MusicState | null) => void): void;
  onHelperState(callback: (state: HelperState) => void): void;
  onPillNear(callback: (near: boolean) => void): void;
  startTimer(minutes: number): Promise<TimerSnapshot | null>;
  cancelTimer(): Promise<TimerSnapshot | null>;
  dismissTimer(): Promise<TimerSnapshot | null>;
  timerChimed(id: number, ok: boolean): void;
  onTimerState(callback: (state: TimerSnapshot) => void): void;
  getSettings(): Promise<SettingsSnapshot>;
  setSettings(patch: SettingsPatch): Promise<{ ok: boolean; settings: SettingsSnapshot; error?: string }>;
  resetPosition(): Promise<{ ok: boolean; settings: SettingsSnapshot; error?: string }>;
  onSettingsState(callback: (state: SettingsSnapshot) => void): void;
  musicCommand(cmd: 'toggle' | 'next' | 'prev'): Promise<{ ok: boolean; error?: string }>;
  musicSeek(positionMs: number): Promise<{ ok: boolean; error?: string }>;
  reportPanelTiming(ms: number, reduced: boolean): void;
};

declare global {
  interface Window {
    beam?: BeamApi;
  }
}

document.body.insertAdjacentHTML('afterbegin', iconSprite());
document.body.insertAdjacentHTML('afterbegin', '<div class="sr-only" role="status" aria-live="polite" data-live></div>');
bindArtFallback(document);

const liveEl = document.querySelector<HTMLElement>('[data-live]');
let liveText = '';

function announce(text: string): void {
  if (!liveEl || text === liveText) return;
  liveText = text;
  liveEl.textContent = text;
}

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
let helperOk = true;
let override: { state: string; label: string } | null = null;
let pillHovered = false;
let cursorNear = false;
const quiet = new QuietTimer(() => idleEligible(), () => renderPill());

let lastUsed: LastUsed | null = null;
let timerPreset: TimerPreset = '25';
let timerCustom = '25';
let timerSnapshot: TimerSnapshot = { phase: 'idle', minutes: 0, remainingMs: 0, deadline: 0, id: 0, alert: false };
let chime: HTMLAudioElement | null = null;
let chimedId = 0;
let chimeVolume = 0.6;
let calendarView = new Date();

function stamp(tab: LastUsed): void {
  lastUsed = tab;
}

function timerData(): PanelData['timer'] {
  return buildTimerData(timerSnapshot.phase, timerSnapshot.remainingMs, timerPreset, timerCustom);
}

function patchTimerDigits(): void {
  const digits = clock(timerSnapshot.remainingMs);
  const pillDigits = pillEl?.querySelector<HTMLElement>('[data-pill-digits]');
  if (pillDigits) pillDigits.textContent = digits;
  const panelDigits = wrapEl?.querySelector<HTMLElement>('.panel-timer [data-timer-digits]');
  if (panelDigits) panelDigits.textContent = digits;
  pillEl?.setAttribute('aria-label', `Timer ${digits}, open panel`);
}

function playChime(id: number): void {
  if (id === chimedId) return;
  chimedId = id;
  chime ??= new Audio(chimeUrl);
  chime.currentTime = 0;
  chime.volume = chimeVolume;
  void chime
    .play()
    .then(() => beam?.timerChimed(id, true))
    .catch((error: unknown) => {
      console.error('[timer] chime failed', error);
      beam?.timerChimed(id, false);
    });
}

function playTestChime(): void {
  chime ??= new Audio(chimeUrl);
  chime.currentTime = 0;
  chime.volume = chimeVolume;
  void chime.play().catch((error: unknown) => console.error('[settings] test chime failed', error));
}

function applyTimer(next: TimerSnapshot): void {
  const previous = timerSnapshot;
  const phaseChanged = next.phase !== previous.phase;
  timerSnapshot = next;
  if (next.phase === 'running') {
    if (!phaseChanged) {
      patchTimerDigits();
      return;
    }
    wakePill();
    renderPill();
    if (document.body.classList.contains('is-open')) renderPanel();
    announce(`Timer started for ${next.minutes} ${next.minutes === 1 ? 'minute' : 'minutes'}`);
    return;
  }
  if (next.phase === 'done') {
    renderPill();
    if (document.body.classList.contains('is-open')) renderPanel();
    if (next.alert) {
      playChime(next.id);
      announce('Timer finished');
    }
    return;
  }
  if (phaseChanged) {
    renderPill();
    if (document.body.classList.contains('is-open')) renderPanel();
  }
}

function startTimer(minutes: number): void {
  if (!beam) return;
  stamp('timer');
  void beam
    .startTimer(minutes)
    .then((snapshot) => {
      if (snapshot) applyTimer(snapshot);
    })
    .catch((error: unknown) => console.error('[timer] start failed', error));
}

function cancelTimer(): void {
  if (!beam) return;
  void beam
    .cancelTimer()
    .then((snapshot) => {
      if (snapshot) applyTimer(snapshot);
    })
    .catch((error: unknown) => console.error('[timer] cancel failed', error));
}

function dismissTimer(): void {
  if (!beam) return;
  void beam
    .dismissTimer()
    .then((snapshot) => {
      if (snapshot) applyTimer(snapshot);
    })
    .catch((error: unknown) => console.error('[timer] dismiss failed', error));
}

function openedTab(rows: number): Tab {
  return pickTab(lastUsed, music.hasMusic, rows);
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
  const track = music.state;
  const show = Boolean(track) && (state === 'playing' || state === 'paused');
  const existing = pillEl.querySelector<HTMLElement>('.controls');
  if (!show) {
    pillEl.classList.remove('has-controls');
    existing?.remove();
    return;
  }
  pillEl.classList.add('has-controls');
  const toggle = existing?.querySelector<HTMLButtonElement>('[data-action="toggle"]');
  if (toggle && (toggle.getAttribute('aria-label') === 'Pause') === track!.playing) return;
  const markup = transportControls(track!.playing);
  if (existing) existing.outerHTML = markup;
  else pillEl.insertAdjacentHTML('beforeend', markup);
}

function renderPillSlot(state: string, label: string): void {
  if (!pillEl) return;
  const slot = pillEl.querySelector<HTMLElement>('.slot');
  const meta = slot?.querySelector<HTMLElement>('.meta');
  if (!slot || !meta) return;
  if (state === 'timer') {
    meta.innerHTML = `<div class="digits" data-pill-digits>${clock(timerSnapshot.remainingMs)}</div>`;
  } else if (state === 'done') {
    meta.innerHTML = `<span class="state-icon" aria-hidden="true"><svg aria-hidden="true" focusable="false"><use href="#i-check"/></svg></span>`;
  } else {
    let title = meta.querySelector<HTMLElement>('.title');
    if (!title) {
      meta.innerHTML = '<div class="title"></div>';
      title = meta.querySelector<HTMLElement>('.title');
    }
    if (title) {
      if (title.textContent !== label) title.textContent = label;
      if (title.title !== label) title.title = label;
    }
  }
  const existing = slot.querySelector<HTMLElement>('.pill-action');
  if (state === 'timer') {
    if (!existing) {
      slot.insertAdjacentHTML(
        'beforeend',
        '<button type="button" class="icon-btn pill-action" data-action="pill-timer-cancel" aria-label="Cancel timer"><svg aria-hidden="true" focusable="false"><use href="#i-x"/></svg></button>'
      );
    }
  } else {
    existing?.remove();
  }
  const done = pillEl.querySelector<HTMLElement>('.done-actions');
  if (state === 'done') {
    if (!done) {
      pillEl.insertAdjacentHTML(
        'beforeend',
        '<div class="pill-overlay done-actions"><span class="done-label">Done</span><button type="button" class="icon-btn pill-action" data-action="pill-timer-dismiss" aria-label="Dismiss"><svg aria-hidden="true" focusable="false"><use href="#i-x"/></svg></button></div>'
      );
    }
  } else {
    done?.remove();
  }
}

function renderPill(): void {
  if (!pillEl) return;
  const track = music.state;
  const timerState = timerSnapshot.phase === 'running' ? 'timer' : timerSnapshot.phase === 'done' ? 'done' : null;
  const idle = !override && !track && shelfCount === 0 && !timerState;
  const quietState = helperOk && idle && quiet.active && !pillHovered;
  const state = helperOk
    ? override?.state ??
      timerState ??
      (track ? (track.playing ? 'playing' : 'paused') : shelfCount > 0 ? 'files' : quietState ? 'quiet' : 'idle')
    : 'error';
  const label = helperOk
    ? override?.label ??
      (timerSnapshot.phase === 'done'
        ? 'Done'
        : timerSnapshot.phase === 'running'
          ? ''
          : track
            ? track.title
            : shelfCount > 0
              ? fileLabel(shelfCount)
              : quietState
                ? ''
                : 'Beam')
    : 'Connection lost';
  const musicVisual = helperOk && Boolean(track) && (state === 'playing' || state === 'paused');
  pillEl.dataset.state = state;
  pillEl.classList.toggle('expands', musicVisual || state === 'timer' || state === 'done' || state === 'error');
  setMark(musicVisual && track ? track.art : null);
  setPip(
    !helperOk
      ? 'danger'
      : shelfMissing
        ? 'danger'
        : musicVisual && track
          ? track.playing
            ? 'playing'
            : 'paused'
          : state === 'timer' && track
            ? track.playing
              ? 'playing'
              : 'paused'
            : null
  );
  renderControls(state);
  renderPillSlot(state, label);
  pillEl.setAttribute('role', state === 'playing' || state === 'paused' ? 'group' : 'button');
  pillEl.setAttribute(
    'aria-label',
    !helperOk
      ? 'Connection lost'
      : state === 'playing' || state === 'paused'
        ? `${track!.playing ? 'Playing' : 'Paused'} ${track!.title}`
        : state === 'timer'
          ? `Timer ${clock(timerSnapshot.remainingMs)}, open panel`
          : state === 'done'
            ? 'Timer finished — open panel'
            : state === 'files'
              ? `${fileLabel(shelfCount)} — open panel`
              : 'Beam — open panel'
  );
  announce(
    !helperOk
      ? 'Connection lost'
      : state === 'playing' || state === 'paused'
        ? `${track!.playing ? 'Playing' : 'Paused'} ${track!.title}`
        : state === 'files'
          ? fileLabel(shelfCount)
          : ''
  );
}

function setPill(state: string, label: string): void {
  wakePill();
  override = { state, label };
  renderPill();
}

function showShelf(): void {
  override = null;
  quiet.reset();
  renderPill();
}

function idleEligible(): boolean {
  return (
    helperOk &&
    !music.hasMusic &&
    shelfCount === 0 &&
    timerSnapshot.phase === 'idle' &&
    !override &&
    !pillHovered &&
    !cursorNear &&
    !pillEl?.matches(':hover') &&
    !document.body.classList.contains('is-open')
  );
}

function scheduleQuiet(delay = QUIET_AFTER): void {
  quiet.schedule(delay);
}

function wakePill(): void {
  quiet.wake();
}

function resetQuiet(): void {
  quiet.reset();
}

const beam = window.beam;

const panelData: PanelData = {
  music: { title: '', subtitle: '', playing: false, positionMs: 0, durationMs: 0 },
  files: [],
  timer: { mode: 'idle', digits: '25:00', note: 'Pick a length', preset: '25' },
  calendar: new Date(),
  settings: { startup: false, shortcut: 'Alt + Space', volume: 60, theme: 'dark' },
  enabledTabs: ENABLED_TABS
};

let activeTab: Tab = 'music';
let panelEl: HTMLElement | null = null;
let wrapEl: HTMLElement | null = null;
const music = new MusicSession(
  () => onMusicChange(),
  () => wrapEl,
  () => document.body.classList.contains('is-open')
);
let reportPillSize: () => void = () => {};

const settings = new SettingsController(
  () => beam,
  {
    setVolume: (volume) => {
      chimeVolume = volume;
    },
    apply: (data) => {
      panelData.settings = data;
    },
    render: () => {
      if (panelEl) renderPanel();
    }
  }
);

const shelf = new FileShelf(() => beam, {
  stamp: () => stamp('files'),
  root: () => wrapEl,
  rows: (files) => {
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
  },
  setPill: (state, label) => setPill(state, label),
  showShelf: () => showShelf()
});

bindDropTarget(shelf, (state, label) => setPill(state, label), () => showShelf());

function renderPanel(): void {
  if (!app) return;
  panelData.music = music.data;
  panelData.timer = timerData();
  panelData.calendar = { view: calendarView, today: new Date() };
  panelData.settings.rebinding = settings.rebinding;
  if (!wrapEl) {
    wrapEl = document.createElement('div');
    wrapEl.className = 'panel-wrap';
    app.appendChild(wrapEl);
    bindPanelTabs(wrapEl);
    bindMusicSeek(wrapEl, (positionMs) => (beam ? music.seek(beam, positionMs) : undefined));
    wrapEl.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const root = event.currentTarget as HTMLElement;
      const tab = target.closest<HTMLElement>('[role="tab"]');
      if (tab) {
        activeTab = tab.id.replace('tab-', '') as Tab;
        if (activeTab !== 'settings') stamp(activeTab);
      }
      const preset = target.closest<HTMLElement>('[data-timer-preset]')?.dataset.timerPreset;
      if (preset) {
        timerPreset = preset as '5' | '10' | '25' | 'custom';
        stamp('timer');
        renderPanel();
        return;
      }
      if (target.closest('[data-timer-set]')) {
        const input = root.querySelector<HTMLInputElement>('[data-timer-minutes]');
        timerCustom = String(Math.max(1, Math.min(999, Math.round(Number(input?.value) || 25))));
        timerPreset = 'custom';
        stamp('timer');
        renderPanel();
        return;
      }
      if (target.closest('[data-timer-start]')) {
        startTimer(timerPreset === 'custom' ? clampMinutes(timerCustom) : Number(timerPreset));
        return;
      }
      if (target.closest('[data-timer-cancel]')) {
        cancelTimer();
        return;
      }
      if (target.closest('[data-timer-dismiss]')) {
        dismissTimer();
        return;
      }
      if (target.closest('[data-cal-prev]')) {
        calendarView = shiftMonth(calendarView, -1);
        stamp('calendar');
        renderPanel();
        return;
      }
      if (target.closest('[data-cal-next]')) {
        calendarView = shiftMonth(calendarView, 1);
        stamp('calendar');
        renderPanel();
        return;
      }
      if (target.closest('[data-cal-today]')) {
        calendarView = new Date();
        stamp('calendar');
        renderPanel();
      }
      if (!beam) return;
      const setting = target.closest<HTMLElement>('[data-setting]')?.dataset.setting;
      if (setting === 'startup') {
        settings.patch({ startup: !panelData.settings.startup });
        return;
      }
      if (setting === 'theme') {
        settings.patch({ theme: panelData.settings.theme === 'dark' ? 'light' : 'dark' });
        return;
      }
      if (setting === 'volume-test') {
        playTestChime();
        return;
      }
      if (setting === 'reset') {
        settings.reset();
        return;
      }
      if (setting === 'shortcut') {
        settings.beginRebind();
        return;
      }
      const step = target.closest<HTMLElement>('[data-volume-step]')?.dataset.volumeStep;
      if (step) {
        const delta = Number(step);
        const next = Math.max(0, Math.min(100, panelData.settings.volume + (Number.isFinite(delta) ? delta : 0)));
        settings.patch({ volume: next });
      }
    });
    wrapEl.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') return;
      const root = event.currentTarget;
      if (!(root instanceof HTMLElement)) return;
      const selected = root.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
      if (selected) {
        activeTab = selected.id.replace('tab-', '') as Tab;
        if (activeTab !== 'settings') stamp(activeTab);
      }
    });
    bindClearAll(wrapEl);
    wrapEl.addEventListener('beam:files:clear', () => {
      stamp('files');
      void shelf.clear();
    });
    if (beam) {
      bindFilesActions(wrapEl, (paths, source) => {
        stamp('files');
        return beam.copyFiles(paths, source);
      }, (path) => {
        stamp('files');
        void shelf.remove(path);
      });
      bindFileDrag(wrapEl, (paths) => beam.startFileDrag(paths));
      wrapEl.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (target.closest('[data-files-undo]')) {
          shelf.restore();
          return;
        }
        if (!target.closest('[data-add-files]')) return;
        shelf.pick();
      });
      wrapEl.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const action = target.closest<HTMLElement>('.music-controls [data-action]')?.dataset.action;
        if (action === 'prev' || action === 'toggle' || action === 'next') {
          event.stopPropagation();
          stamp('music');
          void beam.musicCommand(action).catch((error: unknown) => console.error('[music] command failed', error));
        }
      });
    }
  }
  wrapEl.innerHTML = panel(activeTab, panelData);
  panelEl = wrapEl.querySelector<HTMLElement>('.panel');
  shelf.renderUndo();
}

function onMusicChange(): void {
  panelData.music = music.data;
  resetQuiet();
  renderPill();
  if (wrapEl && document.body.classList.contains('is-open')) renderPanel();
}

window.setInterval(() => music.tick(), 1000);

let closingTimer: number | undefined;

function dismissPanel(): void {
  if (!document.body.classList.contains('is-open')) return;
  document.body.classList.remove('is-open');
  document.body.classList.add('is-closing');
  if (closingTimer !== undefined) window.clearTimeout(closingTimer);
  closingTimer = window.setTimeout(() => {
    closingTimer = undefined;
    document.body.classList.remove('is-closing');
    pillEl?.focus({ preventScroll: true });
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
    if (action === 'pill-timer-cancel') {
      cancelTimer();
      return;
    }
    if (action === 'pill-timer-dismiss') {
      dismissTimer();
      return;
    }
    if (action === 'prev' || action === 'toggle' || action === 'next') {
      stamp('music');
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

  beam.onPanelOpen((files, tab) => {
    wakePill();
    activeTab = tab ?? openedTab(files.length);
    shelf.apply(files);
    if (!panelEl) return;
    const el = panelEl;
    void el.offsetWidth;
    requestAnimationFrame(() => {
      let started = 0;
      let reported = false;
      const report = (): void => {
        if (reported) return;
        reported = true;
        el.removeEventListener('transitionrun', begin);
        el.removeEventListener('transitionend', done);
        beam.reportPanelTiming(
          started ? Math.round(performance.now() - started) : 260,
          window.matchMedia('(prefers-reduced-motion: reduce)').matches
        );
      };
      const begin = (event: TransitionEvent): void => {
        if (event.target !== el || event.propertyName !== 'transform' || started) return;
        started = performance.now();
      };
      const done = (event: TransitionEvent): void => {
        if (event.target !== el || event.propertyName !== 'transform') return;
        report();
      };
      el.addEventListener('transitionrun', begin);
      document.body.classList.add('is-open');
      el.focus({ preventScroll: true });
      el.addEventListener('transitionend', done);
      setTimeout(report, 260);
    });
  });

  beam.onPanelDismiss(dismissPanel);

  beam.onHelperState((state) => {
    helperOk = state.ok;
    if (!helperOk) {
      music.clear();
      panelData.music = music.data;
      quiet.forceIdle();
      if (wrapEl && document.body.classList.contains('is-open')) renderPanel();
    } else {
      scheduleQuiet();
    }
    renderPill();
  });

  beam.onPillNear((near) => {
    cursorNear = near;
    if (near) {
      wakePill();
      return;
    }
    scheduleQuiet(QUIET_RETURN);
  });

  beam.onTimerState(applyTimer);
  beam.onSettingsState((state) => settings.apply(state));
  void beam
    .getSettings()
    .then((state) => settings.apply(state))
    .catch((error: unknown) => console.error('[settings] load failed', error));

  beam.onMusicState((state) => music.apply(state));

  window.addEventListener(
    'keydown',
    (event) => {
      if (!settings.rebinding) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.key === 'Escape') {
        settings.cancelRebind();
        return;
      }
      settings.submit(chordFromEvent(event));
    },
    true
  );

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      dismissPanel();
      return;
    }
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (event.target !== pillEl) return;
    if (document.body.classList.contains('is-open') || document.body.classList.contains('is-closing')) return;
    event.preventDefault();
    beam?.openPanel();
  });

  scheduleQuiet();
}

export {};
