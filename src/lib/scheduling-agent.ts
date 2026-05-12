import { addMinutes } from "date-fns";
import { Agent, RunContext, handoff, tool } from "@openai/agents";
import { z } from "zod";
import type { AgentInputItem } from "@openai/agents-core";
import { ACTIVE_CALENDAR_STATUSES } from "@/lib/active-appointment-statuses";
import { checkAvailabilityForAgent } from "@/lib/agent-availability";
import { hasBookableIntervalConflict } from "@/lib/appointment-conflicts";
import { bookingRequestReceivedHtml } from "@/lib/email-templates";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { getEligibleStaffForService, staffCanPerformService } from "@/lib/staff-for-service";
import { toDisplayTime } from "@/lib/time";

export type AgentBookingContext = {
  customerEmail: string | null;
  customerName: string | null;
  userRole: string | null;
  /** Customer’s business (from session). Used by the no-OpenAI demo booking script. */
  businessId?: string | null;
};

function formatPriceUsd(priceCents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(priceCents / 100);
}

function resolveCustomerEmail(
  ctx: AgentBookingContext,
  requested: string | undefined,
): { email: string } | { error: string } {
  if (ctx.userRole === "CUSTOMER" && ctx.customerEmail) {
    if (requested && requested.toLowerCase() !== ctx.customerEmail.toLowerCase()) {
      return { error: "Signed-in customers must use their account email for this action." };
    }
    return { email: ctx.customerEmail };
  }
  if (!requested?.trim()) {
    return { error: "customerEmail is required for guests (or sign in)." };
  }
  return { email: requested.trim().toLowerCase() };
}

const listBusinesses = tool({
  name: "list_businesses",
  description: "List businesses that accept online bookings and their timezones.",
  parameters: z.object({}),
  async execute() {
    const rows = await prisma.business.findMany({
      where: { services: { some: { isActive: true } } },
      select: { id: true, name: true, timezone: true },
      orderBy: { name: "asc" },
    });
    return { businesses: rows };
  },
});

const listServices = tool({
  name: "list_services",
  description: "List active bookable services (duration, price, buffer after visit in minutes).",
  parameters: z.object({
    businessId: z.string().describe("Business id from list_businesses"),
  }),
  async execute({ businessId }) {
    const services = await prisma.service.findMany({
      where: { businessId, isActive: true },
      select: {
        id: true,
        name: true,
        durationMinutes: true,
        bufferMinutesAfter: true,
        priceCents: true,
      },
      orderBy: { name: "asc" },
    });
    return {
      services: services.map((s) => ({
        ...s,
        priceLabel: formatPriceUsd(s.priceCents),
      })),
    };
  },
});

const getStaffForService = tool({
  name: "get_staff_for_service",
  description:
    "List staff who can perform a service. Use before check_availability when the customer names a person or you need to offer stylist choices.",
  parameters: z.object({
    businessId: z.string(),
    serviceId: z.string(),
  }),
  async execute({ businessId, serviceId }) {
    const staff = await getEligibleStaffForService(businessId, serviceId);
    return {
      staff: staff.map((s) => ({ id: s.id, name: s.fullName, email: s.email })),
      note: 'If they have not chosen someone yet, ask something like: "Do you prefer any particular staff member, or should I find the earliest available slot?" Then pass staffUserId into check_availability only after they pick a person; omit it to search eligible staff in parallel.',
    };
  },
});

