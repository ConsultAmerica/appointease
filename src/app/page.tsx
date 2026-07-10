import type { ReactNode, SVGProps } from "react";
import Link from "next/link";

const PRODUCT = "AppointmentAI";

const CAPABILITIES = [
  {
    title: "Multi-clinic tenants",
    description: "Each business runs its own services, staff, hours, and appointment queue.",
    icon: UsersIcon,
    span: "lg:col-span-2 lg:row-span-2",
    tint: "from-violet-500/10 to-violet-600/5 border-violet-200/80",
    iconTint: "bg-violet-100 text-violet-700",
  },
  {
    title: "Live availability",
    description: "Slots respect buffers, staff calendars, and existing bookings.",
    icon: CalendarIcon,
    span: "",
    tint: "from-emerald-500/10 to-emerald-600/5 border-emerald-200/80",
    iconTint: "bg-emerald-100 text-emerald-700",
  },
  {
    title: "Guest-first /book",
    description: "Name, email, phone — no account wall for social traffic.",
    icon: SparklesIcon,
    span: "",
    tint: "from-amber-500/10 to-amber-600/5 border-amber-200/80",
    iconTint: "bg-amber-100 text-amber-700",
  },
  {
    title: "AI chat (optional)",
    description: "Conversational booking on the same APIs when OpenAI is configured.",
    icon: BoltIcon,
    span: "",
    tint: "from-indigo-500/10 to-indigo-600/5 border-indigo-200/80",
    iconTint: "bg-indigo-100 text-indigo-700",
  },
  {
    title: "Admin operations",
    description: "Today’s schedule, analytics, services, staff, and AI logs.",
    icon: ChartIcon,
    span: "lg:col-span-2",
    tint: "from-rose-500/10 to-rose-600/5 border-rose-200/80",
    iconTint: "bg-rose-100 text-rose-700",
  },
] as const;

const FLOW = [
  { step: "01", title: "Share /book", body: "Post your link on social or embed it on your site." },
  { step: "02", title: "Pick clinic & service", body: "Visitors browse live catalog and open time slots." },
  { step: "03", title: "Confirm as guest", body: "Contact details only — optional sign-in after success." },
  { step: "04", title: "Clinic confirms", body: "Admin reviews pending visits; email fires when SMTP is set." },
] as const;

const PERSONAS = [
  {
    title: "Clinic owners",
    desc: "Onboard, configure services, manage staff, and confirm bookings from /admin.",
    color: "border-l-violet-500",
    dot: "bg-violet-500",
  },
  {
    title: "Front-desk staff",
    desc: "Day-of schedule in /staff without full admin permissions.",
    color: "border-l-emerald-500",
    dot: "bg-emerald-500",
  },
  {
    title: "Patients & clients",
    desc: "Book as a guest or register to track visits under My appointments.",
    color: "border-l-amber-500",
    dot: "bg-amber-500",
  },
] as const;

