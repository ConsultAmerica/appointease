"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { DemoChatModeBlurb } from "@/components/demo-chat-mode-blurb";

type Health = {
  database?: string;
  openaiConfigured?: boolean;
  chatMode?: "live" | "demo" | "off";
  resetDemoAvailable?: boolean;
  isDevelopment?: boolean;
};

/**
 * Setup hints from `/api/health`: Postgres (core app) and AI chat (live vs demo vs off).
 */
export function DatabaseAlert() {
  const pathname = usePathname() ?? "";
  const isAdminRoute = pathname.startsWith("/admin");
  const [health, setHealth] = useState<Health | null>(null);
  const [devDetailsOpen, setDevDetailsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const r = await fetch("/api/health", { cache: "no-store", credentials: "same-origin" });
        const j = (await r.json().catch(() => ({}))) as Health;
        if (!cancelled) setHealth(j);
      } catch {
        if (!cancelled) setHealth({ database: "down", openaiConfigured: false, chatMode: "off" });
      }
    }
    void check();
    const id = window.setInterval(() => void check(), 45_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const dbDown = health?.database !== "up";
  const chatMode = health?.chatMode ?? "off";
  const showProdOpenAiHint = health?.database === "up" && chatMode === "off";
  const showDemoChatHint = health?.database === "up" && chatMode === "demo";
  const isDevelopment = health?.isDevelopment ?? false;
  /** Demo notice on admin routes only (portfolio-friendly copy in production). */
  const showAdminDemoStatus = showDemoChatHint && isAdminRoute;

  if (!dbDown && !showProdOpenAiHint && !showAdminDemoStatus) return null;

  return (
    <div className="space-y-0" role="region" aria-label="Environment setup">
      {dbDown ? (
        <div className="border-b border-amber-400 bg-amber-50 px-4 py-3 text-center text-sm leading-relaxed text-amber-950" role="alert">
          <strong className="font-semibold">Database unreachable.</strong> You will see &quot;Could not load booking
          options&quot; and sign-in / create account will fail until PostgreSQL is running. Set{" "}
          <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">DATABASE_URL</code> in{" "}
          <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">.env</code> (see{" "}
          <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">.env.example</code>). Quick start: in{" "}
          <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">appointease</code> run{" "}
          <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">npm run db:up</code>, then{" "}
          <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">npm run db:migrate</code> and{" "}
          <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">npm run db:seed</code>, then restart{" "}
          <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">npm run dev</code>.
        </div>
      ) : null}
      {showAdminDemoStatus ? (
        <div className="border-b border-slate-200 bg-slate-50/95" role="status">
          <div className="mx-auto max-w-6xl px-4 py-1.5 text-xs leading-snug text-slate-700 sm:text-[13px]">
            {isDevelopment ? (
              <div className="flex flex-col gap-2 rounded-md border border-slate-200/80 bg-white/90 px-3 py-2 shadow-sm">
                <p>
                  <span className="font-medium text-slate-800">Demo mode:</span> AI chat uses sample responses for
                  preview.{" "}
                  <button
                    type="button"
                    onClick={() => setDevDetailsOpen((v) => !v)}
                    className="font-semibold text-teal-800 underline decoration-teal-800/30 underline-offset-2 hover:text-teal-950"
                  >
                    {devDetailsOpen ? "Hide developer details" : "Developer details"}
                  </button>
                </p>
                {devDetailsOpen ? (
                  <div className="border-t border-slate-100 pt-2 text-[11px] text-slate-800 sm:text-xs">
                    <DemoChatModeBlurb tone="admin" />
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="rounded-md border border-slate-200/80 bg-white/90 px-3 py-2 text-center shadow-sm">
                <span className="font-medium text-slate-800">Demo mode:</span> AI chat uses sample responses for
                preview. Bookings and admin data still use your database.
              </p>
            )}
          </div>
        </div>
      ) : null}
      {showProdOpenAiHint ? (
        <div className="border-b border-sky-300 bg-sky-50 px-4 py-3 text-center text-sm leading-relaxed text-sky-950">
          <strong className="font-semibold">AI chat is off in production</strong> (no <code className="rounded bg-sky-100 px-1 py-0.5 text-xs">OPENAI_API_KEY</code> and{" "}
          <code className="rounded bg-sky-100 px-1 py-0.5 text-xs">ALLOW_DEMO_AGENT</code> is not set). Set the key
          or, for a private demo only, set <code className="rounded bg-sky-100 px-1 py-0.5 text-xs">ALLOW_DEMO_AGENT=true</code>.{" "}
          <a href="/book" className="font-medium text-sky-900 underline underline-offset-2">
            /book
          </a>{" "}
          works without OpenAI.
        </div>
      ) : null}
    </div>
  );
}
