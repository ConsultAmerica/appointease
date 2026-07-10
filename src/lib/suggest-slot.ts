import { addDays, startOfDay } from "date-fns";
import { getSlotsForDay } from "@/lib/slots-for-day";

export async function findEarliestSlot(
  businessId: string,
  serviceId: string,
  options?: { staffUserId?: string; fromDate?: Date; maxDays?: number },
) {
  const from = startOfDay(options?.fromDate ?? new Date());
  const maxDays = options?.maxDays ?? 21;

  for (let i = 0; i < maxDays; i++) {
    const day = addDays(from, i);
    const result = await getSlotsForDay(businessId, serviceId, day, {
      staffUserId: options?.staffUserId,
    });
    if (result.error || result.closedDay || result.slots.length === 0) continue;
    const slot = result.slots[0];
    return {
      date: day.toISOString().slice(0, 10),
      iso: slot.toISOString(),
      scannedDays: i + 1,
    };
  }
  return null;
}
