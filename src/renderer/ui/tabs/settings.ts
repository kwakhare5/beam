import { esc } from '../html';
import { panelBody } from '../panel-body';

export interface SettingsData {
  startup: boolean;
  shortcut: string;
  volume: string;
  theme: string;
}

export function settingsPanel(data: SettingsData): string {
  const content = `<div class="setting"><div>Start with Windows<span class="hint">launches the pill at login</span></div><button type="button" class="switch" role="switch" aria-checked="${data.startup}" aria-label="Start with Windows"></button></div>
    <div class="setting"><div>Toggle shortcut<span class="hint">click to rebind</span></div><span class="kbd">${esc(data.shortcut)}</span></div>
    <div class="setting"><div>Chime volume<span class="hint">plays once when the timer ends</span></div><span class="kbd">${esc(data.volume)}</span></div>
    <div class="setting"><div>Theme<span class="hint">light or dark, remembered</span></div><span class="kbd">${esc(data.theme)}</span></div>
    <div class="setting"><div>Reset position<span class="hint">back to the taskbar anchor</span></div><button type="button" class="btn ghost">Reset</button></div>`;

  return panelBody('settings', content);
}
