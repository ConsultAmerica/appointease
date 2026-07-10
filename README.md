# AppointmentAI

Multi-clinic appointment scheduling built with Next.js, Prisma, and PostgreSQL.

This project started from a UI reference ([AppointEase demo](https://appointmentv1.vercel.app/)) but **AppointmentAI is a separate product**: guest `/book`, multi-tenant clinics, role-based admin/staff, and optional AI chat on the same booking APIs.

## Included in this starter

- Public landing page (`/`)
- Business onboarding (`/onboarding`)
- Customer booking flow with real-time slot checks (`/book`)
- Admin dashboard for today + analytics (`/admin`)
- Booking confirmation emails
- Reminder endpoint for T-24h cron jobs (`POST /api/reminders/run`)
- Credential auth (admin/customer), session roles, and route protection
- Email verification + password reset flows (HTML email templates, HMAC-signed links)
- CSRF headers on custom auth endpoints; **Redis-backed rate limits** (Upstash) with in-memory fallback
- **Auth audit log** (`AuthAuditLog`) for registration, login success/failure, logout, verification, password reset
- Prisma + PostgreSQL schema and seed data

## Admin dashboard

Admins can review and operate the workspace from **`/admin`** (overview) and **`/admin/settings`**:

- **Today’s appointments** — same-day schedule from live data
- **Upcoming appointments** — future PENDING / CONFIRMED visits
- **Canceled appointments** — recent cancelled rows for context
- **Staff schedule** — staff users and per-staff weekly hours (settings)
- **Services** — duration, price, buffer; activate/deactivate (settings)
- **Customer list** — customers derived from appointment activity (overview)
- **AI conversation logs** — `/admin/ai-logs` for chat audit trail

Booking flows send **email** today via Nodemailer (SMTP or console fallback); see `src/lib/email.ts` and booking routes.

## Roadmap: SaaS-grade integrations

These are planned **advanced** layers after the text-based booking path is solid. They keep the product feeling like a real SaaS for clinics.

### 1. Email / SMS confirmation

After a successful book or business confirmation, customers should see concise copy such as:

> *Your appointment is confirmed for Friday at 3:15 PM.*

**Email:** keep a single abstraction in `sendEmail` and add providers behind env flags — e.g. [Resend](https://resend.com/) HTTP API, [SendGrid](https://sendgrid.com/) mail send, or [Gmail API](https://developers.google.com/gmail/api) for small workspaces.

**SMS:** [Twilio](https://www.twilio.com/) (or similar) for transactional SMS; store opt-in where required, template messages, and delivery status next to `NotificationLog`.

### 2. Google Calendar sync

On **PENDING** or **CONFIRMED** appointment create/update/cancel, mirror the event to **Google Calendar** (per business or per staff OAuth). Use the [Calendar API](https://developers.google.com/calendar) with stored refresh tokens; store `googleEventId` on `Appointment` for idempotent updates.

### 3. Voice agent (OpenAI Realtime)

Let customers **speak** instead of typing (e.g. *“Do you have any openings tomorrow?”*). Orchestrate with **OpenAI Agents SDK** + [Realtime / voice](https://platform.openai.com/docs/guides/realtime) as a **later phase** after text chat + tools are stable: server-side session, tool bridging to the same `check_availability` / `book_appointment` paths, and push-to-talk or WebRTC in the browser.

## Tech stack

- Next.js (App Router) + TypeScript + Tailwind
- Prisma ORM + PostgreSQL
- Auth.js (NextAuth v5) + bcrypt
- Nodemailer for email delivery (console fallback)
- [@upstash/ratelimit](https://github.com/upstash/ratelimit) + [@upstash/redis](https://github.com/upstash/redis) when configured

## Quick start

Run all commands from the `appointease` app directory (inside your repo).

1) Copy env values:

```bash
cp .env.example .env
```

2) Configure `DATABASE_URL` in `.env`.
   Also set:
   - `AUTH_SECRET` (long random string; also used to sign email links unless `LINK_SIGNING_SECRET` is set)
   - `NEXT_PUBLIC_APP_URL` (for verification/reset links)

3) **Production / multi-instance:** set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` from the [Upstash console](https://console.upstash.com/) so rate limits are shared across instances. Omit for local single-process dev (in-memory fallback).

4) Apply migrations and seed:

```bash
npm run db:migrate
npm run db:seed
```

5) Start app:

```bash
npm run dev
```

Visit `http://localhost:3000`.

### Auth flow

- Register page: `/auth/register`
  - `ADMIN`: creates new business + admin account
  - `CUSTOMER`: creates customer account under an existing business
- Login page: `/auth/login`
- Verify email: `/auth/verify-email?token=...&sig=...` (sig present when `AUTH_SECRET` or `LINK_SIGNING_SECRET` is set)
- Resend verification: `/auth/resend-verification` or `POST /api/auth/resend-verification`
- Forgot password: `/auth/forgot-password`
- Reset password: `/auth/reset-password?token=...&sig=...`
- Protected route middleware:
  - Admin/staff only: `/admin`
  - Customer only: `/customer`

Optional: `REQUIRE_SIGNED_EMAIL_LINKS=true` forces verification and reset endpoints to require a valid `sig` query/body parameter when a signing secret is configured.

## API overview

- `POST /api/onboarding` - create business + owner + services + hours
- `GET /api/businesses` - list businesses and active services
- `GET /api/businesses/:businessId/availability?date=YYYY-MM-DD&serviceId=...` - live slots
- `POST /api/bookings` - create booking and send confirmation
- `GET /api/admin/today` - today schedule (tenant from session)
- `GET /api/admin/analytics` - bookings/day + no-show proxy rate (tenant from session)
- `POST /api/reminders/run` - send reminders for appointments within next 24h
- `POST /api/auth/register` - credential-based registration
- `GET /api/app/csrf` - CSRF token for custom auth API requests (register, password reset, etc.). Do not use `/api/auth/csrf`; that URL is reserved for Auth.js.
- `POST /api/auth/verify-email` - verify account email by token (+ optional signature)
- `POST /api/auth/resend-verification` - send a new verification email
- `POST /api/auth/forgot-password` - send reset link
- `POST /api/auth/reset-password` - update password by reset token (+ optional signature)
- `GET|POST /api/auth/*` - Auth.js session/login endpoints

## Notes

- If SMTP env vars are missing, email sends are logged to the server console for local development.
- Query `AuthAuditLog` in Prisma Studio (`npm run db:studio`) or add an internal admin report as a follow-up.
