"use client";

import type { Session } from "next-auth";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
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
      className="sticky top-0 z-50 border-b border-[color:var(--border)] bg-background/90 text-slate-900 shadow-sm backdrop-blur-md"
    >
      <nav className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight">
          <LogoMark variant="default" className="h-9 w-9 shrink-0" />
          <span className="text-slate-900">{PRODUCT}</span>
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
  const base = active
    ? "font-semibold text-slate-900"
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

/** Closes when clicking outside the menu or pressing Escape. */
function ProfileDropdown({
  isHome,
  menuId,
  renderTrigger,
  children,
}: {
  isHome: boolean;
  menuId: string;
  renderTrigger: (open: boolean) => ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const el = rootRef.current;
      if (el && !el.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const panel = isHome
    ? "border-slate-200 bg-surface text-slate-900 shadow-xl ring-1 ring-slate-200/80"
    : "border-slate-200 bg-surface text-slate-900 shadow-xl ring-1 ring-slate-200/80";

  return (
    <div className="relative mr-1" ref={rootRef}>
      <button
        type="button"
        id={`${menuId}-trigger`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={`${menuId}-menu`}
        onClick={() => setOpen((v) => !v)}
        className="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--btn-primary)]"
      >
        {renderTrigger(open)}
      </button>
      {open ? (
        <div
          id={`${menuId}-menu`}
          role="menu"
          aria-labelledby={`${menuId}-trigger`}
          className={`absolute right-0 z-50 mt-2 min-w-[220px] overflow-hidden rounded-xl border py-1 ${panel}`}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

function ProfileMenuTrigger({
  isHome,
  open,
  initial,
  displayName,
  subtitle,
  avatarClass,
}: {
  isHome: boolean;
  open: boolean;
  initial: string;
  displayName: string;
  subtitle: string;
  avatarClass: string;
}) {
  return (
    <span
      className={`flex cursor-pointer items-center gap-1 rounded-full border py-1 pl-1 pr-2 transition sm:pr-3 ${
        isHome ? "border-stone-200 bg-surface hover:bg-stone-50" : "border-slate-200 bg-slate-50 hover:bg-slate-100"
      }`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${avatarClass}`}
      >
        {initial}
      </span>
      <span className="hidden min-w-0 text-left leading-tight sm:block">
        <span className={`block max-w-[160px] truncate text-xs font-semibold ${isHome ? "text-stone-900" : "text-slate-900"}`}>
          {displayName}
        </span>
        <span className={`block text-[11px] ${isHome ? "text-stone-500" : "text-slate-500"}`}>{subtitle}</span>
      </span>
      <ChevronDownIcon
        className={`h-4 w-4 shrink-0 opacity-60 transition ${open ? "rotate-180" : ""} ${isHome ? "text-stone-600" : "text-slate-600"}`}
        aria-hidden
      />
    </span>
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
  const item = isHome
    ? "text-slate-700 hover:bg-slate-50"
    : "text-slate-700 hover:bg-slate-50";
  const itemMuted = isHome ? "text-slate-500" : "text-slate-500";
  const roleLabel = staffRole === "ADMIN" ? "Administrator" : "Staff";

  return (
    <ProfileDropdown
      isHome={isHome}
      menuId="admin-staff-menu"
      renderTrigger={(open) => (
        <ProfileMenuTrigger
          isHome={isHome}
          open={open}
          initial={initial}
          displayName={displayName}
          subtitle={roleLabel}
          avatarClass="bg-slate-800"
        />
      )}
    >
      <div className={`border-b px-4 py-3 sm:hidden ${isHome ? "border-slate-100" : "border-slate-100"}`}>
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
    </ProfileDropdown>
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
  const item = isHome
    ? "text-slate-700 hover:bg-slate-50"
    : "text-slate-700 hover:bg-slate-50";
  const itemMuted = isHome ? "text-slate-500" : "text-slate-500";

  return (
    <ProfileDropdown
      isHome={isHome}
      menuId="customer-menu"
      renderTrigger={(open) => (
        <ProfileMenuTrigger
          isHome={isHome}
          open={open}
          initial={initial}
          displayName={displayName}
          subtitle="Member"
          avatarClass="bg-slate-800"
        />
      )}
    >
      <div className={`border-b px-4 py-3 sm:hidden ${isHome ? "border-slate-100" : "border-slate-100"}`}>
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
    </ProfileDropdown>
  );
}

function HeaderAuth({ session, isHome }: { session: Session | null; isHome: boolean }) {
  const linkMuted = "text-slate-600 hover:text-slate-900";

  if (!session?.user) {
    return (
      <>
        <a href="/auth/login" className={`font-medium ${linkMuted}`}>
          Sign In
        </a>
        <a
          href="/auth/register"
          className="pro-btn-primary px-4 py-2 text-sm"
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
