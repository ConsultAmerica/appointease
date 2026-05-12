import { NextResponse } from "next/server";
import { requireBusinessStaff } from "@/lib/business-access";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  const access = await requireBusinessStaff();
  if (!access.ok) {
    return NextResponse.json({ error: access.message }, { status: access.status });
  }

  const { id } = await ctx.params;
  const block = await prisma.timeBlock.findFirst({
    where: { id, businessId: access.businessId },
  });

  if (!block) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (access.session.user.role === "STAFF") {
    if (block.staffUserId !== access.session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (access.session.user.role === "ADMIN") {
    /* admin may delete any block in business */
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.timeBlock.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
