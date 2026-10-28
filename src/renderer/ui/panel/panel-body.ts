import type { Tab } from './tab-meta';

export function panelBody(tab: Tab, content: string, className = '', active = true): string {
  return `<div class="panel-body${className ? ` ${className}` : ''}" role="tabpanel" id="panel-${tab}" aria-labelledby="tab-${tab}"${active ? '' : ' hidden'}>${content}</div>`;
}
