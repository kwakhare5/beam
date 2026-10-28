import { esc } from '../html';
import { icon } from '../icons';
import { panelBody } from '../panel-body';

type WeekInfoLocale = {
  getWeekInfo?: () => { firstDay: number };
  weekInfo?: { firstDay: number };
};

function firstDayOfWeek(): number {
  try {
    const locale = new Intl.Locale(navigator.language) as unknown as WeekInfoLocale;
    const info = locale.getWeekInfo?.() ?? locale.weekInfo;
    if (info) return info.firstDay % 7;
  } catch {
    /* fall through */
  }
  return 0;
}

function weekdayLabels(firstDay: number): string {
  const format = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(2024, 0, 7 + ((firstDay + index) % 7));
    return `<div class="cal-dow" aria-hidden="true">${esc(format.format(date).replace('.', '').slice(0, 2))}</div>`;
  }).join('');
}

export function calendarPanel(now: Date, active = true, view: Date = now, firstDay = firstDayOfWeek()): string {
  const year = view.getFullYear();
  const month = view.getMonth();
  const offset = (new Date(year, month, 1).getDay() - firstDay + 7) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;
  const cells: string[] = [];

  for (let i = offset - 1; i >= 0; i--) {
    cells.push(`<div class="cal-cell other" aria-hidden="true">${prevDays - i}</div>`);
  }
  for (let day = 1; day <= days; day++) {
    const today = isCurrentMonth && day === now.getDate();
    const label = new Date(year, month, day).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    cells.push(`<div class="cal-cell${today ? ' today' : ''}" aria-label="${esc(label)}"${today ? ' aria-current="date"' : ''}>${day}</div>`);
  }
  let next = 1;
  while (cells.length < 42) {
    cells.push(`<div class="cal-cell other" aria-hidden="true">${next++}</div>`);
  }

  const title = view.toLocaleString(undefined, { month: 'long', year: 'numeric' });
  const content = `<div class="cal-head"><div class="cal-nav-group"><button type="button" class="cal-nav-btn" aria-label="Previous month">${icon('chevronLeft')}</button><span class="cal-title">${esc(title)}</span><button type="button" class="cal-nav-btn" aria-label="Next month">${icon('chevronRight')}</button></div><button type="button" class="cal-today-btn">Today</button></div><div class="cal-grid" role="group" aria-label="${esc(title)}">${weekdayLabels(firstDay)}${cells.join('')}</div>`;

  return panelBody('calendar', content, '', active);
}
