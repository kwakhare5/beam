import '../../src/renderer/styles.css';
import {
  bindArtFallback,
  bindClearAll,
  bindMusicSeek,
  bindPanelTabs,
  formatSize,
  iconSprite,
  musicClock,
  panel,
  pill
} from '../../src/renderer/ui';
import type { PanelData, Tab } from '../../src/renderer/ui';
import type { FileRow } from '../../src/renderer/ui/panel/tabs/files';
import type { TimerMode } from '../../src/renderer/ui/panel/tabs/timer';
import { clampMinutes, clock, timerData as buildTimerData, type TimerPreset } from '../../src/renderer/core/timer';
import { pickTab } from '../../src/renderer/core/tabs';
import { shiftMonth } from '../../src/renderer/core/calendar';

document.body.insertAdjacentHTML('afterbegin', iconSprite());

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Beam demo needs #app');

const base = import.meta.env.BASE_URL;
const params = new URLSearchParams(window.location.search);
const instance = params.get('instance') ?? 'demo';

const TRACKS = [
  { title: 'Ovo', artist: 'Arulo', src: `${base}ovo.mp3`, art: `${base}cover-ovo.webp` },
  { title: 'Carti Bih', artist: 'Arulo', src: `${base}carti-bih.mp3`, art: `${base}cover-carti-bih.webp` }
] as const;

let trackIndex = 0;
const audioEl = new Audio();
audioEl.preload = 'metadata';

const audioChannel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('beam-demo-audio');

audioEl.addEventListener('play', () => audioChannel?.postMessage({ type: 'play', instance }));
audioChannel?.addEventListener('message', (event) => {
  if (event.data?.type === 'play' && event.data.instance !== instance && !audioEl.paused) audioEl.pause();
});

function positionMs(): number {
  return Number.isFinite(audioEl.currentTime) ? audioEl.currentTime * 1000 : 0;
}

function trackDuration(): number {
  return Number.isFinite(audioEl.duration) ? audioEl.duration * 1000 : 0;
}

let files: FileRow[] = [];

let activeTab: Tab = 'music';
let opened = false;
let timerMode: TimerMode = 'idle';
let timerPreset: TimerPreset = '25';
let timerCustom = '25';
let timerDeadline = 0;
let calendarView = new Date();

const panelWrap = document.createElement('div');
panelWrap.className = 'panel-wrap';
app.appendChild(panelWrap);

function timerData(): PanelData['timer'] {
  return buildTimerData(timerMode, timerDeadline - Date.now(), timerPreset, timerCustom);
}

function panelData(): PanelData {
  const track = TRACKS[trackIndex]!;
  return {
    music: {
      title: track.title,
      subtitle: track.artist,
      art: track.art,
      playing: !audioEl.paused,
      positionMs: positionMs(),
      durationMs: trackDuration()
    },
    files,
    timer: timerData(),
    calendar: { view: calendarView, today: new Date() },
    settings: { startup: false, shortcut: 'Alt + Space', volume: 70, theme: 'dark' },
    enabledTabs: ['music', 'files', 'timer', 'calendar']
  };
}

function pillData() {
  if (timerMode === 'running') {
    return { state: 'timer' as const, title: '', digits: clock(timerDeadline - Date.now()) };
  }
  if (timerMode === 'done') {
    return { state: 'done' as const, title: 'Done' };
  }
  const track = TRACKS[trackIndex]!;
  const missing = files.some((row) => row.missing);
  return {
    state: audioEl.paused ? ('paused' as const) : ('playing' as const),
    title: track.title,
    primaryIcon: audioEl.paused ? ('play' as const) : ('pause' as const),
    art: track.art,
    ...(missing && audioEl.paused ? { pip: 'danger' as const } : {})
  };
}

let pillEl: HTMLElement | null = null;

function renderPill(): void {
  const html = pill(pillData());
  if (pillEl) {
    pillEl.outerHTML = html;
  } else {
    app!.insertAdjacentHTML('afterbegin', html);
  }
  pillEl = app!.querySelector<HTMLElement>('.pill');
}

function renderPanel(): void {
  panelWrap.innerHTML = panel(activeTab, panelData());
}

