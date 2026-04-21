"use client";

import { FormEvent, useMemo, useState } from "react";
import { getBrowserTimezone, getTimezoneOptions } from "@/lib/timezones";

const defaultAvailability = [
  { dayOfWeek: 1, startMinute: 9 * 60, endMinute: 17 * 60 },
  { dayOfWeek: 2, startMinute: 9 * 60, endMinute: 17 * 60 },
  { dayOfWeek: 3, startMinute: 9 * 60, endMinute: 17 * 60 },
  { dayOfWeek: 4, startMinute: 9 * 60, endMinute: 17 * 60 },
  { dayOfWeek: 5, startMinute: 9 * 60, endMinute: 17 * 60 },
];

export default function OnboardingPage() {
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const timezoneOptions = useMemo(() => getTimezoneOptions(), []);
  const [timezone, setTimezone] = useState(() => getBrowserTimezone());
  const [status, setStatus] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("Creating business...");
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessName,
        ownerName,
        ownerEmail,
        ownerPassword,
        timezone,
        services: [
          { name: "Consultation", durationMinutes: 30, priceCents: 5000 },
          { name: "Follow-up", durationMinutes: 45, priceCents: 7000 },
          { name: "Routine Check-up", durationMinutes: 20, priceCents: 4000 },
          { name: "Extended Consultation", durationMinutes: 60, priceCents: 9500 },
          { name: "Urgent Visit", durationMinutes: 25, priceCents: 8000 },
          { name: "Treatment Session", durationMinutes: 40, priceCents: 7800 },
        ],
        availability: defaultAvailability,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error ?? "Failed to create business");
      return;
    }

    setStatus(`Done! Business created. Use businessId: ${data.businessId}`);
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <h1 className="text-2xl font-bold">Business onboarding</h1>
      <p className="mt-2 text-sm text-slate-600">Create account, starter services, and working hours.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <label className="block text-sm">
          Business name
          <input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            required
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Owner name
          <input
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            required
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Owner email
          <input
            type="email"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            required
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Owner password
          <input
            type="password"
            minLength={8}
            value={ownerPassword}
            onChange={(e) => setOwnerPassword(e.target.value)}
            required
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Timezone
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          >
            {timezoneOptions.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">Used to display business hours and bookings correctly.</p>
        </label>
        <button className="rounded bg-slate-900 px-4 py-2 text-white">Create business</button>
      </form>

      {status && <p className="mt-4 rounded bg-slate-100 p-3 text-sm">{status}</p>}
    </main>
  );
}
