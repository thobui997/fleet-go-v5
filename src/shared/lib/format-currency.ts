/**
 * Format a number as Vietnamese Dong (VND) currency string.
 * Uses Intl.NumberFormat with 'vi-VN' locale.
 *
 * @param amount - The number to format (can be null/undefined)
 * @returns Formatted currency string (e.g., "1.500.000 ₫") or "0 ₫" for null/undefined
 *
 * @example
 * formatCurrency(1500000) // "1.500.000 ₫"
 * formatCurrency(0) // "0 ₫"
 * formatCurrency(null) // "0 ₫"
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) {
    return '0 ₫';
  }

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}
