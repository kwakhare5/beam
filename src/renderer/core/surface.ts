export const SURFACE_OPEN_MS = 150;
export const SURFACE_CLOSING_MS = 200;
export const SURFACE_COLLAPSE_MS = 160;
export const SURFACE_PILL_SETTLE_MS = 220;

export function openSurface(body: HTMLElement, panel: HTMLElement | null): void {
  if (!panel) return;
  void panel.offsetWidth;
  requestAnimationFrame(() => {
    body.classList.add('is-open');
    panel.focus({ preventScroll: true });
  });
}

export function beginClose(body: HTMLElement): void {
  body.classList.remove('is-open');
  body.classList.add('is-closing');
}

export function endClose(body: HTMLElement): void {
  body.classList.remove('is-closing');
}
