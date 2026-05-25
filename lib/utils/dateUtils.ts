/**
 * Safe date utilities that handle:
 * - ISO strings (e.g. "2025-05-24T10:30:00.000Z")
 * - Firestore Timestamps ({seconds, nanoseconds} or {_seconds, _nanoseconds})
 * - JavaScript Date objects
 * - Unix timestamps (numbers)
 * Any year, any month — fully dynamic.
 */

const MONTH_NAMES = [
  'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December',
];

/** Convert any date value to a JS Date safely. Returns null if unparseable. */
export function toDate(val: unknown): Date | null {
  if (!val) return null;

  // Firestore Timestamp shape (from Admin SDK: _seconds / _nanoseconds)
  if (typeof val === 'object' && val !== null) {
    const v = val as Record<string, unknown>;
    if (typeof v._seconds === 'number') return new Date(v._seconds * 1000);
    if (typeof v.seconds === 'number') return new Date(v.seconds * 1000);
    // toDate() method (client SDK Timestamp)
    if (typeof (v as any).toDate === 'function') return (v as any).toDate();
  }

  // Number — unix ms
  if (typeof val === 'number') return new Date(val);

  // String
  if (typeof val === 'string') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

/** Convert any date value to an ISO string. Returns '' if unparseable. */
export function toISOString(val: unknown): string {
  const d = toDate(val);
  return d ? d.toISOString() : '';
}

/**
 * Get "YYYY-MM" from any date value.
 * Works for any month of any year.
 * Returns '' if the value cannot be parsed.
 */
export function getYearMonth(val: unknown): string {
  const d = toDate(val);
  if (!d) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Convert "YYYY-MM" string to a human readable label like "May 2025".
 * Works for any month and any year dynamically.
 */
export function formatMonthLabel(ym: string): string {
  if (!ym || !ym.includes('-')) return ym;
  const [year, monthStr] = ym.split('-');
  const monthIndex = parseInt(monthStr, 10) - 1;
  if (monthIndex < 0 || monthIndex > 11) return ym;
  return `${MONTH_NAMES[monthIndex]} ${year}`;
}

/**
 * Get month label from any date value directly (convenience wrapper).
 */
export function getMonthLabel(val: unknown): string {
  const ym = getYearMonth(val);
  return ym ? formatMonthLabel(ym) : 'All Months';
}
