import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusinessStaff } from "@/lib/business-access";
import { canStaffActOnAppointment } from "@/lib/appointment-staff-access";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "RESCHEDULED", "CANCELLED", "COMPLETED"]).optional(),
  assignedStaffUserId: z.string().nullable().optional(),
  specialRequestStatus: z.enum(["NONE", "PENDING", "APPROVED", "REJECTED"]).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, context: Ctx) {
  const access = await requireBusinessStaff();
  if (!access.ok) {
    return NextResponse.json({ error: access.message }, { status: access.status });
  }
  const businessId = access.businessId;

  const { id } = await context.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.appointment.findFirst({
    where: { id, businessId },
    select: {
      status: true,
      assignedStaffUserId: true,
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  const sessionUser = access.session.user;

  if (
    !canStaffActOnAppointment(
      { id: sessionUser.id, role: sessionUser.role },
      { assignedStaffUserId: existing.assignedStaffUserId },
    )
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data: {
    status?: "PENDING" | "CONFIRMED" | "RESCHEDULED" | "CANCELLED" | "COMPLETED";
    assignedStaffUserId?: string | null;
    specialRequestStatus?: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
  } = {};

  if (parsed.data.assignedStaffUserId !== undefined) {
    const uid = parsed.data.assignedStaffUserId;
    if (access.session.user.role === "ADMIN") {
      if (uid === null) {
        data.assignedStaffUserId = null;
      } else {
        const staff = await prisma.user.findFirst({
          where: { id: uid, businessId, role: "STAFF" },
        });
        if (!staff) {
          return NextResponse.json({ error: "Invalid staff user" }, { status: 400 });
        }
        data.assignedStaffUserId = uid;
      }
    } else if (
      sessionUser.role === "STAFF" &&
      uid === sessionUser.id &&
      existing.assignedStaffUserId === null
    ) {
      data.assignedStaffUserId = sessionUser.id;
    } else {
      return NextResponse.json({ error: "Only admins assign staff (or claim an unassigned visit)" }, { status: 403 });
    }
  }

  if (parsed.data.status !== undefined) {
    const next = parsed.data.status;
    if (next === "COMPLETED") {
      if (existing.status !== "CONFIRMED" && existing.status !== "RESCHEDULED") {
        return NextResponse.json({ error: "Only confirmed visits can be completed" }, { status: 400 });
      }
      data.status = "COMPLETED";
    } else {
      data.status = next;
    }
  }

  if (parsed.data.specialRequestStatus !== undefined) {
    data.specialRequestStatus = parsed.data.specialRequestStatus;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No updates" }, { status: 400 });
  }

  const appointment = await prisma.appointment.update({
    where: { id },
    data,
    include: { service: true, assignedStaff: { select: { id: true, fullName: true } } },
  });

  return NextResponse.json({ appointment });
}
