/**
 * Middle-truncates a string (typically a filename or path) preserving the start and file extension.
 * e.g., "quarterly-financial-report-final.xlsx" -> "quarterly-fin…report.xlsx"
 */
export function middleTruncate(str: string, maxLength: number): string {
  if (!str || str.length <= maxLength) return str;
  if (maxLength <= 4) return str.slice(0, maxLength);

  const lastDot = str.lastIndexOf('.');
  const hasExt = lastDot > 0 && str.length - lastDot <= 7; // extension within 6 chars

  if (hasExt) {
    const ext = str.slice(lastDot);
    const available = maxLength - ext.length - 1; // 1 for ellipsis
    if (available >= 4) {
      const front = Math.ceil(available * 0.6);
      const back = Math.floor(available * 0.4);
      const stem = str.slice(0, lastDot);
      return stem.slice(0, front) + '…' + (back > 0 ? stem.slice(-back) : '') + ext;
    }
  }

  const front = Math.ceil((maxLength - 1) / 2);
  const back = Math.floor((maxLength - 1) / 2);
  return str.slice(0, front) + '…' + str.slice(-back);
}
