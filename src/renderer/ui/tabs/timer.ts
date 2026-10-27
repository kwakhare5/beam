import { icon } from '../icons';
import { esc } from '../html';
import { panelBody } from '../panel-body';

export interface TimerData {
  digits: string;
  note: string;
  preset: '5' | '10' | '25' | 'custom';
}

const PRESETS: ReadonlyArray<{ id: TimerData['preset']; label: string }> = [
  { id: '5', label: '5 min' },
  { id: '10', label: '10 min' },
  { id: '25', label: '25 min' },
  { id: 'custom', label: 'Custom' }
];

export function timerPanel(data: TimerData): string {
  const presets = PRESETS.map(
    (preset) => `<button type="button" class="chip${preset.id === data.preset ? ' active' : ''}">${preset.label}</button>`
  ).join('');

  const content = `<div class="presets">${presets}</div><div class="timer-face"><div class="digits">${esc(data.digits)}</div><div class="panel-sub">${esc(data.note)}</div></div><div class="actions" style="justify-content:center"><button type="button" class="btn primary">${icon('play')}Start</button><button type="button" class="btn ghost">Cancel</button></div>`;

  return panelBody('timer', content, 'panel-timer');
}
