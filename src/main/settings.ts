import { app } from 'electron';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export interface SavedPosition {
  x: number;
  y: number;
}

export type Theme = 'dark' | 'light';

export interface BeamSettings {
  version: 1;
  position: SavedPosition | null;
  startup: boolean;
  shortcut: string;
  volume: number;
  theme: Theme;
  [key: string]: unknown;
}

export const SETTINGS_DEFAULTS = {
  startup: false,
  shortcut: '',
  volume: 60,
  theme: 'dark' as Theme
};

export function getSettingsPath(): string {
  const override = process.env.BEAM_SETTINGS_PATH;
  if (override && override.length > 0) return override;
  return join(app.getPath('userData'), 'settings.json');
}

function isSavedPosition(value: unknown): value is SavedPosition {
  if (!value || typeof value !== 'object') return false;
  const position = value as Record<string, unknown>;
  return (
    typeof position.x === 'number' &&
    Number.isFinite(position.x) &&
    typeof position.y === 'number' &&
    Number.isFinite(position.y)
  );
}

function cleanVolume(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return SETTINGS_DEFAULTS.volume;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function loadSettings(): BeamSettings {
  const defaults: BeamSettings = { version: 1, position: null, ...SETTINGS_DEFAULTS };
  try {
    const raw = JSON.parse(readFileSync(getSettingsPath(), 'utf8')) as Record<string, unknown>;
    const position = isSavedPosition(raw.position)
      ? { x: Math.round(raw.position.x), y: Math.round(raw.position.y) }
      : null;
    if (raw.position != null && !position) console.log('[settings] dropped an invalid position');
    return {
      ...raw,
      version: 1,
      position,
      startup: raw.startup === true,
      shortcut: typeof raw.shortcut === 'string' ? raw.shortcut : SETTINGS_DEFAULTS.shortcut,
      volume: cleanVolume(raw.volume),
      theme: raw.theme === 'light' ? 'light' : 'dark'
    };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') console.log('[settings] unreadable, starting from defaults');
    return defaults;
  }
}

export function saveSettings(settings: BeamSettings): boolean {
  try {
    const file = getSettingsPath();
    mkdirSync(dirname(file), { recursive: true });
    const temp = `${file}.tmp`;
    writeFileSync(temp, `${JSON.stringify(settings, null, 2)}\n`);
    renameSync(temp, file);
    return true;
  } catch (error) {
    console.error('[settings] save failed', error);
    return false;
  }
}
