import { icon } from './icons';
import { esc } from './html';
import { MASCOTS } from './mascots';

export type PillState = 'idle' | 'playing' | 'paused' | 'timer' | 'done' | 'files' | 'drag';

export interface PillData {
  state: PillState;
  title: string;
  hover?: boolean;
  controls?: boolean;
  primaryIcon?: 'play' | 'pause';
  digits?: string;
  pip?: 'media' | 'danger';
}

export function pill(data: PillData): string {
  const showControls = data.controls ?? (data.state === 'playing' || data.state === 'paused');

  const controls = showControls
    ? `<div class="controls">
      <button type="button" class="icon-btn" aria-label="Previous">${icon('prev')}</button>
      <button type="button" class="icon-btn primary" aria-label="${data.primaryIcon === 'pause' ? 'Pause' : 'Play'}">${icon(data.primaryIcon ?? 'play')}</button>
      <button type="button" class="icon-btn" aria-label="Next">${icon('next')}</button>
    </div>`
    : '';

  const digits = data.digits ? `<div class="digits">${esc(data.digits)}</div>` : '';
  const glyph = data.state === 'paused' ? icon('play') : data.state === 'done' ? icon('check') : '';
  const stateIcon = glyph ? `<span class="state-icon" aria-hidden="true">${glyph}</span>` : '';
  const pip = data.pip ? `<span class="media-pip ${data.pip === 'danger' ? 'danger' : ''}" aria-hidden="true"></span>` : '';

  return `<div class="pill${showControls ? ' has-controls' : ''}" data-state="${data.state}"${data.hover ? ' data-hover="true"' : ''}><div class="mascot-wrap"><img class="mascot" src="${MASCOTS.master}" alt="" />${pip}</div><div class="slot"><div class="meta"><div class="title" title="${esc(data.title)}">${esc(data.title)}</div></div>${controls}</div>${stateIcon}${digits}</div>`;
}
