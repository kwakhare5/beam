import { icon } from '../icons';
import { esc } from '../html';
import { panelBody } from '../panel-body';

export type TimerMode = 'idle' | 'custom' | 'running' | 'done';

export interface TimerData {
  mode?: TimerMode;
  digits: string;
  note: string;
  preset?: '5' | '10' | '25' | 'custom' | null;
  customMinutes?: string;
}

const PRESETS: ReadonlyArray<{ id: NonNullable<TimerData['preset']>; label: string }> = [
  { id: '5', label: '5 min' },
  { id: '10', label: '10 min' },
  { id: '25', label: '25 min' },
  { id: 'custom', label: 'Custom' }
];

function face(digits: string, note: string): string {
  return `<div class="timer-face"><div class="digits" role="timer" aria-live="off">${esc(digits)}</div><div class="panel-sub">${esc(note)}</div></div>`;
}

export function timerPanel(data: TimerData, active = true): string {
  const mode = data.mode ?? 'idle';

  const chips = `<div class="presets">${PRESETS.map(
    (preset) => `<button type="button" class="chip${preset.id === data.preset ? ' active' : ''}" aria-pressed="${preset.id === data.preset}">${preset.label}</button>`
  ).join('')}</div>`;

  const custom = `<div class="timer-custom"><input class="timer-input" type="number" min="1" max="999" inputmode="numeric" value="${esc(data.customMinutes ?? '10')}" aria-label="Custom minutes"><span class="timer-unit">min</span><button type="button" class="chip active">Done</button></div>`;

  const start = `<div class="actions center"><button type="button" class="btn primary">${icon('play')}Start</button></div>`;
  const cancel = `<div class="actions center"><button type="button" class="btn danger">Cancel</button></div>`;
  const done = `<div class="actions center"><button type="button" class="btn primary">${icon('play')}Start again</button><button type="button" class="btn ghost">Dismiss</button></div>`;

  const head = mode === 'custom' ? custom : mode === 'idle' ? chips : '';
  const body = mode === 'done' ? face('00:00', data.note) : face(data.digits, data.note);
  const actions = mode === 'running' ? cancel : mode === 'done' ? done : start;

  return panelBody('timer', `${head}${body}${actions}`, 'panel-timer', active);
}
