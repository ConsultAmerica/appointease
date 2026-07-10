"use client";

import { FormEvent, useState } from "react";

export default function ResendVerificationPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const csrf = await fetch("/api/app/csrf", { credentials: "include" }).then((r) => r.json());
    const res = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrf.csrfToken },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setStatus(
      res.ok
        ? "If an unverified account exists for this email, we sent a new verification link."
        : data.error ?? "Request failed",
    );
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-6 py-10">
      <h1 className="text-2xl font-bold">Resend verification email</h1>
      <p className="mt-2 text-sm text-slate-600">Use the same email you registered with.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-surface p-6">
        <label className="block text-sm">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>
        <button className="pro-btn-primary px-4 py-2">Send verification email</button>
      </form>
      {status ? <p className="mt-4 rounded bg-slate-100 p-3 text-sm">{status}</p> : null}
      <p className="mt-4 text-sm">
        <a href="/auth/login" className="underline">
          Back to sign in
        </a>
      </p>
    </main>
  );
}
