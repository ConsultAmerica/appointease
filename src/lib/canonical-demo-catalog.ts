/**
 * Single source of truth for portfolio / demo clinic services and staff–service links.
 * Used by Prisma seed, admin reset-demo, onboarding defaults, and new-business registration.
 */
export const CANONICAL_DEMO_SERVICES = [
  { name: "Wellness Consultation", durationMinutes: 30, priceCents: 5000, bufferMinutesAfter: 5 },
  { name: "Nutrition Check-in", durationMinutes: 30, priceCents: 4500, bufferMinutesAfter: 0 },
  { name: "Stress Management Session", durationMinutes: 45, priceCents: 6500, bufferMinutesAfter: 10 },
  { name: "Follow-up Visit", durationMinutes: 20, priceCents: 3000, bufferMinutesAfter: 0 },
  { name: "Routine Check-up", durationMinutes: 20, priceCents: 4000, bufferMinutesAfter: 0 },
  { name: "Urgent Visit", durationMinutes: 25, priceCents: 8000, bufferMinutesAfter: 0 },
] as const;

export type CanonicalDemoServiceName = (typeof CANONICAL_DEMO_SERVICES)[number]["name"];

export const CANONICAL_DEMO_STAFF: ReadonlyArray<{
  fullName: string;
  /** Unique per deployment; seed uses fixed addresses, reset-demo uses suffixed addresses. */
  email: string;
  serviceNames: readonly CanonicalDemoServiceName[];
}> = [
  {
    fullName: "Nurse Amina",
    email: "amina.staff@demo-clinic.com",
    serviceNames: ["Wellness Consultation", "Nutrition Check-in"],
  },
  {
    fullName: "Dr. Carter",
    email: "carter.staff@demo-clinic.com",
    serviceNames: ["Follow-up Visit", "Stress Management Session"],
  },
  {
    fullName: "Dr. Patel",
    email: "patel.staff@demo-clinic.com",
    serviceNames: ["Routine Check-up", "Urgent Visit"],
  },
];

/** Human-readable bullets for chat / marketing copy (matches `CANONICAL_DEMO_SERVICES`). */
export function formatCanonicalServiceBullets(): string {
  return CANONICAL_DEMO_SERVICES.map(
    (s) => `• ${s.name} — ${s.durationMinutes} min — $${(s.priceCents / 100).toFixed(0)}`,
  ).join("\n");
}

export const CANONICAL_DEFAULT_AVAILABILITY = [
  { dayOfWeek: 0, startMinute: 9 * 60, endMinute: 17 * 60 },
  { dayOfWeek: 1, startMinute: 9 * 60, endMinute: 17 * 60 },
  { dayOfWeek: 2, startMinute: 9 * 60, endMinute: 17 * 60 },
  { dayOfWeek: 3, startMinute: 9 * 60, endMinute: 17 * 60 },
  { dayOfWeek: 4, startMinute: 9 * 60, endMinute: 17 * 60 },
  { dayOfWeek: 5, startMinute: 9 * 60, endMinute: 17 * 60 },
  { dayOfWeek: 6, startMinute: 9 * 60, endMinute: 17 * 60 },
] as const;
