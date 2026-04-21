"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

function signInErrorMessage(code: string | undefined): string {
  if (!code || code === "CredentialsSignin") {
    return "Invalid email or password.";
  }
  return `Sign in failed: ${code}`;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(signInErrorMessage(result.error ?? undefined));
        return;
      }

      if (!result?.ok) {
        setError("Sign in did not complete. Check your connection and try again.");
        return;
      }

      /**
       * Full navigation to `/auth/continue` — session cookie is already set on the credentials
       * response. Middleware (or the continue page) routes by role so we don’t rely on client
       * `getSession()` timing, which often breaks on LAN / slow devices.
       */
      window.location.replace("/auth/continue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-6 py-10">
      <h1 className="text-2xl font-bold">Sign in</h1>
      <p className="mt-2 text-sm text-slate-600">Admin and customer login.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <label className="block text-sm font-medium text-slate-700">
          Email
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-slate-900"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Password
          <input
            type="password"
            required
            autoComplete="current-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-slate-900"
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-slate-900 px-4 py-2.5 font-medium text-white disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
      {error && (
        <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">
          {error}
        </p>
      )}
      <p className="mt-4 text-sm text-slate-600">
        No account?{" "}
        <a href="/auth/register" className="font-medium text-blue-600 underline">
          Create one
        </a>
      </p>
      <p className="mt-2 text-sm text-slate-600">
        Forgot password?{" "}
        <a href="/auth/forgot-password" className="font-medium text-blue-600 underline">
          Reset it
        </a>
      </p>
      <p className="mt-2 text-sm text-slate-600">
        Didn&apos;t get the verification email?{" "}
        <a href="/auth/resend-verification" className="font-medium text-blue-600 underline">
          Resend
        </a>
      </p>
    </main>
  );
}
