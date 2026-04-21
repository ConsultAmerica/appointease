import { NextResponse } from "next/server";
import { z } from "zod";
import { logAuthEvent } from "@/lib/auth-audit";
import { requireSignedEmailLinks, signingSecretConfigured, verifyUrlTokenSignature } from "@/lib/link-signing";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, csrfError, verifyCsrf } from "@/lib/security";
import { hashToken } from "@/lib/tokens";

const schema = z.object({
  token: z.string().min(20),
  sig: z.string().optional(),
});

export async function POST(req: Request) {
  if (!(await verifyCsrf(req))) return csrfError();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const userAgent = req.headers.get("user-agent");
  if (!(await checkRateLimit(`verify-email:${ip}`, 20, 15 * 60 * 1000))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const parsed = schema.parse(await req.json());
    const tokenHash = hashToken(parsed.token);

    const hasSecret = signingSecretConfigured();
    if (hasSecret && requireSignedEmailLinks() && !parsed.sig) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }
    if (parsed.sig && hasSecret && !verifyUrlTokenSignature(parsed.token, parsed.sig)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const token = await prisma.verificationToken.findUnique({
      where: { tokenHash },
    });

    if (!token || token.usedAt || token.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: token.userId },
        data: { emailVerifiedAt: new Date() },
      }),
      prisma.verificationToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() },
      }),
    ]);

    const user = await prisma.user.findUnique({
      where: { id: token.userId },
      select: { email: true },
    });

    await logAuthEvent({
      event: "EMAIL_VERIFIED",
      userId: token.userId,
      email: user?.email,
      ip,
      userAgent,
      metadata: { result: "success" },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Email verification failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}
