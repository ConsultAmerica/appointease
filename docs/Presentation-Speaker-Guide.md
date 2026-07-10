# AppointmentAI — Speaker guide

Use this with `docs/AppointmentAI-Team-Presentation.pptx`. Aim for **10–12 minutes** plus Q&A. Open the live app in a browser tab before you start.

---

## Opening (30 seconds)

> “Today I’m walking through **AppointmentAI** — a multi-clinic appointment scheduling platform we’ve built and deployed. It’s a real web app: customers book online, clinic staff and admins run day-to-day operations, and we have an optional AI assistant that uses the same booking data as the rest of the product. I’ll show screenshots from the app, then leave time for questions and a quick live demo if you want.”

**Do:** State your name and role if the audience doesn’t know you. Paste or click the **live URL** from slide 1.

---

## Slide 1 — Title

**On screen:** AppointmentAI, subtitle, live URL.

**Say:**

> “The product name is AppointmentAI. It’s built for clinics and service businesses — wellness centers, spas, small practices — that need one place for bookings, not phone tag and spreadsheets.”

**Don’t:** Read the URL letter by letter; say “link is on the slide” and open it once.

---

## Slide 2 — Overview

**On screen:** Three bullets — customers book online, admins manage operations, optional AI chat.

**Say (≈1 minute):**

> “Three things to remember.”
>
> “**First**, customers pick a clinic, a service, and a time slot. Availability is calculated live from the database — staff hours, buffers, and existing appointments — not a static calendar.”
>
> “**Second**, each clinic has an **admin dashboard**: today’s schedule, upcoming visits, services, staff, and settings. Staff have their own view for assigned appointments.”
>
> “**Third**, **AI chat is optional**. The booking wizard works without OpenAI. When we enable the agent, it calls the same APIs as the website — so we’re not maintaining two different booking systems.”

**Bridge:** “Let me show what that looks like.”

---

## Slide 3 — Public site (screenshot)

**On screen:** Landing page — teal hero, “Book an Appointment”, “Get Started Free”.

**Say (≈45 seconds):**

> “This is the public entry point. The hero explains the value: self-service booking and confirmations.”
>
> “**Book an Appointment** goes straight to the booking flow — no account required for a first booking in many cases.”
>
> “**Get Started Free** is for businesses registering as a new clinic, or customers creating an account under an existing clinic.”

**If live demo:** Click through home → `/book` instead of only narrating the screenshot.

---

## Slide 4 — Booking (screenshot)

**On screen:** `/book` — clinic list, services, date/time.

**Say (≈1 minute):**

> “The booking flow is step-by-step: choose **which clinic**, then **which service** — duration and price come from admin configuration — then **pick a date and time**.”
>
> “Slots you see here are **real-time**. The server checks availability rules, staff calendars, and appointments already in the system. If a slot isn’t listed, it’s not bookable.”
>
> “After submit, the appointment is stored with a status — typically **pending** until the clinic confirms — and we can send confirmation email when SMTP is configured.”

**Technical one-liner (if engineers are in the room):**  
> “Availability is exposed as an API: `GET /api/businesses/:id/availability` with date and service.”

---

## Slide 5 — Admin dashboard (screenshot)

**On screen:** Admin home — welcome, today’s metrics, appointment lists.

**Say (≈1 minute):**

> “This is what a **clinic admin** sees after sign-in.”
>
> “At a glance: how many bookings today, what’s upcoming, what’s been cancelled. They can open **settings** to manage services — length, price, buffer between appointments — staff schedules, and time blocks.”
>
> “Staff log in separately and see **their** day, not the full business configuration.”
>
> “Admins can also review **AI conversation logs** when chat is enabled — useful for support and auditing what the assistant promised.”

**Demo login (seed data):**  
`admin@demo-clinic.com` / `Admin12345` — Demo Wellness Clinic.

---

## Slide 6 — Users (three roles)

**On screen:** Customer · Staff · Admin cards.

**Say (≈45 seconds):**

> “We enforce **three roles** in software, not just in the UI.”
>
> “**Customers** — `/customer` — book, see upcoming visits, cancel where allowed.”
>
> “**Staff** — `/staff` — operational view for people delivering the service.”
>
> “**Admins** — `/admin` — own the clinic: catalog, people, schedule, analytics.”
>
> “Middleware on the server rejects the wrong role visiting the wrong area. A customer can’t open the admin dashboard by guessing the URL.”

