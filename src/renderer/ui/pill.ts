import { icon } from './icons';
import { esc } from './html';
import { MASCOTS } from './mascots';

export type PillState = 'idle' | 'playing' | 'paused' | 'timer' | 'done' | 'files' | 'drag' | 'missing';

export interface PillData {
  state: PillState;
  title: string;
  hover?: boolean;
  controls?: boolean;
  primaryIcon?: 'play' | 'pause';
  digits?: string;
}

export function pill(data: PillData): string {
  const controls = data.controls
    ? `<div class="controls">
      <button type="button" class="icon-btn" aria-label="Previous">${icon('prev')}</button>
      <button type="button" class="icon-btn primary" aria-label="${data.primaryIcon === 'pause' ? 'Pause' : 'Play'}">${icon(data.primaryIcon ?? 'play')}</button>
      <button type="button" class="icon-btn" aria-label="Next">${icon('next')}</button>
    </div>`
    : '';

  const digits = data.digits ? `<div class="digits">${esc(data.digits)}</div>` : '';

  return `<div class="pill" data-state="${data.state}"${data.hover ? ' data-hover="true"' : ''}><img class="mascot" src="${MASCOTS.master}" alt="" /><div class="meta"><div class="title">${esc(data.title)}</div></div>${controls}${digits}</div>`;
}
