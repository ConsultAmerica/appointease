import { addDays, addMinutes, format } from "date-fns";
import type { AgentBookingContext } from "@/lib/scheduling-agent";
import { checkAvailabilityForAgent } from "@/lib/agent-availability";
import { hasBookableIntervalConflict } from "@/lib/appointment-conflicts";
import { bookingRequestReceivedHtml } from "@/lib/email-templates";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { PORTFOLIO_DEMO_SLOT_MESSAGE } from "@/lib/client-demo-booking";
import { staffCanPerformService } from "@/lib/staff-for-service";

type ChatMsg = { role: "user" | "assistant"; content: string };

const STAFF_OR_EARLIEST_Q = "Do you prefer a specific staff member, or the earliest available time?";

const CLARIFY_STAFF_VS_EARLIEST =
  "I can help with that. Do you want me to find the earliest available time, or would you like to choose a specific staff member?";

function displayName(ctx: AgentBookingContext) {
  const n = ctx.customerName?.trim();
  if (n) return n;
  if (ctx.customerEmail) return ctx.customerEmail.split("@")[0] ?? "there";
  return "there";
}

function firstName(full: string) {
  const t = full.trim();
  if (!t) return "there";
  return t.split(/\s+/)[0] ?? t;
}

function isBookingStart(text: string) {
  const t = text.toLowerCase();
  const hasWhen = t.includes("tomorrow") || t.includes("afternoon") || t.includes("morning");
  const hasWhat =
    t.includes("wellness") ||
    t.includes("consultation") ||
    (t.includes("book") && (t.includes("appointment") || t.includes("visit")));
  return hasWhen && hasWhat;
}

function isEarliestChoice(text: string) {
  const t = text.toLowerCase().trim();
  return (
    /\bearliest\b/.test(t) ||
    /\bsoonest\b/.test(t) ||
    /\bno preference\b/.test(t) ||
    /\bany staff\b/.test(t) ||
    /\bwhoever\b/.test(t) ||
    /\bdoesn'?t matter\b/.test(t) ||
    /^earliest open time$/i.test(text.trim())
  );
}

type FlatSlot = { iso: string; staffUserId: string; staffName: string; label: string };

/** Matches the client portfolio demo when `/api/agent/chat` is used without browser state (e.g. guests). */
const PORTFOLIO_STATIC_SLOTS: FlatSlot[] = [
  { iso: "", staffUserId: "portfolio-demo", staffName: "Nurse Amina", label: "1:00 PM" },
  { iso: "", staffUserId: "portfolio-demo", staffName: "Dr. Carter", label: "2:30 PM" },
  { iso: "", staffUserId: "portfolio-demo", staffName: "Nurse Amina", label: "4:15 PM" },
];

function parseSlotChoice(text: string): number | null {
  const t = text.trim();
  let m = t.match(/^\s*([1-3])\s*$/);
  if (m) return Number(m[1]) - 1;
  m = t.match(/option\s*([1-3])/i);
  if (m) return Number(m[1]) - 1;
  return null;
}

/** Match "1", "2:15", "2:15 PM", option 2, etc. against known slots. */
function parseSlotSelection(text: string, slots: FlatSlot[]): number | null {
  const byNum = parseSlotChoice(text);
  if (byNum !== null && slots[byNum]) return byNum;

  const raw = text.trim().toLowerCase();
  for (let i = 0; i < slots.length; i++) {
    const label = slots[i].label.toLowerCase();
    if (raw && (raw === label || label.includes(raw) || raw.includes(label.replace(/\s/g, "")))) {
      return i;
    }
  }
  const hm = text.match(/(\d{1,2}):(\d{2})/);
  if (hm) {
    const frag = `${hm[1]}:${hm[2]}`;
    for (let i = 0; i < slots.length; i++) {
      if (slots[i].label.replace(/\s/g, "").includes(frag)) return i;
    }
  }
  return null;
}

function isConfirm(text: string) {
  const t = text.toLowerCase().trim();
  return /^(yes|confirm|book\s*it|ok|please\s+book)\b/.test(t) || t === "y";
}

function lastAssistantBefore(messages: ChatMsg[], beforeIndex: number): string | null {
  for (let i = beforeIndex - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") return messages[i].content;
  }
  return null;
}

function assistantAskedStaffQuestion(content: string) {
  return content.includes("specific staff member") && content.includes("earliest");
}

function assistantAskedStaffOrFollowUp(content: string) {
  return (
    assistantAskedStaffQuestion(content) ||
    content.includes("earliest available time, or would you like to choose a specific staff member")
  );
}

function assistantOfferedSlotList(content: string) {
  return (
    content.includes("Which one would you like") ||
    content.includes("available times for tomorrow afternoon") ||
    content.includes("available times for a wellness consultation") ||
    content.includes("**Option 1**")
  );
}

