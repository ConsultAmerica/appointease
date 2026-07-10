import type { ReactNode, SVGProps } from "react";
import Link from "next/link";
import { AppointmentImage } from "@/components/appointment-image";
import { SectionBackground } from "@/components/section-background";
import { APPOINTMENT_IMAGES } from "@/lib/appointment-images";

const PRODUCT = "AppointmentAI";

const CAPABILITIES = [
  {
    title: "Multi-clinic tenants",
    description: "Each business runs its own services, staff, hours, and appointment queue.",
    icon: UsersIcon,
    span: "lg:col-span-2 lg:row-span-2",
    iconTint: "bg-slate-100 text-slate-700",
  },
  {
    title: "Live availability",
    description: "Slots respect buffers, staff calendars, and existing bookings.",
    icon: CalendarIcon,
    span: "",
    iconTint: "bg-emerald-50 text-[color:var(--success)]",
  },
  {
    title: "Guest-first /book",
    description: "Name, email, phone — no account wall for social traffic.",
    icon: SparklesIcon,
    span: "",
    iconTint: "bg-sky-50 text-sky-800",
  },
  {
    title: "AI chat (optional)",
    description: "Conversational booking on the same APIs when OpenAI is configured.",
    icon: BoltIcon,
    span: "",
    iconTint: "bg-slate-100 text-slate-700",
  },
  {
    title: "Admin operations",
    description: "Today's schedule, analytics, services, staff, and AI logs.",
    icon: ChartIcon,
    span: "lg:col-span-2",
    iconTint: "bg-slate-100 text-slate-700",
  },
] as const;

const FLOW = [
  { step: "01", title: "Share /book", body: "Post your link on social or embed it on your site." },
  { step: "02", title: "Pick clinic & provider", body: "Visitors browse live catalog and open time slots." },
  { step: "03", title: "Confirm as guest", body: "Contact details only — optional sign-in after success." },
  { step: "04", title: "Clinic confirms", body: "Admin reviews pending visits; email fires when SMTP is set." },
] as const;

const PERSONAS = [
  {
    title: "Clinic owners",
    desc: "Onboard, configure services, manage staff, and confirm bookings from /admin.",
    accent: "border-sky-700",
  },
  {
    title: "Front-desk staff",
    desc: "Day-of schedule in /staff without full admin permissions.",
    accent: "border-slate-600",
  },
  {
    title: "Patients & clients",
    desc: "Book as a guest or register to track visits under My appointments.",
    accent: "border-[color:var(--success)]",
  },
] as const;

