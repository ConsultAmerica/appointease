import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { persistCustomerPortfolioDemoSlot } from "@/lib/demo-booking-flow";
import { checkRateLimit, csrfError, verifyCsrf } from "@/lib/security";

const bodySchema = z.object({
  slotIndex: z.number().int().min(0).max(2),
  serviceName: z.string().max(160).optional(),
});

export async function POST(req: Request) {
  if (!(await verifyCsrf(req))) {
    return csrfError();
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!(await checkRateLimit(`portfolio-book:${ip}`, 30, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Sign in to save a booking to your calendar." }, { status: 401 });
  }
  if (session.user.role !== "CUSTOMER") {
    return NextResponse.json({ error: "Only customer accounts can book through this flow." }, { status: 403 });
  }
  const businessId = session.user.businessId;
  if (!businessId) {
    return NextResponse.json({ error: "Your account is not linked to a clinic." }, { status: 400 });
  }

  if (!(await checkRateLimit(`portfolio-book:${session.user.email}`, 40, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "Too many requests for this account." }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const customerName = session.user.name?.trim() || session.user.email.split("@")[0] || "Customer";
  const result = await persistCustomerPortfolioDemoSlot({
    businessId,
    slotIndex: parsed.data.slotIndex,
    customerName,
    customerEmail: session.user.email,
    serviceName: parsed.data.serviceName,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    appointmentId: result.appointmentId,
    staffName: result.staffName,
    startAt: result.startAt.toISOString(),
    serviceName: result.serviceName,
    emailSent: result.emailSent,
  });
}
