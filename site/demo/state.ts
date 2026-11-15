import type { PanelData } from '../../src/renderer/ui';
import type { FileRow } from '../../src/renderer/ui/panel/tabs/files';
import type { SettingsData } from '../../src/renderer/ui/panel/tabs/settings';
import type { TimerMode } from '../../src/renderer/ui/panel/tabs/timer';
import { UndoSlot } from '../../src/renderer/core/undo';
import { clampMinutes, clock, timerData as buildTimerData, type TimerPreset } from '../../src/renderer/core/timer';
import { shiftMonth } from '../../src/renderer/core/calendar';
import { ENABLED_TABS } from '../../src/renderer/core/tabs';
import { formatSize } from '../../src/renderer/ui/shared/format';

export interface Track {
  title: string;
  artist: string;
  src: string;
  art: string;
}

export interface DemoHooks {
  renderPill: () => void;
  renderPanel: () => void;
}

export class DemoState {
  readonly audio = new Audio();
  private readonly undo = new UndoSlot(() => this.hooks.renderPanel());
  private readonly channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('beam-demo-audio');
  private trackIndex = 0;
  private nextPath = 1;
  private removed: { row: FileRow; index: number } | null = null;
  private timerMode: TimerMode = 'idle';
  private timerPreset: TimerPreset = '25';
  private timerCustom = '25';
  private timerDeadline = 0;
  private calendarView = new Date();
  private settings: SettingsData = { startup: false, shortcut: 'Alt + Space', volume: 70, theme: 'dark' };
  private files: FileRow[] = [];

  constructor(
    private readonly tracks: readonly Track[],
    private readonly instance: string,
    private readonly hooks: DemoHooks
  ) {
    this.audio.preload = 'metadata';
    this.audio.muted = true;
    this.audio.addEventListener('play', () => this.channel?.postMessage({ type: 'play', instance }));
    this.channel?.addEventListener('message', (event) => {
      if (event.data?.type === 'play' && event.data.instance !== instance && !this.audio.paused) this.audio.pause();
    });
  }

  get panelOpen(): boolean {
    return document.body.classList.contains('is-open');
  }

  get undoPath(): string | null {
    return this.undo.value;
  }

  get theme(): 'dark' | 'light' {
    return this.settings.theme;
  }

  get rebinding(): boolean {
    return this.settings.rebinding === true;
  }

  get track(): Track {
    return this.tracks[this.trackIndex]!;
  }

  get filesList(): FileRow[] {
    return this.files;
  }

  positionMs(): number {
    return Number.isFinite(this.audio.currentTime) ? this.audio.currentTime * 1000 : 0;
  }

  durationMs(): number {
    return Number.isFinite(this.audio.duration) ? this.audio.duration * 1000 : 0;
  }

  load(index = 0, play = false): void {
    this.trackIndex = ((index % this.tracks.length) + this.tracks.length) % this.tracks.length;
    this.audio.src = this.track.src;
    this.audio.load();
    if (play) this.play();
    this.hooks.renderPill();
    if (this.panelOpen) this.hooks.renderPanel();
  }

  private unlock(): void {
    this.audio.muted = false;
  }

  play(): void {
    this.unlock();
    void this.audio.play().catch(() => {});
  }

  toggle(): void {
    if (this.audio.paused) this.play();
    else this.audio.pause();
  }

  step(delta: number): void {
    this.load(this.trackIndex + delta, true);
  }

  seek(positionMs: number): void {
    if (!Number.isFinite(this.audio.duration) || this.audio.duration <= 0) return;
    this.unlock();
    this.audio.currentTime = Math.min(positionMs, this.audio.duration * 1000) / 1000;
    this.hooks.renderPanel();
  }

  addDropped(files: File[]): number {
    const rows = files.map((file) => ({
      path: `demo:${this.nextPath++}`,
      name: file.name,
      size: formatSize(file.size),
      kind: 'file' as const
    }));
    const room = Math.max(0, 50 - this.files.length);
    this.files = [...this.files, ...rows.slice(0, room)];
    if (this.panelOpen) this.hooks.renderPanel();
    return Math.min(rows.length, room);
  }