const getServiceDetails = tool({
  name: "get_service_details",
  description:
    "Find a service by fuzzy name match within a business (e.g. '60-minute facial'). Returns price, duration, and buffer.",
  parameters: z.object({
    businessId: z.string(),
    query: z.string().describe("Service name or keywords the customer mentioned"),
  }),
  async execute({ businessId, query }) {
    const q = query.trim().toLowerCase();
    if (!q) return { error: "Empty query" };
    const services = await prisma.service.findMany({
      where: { businessId, isActive: true },
      select: { id: true, name: true, durationMinutes: true, priceCents: true, bufferMinutesAfter: true },
    });
    const scored = services
      .map((s) => {
        const name = s.name.toLowerCase();
        const score = name.includes(q) ? 2 : q.split(/\s+/).every((w) => w.length > 1 && name.includes(w)) ? 1 : 0;
        return { ...s, score };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    const best = scored[0];
    if (!best) {
      return { error: "No matching service; use list_services for exact names." };
    }
    return {
      serviceId: best.id,
      name: best.name,
      durationMinutes: best.durationMinutes,
      bufferMinutesAfter: best.bufferMinutesAfter,
      priceCents: best.priceCents,
      priceLabel: formatPriceUsd(best.priceCents),
    };
  },
});

const checkAvailability = tool({
  name: "check_availability",
  description: `Check real open times. Each slot already accounts for: business opening hours, staff working hours (when scoped or via byStaff), existing appointments on the calendar, the service duration, buffer time after visits, staff/business time-off blocks, and closed days (returns closedDay when the business has no hours that weekday).
Pass staffUserId to scope to one person; omit it to search eligible staff in parallel (returns byStaff).
Use timePreference: morning | afternoon | evening | after_2pm | any (e.g. "Friday after 2 PM" → date + timePreference after_2pm or afternoon as appropriate).`,
  parameters: z.object({
    businessId: z.string(),
    serviceId: z.string(),
    date: z.string().describe("Calendar day YYYY-MM-DD"),
    staffUserId: z.string().optional().describe("Set when customer chose a specific staff member"),
    timePreference: z.enum(["morning", "afternoon", "evening", "after_2pm", "any"]).optional(),
    maxStaff: z.number().int().min(1).max(12).optional(),
    maxSlotsPerStaff: z.number().int().min(1).max(8).optional(),
  }),
  async execute({ businessId, serviceId, date, staffUserId, timePreference, maxStaff, maxSlotsPerStaff }) {
    return checkAvailabilityForAgent({
      businessId,
      serviceId,
      date,
      staffUserId,
      timePreference: timePreference ?? "any",
      maxStaff: maxStaff ?? 6,
      maxSlotsPerStaff: maxSlotsPerStaff ?? 4,
    });
  },
});

const bookAppointment = tool({
  name: "book_appointment",
  description:
    "Creates a pending appointment and sends email. startAt should be an ISO time from check_availability for this service/date/staff. ONLY after the customer clearly confirmed the exact slot, service, staff (if any), name, and email (e.g. \"Yes, 3:15 works.\"). bookingConfirmedByCustomer must be true only on that confirming turn — never on the first proposal. If the time is an exception outside the last check_availability results, set exceptionToPublishedHoursConfirmed true only after they explicitly accept booking outside normal published slots, and summarize the exception in specialRequestNote. The server still rejects double-book / overlap conflicts.",
  parameters: z.object({
    businessId: z.string(),
    serviceId: z.string(),
    startAt: z.string().describe("ISO from check_availability for the chosen staff (or business-wide slot)"),
    customerName: z.string().min(2),
    customerEmail: z.string().email(),
    staffUserId: z.string().optional().describe("Staff performing the service when the customer chose someone"),
    bookingConfirmedByCustomer: z
      .boolean()
      .describe("Must be true only after explicit customer confirmation of the full booking summary."),
    exceptionToPublishedHoursConfirmed: z
      .boolean()
      .optional()
      .describe(
        "Set true only if startAt was NOT on the check_availability list you offered and the customer still explicitly confirmed that exact exception time. Otherwise omit or false.",
      ),
    specialRequestNote: z.string().max(2000).optional(),
  }),
  async execute(args, runContext?: RunContext<AgentBookingContext>) {
    if (!args.bookingConfirmedByCustomer) {
      return {
        error: "CONFIRMATION_REQUIRED",
        message:
          "Summarize service, staff (if any), date/time, name, and email; ask the customer to confirm. Then call book_appointment again with bookingConfirmedByCustomer: true.",
      };
    }

    if (args.exceptionToPublishedHoursConfirmed === true && !args.specialRequestNote?.trim()) {
      return {
        error: "CONFIRMATION_REQUIRED",
        message:
          "Booking outside the published slot list requires a short specialRequestNote explaining the agreed exception after customer confirmation. Add the note, then call again with exceptionToPublishedHoursConfirmed: true.",
      };
    }

    const ctx = runContext?.context ?? {
      customerEmail: null,
      customerName: null,
      userRole: null,
    };
    let { customerName, customerEmail } = args;
    if (ctx.userRole === "CUSTOMER" && ctx.customerEmail) {
      customerEmail = ctx.customerEmail;
      if (ctx.customerName?.trim()) {
        customerName = ctx.customerName.trim();
      }
    }

    const startAt = new Date(args.startAt);
    if (Number.isNaN(startAt.getTime())) {
      return { error: "Invalid startAt" };
    }

    const service = await prisma.service.findFirst({
      where: { id: args.serviceId, businessId: args.businessId, isActive: true },
      include: { business: true },
    });
    if (!service) {
      return { error: "Service not found" };
    }

    let staffId: string | undefined;
    if (args.staffUserId?.trim()) {
      const ok = await staffCanPerformService(args.staffUserId.trim(), args.serviceId, args.businessId);
      if (!ok) return { error: "That staff member cannot perform this service." };
      staffId = args.staffUserId.trim();
    }

    const endAt = addMinutes(startAt, service.durationMinutes);
    if (await hasBookableIntervalConflict(args.businessId, startAt, endAt, { staffUserId: staffId })) {
      return { error: "Slot no longer available; run check_availability again." };
    }

    const note = args.specialRequestNote?.trim();
    const appointment = await prisma.appointment.create({
      data: {
        businessId: args.businessId,
        serviceId: args.serviceId,
        customerName,
        customerEmail,
        startAt,
        endAt,
        status: "PENDING",
        ...(staffId ? { assignedStaffUserId: staffId } : {}),
        ...(note ? { specialRequestNote: note, specialRequestStatus: "PENDING" as const } : {}),
        createdViaAiChat: true,
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
        businessId: args.businessId,
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
      ok: true,
      appointmentId: appointment.id,
      emailSent: emailResult.ok,
      startAt: startAt.toISOString(),
      staffName: appointment.assignedStaff?.fullName ?? null,
      message:
        'Reply in one short line like: "Done — your [service] with [staff name] is booked for [weekday] at [time]." If staff is unassigned, omit "with …". Mention the confirmation email if emailSent is true.',
    };
  },
});

const listMyAppointments = tool({
  name: "list_my_appointments",
  description:
    "Find the customer’s upcoming visits that still occupy the calendar (PENDING, CONFIRMED, or RESCHEDULED) for reschedule/cancel (e.g. \"tomorrow\", \"Monday\"). If several match, ask which one before changing anything.",
  parameters: z.object({
    customerEmail: z.string().email().optional().describe("Required for guests; omit when signed in as customer"),
  }),
  async execute({ customerEmail: requested }, runContext?: RunContext<AgentBookingContext>) {
    const resolved = resolveCustomerEmail(
      runContext?.context ?? { customerEmail: null, customerName: null, userRole: null },
      requested,
    );
    if ("error" in resolved) return { error: resolved.error };
    const email = resolved.email;

    const now = new Date();
    const rows = await prisma.appointment.findMany({
      where: {
        customerEmail: email,
        status: { in: [...ACTIVE_CALENDAR_STATUSES] },
        startAt: { gte: now },
      },
      orderBy: { startAt: "asc" },
      take: 25,
      include: {
        service: true,
        business: { select: { name: true } },
        assignedStaff: { select: { id: true, fullName: true } },
      },
    });

    return {
      appointments: rows.map((a) => ({
        id: a.id,
        businessId: a.businessId,
        businessName: a.business.name,
        serviceName: a.service.name,
        staffName: a.assignedStaff?.fullName ?? null,
        staffId: a.assignedStaff?.id ?? null,
        startAt: a.startAt.toISOString(),
        status: a.status,
      })),
    };
  },
});

const cancelAppointment = tool({
  name: "cancel_appointment",
  description:
    "Cancels a visit ONLY when cancellationConfirmedByCustomer is true after the customer explicitly confirmed they want to cancel (e.g. yes, cancel it). If false, returns CONFIRMATION_REQUIRED. The AI must NEVER pass true on the first turn — always verify the right appointment, ask for confirmation, then call again with true. This tool does not refund money; processing a refund is a separate sensitive admin action outside chat.",
  parameters: z.object({
    appointmentId: z.string(),
    customerEmail: z.string().email().optional(),
    cancellationConfirmedByCustomer: z
      .boolean()
      .describe("True only after the customer clearly confirmed cancellation."),
  }),
  async execute(
    { appointmentId, customerEmail: requested, cancellationConfirmedByCustomer },
    runContext?: RunContext<AgentBookingContext>,
  ) {
    if (!cancellationConfirmedByCustomer) {
      return {
        error: "CONFIRMATION_REQUIRED",
        message:
          "State which appointment will be cancelled and ask the customer to confirm. Only then call cancel_appointment with cancellationConfirmedByCustomer: true.",
      };
    }

    const resolved = resolveCustomerEmail(
      runContext?.context ?? { customerEmail: null, customerName: null, userRole: null },
      requested,
    );
    if ("error" in resolved) return { error: resolved.error };
    const email = resolved.email;

    const appt = await prisma.appointment.findFirst({
      where: { id: appointmentId, customerEmail: email },
    });
    if (!appt) {
      return { error: "Appointment not found for this email." };
    }
    if (appt.status === "COMPLETED") {
      return { error: "This visit already completed." };
    }
    if (appt.status === "CANCELLED") {
      return { ok: true, message: "Already cancelled." };
    }
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "CANCELLED" },
    });
    return { ok: true, appointmentId };
  },
});

const rescheduleAppointment = tool({
  name: "reschedule_appointment",
  description:
    "Moves a visit to a new ISO start time from check_availability. rescheduleConfirmedByCustomer must be false until the customer explicitly confirms the new slot; then call again with true. Never move without that confirmation. Do not use this to double-book: newStartAt must be an open slot from check_availability; if conflict, re-check availability instead of forcing.",
  parameters: z.object({
    appointmentId: z.string(),
    newStartAt: z.string().describe("ISO start from check_availability for the same service (and staff if applicable)"),
    customerEmail: z.string().email().optional(),
    rescheduleConfirmedByCustomer: z
      .boolean()
      .describe("True only after explicit customer confirmation of the new time."),
  }),
  async execute(
    { appointmentId, newStartAt, customerEmail: requested, rescheduleConfirmedByCustomer },
    runContext?: RunContext<AgentBookingContext>,
  ) {
    if (!rescheduleConfirmedByCustomer) {
      return {
        error: "CONFIRMATION_REQUIRED",
        message:
          "Summarize the new date/time and ask the customer to confirm. Then call reschedule_appointment with rescheduleConfirmedByCustomer: true.",
      };
    }

    const resolved = resolveCustomerEmail(
      runContext?.context ?? { customerEmail: null, customerName: null, userRole: null },
      requested,
    );
    if ("error" in resolved) return { error: resolved.error };
    const email = resolved.email;

    const appt = await prisma.appointment.findFirst({
      where: { id: appointmentId, customerEmail: email },
      include: { service: true, business: true, assignedStaff: { select: { fullName: true } } },
    });
    if (!appt || appt.status === "CANCELLED" || appt.status === "COMPLETED") {
      return { error: "Appointment not found, cancelled, or already completed." };
    }

    const startAt = new Date(newStartAt);
    if (Number.isNaN(startAt.getTime())) {
      return { error: "Invalid newStartAt" };
    }
    const endAt = addMinutes(startAt, appt.service.durationMinutes);

    const staffForConflict = appt.assignedStaffUserId ?? undefined;
    if (
      await hasBookableIntervalConflict(appt.businessId, startAt, endAt, {
        excludeAppointmentId: appointmentId,
        staffUserId: staffForConflict,
      })
    ) {
      return { error: "New slot not available for this staff/calendar." };
    }

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { startAt, endAt, status: "RESCHEDULED" },
    });

    const emailResult = await sendEmail({
      to: email,
      subject: `Appointment updated — ${appt.business.name}`,
      html: `<p>Your appointment for <strong>${appt.service.name}</strong>${appt.assignedStaff ? ` with ${appt.assignedStaff.fullName}` : ""} has been moved to ${startAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}.</p>`,
    });

    return {
      ok: true,
      appointmentId,
      newStartAt: startAt.toISOString(),
      emailSent: emailResult.ok,
    };
  },
});

