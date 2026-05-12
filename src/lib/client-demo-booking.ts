import { formatCanonicalServiceBullets } from "@/lib/canonical-demo-catalog";
import { matchesDemoUpcomingAppointmentsQuery } from "@/lib/demo-sample-copy";

export type ClientDemoBookingStep =
  | "idle"
  | "choose_service"
  | "ask_time"
  | "ask_staff"
  | "choose_staff_member"
  | "show_slots"
  | "await_confirm"
  | "choose_reschedule_appointment"
  | "ask_reschedule_time"
  | "show_reschedule_slots"
  | "await_reschedule_confirm"
  | "choose_cancel_appointment"
  | "await_cancel_confirm"
  | "booked";

export type ClientDemoBookingState = {
  step: ClientDemoBookingStep;
  selectedService: string | null;
  selectedSlot: string | null;
  selectedAppointment: string | null;
  selectedStaff: string | null;
  /** Used after confirm: portfolio API only for new booking slot picks */
  lastFlow: "booking" | "reschedule" | null;
  /** Last confirmed demo booking line, prepended to sample “upcoming” lists */
  recentBookedLine: string | null;
};

export type DemoBookingState = ClientDemoBookingState;
export type DemoBookingStep = ClientDemoBookingStep;

export const initialClientDemoBookingState: ClientDemoBookingState = {
  step: "idle",
  selectedService: null,
  selectedSlot: null,
  selectedAppointment: null,
  selectedStaff: null,
  lastFlow: null,
  recentBookedLine: null,
};

/** @deprecated Use initialClientDemoBookingState */
export const initialDemoBookingState = initialClientDemoBookingState;

/** Server + guest demo fallback slot list (aligned with client show_slots step). */
export const PORTFOLIO_DEMO_SLOT_MESSAGE = `Great — I found these available times for a service tomorrow afternoon:

1:00 PM with Nurse Amina
2:30 PM with Dr. Carter
4:15 PM with Nurse Amina

Which one would you like?`;

/** Maps scripted slot line → index for `POST /api/demo/portfolio-book` (first three real afternoon slots). */
export function portfolioSlotIndexFromSelectedSlot(slot: string | null): number | null {
  if (!slot) return null;
  if (slot.includes("1:00") || slot.includes("1:15")) return 0;
  if (slot.includes("2:30") || slot.includes("3:00") || slot.includes("2:00")) return 1;
  if (slot.includes("4:15") || slot.includes("3:45") || slot.includes("5:00")) return 2;
  if (slot.includes("1:30")) return 0;
  if (slot.includes("2:15")) return 1;
  if (slot.includes("4:00")) return 2;
  return null;
}

function inRescheduleFlow(step: ClientDemoBookingStep) {
  return (
    step === "choose_reschedule_appointment" ||
    step === "ask_reschedule_time" ||
    step === "show_reschedule_slots" ||
    step === "await_reschedule_confirm"
  );
}

function inCancelFlow(step: ClientDemoBookingStep) {
  return step === "choose_cancel_appointment" || step === "await_cancel_confirm";
}

function matchesShowServicesIntent(text: string) {
  return (
    text.includes("show available services") ||
    text.includes("available services") ||
    text.includes("what services") ||
    text.includes("what do you offer")
  );
}

function matchesRescheduleIntent(text: string) {
  return (
    text.includes("reschedule") ||
    text.includes("change appointment") ||
    text.includes("move appointment") ||
    text.includes("change my appointment")
  );
}

/** Starts the cancel flow (not "cancellation policy" / refunds). */
function matchesStartCancelFlow(text: string) {
  return (
    text.includes("delete appointment") ||
    text.includes("remove appointment") ||
    (text.includes("cancel") && !text.includes("cancellation"))
  );
}

function demoRestartFromBooked(text: string) {
  return (
    matchesShowServicesIntent(text) ||
    matchesRescheduleIntent(text) ||
    matchesStartCancelFlow(text) ||
    (text.includes("book") && text.includes("wellness") && text.includes("tomorrow"))
  );
}

function wellnessTomorrowShortcut(text: string) {
  return text.includes("book") && text.includes("wellness") && text.includes("tomorrow");
}

