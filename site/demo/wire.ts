import { bindArtFallback, bindClearAll, bindMusicSeek, bindPanelTabs, paintBar } from '../../src/renderer/ui';
import { clock } from '../../src/renderer/core/timer';
import type { DemoState } from './state';

export interface DemoContext {
  state: DemoState;
  app: HTMLElement;
  panelWrap: HTMLElement;
  open: () => void;
  close: () => void;
  renderPanel: () => void;
  renderPill: () => void;
  status: (text: string) => void;
  chime: () => void;
}

const MODIFIERS = ['Ctrl', 'Alt', 'Shift', 'Meta'] as const;

function chordFromEvent(event: KeyboardEvent): string | null {
  const key = event.key === ' ' ? 'Space' : event.key.length === 1 ? event.key.toUpperCase() : event.key;
  if (!event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey) return null;
  if (MODIFIERS.includes(key as (typeof MODIFIERS)[number])) return null;
  const parts = [
    event.ctrlKey ? 'Ctrl' : '',
    event.altKey ? 'Alt' : '',
    event.shiftKey ? 'Shift' : '',
    event.metaKey ? 'Win' : '',
    key
  ].filter(Boolean);
  return parts.join(' + ');
}

export function bindDemo(ctx: DemoContext): void {
  const { state, app, panelWrap } = ctx;
  bindPanelTabs(panelWrap);
  bindArtFallback(document);
  bindClearAll(panelWrap);
  bindMusicSeek(panelWrap, (positionMs) => state.seek(positionMs));

  const picker = document.createElement('input');
  picker.type = 'file';
  picker.multiple = true;
  picker.hidden = true;
  document.body.appendChild(picker);
  picker.addEventListener('change', () => {
    const count = state.addDropped(Array.from(picker.files ?? []));
    if (count > 0) ctx.status(`${count} file${count === 1 ? '' : 's'} added`);
    picker.value = '';
  });

  panelWrap.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest('[data-add-files]')) {
      picker.click();
      return;
    }
    if (target.closest('[data-files-undo]')) {
      state.restore();
      ctx.status('Restored');
      return;
    }
    const removePath = target.closest<HTMLElement>('[data-remove-path]')?.dataset.removePath;
    if (removePath) {
      state.remove(removePath);
      ctx.status('Removed');
      return;
    }
    const preset = target.closest<HTMLElement>('[data-timer-preset]')?.dataset.timerPreset;
    if (preset) {
      state.setTimerPreset(preset);
      return;
    }
    if (target.closest('[data-timer-set]')) {
      const input = panelWrap.querySelector<HTMLInputElement>('[data-timer-minutes]');
      state.setTimerCustom(input?.value);
      return;
    }
    if (target.closest('[data-timer-start]')) {
      const minutes = state.timerPresetValue === 'custom' ? Number(state.timerCustomValue) : Number(state.timerPresetValue);
      state.startTimer(minutes);
      return;
    }
    if (target.closest('[data-timer-cancel]')) {
      state.cancelTimer();
      return;
    }
    if (target.closest('[data-timer-dismiss]')) {
      state.cancelTimer();
      return;
    }
    if (target.closest('[data-cal-prev]')) {
      state.shiftCalendar(-1);
      return;
    }
    if (target.closest('[data-cal-next]')) {
      state.shiftCalendar(1);
      return;
    }
    if (target.closest('[data-cal-today]')) {
      state.todayCalendar();
      return;
    }
    const setting = target.closest<HTMLElement>('[data-setting]')?.dataset.setting;
    if (setting === 'startup') {
      state.patchSettings({ startup: !state.panelData().settings.startup });
      return;
    }
    if (setting === 'theme') {
      state.patchSettings({ theme: state.theme === 'dark' ? 'light' : 'dark' });
      return;
    }
    if (setting === 'volume-test') {
      ctx.chime();
      return;
    }
    if (setting === 'reset') {
      ctx.status('Reset works in the app');
      return;
    }
    if (setting === 'shortcut') {
      state.beginRebind();
      return;
    }
    const step = target.closest<HTMLElement>('[data-volume-step]')?.dataset.volumeStep;
    if (step) {
      state.setVolume(Number(step));
      return;
    }
    const action = target.closest<HTMLElement>('.music-controls [data-action]')?.dataset.action;
    if (action === 'prev') state.step(-1);
    if (action === 'next') state.step(1);
    if (action === 'toggle') state.toggle();
  });

  panelWrap.addEventListener('dragstart', (event) => {
    const target = event.target;
    if (!(target instanceof Element) || !target.closest('[data-drag-path]')) return;
    event.preventDefault();
    ctx.status('Drag-out works in the app');
  });

  document.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('[data-copy-path], [data-copy-all]')) {
        event.stopPropagation();
        ctx.status('Copy lives in the app');
      }
    },
    true
  );

  app.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const action = target.closest<HTMLElement>('.pill [data-action]')?.dataset.action;
    if (action === 'panel') {
      ctx.open();
      return;
    }
    if (action === 'prev') return state.step(-1);
    if (action === 'next') return state.step(1);
    if (action === 'toggle') return state.toggle();
    if (target.closest('.pill .pill-x')) {
      state.cancelTimer();
      return;
    }
    if (!document.body.classList.contains('is-open') && !target.closest('button')) ctx.open();
  });

  document.addEventListener('click', (event) => {
    if (!document.body.classList.contains('is-open')) return;
    const target = event.target;
    if (!(target instanceof Element) || target.closest('.panel')) return;
    ctx.close();
  });

  document.addEventListener('keydown', (event) => {
    if (state.rebinding) {
      if (event.key === 'Escape') {
        event.preventDefault();
        state.submitChord(null);
        return;
      }
      const chord = chordFromEvent(event);
      if (!chord) return;
      event.preventDefault();
      state.submitChord(chord);
      return;
    }
    if (event.key === 'Escape') {
      ctx.close();
      return;
    }
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (event.target !== app.querySelector('.pill')) return;
    event.preventDefault();
    ctx.open();
  });

  window.addEventListener('dragenter', (event) => {
    if (event.dataTransfer?.types.includes('Files')) event.preventDefault();
  });
  window.addEventListener('dragover', (event) => {
    if (!event.dataTransfer?.types.includes('Files')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  });
  window.addEventListener('drop', (event) => {
    if (!event.dataTransfer?.types.includes('Files')) return;
    event.preventDefault();
    const count = state.addDropped(Array.from(event.dataTransfer.files));
    if (count > 0) ctx.status(`${count} file${count === 1 ? '' : 's'} added`);
  });

  document.addEventListener('beam:files:clear', () => {
    state.clearFiles();
  });

  state.audio.addEventListener('loadedmetadata', () => {
    if (state.panelOpen) ctx.renderPanel();
  });
  state.audio.addEventListener('play', () => {
    ctx.renderPill();
    if (state.panelOpen) ctx.renderPanel();
  });
  state.audio.addEventListener('pause', () => {
    ctx.renderPill();
    if (state.panelOpen) ctx.renderPanel();
  });
  state.audio.addEventListener('ended', () => state.step(1));
  state.audio.addEventListener('timeupdate', () => {
    const bar = panelWrap.querySelector<HTMLElement>('.panel-music [data-music-bar]');
    if (bar) paintBar(bar, state.positionMs());
  });

  window.setInterval(() => {
    if (!state.tick()) return;
    const pill = app.querySelector('.pill');
    const digits = pill?.querySelector<HTMLElement>('.digits');
    if (digits) digits.textContent = clock(state.remainingMs());
    const panelDigits = panelWrap.querySelector<HTMLElement>('.panel-timer [data-timer-digits]');
    if (panelDigits) panelDigits.textContent = clock(state.remainingMs());
  }, 250);

  let dayKey = new Date().toDateString();
  window.setInterval(() => {
    const key = new Date().toDateString();
    if (key === dayKey) return;
    dayKey = key;
    if (state.panelOpen) ctx.renderPanel();
  }, 30_000);
}
