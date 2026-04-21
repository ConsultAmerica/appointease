"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

type Appointment = {
  id: string;
  customerName: string;
  customerEmail: string;
  startAt: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  service: { name: string };
};

type BusinessInfo = {
  name: string;
  timezone: string;
  serviceCount: number;
};

type AdminStats = {
  totalBookings: number;
  upcoming: number;
  confirmed: number;
  cancelled: number;
};

function formatInTimeZone(iso: string, timeZone: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      timeZone,
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return new Date(iso).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}

function formatChartDay(dateStr: string) {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export default function AdminPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [business, setBusiness] = useState<BusinessInfo | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [bookingsByDay, setBookingsByDay] = useState<Array<{ date: string; bookings: number }>>([]);
  const [noShowRate, setNoShowRate] = useState(0);
  const [stats, setStats] = useState<AdminStats>({
    totalBookings: 0,
    upcoming: 0,
    confirmed: 0,
    cancelled: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const [todayRes, analyticsRes, businessRes] = await Promise.all([
      fetch("/api/admin/today", { credentials: "include" }),
      fetch("/api/admin/analytics", { credentials: "include" }),
      fetch("/api/admin/business", { credentials: "include" }),
    ]);

    if (todayRes.status === 401 || analyticsRes.status === 401 || businessRes.status === 401) {
      router.push("/auth/login");
      return;
    }

    if (businessRes.ok) {
      const bizData = (await businessRes.json()) as { business?: BusinessInfo };
      setBusiness(bizData.business ?? null);
    }

    if (!todayRes.ok) {
      setError("Could not load today’s schedule.");
      setLoading(false);
      return;
    }

    const todayData = await todayRes.json();
    setAppointments(todayData.appointments ?? []);

    if (analyticsRes.ok) {
      const analyticsData = (await analyticsRes.json()) as {
        bookingsByDay?: Array<{ date: string; bookings: number }>;
        noShowRate?: number;
        stats?: Partial<AdminStats>;
      };
      setBookingsByDay(analyticsData.bookingsByDay ?? []);
      setNoShowRate(analyticsData.noShowRate ?? 0);
      setStats({
        totalBookings: analyticsData.stats?.totalBookings ?? 0,
        upcoming: analyticsData.stats?.upcoming ?? 0,
        confirmed: analyticsData.stats?.confirmed ?? 0,
        cancelled: analyticsData.stats?.cancelled ?? 0,
      });
    }

    setLoading(false);
  }, [router]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  async function updateAppointmentStatus(id: string, status: "CONFIRMED" | "CANCELLED") {
    setBusyId(id);
    setError(null);
    const res = await fetch(`/api/admin/appointments/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusyId(null);
    if (res.status === 401) {
      router.push("/auth/login");
      return;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Update failed");
      return;
    }
    await load();
  }

  const tz = business?.timezone ?? "UTC";

  const pendingToday = useMemo(
    () => appointments.filter((a) => a.status === "PENDING").length,
    [appointments],
  );

  const firstPendingToday = useMemo(() => {
    const pending = appointments.filter((a) => a.status === "PENDING");
    return pending.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0] ?? null;
  }, [appointments]);

  const displayName =
    session?.user?.name?.trim() || session?.user?.email?.split("@")[0] || "Admin";
  const firstName = displayName.split(/\s+/)[0] ?? displayName;
  const roleLabel =
    session?.user?.role === "STAFF" ? "Staff" : session?.user?.role === "ADMIN" ? "Administrator" : "";

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 bg-slate-50/80 px-4 py-8 sm:px-6 md:py-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-[1.75rem]">
            Welcome back, {firstName}! <span aria-hidden>👋</span>
          </h1>
          <p className="mt-2 text-sm text-slate-600 md:text-base">
            {business ? (
              <>
                <span className="font-medium text-slate-800">{business.name}</span>
                <span className="text-slate-500"> · appointments and times use </span>
                <span className="font-mono text-xs text-slate-700">{business.timezone}</span>
                <span className="text-slate-500"> · </span>
                <span className="text-slate-600">{business.serviceCount} active services</span>
              </>
            ) : (
              "Manage today’s bookings and weekly trends."
            )}
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
            New booking requests start as <strong className="font-semibold text-slate-800">pending</strong>. Review and
            confirm or decline them here — customers are notified automatically.
          </p>
          {sessionStatus === "authenticated" && session?.user && (
            <p className="mt-3 text-sm text-slate-600">
              <span className="font-medium text-slate-800">{displayName}</span>
              {session.user.email ? <span className="text-slate-500"> · {session.user.email}</span> : null}
              {roleLabel ? (
                <span className="ml-2 inline-flex rounded-full bg-slate-200/80 px-2 py-0.5 text-xs font-medium text-slate-700">
                  {roleLabel}
                </span>
              ) : null}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            href="/book"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700"
          >
            View booking page
          </Link>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void load();
            }}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading && (
        <p className="mt-8 text-sm text-slate-500" role="status">
          Loading dashboard…
        </p>
      )}
      {error && (
        <p className="mt-6 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">
          {error}
        </p>
      )}

      {!loading && firstPendingToday && (
        <section className="mt-8 rounded-2xl bg-blue-600 p-6 text-white shadow-lg shadow-blue-600/25 md:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-100">Needs your action</p>
              <h2 className="mt-2 text-xl font-bold md:text-2xl">{firstPendingToday.service.name}</h2>
              <p className="mt-1 text-sm text-blue-100">{firstPendingToday.customerName}</p>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-blue-50">
                <span className="inline-flex items-center gap-2">
                  <CalendarMini className="h-4 w-4 opacity-90" />
                  {formatInTimeZone(firstPendingToday.startAt, tz)}
                </span>
              </div>
            </div>
            <span className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full bg-amber-300 px-4 py-1.5 text-xs font-bold text-amber-950">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-800" aria-hidden />
              Pending
            </span>
          </div>
        </section>
      )}

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total bookings"
          value={stats.totalBookings}
          valueClassName="text-slate-900"
          icon={<CalendarIcon className="h-5 w-5 text-blue-600" />}
          iconBg="bg-blue-50"
        />
        <StatCard
          label="Upcoming"
          value={stats.upcoming}
          valueClassName="text-amber-700"
          icon={<ClockIcon className="h-5 w-5 text-amber-600" />}
          iconBg="bg-amber-50"
        />
        <StatCard
          label="Confirmed"
          value={stats.confirmed}
          valueClassName="text-emerald-700"
          icon={<CheckIcon className="h-5 w-5 text-emerald-600" />}
          iconBg="bg-emerald-50"
        />
        <StatCard
          label="Cancelled"
          value={stats.cancelled}
          valueClassName="text-rose-700"
          icon={<AlertIcon className="h-5 w-5 text-rose-600" />}
          iconBg="bg-rose-50"
        />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-100/80 md:p-6">
          <h2 className="text-base font-semibold text-slate-900">Today&apos;s schedule</h2>
          <p className="mt-1 text-sm text-slate-500">
            Times shown in <span className="font-mono text-xs text-slate-700">{tz}</span>. Pending requests can be
            confirmed or declined. {pendingToday > 0 ? `${pendingToday} pending today.` : "No pending requests today."}
          </p>
          <ul className="mt-4 space-y-3 text-sm">
            {appointments.length === 0 && !loading && (
              <li className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center">
                <p className="font-medium text-slate-800">No appointments today</p>
                <p className="mt-2 text-sm text-slate-600">
                  When customers book for today, they will appear here. Share your{" "}
                  <Link href="/book" className="font-medium text-blue-600 underline hover:text-blue-700">
                    public booking page
                  </Link>
                  .
                </p>
              </li>
            )}
            {appointments.map((appointment) => (
              <li
                key={appointment.id}
                className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm ring-1 ring-slate-100/80"
              >
                <div className="flex gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-base font-bold text-white shadow-inner">
                    {appointment.customerName.trim().slice(0, 1).toUpperCase() || "?"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">{appointment.service.name}</p>
                        <p className="text-sm text-slate-600">{appointment.customerName}</p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          appointment.status === "PENDING"
                            ? "bg-amber-100 text-amber-900"
                            : appointment.status === "CONFIRMED"
                              ? "bg-emerald-100 text-emerald-900"
                              : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {(appointment.status === "PENDING" || appointment.status === "CONFIRMED") && (
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              appointment.status === "PENDING" ? "bg-amber-600" : "bg-emerald-600"
                            }`}
                            aria-hidden
                          />
                        )}
                        {appointment.status === "PENDING"
                          ? "Pending"
                          : appointment.status === "CONFIRMED"
                            ? "Confirmed"
                            : "Cancelled"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      {formatInTimeZone(appointment.startAt, tz)}
                      <span className="text-slate-400"> · </span>
                      {appointment.customerEmail}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {appointment.status === "PENDING" && (
                        <>
                          <button
                            type="button"
                            disabled={busyId === appointment.id}
                            onClick={() => updateAppointmentStatus(appointment.id, "CONFIRMED")}
                            className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            disabled={busyId === appointment.id}
                            onClick={() => updateAppointmentStatus(appointment.id, "CANCELLED")}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
                          >
                            Decline
                          </button>
                        </>
                      )}
                      {appointment.status === "CONFIRMED" && (
                        <button
                          type="button"
                          disabled={busyId === appointment.id}
                          onClick={() => updateAppointmentStatus(appointment.id, "CANCELLED")}
                          className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-800 hover:bg-rose-50 disabled:opacity-50"
                        >
                          Cancel appointment
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-100/80 md:p-6">
          <h2 className="text-base font-semibold text-slate-900">Last 7 days</h2>
          <p className="mt-1 text-sm text-slate-600">
            Booking volume by day. No-show rate (cancelled as proxy):{" "}
            <span className="font-semibold text-slate-900">{noShowRate}%</span>
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {bookingsByDay.map((day) => (
              <li
                key={day.date}
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5"
              >
                <span className="text-slate-700">{formatChartDay(day.date)}</span>
                <span className="font-semibold tabular-nums text-slate-900">
                  {day.bookings} <span className="font-normal text-slate-500">bookings</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}

function StatCard({
  label,
  value,
  valueClassName,
  icon,
  iconBg,
}: {
  label: string;
  value: number;
  valueClassName: string;
  icon: ReactNode;
  iconBg: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-100/80">
      <div className={`inline-flex rounded-xl p-2.5 ${iconBg}`}>{icon}</div>
      <p className={`mt-4 text-3xl font-bold tabular-nums ${valueClassName}`}>{value}</p>
      <p className="text-sm font-medium text-slate-500">{label}</p>
    </article>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  );
}

function CalendarMini({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
