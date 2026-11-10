import { spawn, type ChildProcess } from 'node:child_process';

const REQUEST_TIMEOUT_MS = 8000;
const MAX_BUFFER_CHARS = 16 * 1024 * 1024;
const MAX_RESTARTS = 3;
const RESTART_WINDOW_MS = 60_000;
const RESTART_DELAY_MS = 500;

type HelperReply = {
  id: number;
  pong?: boolean;
  version?: string;
  ok?: boolean;
  error?: string;
  sessions?: MusicSessionRow[];
};

export type MusicSessionRow = { index: number; app: string; title: string; playing: boolean; current: boolean };

export type HelperEvent = { evt: string; payload?: unknown };

type Pending = {
  resolve: (reply: HelperReply) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
};

export class Bridge {
  private child: ChildProcess | null = null;
  private buffer = '';
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();
  private restartTimes: number[] = [];
  private restartTimer: NodeJS.Timeout | null = null;
  private stopping = false;

  constructor(
    private readonly exePath: string,
    private readonly onEvent: (event: HelperEvent) => void = () => {},
    private readonly onExit: () => void = () => {},
    private readonly onRestart: () => void = () => {}
  ) {}

  start(): void {
    if (this.child || this.restartTimer) return;

    const child = spawn(this.exePath, [], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    let ended = false;
    const end = (code: number | null): void => {
      if (ended) return;
      ended = true;
      if (this.child === child) this.child = null;
      this.rejectAll(new Error(`helper exited (${code ?? 'spawn error'})`));
      this.buffer = '';
      this.onExit();
      if (!this.stopping) this.scheduleRestart();
    };

    child.stdout?.setEncoding('utf8');
    child.stdout?.on('data', (chunk: string) => this.read(chunk));

    child.stderr?.setEncoding('utf8');
    child.stderr?.on('data', (chunk: string) => {
      for (const line of chunk.split(/\r?\n/)) {
        if (line) console.error(line);
      }
    });

    child.stdin?.on('error', (error) => {
      if (!this.stopping) console.error(`[bridge] stdin failed: ${error.message}`);
      child.kill();
      end(null);
    });

    child.on('error', (error) => {
      console.error(`[bridge] spawn failed: ${error.message}`);
      end(null);
    });

    child.on('exit', (code) => {
      if (!this.stopping) console.error(`[bridge] helper exited (${code})`);
      end(code);
    });

    this.child = child;
  }

  async ping(): Promise<string> {
    const reply = await this.send('ping');
    if (reply.pong !== true) throw new Error('helper did not pong');
    return reply.version ?? 'unknown';
  }

  async copy(paths: string[]): Promise<void> {
    const reply = await this.send('files.copy', { paths });
    if (reply.ok !== true) throw new Error(reply.error ?? 'helper refused the copy');
  }

  async music(cmd: 'toggle' | 'next' | 'prev'): Promise<void> {
    const reply = await this.send(`music.${cmd}`);
    if (reply.ok !== true) throw new Error(reply.error ?? 'helper refused the command');
  }

  async musicSeek(positionMs: number): Promise<void> {
    const reply = await this.send('music.seek', { positionMs });
    if (reply.ok !== true) throw new Error(reply.error ?? 'helper refused the seek');
  }

  async musicSessions(): Promise<MusicSessionRow[]> {
    const reply = await this.send('music.sessions');
    return Array.isArray(reply.sessions) ? reply.sessions : [];
  }

  async musicPick(app: string, index?: number, title?: string): Promise<void> {
    const request = { app, ...(index === undefined ? {} : { index }), ...(title === undefined ? {} : { title }) };
    const reply = await this.send('music.pick', request);
    if (reply.ok !== true) throw new Error(reply.error ?? 'helper refused to pick that session');
  }

  stop(): Promise<void> {
    this.stopping = true;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    this.rejectAll(new Error('helper stopped'));

    const child = this.child;
    if (!child) return Promise.resolve();
    this.child = null;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        child.kill();
        resolve();
      }, 1500);
      timer.unref();
      child.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });
      child.stdin?.end();
    });
  }

  private send(cmd: string, payload: Record<string, unknown> = {}): Promise<HelperReply> {
    const stdin = this.child?.stdin;
    if (!stdin) return Promise.reject(new Error('helper not running'));

    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`helper timed out on ${cmd}`));
      }, REQUEST_TIMEOUT_MS);
      timer.unref();

      this.pending.set(id, { resolve, reject, timer });
      try {
        stdin.write(`${JSON.stringify({ id, cmd, ...payload })}\n`);
      } catch (error) {
        this.pending.delete(id);
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  private read(chunk: string): void {
    this.buffer += chunk;
    if (this.buffer.length > MAX_BUFFER_CHARS) {
      this.buffer = '';
      console.error('[bridge] dropped oversized stdout buffer');
      return;
    }

    let newline = this.buffer.indexOf('\n');
    while (newline >= 0) {
      const line = this.buffer.slice(0, newline).trim();
      this.buffer = this.buffer.slice(newline + 1);
      newline = this.buffer.indexOf('\n');
      if (!line) continue;

      let message: HelperReply & Partial<HelperEvent>;
      try {
        message = JSON.parse(line) as HelperReply & Partial<HelperEvent>;
      } catch {
        console.error('[bridge] dropped malformed line');
        continue;
      }

      if (typeof message.id !== 'number') {
        if (typeof message.evt === 'string') {
          this.onEvent({ evt: message.evt, payload: message.payload });
        } else {
          console.error('[bridge] dropped unknown reply');
        }
        continue;
      }

      const pending = this.pending.get(message.id);
      if (!pending) {
        console.error('[bridge] dropped unknown reply');
        continue;
      }
      this.pending.delete(message.id);
      clearTimeout(pending.timer);
      pending.resolve(message);
    }
  }

  private rejectAll(error: Error): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
  }

  private scheduleRestart(): void {
    if (this.restartTimer || this.stopping) return;

    const now = Date.now();
    this.restartTimes = this.restartTimes.filter((time) => now - time < RESTART_WINDOW_MS);
    if (this.restartTimes.length >= MAX_RESTARTS) {
      console.error(`[bridge] restart limit reached (${MAX_RESTARTS} in ${RESTART_WINDOW_MS / 1000}s)`);
      return;
    }

    this.restartTimes.push(now);
    console.error(`[bridge] restarting helper (${this.restartTimes.length}/${MAX_RESTARTS})`);
    this.restartTimer = setTimeout(() => {
      this.restartTimer = null;
      if (this.stopping) return;
      this.start();
      this.onRestart();
    }, RESTART_DELAY_MS);
    this.restartTimer.unref();
  }
}
