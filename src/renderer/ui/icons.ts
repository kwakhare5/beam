import { ICON_PATHS } from './icons.generated';

export type IconName =
  | 'play'
  | 'pause'
  | 'prev'
  | 'next'
  | 'music'
  | 'files'
  | 'timer'
  | 'calendar'
  | 'sliders'
  | 'x'
  | 'alert'
  | 'copy'
  | 'trash'
  | 'file'
  | 'folder'
  | 'monitor'
  | 'check'
  | 'plus';

type MediaName = 'play' | 'pause' | 'prev' | 'next';

const MEDIA_PATHS: Record<MediaName, string> = {
  play: '<path d="M8 5v14l11-7z"/>',
  pause: '<rect x="6" y="5" width="4" height="14" rx="1.5"/><rect x="14" y="5" width="4" height="14" rx="1.5"/>',
  prev: '<path d="M19 5v14l-9-7z"/><rect x="5" y="5" width="2.5" height="14" rx="1"/>',
  next: '<path d="M5 5v14l9-7z"/><rect x="16.5" y="5" width="2.5" height="14" rx="1"/>'
};

export function icon(name: IconName, px?: number): string {
  return `<svg aria-hidden="true" focusable="false"${px ? ` style="width:${px}px;height:${px}px"` : ''}><use href="#i-${name}"/></svg>`;
}

function symbol(name: IconName): string {
  const media = MEDIA_PATHS[name as MediaName];
  const inner = media ?? ICON_PATHS[name];
  const paint = media
    ? 'fill="currentColor" stroke="none"'
    : 'fill="none" stroke="currentColor" stroke-width="2"';

  return `<symbol id="i-${name}" viewBox="0 0 24 24" ${paint} stroke-linecap="round" stroke-linejoin="round">${inner}</symbol>`;
}

export function iconSprite(): string {
  const names = [
    ...(Object.keys(ICON_PATHS) as IconName[]),
    ...(Object.keys(MEDIA_PATHS) as IconName[])
  ];
  const icons = names.map(symbol).join('');
  return `<svg width="0" height="0" style="position:absolute" aria-hidden="true">${icons}</svg>`;
}