function assistantAskedBookingConfirm(content: string) {
  return /please confirm/i.test(content) || (/\bconfirm\b/i.test(content) && /\b(tomorrow|at\s+\d|with\s+)/i.test(content));
}

function isVagueAffirmation(text: string) {
  const t = text.toLowerCase().trim();
  return /^(yes|yeah|yep|yup|sure|ok|okay|please)\.?$/i.test(text.trim()) || t === "y";
}

function flattenEarliestSlots(avail: Awaited<ReturnType<typeof checkAvailabilityForAgent>>): FlatSlot[] {
  if ("error" in avail && avail.error) return [];
  if ("closedDay" in avail && avail.closedDay) return [];
  if (!("byStaff" in avail) || !avail.byStaff?.length) return [];

  const flat: FlatSlot[] = [];
  for (const row of avail.byStaff) {
    for (const sl of row.slots) {
      flat.push({
        iso: sl.iso,
        staffUserId: row.staffId,
        staffName: row.staffName,
        label: sl.label,
      });
    }
  }
  flat.sort((a, b) => a.iso.localeCompare(b.iso));
  return flat.slice(0, 3);
}

async function resolveDemoBookingService(businessId: string, preferredName?: string | null) {
  const norm = preferredName?.trim();
  if (norm) {
    const exact = await prisma.service.findFirst({
      where: { businessId, isActive: true, name: { equals: norm, mode: "insensitive" } },
    });
    if (exact) return exact;
    const partial = await prisma.service.findFirst({
      where: { businessId, isActive: true, name: { contains: norm, mode: "insensitive" } },
      orderBy: { name: "asc" },
    });
    if (partial) return partial;
  }
  const wellness = await prisma.service.findFirst({
    where: { businessId, isActive: true, name: { equals: "Wellness Consultation", mode: "insensitive" } },
  });
  if (wellness) return wellness;
  return prisma.service.findFirst({
    where: { businessId, isActive: true, name: { contains: "consult", mode: "insensitive" } },
    orderBy: { name: "asc" },
  });
}

async function loadTomorrowSlots(businessId: string, serviceId: string) {
  const dateStr = format(addDays(new Date(), 1), "yyyy-MM-dd");
  const avail = await checkAvailabilityForAgent({
    businessId,
    serviceId,
    date: dateStr,
    timePreference: "afternoon",
    maxStaff: 8,
    maxSlotsPerStaff: 4,
  });
  return { dateStr, avail, slots: flattenEarliestSlots(avail) };
}

function formatSlotLineHuman(s: FlatSlot) {
  return `${s.label} with ${s.staffName}`;
}

function customerServicePhrase(serviceName: string) {
  const n = serviceName.trim();
  if (/^wellness consultation$/i.test(n)) return "wellness consultation";
  if (/^stress management session$/i.test(n)) return "stress management session";
  if (/^nutrition check-in$/i.test(n)) return "nutrition check-in";
  if (/^follow-up visit$/i.test(n)) return "follow-up visit";
  if (/^routine check-up$/i.test(n)) return "routine check-up";
  if (/^urgent visit$/i.test(n)) return "urgent visit";
  if (/^consultation$/i.test(n) || /^extended consultation$/i.test(n)) return "wellness consultation";
  return serviceName;
}

async function persistDemoBooking(params: {
  businessId: string;
  serviceId: string;
  slot: FlatSlot;
  customerName: string;
  customerEmail: string;
  createdViaAiChat?: boolean;
}) {
  const { businessId, serviceId, slot, customerName, customerEmail, createdViaAiChat } = params;
  const startAt = new Date(slot.iso);
  if (Number.isNaN(startAt.getTime())) {
    return { error: "Invalid slot time." };
  }

  const okStaff = await staffCanPerformService(slot.staffUserId, serviceId, businessId);
  if (!okStaff) {
    return { error: "That staff member can’t perform this service anymore. Ask for slots again." };
  }

  const service = await prisma.service.findFirst({
    where: { id: serviceId, businessId, isActive: true },
    include: { business: true },
  });
  if (!service) {
    return { error: "Service not found." };
  }

  const endAt = addMinutes(startAt, service.durationMinutes);
  if (await hasBookableIntervalConflict(businessId, startAt, endAt, { staffUserId: slot.staffUserId })) {
    return { error: "That slot was just taken. Run the flow again from “earliest”." };
  }

  const appointment = await prisma.appointment.create({
    data: {
      businessId,
      serviceId,
      customerName,
      customerEmail,
      startAt,
      endAt,
      status: "PENDING",
      assignedStaffUserId: slot.staffUserId,
      createdViaAiChat: Boolean(createdViaAiChat),
    },
    include: { assignedStaff: { select: { fullName: true } } },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const emailResult = await sendEmail({
    to: customerEmail,
    subject: `Booking request — ${service.business.name}`,
    html: bookingRequestReceivedHtml({
      businessName: service.business.name,
      serviceName: service.name,
      customerName,
      startAtLabel: startAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }),
      appUrl,
    }),
  });

  await prisma.notificationLog.create({
    data: {
      businessId,
      appointmentId: appointment.id,
      type: "BOOKING_CONFIRMATION",
      targetEmail: customerEmail,
      success: emailResult.ok,
      providerStatus: emailResult.providerStatus,
    },
  });

  await prisma.appointment.update({
    where: { id: appointment.id },
    data: { confirmationSentAt: new Date() },
  });

  return {
    ok: true as const,
    appointmentId: appointment.id,
    staffName: appointment.assignedStaff?.fullName ?? slot.staffName,
    startAt,
    serviceName: service.name,
    emailSent: emailResult.ok,
  };
}

