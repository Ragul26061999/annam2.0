/**
 * Standard date formatting utilities for the application.
 * All dates should follow the dd/mm/yyyy format as per user requirements.
 */

/**
 * Format a date as dd/mm/yyyy.
 * @param date - Date string, Date object, or number
 * @returns Formatted date string or empty string if invalid
 */
export function formatDate(date: string | Date | number | null | undefined): string {
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
 * @param date - Date string, Date object, or number
 * @returns Formatted date-time string or empty string if invalid
 */
export function formatDateTime(date: string | Date | number | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  const time = d.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit', 
    second: '2-digit', 
    hour12: true 
  });
  
  return `${day}/${month}/${year}, ${time}`;
}

/**
 * Format a date and time for thermal printers (compact).
 * @param date - Date string, Date object, or number
 * @returns Formatted date-time string
 */
export function formatThermalDateTime(date: string | Date | number | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  const time = d.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: true 
  });
  
  return `${day}/${month}/${year} ${time}`;
}
