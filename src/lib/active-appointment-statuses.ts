/** Bookings that still occupy the calendar (conflicts, staff views, reminders). */
export const ACTIVE_CALENDAR_STATUSES = ["PENDING", "CONFIRMED", "RESCHEDULED"] as const;

export type ActiveCalendarStatus = (typeof ACTIVE_CALENDAR_STATUSES)[number];
