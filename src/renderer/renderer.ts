import {
  bindArtFallback,
  bindClearAll,
  bindFileDrag,
  bindFilesActions,
  bindPanelTabs,
  formatSize,
  iconSprite,
  panel,
  pill,
  type PanelData,
  type Tab
} from './ui';

type ShelfResult = { count: number; accepted: number; truncated: boolean; limit: number };
type ShelfFile = { path: string; name: string; sizeBytes: number; kind: 'file' | 'folder'; missing: boolean };
type CopyResult = { ok: boolean; count: number; error?: string };
type FileChange = { ok: boolean; files: ShelfFile[] };

type BeamApi = {
  getPathForFile(file: File): string;
  addFiles(paths: string[]): Promise<ShelfResult>;
  copyFiles(paths: string[], source: 'row' | 'all'): Promise<CopyResult>;
  startFileDrag(paths: string[]): void;
  removeFile(path: string): Promise<FileChange>;
  clearFiles(): Promise<FileChange>;
  openPanel(): void;
  panelCollapsed(): void;
  beginWindowDrag(x: number, y: number): void;
  moveWindowDrag(x: number, y: number): void;
  endWindowDrag(x: number, y: number): void;
  onPanelOpen(callback: (files: ShelfFile[]) => void): void;
  onPanelDismiss(callback: () => void): void;
  reportPanelTiming(ms: number, reduced: boolean): void;
};

declare global {
  interface Window {
    beam?: BeamApi;
  }
}

document.body.insertAdjacentHTML('afterbegin', iconSprite());
bindArtFallback(document);

const app = document.querySelector<HTMLElement>('#app');

if (app) {
  app.innerHTML = pill({
    state: 'idle',
    title: 'Beam'
  });
}

const pillEl = app?.querySelector<HTMLElement>('.pill') ?? null;
let shelfCount = 0;
let noticeTimer: number | undefined;

function fileLabel(count: number): string {
  return count === 1 ? '1 file' : `${count} files`;
}

function setPip(danger: boolean): void {
  const wrap = pillEl?.querySelector('.mascot-wrap');
  if (!wrap) return;
  const pip = wrap.querySelector<HTMLElement>('.media-pip');
  if (danger && !pip) {
    const dot = document.createElement('span');
    dot.className = 'media-pip danger';
    dot.setAttribute('aria-hidden', 'true');
    wrap.appendChild(dot);
  } else if (!danger && pip) {
    pip.remove();
  }
}

function setPill(state: string, label: string): void {
  if (!pillEl) return;
  pillEl.dataset.state = state;
  const title = pillEl.querySelector<HTMLElement>('.title');
  if (title) {
    title.textContent = label;
    title.title = label;
  }
}

function showShelf(): void {
  setPill(shelfCount > 0 ? 'files' : 'idle', shelfCount > 0 ? fileLabel(shelfCount) : 'Beam');
}

const beam = window.beam;

const panelData: PanelData = {
  music: { title: '', subtitle: '' },
  files: [],
  timer: { mode: 'idle', digits: '25:00', note: 'Pick a length', preset: '25' },
  calendar: new Date(),
  settings: { startup: false, shortcut: 'Alt + Space', volume: 60, theme: 'dark' }
};

let panelEl: HTMLElement | null = null;
let wrapEl: HTMLElement | null = null;

function applyFiles(files: ShelfFile[]): void {
  panelData.files = files.map((file) => ({
    path: file.path,
    name: file.name,
    size: formatSize(file.sizeBytes),
    kind: file.kind,
    missing: file.missing
  }));
  shelfCount = files.length;
  setPip(files.some((file) => file.missing));
  showShelf();
  renderPanel();
}

async function removeRow(path: string): Promise<void> {
  if (!beam) return;
  const result = await beam.removeFile(path);
  if (result.ok) applyFiles(result.files);
}

async function clearShelf(): Promise<void> {
  if (!beam) return;
  const result = await beam.clearFiles();
  if (result.ok) applyFiles(result.files);
}

function renderPanel(): void {
  if (!app) return;
  if (!wrapEl) {
    wrapEl = document.createElement('div');
    wrapEl.className = 'panel-wrap';
    app.appendChild(wrapEl);
    bindPanelTabs(wrapEl);
    bindClearAll(wrapEl);
    wrapEl.addEventListener('beam:files:clear', () => {
      void clearShelf();
    });
    if (beam) {
      bindFilesActions(wrapEl, (paths, source) => beam.copyFiles(paths, source), (path) => {
        void removeRow(path);
      });
      bindFileDrag(wrapEl, (paths) => beam.startFileDrag(paths));
    }
  }
  const selected = wrapEl.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
  const active = (selected?.id.replace('tab-', '') ?? 'music') as Tab;
  wrapEl.innerHTML = panel(active, panelData);
  panelEl = wrapEl.querySelector<HTMLElement>('.panel');
}

