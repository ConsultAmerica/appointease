import { NextResponse } from "next/server";
import { requireBusinessAdmin } from "@/lib/business-access";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const access = await requireBusinessAdmin();
  if (!access.ok) {
    return NextResponse.json({ error: access.message }, { status: access.status });
  }

  const { searchParams } = new URL(req.url);
  const take = Math.min(Number(searchParams.get("limit")) || 50, 100);

  const logs = await prisma.agentConversationLog.findMany({
    where: { businessId: access.businessId },
    orderBy: { createdAt: "desc" },
    take,
  });

  return NextResponse.json({
    conversations: logs.map((l) => ({
      id: l.id,
      customerEmail: l.customerEmail,
      userId: l.userId,
      messages: l.messages,
      reply: l.reply,
      createdAt: l.createdAt.toISOString(),
    })),
  });
}
