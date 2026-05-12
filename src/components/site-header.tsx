"use client";

import type { Session } from "next-auth";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogoMark } from "@/components/logo-mark";

const PRODUCT = "AppointmentAI";

export function SiteHeader({ session }: { session: Session | null }) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <header
      className={
        isHome
          ? "sticky top-0 z-50 border-b border-white/15 bg-teal-800/90 text-white backdrop-blur-md"
          : "border-b border-slate-200 bg-white text-slate-900"
      }
    >
      <nav className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight">
          <LogoMark variant={isHome ? "onBlue" : "default"} className="h-9 w-9 shrink-0" />
          <span className={isHome ? "text-white" : "text-slate-900"}>{PRODUCT}</span>
        </Link>

        <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-6 text-sm font-medium md:flex">
          <NavLink href="/" isHome={isHome} active={pathname === "/"}>
            Home
          </NavLink>
          <NavLink href="/book" isHome={isHome} active={pathname.startsWith("/book")}>
            Book Appointment
          </NavLink>
          <NavLink href="/chat" isHome={isHome} active={pathname.startsWith("/chat")}>
            AI chat
          </NavLink>
          {session?.user?.role === "CUSTOMER" ? (
            <NavLink href="/customer" isHome={isHome} active={pathname.startsWith("/customer")}>
              My Appointments
            </NavLink>
          ) : null}
        </div>

        <div className="flex items-center gap-3 text-sm">
          <HeaderAuth session={session} isHome={isHome} />
        </div>
      </nav>
    </header>
  );
}

function NavLink({
  href,
  isHome,
  active,
  children,
}: {
  href: string;
  isHome: boolean;
  active: boolean;
  children: ReactNode;
}) {
  const base = isHome
    ? active
      ? "font-semibold text-white"
      : "text-white/90 hover:text-white"
    : active
      ? "font-semibold text-teal-700"
      : "text-slate-600 hover:text-slate-900";
  return (
    <Link href={href} className={base}>
      {children}
    </Link>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AdminStaffUserMenu({
  isHome,
  displayName,
  initial,
  staffRole,
}: {
  isHome: boolean;
  displayName: string;
  initial: string;
  staffRole: "ADMIN" | "STAFF";
}) {
  const panel = isHome
    ? "border-white/20 bg-slate-900/95 text-white shadow-xl ring-1 ring-white/10"
    : "border-slate-200 bg-white text-slate-900 shadow-xl ring-1 ring-slate-200/80";
  const item = isHome
    ? "text-white/95 hover:bg-white/10"
    : "text-slate-700 hover:bg-slate-50";
  const itemMuted = isHome ? "text-teal-100" : "text-slate-500";
  const roleLabel = staffRole === "ADMIN" ? "Administrator" : "Staff";

  return (
    <details className="group relative mr-1">
      <summary
        className={`flex cursor-pointer list-none items-center gap-1 rounded-full border py-1 pl-1 pr-2 transition [&::-webkit-details-marker]:hidden sm:pr-3 ${
          isHome ? "border-white/25 bg-white/10 hover:bg-white/15" : "border-slate-200 bg-slate-50 hover:bg-slate-100"
        }`}
      >
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
            isHome ? "bg-white/25" : "bg-slate-800"
          }`}
        >
          {initial}
        </span>
        <div className="hidden min-w-0 text-left leading-tight sm:block">
          <p className={`max-w-[160px] truncate text-xs font-semibold ${isHome ? "text-white" : "text-slate-900"}`}>
            {displayName}
          </p>
          <p className={`text-[11px] ${isHome ? "text-teal-100" : "text-slate-500"}`}>{roleLabel}</p>
        </div>
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 opacity-60 transition group-open:rotate-180 ${isHome ? "text-white" : "text-slate-600"}`}
          aria-hidden
        />
      </summary>
      <div
        className={`absolute right-0 z-50 mt-2 min-w-[220px] overflow-hidden rounded-xl py-1 ${panel}`}
        role="menu"
      >
        <div className={`border-b px-4 py-3 sm:hidden ${isHome ? "border-white/15" : "border-slate-100"}`}>
          <p className="font-semibold">{displayName}</p>
          <p className={`text-xs ${itemMuted}`}>{roleLabel}</p>
        </div>
        <Link href="/admin" className={`block px-4 py-2.5 text-sm font-medium ${item}`} role="menuitem">
          Admin dashboard
        </Link>
        <Link href="/staff" className={`block px-4 py-2.5 text-sm font-medium ${item}`} role="menuitem">
          Staff workspace
        </Link>
        <Link href="/admin/settings" className={`block px-4 py-2.5 text-sm font-medium ${item}`} role="menuitem">
          Workspace settings
        </Link>
        {staffRole === "ADMIN" ? (
          <Link href="/admin/ai-logs" className={`block px-4 py-2.5 text-sm font-medium ${item}`} role="menuitem">
            AI conversation logs
          </Link>
        ) : null}
        <Link href="/onboarding" className={`block px-4 py-2.5 text-sm font-medium ${item}`} role="menuitem">
          Business setup
        </Link>
        <Link href="/book" className={`block px-4 py-2.5 text-sm font-medium ${item}`} role="menuitem">
          Book appointment
        </Link>
        <Link href="/chat" className={`block px-4 py-2.5 text-sm font-medium ${item}`} role="menuitem">
          AI chat booking
        </Link>
        <button
          type="button"
          className={`w-full px-4 py-2.5 text-left text-sm font-medium ${item}`}
          role="menuitem"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          Sign out
        </button>
      </div>
    </details>
  );
}

