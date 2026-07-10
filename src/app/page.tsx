import type { ReactNode, SVGProps } from "react";
import Link from "next/link";

const PRODUCT = "AppointmentAI";

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero — clinic + guest booking focus (not AppointEase marketing clone) */}
      <section className="relative overflow-hidden bg-slate-950 pb-20 pt-6 md:pb-28 md:pt-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_80%_0%,rgba(20,184,166,0.25),transparent)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_10%_100%,rgba(99,102,241,0.15),transparent)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-7">
            <p className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-sm font-medium text-teal-300">
              Multi-clinic platform · Guest booking · Optional AI chat
            </p>
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-white md:text-5xl lg:text-[3.1rem]">
              Let patients book online —{" "}
              <span className="text-teal-400">no account required</span>
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-slate-300">
              {PRODUCT} powers real clinics on one stack: public booking at{" "}
              <code className="rounded bg-white/10 px-1.5 py-0.5 text-sm text-teal-200">/book</code>, admin and staff
              dashboards, live availability from your database, and an optional AI assistant that uses the same booking
              APIs.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/book"
                className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-6 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-teal-500/25 transition hover:bg-teal-400"
              >
                Book as a guest
                <span aria-hidden>→</span>
              </Link>
              <Link
                href="/auth/register"
                className="inline-flex items-center rounded-xl border border-slate-600 px-6 py-3 text-base font-semibold text-white transition hover:border-slate-500 hover:bg-white/5"
              >
                Register your clinic
              </Link>
            </div>
            <p className="text-sm text-slate-500">
              Share your <code className="text-slate-400">/book</code> link on social — visitors only need name, email,
              and phone.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <HeroCard
              title="Guest booking"
              body="No sign-in wall. Pick clinic → service → slot → confirm."
              accent="border-teal-500/40 bg-teal-500/10"
            />
            <HeroCard
              title="Admin & staff"
              body="Separate workspaces for owners, staff, and registered customers."
              accent="border-indigo-500/40 bg-indigo-500/10"
            />
            <HeroCard
              title="Live slots"
              body="Availability comes from Postgres rules — not a static calendar."
              accent="border-slate-600 bg-slate-800/80"
              className="sm:col-span-2"
            />
          </div>
        </div>
      </section>

      {/* What ships today */}
      <section className="border-b border-slate-200 bg-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 md:text-3xl">What this deployment includes</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            A working scheduling product — not a landing-page template. Built with Next.js, Prisma, and PostgreSQL.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Public /book", detail: "Guest-friendly booking flow" },
              { label: "Multi-tenant", detail: "Many clinics in one app" },
              { label: "Role-based auth", detail: "Admin, staff, customer" },
              { label: "AI chat (optional)", detail: "Same APIs as the web UI" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <p className="font-semibold text-teal-800">{item.label}</p>
                <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features — real capabilities */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">Core capabilities</h2>
          <p className="mt-2 max-w-2xl text-slate-600">
            Designed for wellness clinics, spas, and service businesses that need more than a single booking link.
          </p>
          <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              iconWrap="bg-teal-100 text-teal-800"
              icon={<UsersIcon className="h-6 w-6" />}
              title="Multi-clinic tenants"
              description="Each business has its own services, hours, staff, and appointments. Customers choose a clinic at booking time."
            />
            <FeatureCard
              iconWrap="bg-emerald-100 text-emerald-700"
              icon={<CalendarIcon className="h-6 w-6" />}
              title="Real-time availability"
              description="Slots respect staff calendars, buffers, and existing bookings before a guest can confirm."
            />
            <FeatureCard
              iconWrap="bg-indigo-100 text-indigo-700"
              icon={<BoltIcon className="h-6 w-6" />}
              title="Optional AI assistant"
              description="Conversational booking via /chat when OpenAI is configured; demo mode works without an API key."
            />
            <FeatureCard
              iconWrap="bg-amber-100 text-amber-700"
              icon={<MailIcon className="h-6 w-6" />}
              title="Email confirmations"
              description="Booking requests trigger confirmation emails when SMTP is set; otherwise logged in dev."
            />
            <FeatureCard
              iconWrap="bg-violet-100 text-violet-700"
              icon={<ChartIcon className="h-6 w-6" />}
              title="Admin operations"
              description="Today’s schedule, services, staff hours, analytics, and AI conversation logs in /admin."
            />
            <FeatureCard
              iconWrap="bg-red-100 text-red-700"
              icon={<ShieldIcon className="h-6 w-6" />}
              title="Secure by role"
              description="Credentials auth, audit logging, and route protection — guests only see public booking paths."
            />
          </div>
        </div>
      </section>

      {/* Guest flow */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">Guest booking flow</h2>
            <p className="mt-2 text-slate-600">Optimized for links from Facebook, Instagram, or your website</p>
          </div>
          <ol className="mx-auto mt-14 grid max-w-4xl gap-8 md:grid-cols-4">
            {[
              { n: 1, title: "Open /book", desc: "No login prompt — clinics load immediately." },
              { n: 2, title: "Choose service & time", desc: "Live slots from your database." },
              { n: 3, title: "Enter contact details", desc: "Name, email, and phone — that’s it." },
              { n: 4, title: "Pending → confirmed", desc: "Clinic reviews; customer gets email if configured." },
            ].map((step) => (
              <li key={step.n} className="text-center">
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                  {step.n}
                </span>
                <h3 className="mt-4 font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{step.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Who it's for — replaces generic testimonials */}
      <section className="border-t border-slate-100 bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900">Who it’s for</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Clinic owners",
                desc: "Register as admin, configure services and staff, confirm pending bookings from /admin.",
              },
              {
                title: "Front-desk & staff",
                desc: "Staff portal for day-of appointments without full admin access.",
              },
              {
                title: "Patients & clients",
                desc: "Book as a guest or create an account to track visits under My appointments.",
              },
            ].map((card) => (
              <article key={card.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-teal-800">{card.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{card.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-900 py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white">Try {PRODUCT}</h2>
          <p className="mt-3 text-lg text-slate-400">
            Book a demo appointment as a guest, or register a clinic to explore the admin dashboard.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/book"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-8 py-3 font-semibold text-slate-950 hover:bg-teal-400"
            >
              Book as a guest <span aria-hidden>→</span>
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center rounded-xl border border-slate-600 px-8 py-3 font-semibold text-white hover:bg-white/5"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function HeroCard({
  title,
  body,
  accent,
  className = "",
}: {
  title: string;
  body: string;
  accent: string;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border p-5 ${accent} ${className}`}>
      <h2 className="font-semibold text-white">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">{body}</p>
    </div>
  );
}

function FeatureCard({
  icon,
  iconWrap,
  title,
  description,
}: {
  icon: ReactNode;
  iconWrap: string;
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className={`inline-flex rounded-xl p-3 ${iconWrap}`}>{icon}</div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
    </article>
  );
}

function CalendarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function BoltIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
    </svg>
  );
}

function ChartIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M3 3v18h18" />
      <path d="M7 12l4-4 4 4 6-6" />
    </svg>
  );
}

function ShieldIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function UsersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function MailIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <path d="m22 6-10 7L2 6" />
    </svg>
  );
}
