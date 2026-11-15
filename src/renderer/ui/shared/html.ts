export function panelBody(tab: string, content: string, className = '', active = true): string {
  return `<div class="panel-body${className ? ` ${className}` : ''}" role="tabpanel" id="panel-${tab}" aria-labelledby="tab-${tab}"${active ? '' : ' hidden'}>${content}</div>`;
}

export function esc(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
