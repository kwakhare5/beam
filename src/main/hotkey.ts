import { globalShortcut } from 'electron';

export const DEFAULT_HOTKEY = 'Alt+Space';
export const FALLBACK_HOTKEY = 'Ctrl+Shift+Space';

let active: string | null = null;

export function currentHotkey(): string {
  return active ?? '';
}

function isValidHotkey(chord: string): boolean {
  return /^(Ctrl|Alt|Shift|Command)(\+(Ctrl|Alt|Shift|Command))*\+(Space|[A-Z]|[0-9]|F([1-9]|1[0-9]|2[0-4]))$/.test(
    chord
  );
}

export function registerHotkey(toggle: () => void, preferred = DEFAULT_HOTKEY): string | null {
  globalShortcut.unregisterAll();
  active = null;
  const candidates = [preferred, DEFAULT_HOTKEY, FALLBACK_HOTKEY].filter(
    (chord, index, all) => chord.length > 0 && all.indexOf(chord) === index && isValidHotkey(chord)
  );
  for (const chord of candidates) {
    try {
      if (globalShortcut.register(chord, toggle)) {
        active = chord;
        return chord;
      }
    } catch {
      continue;
    }
  }
  return null;
}

export function rebindHotkey(chord: string, toggle: () => void): { ok: boolean; shortcut: string; error?: string } {
  if (!isValidHotkey(chord)) return { ok: false, shortcut: currentHotkey(), error: 'Pick a modifier and a key' };
  const previous = active;
  globalShortcut.unregisterAll();
  active = null;
  let ok = false;
  try {
    ok = globalShortcut.register(chord, toggle);
  } catch {
    ok = false;
  }
  if (ok) {
    active = chord;
    return { ok: true, shortcut: chord };
  }
  if (previous) {
    try {
      if (globalShortcut.register(previous, toggle)) active = previous;
    } catch {
      active = null;
    }
  }
  return { ok: false, shortcut: currentHotkey(), error: 'In use' };
}
