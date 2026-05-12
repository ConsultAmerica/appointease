import type { Session } from "next-auth";
import { auth } from "@/auth";

export type BusinessSession =
  | { ok: true; session: Session; businessId: string }
  | { ok: false; status: 401 | 403; message: string };

export async function requireBusinessStaff(): Promise<BusinessSession> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, status: 401, message: "Unauthorized" };
  }
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "STAFF") {
    return { ok: false, status: 403, message: "Forbidden" };
  }
  const businessId = session.user.businessId;
  if (!businessId) {
    return { ok: false, status: 403, message: "Business context missing" };
  }
  return { ok: true, session, businessId };
}

export async function requireBusinessAdmin(): Promise<BusinessSession> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, status: 401, message: "Unauthorized" };
  }
  if (session.user.role !== "ADMIN") {
    return { ok: false, status: 403, message: "Admin only" };
  }
  const businessId = session.user.businessId;
  if (!businessId) {
    return { ok: false, status: 403, message: "Business context missing" };
  }
  return { ok: true, session, businessId };
}