export default function Home() {
  return (
    <div className="flex flex-col bg-background">
      {/* Hero */}
      <SectionBackground variant="clinic" className="border-b border-[color:var(--border)]">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:gap-16 lg:py-20">
          <div className="space-y-8">
            <p className="pro-label">Enterprise scheduling</p>
            <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-tight text-slate-900 md:text-5xl">
              Professional appointment management for modern clinics
            </h1>
            <p className="max-w-lg text-lg leading-relaxed text-slate-600">
              {PRODUCT} delivers guest booking, provider scheduling, and clinic operations on one secure platform —
              backed by PostgreSQL and role-based access.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/book" className="pro-btn-primary inline-flex items-center gap-2 px-7 py-3 text-sm">
                Book an appointment
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
              <Link href="/auth/register" className="pro-btn-secondary inline-flex px-7 py-3 text-sm">
                Register your clinic
              </Link>
            </div>
            <dl className="grid max-w-md grid-cols-3 gap-4 border-t border-slate-200 pt-6">
              {[
                { k: "Guest-first", v: "no login wall" },
                { k: "Live slots", v: "from database" },
                { k: "3 roles", v: "admin · staff · patient" },
              ].map((item) => (
                <div key={item.k}>
                  <dt className="text-sm font-semibold text-slate-900">{item.k}</dt>
                  <dd className="text-xs text-slate-500">{item.v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="relative">
            <AppointmentImage
              {...APPOINTMENT_IMAGES.heroScheduling}
              priority
              className="pro-card rounded-2xl shadow-md"
              sizes="(max-width: 1024px) 100vw, 560px"
            />
            <div className="relative z-10 -mt-10 mx-2 sm:mx-4 lg:absolute lg:bottom-6 lg:left-6 lg:mt-0 lg:max-w-[17rem] lg:mx-0">
              <BookingPreview />
            </div>
          </div>
        </div>
      </SectionBackground>

      {/* Capabilities */}
      <SectionBackground variant="scheduling" className="py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <p className="pro-label">Platform</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Built for clinical operations</h2>
          <p className="mt-3 max-w-2xl text-slate-600">
            Structured scheduling tools for wellness clinics, medical practices, and service businesses.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2">
            {CAPABILITIES.map((cap) => (
              <BentoCard key={cap.title} {...cap} />
            ))}
          </div>
        </div>
      </SectionBackground>

      {/* Flow */}
      <SectionBackground variant="calendar" className="border-y border-[color:var(--border)] py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="pro-label">Patient journey</p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-900">From booking link to confirmed visit</h2>
            </div>
            <Link href="/book" className="text-sm font-semibold text-sky-800 hover:text-sky-900">
              Open booking portal →
            </Link>
          </div>
          <div className="mt-10 overflow-hidden rounded-2xl border border-[color:var(--border)] shadow-sm">
            <AppointmentImage
              {...APPOINTMENT_IMAGES.calendarOverview}
              className="aspect-[21/9] max-h-56 w-full bg-surface md:max-h-72"
              imageClassName="h-full w-full object-cover object-center"
              sizes="(max-width: 768px) 100vw, 1152px"
            />
          </div>
          <ol className="mt-12 grid gap-8 md:grid-cols-4">
            {FLOW.map((item) => (
              <li key={item.step} className="pro-card p-5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[color:var(--btn-primary)] text-xs font-bold text-white">
                  {item.step}
                </span>
                <h3 className="mt-4 font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </SectionBackground>

      {/* Personas */}
      <SectionBackground variant="clinic" className="py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center gap-10 lg:flex-row lg:items-start lg:gap-14">
            <AppointmentImage
              {...APPOINTMENT_IMAGES.patientBooking}
              className="pro-card w-full max-w-sm shrink-0 rounded-2xl shadow-md lg:max-w-xs"
              sizes="(max-width: 1024px) 20rem, 18rem"
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-center text-3xl font-semibold text-slate-900 lg:text-left">Role-based workspaces</h2>
              <p className="mx-auto mt-3 max-w-xl text-center text-slate-600 lg:mx-0 lg:text-left">
                Each user sees only what they need — owners, staff, and patients.
              </p>
              <div className="mt-10 grid gap-4 md:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                {PERSONAS.map((p) => (
                  <article key={p.title} className={`pro-card border-l-4 p-6 ${p.accent}`}>
                    <h3 className="text-lg font-semibold text-slate-900">{p.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{p.desc}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </SectionBackground>

      {/* CTA */}
      <SectionBackground variant="calendar" className="px-6 pb-16 md:pb-20">
        <div className="pro-card mx-auto max-w-6xl bg-[color:var(--btn-primary)] px-8 py-12 text-center md:px-16">
          <h2 className="text-3xl font-semibold text-white">Experience {PRODUCT}</h2>
          <p className="mx-auto mt-4 max-w-lg text-slate-300">
            Book a demo appointment as a guest, or sign in to explore the admin dashboard.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/book" className="inline-flex items-center gap-2 rounded-lg bg-surface px-8 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100">
              Book as a guest
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link href="/auth/login" className="pro-btn-secondary inline-flex px-8 py-3 text-sm">
              Sign in
            </Link>
          </div>
        </div>
      </SectionBackground>
    </div>
  );
}

function BookingPreview() {
  return (
    <div className="pro-card overflow-hidden shadow-lg ring-1 ring-slate-900/5">
      <div className="flex items-center justify-between border-b border-[color:var(--border)] bg-background-subtle px-4 py-2.5">
        <span className="text-xs font-medium text-slate-500">Booking portal</span>
        <span className="rounded bg-slate-200 px-2 py-0.5 font-mono text-[10px] text-slate-600">/book</span>
      </div>
      <div className="space-y-4 p-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Clinic</p>
          <div className="mt-2 flex gap-2">
            <span className="rounded-md bg-[color:var(--btn-primary)] px-2.5 py-1 text-xs font-medium text-white">Demo Wellness</span>
            <span className="rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-600">Harmony Spa</span>
          </div>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Provider</p>
          <p className="mt-1 text-sm font-medium text-slate-900">Dr. Carter · Follow-up Visit</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Available slots</p>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {["9:00", "10:30", "2:00"].map((t, i) => (
              <span
                key={t}
                className={`rounded-md px-2 py-1.5 text-center text-xs font-medium ${
                  i === 1
                    ? "bg-[color:var(--success)] text-white"
                    : i === 2
                      ? "border border-[color:var(--warning)] bg-amber-50 text-amber-900"
                      : "border border-slate-200 text-slate-600"
                }`}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BentoCard({
  title,
  description,
  icon: Icon,
  span,
  iconTint,
}: {
  title: string;
  description: string;
  icon: (props: SVGProps<SVGSVGElement>) => ReactNode;
  span: string;
  iconTint: string;
}) {
  return (
    <article className={`pro-card p-5 transition hover:border-slate-300 ${span}`}>
      <div className={`inline-flex rounded-md p-2 ${iconTint}`}>
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-3 font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
    </article>
  );
}

function ArrowRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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

function UsersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function SparklesIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z" />
    </svg>
  );
}
