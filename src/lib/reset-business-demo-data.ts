import bcrypt from "bcryptjs";
import { addDays, addMinutes, setHours, setMinutes } from "date-fns";
import {
  CANONICAL_DEFAULT_AVAILABILITY,
  CANONICAL_DEMO_SERVICES,
  CANONICAL_DEMO_STAFF,
} from "@/lib/canonical-demo-catalog";
import { prisma } from "@/lib/prisma";

const DEMO_STAFF_PASSWORD = "Staff12345";

/**
 * Replaces services, hours, staff, and sample appointments for one business (admin “reset demo”).
 * Preserves ADMIN (and other non-STAFF) users on the business.
 */
export async function resetBusinessDemoData(businessId: string): Promise<void> {
  const staffPasswordHash = await bcrypt.hash(DEMO_STAFF_PASSWORD, 12);

  await prisma.$transaction(async (tx) => {
    await tx.agentConversationLog.deleteMany({ where: { businessId } });
    await tx.notificationLog.deleteMany({ where: { businessId } });
    await tx.appointment.deleteMany({ where: { businessId } });
    await tx.timeBlock.deleteMany({ where: { businessId } });

    const existingStaffIds = (
      await tx.user.findMany({
        where: { businessId, role: "STAFF" },
        select: { id: true },
      })
    ).map((u) => u.id);

    if (existingStaffIds.length > 0) {
      await tx.staffAvailabilityRule.deleteMany({ where: { businessId } });
      await tx.staffService.deleteMany({ where: { staffUserId: { in: existingStaffIds } } });
      await tx.user.deleteMany({ where: { id: { in: existingStaffIds } } });
    }

    await tx.availabilityRule.deleteMany({ where: { businessId } });
    await tx.service.deleteMany({ where: { businessId } });

    const services = await Promise.all(
      CANONICAL_DEMO_SERVICES.map((s) =>
        tx.service.create({
          data: {
            businessId,
            name: s.name,
            durationMinutes: s.durationMinutes,
            priceCents: s.priceCents,
            bufferMinutesAfter: s.bufferMinutesAfter,
          },
        }),
      ),
    );

    const serviceByName = new Map(services.map((svc) => [svc.name, svc]));

    const suffix = businessId.replace(/[^a-z0-9]/gi, "").slice(0, 10).toLowerCase() || "biz";

    for (let i = 0; i < CANONICAL_DEMO_STAFF.length; i += 1) {
      const row = CANONICAL_DEMO_STAFF[i]!;
      const email = `demo-staff-${i}-${suffix}@appointease.invalid`;
      const user = await tx.user.create({
        data: {
          businessId,
          fullName: row.fullName,
          email,
          passwordHash: staffPasswordHash,
          emailVerifiedAt: new Date(),
          role: "STAFF",
        },
      });
      for (const svcName of row.serviceNames) {
        const svc = serviceByName.get(svcName);
        if (svc) {
          await tx.staffService.create({
            data: { staffUserId: user.id, serviceId: svc.id },
          });
        }
      }
      await tx.staffAvailabilityRule.createMany({
        data: [0, 1, 2, 3, 4, 5, 6].map((d) => ({
          businessId,
          staffUserId: user.id,
          dayOfWeek: d,
          startMinute: 9 * 60,
          endMinute: 17 * 60,
        })),
      });
    }

    await tx.availabilityRule.createMany({
      data: [...CANONICAL_DEFAULT_AVAILABILITY].map((r) => ({
        businessId,
        dayOfWeek: r.dayOfWeek,
        startMinute: r.startMinute,
        endMinute: r.endMinute,
      })),
    });

    const wellness = serviceByName.get("Wellness Consultation");
    if (wellness) {
      const tomorrow = addDays(new Date(), 1);
      const startAt = setMinutes(setHours(tomorrow, 10), 0);
      const endAt = addMinutes(startAt, wellness.durationMinutes);
      await tx.appointment.create({
        data: {
          businessId,
          serviceId: wellness.id,
          customerName: "Alex R.",
          customerEmail: `demo-customer-${suffix}@appointease.invalid`,
          startAt,
          endAt,
          status: "CONFIRMED",
          createdViaAiChat: false,
        },
      });
    }
  });
}
