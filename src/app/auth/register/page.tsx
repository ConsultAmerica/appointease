"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { formatAuthApiError } from "@/lib/auth-client";
import { getBrowserTimezone, getTimezoneOptions } from "@/lib/timezones";

type Business = { id: string; name: string };

export default function RegisterPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [role, setRole] = useState<"ADMIN" | "CUSTOMER">("ADMIN");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessId, setBusinessId] = useState("");
  const timezoneOptions = useMemo(() => getTimezoneOptions(), []);
  const [timezone, setTimezone] = useState(() => getBrowserTimezone());
  const [feedback, setFeedback] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/businesses", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        const list: Business[] = (data.businesses ?? []).map((b: { id: string; name: string }) => ({
          id: b.id,
          name: b.name,
        }));
        setBusinesses(list);
        if (list[0]) setBusinessId(list[0].id);
      })
      .catch(() => {
        setFeedback({ tone: "error", text: "Could not load businesses. Refresh the page." });
      });
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFeedback({ tone: "info", text: "Creating account…" });
    setSubmitting(true);

    try {
      const csrfRes = await fetch("/api/app/csrf", { credentials: "include" });
      const csrf = await csrfRes.json();
      if (!csrf?.csrfToken) {
        setFeedback({
          tone: "error",
          text: "Security token missing. Refresh the page and try again.",
        });
        return;
      }

      const res = await fetch("/api/auth/register", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "x-csrf-token": csrf.csrfToken },
        body: JSON.stringify({
          role,
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          businessName: role === "ADMIN" ? businessName.trim() : undefined,
          businessId: role === "CUSTOMER" ? businessId : undefined,
          timezone,
        }),
      });

      let data: { error?: string; details?: string; ok?: boolean } = {};
      try {
        data = await res.json();
      } catch {
        setFeedback({
          tone: "error",
          text: `Registration failed (${res.status}). Please try again.`,
        });
        return;
      }

      if (!res.ok) {
        if (res.status === 403) {
          setFeedback({
            tone: "error",
            text: "Security check failed. Refresh the page, then try again.",
          });
          return;
        }
        setFeedback({ tone: "error", text: formatAuthApiError(data) });
        return;
      }

      setFeedback({ tone: "info", text: "Signing you in…" });

      const signInResult = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        setFeedback({
          tone: "error",
          text: `Account created, but automatic sign-in failed (${signInResult.error}). Open Sign in and log in manually.`,
        });
        return;
      }

      if (!signInResult?.ok) {
        setFeedback({
          tone: "error",
          text: "Account created, but sign-in did not finish. Open Sign in and log in manually.",
        });
        return;
      }

      window.location.replace("/auth/continue");
    } finally {
      setSubmitting(false);
    }
  }

  const customerDisabled = role === "CUSTOMER" && businesses.length === 0;

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
      <h1 className="text-2xl font-bold">Create account</h1>
      <p className="mt-2 text-sm text-slate-600">Register as business admin or customer.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <label className="block text-sm font-medium text-slate-700">
          Role
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "ADMIN" | "CUSTOMER")}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-slate-900"
          >
            <option value="ADMIN">Admin (create a business)</option>
            <option value="CUSTOMER" disabled={businesses.length === 0}>
              Customer (join a business)
            </option>
          </select>
        </label>
        {customerDisabled && (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            No businesses are available yet. Register as <strong>Admin</strong> first, or run{" "}
            <code className="rounded bg-amber-100 px-1">npm run db:seed</code> for demo data.
          </p>
        )}

        <label className="block text-sm font-medium text-slate-700">
          Full name
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-slate-900"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-slate-900"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Password
          <input
            type="password"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-slate-900"
          />
        </label>

        {role === "ADMIN" ? (
          <>
            <label className="block text-sm font-medium text-slate-700">
              Business name
              <input
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-slate-900"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Timezone
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-slate-900"
              >
                {timezoneOptions.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">Used to show appointment times in your local region.</p>
            </label>
          </>
        ) : (
          <label className="block text-sm font-medium text-slate-700">
            Choose business
            <select
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value)}
              required
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-slate-900"
            >
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <button
          type="submit"
          disabled={submitting || customerDisabled}
          className="w-full rounded-lg bg-slate-900 px-4 py-2.5 font-medium text-white disabled:opacity-60"
        >
          {submitting ? "Please wait…" : "Create account"}
        </button>
      </form>

      {feedback && (
        <p
          className={`mt-4 rounded-lg border p-3 text-sm ${
            feedback.tone === "error"
              ? "border-rose-200 bg-rose-50 text-rose-900"
              : "border-slate-200 bg-slate-50 text-slate-800"
          }`}
          role={feedback.tone === "error" ? "alert" : "status"}
        >
          {feedback.text}
        </p>
      )}
      <p className="mt-4 text-sm text-slate-600">
        Already registered?{" "}
        <a href="/auth/login" className="font-medium text-blue-600 underline">
          Sign in
        </a>
      </p>
    </main>
  );
}
