import { NextResponse } from "next/server";
import { z } from "zod";
import { logAuthEvent } from "@/lib/auth-audit";
import { passwordResetEmailHtml } from "@/lib/email-templates";
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
  if (!(await checkRateLimit(`forgot-password:${ip}`, 8, 15 * 60 * 1000))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const parsed = schema.parse(await req.json());
    const user = await prisma.user.findUnique({
      where: { email: parsed.email },
      select: { id: true, email: true },
    });

    if (user) {
      const tokenRaw = generateRawToken();
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(tokenRaw),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      await sendEmail({
        to: user.email,
        subject: "Reset your AppointmentAI password",
        html: passwordResetEmailHtml({ appUrl, resetToken: tokenRaw }),
      });

      await logAuthEvent({
        event: "PASSWORD_RESET_REQUEST",
        userId: user.id,
        email: user.email,
        ip,
        userAgent,
        metadata: { emailSent: true },
      });
    }

    // Avoid email enumeration.
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Request failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}
