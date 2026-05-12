import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusinessAdmin } from "@/lib/business-access";
import { prisma } from "@/lib/prisma";

const postSchema = z.object({
  name: z.string().min(2),
  durationMinutes: z.number().int().positive(),
  priceCents: z.number().int().nonnegative().default(0),
  bufferMinutesAfter: z.number().int().min(0).max(120).optional(),
});

export async function GET() {
  const access = await requireBusinessAdmin();
  if (!access.ok) {
    return NextResponse.json({ error: access.message }, { status: access.status });
  }

  const services = await prisma.service.findMany({
    where: { businessId: access.businessId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ services });
}

export async function POST(req: Request) {
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

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const service = await prisma.service.create({
    data: {
      businessId: access.businessId,
      name: parsed.data.name.trim(),
      durationMinutes: parsed.data.durationMinutes,
      priceCents: parsed.data.priceCents,
      bufferMinutesAfter: parsed.data.bufferMinutesAfter ?? 0,
      isActive: true,
    },
  });

  return NextResponse.json({ service }, { status: 201 });
}