function CustomerUserMenu({
  isHome,
  displayName,
  initial,
}: {
  isHome: boolean;
  displayName: string;
  initial: string;
}) {
  const panel = isHome
    ? "border-white/20 bg-slate-900/95 text-white shadow-xl ring-1 ring-white/10"
    : "border-slate-200 bg-white text-slate-900 shadow-xl ring-1 ring-slate-200/80";
  const item = isHome
    ? "text-white/95 hover:bg-white/10"
    : "text-slate-700 hover:bg-slate-50";
  const itemMuted = isHome ? "text-teal-100" : "text-slate-500";

  return (
    <details className="group relative mr-1">
      <summary
        className={`flex cursor-pointer list-none items-center gap-1 rounded-full border py-1 pl-1 pr-2 transition marker:content-none [&::-webkit-details-marker]:hidden sm:pr-3 ${
          isHome ? "border-white/25 bg-white/10 hover:bg-white/15" : "border-slate-200 bg-slate-50 hover:bg-slate-100"
        }`}
      >
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
            isHome ? "bg-white/25" : "bg-teal-700"
          }`}
        >
          {initial}
        </span>
        <div className="hidden min-w-0 text-left leading-tight sm:block">
          <p className={`max-w-[140px] truncate text-xs font-semibold ${isHome ? "text-white" : "text-slate-900"}`}>
            {displayName}
          </p>
          <p className={`text-[11px] ${isHome ? "text-teal-100" : "text-slate-500"}`}>Member</p>
        </div>
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 opacity-60 transition group-open:rotate-180 ${isHome ? "text-white" : "text-slate-600"}`}
          aria-hidden
        />
      </summary>
      <div
        className={`absolute right-0 z-50 mt-2 min-w-[220px] overflow-hidden rounded-xl py-1 ${panel}`}
        role="menu"
      >
        <div className={`border-b px-4 py-3 sm:hidden ${isHome ? "border-white/15" : "border-slate-100"}`}>
          <p className="font-semibold">{displayName}</p>
          <p className={`text-xs ${itemMuted}`}>Member</p>
        </div>
        <Link href="/customer" className={`block px-4 py-2.5 text-sm font-medium ${item}`} role="menuitem">
          My appointments
        </Link>
        <Link href="/book" className={`block px-4 py-2.5 text-sm font-medium ${item}`} role="menuitem">
          Book appointment
        </Link>
        <Link href="/chat" className={`block px-4 py-2.5 text-sm font-medium ${item}`} role="menuitem">
          AI chat booking
        </Link>
        <button
          type="button"
          className={`w-full px-4 py-2.5 text-left text-sm font-medium ${item}`}
          role="menuitem"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          Sign out
        </button>
      </div>
    </details>
  );
}

function HeaderAuth({ session, isHome }: { session: Session | null; isHome: boolean }) {
  const linkMuted = isHome ? "text-white/90 hover:text-white" : "text-slate-600 hover:text-slate-900";

  if (!session?.user) {
    return (
      <>
        <a href="/auth/login" className={`font-medium ${linkMuted}`}>
          Sign In
        </a>
        <a
          href="/auth/register"
          className={
            isHome
              ? "rounded-full bg-white px-4 py-2 font-semibold text-teal-700 shadow-sm transition hover:bg-teal-50"
              : "rounded-full bg-teal-700 px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-teal-800"
          }
        >
          Get Started
        </a>
      </>
    );
  }

  const role = session.user.role;
  const displayName =
    session.user.name?.trim() || session.user.email?.split("@")[0] || (role === "CUSTOMER" ? "Member" : "User");
  const initial = displayName.slice(0, 1).toUpperCase() || "?";

  return (
    <>
      {role === "CUSTOMER" ? (
        <CustomerUserMenu isHome={isHome} displayName={displayName} initial={initial} />
      ) : null}
      {role === "ADMIN" || role === "STAFF" ? (
        <AdminStaffUserMenu isHome={isHome} displayName={displayName} initial={initial} staffRole={role} />
      ) : null}
    </>
  );
}
