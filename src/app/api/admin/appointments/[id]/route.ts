import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED"]),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, context: Ctx) {
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

  const { id } = await context.params;
  try {
    const body = patchSchema.parse(await req.json());

    const existing = await prisma.appointment.findFirst({
      where: { id, businessId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: { status: body.status },
      include: { service: true },
    });

    return NextResponse.json({ appointment });
  } catch (error) {
    return NextResponse.json(
      { error: "Update failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}
