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

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { name: true, timezone: true },
  });

  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const serviceCount = await prisma.service.count({
    where: { businessId, isActive: true },
  });

  return NextResponse.json({
    business: {
      name: business.name,
      timezone: business.timezone,
      serviceCount,
    },
  });
}
