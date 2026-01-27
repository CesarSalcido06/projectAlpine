/**
 * Project Alpine - Date Utilities
 *
 * All dates are stored and displayed in UTC to ensure consistency
 * regardless of user's timezone. When you set 6am, you see 6am everywhere.
 */

/**
 * Format a date for display, using UTC to avoid timezone shifts.
 * @param dateStr - ISO date string
 * @returns Formatted date string (e.g., "Mon, Jan 20")
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return `${days[date.getUTCDay()]}, ${months[date.getUTCMonth()]} ${date.getUTCDate()}`;
}

/**
 * Format time for display, using UTC to avoid timezone shifts.
 * @param dateStr - ISO date string
 * @returns Formatted time string (e.g., "6:00 AM")
 */
export function formatTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);

  let hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12

  return `${hours}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

/**
 * Format date and time for display, using UTC.
 * @param dateStr - ISO date string
 * @returns Formatted datetime string (e.g., "Mon, Jan 20 at 6:00 AM")
 */
export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  return `${formatDate(dateStr)} at ${formatTime(dateStr)}`;
}

/**
 * Format due date with relative context (Today, Tomorrow, etc), using UTC.
 * @param dateStr - ISO date string
 * @returns Formatted string with context (e.g., "Today at 6:00 AM")
 */
export function formatDueDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';

  const date = new Date(dateStr);
  const now = new Date();

  // Compare using UTC dates
  const dateUTC = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const tomorrowUTC = todayUTC + 24 * 60 * 60 * 1000;

  const timeStr = formatTime(dateStr);

  if (dateUTC === todayUTC) {
    return `Today at ${timeStr}`;
  } else if (dateUTC === tomorrowUTC) {
    return `Tomorrow at ${timeStr}`;
  } else {
    return `${formatDate(dateStr)} at ${timeStr}`;
  }
}

/**
 * Get the day of week name from a date, using UTC.
 * @param dateStr - ISO date string
 * @returns Day name (e.g., "Monday")
 */
export function getDayOfWeek(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getUTCDay()];
}

/**
 * Check if a date is today, using UTC.
 * @param dateStr - ISO date string
 * @returns true if the date is today
 */
export function isToday(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const now = new Date();

  return date.getUTCFullYear() === now.getUTCFullYear() &&
         date.getUTCMonth() === now.getUTCMonth() &&
         date.getUTCDate() === now.getUTCDate();
}

/**
 * Check if a date is in the past, using UTC.
 * @param dateStr - ISO date string
 * @returns true if the date is before now
 */
export function isPast(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

/**
 * Check if a date is overdue (past and not today), using UTC.
 * @param dateStr - ISO date string
 * @returns true if overdue
 */
export function isOverdue(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const now = new Date();

  // Compare just the dates (ignore time for overdue check)
  const dateOnly = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const todayOnly = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  return dateOnly < todayOnly;
}

/**
 * Check if a UTC date (from server) matches a local calendar date.
 * Use this when filtering tasks for a specific calendar day.
 *
 * The server stores dates in UTC. When displaying on a calendar,
 * we want "Jan 27 6am UTC" to appear on Jan 27 on the calendar,
 * regardless of the user's timezone.
 *
 * @param utcDateStr - ISO date string from server (stored in UTC)
 * @param localDate - Local Date object representing a calendar day
 * @returns true if the UTC date falls on the same calendar day
 */
export function isSameCalendarDay(utcDateStr: string | null | undefined, localDate: Date): boolean {
  if (!utcDateStr) return false;
  const utcDate = new Date(utcDateStr);

  // Compare UTC components of the stored date against local date components
  // This ensures "2026-01-27T06:00:00Z" matches calendar day Jan 27
  return (
    utcDate.getUTCFullYear() === localDate.getFullYear() &&
    utcDate.getUTCMonth() === localDate.getMonth() &&
    utcDate.getUTCDate() === localDate.getDate()
  );
}

/**
 * Check if a UTC date (from server) is today in local time.
 * @param utcDateStr - ISO date string from server
 * @returns true if the UTC date is today
 */
export function isUTCDateToday(utcDateStr: string | null | undefined): boolean {
  if (!utcDateStr) return false;
  return isSameCalendarDay(utcDateStr, new Date());
}
