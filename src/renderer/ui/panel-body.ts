import type { Tab } from './types';

export function panelBody(tab: Tab, content: string, className = ''): string {
  return `<div class="panel-body${className ? ` ${className}` : ''}" role="tabpanel" id="panel-${tab}" aria-labelledby="tab-${tab}">${content}</div>`;
}
