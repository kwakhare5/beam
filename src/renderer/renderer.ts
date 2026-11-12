import { bindArtFallback, bindMarquee, iconSprite, pill, transportControls, type Tab } from './ui';
import { MASCOTS } from './ui/shared/mascots';
import { clock } from './core/timer';
import { pickTab, type LastUsed } from './core/tabs';
import { bindDropTarget, fileLabel } from './files';
import { QuietTimer, QUIET_AFTER, QUIET_RETURN } from './quiet';
import { chordFromEvent } from './settings';
import { PanelView } from './panel-view';
import { TimerView } from './timer-view';

document.body.insertAdjacentHTML('afterbegin', iconSprite());
document.body.insertAdjacentHTML('afterbegin', '<div class="sr-only" role="status" aria-live="polite" data-live></div>');
bindArtFallback(document);

const liveEl = document.querySelector<HTMLElement>('[data-live]');
let liveText = '';

function announce(text: string): void {
  if (!liveEl || text === liveText) return;
  liveText = text;
  liveEl.textContent = text;
}

const app = document.querySelector<HTMLElement>('#app');

if (app) {
  app.innerHTML = pill({
    state: 'idle',
    title: 'Beam'
  });
}

const pillEl = app?.querySelector<HTMLElement>('.pill') ?? null;
let shelfCount = 0;
let shelfMissing = false;
let helperOk = true;
let override: { state: string; label: string } | null = null;
let pillHovered = false;
let cursorNear = false;
const quiet = new QuietTimer(() => idleEligible(), () => renderPill());

let lastUsed: LastUsed | null = null;

function stamp(tab: LastUsed): void {
  lastUsed = tab;
}

const beam = window.beam;

let timer!: TimerView;
let view!: PanelView;

function isOpen(): boolean {
  return document.body.classList.contains('is-open');
}

function openedTab(rows: number): Tab {
  if (timer.snapshot.phase !== 'idle') return 'timer';
  if (view.music.hasMusic) return 'music';
  if (rows > 0) return 'files';
  return pickTab(lastUsed, false, 0);
}

function setPip(state: 'playing' | 'paused' | 'danger' | null): void {
  const wrap = pillEl?.querySelector('.mascot-wrap');
  if (!wrap) return;
  let pip = wrap.querySelector<HTMLElement>('.media-pip');
  if (!state) {
    pip?.remove();
    return;
  }
  if (!pip) {
    pip = document.createElement('span');
    pip.setAttribute('aria-hidden', 'true');
    wrap.appendChild(pip);
  }
  pip.className = `media-pip ${state}`;
}

function setMark(art: string | null): void {
  const mark = pillEl?.querySelector<HTMLImageElement>('.mascot');
  if (!mark) return;
  mark.classList.toggle('pill-art', Boolean(art));
  mark.classList.remove('art-fallback-img');
  delete mark.dataset.fallback;
  mark.src = art ?? MASCOTS.master;
}

function renderControls(state: string): void {
  if (!pillEl) return;
  const track = view.music.state;
  const show = Boolean(track) && (state === 'playing' || state === 'paused');
  const existing = pillEl.querySelector<HTMLElement>('.pill-controls');
  if (!show) {
    existing?.remove();
    return;
  }
  const toggle = existing?.querySelector<HTMLButtonElement>('[data-action="toggle"]');
  if (toggle && (toggle.getAttribute('aria-label') === 'Pause') === track!.playing) return;
  const markup = transportControls(track!.playing);
  if (existing) existing.outerHTML = markup;
  else pillEl.insertAdjacentHTML('beforeend', markup);
}

function renderPillSlot(state: string, label: string): void {
  if (!pillEl) return;
  const slot = pillEl.querySelector<HTMLElement>('.slot');
  const meta = slot?.querySelector<HTMLElement>('.meta');
  if (!slot || !meta) return;
  if (state === 'timer') {
    let digits = meta.querySelector<HTMLElement>('[data-pill-digits]');
    if (!digits) {
      meta.innerHTML = '<div class="digits" data-pill-digits></div>';
      digits = meta.querySelector<HTMLElement>('[data-pill-digits]');
    }
    if (digits) digits.textContent = clock(timer.snapshot.remainingMs);
  } else if (state === 'done') {
    if (!meta.querySelector('.done-label')) meta.innerHTML = '<span class="done-label">Done</span>';
  } else {
    let text = meta.querySelector<HTMLElement>('.title-text');
    if (!text) {
      meta.innerHTML = '<div class="title"><span class="title-track"><span class="title-text"></span></span></div>';
      text = meta.querySelector<HTMLElement>('.title-text');
    }
    if (text) {
      if (text.textContent !== label) text.textContent = label;
      const title = text.closest<HTMLElement>('.title');
      if (title && title.title !== label) title.title = label;
    }
    bindMarquee(pillEl);
  }
}

