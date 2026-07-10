import type { Session } from "next-auth";
import Link from "next/link";
import { LogoMark } from "@/components/logo-mark";

const PRODUCT = "AppointmentAI";

export function SiteFooter({ session }: { session: Session | null }) {
  const role = session?.user?.role;
  const dashboardHref = role === "CUSTOMER" ? "/customer" : "/admin";
  const showDashboard = !!session?.user;

  return (
    <footer className="mt-auto border-t border-[color:var(--border)] bg-[color:var(--btn-secondary)] py-8 text-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 md:flex-row">
        <div className="flex items-center gap-2 font-bold text-white">
          <LogoMark className="h-8 w-8" />
          {PRODUCT}
        </div>
        <p className="text-center text-sm text-gray-400">
          © {new Date().getFullYear()} {PRODUCT}. All rights reserved.
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-6 text-sm">
          <Link href="/book" className="text-white/90 transition hover:text-white">
            Book Now
          </Link>
          {showDashboard ? (
            <Link href={dashboardHref} className="text-white/90 transition hover:text-white">
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/auth/login" className="text-white/90 transition hover:text-white">
                Sign In
              </Link>
              <Link href="/auth/register" className="text-white/90 transition hover:text-white">
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </footer>
  );
}
