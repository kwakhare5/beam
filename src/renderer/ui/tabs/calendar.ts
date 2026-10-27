import { esc } from '../html';
import { panelBody } from '../panel-body';

export function calendarPanel(now: Date): string {
  const year = now.getFullYear();
  const month = now.getMonth();
  const start = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const cells: string[] = [];

  for (let i = start - 1; i >= 0; i--) {
    cells.push(`<div class="cal-cell other">${prevDays - i}</div>`);
  }
  for (let day = 1; day <= days; day++) {
    cells.push(`<div class="cal-cell${day === now.getDate() ? ' today' : ''}">${day}</div>`);
  }
  let next = 1;
  while (cells.length % 7 !== 0) {
    cells.push(`<div class="cal-cell other">${next++}</div>`);
  }

  const title = now.toLocaleString(undefined, { month: 'long', year: 'numeric' });
  const dows = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day) => `<div class="cal-dow">${day}</div>`).join('');

  const content = `<div class="cal-head"><span>${esc(title)}</span><span class="panel-sub">local time</span></div><div class="cal-grid">${dows}${cells.join('')}</div>`;

  return panelBody('calendar', content);
}
