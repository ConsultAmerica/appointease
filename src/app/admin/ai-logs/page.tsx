"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { lastUserUtterance, summarizeAgentLogReply } from "@/lib/agent-log-display";

type Log = {
  id: string;
  customerEmail?: string | null;
  reply: string;
  messages: unknown;
  createdAt: string;
};

export default function AiLogsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [logs, setLogs] = useState<Log[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/agent-conversations", { credentials: "include" });
    if (res.status === 401) {
      router.push("/auth/login");
      return;
    }
    if (res.status === 403) {
      setErr("Only business administrators can view AI logs.");
      return;
    }
    if (!res.ok) {
      setErr("Could not load conversations.");
      return;
    }
    const j = await res.json();
    setLogs(Array.isArray(j.conversations) ? j.conversations : []);
  }, [router]);

  useEffect(() => {
    if (status === "authenticated") {
      if (session?.user?.role !== "ADMIN") {
        setErr("Admin only.");
        return;
      }
      void load();
    }
  }, [status, session?.user?.role, load]);

  if (status !== "authenticated") return null;

  return (
    <main className="mx-auto max-w-4xl flex-1 px-4 py-8 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Transparency</p>
          <h1 className="text-2xl font-bold text-slate-900">AI conversation logs</h1>
          <p className="mt-2 text-sm text-slate-600">
            Recent assistant turns from your workspace (sessions that had a logged-in admin/staff member are tied to
            this business).
          </p>
        </div>
        <Link href="/admin" className="shrink-0 text-sm font-medium text-teal-700 underline underline-offset-2">
          Dashboard
        </Link>
      </div>

      {session?.user?.role !== "ADMIN" ? (
        <p className="mt-8 text-sm text-rose-800">{err ?? "Restricted."}</p>
      ) : err ? (
        <p className="mt-8 text-sm text-rose-800">{err}</p>
      ) : (
        <ul className="mt-8 space-y-4">
          {logs.map((log) => (
            <LogCard key={log.id} log={log} />
          ))}
          {logs.length === 0 && (
            <li className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-500">
              No logs yet. Logs are recorded when chats complete after successful runs.
            </li>
          )}
        </ul>
      )}
    </main>
  );
}

function LogCard({ log }: { log: Log }) {
  const [open, setOpen] = useState(false);
  const userLine = lastUserUtterance(log.messages);
  const { displayReply, actionLabel, statusLabel } = summarizeAgentLogReply(log.reply);

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleString()}</p>
      {log.customerEmail ? (
        <p className="mt-1 text-xs font-medium text-slate-700">Signed in as {log.customerEmail}</p>
      ) : null}

      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">User</dt>
          <dd className="mt-1 whitespace-pre-wrap text-slate-900">{userLine ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">AI</dt>
          <dd className="mt-1 whitespace-pre-wrap text-slate-900">{displayReply || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Action taken</dt>
          <dd className="mt-1 text-slate-800">{actionLabel}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</dt>
          <dd className="mt-1 text-slate-700">{statusLabel}</dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mt-4 text-xs font-semibold text-teal-800 underline underline-offset-2 hover:text-teal-950"
      >
        {open ? "Hide technical details" : "View technical details"}
      </button>
      {open ? (
        <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-800 ring-1 ring-slate-200/80">
          {JSON.stringify(log.messages, null, 2)}
        </pre>
      ) : null}
    </li>
  );
}