function agentModel() {
  return process.env.OPENAI_AGENT_MODEL ?? "gpt-4o-mini";
}

function customerContextBlock(ctx: AgentBookingContext, nowIso: string) {
  return `Current UTC time: ${nowIso}

Customer context:
- Signed in as customer: ${ctx.userRole === "CUSTOMER" ? "yes" : "no"}
- Account email: ${ctx.customerEmail ?? "none"}
- Account name: ${ctx.customerName ?? "none"}`;
}

/** Injected into orchestrator + specialists — models must not skip human confirmation for these classes of risk. */
const SENSITIVE_ACTIONS_CONFIRMATION_POLICY = `## Sensitive actions (explicit confirmation required)
1. **Cancel appointment** — Call cancel_appointment with cancellationConfirmedByCustomer: true **only** after the customer clearly confirms **which** visit is cancelled (never true on the first proposal). Cancelling does **not** issue a refund; refunds are separate and need clinic/admin controls outside this tool.
2. **Refund customer** — This app’s chat tools **do not** move money or mark refunds paid. Explain policy in plain language; for an actual refund, the clinic must use their payment/admin workflow with its own confirmations. Never claim a refund was completed from chat.
3. **Book outside normal published hours** — Prefer **only** startAt values returned by check_availability for the agreed service/date/staff. If the customer requests a true exception (time not on that list), get **explicit written confirmation** of the exact date/time and put a short reason in specialRequestNote before calling book_appointment with bookingConfirmedByCustomer: true. Never invent “off-menu” times without that confirmation.
4. **Override staff availability** — You cannot change staff hours, blocks, or rules from chat. Direct users to **Admin → settings** (hours, staff availability, blackouts). Do not imply a silent calendar override.
5. **Double-book a slot** — Never attempt two bookings for the same staff/time. The server rejects overlaps. If a slot fails, re-run check_availability; never instruct bypassing conflicts.`;