/** Never use bare `text.includes("schedule")` — it matches inside "reschedule". */
function wantsToBookIntent(text: string) {
  return (
    text.includes("book an appointment") ||
    text.includes("book a") ||
    text.includes("make an appointment") ||
    text.includes("schedule an appointment") ||
    text === "book" ||
    text === "booking"
  );
}

function wantsToCancelIntent(text: string) {
  return (
    (text.includes("cancel") && !text.includes("cancellation")) ||
    text.includes("delete appointment") ||
    text.includes("remove appointment")
  );
}

/** User affirms pending **new booking** confirmation. */
function affirmsBookingConfirm(text: string) {
  const t = text.trim();
  return (
    text.includes("confirm") ||
    text.includes("confirmed") ||
    text.includes("yes") ||
    text.includes("book it") ||
    t === "ok" ||
    t === "okay" ||
    t === "yep" ||
    t === "yeah" ||
    t === "k"
  );
}

/** User affirms pending **reschedule** confirmation. */
function affirmsRescheduleConfirm(text: string) {
  return affirmsBookingConfirm(text) || text.includes("change it");
}

const SERVICE_BULLETS = formatCanonicalServiceBullets();

const SERVICES_LIST = `Here are the available services at NZ Wellness Clinic:

${SERVICE_BULLETS}

Which service would you like to book?`;

const GENERIC_BOOK_APPOINTMENT_REPLY = `Sure — what service would you like to book?

${SERVICE_BULLETS}`;

const NEW_BOOKING_RESTART_REPLY = `No problem — I'll start a new booking request.

What service would you like to book?

${SERVICE_BULLETS}`;

const STOP_BOOKING_PREFIX = `No problem — I'll stop this booking request.`;

const STOP_RESCHEDULE_PREFIX = `No problem — I'll stop this reschedule request.`;

const STAFF_CHOICE_BULLETS = `• Nurse Amina — nursing / wellness
• Dr. Carter — GP
• Dr. Patel — integrative medicine`;

const FIXED_UPCOMING_SAMPLES: readonly string[] = [
  "Wellness Consultation — Tomorrow at 2:15 PM with Nurse Amina",
  "Follow-up Visit — Friday at 10:30 AM with Dr. Carter",
] as const;

function upcomingBulletLines(s: ClientDemoBookingState): string {
  const lines: string[] = [];
  const extra = s.recentBookedLine?.replace(/^\s*•\s*/, "").trim();
  if (extra) lines.push(`• ${extra}`);
  for (const row of FIXED_UPCOMING_SAMPLES) {
    lines.push(`• ${row}`);
  }
  return lines.join("\n");
}

function upcomingRescheduleList(s: ClientDemoBookingState): string {
  return `Here are your upcoming appointments:\n\n${upcomingBulletLines(s)}\n\nWhich appointment would you like to reschedule?`;
}

function upcomingCancelList(s: ClientDemoBookingState): string {
  return `Here are your upcoming appointments:\n\n${upcomingBulletLines(s)}\n\nWhich appointment would you like to cancel?`;
}

function upcomingSamplesReply(s: ClientDemoBookingState): string {
  return `Here are your upcoming appointments:\n\n${upcomingBulletLines(s)}\n\nWould you like to reschedule or cancel any of these?`;
}

/** Cancel or abandon a pending reschedule (phrases that do not include "cancel"). */
function abortsPendingReschedule(text: string): boolean {
  return (
    text.includes("not reschedule") ||
    text.includes("dont reschedule") ||
    text.includes("don't reschedule")
  );
}

function wantsToCancelOrAbortReschedule(text: string, step: ClientDemoBookingStep, hasAppointment: boolean): boolean {
  if (wantsToCancelIntent(text)) return true;
  return hasAppointment && inRescheduleFlow(step) && abortsPendingReschedule(text);
}

function servicePickFromChooseService(text: string): string | null {
  if (text.includes("nutrition")) return "Nutrition Check-in";
  if (text.includes("wellness")) return "Wellness Consultation";
  if (text.includes("stress")) return "Stress Management Session";
  if (text.includes("follow")) return "Follow-up Visit";
  if (text.includes("routine")) return "Routine Check-up";
  if (text.includes("urgent")) return "Urgent Visit";
  return null;
}

