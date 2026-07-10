"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { SectionBackground } from "@/components/section-background";

const PRODUCT = "AppointmentAI";

import {
  computeClientDemoReply,
  initialClientDemoBookingState,
  portfolioSlotIndexFromSelectedSlot,
  type ClientDemoBookingState,
} from "@/lib/client-demo-booking";

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const c = new AbortController();
  const tid = window.setTimeout(() => c.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: c.signal });
  } finally {
    window.clearTimeout(tid);
  }
}

type Role = "user" | "assistant";

type ChatMessage = {
  role: Role;
  content: string;
};

type ChatMode = "live" | "demo" | "off";

const QUICK_PROMPTS = [
  "Book an appointment",
  "Book a wellness consultation tomorrow afternoon",
  "Show available services",
  "Show my appointments",
  "Reschedule an appointment",
  "Cancel an appointment",
] as const;

/** Full agent: tools + OpenAI. Shown until /api/health resolves, then swapped if demo/off. */
const ASSISTANT_INTRO_LIVE =
  "Hi — I can help you book, reschedule, or cancel an appointment. Tell me what service you need and when you are available. I'll check real openings and confirm with you before booking.";

/** Same tone as live; demo vs tools is explained in the page header, not repeated here. */
const ASSISTANT_INTRO_DEMO =
  "Hi — I can help you book, reschedule, or cancel an appointment. Tell me what you need and when you’re available, and I’ll walk you through the next steps.";

const ASSISTANT_INTRO_OFF =
  "Hi — **AI chat is off** on this deployment (no OpenAI key, and demo chat isn't enabled). Use **/book** for step-by-step booking with your database, or ask the operator to configure the agent.";

/** Demo-neutral: avoids “live availability” while live mode explains tools in the header. */
const SAMPLE_TURNS = [
  { role: "assistant" as const, content: "Hi — what would you like to book?" },
  { role: "user" as const, content: "I'd like a wellness consultation tomorrow afternoon." },
  {
    role: "assistant" as const,
    content: "Sure — do you prefer a specific staff member, or the earliest open time?",
  },
];

/** Optional: set in .env for portfolio screenshots (masks real customer email on /chat only). */
const CHAT_DEMO_EMAIL = process.env.NEXT_PUBLIC_CHAT_DEMO_EMAIL?.trim();

const TOP_VALUE_COPY =
  "Book, reschedule, or cancel appointments using natural language. The assistant checks staff availability, prevents double-booking, and confirms with you before saving anything to the calendar.";

/** Reject meaningless clinic titles (e.g. accidental two-letter names like "nz" in the database). */
function sanitizeChatBusinessName(name: string | null | undefined): string | null {
  const t = (name ?? "").trim();
  if (!t) return null;
  if (t.length < 3) return null;
  return t;
}

