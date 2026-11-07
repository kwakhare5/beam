export function shiftMonth(view: Date, delta: number): Date {
  return new Date(view.getFullYear(), view.getMonth() + delta, 1);
}