const bookingTools = [
  listBusinesses,
  listServices,
  getStaffForService,
  getServiceDetails,
  checkAvailability,
  bookAppointment,
];

const reschedulingTools = [
  listBusinesses,
  listServices,
  getServiceDetails,
  checkAvailability,
  listMyAppointments,
  rescheduleAppointment,
  cancelAppointment,
];

const adminTools = [listBusinesses, listServices, getStaffForService, checkAvailability];

const supportTools = [listBusinesses, listServices, getServiceDetails];

/**
 * Multi-agent setup: orchestrator hands off to specialists.
 * Export for tests or custom runners; chat uses {@link createSchedulingAgent} (orchestrator).
 */
export function createSupportSpecialistAgent() {
  return new Agent<AgentBookingContext>({
    name: "Support specialist",
    handoffDescription:
      "Policies, refunds, FAQs, and general pricing guidance using listed services. Does not book or cancel appointments.",
    instructions: (rc: RunContext<AgentBookingContext>) => {
      const ctx = rc.context;
      const nowIso = new Date().toISOString();
      return `You are the **Support** specialist for AppointEase.

Scope: refunds, cancellation policies (as general guidance), FAQs, hours/location-style questions when not tied to booking a slot, and explaining posted prices (use list_services / get_service_details — never invent prices).

Rules:
- Do **not** guarantee refunds; each clinic sets policy. Suggest contacting the business for binding answers.
- Use tools for factual service names and priceLabel when the customer asks "how much is X".
- Keep answers short. If they need to book or cancel, say they can ask again and the orchestrator will route to booking or rescheduling.
- Never call book_appointment, cancel_appointment, or reschedule_appointment.

${SENSITIVE_ACTIONS_CONFIRMATION_POLICY}

${customerContextBlock(ctx, nowIso)}`;
    },
    model: agentModel(),
    tools: supportTools,
    handoffs: [],
  });
}

