import { NextResponse } from "next/server";
import { findEarliestSlot } from "@/lib/suggest-slot";
import { toDisplayTime } from "@/lib/time";

type Context = { params: Promise<{ businessId: string }> };

export async function GET(req: Request, context: Context) {
  const { businessId } = await context.params;
  const { searchParams } = new URL(req.url);
  const serviceId = searchParams.get("serviceId");
  const staffUserId = searchParams.get("staffUserId") ?? undefined;

  if (!serviceId) {
    return NextResponse.json({ error: "serviceId is required" }, { status: 400 });
  }

  const found = await findEarliestSlot(businessId, serviceId, { staffUserId, maxDays: 21 });
  if (!found) {
    return NextResponse.json({ suggestion: null, message: "No open slots in the next 3 weeks." });
  }

  return NextResponse.json({
    suggestion: {
      date: found.date,
      iso: found.iso,
      label: toDisplayTime(new Date(found.iso)),
      scannedDays: found.scannedDays,
    },
  });
}