/** Avoid treating "Friday … follow-up … Carter" as choosing the Follow-up Visit service from idle. */
function servicePickFromIdle(text: string): string | null {
  if (text.includes("friday") && text.includes("carter")) return null;
  return servicePickFromChooseService(text);
}

/**
 * Client-only NZ Wellness portfolio demo. Pure function — caller applies `next` to React state.
 * Branch order: global intents (reschedule before book, cancel start) → cancel/reschedule step handlers → booking chain → globals → wellness shortcut → default last.
 */
export function computeClientDemoReply(
  input: string,
  state: ClientDemoBookingState,
  firstName: string,
): { reply: string; next: ClientDemoBookingState } | null {
  const raw = input.trim();
  if (!raw) return null;
  const text = raw.toLowerCase();

  if (text.includes("thanks") || text.includes("thank you") || text.includes("thx")) {
    return {
      reply: `You're welcome! Let me know if you need to book, reschedule, or cancel anything else.`,
      next: state,
    };
  }

  let s = state;
  if (s.step === "booked") {
    if (!demoRestartFromBooked(text)) {
      return null;
    }
    s = {
      step: "idle",
      selectedService: null,
      selectedSlot: null,
      selectedAppointment: null,
      selectedStaff: null,
      lastFlow: null,
      recentBookedLine: s.recentBookedLine,
    };
  }

  const next = (partial: Partial<ClientDemoBookingState>): ClientDemoBookingState => ({
    ...s,
    ...partial,
  });

  if (matchesDemoUpcomingAppointmentsQuery(text)) {
    return { reply: upcomingSamplesReply(s), next: s };
  }

  const wantsToReschedule = matchesRescheduleIntent(text);
  const wantsToBook = wantsToBookIntent(text);

  const clearedBooking: Partial<ClientDemoBookingState> = {
    selectedService: null,
    selectedSlot: null,
    selectedAppointment: null,
    selectedStaff: null,
    lastFlow: null,
  };

  const bookingStepsUseStopLine: ClientDemoBookingStep[] = [
    "ask_time",
    "ask_staff",
    "choose_staff_member",
    "show_slots",
    "await_confirm",
  ];
  const useStopBookingLine = bookingStepsUseStopLine.includes(s.step);

  const rescheduleProgressSteps: ClientDemoBookingStep[] = [
    "ask_reschedule_time",
    "show_reschedule_slots",
    "await_reschedule_confirm",
  ];
  const useStopRescheduleLine = rescheduleProgressSteps.includes(s.step);

  // Reschedule before booking — overrides await_confirm and in-progress new-booking steps.
  if (wantsToReschedule && !inRescheduleFlow(s.step) && s.step !== "await_cancel_confirm") {
    const reply = useStopBookingLine
      ? `${STOP_BOOKING_PREFIX}\n\n${upcomingRescheduleList(s)}`
      : upcomingRescheduleList(s);
    return {
      reply,
      next: next({
        step: "choose_reschedule_appointment",
        ...clearedBooking,
      }),
    };
  }

  // Cancel: if we already know which appointment (e.g. mid-reschedule), go straight to cancel confirmation.
  if (
    wantsToCancelOrAbortReschedule(text, s.step, Boolean(s.selectedAppointment)) &&
    s.step !== "await_cancel_confirm" &&
    s.selectedAppointment
  ) {
    const prefix =
      s.step === "await_reschedule_confirm"
        ? "No problem — I will not reschedule that appointment."
        : "No problem — I will stop the current flow.";
    return {
      reply: `${prefix}\n\nPlease confirm: do you want to cancel your ${s.selectedAppointment}?`,
      next: next({
        step: "await_cancel_confirm",
        selectedSlot: null,
        selectedStaff: null,
        selectedService: null,
        lastFlow: null,
      }),
    };
  }

  // Start cancel flow (pick an appointment) — not from await_confirm ("cancel this booking" lives there).
  if (wantsToCancelIntent(text) && !inCancelFlow(s.step) && s.step !== "await_confirm") {
    const stopPrefix = useStopBookingLine
      ? STOP_BOOKING_PREFIX
      : useStopRescheduleLine
        ? STOP_RESCHEDULE_PREFIX
        : "";
    const reply = stopPrefix ? `${stopPrefix}\n\n${upcomingCancelList(s)}` : upcomingCancelList(s);
    return {
      reply,
      next: next({
        step: "choose_cancel_appointment",
        ...clearedBooking,
      }),
    };
  }

  // New booking — after reschedule; never use bare "schedule" (would match "reschedule").
  if (wantsToBook && s.step !== "booked" && s.step !== "show_slots") {
    const reply = s.step !== "idle" ? NEW_BOOKING_RESTART_REPLY : GENERIC_BOOK_APPOINTMENT_REPLY;
    return {
      reply,
      next: next({
        step: "choose_service",
        ...clearedBooking,
      }),
    };
  }

  // --- Cancel flow (before reschedule step-handlers) ---

  if (s.step === "await_cancel_confirm") {
    if (
      text.includes("don't cancel") ||
      text.includes("dont cancel") ||
      text.includes("do not cancel") ||
      text.includes("keep it") ||
      /\bno\b/.test(text) ||
      text.includes("never mind")
    ) {
      return {
        reply: `No problem — I did not cancel the appointment.`,
        next: next({
          step: "idle",
          selectedService: null,
          selectedSlot: null,
          selectedAppointment: null,
          selectedStaff: null,
          lastFlow: null,
        }),
      };
    }
    if (
      text.includes("confirm") ||
      text.includes("confirmed") ||
      text.includes("yes") ||
      text.includes("cancel it")
    ) {
      const appt = s.selectedAppointment ?? "appointment";
      return {
        reply: `Confirmed — your ${appt} has been canceled.`,
        next: next({
          step: "idle",
          selectedService: null,
          selectedSlot: null,
          selectedAppointment: null,
          selectedStaff: null,
          lastFlow: null,
        }),
      };
    }
    return {
      reply: `Please type "confirm" if you want me to cancel this appointment, or "no" to keep it.`,
      next: s,
    };
  }

  if (s.step === "choose_cancel_appointment") {
    const recent = s.recentBookedLine;
    if (recent) {
      const rl = recent.toLowerCase();
      const timeMatch = raw.match(/\d{1,2}:\d{2}/);
      const mentionsTime = Boolean(timeMatch && recent.includes(timeMatch[0]));
      if (
        mentionsTime ||
        (rl.includes("stress") && text.includes("stress")) ||
        (rl.includes("nutrition") && text.includes("nutrition")) ||
        (rl.includes("wellness") && (text.includes("wellness") || text.includes("amina"))) ||
        (rl.includes("follow-up") && (text.includes("follow") || text.includes("friday") || text.includes("carter"))) ||
        (rl.includes("routine") && text.includes("routine")) ||
        (rl.includes("urgent") && text.includes("urgent"))
      ) {
        return {
          reply: `Please confirm: do you want to cancel your ${recent}?`,
          next: next({
            selectedAppointment: recent,
            step: "await_cancel_confirm",
          }),
        };
      }
    }
    if (text.includes("wellness") || text.includes("amina") || text.includes("2:15")) {
      return {
        reply: `Please confirm: do you want to cancel your Wellness Consultation tomorrow at 2:15 PM with Nurse Amina?`,
        next: next({
          selectedAppointment: "Wellness Consultation — Tomorrow at 2:15 PM with Nurse Amina",
          step: "await_cancel_confirm",
        }),
      };
    }
    if (text.includes("follow") || text.includes("friday") || text.includes("carter")) {
      return {
        reply: `Please confirm: do you want to cancel your Follow-up Visit Friday at 10:30 AM with Dr. Carter?`,
        next: next({
          selectedAppointment: "Follow-up Visit — Friday at 10:30 AM with Dr. Carter",
          step: "await_cancel_confirm",
        }),
      };
    }
    return {
      reply: `Please choose one of these appointments:\n\n${upcomingBulletLines(s)}`,
      next: s,
    };
  }

  // --- Reschedule flow ---

  if (s.step === "await_reschedule_confirm") {
    if (
      /\bno\b/.test(text) ||
      text.includes("never mind") ||
      text.includes("keep it") ||
      text.includes("stop") ||
      text.includes("dont reschedule") ||
      text.includes("don't reschedule") ||
      text.includes("not reschedule") ||
      text.includes("do not change")
    ) {
      return {
        reply: `No problem — I did not reschedule the appointment.`,
        next: next({
          step: "idle",
          selectedService: null,
          selectedSlot: null,
          selectedAppointment: null,
          selectedStaff: null,
          lastFlow: null,
        }),
      };
    }
    if (affirmsRescheduleConfirm(text)) {
      return {
        reply: `Confirmed — your appointment has been rescheduled to ${s.selectedSlot}.`,
        next: next({
          step: "idle",
          selectedService: null,
          selectedSlot: null,
          selectedAppointment: null,
          selectedStaff: null,
          lastFlow: null,
        }),
      };
    }
    return {
      reply: `Please type "confirm" if you want me to reschedule this appointment, or "cancel" if you want to cancel the original appointment instead.`,
      next: s,
    };
  }

  if (s.step === "show_reschedule_slots") {
    if (text.includes("wednesday") || text.includes("11:00") || text.includes("patel")) {
      return {
        reply: `Please confirm: reschedule your appointment to Wednesday at 11:00 AM with Dr. Patel.`,
        next: next({ selectedSlot: "Wednesday at 11:00 AM with Dr. Patel", step: "await_reschedule_confirm" }),
      };
    }
    if (text.includes("tuesday") || text.includes("10:00")) {
      return {
        reply: `Please confirm: reschedule your appointment to Tuesday at 10:00 AM with Dr. Carter.`,
        next: next({ selectedSlot: "Tuesday at 10:00 AM with Dr. Carter", step: "await_reschedule_confirm" }),
      };
    }
    if (text.includes("3:30") || text.includes("nurse amina") || text.includes("amina")) {
      return {
        reply: `Please confirm: reschedule your appointment to Monday at 3:30 PM with Nurse Amina.`,
        next: next({ selectedSlot: "Monday at 3:30 PM with Nurse Amina", step: "await_reschedule_confirm" }),
      };
    }
    if (text.includes("monday at 1") || (text.includes("1:00") && !text.includes("11:00"))) {
      return {
        reply: `Please confirm: reschedule your appointment to Monday at 1:00 PM with Dr. Carter.`,
        next: next({ selectedSlot: "Monday at 1:00 PM with Dr. Carter", step: "await_reschedule_confirm" }),
      };
    }
    return {
      reply: `Please choose one of these times:

• Monday at 1:00 PM with Dr. Carter
• Monday at 3:30 PM with Nurse Amina
• Tuesday at 10:00 AM with Dr. Carter
• Wednesday at 11:00 AM with Dr. Patel`,
      next: s,
    };
  }

  if (s.step === "ask_reschedule_time") {
    const RESCHEDULE_SLOTS_REPLY = `Here are available times to reschedule:

• Monday at 1:00 PM with Dr. Carter
• Monday at 3:30 PM with Nurse Amina
• Tuesday at 10:00 AM with Dr. Carter
• Wednesday at 11:00 AM with Dr. Patel

Which one would you like?`;
    if (
      text.includes("sample") ||
      text.includes("samples") ||
      text.includes("example") ||
      text.includes("ideas") ||
      (text.includes("give") && text.includes("some"))
    ) {
      return {
        reply: `Here are some examples you can type:

• **Monday afternoon** or **Tuesday morning**
• **tomorrow** or **this week**
• **show me calendar** — I’ll list open times

When you’re ready, tell me your preferred day and time.`,
        next: s,
      };
    }
    if (
      text.includes("calendar") ||
      text.includes("show availability") ||
      text.includes("available times") ||
      text.includes("open slots")
    ) {
      return { reply: RESCHEDULE_SLOTS_REPLY, next: next({ step: "show_reschedule_slots" }) };
    }
    if (
      text.includes("monday") ||
      text.includes("tuesday") ||
      text.includes("wednesday") ||
      text.includes("thursday") ||
      text.includes("friday") ||
      text.includes("tomorrow") ||
      text.includes("afternoon") ||
      text.includes("morning") ||
      text.includes("weekend")
    ) {
      return { reply: RESCHEDULE_SLOTS_REPLY, next: next({ step: "show_reschedule_slots" }) };
    }
    return {
      reply: `What new day and time would you prefer? For example, "Monday afternoon" or "Tuesday morning."`,
      next: s,
    };
  }

  if (s.step === "choose_reschedule_appointment") {
    if (text.includes("friday") || text.includes("follow") || text.includes("carter")) {
      return {
        reply: `Sure — I can help reschedule your Follow-up Visit with Dr. Carter. What new day and time would you prefer?`,
        next: next({
          selectedAppointment: "Follow-up Visit — Friday at 10:30 AM with Dr. Carter",
          step: "ask_reschedule_time",
        }),
      };
    }
    if (text.includes("wellness") || text.includes("amina") || text.includes("2:15")) {
      return {
        reply: `Sure — I can help reschedule your Wellness Consultation with Nurse Amina. What new day and time would you prefer?`,
        next: next({
          selectedAppointment: "Wellness Consultation — Tomorrow at 2:15 PM with Nurse Amina",
          step: "ask_reschedule_time",
        }),
      };
    }
    return {
      reply: `Please choose one of these appointments:\n\n${upcomingBulletLines(s)}`,
      next: s,
    };
  }

  // --- Booking flow ---

  if (s.step === "await_confirm") {
    if (matchesRescheduleIntent(text)) {
      return {
        reply: `${STOP_BOOKING_PREFIX}\n\n${upcomingRescheduleList(s)}`,
        next: next({
          step: "choose_reschedule_appointment",
          selectedService: null,
          selectedSlot: null,
          selectedAppointment: null,
          selectedStaff: null,
          lastFlow: null,
        }),
      };
    }
    if (
      /\bno\b/.test(text) ||
      text.includes("never mind") ||
      text.includes("stop") ||
      text.includes("cancel this booking")
    ) {
      return {
        reply: `No problem — I did not book that appointment.`,
        next: next({
          step: "idle",
          selectedService: null,
          selectedSlot: null,
          selectedAppointment: null,
          selectedStaff: null,
          lastFlow: null,
        }),
      };
    }
    if (wantsToCancelIntent(text)) {
      return {
        reply: `${STOP_BOOKING_PREFIX}\n\n${upcomingCancelList(s)}`,
        next: next({
          step: "choose_cancel_appointment",
          selectedService: null,
          selectedSlot: null,
          selectedAppointment: null,
          selectedStaff: null,
          lastFlow: null,
        }),
      };
    }
    if (affirmsBookingConfirm(text)) {
      const svc = s.selectedService ?? "appointment";
      const slot = s.selectedSlot ?? "your chosen time";
      const recentBookedLine = `${svc} — Tomorrow at ${slot}`;
      return {
        reply: `Confirmed — your ${svc} is booked for tomorrow at ${slot}.`,
        next: next({ step: "booked", lastFlow: "booking", recentBookedLine }),
      };
    }
    return {
      reply: `Please type "confirm" if you want me to book this appointment, or "no" to stop this booking request.`,
      next: s,
    };
  }

  if (s.step === "show_slots") {
    const svc = s.selectedService ?? "service";
    if (text.includes("1:00") && !text.includes("11:00")) {
      return {
        reply: `Please confirm: ${svc} tomorrow at 1:00 PM with Nurse Amina.`,
        next: next({ selectedSlot: "1:00 PM with Nurse Amina", step: "await_confirm" }),
      };
    }
    if (text.includes("2:30")) {
      return {
        reply: `Please confirm: ${svc} tomorrow at 2:30 PM with Dr. Carter.`,
        next: next({ selectedSlot: "2:30 PM with Dr. Carter", step: "await_confirm" }),
      };
    }
    if (text.includes("3:00") || text.includes("patel")) {
      return {
        reply: `Please confirm: ${svc} tomorrow at 3:00 PM with Dr. Patel.`,
        next: next({ selectedSlot: "3:00 PM with Dr. Patel", step: "await_confirm" }),
      };
    }
    if (text.includes("4:15")) {
      return {
        reply: `Please confirm: ${svc} tomorrow at 4:15 PM with Nurse Amina.`,
        next: next({ selectedSlot: "4:15 PM with Nurse Amina", step: "await_confirm" }),
      };
    }
    // "yes" / "ok" when only one provider was offered
    if ((text === "yes" || text === "sure" || text === "ok" || text === "okay") && s.selectedStaff === "Dr. Carter") {
      return {
        reply: `Please confirm: ${svc} tomorrow at 2:30 PM with Dr. Carter.`,
        next: next({ selectedSlot: "2:30 PM with Dr. Carter", step: "await_confirm" }),
      };
    }
    if ((text === "yes" || text === "sure" || text === "ok" || text === "okay") && s.selectedStaff === "Dr. Patel") {
      return {
        reply: `Please confirm: ${svc} tomorrow at 3:00 PM with Dr. Patel.`,
        next: next({ selectedSlot: "3:00 PM with Dr. Patel", step: "await_confirm" }),
      };
    }
    const available = s.selectedStaff
      ? s.selectedStaff === "Dr. Carter"
        ? "2:30 PM"
        : s.selectedStaff === "Dr. Patel"
          ? "3:00 PM"
          : "1:00 PM or 4:15 PM"
      : "1:00 PM, 2:30 PM, or 4:15 PM";
    return { reply: `Please choose one of the available times: ${available}.`, next: s };
  }

  if (s.step === "ask_staff") {
    const svc = s.selectedService ?? "service";
    if (text.includes("earliest") || text.includes("any staff") || text.includes("whoever") || text.includes("anyone")) {
      return {
        reply: `Great — I found these available times for a ${svc} tomorrow afternoon:

1:00 PM with Nurse Amina
2:30 PM with Dr. Carter
4:15 PM with Nurse Amina

Which one would you like?`,
        next: next({ step: "show_slots", selectedStaff: null }),
      };
    }
    if (
      text.includes("specific") ||
      text.includes("staff member") ||
      text.includes("doctor") ||
      text.includes("provider") ||
      text.includes("amina") ||
      text.includes("carter") ||
      text.includes("patel")
    ) {
      if (text.includes("amina") || text.includes("nurse amina")) {
        return {
          reply: `Great — Nurse Amina is available for a ${svc} tomorrow afternoon at:\n\n1:00 PM\n4:15 PM\n\nWhich time would you like?`,
          next: next({ step: "show_slots", selectedStaff: "Nurse Amina" }),
        };
      }
      if (text.includes("carter")) {
        return {
          reply: `Great — Dr. Carter is available for a ${svc} tomorrow afternoon at:\n\n2:30 PM\n\nWould you like 2:30 PM?`,
          next: next({ step: "show_slots", selectedStaff: "Dr. Carter" }),
        };
      }
      if (text.includes("patel")) {
        return {
          reply: `Great — Dr. Patel is available for a ${svc} tomorrow afternoon at:\n\n3:00 PM\n\nWould you like 3:00 PM?`,
          next: next({ step: "show_slots", selectedStaff: "Dr. Patel" }),
        };
      }
      return {
        reply: `Sure — which provider would you prefer?\n\n${STAFF_CHOICE_BULLETS}`,
        next: next({ step: "choose_staff_member" }),
      };
    }
    return { reply: `Do you want the earliest available time, or do you prefer a specific staff member?`, next: s };
  }

  if (s.step === "choose_staff_member") {
    const svc = s.selectedService ?? "service";
    if (text.includes("amina") || text.includes("nurse")) {
      return {
        reply: `Great — Nurse Amina is available for a ${svc} tomorrow afternoon at:\n\n1:00 PM\n4:15 PM\n\nWhich time would you like?`,
        next: next({ step: "show_slots", selectedStaff: "Nurse Amina" }),
      };
    }
    if (text.includes("carter") || (text.includes("doctor") && text.includes("carter"))) {
      return {
        reply: `Great — Dr. Carter is available for a ${svc} tomorrow afternoon at:\n\n2:30 PM\n\nWould you like 2:30 PM?`,
        next: next({ step: "show_slots", selectedStaff: "Dr. Carter" }),
      };
    }
    if (text.includes("patel")) {
      return {
        reply: `Great — Dr. Patel is available for a ${svc} tomorrow afternoon at:\n\n3:00 PM\n\nWould you like 3:00 PM?`,
        next: next({ step: "show_slots", selectedStaff: "Dr. Patel" }),
      };
    }
    return {
      reply: `Please choose one provider by name:\n\n${STAFF_CHOICE_BULLETS}`,
      next: s,
    };
  }

  if (s.step === "ask_time") {
    const svc = s.selectedService ?? "service";
    // User wants to see a calendar or available dates — treat as "show me options for tomorrow"
    if (
      text.includes("calendar") ||
      text.includes("available dates") ||
      text.includes("open slots") ||
      text.includes("show availability") ||
      text.includes("available times") ||
      text.includes("show me calendar")
    ) {
      return {
        reply: `Here are available times for a ${svc} tomorrow afternoon:

1:00 PM with Nurse Amina
2:30 PM with Dr. Carter
4:15 PM with Nurse Amina

Which one works for you?`,
        next: next({ step: "show_slots" }),
      };
    }
    if (
      text.includes("tomorrow") ||
      text.includes("afternoon") ||
      text.includes("morning") ||
      text.includes("friday") ||
      text.includes("monday") ||
      text.includes("tuesday") ||
      text.includes("wednesday") ||
      text.includes("thursday") ||
      text.includes("weekend")
    ) {
      return {
        reply: `Got it — ${svc} for tomorrow afternoon.

Do you prefer a specific staff member, or the earliest available time?`,
        next: next({ step: "ask_staff" }),
      };
    }
    return {
      reply: `What day and time would you prefer for your ${svc}? For example, "tomorrow afternoon" or "Friday morning."`,
      next: s,
    };
  }

  if (
    wellnessTomorrowShortcut(text) &&
    !inRescheduleFlow(s.step) &&
    !inCancelFlow(s.step) &&
    (s.step === "idle" || s.step === "choose_service")
  ) {
    return {
      reply: `Hi ${firstName} — I can help book a wellness consultation for tomorrow afternoon.

Do you prefer a specific staff member, or the earliest available time?`,
      next: next({
        step: "ask_staff",
        selectedService: "Wellness Consultation",
        selectedSlot: null,
        selectedAppointment: null,
        lastFlow: null,
      }),
    };
  }

  if (s.step === "choose_service") {
    const svcPick = servicePickFromChooseService(text);
    if (svcPick) {
      return {
        reply: `Great — I can help book a ${svcPick}. What day and time works best for you?`,
        next: next({ selectedService: svcPick, step: "ask_time" }),
      };
    }
    return {
      reply: `Please choose one of these services: Wellness Consultation, Nutrition Check-in, Stress Management Session, Follow-up Visit, Routine Check-up, or Urgent Visit.`,
      next: s,
    };
  }

  // --- Globals (after step handlers) ---

  if (matchesShowServicesIntent(text)) {
    return {
      reply: SERVICES_LIST,
      next: next({
        step: "choose_service",
        selectedService: null,
        selectedSlot: null,
        selectedAppointment: null,
        selectedStaff: null,
        lastFlow: null,
      }),
    };
  }

  if (matchesStartCancelFlow(text)) {
    return {
      reply: upcomingCancelList(s),
      next: next({
        step: "choose_cancel_appointment",
        selectedAppointment: null,
        selectedSlot: null,
        selectedStaff: null,
        lastFlow: null,
      }),
    };
  }

  // Idle: direct service line (e.g. "Nutrition Check-in — 30 min — $45") without listing services first
  if (s.step === "idle") {
    const svc = servicePickFromIdle(text);
    if (svc && !matchesRescheduleIntent(text) && !matchesStartCancelFlow(text)) {
      return {
        reply: `Great — I can help book a ${svc}. What day and time works best for you?`,
        next: next({
          step: "ask_time",
          selectedService: svc,
          selectedSlot: null,
          selectedAppointment: null,
          lastFlow: null,
        }),
      };
    }
  }

  return {
    reply: `Hi ${firstName} — I can help you book, reschedule, or cancel an appointment. What would you like to do today?`,
    next: s,
  };
}

/** @deprecated Use computeClientDemoReply */
export function computeClientDemoBookingReply(
  input: string,
  state: ClientDemoBookingState,
  firstName: string,
): { reply: string; next: ClientDemoBookingState } | null {
  return computeClientDemoReply(input, state, firstName);
}
