import type { Session } from "next-auth";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { describeDatabaseLoadFailure } from "@/lib/prisma-errors";
import { prisma } from "@/lib/prisma";
import { withTimeout } from "@/lib/with-timeout";

/** Prevent this handler from waiting forever when DB is misconfigured / unreachable (TCP hangs). */
const DB_QUERY_MS = 12_000;

export const dynamic = "force-dynamic";

export async function GET() {
  let session: Session | null = null;
  try {
    session = await auth();
  } catch (authErr) {
    console.error("[api/businesses] auth() failed", authErr);
    return NextResponse.json(
      { error: "Session check failed. Try refreshing the page or signing in again.", businesses: [] },
      { status: 500 },
    );
  }

  try {
    const businesses = await withTimeout(
      prisma.business.findMany({
        include: {
          services: {
            where: { isActive: true },
            orderBy: { name: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      DB_QUERY_MS,
      "DATABASE_QUERY_TIMEOUT",
    );

    /** Exact clinic for the signed-in user (avoids wrong `list[0]` when find misses the first page). */
    let myBusiness: { id: string; name: string } | null = null;
    const bid = session?.user?.businessId;
    if (bid) {
      try {
        const row = await withTimeout(
          prisma.business.findUnique({
            where: { id: bid },
            select: { id: true, name: true },
          }),
          DB_QUERY_MS,
          "DATABASE_QUERY_TIMEOUT",
        );
        if (row) myBusiness = row;
      } catch {
        // ignore; list-only response still useful
      }
    }

    return NextResponse.json({ businesses, myBusiness });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "DATABASE_QUERY_TIMEOUT") {
      console.error(
        "[api/businesses] Database query exceeded timeout — check DATABASE_URL and that Postgres accepts connections.",
      );
      return NextResponse.json(
        {
          error:
            "Could not reach the database in time. Try again shortly. If this keeps happening, confirm DATABASE_URL for this deployment and that your database accepts connections (SSL, allowlists, or paused free tiers).",
          businesses: [],
        },
        { status: 503 },
      );
    }
    console.error("[api/businesses] Database error", err);
    return NextResponse.json(
      {
        error: describeDatabaseLoadFailure(err),
        businesses: [],
      },
      { status: 503 },
    );
  }
}
