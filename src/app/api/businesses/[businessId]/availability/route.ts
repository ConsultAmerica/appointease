import { startOfDay } from "date-fns";
import { NextResponse } from "next/server";
import { getSlotsForDay } from "@/lib/slots-for-day";
import { toDisplayTime } from "@/lib/time";

type Context = {
  params: Promise<{ businessId: string }>;
};

export async function GET(req: Request, context: Context) {
  const { businessId } = await context.params;
  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date");
  const serviceId = searchParams.get("serviceId");
  const staffUserId = searchParams.get("staffUserId") ?? undefined;

  if (!dateParam || !serviceId) {
    return NextResponse.json({ error: "date and serviceId are required" }, { status: 400 });
  }

  const day = startOfDay(new Date(dateParam));
  if (Number.isNaN(day.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const result = await getSlotsForDay(businessId, serviceId, day, staffUserId ? { staffUserId } : undefined);
  if (result.error === "Service not found" || !result.service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  return NextResponse.json({
    closedDay: result.closedDay,
    slots: result.slots.map((slot) => ({
      iso: slot.toISOString(),
      label: toDisplayTime(slot),
    })),
  });
}
