import type { SearchResult } from '../../../shared/ipc';
import { esc } from '../shared/html';
import { icon } from '../shared/icons';

export type SearchData = {
  active?: boolean;
  query: string;
  results: SearchResult[];
  selected: number;
  indexing: boolean;
  note?: string;
};

export function searchLayer(data?: SearchData): string {
  const active = data?.active === true;
  const query = data?.query ?? '';
  const results = data?.results ?? [];
  const selected = data?.selected ?? 0;
  const indexing = data?.indexing === true;
  const note = data?.note ?? '';

  return `<div class="panel-search"${active ? '' : ' hidden'} data-search-layer>
  <div class="search-field">${icon('search')}<input class="search-input" type="text" placeholder="Search apps and files" aria-label="Search apps and files" autocomplete="off" spellcheck="false" value="${esc(query)}"></div>
  <div class="search-list" role="listbox" aria-label="Search results" data-search-list>${searchRows(results, selected, query, indexing, note)}</div>
  <div class="search-note" data-search-note>${indexing && !note ? 'indexing…' : ''}</div>
</div>`;
}

export function searchRows(
  results: SearchResult[],
  selected: number,
  query: string,
  indexing: boolean,
  note = ''
): string {
  if (results.length === 0) {
    const text = note || (query ? (indexing ? 'Searching…' : `No results for “${esc(query)}”`) : 'Type to search apps and files');
    return `<div class="search-empty">${text}</div>`;
  }
  return results
    .map((row, index) => {
      const glyph = row.kind === 'app' ? 'app' : row.kind === 'folder' ? 'folder' : 'file';
      return `<button type="button" class="search-row" role="option" aria-selected="${index === selected}" data-search-launch="${esc(row.launch)}">${icon(glyph)}<span class="search-name">${esc(row.name)}</span><span class="search-detail">${esc(row.kind === 'app' ? 'App' : row.detail)}</span></button>`;
    })
    .join('');
}
