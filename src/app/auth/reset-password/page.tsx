"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const sig = searchParams.get("sig") ?? "";
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const csrf = await fetch("/api/app/csrf", { credentials: "include" }).then((r) => r.json());
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrf.csrfToken },
      body: JSON.stringify({ token, password, ...(sig ? { sig } : {}) }),
    });
    const data = await res.json();
    setStatus(res.ok ? "Password updated. You can sign in now." : data.error ?? "Reset failed");
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-6 py-10">
      <h1 className="text-2xl font-bold">Reset password</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <label className="block text-sm">
          New password
          <input
            type="password"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>
        <button className="rounded bg-slate-900 px-4 py-2 text-white" disabled={!token}>
          Update password
        </button>
      </form>
      {!token ? <p className="mt-4 text-sm text-rose-700">Missing token in URL.</p> : null}
      {status ? <p className="mt-4 rounded bg-slate-100 p-3 text-sm">{status}</p> : null}
    </main>
  );
}
