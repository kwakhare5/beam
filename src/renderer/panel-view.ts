import {
  bindClearAll,
  bindFileDrag,
  bindFilesActions,
  bindMusicSeek,
  bindPanelTabs,
  formatSize,
  panel,
  type PanelData,
  type Tab
} from './ui';
import { ENABLED_TABS, type LastUsed } from './core/tabs';
import { shiftMonth } from './core/calendar';
import { FileShelf } from './files';
import { MusicSession } from './music';
import { SettingsController } from './settings';
import type { BeamApi } from './api';
import type { TimerView } from './timer-view';
import type { ShelfFile } from '../shared/ipc';

export type PanelDeps = {
  api: () => BeamApi | undefined;
  stamp: (tab: LastUsed) => void;
  renderPill: () => void;
  wake: () => void;
  setPill: (state: string, label: string) => void;
  showShelf: () => void;
  scheduleQuiet: () => void;
  resetQuiet: () => void;
  reportPillSize: () => void;
  focusPill: () => void;
  filesChanged: (files: ShelfFile[]) => void;
  openedTab: (rows: number) => Tab;
  timer: TimerView;
};

export class PanelView {
  readonly music: MusicSession;
  readonly shelf: FileShelf;
  readonly settings: SettingsController;
  private readonly app: HTMLElement | null;
  private readonly data: PanelData = {
    music: { title: '', subtitle: '', playing: false, positionMs: 0, durationMs: 0 },
    files: [],
    timer: { mode: 'idle', digits: '25:00', note: 'Pick a length', preset: '25' },
    calendar: { view: new Date(), today: new Date() },
    settings: { startup: false, shortcut: 'Alt + Space', volume: 60, theme: 'dark' },
    enabledTabs: ENABLED_TABS
  };
  private active: Tab = 'music';
  private panelEl: HTMLElement | null = null;
  private wrapEl: HTMLElement | null = null;
  private calendarView = new Date();
  private closingTimer: number | undefined;
  private collapseTimer: number | undefined;
  private pillSizeTimer: number | undefined;

  constructor(private readonly deps: PanelDeps, app: HTMLElement | null) {
    this.app = app;
    this.music = new MusicSession(
      () => this.onMusicChange(),
      () => this.wrapEl,
      () => this.isOpen()
    );
    this.settings = new SettingsController(() => deps.api(), {
      setVolume: (volume) => deps.timer.setVolume(volume),
      apply: (data) => {
        this.data.settings = data;
      },
      render: () => {
        if (this.panelEl) this.render();
      }
    });
    this.shelf = new FileShelf(() => deps.api(), {
      stamp: () => deps.stamp('files'),
      root: () => this.wrapEl,
      rows: (files) => {
        this.data.files = files.map((file) => ({
          path: file.path,
          name: file.name,
          size: formatSize(file.sizeBytes),
          kind: file.kind,
          missing: file.missing
        }));
        deps.filesChanged(files);
        deps.showShelf();
        this.render();
      },
      setPill: deps.setPill,
      showShelf: deps.showShelf
    });
    window.setInterval(() => this.music.tick(), 1000);
    document.body.addEventListener('click', (event) => {
      if (!this.isOpen()) return;
      const target = event.target;
      if (!(target instanceof Element) || target.closest('.panel')) return;
      this.dismiss();
    });
  }

  get wrap(): HTMLElement | null {
    return this.wrapEl;
  }

  get rebinding(): boolean {
    return this.settings.rebinding;
  }

