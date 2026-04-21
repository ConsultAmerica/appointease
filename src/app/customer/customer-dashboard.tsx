"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { cancelCustomerAppointment } from "./actions";

export type DashboardAppointment = {
  id: string;
  serviceName: string;
  businessName: string;
  startAt: string;
  endAt: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  priceCents: number;
};

type FilterTab = "all" | "upcoming" | "confirmed" | "pending" | "past";

function formatShortId(id: string) {
  const alnum = id.replace(/[^a-zA-Z0-9]/g, "");
  return `#${(alnum.slice(-8) || id.slice(0, 8)).toUpperCase()}`;
}

export function CustomerDashboard({
  userName,
  userEmail,
  appointments,
}: {
  userName: string;
  userEmail: string;
  appointments: DashboardAppointment[];
}) {
  const [filter, setFilter] = useState<FilterTab>("upcoming");

  const firstName = userName.trim().split(/\s+/)[0] ?? userName;

  const stats = useMemo(() => {
    const now = new Date();
    const total = appointments.length;
    const upcoming = appointments.filter(
      (a) => a.status !== "CANCELLED" && new Date(a.startAt) >= now,
    ).length;
    const completed = appointments.filter(
      (a) => a.status !== "CANCELLED" && new Date(a.endAt) < now,
    ).length;
    const cancelled = appointments.filter((a) => a.status === "CANCELLED").length;
    return { total, upcoming, completed, cancelled };
  }, [appointments]);

  const sortedUpcoming = useMemo(() => {
    const now = new Date();
    return appointments
      .filter((a) => a.status !== "CANCELLED" && new Date(a.startAt) >= now)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [appointments]);

  const nextAppointment = sortedUpcoming[0] ?? null;
  const hasNoAppointments = appointments.length === 0;

  const filtered = useMemo(() => {
    const now = new Date();
    return appointments.filter((a) => {
      const start = new Date(a.startAt);
      const isPast = start < now;
      const isUpcoming = !isPast && a.status !== "CANCELLED";
      switch (filter) {
        case "all":
          return true;
        case "upcoming":
          return isUpcoming;
        case "confirmed":
          return a.status === "CONFIRMED";
        case "pending":
          return a.status === "PENDING";
        case "past":
          return isPast || a.status === "CANCELLED";
        default:
          return true;
      }
    });
  }, [appointments, filter]);

  const sortedList = useMemo(() => {
    return [...filtered].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [filtered]);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 bg-slate-50/80 px-4 py-8 sm:px-6 md:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-[1.75rem]">
            Welcome back, {firstName}! <span aria-hidden>👋</span>
          </h1>
          <p className="mt-2 text-sm text-slate-600 md:text-base">Manage and track all your appointments</p>
        </div>
        <Link
          href="/book"
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700"
        >
          + New Booking
        </Link>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Bookings"
          value={stats.total}
          valueClassName="text-blue-600"
          icon={<CalendarIcon className="h-5 w-5 text-blue-600" />}
          iconBg="bg-blue-50"
        />
        <StatCard
          label="Upcoming"
          value={stats.upcoming}
          valueClassName="text-emerald-600"
          icon={<ClockIcon className="h-5 w-5 text-emerald-600" />}
          iconBg="bg-emerald-50"
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          valueClassName="text-violet-600"
          icon={<CheckCircleIcon className="h-5 w-5 text-violet-600" />}
          iconBg="bg-violet-50"
        />
        <StatCard
          label="Cancelled"
          value={stats.cancelled}
          valueClassName="text-red-600"
          icon={<AlertIcon className="h-5 w-5 text-red-600" />}
          iconBg="bg-red-50"
        />
      </section>

      {hasNoAppointments && (
        <section className="mt-8 overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-6 text-white shadow-lg shadow-blue-600/30 md:p-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-100">Get started</p>
          <h2 className="mt-2 text-2xl font-bold leading-tight md:text-3xl">Ready to schedule your first appointment</h2>
          <p className="mt-3 max-w-xl text-sm text-blue-50">
            Once you submit a booking request, it will appear here with real-time status updates until confirmed.
          </p>
          <Link
            href="/book"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-blue-700 shadow-md transition hover:bg-blue-50"
          >
            + Create booking
          </Link>
        </section>
      )}

      {!hasNoAppointments && nextAppointment && (
        <section className="mt-8 rounded-2xl bg-blue-600 p-6 text-white shadow-lg shadow-blue-600/25 md:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-100">Next appointment</p>
              <h2 className="mt-2 text-2xl font-bold leading-tight md:text-3xl">{nextAppointment.serviceName}</h2>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-blue-50">
                <span className="inline-flex items-center gap-2">
                  <CalendarMini className="h-4 w-4 shrink-0 opacity-90" />
                  {new Date(nextAppointment.startAt).toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <span className="inline-flex items-center gap-2">
                  <ClockMini className="h-4 w-4 shrink-0 opacity-90" />
                  {new Date(nextAppointment.startAt).toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })}
                </span>
              </div>
            </div>
            <span
              className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold ${
                nextAppointment.status === "PENDING"
                  ? "bg-amber-300 text-amber-950"
                  : nextAppointment.status === "CONFIRMED"
                    ? "bg-emerald-300 text-emerald-950"
                    : "bg-white/20 text-white"
              }`}
            >
              {(nextAppointment.status === "PENDING" || nextAppointment.status === "CONFIRMED") && (
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    nextAppointment.status === "PENDING" ? "bg-amber-800" : "bg-emerald-900"
                  }`}
                  aria-hidden
                />
              )}
              {nextAppointment.status === "PENDING"
                ? "Pending"
                : nextAppointment.status === "CONFIRMED"
                  ? "Confirmed"
                  : nextAppointment.status}
            </span>
          </div>
        </section>
      )}

      {!hasNoAppointments && !nextAppointment && (
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm md:p-8">
          <p className="text-sm font-medium text-slate-900">No upcoming appointments</p>
          <p className="mt-2 text-sm text-slate-600">Past visits stay under Past — book again anytime.</p>
          <Link
            href="/book"
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700"
          >
            + New booking
          </Link>
        </section>
      )}

      <section className="mt-8 rounded-2xl border border-slate-200/90 bg-white px-3 pb-3 pt-3 shadow-sm ring-1 ring-slate-100/80 md:px-4 md:pb-4">
        <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-3">
          {(
            [
              ["all", "All"],
              ["upcoming", "Upcoming"],
              ["confirmed", "Confirmed"],
              ["pending", "Pending"],
              ["past", "Past"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-xl border px-4 py-1.5 text-sm font-medium transition ${
                filter === key
                  ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <ul className="space-y-3 pt-4">
          {sortedList.length === 0 && (
            <li className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
              <p className="text-sm font-medium text-slate-800">
                {hasNoAppointments ? "No appointments yet" : "No appointments in this view"}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                {hasNoAppointments
                  ? "Use Book your first visit above — confirmations and reference IDs show up here."
                  : "Try another filter or book a new appointment."}
              </p>
              {!hasNoAppointments && (
                <Link
                  href="/book"
                  className="mt-5 inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                >
                  + Book appointment
                </Link>
              )}
            </li>
          )}
          {sortedList.map((a) => (
            <li
              key={a.id}
              className="rounded-2xl border border-slate-200/90 bg-white px-4 py-4 shadow-sm ring-1 ring-slate-100/70 transition hover:shadow-md md:px-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-lg font-bold text-white shadow-inner">
                    {a.serviceName.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-slate-900">{a.serviceName}</h3>
                    <p className="text-sm text-slate-500">{a.businessName}</p>
                    <p className="mt-2 text-sm font-medium text-slate-700">
                      {new Date(a.startAt).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}{" "}
                      <span className="text-slate-400">·</span>{" "}
                      {new Date(a.startAt).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })}{" "}
                      –{" "}
                      {new Date(a.endAt).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })}
                    </p>
                    <p className="mt-1.5 font-mono text-xs tracking-wide text-slate-400">
                      ID: {formatShortId(a.id)}
                    </p>
                  </div>
                </div>
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[130px] sm:items-end">
                  <div className="flex items-center justify-end gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                        a.status === "PENDING"
                          ? "bg-amber-100 text-amber-900"
                          : a.status === "CONFIRMED"
                            ? "bg-emerald-100 text-emerald-900"
                            : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {(a.status === "PENDING" || a.status === "CONFIRMED") && (
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                            a.status === "PENDING" ? "bg-amber-600" : "bg-emerald-600"
                          }`}
                          aria-hidden
                        />
                      )}
                      {a.status === "PENDING"
                        ? "Pending"
                        : a.status === "CONFIRMED"
                          ? "Confirmed"
                          : "Cancelled"}
                    </span>
                    {(a.status === "PENDING" || a.status === "CONFIRMED") && (
                      <form action={cancelCustomerAppointment} className="inline">
                        <input type="hidden" name="appointmentId" value={a.id} />
                        <button
                          type="submit"
                          className="rounded-lg p-1.5 text-rose-400 transition hover:bg-rose-50 hover:text-rose-500"
                          title="Cancel appointment"
                          aria-label="Cancel appointment"
                        >
                          <XIcon className="h-5 w-5" />
                        </button>
                      </form>
                    )}
                  </div>
                  <p className="text-right text-xl font-bold tabular-nums text-blue-600">
                    ${(a.priceCents / 100).toFixed(2)}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-10 text-center text-xs text-slate-400">Signed in as {userEmail}</p>
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

function CheckCircleIcon({ className }: { className?: string }) {
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

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6 6 18M6 6l12 12" />
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

function ClockMini({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}
