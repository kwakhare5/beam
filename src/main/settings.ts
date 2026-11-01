import { app } from 'electron';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export interface SavedPosition {
  x: number;
  y: number;
  displayId: number;
}

export interface BeamSettings {
  version: 1;
  position: SavedPosition | null;
  [key: string]: unknown;
}

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
    Number.isFinite(position.y) &&
    typeof position.displayId === 'number' &&
    Number.isFinite(position.displayId)
  );
}

export function loadSettings(): BeamSettings {
  try {
    const raw = JSON.parse(readFileSync(getSettingsPath(), 'utf8')) as Record<string, unknown>;
    const position = isSavedPosition(raw.position)
      ? {
          x: Math.round(raw.position.x),
          y: Math.round(raw.position.y),
          displayId: raw.position.displayId
        }
      : null;
    if (raw.position != null && !position) console.log('[settings] dropped an invalid position');
    return { ...raw, version: 1, position };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') console.log('[settings] unreadable, starting from defaults');
    return { version: 1, position: null };
  }
}

export function saveSettings(settings: BeamSettings): boolean {
  try {
    const file = getSettingsPath();
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, `${JSON.stringify(settings, null, 2)}\n`);
    return true;
  } catch (error) {
    console.error('[settings] save failed', error);
    return false;
  }
}
