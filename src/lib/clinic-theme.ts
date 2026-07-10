/** Subdued clinic accents — professional healthcare palette. */
export const CLINIC_THEMES = [
  {
    id: 0,
    border: "border-blue-600",
    borderSoft: "border-blue-200",
    bg: "bg-blue-50",
    accent: "bg-blue-600",
    accentText: "text-blue-700",
    ring: "ring-blue-200",
    gradient: "from-blue-600 to-blue-800",
    dot: "bg-blue-600",
  },
  {
    id: 1,
    border: "border-slate-500",
    borderSoft: "border-slate-200",
    bg: "bg-slate-50",
    accent: "bg-slate-700",
    accentText: "text-slate-700",
    ring: "ring-slate-200",
    gradient: "from-slate-600 to-slate-800",
    dot: "bg-slate-500",
  },
  {
    id: 2,
    border: "border-sky-600",
    borderSoft: "border-sky-200",
    bg: "bg-sky-50",
    accent: "bg-sky-600",
    accentText: "text-sky-700",
    ring: "ring-sky-200",
    gradient: "from-sky-600 to-sky-800",
    dot: "bg-sky-600",
  },
  {
    id: 3,
    border: "border-indigo-600",
    borderSoft: "border-indigo-200",
    bg: "bg-indigo-50",
    accent: "bg-indigo-600",
    accentText: "text-indigo-700",
    ring: "ring-indigo-200",
    gradient: "from-indigo-600 to-indigo-800",
    dot: "bg-indigo-600",
  },
] as const;

export function clinicThemeForIndex(index: number) {
  return CLINIC_THEMES[index % CLINIC_THEMES.length];
}

export type SlotAvailabilityStatus = "open" | "limited" | "unavailable";

export function slotStatusForDay(totalSlots: number, slotIndex: number): SlotAvailabilityStatus {
  if (totalSlots === 0) return "unavailable";
  if (totalSlots <= 2) return "limited";
  if (slotIndex >= totalSlots - 2) return "limited";
  return "open";
}

export const SLOT_STATUS_STYLES: Record<
  SlotAvailabilityStatus,
  { base: string; selected: string; label: string }
> = {
  open: {
    label: "Available",
    base: "border-[color:var(--border)] bg-surface text-[color:var(--foreground)] hover:border-[color:var(--success)] hover:bg-emerald-50",
    selected: "border-[color:var(--success)] bg-[color:var(--success)] text-white shadow-sm",
  },
  limited: {
    label: "Limited",
    base: "border-amber-200 bg-amber-50 text-amber-950 hover:border-[color:var(--warning)]",
    selected: "border-[color:var(--warning)] bg-[color:var(--warning)] text-white shadow-sm",
  },
  unavailable: {
    label: "Unavailable",
    base: "cursor-not-allowed border-red-200 bg-red-50 text-red-400",
    selected: "border-[color:var(--error)] bg-red-100 text-red-500",
  },
};

/** Primary action color classes used across booking UI. */
export const PRO = {
  btn: "pro-btn-primary px-5 py-2.5 text-sm disabled:opacity-50",
  btnOutline: "pro-btn-secondary px-5 py-2.5 text-sm disabled:opacity-40",
  chipActive: "rounded-md bg-[color:var(--btn-primary)] px-3 py-1.5 text-xs font-medium text-white shadow-sm",
  chip: "rounded-md border border-[color:var(--border)] bg-surface px-3 py-1.5 text-xs font-medium text-[color:var(--foreground)] hover:border-slate-400",
  card: "rounded-lg border border-[color:var(--border)] bg-surface shadow-sm",
  cardSelected: "rounded-lg border-2 border-[color:var(--btn-primary)] bg-surface shadow-sm",
  stepActive: "bg-[color:var(--btn-primary)] text-white ring-4 ring-blue-100",
  stepDone: "bg-[color:var(--success)] text-white",
  stepIdle: "bg-slate-100 text-slate-500",
  heading: "text-lg font-semibold tracking-tight text-[color:var(--foreground)]",
  subtext: "mt-1 text-sm text-slate-500",
} as const;
