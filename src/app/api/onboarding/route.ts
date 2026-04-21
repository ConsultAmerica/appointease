import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const onboardingSchema = z.object({
  businessName: z.string().min(2),
  ownerName: z.string().min(2),
  ownerEmail: z.string().email(),
  ownerPassword: z.string().min(8),
  timezone: z.string().min(2).default("UTC"),
  services: z
    .array(
      z.object({
        name: z.string().min(2),
        durationMinutes: z.number().int().positive(),
        priceCents: z.number().int().nonnegative().default(0),
      }),
    )
    .min(1),
  availability: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        startMinute: z.number().int().min(0).max(1439),
        endMinute: z.number().int().min(1).max(1440),
      }),
    )
    .min(1),
});

export async function POST(req: Request) {
  try {
    const parsed = onboardingSchema.parse(await req.json());
    const passwordHash = await bcrypt.hash(parsed.ownerPassword, 12);

    const business = await prisma.business.create({
      data: {
        name: parsed.businessName,
        timezone: parsed.timezone,
        users: {
          create: {
            fullName: parsed.ownerName,
            email: parsed.ownerEmail,
            passwordHash,
            emailVerifiedAt: new Date(),
            role: "ADMIN",
          },
        },
        services: {
          create: parsed.services,
        },
        availability: {
          create: parsed.availability,
        },
      },
      include: {
        services: true,
      },
    });

    return NextResponse.json({ businessId: business.id, services: business.services }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create business", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}
