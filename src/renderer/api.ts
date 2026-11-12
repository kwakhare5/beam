import type { AddResult, CopyResult, FileChange, HelperState, MusicState, SettingsPatch, SettingsSnapshot, ShelfFile, TimerSnapshot } from '../shared/ipc';

export type BeamApi = {
  getPathForFile(file: File): string;
  addFiles(paths: string[]): Promise<AddResult>;
  pickFiles(): Promise<AddResult | null>;
  copyFiles(paths: string[], source: 'row' | 'all'): Promise<CopyResult>;
  startFileDrag(paths: string[]): void;
  removeFile(path: string): Promise<FileChange>;
  clearFiles(): Promise<FileChange>;
  openPanel(): void;
  panelCollapsed(): void;
  setPillSize(width: number, height: number): void;
  beginWindowDrag(x: number, y: number): void;
  moveWindowDrag(x: number, y: number): void;
  endWindowDrag(x: number, y: number): void;
  onPanelOpen(callback: (files: ShelfFile[], tab?: 'settings') => void): void;
  onPanelDismiss(callback: () => void): void;
  onMusicState(callback: (state: MusicState | null) => void): void;
  onHelperState(callback: (state: HelperState) => void): void;
  onPillNear(callback: (near: boolean) => void): void;
  startTimer(minutes: number): Promise<TimerSnapshot | null>;
  cancelTimer(): Promise<TimerSnapshot | null>;
  dismissTimer(): Promise<TimerSnapshot | null>;
  timerChimed(id: number, ok: boolean): void;
  onTimerState(callback: (state: TimerSnapshot) => void): void;
  getSettings(): Promise<SettingsSnapshot>;
  setSettings(patch: SettingsPatch): Promise<{ ok: boolean; settings: SettingsSnapshot; error?: string }>;
  resetPosition(): Promise<{ ok: boolean; settings: SettingsSnapshot; error?: string }>;
  onSettingsState(callback: (state: SettingsSnapshot) => void): void;
  musicCommand(cmd: 'toggle' | 'next' | 'prev'): Promise<{ ok: boolean; error?: string }>;
  musicSeek(positionMs: number): Promise<{ ok: boolean; error?: string }>;
  reportPanelTiming(ms: number, reduced: boolean): void;
};

declare global {
  interface Window {
    beam?: BeamApi;
  }
}
