// Global date utility
// Sets "today" to January 21, 2026 (Wednesday) for the application

export const GLOBAL_TODAY = new Date(2026, 0, 21); // Jan 21, 2026 (month is 0-indexed)

/**
 * Get the global "today" date
 * Returns January 21, 2026 (Wednesday)
 */
export function getToday(): Date {
  return new Date(GLOBAL_TODAY);
}

/**
 * Check if a date is "today" (Jan 21, 2026)
 */
export function isToday(date: Date): boolean {
  return (
    date.getFullYear() === GLOBAL_TODAY.getFullYear() &&
    date.getMonth() === GLOBAL_TODAY.getMonth() &&
    date.getDate() === GLOBAL_TODAY.getDate()
  );
}