function setStatus(text: string): void {
  const node = panelWrap.querySelector<HTMLElement>('[data-files-status]');
  if (node) node.textContent = text;
}

const parentWindow = window.parent !== window ? window.parent : null;

function notifyParent(open: boolean): void {
  parentWindow?.postMessage({ source: 'beam-demo', instance, open }, '*');
}

function openPanel(): void {
  if (opened) return;
  opened = true;
  activeTab = pickTab(null, true, files.length);
  renderPanel();
  void panelWrap.offsetWidth;
  requestAnimationFrame(() => {
    document.body.classList.add('is-open');
    panelWrap.querySelector<HTMLElement>('.panel')?.focus({ preventScroll: true });
  });
  notifyParent(true);
}

function closePanel(): void {
  if (!opened) return;
  opened = false;
  document.body.classList.remove('is-open');
  document.body.classList.add('is-closing');
  window.setTimeout(() => document.body.classList.remove('is-closing'), 200);
  pillEl?.focus({ preventScroll: true });
  notifyParent(false);
}

function updateProgress(): void {
  const duration = trackDuration();
  if (duration <= 0) return;
  const bar = panelWrap.querySelector<HTMLElement>('.panel-music [data-music-bar]');
  if (!bar) return;
  const position = Math.min(positionMs(), duration);
  bar.setAttribute('aria-valuenow', String(Math.round(position / 1000)));
  bar.setAttribute('aria-valuetext', `${musicClock(position)} of ${musicClock(duration)}`);
  const fill = bar.querySelector<HTMLElement>('.track-fill');
  if (fill) fill.style.width = `${Math.round((position / duration) * 100)}%`;
  const times = bar.parentElement?.querySelectorAll<HTMLElement>('.track-times span');
  if (times?.length === 2) {
    times[0]!.textContent = musicClock(position);
    times[1]!.textContent = musicClock(duration);
  }
}

function loadTrack(index: number, play: boolean): void {
  trackIndex = (index + TRACKS.length) % TRACKS.length;
  audioEl.src = TRACKS[trackIndex]!.src;
  audioEl.load();
  if (play) void audioEl.play().catch(() => {});
  renderPill();
  if (opened) renderPanel();
}

function toggleAudio(): void {
  if (audioEl.paused) void audioEl.play().catch(() => {});
  else audioEl.pause();
}

function startTimer(minutes: number): void {
  const mins = clampMinutes(minutes);
  timerDeadline = Date.now() + mins * 60000;
  timerMode = 'running';
  renderPill();
  if (opened) renderPanel();
}

function cancelTimer(): void {
  timerMode = 'idle';
  timerDeadline = 0;
  renderPill();
  if (opened) renderPanel();
}

function dismissTimer(): void {
  cancelTimer();
}

document.addEventListener('click', (event) => {
  if (!document.body.classList.contains('is-open')) return;
  const target = event.target;
  if (!(target instanceof Element) || target.closest('.panel')) return;
  closePanel();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closePanel();
    return;
  }
  if (event.key !== 'Enter' && event.key !== ' ') return;
  if (event.target !== pillEl) return;
  event.preventDefault();
  openPanel();
});

bindPanelTabs(document);
bindArtFallback(document);
bindClearAll(document);
bindMusicSeek(document, (positionMs) => {
  if (Number.isFinite(audioEl.duration) && audioEl.duration > 0) {
    audioEl.currentTime = Math.min(positionMs, audioEl.duration * 1000) / 1000;
  }
  if (opened) renderPanel();
});

window.addEventListener('dragover', (event) => {
  if (!event.dataTransfer?.types.includes('Files')) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
});

window.addEventListener('drop', (event) => {
  if (!event.dataTransfer?.types.includes('Files')) return;
  event.preventDefault();
  const dropped = Array.from(event.dataTransfer.files);
  if (!dropped.length) return;
  const rows: FileRow[] = dropped.slice(0, 50).map((file) => ({
    name: file.name,
    size: formatSize(file.size),
    kind: 'file'
  }));
  files = [...files, ...rows].slice(0, 50);
  if (opened) renderPanel();
  setStatus(`${dropped.length} file${dropped.length === 1 ? '' : 's'} added`);
});

