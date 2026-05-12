import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth?.user;
  const role = req.auth?.user?.role;
  const { pathname } = req.nextUrl;

  const isAdminRoute = pathname.startsWith("/admin");
  const isStaffRoute = pathname.startsWith("/staff");
  const isCustomerRoute = pathname.startsWith("/customer");
  const isAuthRoute = pathname.startsWith("/auth/");
  /** Let this route run on the server (`auth()` + `redirect`) so the session cookie is always read after credentials sign-in. */
  const isPostSignInContinue = pathname === "/auth/continue";

  if (isAuthRoute && isLoggedIn && !isPostSignInContinue) {
    const dashboard =
      role === "CUSTOMER" ? "/customer" : role === "STAFF" ? "/staff" : "/admin";
    return NextResponse.redirect(new URL(dashboard, req.url));
  }

  if (isAdminRoute || isStaffRoute) {
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
  matcher: ["/admin/:path*", "/staff/:path*", "/customer/:path*", "/auth/:path*"],
};
