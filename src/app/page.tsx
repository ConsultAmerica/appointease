import type { ReactNode, SVGProps } from "react";
import Link from "next/link";

const PRODUCT = "AppointmentAI";

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-700 to-emerald-800 pb-16 pt-4 md:pb-24 md:pt-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(255,255,255,0.15),transparent)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 md:grid-cols-2 md:gap-16 lg:py-8">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm text-white backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Now with AI-powered scheduling
            </div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-white md:text-5xl lg:text-[3.25rem]">
              Appointment Scheduling,{" "}
              <span className="text-yellow-300">Completely Automated</span>
            </h1>
            <p className="max-w-xl text-lg text-teal-100">
              Skip the phone calls. Let customers book online, receive instant confirmations, and get automated reminders
              — all on autopilot.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/book"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-base font-semibold text-teal-700 shadow-lg transition hover:bg-teal-50"
              >
                Book an Appointment
                <span aria-hidden>→</span>
              </Link>
              <Link
                href="/auth/register"
                className="inline-flex items-center rounded-xl border-2 border-white/80 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10"
              >
                Get Started Free
              </Link>
            </div>
            <p className="text-sm text-teal-200/90">No credit card required · Setup in minutes</p>
          </div>

          <div className="relative mx-auto w-full max-w-md md:max-w-none">
            <div className="rounded-2xl border border-white/20 bg-white/10 p-5 shadow-2xl backdrop-blur-md md:p-6">
              <div className="mb-4 flex items-center justify-between text-sm text-white">
                <span className="font-semibold">Today&apos;s Schedule</span>
                <span className="text-teal-100">April 10, 2026</span>
              </div>
              <ul className="space-y-3">
                {[
                  { initial: "S", name: "Sarah M.", detail: "Consultation", time: "9:00 AM", status: "Confirmed" as const },
                  { initial: "J", name: "James K.", detail: "Follow-up", time: "10:30 AM", status: "Confirmed" as const },
                  { initial: "A", name: "Alice W.", detail: "General Checkup", time: "11:00 AM", status: "Pending" as const },
                  { initial: "R", name: "Robert J.", detail: "Consultation", time: "2:00 PM", status: "Confirmed" as const },
                ].map((row) => (
                  <li
                    key={row.name}
                    className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5 text-sm text-white ring-1 ring-white/10"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
                      {row.initial}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {row.name} <span className="text-teal-100">— {row.detail}</span>
                      </p>
                      <p className="text-xs text-teal-200">{row.time}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        row.status === "Confirmed"
                          ? "bg-emerald-500/30 text-emerald-100"
                          : "bg-amber-400/30 text-amber-100"
                      }`}
                    >
                      {row.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="absolute -bottom-2 right-0 z-10 max-w-[240px] rounded-xl border border-slate-200/80 bg-white p-3 shadow-xl md:-right-4 md:bottom-4">
              <div className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
                  <BellIcon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-slate-900">Reminder Sent!</p>
                  <p className="text-xs text-slate-600">Sarah M. — Tomorrow 9:00 AM</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="bg-slate-950 py-14 text-center">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 md:grid-cols-4 md:gap-4">
          {[
            { stat: "97%", label: "Reduced Wait Times" },
            { stat: "75%", label: "Fewer No-Shows" },
            { stat: "3x", label: "More Bookings" },
            { stat: "24/7", label: "Online Booking" },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-3xl font-bold text-teal-500 md:text-4xl">{item.stat}</p>
              <p className="mt-1 text-sm text-slate-400">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Built for modern businesses — row 1 */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <span className="inline-block rounded-full bg-teal-50 px-3 py-1 text-sm font-medium text-teal-700">
              Everything You Need
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Built for Modern Businesses</h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-600">
              From solo practitioners to enterprise teams — {PRODUCT} handles all the scheduling complexity so you can focus
              on what matters.
            </p>
          </div>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            <FeatureCard
              iconWrap="bg-teal-100 text-teal-700"
              icon={<CalendarIcon className="h-6 w-6" />}
              title="Smart Scheduling"
              description="AI-powered slot management that fills idle time and eliminates scheduling conflicts automatically."
            />
            <FeatureCard
              iconWrap="bg-emerald-100 text-emerald-600"
              icon={<BellIcon className="h-6 w-6" />}
              title="Automated Reminders"
              description="Automatic email notifications 24 hours before appointments reduce no-shows by up to 75%."
            />
            <FeatureCard
              iconWrap="bg-amber-100 text-amber-600"
              icon={<BoltIcon className="h-6 w-6" />}
              title="Instant Confirmation"
              description="Customers receive beautiful confirmation emails the moment they book their appointment."
            />
          </div>
        </div>
      </section>

      {/* Feature row 2 */}
      <section className="border-t border-slate-100 bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-8 md:grid-cols-3">
            <FeatureCard
              iconWrap="bg-violet-100 text-violet-600"
              icon={<ChartIcon className="h-6 w-6" />}
              title="Real-time Analytics"
              description="Live dashboard with appointment trends, customer insights, and performance metrics."
            />
            <FeatureCard
              iconWrap="bg-red-100 text-red-600"
              icon={<ShieldIcon className="h-6 w-6" />}
              title="Secure & Reliable"
              description="Enterprise-grade security with encrypted data storage and 99.9% uptime guarantee."
            />
            <FeatureCard
              iconWrap="bg-teal-100 text-teal-600"
              icon={<UsersIcon className="h-6 w-6" />}
              title="Multi-user Access"
              description="Role-based access control for admins and customers with personalized dashboards."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">How It Works</h2>
            <p className="mt-2 text-slate-600">Book an appointment in under 2 minutes</p>
          </div>
          <div className="relative mt-16">
            <div className="absolute left-0 right-0 top-8 hidden h-0.5 bg-teal-100 md:block" style={{ marginLeft: "10%", marginRight: "10%" }} />
            <div className="grid gap-10 md:grid-cols-4 md:gap-4">
              {[
                { n: 1, title: "Choose a Service", desc: "Browse our service catalog and pick what you need.", icon: <SearchIcon className="h-6 w-6" /> },
                { n: 2, title: "Pick Date & Time", desc: "Select from available slots on the calendar.", icon: <CalendarIcon className="h-6 w-6" /> },
                { n: 3, title: "Confirm Booking", desc: "Provide your details and confirm the appointment.", icon: <CheckIcon className="h-6 w-6" /> },
                { n: 4, title: "Get Notified", desc: "Receive instant confirmation + automated reminder.", icon: <MailIcon className="h-6 w-6" /> },
              ].map((step) => (
                <div key={step.n} className="relative flex flex-col items-center text-center">
                  <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-xl bg-teal-700 text-white shadow-lg shadow-teal-700/30">
                    {step.icon}
                  </div>
                  <div className="mt-3 flex h-7 w-7 items-center justify-center rounded-full border-2 border-teal-700 bg-white text-xs font-bold text-teal-700">
                    {step.n}
                  </div>
                  <h3 className="mt-3 font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-t border-slate-100 bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-slate-900">Loved by Businesses</h2>
            <p className="mt-2 text-slate-600">Join thousands of businesses that trust {PRODUCT}</p>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              {
                quote: `${PRODUCT} transformed our clinic workflow. No more phone tag — patients book online and get automatic reminders. Our no-show rate dropped from 30% to just 5%.`,
                name: "Sarah Johnson",
                role: "Medical Clinic Owner",
                initial: "S",
              },
              {
                quote: `The admin dashboard is incredible. I can see all appointments at a glance, manage staff schedules, and the automated emails keep clients informed. Best investment we've made.`,
                name: "Michael Chen",
                role: "Hair Salon Manager",
                initial: "M",
              },
              {
                quote: `Setup took less than 20 minutes. Within a week we were handling 3x more bookings with zero extra effort. The automated system works like magic.`,
                name: "Emily Rodriguez",
                role: "Fitness Studio Owner",
                initial: "E",
              },
            ].map((t) => (
              <blockquote
                key={t.name}
                className="flex flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 text-amber-400" aria-hidden>
                  ★★★★★
                </div>
                <p className="flex-1 text-sm leading-relaxed text-slate-700">&ldquo;{t.quote}&rdquo;</p>
                <footer className="mt-6 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-700 text-sm font-bold text-white">
                    {t.initial}
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.role}</p>
                  </div>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-teal-700 py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white md:text-4xl">Ready to Automate Your Bookings?</h2>
          <p className="mt-3 text-lg text-teal-100">Start for free. No credit card required. Set up in minutes.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/book"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3 text-base font-semibold text-teal-700 shadow-lg hover:bg-teal-50"
            >
              Book an Appointment <span aria-hidden>→</span>
            </Link>
            <Link
              href="/auth/register"
              className="inline-flex items-center rounded-xl border-2 border-white px-8 py-3 text-base font-semibold text-white hover:bg-white/10"
            >
              Create Free Account
            </Link>
          </div>
        </div>
      </section>
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
    <article className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
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

function BellIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
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

function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M20 6L9 17l-5-5" />
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
