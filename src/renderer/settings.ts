import type { SettingsPatch, SettingsSnapshot } from '../shared/ipc';
import type { SettingsData } from './ui/panel/tabs/settings';

export interface SettingsApi {
  setSettings(patch: SettingsPatch): Promise<{ ok: boolean; settings: SettingsSnapshot }>;
  resetPosition(): Promise<{ ok: boolean; settings: SettingsSnapshot }>;
}

export interface SettingsHost {
  setVolume: (volume: number) => void;
  apply: (data: SettingsData) => void;
  render: () => void;
}

export function chordFromEvent(event: KeyboardEvent): string | null {
  const mods: string[] = [];
  if (event.ctrlKey) mods.push('Ctrl');
  if (event.altKey) mods.push('Alt');
  if (event.shiftKey) mods.push('Shift');
  if (event.metaKey) mods.push('Command');
  const key = event.key;
  const name = /^[a-zA-Z]$/.test(key)
    ? key.toUpperCase()
    : /^[0-9]$/.test(key)
      ? key
      : key === ' ' || key === 'Spacebar'
        ? 'Space'
        : /^F([1-9]|1[0-9]|2[0-4])$/.test(key)
          ? key
          : null;
  if (!name || mods.length === 0) return null;
  return [...mods, name].join('+');
}

export class SettingsController {
  private current: SettingsSnapshot | null = null;
  private active = false;

  constructor(
    private readonly api: () => SettingsApi | undefined,
    private readonly host: SettingsHost
  ) {}

  get rebinding(): boolean {
    return this.active;
  }

  apply(next: SettingsSnapshot): void {
    this.current = next;
    document.documentElement.dataset.theme = next.theme;
    this.host.setVolume(next.volume / 100);
    this.paint();
  }

  patch(patch: SettingsPatch): void {
    const api = this.api();
    if (!api) return;
    void api
      .setSettings(patch)
      .then((result) => this.apply(result.settings))
      .catch((error: unknown) => console.error('[settings] update failed', error));
  }

  reset(): void {
    const api = this.api();
    if (!api) return;
    void api
      .resetPosition()
      .then((result) => this.apply(result.settings))
      .catch((error: unknown) => console.error('[settings] reset failed', error));
  }

  beginRebind(): void {
    this.active = true;
    this.paint();
  }

  cancelRebind(): void {
    this.active = false;
    this.paint();
  }

  submit(chord: string | null): void {
    if (!chord) return;
    this.active = false;
    const api = this.api();
    if (!api) {
      this.paint();
      return;
    }
    void api
      .setSettings({ shortcut: chord })
      .then((result) => this.apply(result.settings))
      .catch((error: unknown) => {
        this.active = false;
        this.paint();
        console.error('[settings] shortcut failed', error);
      });
  }

  private paint(): void {
    if (this.current) this.host.apply(this.view(this.current));
    this.host.render();
  }

  private view(next: SettingsSnapshot): SettingsData {
    return {
      startup: next.startup,
      shortcut: next.shortcut.replace(/\+/g, ' + '),
      volume: next.volume,
      theme: next.theme,
      rebinding: this.active,
      ...(next.error ? { error: next.error } : {})
    };
  }
}
