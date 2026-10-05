// Display formatting for the ISO date strings in the ride data.

// "2026-08-23" -> "Sun, Aug 23, 2026". Fixed to UTC and US English: a date-only
// ISO string parses as midnight UTC, so formatting it in the machine's timezone
// would show the previous day anywhere west of UTC.
export function formatDay(isoDate) {
  return new Date(isoDate).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
