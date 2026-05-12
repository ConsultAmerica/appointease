import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusinessAdmin, requireBusinessStaff } from "@/lib/business-access";
import { prisma } from "@/lib/prisma";

const postSchema = z.object({
  /** Whole-business block when omitted (admin only). Staff always create personal blocks. */
  staffUserId: z.string().optional(),
  startAt: z.string().min(1),
  endAt: z.string().min(1),
  reason: z.string().max(500).optional(),
});

export async function GET(req: Request) {
  const access = await requireBusinessStaff();
  if (!access.ok) {
    return NextResponse.json({ error: access.message }, { status: access.status });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");

  const start = from ? new Date(from) : new Date();
  if (Number.isNaN(start.getTime())) {
    return NextResponse.json({ error: "Invalid from" }, { status: 400 });
  }

  const staffRole = access.session.user.role === "STAFF";
  const where = staffRole
    ? {
        businessId: access.businessId,
        staffUserId: access.session.user.id,
        endAt: { gte: start },
      }
    : {
        businessId: access.businessId,
        endAt: { gte: start },
      };

  const blocks = await prisma.timeBlock.findMany({
    where,
    orderBy: { startAt: "asc" },
    include: staffRole
      ? undefined
      : {
          staffUser: { select: { id: true, fullName: true, email: true } },
        },
  });

  return NextResponse.json({ blocks });
}

export async function POST(req: Request) {
  const access = await requireBusinessStaff();
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

  const startAt = new Date(parsed.data.startAt);
  const endAt = new Date(parsed.data.endAt);
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  let staffUserId: string | null = null;
  if (access.session.user.role === "STAFF") {
    staffUserId = access.session.user.id;
  } else if (parsed.data.staffUserId) {
    const u = await prisma.user.findFirst({
      where: {
        id: parsed.data.staffUserId,
        businessId: access.businessId,
        role: "STAFF",
      },
    });
    if (!u) {
      return NextResponse.json({ error: "Staff user not found" }, { status: 404 });
    }
    staffUserId = u.id;
  } else {
    const admin = await requireBusinessAdmin();
    if (!admin.ok) {
      return NextResponse.json({ error: "Only admins can create business-wide blocks" }, { status: 403 });
    }
    staffUserId = null;
  }

  const block = await prisma.timeBlock.create({
    data: {
      businessId: access.businessId,
      staffUserId,
      startAt,
      endAt,
      reason: parsed.data.reason?.trim() || null,
    },
  });

  return NextResponse.json({ block }, { status: 201 });
}