  open(files: ShelfFile[], tab?: 'settings'): void {
    this.cancelClose();
    this.deps.wake();
    this.active = tab ?? this.deps.openedTab(files.length);
    this.shelf.apply(files);
    if (!this.panelEl) return;
    const el = this.panelEl;
    void el.offsetWidth;
    requestAnimationFrame(() => {
      const api = this.deps.api();
      let started = 0;
      let reported = false;
      const report = (): void => {
        if (reported) return;
        reported = true;
        el.removeEventListener('transitionrun', begin);
        el.removeEventListener('transitionend', done);
        api?.reportPanelTiming(
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
  }

  render(): void {
    if (!this.app) return;
    this.data.music = this.music.data;
    this.data.timer = this.deps.timer.data();
    this.data.calendar = { view: this.calendarView, today: new Date() };
    this.data.settings.rebinding = this.settings.rebinding;
    if (!this.wrapEl) {
      const wrap = document.createElement('div');
      wrap.className = 'panel-wrap';
      this.app.appendChild(wrap);
      this.wrapEl = wrap;
      this.bind(wrap);
    }
    this.wrapEl.innerHTML = panel(this.active, this.data);
    this.panelEl = this.wrapEl.querySelector<HTMLElement>('.panel');
    this.shelf.renderUndo();
  }

  dismiss(): void {
    if (!this.isOpen()) return;
    this.cancelClose();
    document.body.classList.remove('is-open');
    document.body.classList.add('is-closing');
    this.closingTimer = window.setTimeout(() => {
      this.closingTimer = undefined;
      document.body.classList.remove('is-closing');
      this.deps.focusPill();
    }, 200);
    this.collapseTimer = window.setTimeout(() => {
      this.collapseTimer = undefined;
      this.deps.api()?.panelCollapsed();
    }, 160);
    this.pillSizeTimer = window.setTimeout(() => {
      this.pillSizeTimer = undefined;
      this.deps.reportPillSize();
    }, 220);
    this.deps.scheduleQuiet();
  }

  cancelClose(): void {
    if (this.closingTimer !== undefined) {
      window.clearTimeout(this.closingTimer);
      this.closingTimer = undefined;
    }
    if (this.collapseTimer !== undefined) {
      window.clearTimeout(this.collapseTimer);
      this.collapseTimer = undefined;
    }
    if (this.pillSizeTimer !== undefined) {
      window.clearTimeout(this.pillSizeTimer);
      this.pillSizeTimer = undefined;
    }
    document.body.classList.remove('is-closing');
  }

  private isOpen(): boolean {
    return document.body.classList.contains('is-open');
  }

  private onMusicChange(): void {
    this.data.music = this.music.data;
    this.deps.resetQuiet();
    this.deps.renderPill();
    if (this.wrapEl && this.isOpen()) this.render();
  }

  private bind(wrap: HTMLElement): void {
    const api = this.deps.api();
    bindPanelTabs(wrap);
    bindMusicSeek(wrap, (positionMs) => (api ? this.music.seek(api, positionMs) : undefined));
    wrap.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const root = event.currentTarget as HTMLElement;
      const tab = target.closest<HTMLElement>('[role="tab"]');
      if (tab) {
        this.active = tab.id.replace('tab-', '') as Tab;
        if (this.active !== 'settings') this.deps.stamp(this.active);
      }
      const preset = target.closest<HTMLElement>('[data-timer-preset]')?.dataset.timerPreset;
      if (preset) {
        this.deps.timer.preset = preset as '5' | '10' | '25' | 'custom';
        this.deps.stamp('timer');
        this.render();
        return;
      }
      if (target.closest('[data-timer-set]')) {
        const input = root.querySelector<HTMLInputElement>('[data-timer-minutes]');
        this.deps.timer.custom = String(Math.max(1, Math.min(999, Math.round(Number(input?.value) || 25))));
        this.deps.timer.preset = 'custom';
        this.deps.stamp('timer');
        this.render();
        return;
      }
      if (target.closest('[data-timer-start]')) {
        this.deps.timer.start();
        return;
      }
      if (target.closest('[data-timer-cancel]')) {
        this.deps.timer.cancel();
        return;
      }
      if (target.closest('[data-timer-dismiss]')) {
        this.deps.timer.dismiss();
        return;
      }
      if (target.closest('[data-cal-prev]')) {
        this.calendarView = shiftMonth(this.calendarView, -1);
        this.deps.stamp('calendar');
        this.render();
        return;
      }
      if (target.closest('[data-cal-next]')) {
        this.calendarView = shiftMonth(this.calendarView, 1);
        this.deps.stamp('calendar');
        this.render();
        return;
      }
      if (target.closest('[data-cal-today]')) {
        this.calendarView = new Date();
        this.deps.stamp('calendar');
        this.render();
      }
      if (!api) return;
      const setting = target.closest<HTMLElement>('[data-setting]')?.dataset.setting;
      if (setting === 'startup') {
        this.settings.patch({ startup: !this.data.settings.startup });
        return;
      }
      if (setting === 'theme') {
        this.settings.patch({ theme: this.data.settings.theme === 'dark' ? 'light' : 'dark' });
        return;
      }
      if (setting === 'volume-test') {
        this.deps.timer.testChime();
        return;
      }
      if (setting === 'reset') {
        this.settings.reset();
        return;
      }
      if (setting === 'shortcut') {
        this.settings.beginRebind();
        return;
      }
      const step = target.closest<HTMLElement>('[data-volume-step]')?.dataset.volumeStep;
      if (step) {
        const delta = Number(step);
        const next = Math.max(0, Math.min(100, this.data.settings.volume + (Number.isFinite(delta) ? delta : 0)));
        this.settings.patch({ volume: next });
      }
    });
    wrap.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') return;
      const root = event.currentTarget;
      if (!(root instanceof HTMLElement)) return;
      const selected = root.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
      if (selected) {
        this.active = selected.id.replace('tab-', '') as Tab;
        if (this.active !== 'settings') this.deps.stamp(this.active);
      }
    });
    bindClearAll(wrap);
    wrap.addEventListener('beam:files:clear', () => {
      this.deps.stamp('files');
      void this.shelf.clear();
    });
    if (!api) return;
    bindFilesActions(
      wrap,
      (paths, source) => {
        this.deps.stamp('files');
        return api.copyFiles(paths, source);
      },
      (path) => {
        this.deps.stamp('files');
        void this.shelf.remove(path);
      }
    );
    bindFileDrag(wrap, (paths) => api.startFileDrag(paths));
    wrap.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('[data-files-undo]')) {
        this.shelf.restore();
        return;
      }
      if (!target.closest('[data-add-files]')) return;
      this.shelf.pick();
    });
    wrap.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const action = target.closest<HTMLElement>('.music-controls [data-action]')?.dataset.action;
      if (action === 'prev' || action === 'toggle' || action === 'next') {
        event.stopPropagation();
        this.deps.stamp('music');
        void api.musicCommand(action).catch((error: unknown) => console.error('[music] command failed', error));
      }
    });
  }
}