/** Persists the portfolio scripted slot index (0–2) as a real PENDING appointment for the customer’s clinic. */
export async function persistCustomerPortfolioDemoSlot(params: {
  businessId: string;
  slotIndex: number;
  customerName: string;
  customerEmail: string;
  /** When set (e.g. from scripted chat), matches a service on the business by name. */
  serviceName?: string | null;
}): Promise<
  | { error: string }
  | {
      ok: true;
      appointmentId: string;
      staffName: string;
      startAt: Date;
      serviceName: string;
      emailSent: boolean;
    }
> {
  const { businessId, slotIndex, customerName, customerEmail, serviceName } = params;
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex > 2) {
    return { error: "Invalid slot." };
  }
  const service = await resolveDemoBookingService(businessId, serviceName);
  if (!service) {
    return { error: "No matching service found for this business. Add services under Admin → Services." };
  }
  const { slots } = await loadTomorrowSlots(businessId, service.id);
  const slot = slots[slotIndex];
  if (!slot) {
    return { error: "That slot isn’t on the calendar right now. Ask for earliest again to refresh." };
  }
  return persistDemoBooking({
    businessId,
    serviceId: service.id,
    slot,
    customerName,
    customerEmail,
    createdViaAiChat: true,
  });
}

/**
 * Scripted multi-turn booking in **demo mode** (no OpenAI): uses Postgres like /book.
 * Intended for signed-in CUSTOMER with `businessId` — matches the “wellness consultation tomorrow afternoon” QA flow.
 */
