import { bindArtFallback, bindPanelTabs, iconSprite, panel, pill, type PanelData } from './ui';

type ShelfResult = { count: number; accepted: number; truncated: boolean; limit: number };

type BeamApi = {
  dragTestEnabled(): Promise<boolean>;
  startDragTest(): void;
  getPathForFile(file: File): string;
  addFiles(paths: string[]): Promise<ShelfResult>;
  openPanel(): void;
  panelCollapsed(): void;
  beginWindowDrag(x: number, y: number): void;
  moveWindowDrag(x: number, y: number): void;
  endWindowDrag(x: number, y: number): void;
  onPanelOpen(callback: () => void): void;
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

function mountPanel(): void {
  if (panelEl || !app) return;
  const wrap = document.createElement('div');
  wrap.className = 'panel-wrap';
  wrap.innerHTML = panel('music', panelData);
  app.appendChild(wrap);
  bindPanelTabs(wrap);
  panelEl = document.querySelector<HTMLElement>('.panel-wrap .panel');
}

function dismissPanel(): void {
  if (!document.body.classList.contains('is-open')) return;
  document.body.classList.remove('is-open');
  setTimeout(() => beam?.panelCollapsed(), 160);
}

if (app && beam) {
  let suppressClick = false;

  void beam.dragTestEnabled().then((enabled) => {
    if (!enabled) return;

    app.draggable = true;
    app.addEventListener('dragstart', (event) => {
      event.preventDefault();
      beam.startDragTest();
    });
  });

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
      if (event.button !== 0 || document.body.classList.contains('is-open')) return;
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

  beam.onPanelOpen(() => {
    mountPanel();
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
