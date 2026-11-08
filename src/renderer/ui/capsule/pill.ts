import { icon } from '../shared/icons';
import { esc } from '../shared/html';
import { MASCOTS } from '../shared/mascots';

type PillState = 'quiet' | 'idle' | 'playing' | 'paused' | 'timer' | 'done' | 'files' | 'drag' | 'error';

interface PillData {
  state: PillState;
  title: string;
  hover?: boolean;
  primaryIcon?: 'play' | 'pause';
  digits?: string;
  pip?: 'playing' | 'paused' | 'danger';
  art?: string;
}

export function transportControls(playing: boolean): string {
  return `<div class="pill-overlay controls">
      <button type="button" class="icon-btn" data-action="prev" aria-label="Previous">${icon('prev')}</button>
      <button type="button" class="icon-btn primary" data-action="toggle" aria-label="${playing ? 'Pause' : 'Play'}">${icon(playing ? 'pause' : 'play')}</button>
      <button type="button" class="icon-btn" data-action="next" aria-label="Next">${icon('next')}</button>
      <button type="button" class="icon-btn panel-open" data-action="panel" aria-label="Open panel">${icon('chevronUp')}</button>
    </div>`;
}

export function pill(data: PillData): string {
  const music = data.state === 'playing' || data.state === 'paused';
  const expands = music || data.state === 'timer' || data.state === 'done' || data.state === 'error';

  const controls = music ? transportControls(data.primaryIcon === 'pause') : '';

  const timerAction =
    data.state === 'timer'
      ? `<button type="button" class="icon-btn pill-action" aria-label="Cancel timer">${icon('x')}</button>`
      : '';

  const doneActions =
    data.state === 'done'
      ? `<div class="pill-overlay done-actions"><span class="done-label">Done</span><button type="button" class="icon-btn pill-action" aria-label="Dismiss">${icon('x')}</button></div>`
      : '';

  const rest =
    data.state === 'quiet'
      ? ''
      : data.state === 'timer'
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
  const role = music ? 'group' : 'button';
  const label = music ? 'Beam media controls' : 'Beam — open panel';

  return `<div class="pill${expands ? ' expands' : ''}${music ? ' has-controls' : ''}" role="${role}" tabindex="0" aria-label="${esc(label)}" data-state="${data.state}"${data.hover ? ' data-hover="true"' : ''}><div class="mascot-wrap">${thumb}${pip}</div><div class="slot"><div class="meta">${rest}</div>${timerAction}</div>${doneActions}${controls}</div>`;
}
