"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { AppointmentImage } from "@/components/appointment-image";
import { SectionBackground } from "@/components/section-background";
import { BookCalendar } from "@/components/booking/book-calendar";
import { BuildingIcon, CalendarIcon, ClockIcon, SparklesIcon, UserIcon } from "@/components/booking/booking-icons";
import {
  BOOKING_STEPS,
  type Clinic,
  type Provider,
  type Service,
  type Slot,
  formatPrice,
  localISODate,
} from "@/components/booking/types";
import { clinicThemeForIndex, PRO, SLOT_STATUS_STYLES } from "@/lib/clinic-theme";
import { APPOINTMENT_IMAGES } from "@/lib/appointment-images";
import { formatAuthApiError } from "@/lib/auth-client";

const ANY_PROVIDER = "__any__";

function normalizeClinics(raw: unknown): Clinic[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row): Clinic | null => {
      if (!row || typeof row !== "object") return null;
      const b = row as Record<string, unknown>;
      const id = typeof b.id === "string" ? b.id : null;
      const name = typeof b.name === "string" ? b.name : null;
      if (!id || !name) return null;
      const services: Service[] = [];
      if (Array.isArray(b.services)) {
        for (const s of b.services) {
          if (!s || typeof s !== "object") continue;
          const sv = s as Record<string, unknown>;
          const sid = typeof sv.id === "string" ? sv.id : null;
          const sname = typeof sv.name === "string" ? sv.name : null;
          const duration = typeof sv.durationMinutes === "number" ? sv.durationMinutes : Number(sv.durationMinutes);
          const price = typeof sv.priceCents === "number" ? sv.priceCents : Number(sv.priceCents);
          if (!sid || !sname || !Number.isFinite(duration) || !Number.isFinite(price)) continue;
          services.push({ id: sid, name: sname, durationMinutes: duration, priceCents: price });
        }
      }
      return {
        id,
        name,
        timezone: typeof b.timezone === "string" ? b.timezone : "UTC",
        services,
        colorIndex: typeof b.colorIndex === "number" ? b.colorIndex : 0,
        locationLabel: typeof b.locationLabel === "string" ? b.locationLabel : "",
        hoursSummary: typeof b.hoursSummary === "string" ? b.hoursSummary : "Hours not published",
        todayHours: typeof b.todayHours === "string" ? b.todayHours : null,
        openNow: Boolean(b.openNow),
        serviceCount: typeof b.serviceCount === "number" ? b.serviceCount : services.length,
      };
    })
    .filter((c): c is Clinic => c !== null);
}

