import { spawn, type ChildProcess } from 'node:child_process';

type HelperReply = { id: number; pong?: boolean; version?: string };

type Pending = {
  resolve: (reply: HelperReply) => void;
  reject: (error: Error) => void;
};

export class Bridge {
  private child: ChildProcess | null = null;
  private buffer = '';
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();

  constructor(private readonly exePath: string) {}

  start(): void {
    if (this.child) return;

    const child = spawn(this.exePath, [], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });

    child.stdout?.setEncoding('utf8');
    child.stdout?.on('data', (chunk: string) => this.read(chunk));

    child.stderr?.setEncoding('utf8');
    child.stderr?.on('data', (chunk: string) => {
      for (const line of chunk.split(/\r?\n/)) {
        if (line) console.error(line);
      }
    });

    child.on('error', (error) => {
      console.error(`[bridge] spawn failed: ${error.message}`);
    });

    child.on('exit', (code) => {
      if (this.child === child) this.child = null;
      for (const pending of this.pending.values()) {
        pending.reject(new Error(`helper exited (${code})`));
      }
      this.pending.clear();
      console.error(`[bridge] helper exited (${code})`);
    });

    this.child = child;
  }

  async ping(): Promise<string> {
    const reply = await this.send('ping');
    if (reply.pong !== true) throw new Error('helper did not pong');
    return reply.version ?? 'unknown';
  }

  stop(): void {
    const child = this.child;
    if (!child) return;
    this.child = null;
    child.stdin?.end();
    child.kill();
  }

  private send(cmd: string): Promise<HelperReply> {
    const stdin = this.child?.stdin;
    if (!stdin) return Promise.reject(new Error('helper not running'));

    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      stdin.write(`${JSON.stringify({ id, cmd })}\n`);
    });
  }

  private read(chunk: string): void {
    this.buffer += chunk;
    let newline = this.buffer.indexOf('\n');
    while (newline >= 0) {
      const line = this.buffer.slice(0, newline).trim();
      this.buffer = this.buffer.slice(newline + 1);
      newline = this.buffer.indexOf('\n');
      if (!line) continue;

      let reply: HelperReply;
      try {
        reply = JSON.parse(line) as HelperReply;
      } catch {
        console.error('[bridge] dropped malformed line');
        continue;
      }

      const pending = this.pending.get(reply.id);
      if (!pending) {
        console.error('[bridge] dropped unknown reply');
        continue;
      }
      this.pending.delete(reply.id);
      pending.resolve(reply);
    }
  }
}
