import { toMinuteOfDay } from "@/lib/time";

export type TimePreference = "morning" | "afternoon" | "evening" | "after_2pm" | "any";

/** Filter slot start times by coarse part-of-day (uses slot's local clock). */
export function filterSlotsByTimePreference(slots: Date[], preference: TimePreference): Date[] {
  if (preference === "any") return slots;

  return slots.filter((slot) => {
    const m = toMinuteOfDay(slot);
    switch (preference) {
      case "morning":
        return m >= 5 * 60 && m < 12 * 60;
      case "afternoon":
        return m >= 12 * 60 && m < 17 * 60;
      case "evening":
        return m >= 17 * 60 && m <= 23 * 60 + 45;
      case "after_2pm":
        return m >= 14 * 60;
      default:
        return true;
    }
  });
}
