/**
 * Universal rounding utility for the hospital management system.
 * All monetary amounts must be whole numbers (no decimals).
 *
 * Rule: if decimal >= 0.5 → round up, else round down.
 * Example: 25.75 → 26, 25.25 → 25, 25.50 → 26
 */
export function roundAmount(num: number): number {
  if (!Number.isFinite(num)) return 0;
  return Math.round(num);
}

/**
 * Format a number as a whole-number currency string (no decimals).
 * Example: 1234 → "1,234"
 */
export function formatCurrency(num: number): string {
  return roundAmount(num).toLocaleString('en-IN');
}

/**
 * Round and format for display with ₹ symbol.
 * Example: 1234.75 → "₹1,235"
 */
export function formatRupees(num: number): string {
  return `₹${formatCurrency(num)}`;
}
/**
 * Format a date as dd/mm/yyyy.
 * Example: "2026-04-22" -> "22/04/2026"
 */
export function formatDate(date: string | Date | number): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format a date and time as dd/mm/yyyy, hh:mm:ss AM/PM.
 * Example: "2026-04-22T10:44:54" -> "22/04/2026, 10:44:54 AM"
 */
export function formatDateTime(date: string | Date | number): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
  return `${day}/${month}/${year}, ${time}`;
}
