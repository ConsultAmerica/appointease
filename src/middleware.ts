import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth?.user;
  const role = req.auth?.user?.role;
  const { pathname } = req.nextUrl;

  const isAdminRoute = pathname.startsWith("/admin");
  const isCustomerRoute = pathname.startsWith("/customer");
  const isAuthRoute = pathname.startsWith("/auth/");

  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL(role === "CUSTOMER" ? "/customer" : "/admin", req.url));
  }

  if (isAdminRoute) {
    if (!isLoggedIn) return NextResponse.redirect(new URL("/auth/login", req.url));
    if (role !== "ADMIN" && role !== "STAFF") {
      return NextResponse.redirect(new URL("/customer", req.url));
    }
  }

  if (isCustomerRoute) {
    if (!isLoggedIn) return NextResponse.redirect(new URL("/auth/login", req.url));
    if (role !== "CUSTOMER") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/customer/:path*", "/auth/:path*"],
};
