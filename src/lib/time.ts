import { addMinutes, format, isSameDay } from "date-fns";

export function toMinuteOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function fromMinuteOfDay(day: Date, minuteOfDay: number): Date {
  const result = new Date(day);
  result.setHours(Math.floor(minuteOfDay / 60), minuteOfDay % 60, 0, 0);
  return result;
}

export function toDisplayTime(date: Date): string {
  return format(date, "p");
}

export function overlaps(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return startA < endB && endA > startB;
}

export function buildSlots(params: {
  day: Date;
  dayOfWeekRules: Array<{ startMinute: number; endMinute: number }>;
  durationMinutes: number;
  existingAppointments: Array<{ startAt: Date; endAt: Date }>;
}): Date[] {
  const { day, dayOfWeekRules, durationMinutes, existingAppointments } = params;
  const slots: Date[] = [];

  for (const rule of dayOfWeekRules) {
    for (
      let minute = rule.startMinute;
      minute + durationMinutes <= rule.endMinute;
      minute += 15
    ) {
      const slotStart = fromMinuteOfDay(day, minute);
      const slotEnd = addMinutes(slotStart, durationMinutes);

      const isBlocked = existingAppointments.some((appt) =>
        overlaps(slotStart, slotEnd, appt.startAt, appt.endAt),
      );

      if (!isBlocked) {
        slots.push(slotStart);
      }
    }
  }

  return slots;
}

export function filterTodayAppointments<T extends { startAt: Date }>(appointments: T[]): T[] {
  const now = new Date();
  return appointments.filter((appt) => isSameDay(appt.startAt, now));
}
