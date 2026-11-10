import { icon } from '../../shared/icons';
import { esc } from '../../shared/html';
import { MASCOTS } from '../../shared/mascots';
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

export function musicClock(ms: number): string {
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
  const elapsed = musicClock(clamped);
  const total = musicClock(duration);
  const now = Math.round(clamped / 1000);
  const max = Math.round(duration / 1000);

  return `<div class="track"><div class="track-bar" data-music-bar data-duration-ms="${Math.round(duration)}" role="slider" tabindex="0" aria-label="Seek" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${now}" aria-valuetext="${esc(`${elapsed} of ${total}`)}"><span class="track-rail"><span class="track-fill" style="width:${percent}%"></span></span><span class="track-knob" style="left:${percent}%"></span></div><div class="track-times"><span>${elapsed}</span><span>${total}</span></div></div>`;
}

function paintBar(bar: HTMLElement, positionMs: number): void {
  const duration = Number(bar.dataset.durationMs ?? '0');
  const clamped = Math.min(Math.max(positionMs, 0), duration);
  const percent = duration > 0 ? Math.round((clamped / duration) * 100) : 0;
  const fill = bar.querySelector<HTMLElement>('.track-fill');
  const knob = bar.querySelector<HTMLElement>('.track-knob');
  if (fill) fill.style.width = `${percent}%`;
  if (knob) knob.style.left = `${percent}%`;
  bar.setAttribute('aria-valuenow', String(Math.round(clamped / 1000)));
  bar.setAttribute('aria-valuetext', `${musicClock(clamped)} of ${musicClock(duration)}`);
  const times = bar.parentElement?.querySelectorAll<HTMLElement>('.track-times span');
  if (times && times.length === 2) {
    const [elapsedEl, totalEl] = times;
    if (elapsedEl) elapsedEl.textContent = musicClock(clamped);
    if (totalEl) totalEl.textContent = musicClock(duration);
  }
}

export function bindMusicSeek(root: Document | Element, seek: (positionMs: number) => void | Promise<void>): void {
  const barFrom = (target: EventTarget | null): HTMLElement | null => {
    if (!(target instanceof Element)) return null;
    return target.closest<HTMLElement>('[data-music-bar]');
  };
  const positionAt = (bar: HTMLElement, clientX: number): number => {
    const rect = bar.getBoundingClientRect();
    const duration = Number(bar.dataset.durationMs ?? '0');
    const ratio = rect.width > 0 ? Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) : 0;
    return Math.round(ratio * duration);
  };
  const commit = (bar: HTMLElement, positionMs: number): void => {
    const track = bar.closest<HTMLElement>('.track');
    track?.setAttribute('data-seeking', 'true');
    void Promise.resolve()
      .then(() => seek(positionMs))
      .catch((error: unknown) => console.error('[music] seek failed', error))
      .finally(() => track?.removeAttribute('data-seeking'));
  };

  let drag: { bar: HTMLElement; pointerId: number } | null = null;
  root.addEventListener('pointerdown', (event) => {
    const pointer = event as PointerEvent;
    const bar = barFrom(pointer.target);
    if (!bar || pointer.button !== 0) return;
    pointer.preventDefault();
    bar.focus({ preventScroll: true });
    bar.closest<HTMLElement>('.track')?.setAttribute('data-seeking', 'true');
    drag = { bar, pointerId: pointer.pointerId };
    bar.setPointerCapture(pointer.pointerId);
    paintBar(bar, positionAt(bar, pointer.clientX));
  });
  root.addEventListener('pointermove', (event) => {
    const pointer = event as PointerEvent;
    if (!drag || pointer.pointerId !== drag.pointerId) return;
    if (!drag.bar.isConnected) {
      drag = null;
      return;
    }
    paintBar(drag.bar, positionAt(drag.bar, pointer.clientX));
  });
  const end = (event: Event): void => {
    const pointer = event as PointerEvent;
    if (!drag || pointer.pointerId !== drag.pointerId) return;
    const { bar } = drag;
    drag = null;
    if (bar.hasPointerCapture(pointer.pointerId)) bar.releasePointerCapture(pointer.pointerId);
    if (!bar.isConnected) {
      bar.closest<HTMLElement>('.track')?.removeAttribute('data-seeking');
      return;
    }
    commit(bar, positionAt(bar, pointer.clientX));
  };
  const cancel = (event: Event): void => {
    const pointer = event as PointerEvent;
    if (!drag || pointer.pointerId !== drag.pointerId) return;
    const { bar } = drag;
    drag = null;
    if (bar.hasPointerCapture(pointer.pointerId)) bar.releasePointerCapture(pointer.pointerId);
    bar.closest<HTMLElement>('.track')?.removeAttribute('data-seeking');
  };
  root.addEventListener('pointerup', end);
  root.addEventListener('pointercancel', cancel);
  root.addEventListener('keydown', (event) => {
    const bar = barFrom((event as KeyboardEvent).target);
    if (!bar) return;
    const key = (event as KeyboardEvent).key;
    if (key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== 'Home' && key !== 'End') return;
    event.preventDefault();
    const duration = Number(bar.dataset.durationMs ?? '0');
    const now = Number(bar.getAttribute('aria-valuenow') ?? '0') * 1000;
    const next =
      key === 'Home' ? 0 : key === 'End' ? duration : Math.min(Math.max(now + (key === 'ArrowLeft' ? -5000 : 5000), 0), duration);
    paintBar(bar, next);
    commit(bar, next);
  });
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
      'panel-music-skeleton',
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
    <button type="button" class="icon-btn" data-action="prev" aria-label="Previous">${icon('prev')}</button>
    <button type="button" class="icon-btn primary" data-action="toggle" aria-label="${data.playing ? 'Pause' : 'Play'}">${icon(data.playing ? 'pause' : 'play')}</button>
    <button type="button" class="icon-btn" data-action="next" aria-label="Next">${icon('next')}</button>
  </div>`;

  const state = data.playing ? 'Playing' : 'Paused';
  const pip = `<span class="status-pip ${data.playing ? 'green' : 'amber'}"></span><span class="sr-only">${state}</span>`;

  return panelBody(
    'music',
    `${art}<div class="panel-music-content"><div class="panel-meta"><div class="panel-title">${esc(data.title)}</div><div class="panel-sub music-artist"><span class="music-artist-name">${esc(data.subtitle)}</span>${pip}</div></div>${progress(data)}${controls}</div>`,
    'panel-music',
    active
  );
}
