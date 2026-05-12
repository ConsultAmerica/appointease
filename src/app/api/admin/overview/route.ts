import { endOfDay, startOfDay } from "date-fns";
import { NextResponse } from "next/server";
import { ACTIVE_CALENDAR_STATUSES } from "@/lib/active-appointment-statuses";
import { requireBusinessStaff } from "@/lib/business-access";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const access = await requireBusinessStaff();
  if (!access.ok) {
    return NextResponse.json({ error: access.message }, { status: access.status });
  }
  const { businessId } = access;
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const [today, upcoming, cancelledRecent, services, staff, customerRows] = await Promise.all([
    prisma.appointment.findMany({
      where: { businessId, startAt: { gte: todayStart, lte: todayEnd } },
      orderBy: { startAt: "asc" },
      include: { service: true, assignedStaff: { select: { id: true, fullName: true } } },
    }),
    prisma.appointment.findMany({
      where: {
        businessId,
        status: { in: [...ACTIVE_CALENDAR_STATUSES] },
        startAt: { gte: now },
      },
      orderBy: { startAt: "asc" },
      take: 40,
      include: { service: true, assignedStaff: { select: { id: true, fullName: true } } },
    }),
    prisma.appointment.findMany({
      where: {
        businessId,
        status: "CANCELLED",
        updatedAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { updatedAt: "desc" },
      take: 25,
      include: { service: true },
    }),
    prisma.service.findMany({
      where: { businessId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        durationMinutes: true,
        bufferMinutesAfter: true,
        priceCents: true,
        isActive: true,
      },
    }),
    prisma.user.findMany({
      where: { businessId, role: "STAFF" },
      select: { id: true, fullName: true, email: true },
      orderBy: { fullName: "asc" },
    }),
    prisma.appointment.groupBy({
      by: ["customerEmail"],
      where: { businessId },
      _count: { id: true },
      orderBy: { customerEmail: "asc" },
      take: 80,
    }),
  ]);

  const customers = customerRows.map((c) => ({
    email: c.customerEmail,
    appointmentCount: c._count.id,
  }));

  return NextResponse.json({
    today: today.map((a) => ({
      id: a.id,
      startAt: a.startAt.toISOString(),
      status: a.status,
      customerName: a.customerName,
      customerEmail: a.customerEmail,
      serviceName: a.service.name,
      staffName: a.assignedStaff?.fullName ?? null,
      createdViaAiChat: a.createdViaAiChat,
    })),
    upcoming: upcoming.map((a) => ({
      id: a.id,
      startAt: a.startAt.toISOString(),
      status: a.status,
      customerName: a.customerName,
      customerEmail: a.customerEmail,
      serviceName: a.service.name,
      staffName: a.assignedStaff?.fullName ?? null,
      createdViaAiChat: a.createdViaAiChat,
    })),
    cancelledRecent: cancelledRecent.map((a) => ({
      id: a.id,
      startAt: a.startAt.toISOString(),
      customerName: a.customerName,
      customerEmail: a.customerEmail,
      serviceName: a.service.name,
      updatedAt: a.updatedAt.toISOString(),
    })),
    services,
    staff,
    customers,
  });
}
