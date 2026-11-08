import { screen, type BrowserWindow, type Point, type Rectangle } from 'electron';
import type { SavedPosition } from './settings';

export const WINDOW_WIDTH = 136;
export const WINDOW_HEIGHT = 42;
export const PILL_HEIGHT = 30;
export const PANEL_WIDTH = 452;
export const PANEL_HEIGHT = 316;
export const PILL_GAP = 12;
export const NEAR_RADIUS = 37;

export function isCursorNear(cursor: Point, pill: Rectangle): boolean {
  const dx = cursor.x - (pill.x + pill.width / 2);
  const dy = cursor.y - (pill.y + pill.height / 2);
  return Math.hypot(dx, dy) <= NEAR_RADIUS;
}

export function placeWindow(window: BrowserWindow, resize: boolean): void {
  if (resize) window.setContentSize(WINDOW_WIDTH, WINDOW_HEIGHT);
  const { workArea } = screen.getPrimaryDisplay();
  const bounds = window.getBounds();
  const content = window.getContentBounds();
  // anchor against the content rect: Windows pads the frame height at non-100% scale
  const dx = Math.round(workArea.x + workArea.width / 2 - (content.x + content.width / 2));
  const dy = Math.round(
    workArea.y + workArea.height - PILL_GAP - (content.y + (content.height + PILL_HEIGHT) / 2)
  );
  window.setPosition(bounds.x + dx, bounds.y + dy);
  const placed = window.getBounds();
  const inner = window.getContentBounds();
  console.log(
    `[window] bounds=${placed.x},${placed.y},${placed.width},${placed.height}` +
      ` content=${inner.x},${inner.y},${inner.width},${inner.height}` +
      ` work=${workArea.x},${workArea.y},${workArea.width},${workArea.height}`
  );
}

export function anchorBounds(): Rectangle {
  const { workArea } = screen.getPrimaryDisplay();
  const inset = (WINDOW_HEIGHT - PILL_HEIGHT) / 2;
  return {
    x: Math.round(workArea.x + (workArea.width - WINDOW_WIDTH) / 2),
    y: workArea.y + workArea.height - PILL_GAP - PILL_HEIGHT - inset,
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT
  };
}

export function clampToWorkArea(bounds: Rectangle, workArea: Rectangle): Rectangle {
  return {
    x: Math.round(Math.min(Math.max(bounds.x, workArea.x), workArea.x + workArea.width - bounds.width)),
    y: Math.round(Math.min(Math.max(bounds.y, workArea.y), workArea.y + workArea.height - bounds.height)),
    width: bounds.width,
    height: bounds.height
  };
}

export function savedPillBounds(saved: SavedPosition | null): Rectangle | null {
  if (!saved) return null;
  const bounds = { x: saved.x, y: saved.y, width: WINDOW_WIDTH, height: WINDOW_HEIGHT };
  const display = screen.getAllDisplays().find(({ workArea }) => {
    return (
      bounds.x + bounds.width > workArea.x &&
      bounds.x < workArea.x + workArea.width &&
      bounds.y + bounds.height > workArea.y &&
      bounds.y < workArea.y + workArea.height
    );
  });
  if (!display) {
    console.log('[settings] saved monitor is gone; anchoring on the primary display');
    return null;
  }
  return clampToWorkArea(bounds, display.workArea);
}

export function panelBounds(window: BrowserWindow): Rectangle {
  const { workArea } = screen.getDisplayMatching(window.getBounds());
  const pill = window.getBounds();
  const center = pill.x + pill.width / 2;
  const x = Math.round(
    Math.min(Math.max(center - PANEL_WIDTH / 2, workArea.x + 8), workArea.x + workArea.width - PANEL_WIDTH - 8)
  );
  const lowerHalf = pill.y + pill.height / 2 > workArea.y + workArea.height / 2;
  const rawY = lowerHalf ? pill.y + pill.height - PANEL_HEIGHT : pill.y;
  const y = Math.round(Math.min(Math.max(rawY, workArea.y + 8), workArea.y + workArea.height - PANEL_HEIGHT - 8));
  return { x, y, width: PANEL_WIDTH, height: PANEL_HEIGHT };
}
