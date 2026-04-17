/**
 * Converts a local Date to a "YYYY-MM-DD" string without UTC offset shift.
 * Use instead of date.toISOString().split('T')[0] which shifts dates in UTC+N timezones.
 */
export function toLocalISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')  // getMonth() is 0-indexed
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Parses a "YYYY-MM-DD" string as local midnight (not UTC midnight).
 * Use instead of new Date(str) which parses as UTC midnight, causing off-by-one in UTC+N.
 */
export function fromLocalISODate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)  // month is 0-indexed in Date constructor
}
