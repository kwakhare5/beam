import type { BrowserWindow } from 'electron';
import { ipcMain } from 'electron';
import { IPC, type SettingsPatch, type SettingsResult, type SettingsSnapshot } from '../shared/ipc';
import { currentHotkey, DEFAULT_HOTKEY, rebindHotkey } from './hotkey';
import type { BeamSettings } from './settings';
import { isStartupEnabled, setStartupEnabled } from './startup';

export interface SettingsGate {
  window: BrowserWindow;
  settings: BeamSettings;
  save: () => void;
  resetPosition: () => void;
  trayToggle: () => void;
}

export function registerSettingsIpc(gate: SettingsGate): void {
  const { window, settings } = gate;
  let error = '';

  const snapshot = (): SettingsSnapshot => ({
    startup: isStartupEnabled(),
    shortcut: currentHotkey() || settings.shortcut || DEFAULT_HOTKEY,
    volume: settings.volume,
    theme: settings.theme,
    ...(error ? { error } : {})
  });
  const send = (): void => {
    if (!window.isDestroyed()) window.webContents.send(IPC.settingsState, snapshot());
  };

  window.webContents.on('did-finish-load', send);

  ipcMain.handle(IPC.settingsGet, (): SettingsSnapshot => snapshot());

  ipcMain.handle(IPC.settingsSet, (event, patch: unknown): SettingsResult => {
    if (event.sender !== window.webContents) {
      return { ok: false, settings: snapshot(), error: 'untrusted sender' };
    }
    if (!patch || typeof patch !== 'object') {
      return { ok: false, settings: snapshot(), error: 'bad settings change' };
    }
    const change = patch as SettingsPatch;
    error = '';
    let ok = true;
    if (change.theme !== undefined) {
      if (change.theme === 'dark' || change.theme === 'light') settings.theme = change.theme;
      else {
        ok = false;
        error = 'Unknown theme';
      }
    }
    if (change.volume !== undefined) {
      const volume = change.volume;
      if (typeof volume === 'number' && Number.isFinite(volume)) {
        settings.volume = Math.max(0, Math.min(100, Math.round(volume)));
      } else {
        ok = false;
        error = 'Volume must be 0 to 100';
      }
    }
    if (change.startup !== undefined) {
      if (typeof change.startup === 'boolean') {
        const result = setStartupEnabled(change.startup);
        if (result.ok) settings.startup = change.startup;
        else {
          ok = false;
          error = result.error ?? 'Startup change failed';
        }
      } else {
        ok = false;
        error = 'Startup must be true or false';
      }
    }
    if (change.shortcut !== undefined) {
      if (typeof change.shortcut === 'string' && change.shortcut !== currentHotkey()) {
        const result = rebindHotkey(change.shortcut, gate.trayToggle);
        if (result.ok) settings.shortcut = result.shortcut;
        else {
          ok = false;
          error = result.error ?? 'Shortcut unavailable';
        }
      } else if (typeof change.shortcut !== 'string') {
        ok = false;
        error = 'Shortcut must be a chord';
      }
    }
    if (ok) gate.save();
    const current = snapshot();
    window.webContents.send(IPC.settingsState, current);
    console.log(
      `[settings] set ok=${ok} theme=${settings.theme} volume=${settings.volume} shortcut=${currentHotkey() || 'none'} startup=${current.startup}${error ? ` error=${error}` : ''}`
    );
    return { ok, settings: current, ...(error ? { error } : {}) };
  });

  ipcMain.handle(IPC.settingsResetPosition, (event): SettingsResult => {
    if (event.sender !== window.webContents) {
      return { ok: false, settings: snapshot(), error: 'untrusted sender' };
    }
    gate.resetPosition();
    return { ok: true, settings: snapshot() };
  });
}
