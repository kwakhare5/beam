import { icon } from '../icons';
import { esc } from '../html';
import { MASCOTS } from '../mascots';
import { panelBody } from '../panel-body';

export interface MusicData {
  title: string;
  subtitle: string;
  art?: string;
  playing?: boolean;
  loading?: boolean;
  positionMs?: number;
  durationMs?: number;
}

function clock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (value: number): string => String(value).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

function progress(data: MusicData): string {
  const position = data.positionMs;
  const duration = data.durationMs;
  if (position === undefined || duration === undefined || duration <= 0) return '';

  const clamped = Math.min(Math.max(position, 0), duration);
  const percent = Math.round((clamped / duration) * 100);
  const elapsed = clock(clamped);
  const total = clock(duration);

  return `<div class="track"><div class="track-bar" role="progressbar" aria-label="Track position" aria-valuemin="0" aria-valuemax="${Math.round(duration / 1000)}" aria-valuenow="${Math.round(clamped / 1000)}" aria-valuetext="${esc(`${elapsed} of ${total}`)}"><span class="track-fill" style="width:${percent}%"></span></div><div class="track-times"><span>${elapsed}</span><span>${total}</span></div></div>`;
}

export function musicPanel(data: MusicData, active = true): string {
  if (data.loading) {
    const controls = `<div class="music-controls">
      <button type="button" class="icon-btn" aria-label="Previous" disabled>${icon('prev')}</button>
      <button type="button" class="icon-btn primary" aria-label="Play" disabled>${icon('play')}</button>
      <button type="button" class="icon-btn" aria-label="Next" disabled>${icon('next')}</button>
    </div>`;

    return panelBody(
      'music',
      `<div class="art skeleton" aria-hidden="true"></div><div class="panel-music-content"><div class="skeleton-line w-65"></div><div class="skeleton-line w-40"></div><div class="skeleton-line w-25"></div>${controls}</div>`,
      'panel-music',
      active
    );
  }

  if (!data.title) {
    return panelBody(
      'music',
      `<div class="panel-empty-content"><img class="mascot-large" src="${MASCOTS.master}" alt="" /><div class="panel-title">No music playing</div><div class="panel-sub">Start playback in any app</div></div>`,
      'panel-empty',
      active
    );
  }

  const art = data.art
    ? `<img class="art" src="${esc(data.art)}" alt="" />`
    : `<div class="art art-fallback"><img class="mascot-large" src="${MASCOTS.master}" alt="" /></div>`;

  const controls = `<div class="music-controls">
    <button type="button" class="icon-btn" aria-label="Previous">${icon('prev')}</button>
    <button type="button" class="icon-btn primary" aria-label="${data.playing ? 'Pause' : 'Play'}">${icon(data.playing ? 'pause' : 'play')}</button>
    <button type="button" class="icon-btn" aria-label="Next">${icon('next')}</button>
  </div>`;

  const state = data.playing ? 'Playing' : 'Paused';
  const pip = `<span class="status-pip ${data.playing ? 'green' : 'amber'}"></span><span class="sr-only">${state}</span>`;

  return panelBody(
    'music',
    `${art}<div class="panel-music-content"><div class="panel-meta"><div class="panel-title-row"><div class="panel-title">${esc(data.title)}</div>${pip}</div><div class="panel-sub">${esc(data.subtitle)}</div></div>${progress(data)}${controls}</div>`,
    'panel-music',
    active
  );
}
