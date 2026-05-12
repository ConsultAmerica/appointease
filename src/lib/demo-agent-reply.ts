import {
  DEMO_NZ_SERVICES_REPLY,
  DEMO_NZ_UPCOMING_WITH_SAMPLES,
  matchesDemoServicesQuery,
  matchesDemoUpcomingAppointmentsQuery,
} from "@/lib/demo-sample-copy";
import type { AgentBookingContext } from "@/lib/scheduling-agent";

function firstName(ctx: AgentBookingContext) {
  const n = ctx.customerName?.trim();
  if (n) return n.split(/\s+/)[0] ?? n;
  if (ctx.customerEmail) return ctx.customerEmail.split("@")[0] ?? "there";
  return "there";
}

function isSignedInCustomer(ctx: AgentBookingContext) {
  return ctx.userRole === "CUSTOMER" && Boolean(ctx.customerEmail?.trim());
}

/**
 * Customer-friendly scripted replies when `OPENAI_API_KEY` is unset (no OpenAI).
 * Technical / env details belong in the admin developer panel only.
 */
export function buildDemoAgentReply(lastUserText: string, ctx: AgentBookingContext): string {
  const t = lastUserText.toLowerCase();
  const who = firstName(ctx);

  if (matchesDemoServicesQuery(t)) {
    return DEMO_NZ_SERVICES_REPLY;
  }

  if (t.includes("cancel") || t.includes("reschedule")) {
    if (isSignedInCustomer(ctx)) {
      return `Hi ${who} — tell me which visit you’d like to change (for example your **Friday follow-up** with Dr. Carter), or open **My appointments** from your account menu. I can walk you through reschedule or cancel here.`;
    }
    return `Hi ${who} — sign in with your **customer account** to manage visits online, or call NZ Wellness Clinic and we’ll help with reschedule or cancel.`;
  }

  if (
    matchesDemoUpcomingAppointmentsQuery(t) ||
    (t.includes("appointment") && (t.includes("show") || t.includes("my") || t.includes("upcoming")))
  ) {
    /** Demo sample data; later swap for list_my_appointments / DB. */
    return DEMO_NZ_UPCOMING_WITH_SAMPLES;
  }

  if (
    t.includes("book") ||
    t.includes("haircut") ||
    t.includes("consultation") ||
    t.includes("wellness") ||
    t.includes("massage") ||
    t.includes("facial") ||
    t.includes("tomorrow") ||
    t.includes("afternoon") ||
    t.includes("slot") ||
    t.includes("available")
  ) {
    return `Hi ${who} — I can help you get on the calendar. Tell me what you’d like (for example a **wellness consultation tomorrow afternoon**), and I’ll ask a few short questions to find a time that works. You can also use the **step-by-step booking** page any time.`;
  }

  return `Hi ${who} — I can help you book, reschedule, or answer questions about visits. What would you like to do today?`;
}
