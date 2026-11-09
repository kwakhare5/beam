import type { BrowserWindow, Rectangle } from 'electron';
import { panelBounds } from './geometry';
import { IPC, type ShelfFile } from '../shared/ipc';

export class PanelController {
  private opened = false;

  constructor(
    private readonly window: () => BrowserWindow | null,
    private readonly pillBounds: () => Rectangle,
    private readonly rows: () => ShelfFile[],
    private readonly shape: (target: BrowserWindow) => void
  ) {}

  get open(): boolean {
    return this.opened;
  }

  show(tab?: 'settings'): void {
    const window = this.window();
    if (!window || window.isDestroyed()) return;
    if (this.opened) {
      if (tab) {
        window.webContents.send(IPC.panelOpen, this.rows(), tab);
        window.focus();
      }
      return;
    }
    if (!window.isVisible()) return;
    this.opened = true;
    const bounds = panelBounds(window);
    window.setBounds(bounds);
    this.shape(window);
    console.log(`[panel] bounds=${bounds.x},${bounds.y},${bounds.width},${bounds.height}`);
    window.focus();
    window.webContents.send(IPC.panelOpen, this.rows(), tab);
  }

  hide(): void {
    const window = this.window();
    if (!this.opened || !window || window.isDestroyed()) return;
    this.opened = false;
    window.webContents.send(IPC.panelDismiss);
  }

  collapsed(): void {
    const window = this.window();
    if (!window || window.isDestroyed()) return;
    this.opened = false;
    const pill = this.pillBounds();
    window.setBounds(pill);
    this.shape(window);
    console.log(`[window] pill=${pill.x},${pill.y},${pill.width},${pill.height}`);
  }

  dismissOnBlur(pickingFiles: boolean): void {
    if (this.opened && !pickingFiles) this.hide();
  }
}
