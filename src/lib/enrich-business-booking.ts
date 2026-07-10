import { isOpenNow, summarizeBusinessHours, todayHoursLabel } from "@/lib/business-hours-summary";
import { clinicThemeForIndex } from "@/lib/clinic-theme";
import { prisma } from "@/lib/prisma";

export async function enrichBusinessesForBooking(
  businesses: Array<{
    id: string;
    name: string;
    timezone: string;
    services: Array<{
      id: string;
      name: string;
      durationMinutes: number;
      priceCents: number;
    }>;
  }>,
) {
  const ids = businesses.map((b) => b.id);
  const rules = ids.length
    ? await prisma.availabilityRule.findMany({
        where: { businessId: { in: ids } },
        select: { businessId: true, dayOfWeek: true, startMinute: true, endMinute: true },
      })
    : [];

  const rulesByBusiness = new Map<string, typeof rules>();
  for (const r of rules) {
    const list = rulesByBusiness.get(r.businessId) ?? [];
    list.push(r);
    rulesByBusiness.set(r.businessId, list);
  }

  return businesses.map((b, index) => {
    const bizRules = rulesByBusiness.get(b.id) ?? [];
    const theme = clinicThemeForIndex(index);
    const tzLabel = b.timezone.replace(/_/g, " ");
    return {
      ...b,
      colorIndex: theme.id,
      locationLabel: tzLabel,
      hoursSummary: summarizeBusinessHours(bizRules),
      todayHours: todayHoursLabel(bizRules),
      openNow: isOpenNow(bizRules),
      serviceCount: b.services.length,
    };
  });
}
