import type { TimerData } from '../ui/panel/tabs/timer';

export type TimerPreset = NonNullable<TimerData['preset']>;
type TimerPhase = 'idle' | 'running' | 'done';

export function clock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function clampMinutes(value: unknown, fallback = 25): number {
  const raw = Number(value);
  const minutes = Number.isFinite(raw) && raw !== 0 ? Math.round(raw) : fallback;
  return Math.max(1, Math.min(999, minutes));
}

export function timerData(phase: TimerPhase, remainingMs: number, preset: TimerPreset, custom: string): TimerData {
  if (phase === 'running') {
    return { mode: 'running', digits: clock(remainingMs), note: 'Focus', preset };
  }
  if (phase === 'done') {
    return { mode: 'done', digits: '0:00', note: 'Timer finished', preset };
  }
  if (preset === 'custom') {
    const minutes = clampMinutes(custom);
    return { mode: 'custom', digits: `${minutes}:00`, note: 'Set a length', preset: 'custom', customMinutes: custom };
  }
  return { mode: 'idle', digits: `${Number(preset)}:00`, note: 'Press start', preset };
}
