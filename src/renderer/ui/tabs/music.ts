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
}

export function musicPanel(data: MusicData): string {
  if (data.loading) {
    const controls = `<div class="controls music-controls">
      <button type="button" class="icon-btn" aria-label="Previous" disabled>${icon('prev')}</button>
      <button type="button" class="icon-btn primary" aria-label="Play" disabled>${icon('play')}</button>
      <button type="button" class="icon-btn" aria-label="Next" disabled>${icon('next')}</button>
    </div>`;

    return panelBody(
      'music',
      `<div class="art skeleton" aria-hidden="true"></div><div class="panel-music-content"><div class="skeleton-line" style="width:65%"></div><div class="skeleton-line" style="width:40%"></div>${controls}</div>`,
      'panel-music'
    );
  }

  if (!data.title) {
    return panelBody(
      'music',
      `<div class="panel-empty-content"><img class="mascot-large" src="${MASCOTS.music}" alt="" /><div class="panel-title">Nothing playing</div><div class="panel-sub">Play something to see it here</div></div>`,
      'panel-empty'
    );
  }

  const art = data.art
    ? `<img class="art" src="${esc(data.art)}" alt="" />`
    : `<div class="art art-fallback"><img class="mascot-large" src="${MASCOTS.music}" alt="" /></div>`;

  const controls = `<div class="controls music-controls">
    <button type="button" class="icon-btn" aria-label="Previous">${icon('prev')}</button>
    <button type="button" class="icon-btn primary" aria-label="${data.playing ? 'Pause' : 'Play'}">${icon(data.playing ? 'pause' : 'play')}</button>
    <button type="button" class="icon-btn" aria-label="Next">${icon('next')}</button>
  </div>`;

  return panelBody(
    'music',
    `${art}<div class="panel-music-content"><div class="panel-meta"><div class="panel-title">${esc(data.title)}</div><div class="panel-sub">${esc(data.subtitle)}</div></div>${controls}</div>`,
    'panel-music'
  );
}
