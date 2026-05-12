import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logAuthEvent } from "@/lib/auth-audit";
import { verificationEmailHtml } from "@/lib/email-templates";
import { sendEmail } from "@/lib/email";
import { CANONICAL_DEMO_SERVICES } from "@/lib/canonical-demo-catalog";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, csrfError, verifyCsrf } from "@/lib/security";
import { generateRawToken, hashToken } from "@/lib/tokens";

const registerSchema = z
  .object({
    fullName: z.string().min(2),
    email: z.preprocess(
      (val) => (typeof val === "string" ? val.trim().toLowerCase() : val),
      z.string().email(),
    ),
    password: z.string().min(8),
    role: z.enum(["ADMIN", "CUSTOMER"]),
    businessId: z.string().optional(),
    businessName: z.string().optional(),
    timezone: z.string().default("UTC"),
  })
  .superRefine((data, ctx) => {
    if (data.role === "ADMIN" && !data.businessName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "businessName is required for ADMIN registration",
      });
    }
    if (data.role === "CUSTOMER" && !data.businessId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "businessId is required for CUSTOMER registration",
      });
    }
  });

export async function POST(req: Request) {
  try {
    if (!(await verifyCsrf(req))) {
      return csrfError();
    }
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    const userAgent = req.headers.get("user-agent");
    if (!(await checkRateLimit(`register:${ip}`, 10, 15 * 60 * 1000))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const raw = await req.json();
    const parsed = registerSchema.safeParse(raw);
    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => issue.message).join(" ");
      return NextResponse.json({ error: "Invalid input", details }, { status: 400 });
    }

    const input = parsed.data;
    const passwordHash = await bcrypt.hash(input.password, 12);

    const existing = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    if (input.role === "ADMIN") {
      const verificationTokenRaw = generateRawToken();
      const business = await prisma.business.create({
        data: {
          name: input.businessName!,
          timezone: input.timezone,
          users: {
            create: {
              fullName: input.fullName,
              email: input.email,
              passwordHash,
              emailVerifiedAt: new Date(),
              role: "ADMIN",
              verificationTokens: {
                create: {
                  tokenHash: hashToken(verificationTokenRaw),
                  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                },
              },
            },
          },
          services: {
            create: CANONICAL_DEMO_SERVICES.map((s) => ({ ...s })),
          },
          availability: {
            create: [
              { dayOfWeek: 0, startMinute: 9 * 60, endMinute: 17 * 60 },
              { dayOfWeek: 1, startMinute: 9 * 60, endMinute: 17 * 60 },
              { dayOfWeek: 2, startMinute: 9 * 60, endMinute: 17 * 60 },
              { dayOfWeek: 3, startMinute: 9 * 60, endMinute: 17 * 60 },
              { dayOfWeek: 4, startMinute: 9 * 60, endMinute: 17 * 60 },
              { dayOfWeek: 5, startMinute: 9 * 60, endMinute: 17 * 60 },
              { dayOfWeek: 6, startMinute: 9 * 60, endMinute: 17 * 60 },
            ],
          },
        },
        include: { users: true },
      });

      const adminUser = business.users[0];
      await logAuthEvent({
        event: "REGISTER",
        userId: adminUser.id,
        email: input.email,
        ip,
        userAgent,
        metadata: { role: "ADMIN", businessId: business.id },
      });

      try {
        await sendEmail({
          to: input.email,
          subject: "Verify your AppointmentAI email",
          html: verificationEmailHtml({
            appUrl,
            verifyToken: verificationTokenRaw,
            recipientName: input.fullName,
          }),
        });
      } catch (emailErr) {
        console.error("[register] ADMIN verification email failed (account was still created)", emailErr);
      }

      return NextResponse.json({ ok: true, businessId: business.id }, { status: 201 });
    }

    const business = await prisma.business.findUnique({
      where: { id: input.businessId! },
      select: { id: true },
    });
    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const verificationTokenRaw = generateRawToken();
    const user = await prisma.user.create({
      data: {
        fullName: input.fullName,
        email: input.email,
        passwordHash,
        emailVerifiedAt: new Date(),
        role: "CUSTOMER",
        businessId: input.businessId!,
        verificationTokens: {
          create: {
            tokenHash: hashToken(verificationTokenRaw),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        },
      },
    });

    await logAuthEvent({
      event: "REGISTER",
      userId: user.id,
      email: input.email,
      ip,
      userAgent,
      metadata: { role: "CUSTOMER", businessId: input.businessId },
    });

    try {
      await sendEmail({
        to: input.email,
        subject: "Verify your AppointmentAI email",
        html: verificationEmailHtml({
          appUrl,
          verifyToken: verificationTokenRaw,
          recipientName: input.fullName,
        }),
      });
    } catch (emailErr) {
      console.error("[register] CUSTOMER verification email failed (account was still created)", emailErr);
    }

    return NextResponse.json({ ok: true, userId: user.id }, { status: 201 });
  } catch (error) {
    console.error("[register] Registration error", error);
    return NextResponse.json(
      { error: "Registration failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}