function renderPillX(state: string): void {
  if (!pillEl) return;
  const kind = state === 'timer' ? 'pill-timer-cancel' : state === 'done' ? 'pill-timer-dismiss' : '';
  let button = pillEl.querySelector<HTMLButtonElement>('.pill-x');
  if (!kind) {
    button?.remove();
    return;
  }
  if (!button) {
    pillEl.insertAdjacentHTML('beforeend', '<button type="button" class="icon-btn pill-x"></button>');
    button = pillEl.querySelector<HTMLButtonElement>('.pill-x');
  }
  if (!button || button.dataset.action === kind) return;
  button.dataset.action = kind;
  button.setAttribute('aria-label', kind === 'pill-timer-cancel' ? 'Cancel timer' : 'Dismiss');
  button.innerHTML = '<svg aria-hidden="true" focusable="false"><use href="#i-x"/></svg>';
}

function renderPill(): void {
  if (!pillEl) return;
  const track = view.music.state;
  const timerState = timer.snapshot.phase === 'running' ? 'timer' : timer.snapshot.phase === 'done' ? 'done' : null;
  const idle = !override && !track && shelfCount === 0 && !timerState;
  const quietState = helperOk && idle && quiet.active && !pillHovered;
  const state = helperOk
    ? override?.state ??
      timerState ??
      (track ? (track.playing ? 'playing' : 'paused') : shelfCount > 0 ? 'files' : quietState ? 'quiet' : 'idle')
    : 'error';
  const label = helperOk
    ? override?.label ??
      (timer.snapshot.phase === 'done'
        ? 'Done'
        : timer.snapshot.phase === 'running'
          ? ''
          : track
            ? track.title
            : shelfCount > 0
              ? fileLabel(shelfCount)
              : quietState
                ? ''
                : 'Beam')
    : 'Connection lost';
  const musicVisual = helperOk && Boolean(track) && (state === 'playing' || state === 'paused');
  pillEl.dataset.state = state;
  setMark(musicVisual && track ? track.art : null);
  setPip(
    !helperOk
      ? 'danger'
      : shelfMissing
        ? 'danger'
        : musicVisual && track
          ? track.playing
            ? 'playing'
            : 'paused'
          : state === 'timer' && track
            ? track.playing
              ? 'playing'
              : 'paused'
            : null
  );
  renderPillSlot(state, label);
  renderControls(state);
  renderPillX(state);
  pillEl.setAttribute(
    'role',
    state === 'playing' || state === 'paused' || state === 'timer' || state === 'done' ? 'group' : 'button'
  );
  pillEl.setAttribute(
    'aria-label',
    !helperOk
      ? 'Connection lost — open panel'
      : state === 'playing' || state === 'paused'
        ? `${track!.playing ? 'Playing' : 'Paused'} ${track!.title} — open panel`
        : state === 'timer'
          ? `Timer ${clock(timer.snapshot.remainingMs)} — open panel`
          : state === 'done'
            ? 'Timer finished — open panel'
            : state === 'files'
              ? `${fileLabel(shelfCount)} — open panel`
              : 'Beam — open panel'
  );
  announce(
    !helperOk
      ? 'Connection lost'
      : state === 'playing' || state === 'paused'
        ? `${track!.playing ? 'Playing' : 'Paused'} ${track!.title}`
        : state === 'files'
          ? fileLabel(shelfCount)
          : ''
  );
}

function setPill(state: string, label: string): void {
  wakePill();
  override = { state, label };
  renderPill();
}

function showShelf(): void {
  override = null;
  quiet.reset();
  renderPill();
}

function idleEligible(): boolean {
  return (
    helperOk &&
    !view.music.hasMusic &&
    shelfCount === 0 &&
    timer.snapshot.phase === 'idle' &&
    !override &&
    !pillHovered &&
    !cursorNear &&
    !pillEl?.matches(':hover') &&
    !isOpen()
  );
}

function scheduleQuiet(delay = QUIET_AFTER): void {
  quiet.schedule(delay);
}

function wakePill(): void {
  quiet.wake();
}

function resetQuiet(): void {
  quiet.reset();
}

