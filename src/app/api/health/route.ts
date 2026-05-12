import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Lightweight status for UI and ops. Does not expose secrets — only whether OpenAI is configured.
 */
export async function GET() {
  const openaiConfigured = Boolean(process.env.OPENAI_API_KEY?.trim());
  const isProd = process.env.NODE_ENV === "production";
  const allowDemoFlag = process.env.ALLOW_DEMO_AGENT === "true";
  /** live = OpenAI; demo = scripted replies (dev or ALLOW_DEMO_AGENT); off = no chat without key in prod */
  const chatMode: "live" | "demo" | "off" = openaiConfigured
    ? "live"
    : !isProd || allowDemoFlag
      ? "demo"
      : "off";

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
      openaiConfigured,
      chatMode,
      resetDemoAvailable,
      /** For client UI: hide technical admin banners in production screenshots. */
      isDevelopment: process.env.NODE_ENV === "development",
    },
    { status: ok ? 200 : 503 },
  );
}
