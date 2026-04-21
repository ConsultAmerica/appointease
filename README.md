# AppointmentAI

Starter codebase for an appointment-scheduling app inspired by:
- [AppointEase – Smart Appointment Scheduling](https://appointmentv1.vercel.app/) (reference UI)

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
