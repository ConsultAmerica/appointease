import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusinessAdmin } from "@/lib/business-access";
import { prisma } from "@/lib/prisma";

const postSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function GET() {
  const access = await requireBusinessAdmin();
  if (!access.ok) {
    return NextResponse.json({ error: access.message }, { status: access.status });
  }

  const staff = await prisma.user.findMany({
    where: { businessId: access.businessId, role: "STAFF" },
    select: { id: true, fullName: true, email: true, createdAt: true },
    orderBy: { fullName: "asc" },
  });

  return NextResponse.json({ staff });
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

  const email = parsed.data.email.toLowerCase().trim();
  const taken = await prisma.user.findUnique({ where: { email } });
  if (taken) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.user.create({
    data: {
      businessId: access.businessId,
      fullName: parsed.data.fullName.trim(),
      email,
      passwordHash,
      role: "STAFF",
      emailVerifiedAt: new Date(),
    },
    select: { id: true, fullName: true, email: true },
  });

  return NextResponse.json({ staff: user }, { status: 201 });
}