panelWrap.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const tab = target.closest<HTMLElement>('[role="tab"]');
  if (tab) {
    activeTab = tab.id.replace('tab-', '') as Tab;
    return;
  }

  const preset = target.closest<HTMLElement>('[data-timer-preset]')?.dataset.timerPreset;
  if (preset) {
    timerPreset = preset as TimerPreset;
    timerMode = preset === 'custom' ? 'custom' : 'idle';
    renderPanel();
    return;
  }
  if (target.closest('[data-timer-set]')) {
    const input = panelWrap.querySelector<HTMLInputElement>('[data-timer-minutes]');
    timerCustom = String(clampMinutes(input?.value));
    timerPreset = 'custom';
    timerMode = 'idle';
    renderPanel();
    return;
  }
  if (target.closest('[data-timer-start]')) {
    startTimer(timerPreset === 'custom' ? Number(timerCustom) : Number(timerPreset));
    return;
  }
  if (target.closest('[data-timer-cancel]')) {
    cancelTimer();
    return;
  }
  if (target.closest('[data-timer-dismiss]')) {
    dismissTimer();
    return;
  }
  if (target.closest('[data-cal-prev]')) {
    calendarView = shiftMonth(calendarView, -1);
    renderPanel();
    return;
  }
  if (target.closest('[data-cal-next]')) {
    calendarView = shiftMonth(calendarView, 1);
    renderPanel();
    return;
  }
  if (target.closest('[data-cal-today]')) {
    calendarView = new Date();
    renderPanel();
    return;
  }

  const action = target.closest<HTMLElement>('.music-controls [data-action]')?.dataset.action;
  if (action === 'prev') loadTrack(trackIndex - 1, true);
  if (action === 'next') loadTrack(trackIndex + 1, true);
  if (action === 'toggle') toggleAudio();
});

app.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const action = target.closest<HTMLElement>('.pill [data-action]')?.dataset.action;
  if (action === 'panel') {
    openPanel();
    return;
  }
  if (action === 'prev' || action === 'toggle' || action === 'next') {
    if (action === 'prev') loadTrack(trackIndex - 1, true);
    else if (action === 'next') loadTrack(trackIndex + 1, true);
    else toggleAudio();
    return;
  }
  if (target.closest('.pill .pill-action')) {
    if (timerMode === 'running') cancelTimer();
    else if (timerMode === 'done') dismissTimer();
    return;
  }
  if (!opened && !target.closest('button')) openPanel();
});

document.addEventListener(
  'click',
  (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest('[data-copy-path], [data-copy-all]')) {
      event.stopPropagation();
      setStatus('Copy works in the app');
      return;
    }
    if (target.closest('[data-add-files]')) {
      event.stopPropagation();
      setStatus('Add works in the app');
    }
  },
  true
);

document.addEventListener('beam:files:clear', () => {
  files = [];
  renderPanel();
  setStatus('Shelf cleared');
});

audioEl.addEventListener('loadedmetadata', () => {
  if (opened) renderPanel();
});
audioEl.addEventListener('play', () => {
  renderPill();
  if (opened) renderPanel();
});
audioEl.addEventListener('pause', () => {
  renderPill();
  if (opened) renderPanel();
});
audioEl.addEventListener('ended', () => loadTrack(trackIndex + 1, true));
audioEl.addEventListener('timeupdate', () => {
  if (opened && activeTab === 'music') updateProgress();
});
audioEl.src = TRACKS[0].src;
audioEl.load();

window.setInterval(() => {
  if (timerMode !== 'running') return;
  const left = timerDeadline - Date.now();
  if (left <= 0) {
    timerMode = 'done';
    renderPill();
    if (opened) renderPanel();
    return;
  }
  const digits = clock(left);
  const pillDigits = pillEl?.querySelector<HTMLElement>('.digits');
  if (pillDigits) pillDigits.textContent = digits;
  const panelDigits = panelWrap.querySelector<HTMLElement>('.panel-timer [data-timer-digits]');
  if (panelDigits) panelDigits.textContent = digits;
}, 250);

renderPill();
renderPanel();
notifyParent(false);
