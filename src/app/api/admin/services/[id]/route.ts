import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusinessAdmin } from "@/lib/business-access";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  name: z.string().min(2).optional(),
  durationMinutes: z.number().int().positive().optional(),
  priceCents: z.number().int().nonnegative().optional(),
  bufferMinutesAfter: z.number().int().min(0).max(120).optional(),
  isActive: z.boolean().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const access = await requireBusinessAdmin();
  if (!access.ok) {
    return NextResponse.json({ error: access.message }, { status: access.status });
  }

  const { id } = await ctx.params;
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

  const existing = await prisma.service.findFirst({
    where: { id, businessId: access.businessId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name.trim();
  if (parsed.data.durationMinutes !== undefined) data.durationMinutes = parsed.data.durationMinutes;
  if (parsed.data.priceCents !== undefined) data.priceCents = parsed.data.priceCents;
  if (parsed.data.bufferMinutesAfter !== undefined) data.bufferMinutesAfter = parsed.data.bufferMinutesAfter;
  if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;

  const service = await prisma.service.update({
    where: { id },
    data,
  });

  return NextResponse.json({ service });
}
