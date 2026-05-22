import { addMinutes } from "date-fns";
import { NextResponse } from "next/server";
import { z } from "zod";
import { bookingRequestReceivedHtml } from "@/lib/email-templates";
import { sendEmail } from "@/lib/email";
import { hasBookableIntervalConflict } from "@/lib/appointment-conflicts";
import { prisma } from "@/lib/prisma";
import { staffCanPerformService } from "@/lib/staff-for-service";
import { checkRateLimit } from "@/lib/security";

const bookingSchema = z.object({
  businessId: z.string().min(1),
  serviceId: z.string().min(1),
  customerName: z.string().min(2),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(7).max(32),
  /** ISO string from slot picker (z.iso.datetime is strict; keep booking resilient). */
  startAt: z.string().min(1),
  specialRequestNote: z.string().max(2000).optional(),
  assignedStaffUserId: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    if (!(await checkRateLimit(`booking:${ip}`, 30, 60 * 60 * 1000))) {
      return NextResponse.json({ error: "Too many booking attempts. Try again later." }, { status: 429 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsedIn = bookingSchema.safeParse(body);
    if (!parsedIn.success) {
      const issues = parsedIn.error.issues;
      const phoneMissing = issues.some((i) => i.path.join(".") === "customerPhone");
      const details = issues.map((i) => i.message).join(" ");
      return NextResponse.json(
        {
          error: phoneMissing ? "Phone number is required." : "Invalid booking data",
          details,
        },
        { status: 400 },
      );
    }
    const parsed = parsedIn.data;

    const startProbe = new Date(parsed.startAt);
    if (Number.isNaN(startProbe.getTime())) {
      return NextResponse.json({ error: "Invalid start time" }, { status: 400 });
    }
    if (!(await checkRateLimit(`booking-email:${parsed.customerEmail}`, 10, 60 * 60 * 1000))) {
      return NextResponse.json({ error: "Too many booking attempts for this email." }, { status: 429 });
    }

    const startAt = startProbe;

    const service = await prisma.service.findFirst({
      where: {
        id: parsed.serviceId,
        businessId: parsed.businessId,
        isActive: true,
      },
      include: { business: true },
    });

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const endAt = addMinutes(startAt, service.durationMinutes);

    let staffId: string | undefined;
    if (parsed.assignedStaffUserId?.trim()) {
      const ok = await staffCanPerformService(parsed.assignedStaffUserId.trim(), parsed.serviceId, parsed.businessId);
      if (!ok) {
        return NextResponse.json({ error: "Selected staff cannot perform this service" }, { status: 400 });
      }
      staffId = parsed.assignedStaffUserId.trim();
    }

    if (
      await hasBookableIntervalConflict(parsed.businessId, startAt, endAt, {
        staffUserId: staffId,
      })
    ) {
      return NextResponse.json({ error: "Slot no longer available" }, { status: 409 });
    }

    const note = parsed.specialRequestNote?.trim();
    const phone = parsed.customerPhone.trim();
    const appointment = await prisma.appointment.create({
      data: {
        businessId: parsed.businessId,
        serviceId: parsed.serviceId,
        customerName: parsed.customerName.trim(),
        customerEmail: parsed.customerEmail.trim().toLowerCase(),
        customerPhone: phone,
        startAt,
        endAt,
        status: "PENDING",
        ...(staffId ? { assignedStaffUserId: staffId } : {}),
        ...(note ? { specialRequestNote: note, specialRequestStatus: "PENDING" as const } : {}),
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const emailResult = await sendEmail({
      to: parsed.customerEmail,
      subject: `Booking request — ${service.business.name}`,
      html: bookingRequestReceivedHtml({
        businessName: service.business.name,
        serviceName: service.name,
        customerName: parsed.customerName,
        startAtLabel: startAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }),
        appUrl,
      }),
    });

    await prisma.notificationLog.create({
      data: {
        businessId: parsed.businessId,
        appointmentId: appointment.id,
        type: "BOOKING_CONFIRMATION",
        targetEmail: parsed.customerEmail,
        success: emailResult.ok,
        providerStatus: emailResult.providerStatus,
      },
    });

    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { confirmationSentAt: new Date() },
    });

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Booking failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}
