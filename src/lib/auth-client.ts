"use client";

/** Client-only helpers for reading the session cookie after sign-in. */

import { getSession } from "next-auth/react";

const POST_SIGNIN_PATH = "/auth/continue";

export type PostAuthWelcomeKind = "sign-in" | "register";

/**
 * After credentials `signIn(..., { redirect: false })`, the browser must apply `Set-Cookie`
 * before the next navigation. A zero-delay tick + short wait avoids landing on `/auth/login`
 * with “no session” on some browsers / LAN setups.
 */
export function navigateAfterCredentialsSignIn(kind: PostAuthWelcomeKind = "sign-in") {
  try {
    sessionStorage.setItem("appointease-welcome", kind);
  } catch {
    /* private mode / disabled storage */
  }
  const go = () => {
    window.location.assign(POST_SIGNIN_PATH);
  };
  window.setTimeout(() => {
    requestAnimationFrame(go);
  }, 80);
}

/** `error` is the Auth.js error type; `code` is the optional credential error code (e.g. `database_unavailable`). */
export function mapCredentialsSignInError(error: string | undefined, code?: string | undefined): string {
  if (code === "database_unavailable") {
    return "Cannot reach the database right now. Try again in a moment. If you run this app yourself, confirm DATABASE_URL is set (e.g. in Vercel env or .env) and your Postgres provider allows connections.";
  }
  if (!error || error === "CredentialsSignin") {
    return "Invalid email or password.";
  }
  if (error === "Configuration") {
    return "Server sign-in is misconfigured (often missing or invalid AUTH_SECRET). Check deployment environment variables or the server console.";
  }
  if (error === "AccessDenied") {
    return "Sign in was denied. Your account may need email verification.";
  }
  return `Sign in failed (${error}). Try again or contact support.`;
}

export type ClientSession = {
  user?: {
    name?: string | null;
    email?: string | null;
    role?: string;
  };
} | null;

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * After `signIn("credentials", …)`, the session cookie is set on the response but
 * `getSession()` / `/api/auth/session` can lag one tick. Poll both until `role` appears.
 */
export async function waitForSessionAfterSignIn(maxAttempts = 18): Promise<ClientSession> {
  for (let i = 0; i < maxAttempts; i++) {
    const fromReact = await getSession();
    if (
      fromReact?.user &&
      typeof fromReact.user === "object" &&
      "role" in fromReact.user &&
      (fromReact.user as { role?: string }).role
    ) {
      return fromReact as ClientSession;
    }

    const res = await fetch(`/api/auth/session?_${Date.now()}`, {
      credentials: "include",
      cache: "no-store",
    });
    if (res.ok) {
      const data = (await res.json()) as ClientSession;
      if (data?.user?.role) {
        return data;
      }
    }

    await delay(50 + i * 45);
  }
  return null;
}

/** @deprecated Prefer waitForSessionAfterSignIn after credentials sign-in */
export async function fetchClientSession(retries = 4): Promise<ClientSession> {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(`/api/auth/session?_${Date.now()}`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) {
      await delay(100 * (i + 1));
      continue;
    }
    const data = (await res.json()) as ClientSession;
    if (data?.user?.role) {
      return data;
    }
    await delay(100 * (i + 1));
  }
  return null;
}

export function formatAuthApiError(data: {
  error?: unknown;
  details?: unknown;
}): string {
  const parts: string[] = [];
  if (typeof data.error === "string" && data.error.trim()) {
    parts.push(data.error.trim());
  }
  if (typeof data.details === "string" && data.details.trim()) {
    parts.push(data.details.trim());
  }
  if (parts.length > 0) {
    return parts.join(" — ");
  }
  return "Something went wrong. Please try again.";
}
