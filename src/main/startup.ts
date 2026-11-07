import { execFileSync } from 'node:child_process';
import { app } from 'electron';

const RUN_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
const VALUE = 'Beam';

export function startupCommand(): string {
  return app.isPackaged
    ? `"${app.getPath('exe')}"`
    : `"${process.execPath}" "${app.getAppPath()}"`;
}

export function isStartupEnabled(): boolean {
  try {
    execFileSync('reg.exe', ['query', RUN_KEY, '/v', VALUE], { stdio: 'ignore', windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

export function setStartupEnabled(enabled: boolean): { ok: boolean; error?: string } {
  try {
    if (enabled) {
      execFileSync(
        'reg.exe',
        ['add', RUN_KEY, '/v', VALUE, '/t', 'REG_SZ', '/d', startupCommand(), '/f'],
        { stdio: 'ignore', windowsHide: true }
      );
    } else {
      try {
        execFileSync('reg.exe', ['delete', RUN_KEY, '/v', VALUE, '/f'], { stdio: 'ignore', windowsHide: true });
      } catch {
        return { ok: !isStartupEnabled(), error: isStartupEnabled() ? 'reg delete failed' : undefined };
      }
    }
    return isStartupEnabled() === enabled ? { ok: true } : { ok: false, error: 'the registry did not change' };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