function SampleConversation() {
  return (
    <div className="mb-2 w-full rounded-xl border border-dashed border-slate-200 bg-slate-50/90 px-3 py-2.5 sm:px-4">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Try an example</p>
      <div className="space-y-1.5">
        {SAMPLE_TURNS.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[75%] rounded-lg rounded-br-sm bg-[color:var(--btn-primary)] px-2.5 py-1.5 text-[11px] leading-snug text-white"
                : "mr-auto max-w-[75%] rounded-lg rounded-bl-sm border border-slate-200 bg-surface px-2.5 py-1.5 text-[11px] leading-snug text-slate-700"
            }
          >
            <span className={m.role === "user" ? "font-semibold text-blue-100" : "font-semibold text-slate-500"}>
              {m.role === "user" ? "You" : "AI"} ·{" "}
            </span>
            <span className="whitespace-pre-wrap">{m.content}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { data: session, status } = useSession();
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [chatMode, setChatMode] = useState<ChatMode | null>(null);
  /** Client-only scripted wellness demo in `chatMode === "demo"` (no API round-trip for this flow). */
  const [demoBookingState, setDemoBookingState] = useState<ClientDemoBookingState>(initialClientDemoBookingState);

  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", content: ASSISTANT_INTRO_LIVE }]);
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const sendingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  /** Warm CSRF cookie before first Send (avoids rare race where POST runs before cookie is stored). */
  useEffect(() => {
    void fetch("/api/app/csrf", { credentials: "include", cache: "no-store" }).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/health", { cache: "no-store", credentials: "same-origin" })
      .then((r) => r.json().catch(() => ({})))
      .then((h: { chatMode?: string }) => {
        if (cancelled) return;
        const m = h.chatMode;
        if (m === "live" || m === "demo" || m === "off") setChatMode(m);
        else setChatMode("live");
      })
      .catch(() => {
        if (!cancelled) setChatMode("live");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Align first bubble with live vs demo vs off once /api/health resolves (skip if user already messaged). */
  useEffect(() => {
    if (chatMode === null) return;
    const intro =
      chatMode === "demo" ? ASSISTANT_INTRO_DEMO : chatMode === "off" ? ASSISTANT_INTRO_OFF : ASSISTANT_INTRO_LIVE;
    setMessages((prev) => {
      if (prev.length !== 1 || prev[0].role !== "assistant") return prev;
      if (prev[0].content === intro) return prev;
      return [{ role: "assistant", content: intro }];
    });
  }, [chatMode]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/businesses", { credentials: "include", cache: "no-store" })
      .then((res) => res.json())
      .then(
        (data: {
          businesses?: { id: string; name: string }[];
          myBusiness?: { id: string; name: string } | null;
        }) => {
          if (cancelled) return;
          const list = Array.isArray(data.businesses) ? data.businesses : [];
          const bid = session?.user?.businessId ?? null;
          const resolved =
            data.myBusiness?.name ??
            (bid ? list.find((b) => b.id === bid)?.name : undefined) ??
            list[0]?.name ??
            null;
          setBusinessName(resolved);
        },
      )
      .catch(() => {
        if (!cancelled) setBusinessName(null);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user?.businessId, session?.user?.id]);

  useEffect(() => {
    if (chatMode !== "demo") setDemoBookingState(initialClientDemoBookingState);
  }, [chatMode]);

  useEffect(() => {
    if (status === "unauthenticated") setDemoBookingState(initialClientDemoBookingState);
  }, [status]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const runSend = useCallback(
    async (userText: string) => {
      const trimmed = userText.trim();
      if (!trimmed || sendingRef.current) return;

      sendingRef.current = true;
      setError(null);

      try {
        if (chatMode === "demo") {
          const firstName = session?.user?.name?.trim().split(/\s+/)[0] ?? "there";
          const local = computeClientDemoReply(trimmed, demoBookingState, firstName);
          if (local) {
            setDemoBookingState(local.next);
            const assistantContent = local.reply;
            // Demo mode: keep the assistant reply as simulated confirmation only (no calendar-save footers in chat).
            if (local.next.step === "booked" && local.next.lastFlow === "booking") {
              const slotIdx = portfolioSlotIndexFromSelectedSlot(local.next.selectedSlot);
              const u = session?.user;
              if (u?.role === "CUSTOMER" && u.businessId && u.email && slotIdx !== null) {
                try {
                  const csrfRes = await fetchWithTimeout("/api/app/csrf", { credentials: "include", cache: "no-store" }, 15_000);
                  const csrfJson = (await csrfRes.json().catch(() => ({}))) as { csrfToken?: string };
                  if (csrfJson?.csrfToken) {
                    await fetchWithTimeout(
                      "/api/demo/portfolio-book",
                      {
                        method: "POST",
                        credentials: "include",
                        headers: {
                          "Content-Type": "application/json",
                          "x-csrf-token": csrfJson.csrfToken,
                        },
                        body: JSON.stringify({
                          slotIndex: slotIdx,
                          serviceName: local.next.selectedService ?? undefined,
                        }),
                      },
                      45_000,
                    );
                  }
                } catch {
                  /* best-effort; chat copy stays simulated */
                }
              }
            }
            setMessages((prev) => [...prev, { role: "user", content: trimmed }, { role: "assistant", content: assistantContent }]);
            return;
          }
        }

        setLoading(true);
        const nextMessages: ChatMessage[] = [...messagesRef.current, { role: "user", content: trimmed }];
        setMessages(nextMessages);

        try {
          const csrfRes = await fetchWithTimeout("/api/app/csrf", { credentials: "include", cache: "no-store" }, 15_000);
          const csrfJson = (await csrfRes.json().catch(() => ({}))) as { csrfToken?: string };
          if (!csrfJson?.csrfToken) {
            setError(
              csrfRes.ok
                ? "Could not load security token. Refresh the page."
                : `Security token request failed (HTTP ${csrfRes.status}). Refresh and try again.`,
            );
            return;
          }

          const res = await fetchWithTimeout(
            "/api/agent/chat",
            {
              method: "POST",
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
                "x-csrf-token": csrfJson.csrfToken,
              },
              body: JSON.stringify({ messages: nextMessages }),
            },
            120_000,
          );

          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
            details?: string;
            reply?: string;
            demoMode?: boolean;
          };
          if (!res.ok) {
            const base = typeof data.error === "string" ? data.error : "Request failed";
            const extra = typeof data.details === "string" && data.details.trim() ? ` ${data.details.trim()}` : "";
            setError(`${base}${extra}`.trim());
            return;
          }

          const reply = typeof data.reply === "string" ? data.reply : "";
          setMessages((prev) => [...prev, { role: "assistant", content: reply || "(No reply)" }]);
        } catch (err) {
          const aborted = err instanceof Error && err.name === "AbortError";
          setError(aborted ? "Request timed out. Check your connection or try again in a moment." : "Network error. Try again.");
        } finally {
          setLoading(false);
        }
      } finally {
        sendingRef.current = false;
      }
    },
    [
      chatMode,
      demoBookingState,
      session?.user?.name,
      session?.user?.id,
      session?.user?.role,
      session?.user?.businessId,
      session?.user?.email,
      status,
    ],
  );

  const send = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault();
      const text = input.trim();
      if (!text || sendingRef.current) return;
      setInput("");
      await runSend(text);
    },
    [input, runSend],
  );

  const displayBusiness = sanitizeChatBusinessName(businessName) ?? "Demo Wellness Clinic";
  /** Taller cap once the thread grows; keeps the first screen compact. */
  const scrollMaxClass =
    messages.length + (loading ? 1 : 0) > 3 ? "max-h-[min(42vh,380px)]" : "max-h-[min(22vh,200px)]";

  return (
    <SectionBackground variant="clinic" as="main" className="pb-12">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--btn-secondary)]">{PRODUCT}</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">AI Booking Assistant</h1>
          <p className="mt-1.5 text-lg font-medium text-slate-700 sm:text-xl">{displayBusiness}</p>
          {chatMode === "off" ? (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
              AI chat is off here (no OpenAI key in production). Use{" "}
              <Link href="/book" className="font-medium text-[color:var(--btn-secondary)] underline-offset-2 hover:underline">
                /book
              </Link>{" "}
              for database-backed booking, or ask your administrator to enable the agent.
            </p>
          ) : (
            <>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">{TOP_VALUE_COPY}</p>
              {chatMode === "demo" ? (
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                  AI chat is currently running in <strong className="font-semibold text-slate-800">demo mode</strong>.
                  You can still test the booking flow below.
                </p>
              ) : chatMode === null ? (
                <p className="mt-2 text-sm text-slate-500">Checking chat configuration…</p>
              ) : null}
            </>
          )}
          {status === "authenticated" && session?.user?.role === "CUSTOMER" ? (
            <p className="mt-3 text-sm text-slate-600">
              Signed in as{" "}
              <span className="font-medium text-slate-800">{CHAT_DEMO_EMAIL || session.user.email}</span>.
            </p>
          ) : (
            <div className="relative z-10 mt-4 flex flex-wrap items-center gap-3">
              <p className="text-sm text-slate-600">Already booked? Sign in to manage your appointments.</p>
              <a
                href="/auth/login"
                className="inline-flex shrink-0 items-center rounded-lg border border-[color:var(--btn-secondary)] bg-blue-50 px-3 py-1.5 text-sm font-semibold text-[color:var(--btn-secondary)] transition hover:bg-blue-100"
              >
                Sign in
              </a>
            </div>
          )}
          <p className="mt-3 text-sm text-slate-600">
            Prefer a form? Use the{" "}
            <Link href="/book" className="font-medium text-[color:var(--btn-secondary)] underline-offset-2 hover:underline">
              step-by-step booking
            </Link>{" "}
            flow.
          </p>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((q) => (
            <button
              key={q}
              type="button"
              disabled={loading}
              onClick={() => void runSend(q)}
              className="max-w-full rounded-full border border-slate-200 bg-surface px-3 py-1.5 text-left text-xs font-medium text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50 sm:max-w-[min(100%,20rem)]"
            >
              {q}
            </button>
          ))}
        </div>

        <SampleConversation />

        <div className="mt-8 flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-surface shadow-sm">
          {error ? (
            <div
              className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
              role="alert"
              aria-live="assertive"
            >
              {error}
            </div>
          ) : null}

          <div
            className={`${scrollMaxClass} space-y-3 overflow-y-auto px-4 pb-3 pt-4 sm:px-6 sm:pt-5`}
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "ml-auto max-w-[75%] rounded-2xl bg-[color:var(--btn-primary)] px-4 py-3 text-sm text-white"
                    : "mr-auto max-w-[75%] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800"
                }
              >
                <p className="break-words whitespace-pre-wrap">{m.content}</p>
              </div>
            ))}
            {loading ? (
              <div className="mr-auto max-w-[75%] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                {chatMode === "demo" ? "Writing demo reply…" : "Checking calendar and tools…"}
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={send} className="border-t border-slate-200 p-3 sm:p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder='Try: "Book a wellness consultation tomorrow afternoon"'
                className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none ring-blue-600/20 placeholder:text-slate-400 focus:border-[color:var(--btn-primary)] focus:ring-2"
                disabled={loading}
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="pro-btn-primary shrink-0 px-4 py-2.5 text-sm disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      </div>
    </SectionBackground>
  );
}