---

## Slide 7 — Technical foundation

**On screen:** Application, Data, Auth, Hosting rows.

**Say (≈1 minute for technical audience; 20 seconds for business):**

**Short version:**

> “It’s a modern web stack: **Next.js** on the front and back, **PostgreSQL** on **Neon**, deployed on **Vercel**. Sign-in uses **Auth.js** with role-based sessions.”

**Longer version (if asked):**

| Layer | What to say |
|--------|-------------|
| **Application** | Next.js 16 App Router, React, TypeScript, Tailwind — one codebase for pages and APIs. |
| **Data** | Prisma ORM; each **Business** is a tenant with its own users, services, and appointments. |
| **Auth** | Email/password, verification and password reset, auth audit log; optional Redis rate limits via Upstash. |
| **Hosting** | Serverless on Vercel; database migrations run against Neon (`prisma migrate deploy`). |

**Optional credibility line:**

> “We split auth config so middleware stays small on Vercel’s edge — important for production bundle limits.”

---

## Slide 8 — Questions?

**On screen:** Live URL, demo hint.

**Say:**

> “That’s the tour. Happy to take questions — or I can log in live and book a slot / walk the admin view.”

**Offer:**

- Live: home → book → (optional) admin login  
- Repo walkthrough for developers  
- Roadmap: SMS/email providers, Google Calendar, voice agent (if audience cares about “what’s next”)

---

## Suggested timing

| Slide | Minutes |
|-------|---------|
| Title + intro | 0:30 |
| Overview | 1:00 |
| Public site | 0:45 |
| Booking | 1:00 |
| Admin | 1:00 |
| Users | 0:45 |
| Tech stack | 0:30–1:00 |
| Q&A | 5+ |

---

## Live demo checklist

1. Confirm URL opens (your Vercel **deployment** URL for this repo — not an old alias pointing at a different site).  
2. **Customer path:** `/book` → Demo Wellness Clinic → service → slot → submit.  
3. **Admin path:** `/auth/login` → `admin@demo-clinic.com` / `Admin12345` → `/admin`.  
4. **Optional:** `/chat` — mention demo mode works without an API key.  
5. Have Neon/Vercel status in mind if something fails (“DB env” / “migrations”).

---

## Anticipated questions & short answers

**How is this different from Calendly?**  
> “Calendly is often one host per link. We’re **multi-tenant**: many clinics in one deployment, each with staff, services, and role-based admin.”

**Is the AI required?**  
> “No. Booking and admin are fully functional without OpenAI. AI is an add-on channel using the same booking logic.”

**How do you prevent double booking?**  
> “Slots are computed server-side from rules + existing appointments before confirm; booking is a transactional write in Postgres.”

**Is it production-ready?**  
> “Core flows are deployed with auth, migrations, and seed data. Integrations like production SMS and calendar sync are on the roadmap.”

**What about security?**  
> “Passwords hashed with bcrypt, signed email links, CSRF on custom auth APIs, role middleware, optional rate limiting and auth audit logs.”

**Multi-clinic signup?**  
> “Register as **admin** to create a business, or **customer** and pick an existing clinic from the list.”

---

## Phrases to avoid (sound less “AI generated”)

- Avoid: “Leverage cutting-edge solutions”, “seamless end-to-end journey”, “robust paradigm”.  
- Prefer: “Customers book online”, “admins confirm in the dashboard”, “same database for chat and forms”.

---

## Deeper reading (optional prep)

| Topic | Where |
|--------|--------|
| Features & API list | `README.md` in the repo |
| Auth flows | README → “Auth flow” |
| Admin capabilities | README → “Admin dashboard” |
| Roadmap | README → “Roadmap: SaaS-grade integrations” |
| Prisma schema | `prisma/schema.prisma` |

---

## One-page cheat sheet (print or second monitor)

```
WHAT: Multi-clinic scheduling + optional AI booking
WHO:  Customer | Staff | Admin
HOW:  Next.js + Prisma + Postgres (Neon) + Vercel
DEMO: admin@demo-clinic.com / Admin12345
PATH: /book (customer) · /admin (ops) · /chat (AI)
HOOK: Live slots from DB; AI uses same APIs as UI
```

---

*Regenerate slides: `python scripts/capture-presentation-screenshots.py` then `python scripts/generate-team-presentation.py` (with `npm run dev` for fresh screenshots).*
