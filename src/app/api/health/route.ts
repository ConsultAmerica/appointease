import { NextResponse } from "next/server";
import { resolveChatMode, openaiConfigured } from "@/lib/chat-mode";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Lightweight status for UI and ops. Does not expose secrets — only whether OpenAI is configured.
 */
export async function GET() {
  const chatMode = resolveChatMode();

  let database: "up" | "down" = "down";
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = "up";
  } catch {
    database = "down";
  }

  const ok = database === "up";
  const resetDemoAvailable =
    process.env.NODE_ENV === "development" || process.env.ALLOW_ADMIN_DEMO_RESET === "true";
  return NextResponse.json(
    {
      ok,
      database,
      openaiConfigured: openaiConfigured(),
      chatMode,
      resetDemoAvailable,
      /** For client UI: hide technical admin banners in production screenshots. */
      isDevelopment: process.env.NODE_ENV === "development",
    },
    { status: ok ? 200 : 503 },
  );
}
