import { icon } from '../shared/icons';
import { esc } from '../shared/html';
import { MASCOTS } from '../shared/mascots';

export type PillState = 'idle' | 'playing' | 'paused' | 'timer' | 'done' | 'files' | 'drag';

export interface PillData {
  state: PillState;
  title: string;
  hover?: boolean;
  primaryIcon?: 'play' | 'pause';
  digits?: string;
  pip?: 'playing' | 'paused' | 'danger';
  art?: string;
}

export function pill(data: PillData): string {
  const music = data.state === 'playing' || data.state === 'paused';
  const expands = music || data.state === 'timer' || data.state === 'done';

  const controls = music
    ? `<div class="pill-overlay controls">
      <button type="button" class="icon-btn" aria-label="Previous">${icon('prev')}</button>
      <button type="button" class="icon-btn primary" aria-label="${data.primaryIcon === 'pause' ? 'Pause' : 'Play'}">${icon(data.primaryIcon ?? 'play')}</button>
      <button type="button" class="icon-btn" aria-label="Next">${icon('next')}</button>
    </div>`
    : '';

  const timerAction =
    data.state === 'timer'
      ? `<button type="button" class="icon-btn pill-action" aria-label="Cancel timer">${icon('x')}</button>`
      : '';

  const doneActions =
    data.state === 'done'
      ? `<div class="pill-overlay done-actions"><span class="done-label">${esc(data.title)}</span><button type="button" class="icon-btn pill-action" aria-label="Dismiss">${icon('x')}</button></div>`
      : '';

  const rest =
    data.state === 'timer'
      ? `<div class="digits">${esc(data.digits ?? '')}</div>`
      : data.state === 'done'
        ? `<span class="state-icon" aria-hidden="true">${icon('check')}</span>`
        : `<div class="title" title="${esc(data.title)}">${esc(data.title)}</div>`;

  const pipState = music ? (data.state === 'playing' ? 'playing' : 'paused') : data.pip;
  const pip = pipState ? `<span class="media-pip ${pipState}" aria-hidden="true"></span>` : '';
  const thumb =
    data.art && music
      ? `<img class="mascot pill-art" src="${esc(data.art)}" alt="" />`
      : `<img class="mascot" src="${MASCOTS.master}" alt="" />`;

  return `<div class="pill${expands ? ' expands' : ''}${music ? ' has-controls' : ''}" data-state="${data.state}"${data.hover ? ' data-hover="true"' : ''}><div class="mascot-wrap">${thumb}${pip}</div><div class="slot"><div class="meta">${rest}</div>${timerAction}</div>${doneActions}${controls}</div>`;
}
