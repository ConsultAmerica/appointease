import { startOfDay } from "date-fns";
import { getEligibleStaffForService } from "@/lib/staff-for-service";
import { getSlotsForDay } from "@/lib/slots-for-day";
import { filterSlotsByTimePreference, type TimePreference } from "@/lib/time-preference";
import { toDisplayTime } from "@/lib/time";

export type CheckAvailabilityParams = {
  businessId: string;
  serviceId: string;
  /** YYYY-MM-DD */
  date: string;
  staffUserId?: string;
  /** When no staffUserId: search these many staff (in name order) for open times. */
  maxStaff?: number;
  maxSlotsPerStaff?: number;
  timePreference?: TimePreference;
};

export async function checkAvailabilityForAgent(params: CheckAvailabilityParams) {
  const {
    businessId,
    serviceId,
    date,
    staffUserId,
    maxStaff = 6,
    maxSlotsPerStaff = 4,
    timePreference = "any",
  } = params;

  const day = startOfDay(new Date(`${date}T12:00:00`));
  if (Number.isNaN(day.getTime())) {
    return { error: "Invalid date" };
  }

  const businessProbe = await getSlotsForDay(businessId, serviceId, day);
  if (businessProbe.error === "Service not found" || !businessProbe.service) {
    return { error: "Service not found or inactive" };
  }

  if (businessProbe.closedDay) {
    return {
      closedDay: true,
      message: "The business has no working hours on this weekday.",
      serviceName: businessProbe.service.name,
      durationMinutes: businessProbe.service.durationMinutes,
      bufferMinutesAfter: businessProbe.service.bufferMinutesAfter,
    };
  }

  const pref = timePreference ?? "any";

  if (staffUserId) {
    const result = await getSlotsForDay(businessId, serviceId, day, { staffUserId });
    let slots = result.slots;
    slots = filterSlotsByTimePreference(slots, pref);
    const capped = slots.slice(0, Math.max(maxSlotsPerStaff, 6));
    return {
      closedDay: false,
      staffUserId,
      serviceName: result.service?.name,
      durationMinutes: result.service?.durationMinutes,
      bufferMinutesAfter: result.service?.bufferMinutesAfter,
      slots: capped.map((s) => ({ iso: s.toISOString(), label: toDisplayTime(s) })),
      note: "Times respect business hours, this staff member’s weekly hours, their time off, existing bookings (with buffer), and service length.",
    };
  }

  const staff = await getEligibleStaffForService(businessId, serviceId);
  if (staff.length === 0) {
    return {
      error: "No staff members are set up for this business. An admin must add staff in workspace settings.",
    };
  }

  const byStaff: Array<{
    staffId: string;
    staffName: string;
    slots: Array<{ iso: string; label: string }>;
  }> = [];

  for (const s of staff.slice(0, maxStaff)) {
    const r = await getSlotsForDay(businessId, serviceId, day, { staffUserId: s.id });
    let slots = filterSlotsByTimePreference(r.slots, pref);
    slots = slots.slice(0, maxSlotsPerStaff);
    if (slots.length > 0) {
      byStaff.push({
        staffId: s.id,
        staffName: s.fullName,
        slots: slots.map((slot) => ({ iso: slot.toISOString(), label: toDisplayTime(slot) })),
      });
    }
  }

  return {
    closedDay: false,
    serviceName: businessProbe.service.name,
    durationMinutes: businessProbe.service.durationMinutes,
    bufferMinutesAfter: businessProbe.service.bufferMinutesAfter,
    byStaff,
    guidance:
      byStaff.length === 0
        ? "No open times for eligible staff on this date with the time preference. Try another day or relax timePreference."
        : "Offer at most a few options per staff member. Ask whether the customer prefers a specific person or the earliest available.",
  };
}
