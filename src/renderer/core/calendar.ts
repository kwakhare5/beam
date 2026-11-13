export function shiftMonth(view: Date, delta: number): Date {
  return new Date(view.getFullYear(), view.getMonth() + delta, 1);
}

export function dayKey(now: Date): string {
  return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
}
