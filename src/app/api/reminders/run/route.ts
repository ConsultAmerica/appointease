import { addHours } from "date-fns";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const expected = process.env.REMINDER_CRON_SECRET;
  if (expected && authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const windowEnd = addHours(now, 24);

  const appointments = await prisma.appointment.findMany({
    where: {
      status: { in: ["PENDING", "CONFIRMED"] },
      reminderSentAt: null,
      startAt: { gte: now, lte: windowEnd },
    },
    include: {
      service: { include: { business: true } },
    },
    take: 100,
  });

  let sent = 0;
  for (const appointment of appointments) {
    const emailResult = await sendEmail({
      to: appointment.customerEmail,
      subject: `Reminder: ${appointment.service.name} tomorrow`,
      html: `<p>Hi ${appointment.customerName},</p><p>This is your reminder for ${appointment.startAt.toLocaleString()}.</p>`,
    });

    await prisma.notificationLog.create({
      data: {
        businessId: appointment.businessId,
        appointmentId: appointment.id,
        type: "BOOKING_REMINDER",
        targetEmail: appointment.customerEmail,
        success: emailResult.ok,
        providerStatus: emailResult.providerStatus,
      },
    });

    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { reminderSentAt: new Date() },
    });
    sent += 1;
  }

  return NextResponse.json({ processed: appointments.length, sent });
}
