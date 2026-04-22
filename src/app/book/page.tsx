"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { formatAuthApiError } from "@/lib/auth-client";

type Service = {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
};
type Business = { id: string; name: string; services: Service[] };
type Slot = { iso: string; label: string };

const STEPS = ["Service", "Date", "Time", "Confirm"] as const;

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function localISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Month grid calendar — matches “Pick a Date” reference (nav + weekday row + selectable cells). */
function BookCalendar({
  value,
  onChange,
}: {
  value: string;
  onChange: (iso: string) => void;
}) {
  const [viewMonth, setViewMonth] = useState(() => {
    const [y, m] = value.split("-").map(Number);
    return new Date(y, m - 1, 1);
  });

  const todayIso = useMemo(() => localISODate(new Date()), []);

  const year = viewMonth.getFullYear();
  const monthIndex = viewMonth.getMonth();
  const monthLabel = viewMonth.toLocaleString(undefined, { month: "long", year: "numeric" });

  const firstDow = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const cells: { day: number; inMonth: boolean }[] = [];
  for (let i = 0; i < firstDow; i++) {
    cells.push({ day: 0, inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, inMonth: true });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ day: 0, inMonth: false });
  }

  function goPrev() {
    setViewMonth(new Date(year, monthIndex - 1, 1));
  }
  function goNext() {
    setViewMonth(new Date(year, monthIndex + 1, 1));
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={goPrev}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
          aria-label="Previous month"
        >
          ‹
        </button>
        <h3 className="min-w-0 flex-1 text-center text-base font-semibold text-slate-900">{monthLabel}</h3>
        <button
          type="button"
          onClick={goNext}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
          aria-label="Next month"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="pb-2 text-[11px] font-medium uppercase tracking-wide text-slate-400 sm:text-xs">
            {w}
          </div>
        ))}
        {cells.map((cell, idx) => {
          if (!cell.inMonth || cell.day === 0) {
            return <div key={`e-${idx}`} className="aspect-square min-h-[2.25rem]" />;
          }
          const iso = localISODate(new Date(year, monthIndex, cell.day));
          const isSelected = value === iso;
          const isPast = iso < todayIso;
          return (
            <button
              key={iso}
              type="button"
              disabled={isPast}
              onClick={() => onChange(iso)}
              className={`aspect-square min-h-[2.25rem] rounded-lg text-sm font-medium transition ${
                isPast
                  ? "cursor-not-allowed text-slate-300"
                  : isSelected
                    ? "bg-teal-100 font-semibold text-teal-800 ring-2 ring-teal-200"
                    : "text-slate-800 hover:bg-slate-100"
              }`}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const CARD_PALETTE = [
  "from-violet-500 to-violet-600",
  "from-emerald-500 to-emerald-600",
  "from-teal-500 to-teal-600",
  "from-rose-500 to-rose-600",
  "from-teal-500 to-teal-600",
  "from-orange-500 to-orange-600",
];

function formatPrice(cents: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(cents / 100);
}

function serviceBlurb(name: string) {
  return `Book a professional ${name.toLowerCase()} session. Duration and pricing shown below.`;
}

/** Map Prisma/API payloads (extra fields ok) to the shape the wizard uses. */
function normalizeBusinesses(raw: unknown): Business[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row): Business | null => {
      if (!row || typeof row !== "object") return null;
      const b = row as Record<string, unknown>;
      const id = typeof b.id === "string" ? b.id : null;
      const name = typeof b.name === "string" ? b.name : null;
      if (!id || !name) return null;
      const servicesRaw = b.services;
      const services: Service[] = [];
      if (Array.isArray(servicesRaw)) {
        for (const s of servicesRaw) {
          if (!s || typeof s !== "object") continue;
          const sv = s as Record<string, unknown>;
          const sid = typeof sv.id === "string" ? sv.id : null;
          const sname = typeof sv.name === "string" ? sv.name : null;
          const duration =
            typeof sv.durationMinutes === "number" ? sv.durationMinutes : Number(sv.durationMinutes);
          const price = typeof sv.priceCents === "number" ? sv.priceCents : Number(sv.priceCents);
          if (!sid || !sname || !Number.isFinite(duration) || !Number.isFinite(price)) continue;
          services.push({
            id: sid,
            name: sname,
            durationMinutes: duration,
            priceCents: price,
          });
        }
      }
      return { id, name, services };
    })
    .filter((b): b is Business => b !== null);
}

export default function BookPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessId, setBusinessId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<Slot[]>([]);
  /** True when the business has no hours for this weekday (e.g. old seed was Mon–Fri only). */
  const [slotsClosedDay, setSlotsClosedDay] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [nameDraft, setNameDraft] = useState<string | undefined>(undefined);
  const [emailDraft, setEmailDraft] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<{ ref: string; email: string } | null>(null);
  const [businessesLoaded, setBusinessesLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  const displayName = nameDraft !== undefined ? nameDraft : (session?.user?.name ?? "");
  const displayEmail = emailDraft !== undefined ? emailDraft : (session?.user?.email ?? "");

  const customerBusinessId =
    session?.user?.role === "CUSTOMER" && session.user.businessId ? session.user.businessId : null;

  /**
   * Only one active /api/businesses request. Older requests are aborted when a new one starts.
   * We must not treat `signal.aborted` alone as "skip UI" — timeout also aborts the signal, which
   * previously left businessesLoaded false forever.
   */
  const businessesFetchRef = useRef<AbortController | null>(null);
  /** Monotonic id so only the latest in-flight load may flip `businessesLoaded` — avoids stuck spinner when a superseded fetch’s `finally` skips setting loaded. */
  const businessesLoadSeq = useRef(0);

  const loadBusinesses = useCallback(async () => {
    const seq = ++businessesLoadSeq.current;
    const isCurrent = () => businessesLoadSeq.current === seq;

    businessesFetchRef.current?.abort();
    const controller = new AbortController();
    businessesFetchRef.current = controller;

    setLoadError(null);
    setBusinessesLoaded(false);
    const timeout = window.setTimeout(() => controller.abort(), 18_000);

    try {
      const res = await fetch("/api/businesses", {
        cache: "no-store",
        credentials: "include",
        signal: controller.signal,
      });

      if (!isCurrent()) return;

      let data: unknown;
      try {
        data = await res.json();
      } catch {
        if (!isCurrent()) return;
        setLoadError("Invalid response from server. Try refreshing the page.");
        return;
      }

      if (!isCurrent()) return;

      const payload = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
      if (!res.ok) {
        const msg =
          typeof payload.error === "string" && payload.error.trim()
            ? payload.error
            : `Could not load businesses (HTTP ${res.status}).`;
        setLoadError(`${msg} Check that Postgres is running and DATABASE_URL in .env is correct.`);
        return;
      }

      const list = normalizeBusinesses(payload.businesses);
      setBusinesses(list);
      if (list.length === 0) return;

      const preferred = customerBusinessId
        ? list.find((b) => b.id === customerBusinessId) ?? list[0]
        : list[0];
      setBusinessId(preferred.id);
      setServiceId(preferred.services?.[0]?.id ?? "");
    } catch (e) {
      if (!isCurrent()) return;
      const aborted = e instanceof Error && e.name === "AbortError";
      if (aborted) {
        setLoadError(
          "Request timed out (18s). Start Postgres / check DATABASE_URL, or confirm the dev server is reachable.",
        );
      } else {
        setLoadError("Could not reach the server. Check your network and that the dev server is running.");
      }
    } finally {
      window.clearTimeout(timeout);
      if (isCurrent()) {
        setBusinessesLoaded(true);
      }
    }
  }, [customerBusinessId]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadBusinesses();
    });
  }, [loadBusinesses]);

  const services = useMemo(
    () => businesses.find((b) => b.id === businessId)?.services ?? [],
    [businesses, businessId],
  );

  const businessOptions = useMemo(() => {
    if (!customerBusinessId) return businesses;
    const match = businesses.filter((b) => b.id === customerBusinessId);
    return match.length ? match : businesses;
  }, [businesses, customerBusinessId]);

  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceId),
    [services, serviceId],
  );

  const businessName = businesses.find((b) => b.id === businessId)?.name ?? "";

  useEffect(() => {
    if (!businessId || !serviceId || !date) return;

    setSlotsClosedDay(false);
    fetch(`/api/businesses/${businessId}/availability?date=${encodeURIComponent(date)}&serviceId=${encodeURIComponent(serviceId)}`, {
      cache: "no-store",
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data: { slots?: Slot[]; closedDay?: boolean }) => {
        setSlots(Array.isArray(data.slots) ? data.slots : []);
        setSlotsClosedDay(Boolean(data.closedDay));
        setSelectedSlot("");
      })
      .catch(() => {
        setSlots([]);
        setSlotsClosedDay(false);
        setSelectedSlot("");
      });
  }, [businessId, serviceId, date]);

  function goNext() {
    setStatus(null);
    if (step === 1 && !serviceId) {
      setStatus("Please choose a service.");
      return;
    }
    if (step === 2 && !date) {
      setStatus("Please choose a date.");
      return;
    }
    if (step === 3 && !selectedSlot) {
      setStatus("Please choose a time slot.");
      return;
    }
    setStep((s) => Math.min(4, s + 1));
  }

  function goBack() {
    setStatus(null);
    setStep((s) => Math.max(1, s - 1));
  }

  async function submitBooking(e: FormEvent) {
    e.preventDefault();
    const customerName = displayName.trim();
    const customerEmail = displayEmail.trim();
    if (!customerName || !customerEmail) {
      setStatus("Name and email are required.");
      return;
    }

    setStatus("Sending your request…");
    setBookingSuccess(null);

    const res = await fetch("/api/bookings", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId,
        serviceId,
        customerName,
        customerEmail,
        startAt: selectedSlot,
      }),
    });
    let data: { error?: string; details?: string; appointment?: { id: string } } = {};
    try {
      data = await res.json();
    } catch {
      setStatus(`Booking failed (HTTP ${res.status}).`);
      return;
    }
    if (res.ok && data.appointment?.id) {
      setStatus(null);
      setBookingSuccess({
        ref: data.appointment.id.slice(0, 8),
        email: customerEmail,
      });
    } else {
      setStatus(formatAuthApiError(data));
    }
  }

  /** Hide wizard title only on the success screen so it doesn’t repeat the pending message. */
  const hideWizardIntro =
    businessesLoaded && !loadError && businesses.length > 0 && Boolean(bookingSuccess);

  const loadingBusinesses = !businessesLoaded && !loadError;
  const canStartWizard =
    businessesLoaded && !loadError && businesses.length > 0 && !bookingSuccess;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
      {!hideWizardIntro && (
        <>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Book appointment</h1>
          {canStartWizard ? (
            <p className="mt-1 text-sm text-slate-600">
              Complete each step. Your request stays <strong>pending</strong> until the business confirms.
            </p>
          ) : loadingBusinesses ? (
            <p className="mt-1 text-sm text-slate-500">Loading services and locations…</p>
          ) : null}
        </>
      )}

      {loadingBusinesses && (
        <div
          className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-14 shadow-sm ring-1 ring-slate-100"
          role="status"
          aria-live="polite"
        >
          <div
            className="h-10 w-10 animate-spin rounded-full border-2 border-teal-700 border-t-transparent"
            aria-hidden
          />
          <p className="mt-4 text-sm font-medium text-slate-800">Loading services…</p>
          <p className="mt-1 max-w-sm text-center text-xs text-slate-500">
            This should only take a moment. If it keeps spinning, refresh the page or try again in a little while.
          </p>
        </div>
      )}

      {businessesLoaded && loadError && (
        <div className="mt-6 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900" role="alert">
          <p className="font-semibold">Could not load booking options</p>
          <p className="mt-2">{loadError}</p>
          <button
            type="button"
            onClick={() => void loadBusinesses()}
            className="mt-3 rounded-lg bg-rose-900 px-4 py-2 text-sm font-medium text-white hover:bg-rose-800"
          >
            Try again
          </button>
        </div>
      )}

      {businessesLoaded && !loadError && businesses.length === 0 && (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-semibold">No businesses found — seed the database or register a business.</p>
          <p className="mt-2">
            Run <code className="rounded bg-amber-100 px-1">npm run db:seed</code> in the project root, then{" "}
            <button
              type="button"
              onClick={() => void loadBusinesses()}
              className="font-medium text-amber-900 underline"
            >
              reload
            </button>
            .
          </p>
        </div>
      )}

      {businessesLoaded && !loadError && businesses.length > 0 && bookingSuccess && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-100 sm:p-8">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Booking request sent</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-700">
            Reference: <span className="font-mono font-medium text-slate-900">{bookingSuccess.ref}</span>… Pending until the
            business confirms.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-slate-700">
            No account or sign-in is required — your request is safely on file. We will send updates to{" "}
            <span className="font-medium text-slate-900">{bookingSuccess.email}</span>.
          </p>
          {sessionStatus === "authenticated" && session?.user?.role === "CUSTOMER" ? (
            <p className="mt-4 text-sm text-slate-700">
              View this booking under{" "}
              <Link href="/customer" className="font-semibold text-teal-700 underline hover:text-teal-800">
                My appointments
              </Link>
              .
            </p>
          ) : (
            <p className="mt-4 text-sm leading-relaxed text-slate-700">
              Optional:{" "}
              <Link href="/auth/register" className="font-semibold text-teal-700 underline hover:text-teal-800">
                Register
              </Link>{" "}
              or{" "}
              <Link href="/auth/login" className="font-semibold text-teal-700 underline hover:text-teal-800">
                sign in
              </Link>{" "}
              with the same email to track this and future bookings under{" "}
              <Link href="/customer" className="font-semibold text-teal-700 underline hover:text-teal-800">
                My appointments
              </Link>
              .
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              setBookingSuccess(null);
              setStep(1);
              setSelectedSlot("");
              setStatus(null);
            }}
            className="mt-6 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Book another appointment
          </button>
        </section>
      )}

      {businessesLoaded && !loadError && businesses.length > 0 && !bookingSuccess && (
        <>
          <StepIndicator step={step} />

          {businessOptions.length > 1 && step === 1 && (
            <label className="mb-6 block text-sm font-medium text-slate-700">
              Location
              <select
                value={businessId}
                onChange={(e) => {
                  setBusinessId(e.target.value);
                  const first = businesses.find((b) => b.id === e.target.value)?.services[0];
                  setServiceId(first?.id ?? "");
                }}
                className="mt-1 w-full max-w-md rounded-lg border border-slate-300 px-3 py-2"
              >
                {businessOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {step === 1 && (
            <section>
              <h2 className="text-lg font-semibold text-slate-900">Choose a service</h2>
              <p className="mt-1 text-sm text-slate-500">Select one option to continue.</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {services.map((service, idx) => {
                  const selected = serviceId === service.id;
                  const palette = CARD_PALETTE[idx % CARD_PALETTE.length];
                  const initial = service.name.trim().charAt(0).toUpperCase();
                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => setServiceId(service.id)}
                      className={`relative flex flex-col rounded-xl border-2 bg-white p-4 text-left transition-shadow hover:shadow-md ${
                        selected ? "border-teal-700 ring-2 ring-teal-100" : "border-slate-200"
                      }`}
                    >
                      {selected && (
                        <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-teal-700 text-xs text-white">
                          ✓
                        </span>
                      )}
                      <div className="flex gap-3">
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-lg font-bold text-white ${palette}`}
                        >
                          {initial}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900">{service.name}</p>
                          <p className="mt-1 line-clamp-2 text-sm text-slate-600">{serviceBlurb(service.name)}</p>
                          <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
                            <span className="inline-flex items-center gap-1">
                              <span aria-hidden>🕐</span>
                              {service.durationMinutes} min
                            </span>
                            <span className="inline-flex items-center gap-1 font-medium text-slate-900">
                              <span aria-hidden>🏷</span>
                              {formatPrice(service.priceCents ?? 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-8">
              <h2 className="text-lg font-semibold text-slate-900">Pick a Date</h2>
              <p className="mt-1 text-sm text-slate-500">
                Choose an available day. Hours depend on what the business configured (often includes weekends).
              </p>
              <div className="mx-auto mt-6 max-w-md">
                <BookCalendar key={date} value={date} onChange={setDate} />
              </div>
            </section>
          )}

          {step === 3 && (
            <section>
              <h2 className="text-lg font-semibold text-slate-900">Choose a time</h2>
              <p className="mt-1 text-sm text-slate-500">
                {selectedService?.name} · {formatPrice(selectedService?.priceCents ?? 0)}
              </p>
              <div className="mt-6">
                {slots.length === 0 ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                    {slotsClosedDay ? (
                      <>
                        <p className="font-medium">No bookings on this day of the week</p>
                        <p className="mt-2 text-amber-900">
                          This business has no hours set for{" "}
                          {new Date(date + "T12:00:00").toLocaleDateString(undefined, { weekday: "long" })}s. Choose
                          another day, or ask the business to add availability for that weekday in admin settings.
                        </p>
                        <p className="mt-2 text-xs text-amber-800">
                          If you just seeded the DB with an older script, run{" "}
                          <code className="rounded bg-amber-100 px-1">npm run db:seed</code> to refresh demo hours (weekends
                          included), or add weekend rules in the database.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium">All slots are taken for this date</p>
                        <p className="mt-2 text-amber-900">Go back and pick another day with open times.</p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                    {slots.map((slot) => (
                      <button
                        key={slot.iso}
                        type="button"
                        onClick={() => setSelectedSlot(slot.iso)}
                        className={`rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                          selectedSlot === slot.iso
                            ? "border-teal-700 bg-teal-50 text-teal-900"
                            : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
                        }`}
                      >
                        {slot.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {step === 4 && (
            <section>
              <h2 className="text-lg font-semibold text-slate-900">Confirm</h2>
              <p className="mt-1 text-sm text-slate-500">Review your details and submit your request.</p>
              <div className="mt-6 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <div className="flex justify-between gap-4 border-b border-slate-200 pb-3">
                  <span className="text-slate-500">Business</span>
                  <span className="font-medium text-slate-900">{businessName}</span>
                </div>
                <div className="flex justify-between gap-4 border-b border-slate-200 pb-3">
                  <span className="text-slate-500">Service</span>
                  <span className="font-medium text-slate-900">{selectedService?.name}</span>
                </div>
                <div className="flex justify-between gap-4 border-b border-slate-200 pb-3">
                  <span className="text-slate-500">When</span>
                  <span className="text-right font-medium text-slate-900">
                    {selectedSlot
                      ? new Date(selectedSlot).toLocaleString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Price</span>
                  <span className="font-semibold text-slate-900">{formatPrice(selectedService?.priceCents ?? 0)}</span>
                </div>
              </div>

              <form
                onSubmit={submitBooking}
                className="mt-8 space-y-4"
                autoComplete="off"
                data-lpignore="true"
                data-1p-ignore="true"
              >
                <label className="block text-sm font-medium text-slate-700">
                  Full name
                  <input
                    name="booking-full-name"
                    autoComplete="name"
                    value={displayName}
                    onChange={(e) => setNameDraft(e.target.value)}
                    required
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Email
                  <input
                    name="booking-email"
                    type="email"
                    autoComplete="email"
                    value={displayEmail}
                    onChange={(e) => setEmailDraft(e.target.value)}
                    required
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-teal-700 py-3 text-sm font-semibold text-white hover:bg-teal-800 sm:w-auto sm:px-8"
                >
                  Submit booking request
                </button>
              </form>
            </section>
          )}

          <WizardNav
            step={step}
            onBack={goBack}
            onNext={goNext}
            nextDisabled={
              (step === 1 && !serviceId) ||
              (step === 2 && !date) ||
              (step === 3 && (!selectedSlot || slots.length === 0))
            }
            showNext={step < 4}
          />

          {status && status.startsWith("Sending") && (
            <p className="mt-6 rounded-lg bg-slate-100 p-3 text-sm text-slate-700" role="status" aria-live="polite">
              {status}
            </p>
          )}
          {status && !status.startsWith("Sending") && (
            <p className="mt-6 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900" role="alert">
              {status}
            </p>
          )}

          {sessionStatus === "authenticated" && session?.user?.role === "CUSTOMER" && !bookingSuccess && (
            <p className="mt-6 text-sm text-slate-600">
              <Link href="/customer" className="font-medium text-teal-700 underline">
                My appointments
              </Link>
            </p>
          )}
        </>
      )}
    </main>
  );
}

function StepIndicator({ step }: { step: number }) {
  return (
    <nav className="mb-10 overflow-x-auto pb-2" aria-label="Booking steps">
      <ol className="flex min-w-[320px] items-center justify-center gap-0 sm:min-w-0 sm:gap-1">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const current = step === n;
          const done = step > n;
          return (
            <li key={label} className="flex items-center">
              <div className="flex flex-col items-center px-1 sm:px-2">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold sm:h-10 sm:w-10 sm:text-sm ${
                    current
                      ? "bg-teal-700 text-white shadow-md ring-4 ring-teal-100"
                      : done
                        ? "bg-emerald-500 text-white shadow-sm"
                        : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {done ? "✓" : n}
                </div>
                <span className={`mt-1.5 hidden text-[11px] font-medium sm:block sm:text-xs ${current ? "text-teal-800" : "text-slate-500"}`}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`mx-0.5 h-0.5 w-6 shrink-0 sm:mx-1 sm:w-12 ${done ? "bg-emerald-400" : "bg-slate-200"}`}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function WizardNav({
  step,
  onBack,
  onNext,
  nextDisabled,
  showNext,
}: {
  step: number;
  onBack: () => void;
  onNext: () => void;
  nextDisabled: boolean;
  showNext: boolean;
}) {
  return (
    <div className="mt-10 flex items-center justify-between border-t border-slate-200 pt-6">
      <button
        type="button"
        onClick={onBack}
        disabled={step <= 1}
        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span aria-hidden className="text-base leading-none">
          ‹
        </span>
        Back
      </button>
      {showNext && (
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue
          <span aria-hidden>→</span>
        </button>
      )}
    </div>
  );
}
