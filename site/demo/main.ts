import '../../src/renderer/styles.css';
import chimeUrl from '../../src/renderer/assets/beam-chime.wav';
import { bindMarquee, iconSprite, panel, pill, type Tab } from '../../src/renderer/ui';
import { beginClose, endClose, openSurface, SURFACE_CLOSING_MS } from '../../src/renderer/core/surface';
import { DemoHost } from './host';
import { DemoState, type Track } from './state';
import { bindDemo } from './wire';

document.body.insertAdjacentHTML('afterbegin', iconSprite());

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Beam demo needs #app');

const base = import.meta.env.BASE_URL;
const params = new URLSearchParams(window.location.search);
const instance = params.get('instance') ?? 'demo';

const TRACKS: readonly Track[] = [
  { title: 'Ovo', artist: 'Arulo', src: `${base}ovo.mp3`, art: `${base}cover-ovo.webp` },
  { title: 'Carti Bih', artist: 'Arulo', src: `${base}carti-bih.mp3`, art: `${base}cover-carti-bih.webp` }
];

const panelWrap = document.createElement('div');
panelWrap.className = 'panel-wrap';
app.appendChild(panelWrap);

let activeTab: Tab = 'music';
let pillEl: HTMLElement | null = null;
let panelEl: HTMLElement | null = null;
let lastPillHtml = '';
let closingTimer: number | undefined;
let statusTimer: number | undefined;

const state = new DemoState(TRACKS, instance, {
  renderPill: () => renderPill(),
  renderPanel: () => {
    if (state.panelOpen) renderPanel();
  }
});
const host = new DemoHost(instance);
const chime = new Audio(chimeUrl);

function defaultNote(): string {
  return state.filesList.length ? 'Files clear on quit' : '';
}

function renderUndo(): void {
  const note = panelWrap.querySelector<HTMLElement>('[data-files-status]');
  const button = panelWrap.querySelector<HTMLElement>('[data-files-undo]');
  if (!note || !button) return;
  note.textContent = state.undoPath ? 'Removed' : defaultNote();
  button.hidden = state.undoPath === null;
}

function renderPanel(): void {
  panelWrap.innerHTML = panel(activeTab, state.panelData());
  panelEl = panelWrap.querySelector<HTMLElement>('.panel');
  renderUndo();
}

function renderPill(): void {
  const html = pill(state.pillData());
  if (html === lastPillHtml) return;
  lastPillHtml = html;
  if (pillEl) pillEl.outerHTML = html;
  else app!.insertAdjacentHTML('afterbegin', html);
  pillEl = app!.querySelector<HTMLElement>('.pill');
  if (pillEl) bindMarquee(pillEl);
}

function status(text: string): void {
  const node = panelWrap.querySelector<HTMLElement>('[data-files-status]');
  if (!node) return;
  node.textContent = text;
  if (statusTimer !== undefined) window.clearTimeout(statusTimer);
  statusTimer = window.setTimeout(() => {
    statusTimer = undefined;
    const current = panelWrap.querySelector<HTMLElement>('[data-files-status]');
    if (current) current.textContent = defaultNote();
  }, 2500);
}

function open(): void {
  if (document.body.classList.contains('is-open')) return;
  if (closingTimer !== undefined) {
    window.clearTimeout(closingTimer);
    closingTimer = undefined;
    endClose(document.body);
  }
  activeTab = state.openedTab();
  renderPanel();
  host.requestOpen(() => openSurface(document.body, panelEl));
}

function close(): void {
  if (!document.body.classList.contains('is-open')) return;
  if (closingTimer !== undefined) window.clearTimeout(closingTimer);
  beginClose(document.body);
  closingTimer = window.setTimeout(() => {
    closingTimer = undefined;
    endClose(document.body);
    pillEl?.focus({ preventScroll: true });
    host.requestClosed();
  }, SURFACE_CLOSING_MS);
}

host.onCloseRequest(close);

panelWrap.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const tab = target.closest<HTMLElement>('[role="tab"]');
  if (tab?.id.startsWith('tab-')) activeTab = tab.id.replace('tab-', '') as Tab;
});

bindDemo({
  state,
  app,
  panelWrap,
  open,
  close,
  renderPanel,
  renderPill,
  status,
  chime: () => {
    chime.volume = Math.min(1, Math.max(0, state.panelData().settings.volume / 100));
    chime.currentTime = 0;
    void chime.play().catch(() => {});
  }
});

renderPill();
renderPanel();
state.audio.src = TRACKS[0]!.src;
state.audio.load();
void state.audio.play().catch(() => {});