export default function Home() {
  return (
    <div className="flex flex-col bg-stone-50">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-stone-200/80">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.45]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgb(168 162 158 / 0.35) 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="pointer-events-none absolute -right-24 top-0 h-96 w-96 rounded-full bg-violet-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-72 w-72 rounded-full bg-amber-100/60 blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 md:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-24">
          <div className="space-y-8">
            <div className="inline-flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-violet-600 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
                Scheduling platform
              </span>
              <span className="rounded-full border border-stone-300 bg-white/80 px-3 py-1 text-xs font-medium text-stone-600">
                Guest booking · Multi-clinic · AI-ready
              </span>
            </div>

            <h1 className="max-w-xl text-4xl font-bold leading-[1.08] tracking-tight text-stone-900 md:text-5xl lg:text-[3.35rem]">
              Online booking that feels{" "}
              <span className="bg-gradient-to-r from-violet-700 via-violet-600 to-indigo-600 bg-clip-text text-transparent">
                effortless
              </span>{" "}
              for your clients
            </h1>

            <p className="max-w-lg text-lg leading-relaxed text-stone-600">
              {PRODUCT} connects public <code className="rounded-md bg-stone-200/70 px-1.5 py-0.5 text-sm font-medium text-stone-800">/book</code>{" "}
              flows, staff dashboards, and optional AI chat — all backed by one PostgreSQL database.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/book"
                className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-violet-600/25 transition hover:bg-violet-700"
              >
                Try guest booking
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
              <Link
                href="/auth/register"
                className="inline-flex items-center rounded-2xl border border-stone-300 bg-white px-7 py-3.5 text-base font-semibold text-stone-800 shadow-sm transition hover:border-stone-400 hover:bg-stone-50"
              >
                Register a clinic
              </Link>
            </div>

            <dl className="grid max-w-md grid-cols-3 gap-4 border-t border-stone-200 pt-6">
              {[
                { k: "No login", v: "for guests" },
                { k: "Real slots", v: "from DB" },
                { k: "3 roles", v: "admin · staff · customer" },
              ].map((item) => (
                <div key={item.k}>
                  <dt className="text-sm font-semibold text-stone-900">{item.k}</dt>
                  <dd className="text-xs text-stone-500">{item.v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <BookingPreview />
        </div>
      </section>

      {/* Bento capabilities */}
      <section className="py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-violet-600">Platform</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-stone-900 md:text-4xl">
              Everything in one scheduling stack
            </h2>
            <p className="mt-3 text-lg text-stone-600">
              Built for wellness clinics, spas, and service businesses — not a static landing template.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2">
            {CAPABILITIES.map((cap) => (
              <BentoCard key={cap.title} {...cap} />
            ))}
          </div>
        </div>
      </section>

      {/* Guest flow */}
      <section className="border-y border-stone-200 bg-white py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-emerald-600">How it works</p>
              <h2 className="mt-2 text-3xl font-bold text-stone-900 md:text-4xl">From link click to confirmed visit</h2>
            </div>
            <Link
              href="/book"
              className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-violet-700 hover:text-violet-800"
            >
              Open live booking flow
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>

          <ol className="relative mt-14 grid gap-8 md:grid-cols-4 md:gap-6">
            <div
              className="pointer-events-none absolute left-0 right-0 top-5 hidden h-0.5 bg-gradient-to-r from-violet-200 via-emerald-200 to-amber-200 md:block"
              aria-hidden
            />
            {FLOW.map((item) => (
              <li key={item.step} className="relative">
                <span className="relative z-10 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-stone-900 text-xs font-bold text-white shadow-md">
                  {item.step}
                </span>
                <h3 className="mt-5 text-lg font-semibold text-stone-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{item.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Personas */}
      <section className="py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-stone-900">Built for every role in the clinic</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-stone-600">
            Separate workspaces keep owners, staff, and customers in the right view.
          </p>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {PERSONAS.map((p) => (
              <article
                key={p.title}
                className={`rounded-2xl border border-stone-200 border-l-4 bg-white p-6 shadow-sm ${p.color}`}
              >
                <span className={`inline-block h-2 w-2 rounded-full ${p.dot}`} aria-hidden />
                <h3 className="mt-3 text-lg font-semibold text-stone-900">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{p.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-20 md:pb-28">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-700 px-8 py-14 text-center shadow-2xl shadow-violet-900/20 md:px-16 md:py-16">
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
            aria-hidden
          />
          <div className="relative">
            <h2 className="text-3xl font-bold text-white md:text-4xl">See {PRODUCT} in action</h2>
            <p className="mx-auto mt-4 max-w-lg text-lg text-violet-100">
              Book a demo appointment as a guest, or sign in to explore the admin dashboard with seeded data.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/book"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-3.5 font-semibold text-violet-700 transition hover:bg-violet-50"
              >
                Book as a guest
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
              <Link
                href="/chat"
                className="inline-flex items-center rounded-2xl border border-white/30 px-8 py-3.5 font-semibold text-white transition hover:bg-white/10"
              >
                Try AI chat
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function BookingPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none">
      <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-violet-400/20 via-transparent to-amber-300/20 blur-2xl" aria-hidden />
      <div className="relative overflow-hidden rounded-3xl border border-stone-200/90 bg-white shadow-2xl shadow-stone-900/10 ring-1 ring-stone-900/5">
        <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50/80 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </div>
          <span className="text-xs font-medium text-stone-500">/book</span>
        </div>

        <div className="space-y-5 p-5 md:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Clinic</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-xl bg-violet-600 px-3 py-1.5 text-sm font-medium text-white">Demo Wellness</span>
              <span className="rounded-xl border border-stone-200 px-3 py-1.5 text-sm text-stone-500">Harmony Spa</span>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Service</p>
            <p className="mt-2 text-sm font-semibold text-stone-900">60-min Consultation · $85</p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Available today</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {["9:00", "10:30", "2:00", "3:30", "4:15"].map((t, i) => (
                <span
                  key={t}
                  className={`rounded-lg px-2 py-2 text-center text-xs font-medium ${
                    i === 1
                      ? "bg-violet-600 text-white shadow-sm"
                      : "border border-stone-200 text-stone-600"
                  }`}
                >
                  {t}
                </span>
              ))}
              <span className="rounded-lg border border-dashed border-stone-200 px-2 py-2 text-center text-xs text-stone-400">
                +more
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/50 p-4">
            <p className="text-xs font-semibold text-violet-800">Guest checkout</p>
            <div className="mt-3 space-y-2">
              <div className="h-8 rounded-lg bg-white ring-1 ring-stone-200" />
              <div className="h-8 rounded-lg bg-white ring-1 ring-stone-200" />
              <div className="flex h-9 items-center justify-center rounded-xl bg-violet-600 text-xs font-semibold text-white">
                Confirm — no account needed
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-4 -left-2 hidden rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-lg md:block">
        <p className="text-xs font-medium text-stone-500">Pending → confirmed</p>
        <p className="mt-0.5 text-sm font-semibold text-emerald-600">Admin reviews in /admin</p>
      </div>
    </div>
  );
}

function BentoCard({
  title,
  description,
  icon: Icon,
  span,
  tint,
  iconTint,
}: {
  title: string;
  description: string;
  icon: (props: SVGProps<SVGSVGElement>) => ReactNode;
  span: string;
  tint: string;
  iconTint: string;
}) {
  return (
    <article
      className={`group rounded-2xl border bg-gradient-to-br p-6 transition hover:-translate-y-0.5 hover:shadow-md ${tint} ${span}`}
    >
      <div className={`inline-flex rounded-xl p-2.5 ${iconTint}`}>
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-stone-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">{description}</p>
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
      <path d="M19 15l.75 2.25L22 18l-2.25.75L19 21l-.75-2.25L16 18l2.25-.75L19 15z" />
    </svg>
  );
}
