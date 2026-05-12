import { NextResponse } from "next/server";
import { requireBusinessStaff } from "@/lib/business-access";
import { prisma } from "@/lib/prisma";

/** Staff sees the shared queue (unassigned) plus appointments assigned to them. Admins listing here get full business list. */
export async function GET() {
  const access = await requireBusinessStaff();
  if (!access.ok) {
    return NextResponse.json({ error: access.message }, { status: access.status });
  }

  const userId = access.session.user.id;
  const isStaff = access.session.user.role === "STAFF";

  const appointments = await prisma.appointment.findMany({
    where: {
      businessId: access.businessId,
      ...(isStaff
        ? {
            OR: [{ assignedStaffUserId: null }, { assignedStaffUserId: userId }],
          }
        : {}),
    },
    orderBy: { startAt: "asc" },
    include: {
      service: { select: { name: true, durationMinutes: true } },
      assignedStaff: { select: { id: true, fullName: true, email: true } },
    },
  });

  return NextResponse.json({ appointments });
}