export function createAdminSpecialistAgent(support: Agent<AgentBookingContext>) {
  return new Agent<AgentBookingContext>({
    name: "Admin specialist",
    handoffDescription:
      "Explains the clinic workspace: admin dashboard, today/upcoming views, services, staff, hours, and read-only calendar context for owners/staff.",
    instructions: (rc: RunContext<AgentBookingContext>) => {
      const ctx = rc.context;
      const nowIso = new Date().toISOString();
      return `You are the **Admin** specialist for AppointEase.

Help owners and staff understand **how the product works**: today's schedule, upcoming appointments, services (duration, price, buffer), staff who can perform services, and checking availability read-only.

Use list_businesses, list_services, get_staff_for_service, and check_availability to ground answers in real data when the user names a business.

Do **not** create bookings or cancel from here — that belongs to the booking or rescheduling specialists. Consumer refund/legal questions → hand off to Support.

${SENSITIVE_ACTIONS_CONFIRMATION_POLICY}

${customerContextBlock(ctx, nowIso)}`;
    },
    model: agentModel(),
    tools: adminTools,
    handoffs: [
      handoff(support, {
        toolDescriptionOverride:
          "Customer asks about refunds, consumer-facing policies, or FAQs outside workspace configuration.",
      }),
    ],
  });
}

