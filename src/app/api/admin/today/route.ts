import { endOfDay, startOfDay } from "date-fns";
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

  const now = new Date();
  const appointments = await prisma.appointment.findMany({
    where: {
      businessId,
      startAt: { gte: startOfDay(now), lte: endOfDay(now) },
    },
    include: {
      service: true,
    },
    orderBy: { startAt: "asc" },
  });

  return NextResponse.json({ appointments });
}