let reportPillSize: () => void = () => {};

timer = new TimerView({
  api: () => beam,
  pill: () => pillEl,
  wrap: () => view.wrap,
  render: () => {
    renderPill();
    if (isOpen()) view.render();
  },
  wake: () => wakePill(),
  announce: (text) => announce(text),
  stamp: () => stamp('timer')
});

view = new PanelView(
  {
    api: () => beam,
    stamp: (tab) => stamp(tab),
    renderPill: () => renderPill(),
    wake: () => wakePill(),
    setPill: (state, label) => setPill(state, label),
    showShelf: () => showShelf(),
    scheduleQuiet: () => scheduleQuiet(),
    resetQuiet: () => resetQuiet(),
    reportPillSize: () => reportPillSize(),
    focusPill: () => pillEl?.focus({ preventScroll: true }),
    filesChanged: (files) => {
      shelfCount = files.length;
      shelfMissing = files.some((file) => file.missing);
    },
    openedTab: (rows) => openedTab(rows),
    timer
  },
  app
);

bindDropTarget(view.shelf, (state, label) => setPill(state, label), () => showShelf());

if (app && beam) {
  let suppressClick = false;

  app.addEventListener('click', (event) => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    const action = (event.target as Element).closest<HTMLElement>('.pill [data-action]')?.dataset.action;
    if (action === 'panel') {
      beam.openPanel();
      return;
    }
    if (action === 'pill-timer-cancel') {
      timer.cancel();
      return;
    }
    if (action === 'pill-timer-dismiss') {
      timer.dismiss();
      return;
    }
    if (action === 'prev' || action === 'toggle' || action === 'next') {
      stamp('music');
      void beam.musicCommand(action).catch((error: unknown) => console.error('[music] command failed', error));
      return;
    }
    if (!isOpen() && !document.body.classList.contains('is-closing') && !(event.target as Element).closest('button')) {
      beam.openPanel();
    }
  });

  if (pillEl) {
    pillEl.draggable = false;
    pillEl.querySelectorAll('img').forEach((image) => {
      image.draggable = false;
    });
    pillEl.addEventListener('pointerenter', () => {
      pillHovered = true;
      wakePill();
    });
    pillEl.addEventListener('pointerleave', () => {
      pillHovered = false;
      scheduleQuiet(QUIET_RETURN);
    });
    let sizeFrame = 0;
    reportPillSize = (): void => {
      if (sizeFrame !== 0) return;
      sizeFrame = requestAnimationFrame(() => {
        sizeFrame = 0;
        if (!pillEl || isOpen()) return;
        const rect = pillEl.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1) return;
        beam.setPillSize(Math.round(rect.width), Math.round(rect.height));
      });
    };
    const pillObserver = new ResizeObserver(() => reportPillSize());
    pillObserver.observe(pillEl);
    reportPillSize();
    let press: { id: number; x: number; y: number; dragging: boolean } | null = null;

    pillEl.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      if (isOpen() || document.body.classList.contains('is-closing')) return;
      if ((event.target as Element).closest('button')) return;
      wakePill();
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

  beam.onPanelOpen((files, tab) => view.open(files, tab));

  beam.onPanelDismiss(() => view.dismiss());

  beam.onHelperState((state) => {
    helperOk = state.ok;
    if (!helperOk) {
      view.music.clear();
      quiet.forceIdle();
      if (view.wrap && isOpen()) view.render();
    } else {
      scheduleQuiet();
    }
    renderPill();
  });

  beam.onPillNear((near) => {
    cursorNear = near;
    if (near) {
      wakePill();
      return;
    }
    scheduleQuiet(QUIET_RETURN);
  });

  beam.onTimerState((state) => timer.apply(state));
  beam.onSettingsState((state) => view.settings.apply(state));
  void beam
    .getSettings()
    .then((state) => view.settings.apply(state))
    .catch((error: unknown) => console.error('[settings] load failed', error));

  beam.onMusicState((state) => view.music.apply(state));

  window.addEventListener(
    'keydown',
    (event) => {
      if (!view.rebinding) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.key === 'Escape') {
        view.settings.cancelRebind();
        return;
      }
      view.settings.submit(chordFromEvent(event));
    },
    true
  );

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      view.dismiss();
      return;
    }
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (event.target !== pillEl) return;
    if (isOpen() || document.body.classList.contains('is-closing')) return;
    event.preventDefault();
    beam?.openPanel();
  });

  scheduleQuiet();
}
