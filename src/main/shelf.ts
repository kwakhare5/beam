import { statSync } from 'node:fs';
import { basename } from 'node:path';
import type { AddResult, ShelfFile } from '../shared/ipc';

export const MAX_SHELF = 50;

export class Shelf {
  private paths: string[] = [];

  get count(): number {
    return this.paths.length;
  }

  list(): readonly string[] {
    return this.paths;
  }

  rows(): ShelfFile[] {
    return this.paths.map((path) => {
      try {
        const stats = statSync(path);
        return {
          path,
          name: basename(path),
          sizeBytes: stats.size,
          kind: stats.isDirectory() ? ('folder' as const) : ('file' as const),
          missing: false
        };
      } catch {
        return { path, name: basename(path), sizeBytes: 0, kind: 'file' as const, missing: true };
      }
    });
  }

  add(paths: string[]): AddResult {
    let accepted = 0;
    let truncated = false;
    for (const path of paths) {
      if (this.paths.some((held) => held.toLowerCase() === path.toLowerCase())) continue;
      if (this.paths.length >= MAX_SHELF) {
        truncated = true;
        break;
      }
      this.paths.push(path);
      accepted++;
    }
    return { count: this.paths.length, accepted, truncated, limit: MAX_SHELF, files: this.rows() };
  }

  canonical(requested: unknown[]): string[] | null {
    const paths = requested.filter(
      (path): path is string => typeof path === 'string' && path.length > 0
    );
    const held = new Map(this.paths.map((path) => [path.toLowerCase(), path]));
    const rows = paths.map((path) => held.get(path.toLowerCase()));
    if (!paths.length || rows.some((path) => path === undefined)) return null;
    return rows as string[];
  }

  remove(path: string): { index: number; path: string } | null {
    const key = path.toLowerCase();
    const index = this.paths.findIndex((held) => held.toLowerCase() === key);
    const removed = this.paths[index];
    if (index === -1 || removed === undefined) return null;
    this.paths.splice(index, 1);
    return { index, path: removed };
  }

  clear(): number {
    const count = this.paths.length;
    this.paths = [];
    return count;
  }
}
