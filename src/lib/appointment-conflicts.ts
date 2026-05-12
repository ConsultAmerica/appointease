import { addMinutes } from "date-fns";
import { overlaps } from "@/lib/time";
import { ACTIVE_CALENDAR_STATUSES } from "@/lib/active-appointment-statuses";
import { prisma } from "@/lib/prisma";

const MAX_BUFFER_MINUTES = 120;

/**
 * True if the interval cannot be booked (overlaps an active appointment including service buffer,
 * business-wide blackout, or staff-scoped rules when staffUserId is set).
 */
export async function hasBookableIntervalConflict(
  businessId: string,
  startAt: Date,
  endAt: Date,
  options?: { excludeAppointmentId?: string; staffUserId?: string | null },
): Promise<boolean> {
  const block = await prisma.timeBlock.findFirst({
    where: {
      businessId,
      ...(options?.staffUserId
        ? { OR: [{ staffUserId: null }, { staffUserId: options.staffUserId }] }
        : { staffUserId: null }),
      AND: [{ startAt: { lt: endAt } }, { endAt: { gt: startAt } }],
    },
  });
  if (block) return true;

  const candidates = await prisma.appointment.findMany({
    where: {
      businessId,
      ...(options?.excludeAppointmentId ? { id: { not: options.excludeAppointmentId } } : {}),
      status: { in: [...ACTIVE_CALENDAR_STATUSES] },
      startAt: { lt: addMinutes(endAt, MAX_BUFFER_MINUTES) },
      endAt: { gt: addMinutes(startAt, -MAX_BUFFER_MINUTES) },
      ...(options?.staffUserId !== undefined && options.staffUserId !== null
        ? {
            OR: [{ assignedStaffUserId: null }, { assignedStaffUserId: options.staffUserId }],
          }
        : {}),
    },
    include: { service: { select: { bufferMinutesAfter: true } } },
  });

  for (const a of candidates) {
    const buf = Math.min(a.service.bufferMinutesAfter ?? 0, MAX_BUFFER_MINUTES);
    const blockEnd = addMinutes(a.endAt, buf);
    if (overlaps(startAt, endAt, a.startAt, blockEnd)) {
      return true;
    }
  }

  return false;
}
