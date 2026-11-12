import chimeUrl from './assets/beam-chime.wav';
import { clampMinutes, clock, timerData as buildTimerData, type TimerPreset } from './core/timer';
import type { PanelData } from './ui';
import type { BeamApi } from './api';
import type { TimerSnapshot } from '../shared/ipc';

export type TimerDeps = {
  api: () => BeamApi | undefined;
  pill: () => HTMLElement | null;
  wrap: () => HTMLElement | null;
  render: () => void;
  wake: () => void;
  announce: (text: string) => void;
  stamp: () => void;
};

export class TimerView {
  private current: TimerSnapshot = { phase: 'idle', minutes: 0, remainingMs: 0, id: 0, alert: false };
  private presetValue: TimerPreset = '25';
  private customValue = '25';
  private chime: HTMLAudioElement | null = null;
  private chimedId = 0;
  private gain = 0.6;

  constructor(private readonly deps: TimerDeps) {}

  get snapshot(): TimerSnapshot {
    return this.current;
  }

  get preset(): TimerPreset {
    return this.presetValue;
  }

  set preset(next: TimerPreset) {
    this.presetValue = next;
  }

  get custom(): string {
    return this.customValue;
  }

  set custom(next: string) {
    this.customValue = next;
  }

  setVolume(volume: number): void {
    this.gain = volume;
  }

  data(): PanelData['timer'] {
    return buildTimerData(this.current.phase, this.current.remainingMs, this.presetValue, this.customValue);
  }

  apply(next: TimerSnapshot): void {
    const previous = this.current;
    const phaseChanged = next.phase !== previous.phase;
    this.current = next;
    if (next.phase === 'running') {
      if (!phaseChanged) {
        this.patchDigits();
        return;
      }
      this.deps.wake();
      this.deps.render();
      this.deps.announce(`Timer started for ${next.minutes} ${next.minutes === 1 ? 'minute' : 'minutes'}`);
      return;
    }
    if (next.phase === 'done') {
      this.deps.render();
      if (next.alert) {
        this.playChime(next.id);
        this.deps.announce('Timer finished');
      }
      return;
    }
    if (phaseChanged) this.deps.render();
  }

  start(): void {
    const minutes = this.presetValue === 'custom' ? clampMinutes(this.customValue) : Number(this.presetValue);
    const api = this.deps.api();
    if (!api) return;
    this.deps.stamp();
    void api
      .startTimer(minutes)
      .then((snapshot) => {
        if (snapshot) this.apply(snapshot);
      })
      .catch((error: unknown) => console.error('[timer] start failed', error));
  }

  cancel(): void {
    const api = this.deps.api();
    if (!api) return;
    void api
      .cancelTimer()
      .then((snapshot) => {
        if (snapshot) this.apply(snapshot);
      })
      .catch((error: unknown) => console.error('[timer] cancel failed', error));
  }

  dismiss(): void {
    const api = this.deps.api();
    if (!api) return;
    void api
      .dismissTimer()
      .then((snapshot) => {
        if (snapshot) this.apply(snapshot);
      })
      .catch((error: unknown) => console.error('[timer] dismiss failed', error));
  }

  testChime(): void {
    this.chime ??= new Audio(chimeUrl);
    this.chime.currentTime = 0;
    this.chime.volume = this.gain;
    void this.chime.play().catch((error: unknown) => console.error('[settings] test chime failed', error));
  }

  private patchDigits(): void {
    const digits = clock(this.current.remainingMs);
    const pill = this.deps.pill();
    const pillDigits = pill?.querySelector<HTMLElement>('[data-pill-digits]');
    if (pillDigits) pillDigits.textContent = digits;
    const panelDigits = this.deps.wrap()?.querySelector<HTMLElement>('.panel-timer [data-timer-digits]');
    if (panelDigits) panelDigits.textContent = digits;
    pill?.setAttribute('aria-label', `Timer ${digits}, open panel`);
  }

  private playChime(id: number): void {
    if (id === this.chimedId) return;
    this.chimedId = id;
    this.chime ??= new Audio(chimeUrl);
    this.chime.currentTime = 0;
    this.chime.volume = this.gain;
    const api = this.deps.api();
    void this.chime
      .play()
      .then(() => api?.timerChimed(id, true))
      .catch((error: unknown) => {
        console.error('[timer] chime failed', error);
        api?.timerChimed(id, false);
      });
  }
}
