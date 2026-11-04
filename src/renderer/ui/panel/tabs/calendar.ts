import { esc } from '../../shared/html';
import { icon } from '../../shared/icons';
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
  const long = new Intl.DateTimeFormat(undefined, { weekday: 'long' });
  const short = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(2024, 0, 7 + ((firstDay + index) % 7));
    return `<th scope="col" abbr="${esc(long.format(date))}">${esc(short.format(date).replace('.', '').slice(0, 2))}</th>`;
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
    cells.push(`<td class="cal-cell other" aria-hidden="true">${prevDays - i}</td>`);
  }
  for (let day = 1; day <= days; day++) {
    const today = isCurrentMonth && day === now.getDate();
    const label = new Date(year, month, day).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    cells.push(
      `<td class="cal-cell${today ? ' today' : ''}" aria-label="${esc(label)}"${today ? ' aria-current="date"' : ''}>${day}</td>`
    );
  }
  const weekCount = Math.max(5, Math.ceil((offset + days) / 7));
  let next = 1;
  while (cells.length < weekCount * 7) {
    cells.push(`<td class="cal-cell other" aria-hidden="true">${next++}</td>`);
  }

  const weeks = Array.from({ length: weekCount }, (_, row) => `<tr>${cells.slice(row * 7, row * 7 + 7).join('')}</tr>`).join('');
  const title = view.toLocaleString(undefined, { month: 'long', year: 'numeric' });
  const content = `<div class="cal-head"><div class="cal-nav-group"><button type="button" class="cal-nav-btn" data-cal-prev aria-label="Previous month">${icon('chevronLeft')}</button><span class="cal-title">${esc(title)}</span><button type="button" class="cal-nav-btn" data-cal-next aria-label="Next month">${icon('chevronRight')}</button></div><button type="button" class="cal-today-btn" data-cal-today>Today</button></div><table class="cal-grid"><caption class="sr-only">${esc(title)}</caption><thead><tr>${weekdayLabels(firstDay)}</tr></thead><tbody>${weeks}</tbody></table>`;

  return panelBody('calendar', content, '', active);
}