export async function runDemoBookingFlow(messages: ChatMsg[], ctx: AgentBookingContext): Promise<string | null> {
  if (messages.length < 1) return null;
  const last = messages[messages.length - 1];
  if (last.role !== "user") return null;

  const lastUser = last.content;
  const lastIdx = messages.length - 1;
  const prevAssistant = lastAssistantBefore(messages, lastIdx);

  const who = displayName(ctx);
  const businessId = ctx.businessId ?? null;
  const isCustomer = ctx.userRole === "CUSTOMER" && Boolean(ctx.customerEmail);

  /** --- Step 4: confirm → write appointment --- */
  if (isConfirm(lastUser) && prevAssistant && assistantAskedBookingConfirm(prevAssistant)) {
    let priorUserIdx = -1;
    for (let i = lastIdx - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        priorUserIdx = i;
        break;
      }
    }
    if (priorUserIdx < 0) return null;

    if (!isCustomer || !businessId) {
      const choiceIdx = parseSlotSelection(messages[priorUserIdx].content, PORTFOLIO_STATIC_SLOTS);
      if (choiceIdx == null || choiceIdx < 0 || choiceIdx > 2) {
        return "I didn’t catch which time you chose. Pick **1:30 PM**, **2:15 PM**, or **4:00 PM**, then send **confirm** again.";
      }
      const s = PORTFOLIO_STATIC_SLOTS[choiceIdx];
      return `Confirmed — your wellness consultation is booked for tomorrow at ${s.label} with ${s.staffName}.`;
    }

    const service = await resolveDemoBookingService(businessId);
    if (!service) {
      return "No consultation-like service found for your business. Ask an admin to add one.";
    }

    const { slots } = await loadTomorrowSlots(businessId, service.id);
    const choiceIdx = parseSlotSelection(messages[priorUserIdx].content, slots);
    if (choiceIdx == null || choiceIdx < 0 || choiceIdx > 2) {
      return "I didn’t catch which time you chose. Pick a time from the list (for example **2:15 PM**) or **1** / **2** / **3**, then send **confirm** again.";
    }

    const slot = slots[choiceIdx];
    if (!slot) {
      return "That time is no longer available. Say **earliest** again to refresh the list.";
    }

    const customerName = ctx.customerName?.trim() || who;
    const customerEmail = ctx.customerEmail!;

    const result = await persistDemoBooking({
      businessId,
      serviceId: service.id,
      slot,
      customerName,
      customerEmail,
      createdViaAiChat: true,
    });

    if ("error" in result) {
      return result.error ?? "Could not complete booking.";
    }

    const label = format(new Date(result.startAt), "p");
    const svcPhrase = customerServicePhrase(result.serviceName);
    return `Confirmed — your ${svcPhrase} is booked for tomorrow at ${label} with ${result.staffName ?? "your provider"}.`;
  }

  /** --- Step 3: pick time / 1–3 → ask confirm --- */
  if (prevAssistant && assistantOfferedSlotList(prevAssistant)) {
    if (!isCustomer || !businessId) {
      const choice = parseSlotSelection(lastUser, PORTFOLIO_STATIC_SLOTS);
      if (choice === null) {
        if (isConfirm(lastUser)) {
          return "Choose a time from the list first (for example **2:15 PM** or reply **1**, **2**, or **3**). I’ll ask you to confirm once you’ve picked one.";
        }
        return null;
      }
      const slot = PORTFOLIO_STATIC_SLOTS[choice];
      return `Please confirm: wellness consultation tomorrow at ${slot.label} with ${slot.staffName}.\n\nReply **confirm** to complete the booking.`;
    }

    const service = await resolveDemoBookingService(businessId);
    if (!service) return "I couldn’t find that service on file. Try the step-by-step booking page, or ask the clinic.";

    const { slots } = await loadTomorrowSlots(businessId, service.id);
    const choice = parseSlotSelection(lastUser, slots);
    if (choice === null) {
      if (isConfirm(lastUser)) {
        return "Choose a time from the list above first (for example **2:15 PM** or reply **1**, **2**, or **3**). I’ll ask you to confirm once you’ve picked one.";
      }
      return null;
    }

    const slot = slots[choice];
    if (!slot) {
      return "That time isn’t on the latest list. Pick one of the times shown above, or say **earliest** to refresh.";
    }

    const svcPhrase = customerServicePhrase(service.name);
    return `Please confirm: ${svcPhrase} tomorrow at ${slot.label} with ${slot.staffName}.\n\nReply **confirm** to complete the booking.`;
  }

  /** --- Step 2b: vague “yes” after staff vs earliest question --- */
  if (
    prevAssistant &&
    assistantAskedStaffOrFollowUp(prevAssistant) &&
    !isEarliestChoice(lastUser) &&
    isVagueAffirmation(lastUser)
  ) {
    return CLARIFY_STAFF_VS_EARLIEST;
  }

  /** --- Step 2: earliest → show 2–3 slots --- */
  if (isEarliestChoice(lastUser) && prevAssistant && assistantAskedStaffOrFollowUp(prevAssistant)) {
    if (!isCustomer || !businessId) {
      return PORTFOLIO_DEMO_SLOT_MESSAGE;
    }

    const service = await resolveDemoBookingService(businessId);
    if (!service) {
      return "I couldn’t find a matching service for this clinic. A staff member may need to add services in settings.";
    }

    const { avail, slots } = await loadTomorrowSlots(businessId, service.id);

    if ("error" in avail && avail.error) {
      return "I couldn’t read the calendar just then. Please try again in a moment, or use the booking form on the website.";
    }
    if ("closedDay" in avail && avail.closedDay) {
      return `${avail.message ?? "That day is closed."} Try another day, or use the booking form to pick a different date.`;
    }
    if (slots.length === 0) {
      return [
        "I don’t see open afternoon times tomorrow for that visit with the current schedule.",
        "Try another day, or use the step-by-step booking page to explore more options.",
      ].join("\n\n");
    }

    const lines = slots.map((s) => formatSlotLineHuman(s));
    return [
      "Great — I found these available times for tomorrow afternoon:",
      "",
      ...lines,
      "",
      "Which one would you like?",
    ].join("\n");
  }

  /** --- Step 1: book + wellness/tomorrow → staff question --- */
  if (isBookingStart(lastUser)) {
    const blocked = messages.some(
      (m, i) =>
        m.role === "assistant" &&
        i < lastIdx &&
        (m.content.includes("Confirmed —") || m.content.includes("all set") || m.content.includes("saved as **PENDING**")),
    );
    if (blocked) return null;

    if (
      prevAssistant &&
      (assistantAskedStaffQuestion(prevAssistant) ||
        assistantOfferedSlotList(prevAssistant) ||
        assistantAskedBookingConfirm(prevAssistant))
    ) {
      return null;
    }

    const greet = firstName(who);
    return `Hi ${greet} — I can help book a wellness consultation for tomorrow afternoon.\n\n${STAFF_OR_EARLIEST_Q}`;
  }

  return null;
}