export function createBookingSpecialistAgent(support: Agent<AgentBookingContext>) {
  return new Agent<AgentBookingContext>({
    name: "Booking specialist",
    handoffDescription:
      "New appointments only: pick business/service, staff vs earliest, check_availability, confirm, book_appointment.",
    instructions: (rc: RunContext<AgentBookingContext>) => {
      const ctx = rc.context;
      const nowIso = new Date().toISOString();
      return `You are the **Booking** specialist. You only handle **new** appointments (not cancel/reschedule).

Rules:
1. Collect service, preferred date/time (map "tomorrow afternoon" / "Friday after 2 PM" to YYYY-MM-DD + timePreference), customer name, and **email** (booking requires email; if only phone, ask for email or sign-in).
2. Never invent availability. Use list_services / get_service_details, get_staff_for_service, then check_availability.
3. Never call book_appointment with bookingConfirmedByCustomer: true until they clearly confirm the full summary (e.g. "Yes, 3:15 works.").
4. If they also ask about refunds/policies, answer scheduling first if needed, then hand off to Support for policy wording.

## Flow
1. Resolve business + service.
2. If they have not chosen staff, ask e.g. whether they prefer a particular staff member or the earliest available slot.
3. check_availability with date, timePreference, staffUserId only after they pick someone.
4. Offer a few real options (e.g. "Sarah is available Friday at 2:30 PM, 3:15 PM, or 4:00 PM.").
5. Confirm, then book_appointment.

check_availability already reflects business hours, staff hours, existing appointments, duration, buffers, blocks, and closed days.

${SENSITIVE_ACTIONS_CONFIRMATION_POLICY}

${customerContextBlock(ctx, nowIso)}`;
    },
    model: agentModel(),
    tools: bookingTools,
    handoffs: [
      handoff(support, {
        toolDescriptionOverride:
          "Customer asks about refund policy, cancellation policy, or FAQs alongside or after booking — transfer for policy-safe wording.",
      }),
    ],
  });
}

export function createReschedulingSpecialistAgent(support: Agent<AgentBookingContext>) {
  return new Agent<AgentBookingContext>({
    name: "Rescheduling specialist",
    handoffDescription:
      "list_my_appointments, reschedule_appointment, cancel_appointment — changes to existing visits; never cancel without explicit customer confirmation.",
    instructions: (rc: RunContext<AgentBookingContext>) => {
      const ctx = rc.context;
      const nowIso = new Date().toISOString();
      return `You are the **Rescheduling** specialist. You handle **existing** appointments: list upcoming, reschedule, cancel.

Rules:
1. Use list_my_appointments; if several rows match, ask which appointment.
2. Reschedule: check_availability for the new day (respect assigned staff when applicable), summarize, then reschedule_appointment with rescheduleConfirmedByCustomer: true **only** after explicit confirmation.
3. Cancel: NEVER call cancel_appointment with cancellationConfirmedByCustomer: true on the first turn. Verify the row, restate what will be cancelled, ask for confirmation, then call with true.
4. If the same message asks about **refund policy** or similar, complete or clarify the calendar action first when appropriate, then hand off to Support for policy language (do not invent refund rules).

${SENSITIVE_ACTIONS_CONFIRMATION_POLICY}

${customerContextBlock(ctx, nowIso)}`;
    },
    model: agentModel(),
    tools: reschedulingTools,
    handoffs: [
      handoff(support, {
        toolDescriptionOverride:
          "Refund/cancellation policy questions, FAQs, or consumer protection topics after or alongside reschedule/cancel.",
      }),
    ],
  });
}

