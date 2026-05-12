import { addDays, addMinutes, startOfDay } from "date-fns";
import { ACTIVE_CALENDAR_STATUSES } from "@/lib/active-appointment-statuses";
import { prisma } from "@/lib/prisma";
import { buildSlots } from "@/lib/time";

export type SlotsForDayOptions = {
  /** When set: use this staff member’s weekly rules if any exist for this weekday; merge their personal blocks. */
  staffUserId?: string;
};

function appointmentBlocksThisStaff(assignedStaffUserId: string | null, staffUserId: string): boolean {
  return assignedStaffUserId === null || assignedStaffUserId === staffUserId;
}

export async function getSlotsForDay(
  businessId: string,
  serviceId: string,
  day: Date,
  options?: SlotsForDayOptions,
) {
  const dayStart = startOfDay(day);
  if (Number.isNaN(dayStart.getTime())) {
    return { error: "Invalid date" as const, closedDay: true, slots: [] as Date[], service: null };
  }

  const dayEndExclusive = startOfDay(addDays(dayStart, 1));

  const service = await prisma.service.findFirst({
    where: { id: serviceId, businessId, isActive: true },
  });

  if (!service) {
    return { error: "Service not found" as const, closedDay: true, slots: [] as Date[], service: null };
  }

  const [baseRules, appointments, blocks] = await Promise.all([
    prisma.availabilityRule.findMany({
      where: { businessId, dayOfWeek: dayStart.getDay() },
    }),
    prisma.appointment.findMany({
      where: {
        businessId,
        status: { in: [...ACTIVE_CALENDAR_STATUSES] },
        startAt: {
          gte: dayStart,
          lt: dayEndExclusive,
        },
        ...(options?.staffUserId
          ? {
              OR: [{ assignedStaffUserId: null }, { assignedStaffUserId: options.staffUserId }],
            }
          : {}),
      },
      select: {
        startAt: true,
        endAt: true,
        assignedStaffUserId: true,
        service: { select: { bufferMinutesAfter: true } },
      },
    }),
    prisma.timeBlock.findMany({
      where: {
        businessId,
        startAt: { lt: dayEndExclusive },
        endAt: { gt: dayStart },
        ...(options?.staffUserId
          ? { OR: [{ staffUserId: null }, { staffUserId: options.staffUserId }] }
          : { staffUserId: null }),
      },
      select: { startAt: true, endAt: true },
    }),
  ]);

  let dayOfWeekRules = baseRules;
  if (options?.staffUserId) {
    const staffRules = await prisma.staffAvailabilityRule.findMany({
      where: { businessId, staffUserId: options.staffUserId, dayOfWeek: dayStart.getDay() },
    });
    if (staffRules.length > 0) {
      dayOfWeekRules = staffRules;
    }
  }

  const closedDay = dayOfWeekRules.length === 0;

  const blockedFromAppointments = appointments
    .filter((a) => (options?.staffUserId ? appointmentBlocksThisStaff(a.assignedStaffUserId, options.staffUserId) : true))
    .map((a) => ({
      startAt: a.startAt,
      endAt: addMinutes(a.endAt, Math.min(a.service.bufferMinutesAfter ?? 0, 120)),
    }));

  const slots = buildSlots({
    day: dayStart,
    dayOfWeekRules,
    durationMinutes: service.durationMinutes,
    existingAppointments: blockedFromAppointments,
    blockedIntervals: blocks,
  });

  return { closedDay, slots, service, error: undefined };
}
