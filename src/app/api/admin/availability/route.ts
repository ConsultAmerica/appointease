import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusinessAdmin } from "@/lib/business-access";
import { prisma } from "@/lib/prisma";

const ruleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startMinute: z.number().int().min(0).max(1439),
  endMinute: z.number().int().min(1).max(1440),
});

const putSchema = z.object({
  rules: z.array(ruleSchema),
});

export async function GET() {
  const access = await requireBusinessAdmin();
  if (!access.ok) {
    return NextResponse.json({ error: access.message }, { status: access.status });
  }

  const rules = await prisma.availabilityRule.findMany({
    where: { businessId: access.businessId },
    orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }],
  });

  return NextResponse.json({ rules });
}

export async function PUT(req: Request) {
  const access = await requireBusinessAdmin();
  if (!access.ok) {
    return NextResponse.json({ error: access.message }, { status: access.status });
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
    prisma.availabilityRule.deleteMany({ where: { businessId: access.businessId } }),
    prisma.availabilityRule.createMany({
      data: parsed.data.rules.map((r) => ({
        businessId: access.businessId,
        dayOfWeek: r.dayOfWeek,
        startMinute: r.startMinute,
        endMinute: r.endMinute,
      })),
    }),
  ]);

  const rules = await prisma.availabilityRule.findMany({
    where: { businessId: access.businessId },
    orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }],
  });

  return NextResponse.json({ rules });
}