/**
 * Main entry: triage orchestrator with handoffs to Booking, Rescheduling, Admin, and Support specialists.
 * Example: "I want to cancel, but also ask about refund policy" → hand off to Rescheduling first; they can transfer to Support for refunds.
 */
export function createSchedulingAgent() {
  const support = createSupportSpecialistAgent();
  const booking = createBookingSpecialistAgent(support);
  const rescheduling = createReschedulingSpecialistAgent(support);
  const admin = createAdminSpecialistAgent(support);

  return new Agent<AgentBookingContext>({
    name: "AppointEase orchestrator",
    handoffDescription:
      "Main concierge: routes new bookings, changes to visits, admin/workspace questions, and policy/support topics to the right specialist.",
    instructions: (rc: RunContext<AgentBookingContext>) => {
      const ctx = rc.context;
      const nowIso = new Date().toISOString();
      return `You are the **AppointEase orchestrator**. You do **not** call scheduling tools yourself — you only **hand off** using the transfer_* tools so the right specialist runs with the same conversation history.

## Routing
- **Booking specialist** — New visit: "book a haircut", "any openings tomorrow", first-time slot search, confirming a **new** booking.
- **Rescheduling specialist** — Cancel, reschedule, move, change time, "show my appointments" / upcoming visits when managing existing bookings.
- **Admin specialist** — How the **clinic dashboard / workspace** works for owners/staff (what admins see, services setup, staff list concepts). Not consumer refund policy.
- **Support specialist** — Refunds, policies, FAQs, general pricing explanation when they are **not** trying to complete a book/cancel/reschedule in this turn.

## Mixed intents
If one message combines cancel/reschedule with a refund or policy question (e.g. "cancel tomorrow but what's your refund policy?"), hand off to **Rescheduling specialist** first so the calendar is handled safely; they can transfer to Support for the policy part.

If the user only wants policy/FAQ with no calendar action, hand off to **Support specialist**.

If unclear, ask one short question.

${SENSITIVE_ACTIONS_CONFIRMATION_POLICY}

${customerContextBlock(ctx, nowIso)}`;
    },
    model: agentModel(),
    tools: [],
    handoffs: [
      handoff(booking, {
        toolDescriptionOverride:
          "Customer wants a NEW appointment or to find and confirm a first-time slot (includes 'openings tomorrow' for a new booking).",
      }),
      handoff(rescheduling, {
        toolDescriptionOverride:
          "Customer wants to cancel, reschedule, move, or list/manage EXISTING appointments.",
      }),
      handoff(admin, {
        toolDescriptionOverride:
          "Questions about running the business in AppointEase: admin dashboard, analytics, configuring services/staff/hours, what admins can see.",
      }),
      handoff(support, {
        toolDescriptionOverride:
          "Refunds, cancellation policies as consumer questions, FAQs, or pricing explanation without completing a booking/cancel flow in this turn.",
      }),
    ],
  });
}

export function chatMessagesToAgentInput(messages: { role: string; content: string }[]): AgentInputItem[] {
  const items: AgentInputItem[] = [];
  for (const m of messages) {
    if (m.role === "user" && typeof m.content === "string") {
      items.push({ role: "user", content: m.content });
    } else if (m.role === "assistant" && typeof m.content === "string") {
      items.push({
        role: "assistant",
        status: "completed",
        content: [{ type: "output_text", text: m.content }],
      });
    }
  }
  return items;
}
