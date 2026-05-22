import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "@/auth.config";

const { auth } = NextAuth(authConfig);

/** Routes that must stay public (guest booking from social links, etc.). */
function isPublicRoute(pathname: string, method: string): boolean {
  if (pathname === "/book" || pathname.startsWith("/book/")) return true;
  if (pathname === "/api/bookings" && method === "POST") return true;
  if (pathname === "/api/businesses" && method === "GET") return true;
  if (pathname.startsWith("/api/businesses/") && pathname.endsWith("/availability") && method === "GET") {
    return true;
  }
  if (pathname === "/api/health") return true;
  return false;
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const method = req.method;

  if (isPublicRoute(pathname, method)) {
    return NextResponse.next();
  }

  const isLoggedIn = !!req.auth?.user;
  const role = req.auth?.user?.role;

  const isAdminRoute = pathname.startsWith("/admin");
  const isStaffRoute = pathname.startsWith("/staff");
  const isCustomerRoute = pathname.startsWith("/customer");
  const isOnboardingRoute = pathname.startsWith("/onboarding");
  /** Login/register stay public for guests; signed-in users are sent to their dashboard. */
  const isAuthRoute = pathname.startsWith("/auth/");
  const isPostSignInContinue = pathname === "/auth/continue";

  if (isAuthRoute && isLoggedIn && !isPostSignInContinue) {
    const dashboard =
      role === "CUSTOMER" ? "/customer" : role === "STAFF" ? "/staff" : "/admin";
    return NextResponse.redirect(new URL(dashboard, req.url));
  }

  if (isAdminRoute || isStaffRoute || isOnboardingRoute) {
    if (!isLoggedIn) return NextResponse.redirect(new URL("/auth/login", req.url));
    if (role !== "ADMIN" && role !== "STAFF") {
      return NextResponse.redirect(new URL("/customer", req.url));
    }
  }

  if (isCustomerRoute) {
    if (!isLoggedIn) return NextResponse.redirect(new URL("/auth/login", req.url));
    if (role !== "CUSTOMER") {
      return NextResponse.redirect(new URL(role === "STAFF" ? "/staff" : "/admin", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/admin/:path*",
    "/staff/:path*",
    "/customer/:path*",
    "/onboarding/:path*",
    "/auth/:path*",
    "/book",
    "/book/:path*",
    "/api/bookings",
    "/api/businesses",
    "/api/businesses/:businessId/availability",
  ],
};
