import { NextResponse } from "next/server";
import { findEarliestSlot } from "@/lib/suggest-slot";
import { getEligibleStaffForService } from "@/lib/staff-for-service";
import { toDisplayTime } from "@/lib/time";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ businessId: string }> };

export async function GET(req: Request, context: Context) {
  const { businessId } = await context.params;
  const { searchParams } = new URL(req.url);
  const serviceId = searchParams.get("serviceId") ?? undefined;

  let staff;
  if (serviceId) {
    staff = await getEligibleStaffForService(businessId, serviceId);
  } else {
    staff = await prisma.user.findMany({
      where: { businessId, role: "STAFF" },
      select: { id: true, fullName: true, email: true },
      orderBy: { fullName: "asc" },
    });
  }

  const staffWithServices = await Promise.all(
    staff.map(async (member) => {
      const links = await prisma.staffService.findMany({
        where: { staffUserId: member.id },
        include: { service: { select: { id: true, name: true, durationMinutes: true, priceCents: true, isActive: true } } },
      });
      const services =
        links.length > 0
          ? links.filter((l) => l.service.isActive).map((l) => l.service)
          : await prisma.service.findMany({
              where: { businessId, isActive: true },
              select: { id: true, name: true, durationMinutes: true, priceCents: true },
              orderBy: { name: "asc" },
            });

      const filtered = serviceId ? services.filter((s) => s.id === serviceId) : services;
      const primaryService = filtered[0] ?? services[0];
      let nextAvailable: { date: string; iso: string; label: string } | null = null;

      if (primaryService) {
        const slot = await findEarliestSlot(businessId, primaryService.id, {
          staffUserId: member.id,
          maxDays: 14,
        });
        if (slot) {
          nextAvailable = {
            date: slot.date,
            iso: slot.iso,
            label: toDisplayTime(new Date(slot.iso)),
          };
        }
      }

      const specialty = services.map((s) => s.name).join(" · ") || "General care";

      return {
        id: member.id,
        fullName: member.fullName,
        specialty,
        services,
        nextAvailable,
      };
    }),
  );

  return NextResponse.json({ providers: staffWithServices });
}
