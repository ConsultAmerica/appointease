"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const sig = searchParams.get("sig") ?? "";
  const [status, setStatus] = useState<string | null>(null);

  async function verify() {
    const csrf = await fetch("/api/app/csrf", { credentials: "include" }).then((r) => r.json());
    const res = await fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrf.csrfToken },
      body: JSON.stringify({ token, ...(sig ? { sig } : {}) }),
    });
    const data = await res.json();
    setStatus(res.ok ? "Email verified. You can sign in now." : data.error ?? "Verification failed");
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-6 py-10">
      <h1 className="text-2xl font-bold">Verify email</h1>
      <p className="mt-2 text-sm text-slate-600">Confirm your account before signing in.</p>
      <button onClick={verify} className="mt-6 rounded bg-slate-900 px-4 py-2 text-white" disabled={!token}>
        Verify account
      </button>
      {!token ? <p className="mt-4 text-sm text-rose-700">Missing token in URL.</p> : null}
      {status ? <p className="mt-4 rounded bg-slate-100 p-3 text-sm">{status}</p> : null}
    </main>
  );
}
