import { icon } from '../../shared/icons';
import { esc } from '../../shared/html';
import { MASCOTS } from '../../shared/mascots';
import { panelBody } from '../panel-body';
import { middleTruncate } from '../../shared/format';

export interface FileRow {
  name: string;
  size: string;
  kind?: 'file' | 'folder';
  missing?: boolean;
}

export function filesPanel(rows: FileRow[], copied = false, active = true): string {
  if (!rows.length) {
    return panelBody(
      'files',
      `<div class="drop-well"><img class="mascot-large" src="${MASCOTS.master}" alt="" /><div class="panel-title">Drop files here</div><div class="panel-sub">They stay until Beam closes</div><button type="button" class="btn">${icon('plus')}Add files</button></div>`,
      'panel-empty',
      active
    );
  }

  const list = rows
    .map((row) => {
      const rowIcon = row.missing ? 'alert' : row.kind === 'folder' ? 'folder' : 'file';
      const truncatedName = middleTruncate(row.name, 26);
      const meta = row.missing
        ? '<span class="row-meta danger" title="File moved or deleted">Missing</span>'
        : `<span class="row-meta">${esc(row.kind === 'folder' ? 'Folder' : row.size)}</span>`;
      const copy = row.missing
        ? ''
        : `<button type="button" class="row-action" aria-label="Copy ${esc(row.name)}">${icon('copy')}</button>`;
      return `<div class="row${row.missing ? ' missing' : ''}" role="listitem"><div class="row-icon-box">${icon(rowIcon)}</div><span class="name" title="${esc(row.name)}">${esc(truncatedName)}</span>${meta}<div class="row-actions">${copy}<button type="button" class="row-action" aria-label="Remove ${esc(row.name)}">${icon('x')}</button></div></div>`;
    })
    .join('');

  const allMissing = rows.every((row) => row.missing);
  const copyIcon = copied ? icon('check') : icon('copy');
  const copyLabel = copied ? 'Copied' : 'Copy All';

  const actions = `<div class="actions"><span class="sr-only" role="status">${copied ? 'Copied to clipboard' : ''}</span><button type="button" class="btn primary"${allMissing ? ' disabled' : ''}>${copyIcon}${copyLabel}</button><button type="button" class="btn ghost">${icon('plus')}Add files</button><button type="button" class="btn danger clear-all" data-armed="false">${icon('trash')}<span class="clear-all-label">Clear All</span></button></div>`;

  return panelBody('files', `<div class="file-list" role="list">${list}</div>${actions}`, '', active);
}

export function bindClearAll(root: Document | Element): void {
  const clearButtons = (): NodeListOf<HTMLElement> => root.querySelectorAll<HTMLElement>('.clear-all');

  const reset = (button: HTMLElement): void => {
    button.dataset.armed = 'false';
    const label = button.querySelector('.clear-all-label');
    if (label) label.textContent = 'Clear All';
  };

  root.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest<HTMLElement>('.clear-all');
    for (const other of clearButtons()) {
      if (other !== button) reset(other);
    }
    if (!button) return;
    if (button.dataset.armed !== 'true') {
      button.dataset.armed = 'true';
      const label = button.querySelector('.clear-all-label');
      if (label) label.textContent = 'Clear all?';
      return;
    }
    reset(button);
    button.dispatchEvent(new CustomEvent('beam:files:clear', { bubbles: true }));
  });

  root.addEventListener('keydown', (event) => {
    if ((event as KeyboardEvent).key !== 'Escape') return;
    for (const button of clearButtons()) {
      if (button.dataset.armed === 'true') reset(button);
    }
  });
}
