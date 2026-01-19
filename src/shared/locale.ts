/**
 * Locale Constants
 * LOT 12.4 - DPO Features
 *
 * Centralized locale and internationalization settings.
 */

// =========================
// Locale Settings
// =========================

/**
 * Default locale for date formatting
 */
export const DEFAULT_LOCALE = 'fr-FR' as const;

/**
 * Default timezone
 */
export const DEFAULT_TIMEZONE = 'Europe/Paris' as const;

// =========================
// Date Formatting Options
// =========================

/**
 * Standard date format options for toLocaleDateString
 */
export const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
};

/**
 * Long date format options
 */
export const DATE_FORMAT_LONG_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
};

/**
 * DateTime format options
 */
export const DATETIME_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
};

// =========================
// Helper Functions
// =========================

/**
 * Format a date using the default locale
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(DEFAULT_LOCALE);
}

/**
 * Format a date using long format
 */
export function formatDateLong(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(DEFAULT_LOCALE, DATE_FORMAT_LONG_OPTIONS);
}

/**
 * Format a datetime using the default locale
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(DEFAULT_LOCALE, DATETIME_FORMAT_OPTIONS);
}
