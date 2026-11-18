import type { SearchResult } from '../shared/ipc';
import type { BeamApi } from './api';
import { searchRows } from './ui/panel/search';

type SearchDeps = {
  api: () => BeamApi | undefined;
  panel: () => HTMLElement | null;
  dismiss: () => void;
  refresh: () => void;
};

export class SearchView {
  private active = false;
  private query = '';
  private results: SearchResult[] = [];
  private selected = 0;
  private indexing = false;
  private note = '';
  private requestId = 0;

  constructor(private readonly deps: SearchDeps) {}

  get isActive(): boolean {
    return this.active;
  }

  bind(wrap: HTMLElement): void {
    wrap.addEventListener('input', (event) => {
      const target = event.target;
      if (!this.active || !(target instanceof HTMLInputElement) || !target.classList.contains('search-input')) return;
      this.query = target.value;
      this.selected = 0;
      void this.request();
    });

    wrap.addEventListener('click', (event) => {
      const target = event.target;
      if (!this.active || !(target instanceof Element)) return;
      const row = target.closest<HTMLElement>('[data-search-launch]');
      if (!row) return;
      void this.open(row.dataset.searchLaunch ?? '', false);
    });

    wrap.addEventListener('keydown', (event) => {
      if (!this.active) return;
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || !target.classList.contains('search-input')) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        if (this.results.length === 0) return;
        event.preventDefault();
        const step = event.key === 'ArrowDown' ? 1 : -1;
        this.selected = (this.selected + step + this.results.length) % this.results.length;
        this.paint();
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        void this.open(this.results[this.selected]?.launch, event.shiftKey);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        this.exit();
      }
    });
  }

  activate(): void {
    this.active = true;
    this.query = '';
    this.results = [];
    this.selected = 0;
    this.indexing = false;
    this.note = '';
    this.requestId++;
    const panel = this.deps.panel();
    panel?.classList.add('is-search');
    const layer = panel?.querySelector<HTMLElement>('[data-search-layer]');
    if (layer) layer.hidden = false;
    const input = layer?.querySelector<HTMLInputElement>('.search-input');
    if (input) {
      input.value = '';
      requestAnimationFrame(() => input.focus());
    }
    this.paint();
  }

  exit(showTabs = true): void {
    if (!this.active) return;
    this.active = false;
    this.requestId++;
    const panel = this.deps.panel();
    panel?.classList.remove('is-search');
    const layer = panel?.querySelector<HTMLElement>('[data-search-layer]');
    if (layer) layer.hidden = true;
    if (showTabs) this.deps.refresh();
    this.deps.panel()?.focus({ preventScroll: true });
  }

  private async request(): Promise<void> {
    const id = ++this.requestId;
    const api = this.deps.api();
    if (!this.query.trim()) {
      this.results = [];
      this.indexing = false;
      this.note = '';
      this.paint();
      return;
    }
    if (!api) {
      this.results = [];
      this.indexing = false;
      this.note = 'Search is offline';
      this.paint();
      return;
    }
    try {
      const reply = await api.search(this.query.trim());
      if (id !== this.requestId || !this.active) return;
      this.results = reply.results;
      this.selected = 0;
      this.indexing = reply.indexing;
      this.note = reply.error ?? '';
      this.paint();
    } catch {
      if (id !== this.requestId || !this.active) return;
      this.results = [];
      this.indexing = false;
      this.note = 'Search is offline';
      this.paint();
    }
  }

  private async open(launch: string | undefined, reveal: boolean): Promise<void> {
    if (!launch) return;
    const api = this.deps.api();
    if (!api) return;
    try {
      const reply = await api.openSearchResult(launch, reveal);
      if (!reply.ok) {
        this.note = 'Could not open';
        this.paint();
        return;
      }
      this.exit(false);
      this.deps.dismiss();
    } catch {
      this.note = 'Could not open';
      this.paint();
    }
  }

  private paint(): void {
    const panel = this.deps.panel();
    const list = panel?.querySelector<HTMLElement>('[data-search-list]');
    if (list) {
      list.innerHTML = searchRows(this.results, this.selected, this.query.trim(), this.indexing, this.note);
      list.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
    }
    const note = panel?.querySelector<HTMLElement>('[data-search-note]');
    if (note) {
      const text = this.note || (this.indexing ? 'indexing…' : '');
      note.textContent = text;
      note.hidden = text.length === 0;
    }
  }
}
