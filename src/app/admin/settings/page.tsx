"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Rule = { id?: string; dayOfWeek: number; startMinute: number; endMinute: number };

function toTime(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function parseTime(s: string) {
  const [h, m] = s.split(":").map((x) => Number(x));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 9 * 60;
  return h * 60 + m;
}

type ServiceRow = {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
  isActive: boolean;
};

type StaffRow = { id: string; fullName: string; email: string };

export default function AdminSettingsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const myId = session?.user?.id;

  const [msg, setMsg] = useState<string | null>(null);
  const [bizRules, setBizRules] = useState<Rule[]>([]);
  const [staffList, setStaffList] = useState<StaffRow[]>([]);
  const [selectedStaffHours, setSelectedStaffHours] = useState("");
  const [staffRules, setStaffRules] = useState<Rule[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [blocks, setBlocks] = useState<
    Array<{ id: string; startAt: string; endAt: string; reason?: string | null; staffUser?: StaffRow | null }>
  >([]);

  const [newStaff, setNewStaff] = useState({ fullName: "", email: "", password: "" });
  const [srvName, setSrvName] = useState("");
  const [srvMin, setSrvMin] = useState(30);
  const [srvPrice, setSrvPrice] = useState(0);

  const [bizBlockStart, setBizBlockStart] = useState("");
  const [bizBlockEnd, setBizBlockEnd] = useState("");
  const [bizBlockReason, setBizBlockReason] = useState("");

  const load = useCallback(async () => {
    setMsg(null);
    const headers = { credentials: "include" } as RequestInit;

    if (!isAdmin) {
      return;
    }

    const [availRes, svcRes] = await Promise.all([
      fetch("/api/admin/availability", headers),
      fetch("/api/admin/services", headers),
    ]);

    if (availRes.status === 401 || svcRes.status === 401) {
      router.push("/auth/login");
      return;
    }
    if (availRes.ok) {
      const j = await availRes.json();
      setBizRules(Array.isArray(j.rules) ? j.rules : []);
    }

    if (svcRes.ok) {
      const j = await svcRes.json();
      setServices(Array.isArray(j.services) ? j.services : []);
    }

    const [stRes, blRes] = await Promise.all([
      fetch("/api/admin/staff", headers),
      fetch("/api/admin/time-blocks", headers),
    ]);
    if (stRes.ok) {
      const j = await stRes.json();
      setStaffList(Array.isArray(j.staff) ? j.staff : []);
    }
    if (blRes.ok) {
      const j = await blRes.json();
      setBlocks(Array.isArray(j.blocks) ? j.blocks : []);
    }
  }, [router, isAdmin]);

  useEffect(() => {
    if (status === "authenticated") void load();
  }, [status, load]);

  const loadStaffHours = useCallback(async (userId: string) => {
    const res = await fetch(`/api/admin/staff/${userId}/availability`, { credentials: "include" });
    if (!res.ok) return;
    const j = await res.json();
    setStaffRules(Array.isArray(j.rules) ? j.rules : []);
  }, []);

  useEffect(() => {
    const pick = selectedStaffHours || (!isAdmin && myId ? myId : "");
    if (pick) void loadStaffHours(pick);
  }, [selectedStaffHours, loadStaffHours, isAdmin, myId]);

  const staffHourTarget = useMemo(() => {
    if (selectedStaffHours) return selectedStaffHours;
    if (!isAdmin && myId) return myId;
    return "";
  }, [selectedStaffHours, isAdmin, myId]);

  async function saveBusinessHours(e: FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    const res = await fetch("/api/admin/availability", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rules: bizRules.map((r) => ({
          dayOfWeek: r.dayOfWeek,
          startMinute: r.startMinute,
          endMinute: r.endMinute,
        })),
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setMsg(j.error ?? "Save failed");
      return;
    }
    const j = await res.json();
    setBizRules(Array.isArray(j.rules) ? j.rules : []);
    setMsg("Business hours saved.");
  }

  async function saveStaffHours(e: FormEvent) {
    e.preventDefault();
    if (!staffHourTarget) return;
    const res = await fetch(`/api/admin/staff/${staffHourTarget}/availability`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rules: staffRules.map((r) => ({
          dayOfWeek: r.dayOfWeek,
          startMinute: r.startMinute,
          endMinute: r.endMinute,
        })),
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setMsg(j.error ?? "Could not save staff hours");
      return;
    }
    const j = await res.json();
    setStaffRules(Array.isArray(j.rules) ? j.rules : []);
    setMsg("Staff availability saved.");
  }

  async function addBusinessRuleRow() {
    setBizRules((r) => [...r, { dayOfWeek: 1, startMinute: 9 * 60, endMinute: 17 * 60 }]);
  }

  async function addStaffRuleRow() {
    setStaffRules((r) => [...r, { dayOfWeek: 1, startMinute: 9 * 60, endMinute: 17 * 60 }]);
  }

  async function createStaff(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/staff", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: newStaff.fullName.trim(),
        email: newStaff.email.trim(),
        password: newStaff.password,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setMsg(j.error ?? "Could not create staff");
      return;
    }
    setNewStaff({ fullName: "", email: "", password: "" });
    setMsg("Staff member added. Share their password securely.");
    await load();
  }

  async function createService(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/services", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: srvName.trim(),
        durationMinutes: srvMin,
        priceCents: Math.round(srvPrice * 100),
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setMsg(j.error ?? "Could not create service");
      return;
    }
    setSrvName("");
    await load();
  }

  async function toggleService(s: ServiceRow) {
    const res = await fetch(`/api/admin/services/${s.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !s.isActive }),
    });
    if (res.ok) await load();
  }

  async function submitBizBlock(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/time-blocks", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startAt: new Date(bizBlockStart).toISOString(),
        endAt: new Date(bizBlockEnd).toISOString(),
        reason: bizBlockReason.trim() || undefined,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setMsg(j.error ?? "Block failed");
      return;
    }
    setBizBlockStart("");
    setBizBlockEnd("");
    await load();
  }

  async function deleteBlock(id: string) {
    await fetch(`/api/admin/time-blocks/${id}`, { method: "DELETE", credentials: "include" });
    await load();
  }

  if (status !== "authenticated") return null;

  return (
    <main className="mx-auto max-w-3xl flex-1 px-4 py-8 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Workspace</p>
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
      <p className="mt-2 text-sm text-slate-600">
        {isAdmin
          ? "Business hours, services, staff accounts, blackout times."
          : "Your weekly availability (overrides inherited business windows when filled)."}
      </p>
      <div className="mt-4 flex gap-4 text-sm">
        <Link href="/admin" className="font-medium text-teal-700 underline underline-offset-2">
          Dashboard
        </Link>
        <Link href="/staff" className="font-medium text-teal-700 underline underline-offset-2">
          Staff workspace
        </Link>
        {isAdmin ? (
          <Link href="/admin/ai-logs" className="font-medium text-teal-700 underline underline-offset-2">
            AI logs
          </Link>
        ) : null}
      </div>

      {msg && (
        <p className="mt-6 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">{msg}</p>
      )}

      {isAdmin ? (
        <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Business hours</h2>
          <p className="mt-1 text-sm text-slate-500">Rules that define when customers see open slots.</p>
          <form onSubmit={saveBusinessHours} className="mt-4 space-y-3">
            {bizRules.map((r, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <select
                  aria-label={`Business hours rule ${i + 1}: day of week`}
                  value={r.dayOfWeek}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setBizRules((rows) =>
                      rows.map((row, idx) => (idx === i ? { ...row, dayOfWeek: v } : row)),
                    );
                  }}
                  className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                >
                  {WEEKDAYS.map((d, dow) => (
                    <option key={dow} value={dow}>
                      {d}
                    </option>
                  ))}
                </select>
                <input
                  aria-label={`Business hours rule ${i + 1}: start time`}
                  type="time"
                  value={toTime(r.startMinute)}
                  onChange={(e) => {
                    const v = parseTime(e.target.value);
                    setBizRules((rows) => rows.map((row, idx) => (idx === i ? { ...row, startMinute: v } : row)));
                  }}
                  className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                />
                <span className="text-slate-500">to</span>
                <input
                  aria-label={`Business hours rule ${i + 1}: end time`}
                  type="time"
                  value={toTime(r.endMinute)}
                  onChange={(e) => {
                    const v = parseTime(e.target.value);
                    setBizRules((rows) => rows.map((row, idx) => (idx === i ? { ...row, endMinute: v } : row)));
                  }}
                  className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                />
                <button
                  type="button"
                  className="text-xs text-rose-600 hover:underline"
                  onClick={() => setBizRules((rows) => rows.filter((_, idx) => idx !== i))}
                >
                  Remove
                </button>
              </div>
            ))}
            <div className="flex gap-3">
              <button type="button" className="text-sm font-medium text-teal-700" onClick={addBusinessRuleRow}>
                Add row
              </button>
              <button type="submit" className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white">
                Save hours
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {(isAdmin || session?.user?.role === "STAFF") && (
        <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Staff weekly availability</h2>
          <p className="mt-1 text-sm text-slate-500">
            If empty, each weekday follows business hours above. Saved rules replace business hours per weekday when
            present.
          </p>
          {isAdmin ? (
            <label className="mt-4 block text-sm">
              Staff member
              <select
                value={selectedStaffHours}
                onChange={(e) => setSelectedStaffHours(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="">Select…</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} ({s.email})
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {!isAdmin && session?.user?.role === "STAFF" ? (
            <p className="mt-3 text-sm text-slate-600">Editing weekly hours for: {session.user.name ?? "you"}</p>
          ) : null}

          {(isAdmin ? selectedStaffHours : session?.user?.role === "STAFF") ? (
            <form onSubmit={saveStaffHours} className="mt-4 space-y-3">
              {staffRules.map((r, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <select
                    aria-label={`Staff weekly hours rule ${i + 1}: day of week`}
                    value={r.dayOfWeek}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setStaffRules((rows) =>
                        rows.map((row, idx) => (idx === i ? { ...row, dayOfWeek: v } : row)),
                      );
                    }}
                    className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                  >
                    {WEEKDAYS.map((d, dow) => (
                      <option key={dow} value={dow}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <input
                    aria-label={`Staff weekly hours rule ${i + 1}: start time`}
                    type="time"
                    value={toTime(r.startMinute)}
                    onChange={(e) => {
                      const v = parseTime(e.target.value);
                      setStaffRules((rows) => rows.map((row, idx) => (idx === i ? { ...row, startMinute: v } : row)));
                    }}
                    className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                  />
                  <span className="text-slate-500">to</span>
                  <input
                    aria-label={`Staff weekly hours rule ${i + 1}: end time`}
                    type="time"
                    value={toTime(r.endMinute)}
                    onChange={(e) => {
                      const v = parseTime(e.target.value);
                      setStaffRules((rows) => rows.map((row, idx) => (idx === i ? { ...row, endMinute: v } : row)));
                    }}
                    className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    className="text-xs text-rose-600 hover:underline"
                    onClick={() => setStaffRules((rows) => rows.filter((_, idx) => idx !== i))}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <div className="flex gap-3">
                <button type="button" className="text-sm font-medium text-teal-700" onClick={addStaffRuleRow}>
                  Add row
                </button>
                <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                  Save staff hours
                </button>
              </div>
            </form>
          ) : (
            <p className="mt-3 text-sm text-slate-500">{isAdmin ? "Pick a staff member to edit weekly hours." : null}</p>
          )}
        </section>
      )}

      {isAdmin ? (
        <>
          <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Services</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {services.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2"
                >
                  <span className={`font-medium ${s.isActive ? "text-slate-900" : "text-slate-400 line-through"}`}>
                    {s.name} · {s.durationMinutes} min · {(s.priceCents / 100).toFixed(2)} USD
                  </span>
                  <button type="button" className="text-xs font-medium text-teal-700" onClick={() => toggleService(s)}>
                    {s.isActive ? "Deactivate" : "Activate"}
                  </button>
                </li>
              ))}
            </ul>
            <form onSubmit={createService} className="mt-4 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-4">
              <label className="text-sm">
                Name
                <input
                  value={srvName}
                  onChange={(e) => setSrvName(e.target.value)}
                  required
                  className="mt-1 block w-40 rounded-lg border border-slate-300 px-2 py-1.5"
                />
              </label>
              <label className="text-sm">
                Minutes
                <input
                  type="number"
                  min={5}
                  value={srvMin}
                  onChange={(e) => setSrvMin(Number(e.target.value))}
                  className="mt-1 block w-20 rounded-lg border border-slate-300 px-2 py-1.5"
                />
              </label>
              <label className="text-sm">
                Price (USD)
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={srvPrice}
                  onChange={(e) => setSrvPrice(Number(e.target.value))}
                  className="mt-1 block w-24 rounded-lg border border-slate-300 px-2 py-1.5"
                />
              </label>
              <button type="submit" className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white">
                Add service
              </button>
            </form>
          </section>

          <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Add staff login</h2>
            <form onSubmit={createStaff} className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                Full name
                <input
                  value={newStaff.fullName}
                  onChange={(e) => setNewStaff((x) => ({ ...x, fullName: e.target.value }))}
                  required
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm">
                Email
                <input
                  type="email"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff((x) => ({ ...x, email: e.target.value }))}
                  required
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="sm:col-span-2 text-sm">
                Temporary password (min 8 chars)
                <input
                  type="password"
                  minLength={8}
                  value={newStaff.password}
                  onChange={(e) => setNewStaff((x) => ({ ...x, password: e.target.value }))}
                  required
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white sm:col-span-2"
              >
                Create staff user
              </button>
            </form>
          </section>

          <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Business-wide blackout</h2>
            <p className="mt-1 text-sm text-slate-500">Removes overlapping slots from the booking calendar.</p>
            <form onSubmit={submitBizBlock} className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="flex min-w-0 flex-col gap-1">
                <label htmlFor="admin-biz-block-start" className="text-xs font-medium text-slate-600">
                  Block starts
                </label>
                <input
                  id="admin-biz-block-start"
                  type="datetime-local"
                  value={bizBlockStart}
                  onChange={(e) => setBizBlockStart(e.target.value)}
                  required
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <label htmlFor="admin-biz-block-end" className="text-xs font-medium text-slate-600">
                  Block ends
                </label>
                <input
                  id="admin-biz-block-end"
                  type="datetime-local"
                  value={bizBlockEnd}
                  onChange={(e) => setBizBlockEnd(e.target.value)}
                  required
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex min-w-[200px] flex-1 flex-col gap-1">
                <label htmlFor="admin-biz-block-reason" className="text-xs font-medium text-slate-600">
                  Reason (optional)
                </label>
                <input
                  id="admin-biz-block-reason"
                  value={bizBlockReason}
                  onChange={(e) => setBizBlockReason(e.target.value)}
                  placeholder="Holiday / maintenance"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <button type="submit" className="rounded-lg bg-rose-800 px-4 py-2 text-sm font-semibold text-white">
                Block
              </button>
            </form>
          </section>

          <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Blocked times</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {blocks.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                  <span>
                    {new Date(b.startAt).toLocaleString()} → {new Date(b.endAt).toLocaleString()}
                    {b.staffUser ? ` · ${b.staffUser.fullName}` : " · Whole business"}
                    {b.reason ? ` · ${b.reason}` : ""}
                  </span>
                  <button type="button" className="text-xs text-rose-700" onClick={() => deleteBlock(b.id)}>
                    Remove
                  </button>
                </li>
              ))}
              {blocks.length === 0 ? <li className="text-slate-500">None scheduled ahead.</li> : null}
            </ul>
          </section>

          <section className="mt-10 rounded-2xl border border-teal-200 bg-teal-50/60 p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Workspace coverage</h2>
            <p className="mt-1 text-sm text-slate-600">
              The main <Link className="font-medium text-teal-800 underline-offset-2 hover:underline" href="/admin">admin overview</Link>{" "}
              is backed by your database: today, upcoming, cancelled, staff, services, and customers with bookings.
            </p>
            <h3 className="mt-4 text-sm font-semibold text-slate-800">Roadmap — SaaS-grade integrations</h3>
            <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-slate-700">
              <li>
                <span className="font-medium text-slate-900">Email / SMS confirmation</span> — after booking, message
                customers with copy like: “Your appointment is confirmed for Friday at 3:15 PM.” Wire transactional
                email (Resend, SendGrid, or Gmail API) and optional SMS (Twilio) behind a small provider layer.
              </li>
              <li>
                <span className="font-medium text-slate-900">Google Calendar sync</span> — on book/update/cancel,
                create or update a Google Calendar event per business or staff (OAuth + Calendar API).
              </li>
              <li>
                <span className="font-medium text-slate-900">Voice agent</span> — customers speak instead of typing
                (e.g. “Do you have any openings tomorrow?”). Plan as an advanced phase using OpenAI Agents + Realtime
                voice docs, reusing the same scheduling tools server-side.
              </li>
            </ol>
            <p className="mt-3 text-xs text-slate-500">
              Details and env placeholders: see <code className="rounded bg-white px-1 py-0.5">README.md</code> (
              <span className="font-medium">Roadmap: SaaS-grade integrations</span>) and <code className="rounded bg-white px-1 py-0.5">.env.example</code>.
            </p>
          </section>
        </>
      ) : null}
    </main>
  );
}
