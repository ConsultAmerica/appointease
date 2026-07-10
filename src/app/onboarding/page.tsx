"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { CANONICAL_DEFAULT_AVAILABILITY, CANONICAL_DEMO_SERVICES } from "@/lib/canonical-demo-catalog";
import { getBrowserTimezone, getTimezoneOptions } from "@/lib/timezones";

const defaultAvailability = [...CANONICAL_DEFAULT_AVAILABILITY];

export default function OnboardingPage() {
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const timezoneOptions = useMemo(() => getTimezoneOptions(), []);
  const [timezone, setTimezone] = useState(() => getBrowserTimezone());
  const [status, setStatus] = useState<string | null>(null);
  const [createdBusinessId, setCreatedBusinessId] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("Creating business...");
    setCreatedBusinessId(null);
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessName,
        ownerName,
        ownerEmail,
        ownerPassword,
        timezone,
        services: CANONICAL_DEMO_SERVICES.map((s) => ({
          name: s.name,
          durationMinutes: s.durationMinutes,
          priceCents: s.priceCents,
        })),
        availability: defaultAvailability,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error ?? "Failed to create business");
      return;
    }

    setCreatedBusinessId(typeof data.businessId === "string" ? data.businessId : null);
    setStatus("Business created. You can sign in as the owner and finish setup below.");
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <h1 className="text-2xl font-bold">Business onboarding</h1>
      <p className="mt-2 text-sm text-slate-600">Create account, starter services, and working hours.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-surface p-6">
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
        <button className="pro-btn-primary px-4 py-2">Create business</button>
      </form>

      {status && <p className="mt-4 rounded bg-slate-100 p-3 text-sm">{status}</p>}

      {createdBusinessId ? (
        <section className="mt-8 rounded-xl border border-blue-200 bg-blue-50/60 p-6">
          <h2 className="text-lg font-semibold text-slate-900">Next steps</h2>
          <p className="mt-2 text-sm text-slate-700">
            Sign in at <Link className="font-medium text-[color:var(--btn-secondary)] underline" href="/auth/login">/auth/login</Link> with
            the owner email you just used, then:
          </p>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-800">
            <li>
              <Link className="font-medium text-[color:var(--btn-secondary)] underline" href="/admin/settings">
                Add or edit services
              </Link>{" "}
              (starter services are already created).
            </li>
            <li>
              <Link className="font-medium text-[color:var(--btn-secondary)] underline" href="/admin/settings">
                Add staff
              </Link>{" "}
              and link them to the services they perform.
            </li>
            <li>
              <Link className="font-medium text-[color:var(--btn-secondary)] underline" href="/admin/settings">
                Set business hours
              </Link>{" "}
              and staff availability so booking slots line up.
            </li>
            <li>
              Open{" "}
              <Link className="font-medium text-[color:var(--btn-secondary)] underline" href="/chat">
                AI booking assistant
              </Link>{" "}
              (signed in as a customer linked to this clinic) to try natural-language booking.
            </li>
          </ol>
          <p className="mt-4 font-mono text-xs text-slate-600">businessId: {createdBusinessId}</p>
        </section>
      ) : null}
    </main>
  );
}
