import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusinessStaff } from "@/lib/business-access";
import { prisma } from "@/lib/prisma";

const ruleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startMinute: z.number().int().min(0).max(1439),
  endMinute: z.number().int().min(1).max(1440),
});

const putSchema = z.object({
  rules: z.array(ruleSchema),
});

type Ctx = { params: Promise<{ userId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const access = await requireBusinessStaff();
  if (!access.ok) {
    return NextResponse.json({ error: access.message }, { status: access.status });
  }

  const { userId } = await ctx.params;
  if (access.session.user.role === "STAFF" && access.session.user.id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const target = await prisma.user.findFirst({
    where: { id: userId, businessId: access.businessId, role: "STAFF" },
    select: { id: true },
  });
  if (!target) {
    return NextResponse.json({ error: "Staff user not found" }, { status: 404 });
  }

  const rules = await prisma.staffAvailabilityRule.findMany({
    where: { businessId: access.businessId, staffUserId: userId },
    orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }],
  });

  return NextResponse.json({ rules });
}

export async function PUT(req: Request, ctx: Ctx) {
  const access = await requireBusinessStaff();
  if (!access.ok) {
    return NextResponse.json({ error: access.message }, { status: access.status });
  }

  const { userId } = await ctx.params;
  if (access.session.user.role === "STAFF" && access.session.user.id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const target = await prisma.user.findFirst({
    where: { id: userId, businessId: access.businessId, role: "STAFF" },
    select: { id: true },
  });
  if (!target) {
    return NextResponse.json({ error: "Staff user not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.staffAvailabilityRule.deleteMany({
      where: { businessId: access.businessId, staffUserId: userId },
    }),
    ...(parsed.data.rules.length > 0
      ? [
          prisma.staffAvailabilityRule.createMany({
            data: parsed.data.rules.map((r) => ({
              businessId: access.businessId,
              staffUserId: userId,
              dayOfWeek: r.dayOfWeek,
              startMinute: r.startMinute,
              endMinute: r.endMinute,
            })),
          }),
        ]
      : []),
  ]);

  const rules = await prisma.staffAvailabilityRule.findMany({
    where: { businessId: access.businessId, staffUserId: userId },
    orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }],
  });

  return NextResponse.json({ rules });
}
