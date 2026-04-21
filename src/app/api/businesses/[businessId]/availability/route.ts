import { addDays, endOfDay, startOfDay } from "date-fns";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildSlots, toDisplayTime } from "@/lib/time";

type Context = {
  params: Promise<{ businessId: string }>;
};

export async function GET(req: Request, context: Context) {
  const { businessId } = await context.params;
  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date");
  const serviceId = searchParams.get("serviceId");

  if (!dateParam || !serviceId) {
    return NextResponse.json({ error: "date and serviceId are required" }, { status: 400 });
  }

  const day = startOfDay(new Date(dateParam));
  if (Number.isNaN(day.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const [service, rules, appointments] = await Promise.all([
    prisma.service.findFirst({
      where: { id: serviceId, businessId, isActive: true },
    }),
    prisma.availabilityRule.findMany({
      where: { businessId, dayOfWeek: day.getDay() },
    }),
    prisma.appointment.findMany({
      where: {
        businessId,
        status: { in: ["PENDING", "CONFIRMED"] },
        startAt: {
          gte: startOfDay(day),
          lt: endOfDay(addDays(day, 1)),
        },
      },
      select: {
        startAt: true,
        endAt: true,
      },
    }),
  ]);

  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  const closedDay = rules.length === 0;

  const slots = buildSlots({
    day,
    dayOfWeekRules: rules,
    durationMinutes: service.durationMinutes,
    existingAppointments: appointments,
  });

  return NextResponse.json({
    closedDay,
    slots: slots.map((slot) => ({
      iso: slot.toISOString(),
      label: toDisplayTime(slot),
    })),
  });
}
