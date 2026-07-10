type HourRule = { dayOfWeek: number; startMinute: number; endMinute: number };

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function formatMinute(m: number) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  const d = new Date();
  d.setHours(h, min, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function ruleKey(r: HourRule) {
  return `${r.startMinute}-${r.endMinute}`;
}

/** Human-readable weekly hours from availability rules. */
export function summarizeBusinessHours(rules: HourRule[]): string {
  if (rules.length === 0) return "Hours not published";

  const byKey = new Map<string, number[]>();
  for (const r of rules) {
    const key = ruleKey(r);
    const days = byKey.get(key) ?? [];
    days.push(r.dayOfWeek);
    byKey.set(key, days);
  }

  const parts: string[] = [];
  for (const [key, days] of byKey) {
    const sorted = [...days].sort((a, b) => a - b);
    const [startMinute, endMinute] = key.split("-").map(Number);
    const range = `${formatMinute(startMinute)} – ${formatMinute(endMinute)}`;
    if (sorted.length === 7) {
      parts.push(`Daily ${range}`);
      continue;
    }
    const dayLabel =
      sorted.length === 1
        ? DAY_NAMES[sorted[0]]
        : sorted.length === 2
          ? `${DAY_NAMES[sorted[0]]} & ${DAY_NAMES[sorted[1]]}`
          : `${DAY_NAMES[sorted[0]]}–${DAY_NAMES[sorted[sorted.length - 1]]}`;
    parts.push(`${dayLabel} ${range}`);
  }
  return parts.join(" · ");
}

export function todayHoursLabel(rules: HourRule[], now = new Date()): string | null {
  const dow = now.getDay();
  const today = rules.filter((r) => r.dayOfWeek === dow);
  if (today.length === 0) return null;
  const start = Math.min(...today.map((r) => r.startMinute));
  const end = Math.max(...today.map((r) => r.endMinute));
  return `Today ${formatMinute(start)} – ${formatMinute(end)}`;
}

export function isOpenNow(rules: HourRule[], now = new Date()): boolean {
  const dow = now.getDay();
  const minute = now.getHours() * 60 + now.getMinutes();
  return rules.some((r) => r.dayOfWeek === dow && minute >= r.startMinute && minute < r.endMinute);
}
