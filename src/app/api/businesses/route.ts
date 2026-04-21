import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const businesses = await prisma.business.findMany({
      include: {
        services: {
          where: { isActive: true },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ businesses });
  } catch (err) {
    console.error("[api/businesses] Database error — is DATABASE_URL correct and Postgres running?", err);
    return NextResponse.json(
      {
        error: "Could not load businesses from the database.",
        businesses: [],
      },
      { status: 503 },
    );
  }
}
