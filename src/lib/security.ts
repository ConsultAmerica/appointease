import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { hashToken } from "@/lib/tokens";

export { checkRateLimit } from "@/lib/rate-limit";

export async function ensureCsrfCookie() {
  const store = await cookies();
  const existing = store.get("csrf-token")?.value;
  if (!existing) {
    const nonce = cryptoRandom();
    store.set("csrf-token", nonce, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  }
}

export async function verifyCsrf(req: Request): Promise<boolean> {
  const store = await cookies();
  const cookieToken = store.get("csrf-token")?.value;
  const headerToken = req.headers.get("x-csrf-token");
  if (!cookieToken || !headerToken) return false;
  return hashToken(cookieToken) === headerToken;
}

export function csrfError() {
  return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
}

function cryptoRandom() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
