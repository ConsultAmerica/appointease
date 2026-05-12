import { run } from "@openai/agents";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { buildDemoAgentReply } from "@/lib/demo-agent-reply";
import { runDemoBookingFlow } from "@/lib/demo-booking-flow";
import type { AgentBookingContext } from "@/lib/scheduling-agent";
import { chatMessagesToAgentInput, createSchedulingAgent } from "@/lib/scheduling-agent";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, csrfError, verifyCsrf } from "@/lib/security";

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .min(1),
});

function openaiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

/** Demo replies without OpenAI: dev by default, or production when ALLOW_DEMO_AGENT=true */
function useDemoAgentInsteadOfOpenAI() {
  if (openaiConfigured()) return false;
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.ALLOW_DEMO_AGENT === "true";
}

export async function POST(req: Request) {
  if (!(await verifyCsrf(req))) {
    return csrfError();
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!(await checkRateLimit(`agent-chat:${ip}`, 40, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  const sessionEarly = await auth();
  if (sessionEarly?.user?.email) {
    if (!(await checkRateLimit(`agent-chat:${sessionEarly.user.email}`, 60, 60 * 60 * 1000))) {
      return NextResponse.json({ error: "Too many requests for this account." }, { status: 429 });
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const context: AgentBookingContext = {
    customerEmail: sessionEarly?.user?.email ?? null,
    customerName: sessionEarly?.user?.name ?? null,
    userRole: sessionEarly?.user?.role ?? null,
    businessId: sessionEarly?.user?.businessId ?? null,
  };

  if (!openaiConfigured() && !useDemoAgentInsteadOfOpenAI()) {
    return NextResponse.json(
      {
        error: "AI chat is not configured.",
        details:
          "Set OPENAI_API_KEY on the server, or set ALLOW_DEMO_AGENT=true for scripted demo replies without OpenAI (not recommended for public production).",
      },
      { status: 503 },
    );
  }

  if (useDemoAgentInsteadOfOpenAI()) {
    const scripted = await runDemoBookingFlow(parsed.data.messages, context);
    if (scripted !== null) {
      try {
        await prisma.agentConversationLog.create({
          data: {
            businessId: sessionEarly?.user?.businessId ?? null,
            userId: sessionEarly?.user?.id ?? null,
            customerEmail: sessionEarly?.user?.email ?? null,
            messages: parsed.data.messages,
            reply: `[demo-booking-flow] ${scripted}`,
          },
        });
      } catch (logErr) {
        console.error("[agent/chat] demo booking log failed", logErr);
      }
      return NextResponse.json({ reply: scripted, demoMode: true });
    }

    const lastUser = [...parsed.data.messages].reverse().find((m) => m.role === "user");
    const reply = buildDemoAgentReply(lastUser?.content ?? "", context);

    try {
      await prisma.agentConversationLog.create({
        data: {
          businessId: sessionEarly?.user?.businessId ?? null,
          userId: sessionEarly?.user?.id ?? null,
          customerEmail: sessionEarly?.user?.email ?? null,
          messages: parsed.data.messages,
          reply: `[demo-agent] ${reply}`,
        },
      });
    } catch (logErr) {
      console.error("[agent/chat] demo log failed", logErr);
    }

    return NextResponse.json({ reply, demoMode: true });
  }

  const input = chatMessagesToAgentInput(parsed.data.messages);
  if (input.length === 0) {
    return NextResponse.json(
      { error: "No valid messages. Send an array of { role: 'user' | 'assistant', content: string }." },
      { status: 400 },
    );
  }

  const agent = createSchedulingAgent();

  try {
    const result = await run(agent, input, {
      context,
      maxTurns: 15,
    });

    const out = result.finalOutput;
    const reply = typeof out === "string" ? out : out != null ? JSON.stringify(out) : "";

    try {
      await prisma.agentConversationLog.create({
        data: {
          businessId: sessionEarly?.user?.businessId ?? null,
          userId: sessionEarly?.user?.id ?? null,
          customerEmail: sessionEarly?.user?.email ?? null,
          messages: parsed.data.messages,
          reply,
        },
      });
    } catch (logErr) {
      console.error("[agent/chat] log failed", logErr);
    }

    return NextResponse.json({ reply, demoMode: false });
  } catch (e) {
    console.error("[agent/chat]", e);
    return NextResponse.json(
      {
        error: "The assistant could not complete this request.",
        details: e instanceof Error ? e.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
