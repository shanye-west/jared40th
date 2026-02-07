/**
 * General utility functions
 */

/**
 * Format tee time for display
 * @param timestamp - Firestore Timestamp or Date
 * @returns Formatted time string (e.g., "9:10am")
 */
export function formatTeeTime(timestamp: any): string {
  if (!timestamp) return "";

  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "pm" : "am";

  hours = hours % 12;
  hours = hours ? hours : 12;

  const minutesStr = minutes < 10 ? `0${minutes}` : minutes;

  return `${hours}:${minutesStr}${ampm}`;
}
