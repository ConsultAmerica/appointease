import { redirect } from "next/navigation";
import { auth } from "@/auth";

/**
 * Post–sign-in handoff. Middleware usually redirects logged-in users away from `/auth/*`
 * before this runs; this page is a reliable fallback to route by role.
 */
export default async function AuthContinuePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/login");
  }
  if (session.user.role === "CUSTOMER") {
    redirect("/customer");
  }
  redirect("/admin");
}
