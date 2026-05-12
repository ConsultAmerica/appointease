import { addDays, formatISO, startOfDay, subDays } from "date-fns";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN" && session.user.role !== "STAFF") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const businessId = session.user.businessId;
  if (!businessId) {
    return NextResponse.json({ error: "Business context missing" }, { status: 403 });
  }

  const today = startOfDay(new Date());
  const lookbackStart = subDays(today, 6);

  const appointments = await prisma.appointment.findMany({
    where: {
      businessId,
      startAt: { gte: lookbackStart, lt: addDays(today, 1) },
    },
    select: { startAt: true, status: true },
  });

  const byDay = new Map<string, number>();
  for (let i = 0; i < 7; i += 1) {
    const key = formatISO(addDays(lookbackStart, i), { representation: "date" });
    byDay.set(key, 0);
  }

  let cancelled = 0;
  for (const appt of appointments) {
    const key = formatISO(startOfDay(appt.startAt), { representation: "date" });
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
    if (appt.status === "CANCELLED") cancelled += 1;
  }

  const noShowRate = appointments.length === 0 ? 0 : Number(((cancelled / appointments.length) * 100).toFixed(1));

  const now = new Date();
  const [totalBookings, upcoming, confirmed, cancelledTotal, completed] = await Promise.all([
    prisma.appointment.count({ where: { businessId } }),
    prisma.appointment.count({
      where: {
        businessId,
        status: { notIn: ["CANCELLED", "COMPLETED"] },
        startAt: { gte: now },
      },
    }),
    prisma.appointment.count({ where: { businessId, status: "CONFIRMED" } }),
    prisma.appointment.count({ where: { businessId, status: "CANCELLED" } }),
    prisma.appointment.count({ where: { businessId, status: "COMPLETED" } }),
  ]);

  return NextResponse.json({
    bookingsByDay: Array.from(byDay, ([date, bookings]) => ({ date, bookings })),
    noShowRate,
    stats: {
      totalBookings,
      upcoming,
      confirmed,
      cancelled: cancelledTotal,
      completed,
    },
  });
}
