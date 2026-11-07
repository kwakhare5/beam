import type { TimerSnapshot } from '../shared/ipc';

export type TimerAlert = { id: number; minutes: number };

export class BeamTimer {
  private phase: TimerSnapshot['phase'] = 'idle';
  private deadline = 0;
  private minutes = 0;
  private id = 0;
  private displayed = -1;
  private ticker: NodeJS.Timeout | null = null;

  constructor(
    private readonly scaleMs: number,
    private readonly onChange: (snapshot: TimerSnapshot) => void,
    private readonly onDone: (alert: TimerAlert) => void
  ) {}

  snapshot(alert = false): TimerSnapshot {
    return {
      phase: this.phase,
      minutes: this.minutes,
      remainingMs: this.phase === 'running' ? Math.max(0, this.deadline - Date.now()) : 0,
      deadline: this.phase === 'running' ? this.deadline : 0,
      id: this.id,
      alert
    };
  }

  start(minutes: number): TimerSnapshot {
    this.stopTicker();
    this.id += 1;
    this.minutes = minutes;
    this.phase = 'running';
    this.deadline = Date.now() + minutes * this.scaleMs;
    this.displayed = this.secondsLeft();
    this.ticker = setInterval(this.tick, 200);
    this.ticker.unref();
    const snapshot = this.snapshot();
    this.onChange(snapshot);
    return snapshot;
  }

  cancel(): TimerSnapshot {
    if (this.phase !== 'running') return this.snapshot();
    this.stopTicker();
    this.phase = 'idle';
    this.deadline = 0;
    const snapshot = this.snapshot();
    this.onChange(snapshot);
    return snapshot;
  }

  dismiss(): TimerSnapshot {
    if (this.phase !== 'done') return this.snapshot();
    this.phase = 'idle';
    this.deadline = 0;
    const snapshot = this.snapshot();
    this.onChange(snapshot);
    return snapshot;
  }

  dispose(): void {
    this.stopTicker();
  }

  private secondsLeft(): number {
    return Math.max(0, Math.ceil((this.deadline - Date.now()) / 1000));
  }

  private tick = (): void => {
    if (this.phase !== 'running') return;
    if (Date.now() >= this.deadline) {
      this.complete();
      return;
    }
    const seconds = this.secondsLeft();
    if (seconds === this.displayed) return;
    this.displayed = seconds;
    this.onChange(this.snapshot());
  };

  private complete(): void {
    this.stopTicker();
    this.phase = 'done';
    this.deadline = 0;
    this.onChange(this.snapshot(true));
    this.onDone({ id: this.id, minutes: this.minutes });
  }

  private stopTicker(): void {
    if (this.ticker === null) return;
    clearInterval(this.ticker);
    this.ticker = null;
  }
}
