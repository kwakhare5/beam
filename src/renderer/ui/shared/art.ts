import { MASCOTS } from './mascots';

export function bindArtFallback(root: Document | Element): void {
  root.addEventListener(
    'error',
    (event) => {
      const image = event.target;
      if (!(image instanceof HTMLImageElement) || image.dataset.fallback === 'true') return;
      if (!image.classList.contains('pill-art') && !image.classList.contains('art')) return;
      image.dataset.fallback = 'true';
      image.classList.remove('pill-art');
      image.classList.add('art-fallback-img');
      image.src = MASCOTS.master;
    },
    true
  );
}
