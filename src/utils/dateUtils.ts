// Global date utility
// Uses the actual system date for contextual awareness

/**
 * Get today's date (system date)
 * Returns the current date from the system
 */
export function getToday(): Date {
  const now = new Date();
  // Return date at midnight to ensure consistent comparisons
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Check if a date is "today" (system date)
 */
export function isToday(date: Date): boolean {
  const today = getToday();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}
