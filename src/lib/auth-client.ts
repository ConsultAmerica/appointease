"use client";

/** Client-only helpers for reading the session cookie after sign-in. */

import { getSession } from "next-auth/react";

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
