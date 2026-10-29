import { icon } from '../../shared/icons';
import { esc } from '../../shared/html';
import { panelBody } from '../panel-body';

export interface SettingsData {
  startup: boolean;
  shortcut: string;
  volume: number;
  theme: 'dark' | 'light';
  rebinding?: boolean;
}

export function settingsPanel(data: SettingsData, active = true): string {
  const keys = data.shortcut.split('+').map((key) => key.trim()).filter(Boolean);
  const shortcut = data.rebinding
    ? '<button type="button" class="kbd capturing" aria-label="Press the new shortcut">Press keys…</button>'
    : `<button type="button" class="kbd" aria-label="Change toggle shortcut (${esc(data.shortcut)})">${keys.map((key) => `<span class="keycap">${esc(key)}</span>`).join('')}</button>`;

  const volume = Math.min(100, Math.max(0, Math.round(data.volume)));

  const content = `<div class="setting"><div>Start with Windows<span class="hint">Starts Beam when you sign in</span></div><button type="button" class="switch" role="switch" aria-checked="${data.startup}" aria-label="Start with Windows"></button></div>
    <div class="setting"><div>Toggle shortcut<span class="hint">Click to rebind</span></div>${shortcut}</div>
    <div class="setting"><div>Chime volume<span class="hint">Plays once when the timer ends</span></div><div class="stepper"><button type="button" class="step" aria-label="Lower chime volume">−</button><span class="setting-value">${volume}%</span><button type="button" class="step" aria-label="Raise chime volume">+</button><button type="button" class="step" aria-label="Play chime">${icon('play')}</button></div></div>
    <div class="setting"><div>Theme<span class="hint">Light or dark, remembered</span></div><div class="setting-inline"><span class="setting-value">${data.theme === 'dark' ? 'Dark' : 'Light'}</span><button type="button" class="switch" role="switch" aria-checked="${data.theme === 'dark'}" aria-label="Dark theme"></button></div></div>
    <div class="setting"><div>Reset position<span class="hint">Move the capsule back to its default spot</span></div><button type="button" class="btn ghost">Reset</button></div>`;

  return panelBody('settings', content, 'panel-settings', active);
}
