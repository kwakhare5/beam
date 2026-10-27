import { icon } from '../icons';
import { esc } from '../html';
import { MASCOTS } from '../mascots';
import { panelBody } from '../panel-body';

export interface FileRow {
  name: string;
  size: string;
  kind?: 'file' | 'folder';
  missing?: boolean;
}

export function filesPanel(rows: FileRow[], copied = false): string {
  if (!rows.length) {
    return panelBody(
      'files',
      `<div class="panel-empty-content"><img class="mascot-large" src="${MASCOTS.files}" alt="" /><div class="panel-title">Drop files here</div><div class="panel-sub">Drag files onto the pill</div></div><div class="actions"><button type="button" class="btn primary" disabled>${icon('copy')}Copy All</button><button type="button" class="btn ghost">${icon('plus')}Add</button><button type="button" class="btn danger" disabled>${icon('trash')}Clear</button></div>`,
      'panel-empty'
    );
  }

  const list = rows
    .map((row) => {
      const rowIcon = row.missing ? 'alert' : row.kind === 'folder' ? 'folder' : 'file';
      return `<div class="row${row.missing ? ' missing' : ''}"${row.missing ? ' aria-disabled="true"' : ''}>${icon(rowIcon)}<span class="name">${esc(row.name)}</span><span class="size">${esc(row.size)}</span></div>`;
    })
    .join('');

  const copyIcon = copied ? icon('check') : icon('copy');
  const copyLabel = copied ? 'Copied' : 'Copy All';

  const actions = `<div class="actions" aria-live="polite"><button type="button" class="btn primary">${copyIcon}${copyLabel}</button><button type="button" class="btn ghost">${icon('plus')}Add</button><button type="button" class="btn danger">${icon('trash')}Clear</button></div>`;

  return panelBody('files', `<div class="file-list">${list}</div>${actions}`);
}