export function BookingWizard() {
  const { data: session, status: sessionStatus } = useSession();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [businessId, setBusinessId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [staffUserId, setStaffUserId] = useState(ANY_PROVIDER);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [specialtyFilter, setSpecialtyFilter] = useState("");
  const [date, setDate] = useState(localISODate(new Date()));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsClosedDay, setSlotsClosedDay] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [nameDraft, setNameDraft] = useState<string | undefined>(undefined);
  const [emailDraft, setEmailDraft] = useState<string | undefined>(undefined);
  const [phoneDraft, setPhoneDraft] = useState("");
  const [specialRequest, setSpecialRequest] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<{ ref: string; email: string } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [suggesting, setSuggesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pendingSlotIso, setPendingSlotIso] = useState<string | null>(null);

  const pageMountedRef = useRef(false);
  const loadSeq = useRef(0);

  const displayName = nameDraft !== undefined ? nameDraft : (session?.user?.name ?? "");
  const displayEmail = emailDraft !== undefined ? emailDraft : (session?.user?.email ?? "");
  const customerBusinessId =
    session?.user?.role === "CUSTOMER" && session.user.businessId ? session.user.businessId : null;

  const clinic = useMemo(() => clinics.find((c) => c.id === businessId), [clinics, businessId]);
  const services = clinic?.services ?? [];
  const selectedService = useMemo(() => services.find((s) => s.id === serviceId), [services, serviceId]);
  const theme = clinicThemeForIndex(clinic?.colorIndex ?? 0);
  const selectedProvider = providers.find((p) => p.id === staffUserId);

  const clinicOptions = useMemo(() => {
    if (!customerBusinessId) return clinics;
    const match = clinics.filter((c) => c.id === customerBusinessId);
    return match.length ? match : clinics;
  }, [clinics, customerBusinessId]);

  const filteredProviders = useMemo(() => {
    if (!specialtyFilter) return providers;
    return providers.filter((p) => p.services.some((s) => s.id === specialtyFilter));
  }, [providers, specialtyFilter]);

  const loadClinics = useCallback(async () => {
    const seq = ++loadSeq.current;
    setLoadError(null);
    setLoaded(false);
    try {
      const res = await fetch("/api/businesses", { cache: "no-store", credentials: "include" });
      const data = await res.json();
      if (seq !== loadSeq.current || !pageMountedRef.current) return;
      if (!res.ok) {
        setLoadError(typeof data.error === "string" ? data.error : "Could not load clinics.");
        return;
      }
      const list = normalizeClinics(data.businesses);
      setClinics(list);
      if (list.length === 0) return;
      const preferred = customerBusinessId
        ? list.find((c) => c.id === customerBusinessId) ?? list[0]
        : list[0];
      setBusinessId(preferred.id);
      setServiceId(preferred.services[0]?.id ?? "");
    } catch {
      if (seq === loadSeq.current) setLoadError("Could not reach the server.");
    } finally {
      if (seq === loadSeq.current) setLoaded(true);
    }
  }, [customerBusinessId]);

  useEffect(() => {
    pageMountedRef.current = true;
    void loadClinics();
    return () => {
      pageMountedRef.current = false;
    };
  }, [loadClinics]);

  useEffect(() => {
    if (sessionStatus !== "authenticated" || !session?.user) return;
    if (nameDraft === undefined && session.user.name) setNameDraft(session.user.name);
    if (emailDraft === undefined && session.user.email) setEmailDraft(session.user.email);
  }, [sessionStatus, session, nameDraft, emailDraft]);

  useEffect(() => {
    if (!businessId) return;
    setProvidersLoading(true);
    const q = serviceId ? `?serviceId=${encodeURIComponent(serviceId)}` : "";
    fetch(`/api/businesses/${businessId}/providers${q}`, { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then((data: { providers?: Provider[] }) => {
        setProviders(Array.isArray(data.providers) ? data.providers : []);
      })
      .catch(() => setProviders([]))
      .finally(() => setProvidersLoading(false));
  }, [businessId, serviceId]);

  useEffect(() => {
    if (!businessId || !serviceId || !date || step < 3) return;
    setSyncing(true);
    const staffParam =
      staffUserId && staffUserId !== ANY_PROVIDER
        ? `&staffUserId=${encodeURIComponent(staffUserId)}`
        : "";
    fetch(
      `/api/businesses/${businessId}/availability?date=${encodeURIComponent(date)}&serviceId=${encodeURIComponent(serviceId)}${staffParam}`,
      { cache: "no-store", credentials: "include" },
    )
      .then((r) => r.json())
      .then((data: { slots?: Slot[]; closedDay?: boolean }) => {
        const nextSlots = Array.isArray(data.slots) ? data.slots : [];
        setSlots(nextSlots);
        setSlotsClosedDay(Boolean(data.closedDay));
        if (pendingSlotIso && nextSlots.some((s) => s.iso === pendingSlotIso)) {
          setSelectedSlot(pendingSlotIso);
          setPendingSlotIso(null);
        } else {
          setSelectedSlot((prev) => (prev && nextSlots.some((s) => s.iso === prev) ? prev : ""));
        }
      })
      .catch(() => {
        setSlots([]);
        setSlotsClosedDay(false);
      })
      .finally(() => setSyncing(false));
  }, [businessId, serviceId, date, staffUserId, step, pendingSlotIso]);

  function selectClinic(id: string) {
    const c = clinics.find((x) => x.id === id);
    setBusinessId(id);
    setServiceId(c?.services[0]?.id ?? "");
    setStaffUserId(ANY_PROVIDER);
    setSpecialtyFilter("");
    setStep(2);
    setStatus(null);
  }

  function selectProvider(id: string, svcId?: string) {
    setStaffUserId(id);
    if (svcId) setServiceId(svcId);
    setStatus(null);
  }

  async function runSmartSuggest() {
    if (!businessId || !serviceId) return;
    setSuggesting(true);
    setStatus(null);
    try {
      const staffParam =
        staffUserId && staffUserId !== ANY_PROVIDER
          ? `&staffUserId=${encodeURIComponent(staffUserId)}`
          : "";
      const res = await fetch(
        `/api/businesses/${businessId}/suggest?serviceId=${encodeURIComponent(serviceId)}${staffParam}`,
        { cache: "no-store" },
      );
      const data = await res.json();
      if (data.suggestion) {
        setPendingSlotIso(data.suggestion.iso);
        setDate(data.suggestion.date);
        setStatus(`Smart suggest: ${data.suggestion.label} on ${data.suggestion.date}`);
      } else {
        setStatus("No open slots found in the next few weeks. Try another service or provider.");
      }
    } catch {
      setStatus("Could not fetch a suggestion. Pick a date manually.");
    } finally {
      setSuggesting(false);
    }
  }

  function goNext() {
    setStatus(null);
    if (step === 1 && !businessId) {
      setStatus("Select a clinic to continue.");
      return;
    }
    if (step === 2 && !serviceId) {
      setStatus("Select a visit type / provider to continue.");
      return;
    }
    if (step === 3 && !selectedSlot) {
      setStatus("Choose a time slot or use Smart Suggest.");
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
    const customerPhone = phoneDraft.trim();
    if (!customerName || !customerEmail || !customerPhone) {
      setStatus("Name, email, and phone are required.");
      return;
    }
    setStatus("Sending your request…");
    const res = await fetch("/api/bookings", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId,
        serviceId,
        customerName,
        customerEmail,
        customerPhone,
        startAt: selectedSlot,
        ...(staffUserId && staffUserId !== ANY_PROVIDER ? { assignedStaffUserId: staffUserId } : {}),
        ...(specialRequest.trim() ? { specialRequestNote: specialRequest.trim() } : {}),
      }),
    });
    const data = await res.json();
    if (res.ok && data.appointment?.id) {
      setStatus(null);
      setBookingSuccess({ ref: data.appointment.id.slice(0, 8), email: customerEmail });
    } else {
      setStatus(formatAuthApiError(data));
    }
  }

  const loading = !loaded && !loadError;
  const canWizard = loaded && !loadError && clinics.length > 0 && !bookingSuccess;

  return (
    <SectionBackground variant="calendar" as="main" className="min-h-screen flex-1 px-4 pb-28 pt-8 sm:px-6 sm:pb-10">
      <div className="mx-auto w-full max-w-3xl">
        {!bookingSuccess && (
          <header className="mb-6 overflow-hidden rounded-2xl border border-[color:var(--border)] bg-surface shadow-sm">
            <AppointmentImage
              {...APPOINTMENT_IMAGES.patientBooking}
              className="aspect-[3/1] max-h-40 w-full sm:max-h-48"
              imageClassName="h-full w-full object-cover object-[center_30%]"
              sizes="(max-width: 768px) 100vw, 768px"
            />
            <div className="border-t border-[color:var(--border)] px-5 py-5 sm:px-6">
              <p className="pro-label">Patient booking</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Schedule an appointment</h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Secure guest checkout — no account required. Your request remains pending until the clinic confirms.
              </p>
            </div>
          </header>
        )}

      {loading && (
        <div className="mt-10 flex flex-col items-center rounded-lg border border-slate-200 bg-surface py-14" role="status">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
          <p className="mt-4 text-sm font-medium text-slate-800">Loading clinics…</p>
        </div>
      )}

      {loaded && loadError && (
        <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900" role="alert">
          <p className="font-semibold">Could not load clinics</p>
          <p className="mt-2">{loadError}</p>
          <button type="button" onClick={() => void loadClinics()} className="mt-3 rounded-lg bg-rose-900 px-4 py-2 text-white">
            Try again
          </button>
        </div>
      )}

      {loaded && !loadError && clinics.length === 0 && (
        <p className="mt-6 text-sm text-amber-900">No clinics available. Run <code>npm run db:seed</code>.</p>
      )}

      {bookingSuccess && (
        <section className="pro-card p-6">
          <h2 className="text-xl font-bold text-slate-900">Booking request sent</h2>
          <p className="mt-3 text-sm text-slate-700">
            Reference <span className="font-mono font-medium">{bookingSuccess.ref}</span>… — pending until confirmed.
            Updates go to <strong>{bookingSuccess.email}</strong>.
          </p>
          <button
            type="button"
            onClick={() => {
              setBookingSuccess(null);
              setStep(1);
              setSelectedSlot("");
            }}
            className="mt-6 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium"
          >
            Book another
          </button>
        </section>
      )}

      {canWizard && (
        <div className={`${PRO.card} p-5 sm:p-8`}>
          <StepIndicator step={step} />

          {step === 1 && (
            <section>
              <h2 className={PRO.heading}>Select a clinic</h2>
              <p className={PRO.subtext}>Compare locations, hours, and availability before continuing.</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {clinicOptions.map((c) => {
                  const t = clinicThemeForIndex(c.colorIndex);
                  const selected = businessId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => selectClinic(c.id)}
                      className={`rounded-lg border bg-surface p-5 text-left transition hover:border-slate-300 hover:shadow-sm border-l-4 ${t.border} ${
                        selected ? "border-slate-900 ring-1 ring-slate-900/10" : "border-slate-200"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-white ${t.accent}`}>
                          <BuildingIcon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900">{c.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{c.locationLabel}</p>
                          <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600">
                            <ClockIcon className="h-4 w-4 shrink-0 text-slate-400" />
                            {c.todayHours ?? c.hoursSummary}
                          </p>
                          <p className="mt-2 text-xs font-medium">
                            <span className={c.openNow ? "text-emerald-600" : "text-slate-500"}>
                              {c.openNow ? "● Open now" : "○ Closed now"}
                            </span>
                            <span className="text-slate-400"> · {c.serviceCount} services</span>
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {step === 2 && clinic && (
            <section>
              <div className={`mb-4 inline-flex items-center gap-2 rounded-md px-3 py-1 text-xs font-semibold text-white ${theme.accent}`}>
                {clinic.name}
              </div>
              <h2 className={PRO.heading}>Select provider & visit type</h2>
              <p className={PRO.subtext}>Filter by specialty or choose the earliest available clinician.</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSpecialtyFilter("")}
                  className={!specialtyFilter ? PRO.chipActive : PRO.chip}
                >
                  All specialties
                </button>
                {services.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSpecialtyFilter(s.id);
                      setServiceId(s.id);
                    }}
                    className={specialtyFilter === s.id ? PRO.chipActive : PRO.chip}
                  >
                    {s.name}
                  </button>
                ))}
              </div>

              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={() => selectProvider(ANY_PROVIDER)}
                  className={`flex w-full items-center gap-4 p-4 text-left ${
                    staffUserId === ANY_PROVIDER ? PRO.cardSelected : PRO.card
                  }`}
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                    <SparklesIcon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">Earliest available</p>
                    <p className="text-sm text-slate-500">Any qualified provider at this clinic</p>
                  </div>
                </button>

                {providersLoading ? (
                  <p className="text-sm text-slate-500">Loading providers…</p>
                ) : (
                  filteredProviders.map((p) => {
                    const svc = specialtyFilter
                      ? p.services.find((s) => s.id === specialtyFilter) ?? p.services[0]
                      : p.services[0];
                    const selected = staffUserId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => selectProvider(p.id, svc?.id)}
                        className={`flex w-full items-center gap-4 p-4 text-left ${
                          selected ? PRO.cardSelected : PRO.card
                        }`}
                      >
                        <span className="flex h-11 w-11 items-center justify-center rounded-md bg-slate-800 text-sm font-semibold text-white">
                          {p.fullName.slice(0, 1)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900">{p.fullName}</p>
                          <p className="text-sm text-slate-500">{p.specialty}</p>
                          {p.nextAvailable ? (
                            <p className="mt-1 text-xs font-medium text-[color:var(--success)]">
                              Next: {p.nextAvailable.label} · {p.nextAvailable.date}
                            </p>
                          ) : (
                            <p className="mt-1 text-xs text-slate-400">No slots in next 2 weeks</p>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {serviceId && selectedService && (
                <p className="mt-4 text-sm text-slate-600">
                  Visit: <strong>{selectedService.name}</strong> · {selectedService.durationMinutes} min ·{" "}
                  {formatPrice(selectedService.priceCents)}
                </p>
              )}
            </section>
          )}

          {step === 3 && (
            <section>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className={PRO.heading}>Choose date & time</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    <span className="inline-flex items-center gap-1 text-[color:var(--success)]">● Available</span>
                    <span className="mx-2 text-slate-300">|</span>
                    <span className="inline-flex items-center gap-1 text-[color:var(--warning)]">● Limited</span>
                    <span className="mx-2 text-slate-300">|</span>
                    <span className="text-[color:var(--error)]">○ Unavailable</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void runSmartSuggest()}
                  disabled={suggesting}
                  className={`inline-flex items-center gap-2 ${PRO.btn} disabled:opacity-60`}
                >
                  <SparklesIcon className="h-4 w-4" />
                  {suggesting ? "Finding…" : "Smart Suggest"}
                </button>
              </div>

              {syncing && (
                <p className="mt-3 text-xs font-medium text-sky-800" role="status">
                  Syncing live availability…
                </p>
              )}

              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <BookCalendar key={date} value={date} onChange={setDate} />
                <div>
                  {slots.length === 0 ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                      {slotsClosedDay ? "Clinic closed this day — pick another date." : "No open slots — try Smart Suggest or another day."}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {slots.map((slot) => {
                        const styles = SLOT_STATUS_STYLES[slot.status];
                        const selected = selectedSlot === slot.iso;
                        return (
                          <button
                            key={slot.iso}
                            type="button"
                            onClick={() => setSelectedSlot(slot.iso)}
                            className={`rounded-md border px-3 py-3 text-sm font-medium transition ${
                              selected ? styles.selected : styles.base
                            }`}
                          >
                            {slot.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {step === 4 && clinic && selectedService && (
            <section>
              <h2 className={PRO.heading}>Confirm your visit</h2>
              <AppointmentSummary
                clinicName={clinic.name}
                providerName={
                  staffUserId === ANY_PROVIDER ? "First available provider" : (selectedProvider?.fullName ?? "Assigned at confirmation")
                }
                serviceName={selectedService.name}
                durationMinutes={selectedService.durationMinutes}
                priceCents={selectedService.priceCents}
                slotIso={selectedSlot}
              />
              <form onSubmit={submitBooking} className="mt-6 space-y-4">
                <label className="block text-sm font-medium text-slate-700">
                  Full name
                  <input
                    value={displayName}
                    onChange={(e) => setNameDraft(e.target.value)}
                    required
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Email
                  <input
                    type="email"
                    value={displayEmail}
                    onChange={(e) => setEmailDraft(e.target.value)}
                    required
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Phone
                  <input
                    type="tel"
                    value={phoneDraft}
                    onChange={(e) => setPhoneDraft(e.target.value)}
                    required
                    placeholder="+1 555 123 4567"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Notes <span className="font-normal text-slate-400">(optional)</span>
                  <textarea
                    value={specialRequest}
                    onChange={(e) => setSpecialRequest(e.target.value)}
                    rows={2}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </label>
                <button
                  type="submit"
                  className={`w-full sm:w-auto sm:px-10 ${PRO.btn}`}
                >
                  Submit booking request
                </button>
              </form>
            </section>
          )}

          <WizardNav step={step} onBack={goBack} onNext={goNext} showNext={step < 4} nextDisabled={
            (step === 1 && !businessId) ||
            (step === 2 && !serviceId) ||
            (step === 3 && !selectedSlot)
          } />

          {status && (
            <p
              className={`mt-4 rounded-lg p-3 text-sm ${
                status.startsWith("Sending") || status.startsWith("Smart suggest")
                  ? "bg-sky-50 text-sky-900"
                  : "border border-rose-200 bg-rose-50 text-rose-900"
              }`}
              role="status"
            >
              {status}
            </p>
          )}
        </div>
      )}
      </div>
    </SectionBackground>
  );
}

function AppointmentSummary({
  clinicName,
  providerName,
  serviceName,
  durationMinutes,
  priceCents,
  slotIso,
}: {
  clinicName: string;
  providerName: string;
  serviceName: string;
  durationMinutes: number;
  priceCents: number;
  slotIso: string;
}) {
  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-surface">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
        <p className="pro-label">Appointment summary</p>
      </div>
      <dl className="divide-y divide-slate-100 px-5 py-2 text-sm">
        {[
          { icon: BuildingIcon, label: "Clinic", value: clinicName },
          { icon: UserIcon, label: "Provider", value: providerName },
          { icon: CalendarIcon, label: "When", value: new Date(slotIso).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) },
          { icon: ClockIcon, label: "Visit type", value: `${serviceName} · ${durationMinutes} min` },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 py-3">
            <dt className="flex items-center gap-2 text-slate-500">
              <row.icon className="h-4 w-4" />
              {row.label}
            </dt>
            <dd className="text-right font-medium text-slate-900">{row.value}</dd>
          </div>
        ))}
        <div className="flex items-center justify-between gap-4 py-3">
          <dt className="text-slate-500">Estimated price</dt>
          <dd className="font-semibold text-slate-900">{formatPrice(priceCents)}</dd>
        </div>
        <div className="py-3 text-xs leading-relaxed text-slate-500">
          <strong className="text-slate-700">Cancellation policy:</strong> Pending until clinic confirms. Contact the
          clinic directly to reschedule or cancel after confirmation.
        </div>
      </dl>
    </div>
  );
}

function StepIndicator({ step }: { step: number }) {
  return (
    <nav className="mb-8 overflow-x-auto" aria-label="Booking steps">
      <ol className="flex min-w-[360px] items-center justify-between gap-1">
        {BOOKING_STEPS.map((label, i) => {
          const n = i + 1;
          const current = step === n;
          const done = step > n;
          return (
            <li key={label} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${
                    current ? PRO.stepActive : done ? PRO.stepDone : PRO.stepIdle
                  }`}
                >
                  {done ? "✓" : n}
                </div>
                <span className={`mt-1 hidden text-[10px] font-semibold sm:block ${current ? "text-slate-900" : "text-slate-500"}`}>
                  {label}
                </span>
              </div>
              {i < BOOKING_STEPS.length - 1 && (
                <div className={`mx-1 h-0.5 flex-1 ${done ? "bg-emerald-600" : "bg-slate-200"}`} aria-hidden />
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
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-surface/95 px-4 py-3 backdrop-blur-md sm:static sm:mt-10 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={step <= 1}
          className={`min-h-11 ${PRO.btnOutline}`}
        >
          Back
        </button>
        {showNext && (
          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled}
            className={`min-h-11 flex-1 sm:flex-none ${PRO.btn}`}
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}
