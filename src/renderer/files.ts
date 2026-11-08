import type { AddResult, FileChange, ShelfFile } from '../shared/ipc';
import { UndoSlot } from './core/undo';

export interface FilesApi {
  getPathForFile(file: File): string;
  addFiles(paths: string[]): Promise<AddResult>;
  pickFiles(): Promise<AddResult | null>;
  removeFile(path: string): Promise<FileChange>;
  clearFiles(): Promise<FileChange>;
}

export interface FilesHost {
  stamp: () => void;
  root: () => HTMLElement | null;
  rows: (files: ShelfFile[]) => void;
  setPill: (state: string, label: string) => void;
  showShelf: () => void;
}

export function fileLabel(count: number): string {
  return count === 1 ? '1 file' : `${count} files`;
}

export class FileShelf {
  private notice: number | undefined;
  private readonly undo: UndoSlot;

  constructor(
    private readonly api: () => FilesApi | undefined,
    private readonly host: FilesHost
  ) {
    this.undo = new UndoSlot(() => this.renderUndo());
  }

  apply(files: ShelfFile[]): void {
    this.host.rows(files);
  }

  applyAdd(result: AddResult): void {
    this.host.stamp();
    this.apply(result.files);
    if (this.notice !== undefined) window.clearTimeout(this.notice);
    if (result.truncated) {
      this.host.setPill('files', `Max ${result.limit}`);
      this.notice = window.setTimeout(() => {
        this.notice = undefined;
        this.host.showShelf();
      }, 2400);
    } else {
      this.notice = undefined;
    }
  }

  add(paths: string[]): void {
    const api = this.api();
    if (!api) return;
    void api
      .addFiles(paths)
      .then((result) => this.applyAdd(result))
      .catch((error: unknown) => {
        console.error('[files] add failed', error);
        this.status('Add failed');
        this.host.showShelf();
      });
  }

  drop(files: File[]): void {
    const api = this.api();
    if (!api) return;
    let paths: string[] = [];
    let readFailed = false;
    try {
      paths = files.map((file) => api.getPathForFile(file)).filter((path) => path.length > 0);
    } catch (error) {
      readFailed = true;
      console.error('[files] path read failed', error);
    }
    if (!paths.length) {
      if (readFailed) this.status('Add failed');
      return;
    }
    this.add(paths);
  }

  pick(): void {
    const api = this.api();
    if (!api) return;
    void api
      .pickFiles()
      .then((result) => {
        if (result) this.applyAdd(result);
      })
      .catch((error: unknown) => {
        console.error('[files] pick failed', error);
        this.status('Add failed');
      });
  }

  restore(): void {
    const api = this.api();
    const path = this.undo.value;
    if (!api || !path) return;
    this.undo.clear();
    void api
      .addFiles([path])
      .then((result) => {
        this.applyAdd(result);
        this.status('Restored');
        window.setTimeout(() => this.renderUndo(), 2500);
      })
      .catch(() => this.status('Undo failed'));
  }

  async remove(path: string): Promise<void> {
    const api = this.api();
    if (!api) return;
    const result = await api.removeFile(path);
    if (!result.ok) {
      this.status('Remove failed');
      return;
    }
    this.apply(result.files);
    this.undo.arm(path);
  }

  async clear(): Promise<void> {
    const api = this.api();
    if (!api) return;
    const result = await api.clearFiles();
    if (!result.ok) {
      this.status('Clear failed');
      return;
    }
    this.undo.clear();
    this.apply(result.files);
  }

  status(text: string): void {
    const node = this.host.root()?.querySelector<HTMLElement>('[data-files-status]');
    if (node) node.textContent = text;
  }

  renderUndo(): void {
    const root = this.host.root();
    if (!root) return;
    const note = root.querySelector<HTMLElement>('[data-files-status]');
    const button = root.querySelector<HTMLElement>('[data-files-undo]');
    if (!note || !button) return;
    const empty = Boolean(root.querySelector('.drop-well'));
    note.textContent = this.undo.value ? 'Removed' : empty ? '' : 'Files clear on quit';
    button.hidden = this.undo.value === null;
  }
}

export function bindDropTarget(
  shelf: FileShelf,
  setPill: (state: string, label: string) => void,
  showShelf: () => void
): void {
  let depth = 0;
  const hasFiles = (event: DragEvent): boolean => event.dataTransfer?.types.includes('Files') === true;
  const label = (count: number): string => `+${fileLabel(Math.max(1, count))}`;

  window.addEventListener('dragenter', (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    depth += 1;
    setPill('drag', label(event.dataTransfer?.items.length ?? 1));
  });

  window.addEventListener('dragover', (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    setPill('drag', label(event.dataTransfer?.items.length ?? 1));
  });

  window.addEventListener('dragleave', (event) => {
    if (!hasFiles(event)) return;
    depth = Math.max(0, depth - 1);
    if (depth === 0) showShelf();
  });

  window.addEventListener('dragend', () => {
    depth = 0;
    showShelf();
  });

  window.addEventListener('drop', (event) => {
    event.preventDefault();
    depth = 0;
    showShelf();
    shelf.drop(Array.from(event.dataTransfer?.files ?? []));
  });
}