  remove(path: string): void {
    const index = this.files.findIndex((row) => row.path === path);
    if (index < 0) return;
    const [row] = this.files.splice(index, 1);
    if (!row) return;
    this.removed = { row, index };
    this.undo.arm(path);
    this.hooks.renderPanel();
  }

  restore(): void {
    if (!this.removed) return;
    const { row, index } = this.removed;
    this.removed = null;
    this.undo.clear();
    this.files = [...this.files.slice(0, index), row, ...this.files.slice(index)];
    this.hooks.renderPanel();
  }

  clearFiles(): void {
    this.removed = null;
    this.undo.clear();
    this.files = [];
    this.hooks.renderPanel();
  }

  startTimer(minutes: number): void {
    const mins = clampMinutes(minutes);
    this.timerDeadline = Date.now() + mins * 60000;
    this.timerMode = 'running';
    this.hooks.renderPill();
    this.hooks.renderPanel();
  }

  cancelTimer(): void {
    this.timerMode = 'idle';
    this.timerDeadline = 0;
    this.hooks.renderPill();
    this.hooks.renderPanel();
  }

  tick(): boolean {
    if (this.timerMode !== 'running') return false;
    const left = this.timerDeadline - Date.now();
    if (left <= 0) {
      this.timerMode = 'done';
      this.hooks.renderPill();
      if (this.panelOpen) this.hooks.renderPanel();
      return true;
    }
    return true;
  }

  remainingMs(): number {
    return Math.max(0, this.timerDeadline - Date.now());
  }

  setTimerPreset(preset: string): void {
    this.timerPreset = preset as TimerPreset;
    this.timerMode = preset === 'custom' ? 'custom' : 'idle';
    this.hooks.renderPanel();
  }

  setTimerCustom(value: unknown): void {
    this.timerCustom = String(clampMinutes(value));
    this.timerPreset = 'custom';
    this.timerMode = 'idle';
    this.hooks.renderPanel();
  }

  get timerPresetValue(): TimerPreset {
    return this.timerPreset;
  }

  get timerCustomValue(): string {
    return this.timerCustom;
  }

  shiftCalendar(delta: number): void {
    this.calendarView = shiftMonth(this.calendarView, delta);
    this.hooks.renderPanel();
  }

  todayCalendar(): void {
    this.calendarView = new Date();
    this.hooks.renderPanel();
  }

  patchSettings(patch: Partial<SettingsData>): void {
    this.settings = { ...this.settings, ...patch };
    if (patch.theme) document.documentElement.dataset.theme = patch.theme;
    this.hooks.renderPanel();
  }

  setVolume(delta: number): void {
    this.patchSettings({ volume: Math.max(0, Math.min(100, this.settings.volume + delta)) });
  }

  beginRebind(): void {
    this.patchSettings({ rebinding: true });
  }

  submitChord(chord: string | null): void {
    this.patchSettings({ rebinding: false, ...(chord ? { shortcut: chord } : {}) });
  }

  panelData(): PanelData {
    return {
      music: {
        title: this.track.title,
        subtitle: this.track.artist,
        art: this.track.art,
        playing: !this.audio.paused,
        positionMs: this.positionMs(),
        durationMs: this.durationMs()
      },
      files: this.files,
      timer: buildTimerData(this.timerMode, this.remainingMs(), this.timerPreset, this.timerCustom),
      calendar: { view: this.calendarView, today: new Date() },
      settings: this.settings,
      enabledTabs: ENABLED_TABS
    };
  }

  pillData() {
    if (this.timerMode === 'running') {
      return { state: 'timer' as const, title: '', digits: clock(this.remainingMs()) };
    }
    if (this.timerMode === 'done') {
      return { state: 'done' as const, title: 'Done' };
    }
    return {
      state: this.audio.paused ? ('paused' as const) : ('playing' as const),
      title: this.track.title,
      art: this.track.art
    };
  }

  openedTab(): 'music' | 'timer' {
    return this.timerMode !== 'idle' ? 'timer' : 'music';
  }
}
