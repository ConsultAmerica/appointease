/** Scripted NZ Wellness Clinic portfolio copy (demo / no OpenAI). Replace with API data later. */

import { formatCanonicalServiceBullets } from "@/lib/canonical-demo-catalog";

export const DEMO_NZ_SERVICES_REPLY = `Here are the available services at NZ Wellness Clinic:

${formatCanonicalServiceBullets()}

Which service would you like to book?`;

export const DEMO_NZ_UPCOMING_WITH_SAMPLES = `Here are your upcoming appointments:

• Wellness Consultation — Tomorrow at 2:15 PM with Nurse Amina
• Follow-up Visit — Friday at 10:30 AM with Dr. Carter

Would you like to reschedule or cancel any of these?`;

export const DEMO_NZ_UPCOMING_EMPTY = "You don't have any upcoming appointments right now.";

export function matchesDemoServicesQuery(lower: string) {
  return (
    lower.includes("service") ||
    lower.includes("available services") ||
    lower.includes("what do you offer")
  );
}

export function matchesDemoUpcomingAppointmentsQuery(lower: string) {
  return (
    lower.includes("my appointments") ||
    lower.includes("show my appointments") ||
    lower.includes("upcoming appointments")
  );
}
