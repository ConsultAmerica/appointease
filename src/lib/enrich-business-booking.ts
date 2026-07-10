import { isOpenNow, summarizeBusinessHours, todayHoursLabel } from "@/lib/business-hours-summary";
import { clinicThemeForIndex } from "@/lib/clinic-theme";
import { prisma } from "@/lib/prisma";

type BusinessRow = {
  id: string;
  name: string;
  timezone: string;
  createdAt: Date;
  services: Array<{
    id: string;
    name: string;
    durationMinutes: number;
    priceCents: number;
  }>;
};

function normalizeNameKey(name: string): string {
  return name.trim().toLowerCase();
}

/** Same timezone + service catalog → likely duplicate onboarding (e.g. "aw" vs "AWS"). */
function catalogFingerprint(b: BusinessRow): string {
  const serviceNames = b.services
    .map((s) => s.name.trim().toLowerCase())
    .sort()
    .join("|");
  return `${b.timezone}|${serviceNames}`;
}

function preferBusiness(a: BusinessRow, b: BusinessRow): BusinessRow {
  const score = (row: BusinessRow) => {
    let s = 0;
    const len = row.name.trim().length;
    if (len >= 3) s += 20;
    if (/demo|wellness|harmony|spa|clinic/i.test(row.name)) s += 10;
    s += len;
    return s;
  };
  const diff = score(a) - score(b);
  if (diff !== 0) return diff > 0 ? a : b;
  return a.createdAt >= b.createdAt ? a : b;
}

/** Drop duplicate clinics for guest booking (same name or identical catalog). */
export function dedupeBusinessesForBooking(businesses: BusinessRow[]): BusinessRow[] {
  const byName = new Map<string, BusinessRow>();
  for (const b of businesses) {
    const key = normalizeNameKey(b.name);
    const existing = byName.get(key);
    byName.set(key, existing ? preferBusiness(existing, b) : b);
  }

  const afterName = [...byName.values()];
  const byCatalog = new Map<string, BusinessRow>();
  for (const b of afterName) {
    const key = catalogFingerprint(b);
    const existing = byCatalog.get(key);
    byCatalog.set(key, existing ? preferBusiness(existing, b) : b);
  }

  return [...byCatalog.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function enrichBusinessesForBooking(businesses: BusinessRow[]) {
  const unique = dedupeBusinessesForBooking(businesses);
  const ids = unique.map((b) => b.id);
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

  return unique.map((b, index) => {
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
