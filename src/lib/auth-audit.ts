import type { AuthEventType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function logAuthEvent(params: {
  event: AuthEventType;
  userId?: string | null;
  email?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  try {
    await prisma.authAuditLog.create({
      data: {
        event: params.event,
        userId: params.userId ?? undefined,
        email: params.email ?? undefined,
        ip: params.ip ?? undefined,
        userAgent: params.userAgent ?? undefined,
        metadata: params.metadata,
      },
    });
  } catch (err) {
    console.error("auth audit log failed", err);
  }
}
