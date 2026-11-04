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
  path?: string;
}

type CopyOutcome = { ok: boolean; count: number; error?: string };

export function filesPanel(rows: FileRow[], copied = false, active = true): string {
  if (!rows.length) {
    return panelBody(
      'files',
      `<div class="drop-well"><img class="mascot-large" src="${MASCOTS.master}" alt="" /><div class="panel-title">Drop files here</div><div class="panel-sub">They stay until Beam closes</div><button type="button" class="btn" data-add-files>${icon('plus')}Add files</button></div><div class="shelf-status shelf-status-empty"><span class="shelf-note" data-files-status role="status" aria-live="polite"></span><button type="button" class="shelf-undo" data-files-undo hidden>Undo</button></div>`,
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
        : `<button type="button" class="row-action"${row.path ? ` data-copy-path="${esc(row.path)}"` : ''} aria-label="Copy ${esc(row.name)}">${icon('copy')}</button>`;
      const drag = row.path && !row.missing ? ` draggable="true" data-drag-path="${esc(row.path)}"` : '';
      const remove = row.path ? ` data-remove-path="${esc(row.path)}"` : '';
      return `<div class="row${row.missing ? ' missing' : ''}" role="listitem"${drag}><div class="row-icon-box">${icon(rowIcon)}</div><span class="name" title="${esc(row.name)}">${esc(truncatedName)}</span>${meta}<div class="row-actions">${copy}<button type="button" class="row-action"${remove} aria-label="Remove ${esc(row.name)}">${icon('x')}</button></div></div>`;
    })
    .join('');

  const allMissing = rows.every((row) => row.missing);
  const copyIcon = copied ? icon('check') : icon('copy');
  const copyLabel = copied ? 'Copied' : 'Copy All';

  const actions = `<div class="actions"><div class="shelf-status"><span class="shelf-note" data-files-status role="status" aria-live="polite">${copied ? 'Copied to clipboard' : 'Files clear on quit'}</span><button type="button" class="shelf-undo" data-files-undo hidden>Undo</button></div><button type="button" class="btn primary" data-copy-all${allMissing ? ' disabled' : ''}>${copyIcon}${copyLabel}</button><button type="button" class="btn ghost" data-add-files>${icon('plus')}Add files</button><button type="button" class="btn danger clear-all" data-armed="false">${icon('trash')}<span class="clear-all-label">Clear All</span></button></div>`;

  return panelBody('files', `<div class="file-list" role="list">${list}</div>${actions}`, 'panel-files-list', active);
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

export function bindFileDrag(root: Document | Element, startDrag: (paths: string[]) => void): void {
  root.addEventListener('dragstart', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const row = target.closest<HTMLElement>('[data-drag-path]');
    if (!row) return;
    const path = row.dataset.dragPath;
    if (!path) return;
    event.preventDefault();
    startDrag([path]);
  });
}

export function bindFilesActions(
  root: Document | Element,
  copy: (paths: string[], source: 'row' | 'all') => Promise<CopyOutcome>,
  remove: (path: string) => void = () => {}
): void {
  let statusTimer: number | undefined;
  const status = (text: string): void => {
    const node = root.querySelector<HTMLElement>('[data-files-status]');
    if (!node) return;
    node.textContent = text;
    if (statusTimer !== undefined) window.clearTimeout(statusTimer);
    statusTimer = window.setTimeout(() => {
      statusTimer = undefined;
      const current = root.querySelector<HTMLElement>('[data-files-status]');
      if (current) current.textContent = 'Files clear on quit';
    }, 2500);
  };

  const restore = (button: HTMLElement, inner: string, delay: number): void => {
    window.setTimeout(() => {
      if (!button.isConnected) return;
      button.innerHTML = inner;
      delete button.dataset.copied;
    }, delay);
  };

  const copyRow = async (button: HTMLElement): Promise<void> => {
    const path = button.dataset.copyPath;
    if (!path || button.dataset.copied === 'true') return;
    const inner = button.innerHTML;
    button.dataset.copied = 'true';
    button.innerHTML = icon('check');
    try {
      const result = await copy([path], 'row');
      if (!result.ok) throw new Error(result.error ?? 'copy failed');
      status('Copied to clipboard');
      restore(button, inner, 1500);
    } catch (error) {
      button.innerHTML = inner;
      delete button.dataset.copied;
      status('Copy failed');
      console.error('[files] copy failed', error);
    }
  };

  const copyAll = async (button: HTMLElement): Promise<void> => {
    if (button.dataset.copied === 'true') return;
    const paths = [...root.querySelectorAll<HTMLElement>('#panel-files [data-copy-path]')]
      .map((item) => item.dataset.copyPath)
      .filter((path): path is string => typeof path === 'string' && path.length > 0);
    if (!paths.length) return;
    const inner = button.innerHTML;
    button.dataset.copied = 'true';
    try {
      const result = await copy(paths, 'all');
      if (!result.ok) throw new Error(result.error ?? 'copy failed');
      button.innerHTML = `${icon('check')}Copied`;
      status('Copied to clipboard');
      restore(button, inner, 1800);
    } catch (error) {
      delete button.dataset.copied;
      status('Copy failed');
      console.error('[files] copy failed', error);
    }
  };

  root.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const rowButton = target.closest<HTMLElement>('[data-copy-path]');
    if (rowButton) {
      void copyRow(rowButton);
      return;
    }
    const removeButton = target.closest<HTMLElement>('[data-remove-path]');
    if (removeButton) {
      const path = removeButton.dataset.removePath;
      if (path) remove(path);
      return;
    }
    const allButton = target.closest<HTMLElement>('[data-copy-all]');
    if (allButton) void copyAll(allButton);
  });
}
