import type { MusicState } from '../shared/ipc';
import { musicClock } from './ui';

export interface MusicPanelData {
  title: string;
  subtitle: string;
  art?: string;
  playing: boolean;
  positionMs: number;
  durationMs: number;
}

export interface SeekApi {
  musicSeek(positionMs: number): Promise<{ ok: boolean; error?: string }>;
}

export class MusicSession {
  private view: MusicState | null = null;
  private base = 0;
  private clearTimer: number | undefined;
  private seq = 0;

  constructor(
    private readonly onChange: () => void,
    private readonly root: () => HTMLElement | null,
    private readonly isOpen: () => boolean
  ) {}

  get state(): MusicState | null {
    return this.view;
  }

  get hasMusic(): boolean {
    return this.view !== null;
  }

  get livePositionMs(): number {
    if (!this.view) return 0;
    return this.view.playing ? this.view.positionMs + (performance.now() - this.base) : this.view.positionMs;
  }

  get data(): MusicPanelData {
    const view = this.view;
    if (!view) {
      return { title: '', subtitle: '', playing: false, positionMs: 0, durationMs: 0 };
    }
    return {
      title: view.title,
      subtitle: view.artist,
      art: view.art ?? undefined,
      playing: view.playing,
      positionMs: this.livePositionMs,
      durationMs: view.durationMs
    };
  }

  apply(state: MusicState | null): void {
    if (state) {
      if (this.clearTimer !== undefined) {
        window.clearTimeout(this.clearTimer);
        this.clearTimer = undefined;
      }
      this.view = state;
      this.base = performance.now();
      this.onChange();
      return;
    }
    if (!this.view || this.clearTimer !== undefined) return;
    this.clearTimer = window.setTimeout(() => {
      this.clearTimer = undefined;
      this.view = null;
      this.onChange();
    }, 500);
  }

  clear(): void {
    if (this.clearTimer !== undefined) {
      window.clearTimeout(this.clearTimer);
      this.clearTimer = undefined;
    }
    this.view = null;
  }

  tick(): void {
    if (!this.view || !this.view.playing || this.view.durationMs <= 0) return;
    if (!this.isOpen() || this.root()?.querySelector('.panel-music .track[data-seeking]')) return;
    this.paint(this.livePositionMs);
  }

  async seek(api: SeekApi, positionMs: number): Promise<void> {
    const current = this.view;
    if (!current || current.durationMs <= 0) return;
    const target = Math.min(Math.max(Math.round(positionMs), 0), current.durationMs);
    const seq = ++this.seq;
    const result = await api.musicSeek(target).catch((error: unknown) => {
      console.error('[music] seek failed', error);
      return { ok: false };
    });
    if (seq !== this.seq || this.view !== current) return;
    if (!result.ok) {
      this.paint(this.livePositionMs);
      return;
    }
    current.positionMs = target;
    this.base = performance.now();
    this.paint(target);
  }

  private paint(elapsed: number): void {
    const view = this.view;
    if (!view || view.durationMs <= 0) return;
    const duration = view.durationMs;
    const clamped = Math.min(duration, Math.max(0, elapsed));
    const bar = this.root()?.querySelector<HTMLElement>('.panel-music [data-music-bar]');
    if (!bar) return;
    const percent = Math.round((clamped / duration) * 100);
    bar.setAttribute('aria-valuenow', String(Math.round(clamped / 1000)));
    bar.setAttribute('aria-valuetext', `${musicClock(clamped)} of ${musicClock(duration)}`);
    const fill = bar.querySelector<HTMLElement>('.track-fill');
    if (fill) fill.style.width = `${percent}%`;
    const knob = bar.querySelector<HTMLElement>('.track-knob');
    if (knob) knob.style.left = `${percent}%`;
    const times = bar.parentElement?.querySelectorAll<HTMLElement>('.track-times span');
    if (times && times.length === 2) {
      const [elapsedEl, totalEl] = times;
      if (elapsedEl) elapsedEl.textContent = musicClock(clamped);
      if (totalEl) totalEl.textContent = musicClock(duration);
    }
  }
}
