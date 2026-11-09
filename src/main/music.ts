import type { MusicState } from '../shared/ipc';

export type MusicPayload = {
  app: string;
  title: string;
  artist: string;
  art: string | null;
  playing: boolean;
  positionMs: number;
  durationMs: number;
};

export class MusicService {
  private view: MusicState | null = null;

  constructor(private readonly send: (view: MusicState | null) => void) {}

  get current(): MusicState | null {
    return this.view;
  }

  sendCurrent(): void {
    this.send(this.view);
  }

  apply(payload: MusicPayload | null): void {
    if (!payload || (!payload.title && !payload.artist)) {
      this.view = null;
      this.send(null);
      return;
    }
    this.view = {
      title: payload.title,
      artist: payload.artist,
      playing: payload.playing,
      art: payload.art ? `data:image/png;base64,${payload.art}` : null,
      positionMs: payload.positionMs,
      durationMs: payload.durationMs
    };
    this.send(this.view);
  }
}
