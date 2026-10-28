import { icon } from '../icons';
import { esc } from '../html';
import { MASCOTS } from '../mascots';
import { panelBody } from '../panel-body';
import { middleTruncate } from '../format';

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
      const pipClass = row.missing ? 'red' : 'green';
      const badge = row.missing
        ? '<span class="pill-badge danger" title="File moved or deleted">Missing</span>'
        : `<span class="pill-badge">${esc(row.kind === 'folder' ? 'Folder' : row.size)}</span>`;
      const copy = row.missing
        ? `<button type="button" class="row-action" aria-label="Copy ${esc(row.name)}" disabled>${icon('copy')}</button>`
        : `<button type="button" class="row-action" aria-label="Copy ${esc(row.name)}">${icon('copy')}</button>`;
      return `<div class="row${row.missing ? ' missing' : ''}" role="listitem"><div class="row-icon-box">${icon(rowIcon)}<span class="status-pip ${pipClass}"></span></div><span class="name" title="${esc(row.name)}">${esc(truncatedName)}</span>${badge}<div class="row-actions">${copy}<button type="button" class="row-action" aria-label="Remove ${esc(row.name)}">${icon('x')}</button></div></div>`;
    })
    .join('');

  const copyIcon = copied ? icon('check') : icon('copy');
  const copyLabel = copied ? 'Copied' : 'Copy All';

  const actions = `<div class="actions"><span class="sr-only" role="status">${copied ? 'Copied to clipboard' : ''}</span><button type="button" class="btn primary">${copyIcon}${copyLabel}</button><button type="button" class="btn ghost">${icon('plus')}Add</button><button type="button" class="btn danger">${icon('trash')}Clear All</button></div>`;

  return panelBody('files', `<div class="file-list" role="list">${list}</div>${actions}`, '', active);
}
