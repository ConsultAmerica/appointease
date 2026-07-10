export type Service = {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
};

export type Clinic = {
  id: string;
  name: string;
  timezone: string;
  services: Service[];
  colorIndex: number;
  locationLabel: string;
  hoursSummary: string;
  todayHours: string | null;
  openNow: boolean;
  serviceCount: number;
};

export type Provider = {
  id: string;
  fullName: string;
  specialty: string;
  services: Service[];
  nextAvailable: { date: string; iso: string; label: string } | null;
};

export type Slot = {
  iso: string;
  label: string;
  status: "open" | "limited" | "unavailable";
};

export const BOOKING_STEPS = ["Clinic", "Provider", "Schedule", "Confirm"] as const;

export function formatPrice(cents: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(cents / 100);
}

export function localISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
