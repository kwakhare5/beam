import { icon } from '../shared/icons';
import { esc } from '../shared/html';
import { MASCOTS } from '../shared/mascots';

type PillState = 'quiet' | 'idle' | 'playing' | 'paused' | 'timer' | 'done' | 'files' | 'drag' | 'error';

interface PillData {
  state: PillState;
  title: string;
  hover?: boolean;
  digits?: string;
  pip?: 'playing' | 'paused' | 'danger';
  art?: string;
}

export function transportControls(playing: boolean): string {
  return `<div class="pill-controls">
      <button type="button" class="icon-btn" data-action="prev" aria-label="Previous">${icon('prev')}</button>
      <button type="button" class="icon-btn primary" data-action="toggle" aria-label="${playing ? 'Pause' : 'Play'}">${icon(playing ? 'pause' : 'play')}</button>
      <button type="button" class="icon-btn" data-action="next" aria-label="Next">${icon('next')}</button>
      <button type="button" class="icon-btn panel-open" data-action="panel" aria-label="Open panel">${icon('chevronUp')}</button>
    </div>`;
}

export function pill(data: PillData): string {
  const music = data.state === 'playing' || data.state === 'paused';

  const controls = music ? transportControls(data.state === 'playing') : '';

  const action =
    data.state === 'timer'
      ? `<button type="button" class="icon-btn pill-x" data-action="pill-timer-cancel" aria-label="Cancel timer">${icon('x')}</button>`
      : data.state === 'done'
        ? `<button type="button" class="icon-btn pill-x" data-action="pill-timer-dismiss" aria-label="Dismiss">${icon('x')}</button>`
        : '';

  const rest =
    data.state === 'quiet'
      ? ''
      : data.state === 'timer'
        ? `<div class="digits">${esc(data.digits ?? '')}</div>`
        : data.state === 'done'
          ? '<span class="done-label">Done</span>'
          : `<div class="title" title="${esc(data.title)}"><span class="title-track"><span class="title-text">${esc(data.title)}</span></span></div>`;

  const pipState = music ? (data.state === 'playing' ? 'playing' : 'paused') : data.pip;
  const pip = pipState ? `<span class="media-pip ${pipState}" aria-hidden="true"></span>` : '';
  const thumb =
    data.art && music
      ? `<img class="mascot pill-art" src="${esc(data.art)}" alt="" />`
      : `<img class="mascot" src="${MASCOTS.master}" alt="" />`;
  const role = music || data.state === 'timer' || data.state === 'done' ? 'group' : 'button';
  const label =
    data.state === 'timer'
      ? `Timer ${data.digits ?? ''} — open panel`
      : data.state === 'done'
        ? 'Timer finished — open panel'
        : music
          ? `${data.state === 'playing' ? 'Playing' : 'Paused'} ${data.title} — open panel`
          : data.state === 'files' || data.state === 'drag'
            ? `${data.title} — open panel`
            : data.state === 'error'
              ? 'Connection lost — open panel'
              : 'Beam — open panel';

  return `<div class="pill" role="${role}" tabindex="0" aria-label="${esc(label)}" data-state="${data.state}"${data.hover ? ' data-hover="true"' : ''}><div class="mascot-wrap">${thumb}${pip}</div><div class="slot"><div class="meta">${rest}</div></div>${action}${controls}</div>`;
}
