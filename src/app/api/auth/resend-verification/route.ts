import { NextResponse } from "next/server";
import { z } from "zod";
import { logAuthEvent } from "@/lib/auth-audit";
import { resendVerificationEmailHtml } from "@/lib/email-templates";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, csrfError, verifyCsrf } from "@/lib/security";
import { generateRawToken, hashToken } from "@/lib/tokens";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  if (!(await verifyCsrf(req))) return csrfError();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const userAgent = req.headers.get("user-agent");
  if (!(await checkRateLimit(`resend-verification:${ip}`, 5, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const parsed = schema.parse(await req.json());
    const user = await prisma.user.findUnique({
      where: { email: parsed.email },
      select: { id: true, email: true, fullName: true, emailVerifiedAt: true },
    });

    if (user?.emailVerifiedAt) {
      return NextResponse.json({ ok: true });
    }

    if (user && !user.emailVerifiedAt) {
      await prisma.verificationToken.deleteMany({
        where: { userId: user.id, usedAt: null },
      });

      const verificationTokenRaw = generateRawToken();
      await prisma.verificationToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(verificationTokenRaw),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      await sendEmail({
        to: user.email,
        subject: "Verify your AppointmentAI email",
        html: resendVerificationEmailHtml({
          appUrl,
          verifyToken: verificationTokenRaw,
          recipientName: user.fullName,
        }),
      });

      await logAuthEvent({
        event: "RESEND_VERIFICATION",
        userId: user.id,
        email: user.email,
        ip,
        userAgent,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Request failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}
