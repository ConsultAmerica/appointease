import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ensureCsrfCookie } from "@/lib/security";
import { hashToken } from "@/lib/tokens";

/**
 * App CSRF for custom routes (register, forgot-password, etc.).
 * Must NOT live at `/api/auth/csrf` — that path is used by Auth.js for `signIn` / `getCsrfToken()`.
 */
export async function GET() {
  await ensureCsrfCookie();
  const store = await cookies();
  const raw = store.get("csrf-token")?.value ?? "";
  return NextResponse.json({ csrfToken: hashToken(raw) });
}
