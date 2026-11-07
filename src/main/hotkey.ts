import { globalShortcut } from 'electron';

export function registerHotkey(toggle: () => void): string | null {
  if (globalShortcut.register('Alt+Space', toggle)) return 'Alt+Space';
  if (globalShortcut.register('Ctrl+Shift+Space', toggle)) return 'Ctrl+Shift+Space';
  return null;
}