let closingTimer: number | undefined;

function dismissPanel(): void {
  if (!document.body.classList.contains('is-open')) return;
  document.body.classList.remove('is-open');
  document.body.classList.add('is-closing');
  if (closingTimer !== undefined) window.clearTimeout(closingTimer);
  closingTimer = window.setTimeout(() => {
    closingTimer = undefined;
    document.body.classList.remove('is-closing');
  }, 200);
  setTimeout(() => beam?.panelCollapsed(), 160);
}

if (app && beam) {
  let suppressClick = false;

  app.addEventListener('click', (event) => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    if (!document.body.classList.contains('is-open') && !(event.target as Element).closest('button')) {
      beam.openPanel();
    }
  });

  let dragDepth = 0;
  const hasFiles = (event: DragEvent): boolean => event.dataTransfer?.types.includes('Files') === true;
  const dragLabel = (count: number): string => `+${fileLabel(Math.max(1, count))}`;

  window.addEventListener('dragenter', (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    dragDepth += 1;
    setPill('drag', dragLabel(event.dataTransfer?.items.length ?? 1));
  });

  window.addEventListener('dragover', (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    setPill('drag', dragLabel(event.dataTransfer?.items.length ?? 1));
  });

  window.addEventListener('dragleave', (event) => {
    if (!hasFiles(event)) return;
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) showShelf();
  });

  window.addEventListener('drop', (event) => {
    event.preventDefault();
    dragDepth = 0;
    const files = Array.from(event.dataTransfer?.files ?? []);
    const paths = files.map((file) => beam.getPathForFile(file)).filter((path) => path.length > 0);
    if (!paths.length) {
      showShelf();
      return;
    }
    void beam
      .addFiles(paths)
      .then((result) => {
        shelfCount = result.count;
        if (noticeTimer !== undefined) window.clearTimeout(noticeTimer);
        if (result.truncated) {
          setPill('files', `Max ${result.limit}`);
          noticeTimer = window.setTimeout(() => {
            noticeTimer = undefined;
            showShelf();
          }, 2400);
        } else {
          noticeTimer = undefined;
          showShelf();
        }
      })
      .catch((error: unknown) => {
        console.error('[files] add failed', error);
        showShelf();
      });
  });

  if (pillEl) {
    pillEl.draggable = false;
    pillEl.querySelectorAll('img').forEach((image) => {
      image.draggable = false;
    });
    let press: { id: number; x: number; y: number; dragging: boolean } | null = null;

    pillEl.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      if (document.body.classList.contains('is-open') || document.body.classList.contains('is-closing')) return;
      if ((event.target as Element).closest('button')) return;
      suppressClick = false;
      press = { id: event.pointerId, x: event.screenX, y: event.screenY, dragging: false };
      pillEl.setPointerCapture(event.pointerId);
    });

    pillEl.addEventListener('pointermove', (event) => {
      if (!press || event.pointerId !== press.id) return;
      if (!press.dragging) {
        if (Math.hypot(event.screenX - press.x, event.screenY - press.y) < 4) return;
        press.dragging = true;
        beam.beginWindowDrag(event.screenX, event.screenY);
        return;
      }
      beam.moveWindowDrag(event.screenX, event.screenY);
    });

    const endPress = (event: PointerEvent): void => {
      if (!press || event.pointerId !== press.id) return;
      if (press.dragging) {
        beam.endWindowDrag(event.screenX, event.screenY);
        suppressClick = true;
      }
      press = null;
    };
    pillEl.addEventListener('pointerup', endPress);
    pillEl.addEventListener('pointercancel', endPress);
  }

  beam.onPanelOpen((files) => {
    applyFiles(files);
    if (!panelEl) return;
    const el = panelEl;
    void el.offsetWidth;
    requestAnimationFrame(() => {
      let started = 0;
      let reported = false;
      const report = (): void => {
        if (reported) return;
        reported = true;
        beam.reportPanelTiming(
          started ? Math.round(performance.now() - started) : 260,
          window.matchMedia('(prefers-reduced-motion: reduce)').matches
        );
      };
      el.addEventListener('transitionrun', function begin(event) {
        if (event.target !== el || event.propertyName !== 'transform' || started) return;
        started = performance.now();
      });
      document.body.classList.add('is-open');
      el.addEventListener('transitionend', function done(event) {
        if (event.target !== el || event.propertyName !== 'transform') return;
        el.removeEventListener('transitionend', done);
        report();
      });
      setTimeout(report, 260);
    });
  });

  beam.onPanelDismiss(dismissPanel);

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') dismissPanel();
  });
}

export {};
