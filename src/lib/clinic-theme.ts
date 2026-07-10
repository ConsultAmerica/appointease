/** Color-coded clinic identities for multi-clinic booking UX. */
export const CLINIC_THEMES = [
  {
    id: 0,
    border: "border-blue-500",
    borderSoft: "border-blue-200",
    bg: "bg-blue-50",
    accent: "bg-blue-600",
    accentText: "text-blue-700",
    ring: "ring-blue-200",
    gradient: "from-blue-500 to-blue-600",
    dot: "bg-blue-500",
  },
  {
    id: 1,
    border: "border-emerald-500",
    borderSoft: "border-emerald-200",
    bg: "bg-emerald-50",
    accent: "bg-emerald-600",
    accentText: "text-emerald-700",
    ring: "ring-emerald-200",
    gradient: "from-emerald-500 to-emerald-600",
    dot: "bg-emerald-500",
  },
  {
    id: 2,
    border: "border-violet-500",
    borderSoft: "border-violet-200",
    bg: "bg-violet-50",
    accent: "bg-violet-600",
    accentText: "text-violet-700",
    ring: "ring-violet-200",
    gradient: "from-violet-500 to-violet-600",
    dot: "bg-violet-500",
  },
  {
    id: 3,
    border: "border-teal-500",
    borderSoft: "border-teal-200",
    bg: "bg-teal-50",
    accent: "bg-teal-600",
    accentText: "text-teal-700",
    ring: "ring-teal-200",
    gradient: "from-teal-500 to-teal-600",
    dot: "bg-teal-500",
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
    base: "border-emerald-200 bg-emerald-50 text-emerald-900 hover:border-emerald-300",
    selected: "border-emerald-600 bg-emerald-600 text-white shadow-sm",
  },
  limited: {
    label: "Limited",
    base: "border-amber-200 bg-amber-50 text-amber-900 hover:border-amber-300",
    selected: "border-amber-600 bg-amber-600 text-white shadow-sm",
  },
  unavailable: {
    label: "Unavailable",
    base: "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400",
    selected: "border-slate-300 bg-slate-200 text-slate-500",
  },
};
