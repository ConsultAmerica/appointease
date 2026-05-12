"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AppointmentStatusBadge } from "@/components/appointment-status-badge";

type Appointment = {
  id: string;
  customerName: string;
  customerEmail: string;
  startAt: string;
  status: string;
  createdViaAiChat?: boolean;
  specialRequestNote?: string | null;
  specialRequestStatus?: string;
  assignedStaffUserId?: string | null;
  service: { name: string };
  assignedStaff?: { id: string; fullName: string } | null;
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function StaffPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [blockStart, setBlockStart] = useState("");
  const [blockEnd, setBlockEnd] = useState("");
  const [blockReason, setBlockReason] = useState("");

  const load = useCallback(async () => {
    setMsg(null);
    const res = await fetch("/api/staff/appointments", { credentials: "include" });
    if (res.status === 401) {
      router.push("/auth/login");
      return;
    }
    if (!res.ok) {
      setMsg("Could not load appointments.");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setAppointments(Array.isArray(data.appointments) ? data.appointments : []);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    if (status === "authenticated") {
      void load();
    }
  }, [status, load, router]);

  async function patch(id: string, body: Record<string, unknown>) {
    setBusyId(id);
    setMsg(null);
    const res = await fetch(`/api/admin/appointments/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusyId(null);
    if (res.status === 401) {
      router.push("/auth/login");
      return;
    }
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setMsg(j.error ?? "Update failed");
      return;
    }
    await load();
  }

  async function submitBlock(e: FormEvent) {
    e.preventDefault();
    if (!blockStart || !blockEnd) return;
    setMsg(null);
    const res = await fetch("/api/admin/time-blocks", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startAt: new Date(blockStart).toISOString(),
        endAt: new Date(blockEnd).toISOString(),
        reason: blockReason.trim() || undefined,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setMsg(j.error ?? "Could not block time.");
      return;
    }
    setBlockStart("");
    setBlockEnd("");
    setBlockReason("");
    setMsg("Time off blocked — customers won’t get overlapping slots.");
  }

  const uid = session?.user?.id;
  const unassignedMine = useMemo(() => appointments.filter((a) => !a.assignedStaffUserId), [appointments]);
  const mine = useMemo(() => appointments.filter((a) => uid && a.assignedStaffUserId === uid), [appointments, uid]);

  if (status !== "authenticated" || !session?.user) return null;

  return (
    <main className="mx-auto max-w-4xl flex-1 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Staff</p>
          <h1 className="text-2xl font-bold text-slate-900">Your workspace</h1>
          <p className="mt-2 max-w-xl text-sm text-slate-600">
            Shared queue plus visits assigned to you. Block personal time off, approve special requests, and mark
            completed visits.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link href="/admin" className="font-medium text-teal-700 underline underline-offset-2 hover:text-teal-800">
              Overview dashboard
            </Link>
            <Link
              href="/admin/settings"
              className="font-medium text-teal-700 underline underline-offset-2 hover:text-teal-800"
            >
              Hours &amp; settings
            </Link>
          </div>
        </div>
      </div>

      {loading && <p className="mt-8 text-sm text-slate-500">Loading…</p>}
      {msg && (
        <p className="mt-6 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">{msg}</p>
      )}

      <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Block time off</h2>
        <p className="mt-1 text-sm text-slate-500">Adds a personal blackout (not the whole business).</p>
        <form onSubmit={submitBlock} className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="block text-sm">
            <span className="text-slate-700">Start</span>
            <input
              type="datetime-local"
              value={blockStart}
              onChange={(e) => setBlockStart(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 sm:w-52"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-700">End</span>
            <input
              type="datetime-local"
              value={blockEnd}
              onChange={(e) => setBlockEnd(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 sm:w-52"
            />
          </label>
          <label className="block flex-1 text-sm sm:min-w-[200px]">
            <span className="text-slate-700">Reason (optional)</span>
            <input
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="PTO / training"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            className="h-10 rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Block
          </button>
        </form>
      </section>

      {!loading && (
        <>
          <section className="mt-10">
            <h2 className="text-base font-semibold text-slate-900">Unassigned queue</h2>
            <AppList
              items={unassignedMine}
              busyId={busyId}
              onPatch={patch}
              selfId={uid}
              empty="No unassigned visits in your business — good work."
            />
          </section>

          <section className="mt-10">
            <h2 className="text-base font-semibold text-slate-900">Assigned to me</h2>
            <AppList
              items={mine}
              busyId={busyId}
              onPatch={patch}
              selfId={uid}
              empty="No visits assigned to you yet. Claim one from the queue."
            />
          </section>
        </>
      )}
    </main>
  );
}

function AppList({
  items,
  busyId,
  onPatch,
  selfId,
  empty,
}: {
  items: Appointment[];
  busyId: string | null;
  onPatch: (id: string, b: Record<string, unknown>) => void;
  selfId?: string;
  empty: string;
}) {
  if (items.length === 0) {
    return (
      <p className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-600">
        {empty}
      </p>
    );
  }

  return (
    <ul className="mt-4 space-y-3">
      {items.map((a) => (
        <li key={a.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-900">{a.service.name}</p>
              <p className="text-sm text-slate-700">{a.customerName}</p>
              <p className="text-sm text-slate-500">{fmt(a.startAt)}</p>
              <p className="text-xs text-slate-500">{a.customerEmail}</p>
            </div>
            <AppointmentStatusBadge status={a.status} createdViaAiChat={Boolean(a.createdViaAiChat)} />
          </div>

          {a.specialRequestNote && a.specialRequestStatus === "PENDING" ? (
            <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50/90 px-3 py-2 text-sm text-amber-950">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Special request</p>
              <p className="mt-1 whitespace-pre-wrap">{a.specialRequestNote}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busyId === a.id}
                  className="rounded-md bg-emerald-700 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50"
                  onClick={() => onPatch(a.id, { specialRequestStatus: "APPROVED" })}
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={busyId === a.id}
                  className="rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium disabled:opacity-50"
                  onClick={() => onPatch(a.id, { specialRequestStatus: "REJECTED" })}
                >
                  Reject
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            {!a.assignedStaffUserId && selfId ? (
              <button
                type="button"
                disabled={busyId === a.id}
                className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-900 disabled:opacity-50"
                onClick={() => onPatch(a.id, { assignedStaffUserId: selfId })}
              >
                Claim visit
              </button>
            ) : null}
            {a.status === "CONFIRMED" || a.status === "RESCHEDULED" ? (
              <button
                type="button"
                disabled={busyId === a.id}
                className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                onClick={() => onPatch(a.id, { status: "COMPLETED" })}
              >
                Mark completed
              </button>
            ) : null}
            {a.status === "PENDING" ? (
              <button
                type="button"
                disabled={busyId === a.id}
                className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                onClick={() => onPatch(a.id, { status: "CONFIRMED" })}
              >
                Confirm
              </button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
