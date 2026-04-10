import dayjs from 'dayjs';

/**
 * Format a date string using Day.js.
 * Handles null/undefined by returning '-'.
 *
 * @param date - The date to format (string, Date, or null/undefined)
 * @param format - The Day.js format string (default: 'DD/MM/YYYY')
 * @returns Formatted date string or '-' for null/undefined
 *
 * @example
 * formatDate('2024-01-15') // "15/01/2024"
 * formatDate('2024-01-15', 'YYYY-MM-DD') // "2024-01-15"
 * formatDate(null) // "-"
 */
export function formatDate(
  date: string | Date | null | undefined,
  format: string = 'DD/MM/YYYY'
): string {
  if (!date) {
    return '-';
  }
  return dayjs(date).format(format);
}

/**
 * Format a date and time string using Day.js.
 * Handles null/undefined by returning '-'.
 *
 * @param date - The date to format (string, Date, or null/undefined)
 * @param format - The Day.js format string (default: 'DD/MM/YYYY HH:mm')
 * @returns Formatted datetime string or '-' for null/undefined
 *
 * @example
 * formatDateTime('2024-01-15T10:30:00') // "15/01/2024 10:30"
 * formatDateTime('2024-01-15T10:30:00', 'YYYY-MM-DD HH:mm:ss') // "2024-01-15 10:30:00"
 * formatDateTime(null) // "-"
 */
export function formatDateTime(
  date: string | Date | null | undefined,
  format: string = 'DD/MM/YYYY HH:mm'
): string {
  if (!date) {
    return '-';
  }
  return dayjs(date).format(format);
}
