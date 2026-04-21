import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, setHours, setMinutes } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Admin12345", 12);

  await prisma.notificationLog.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.availabilityRule.deleteMany();
  await prisma.service.deleteMany();
  await prisma.user.deleteMany();
  await prisma.business.deleteMany();

  const business = await prisma.business.create({
    data: {
      name: "Demo Wellness Clinic",
      timezone: "UTC",
      users: {
        create: {
          fullName: "Clinic Admin",
          email: "admin@demo-clinic.com",
          passwordHash,
          emailVerifiedAt: new Date(),
          role: "ADMIN",
        },
      },
      services: {
        create: [
          { name: "Consultation", durationMinutes: 30, priceCents: 5000 },
          { name: "Follow-up", durationMinutes: 45, priceCents: 7000 },
          { name: "Routine Check-up", durationMinutes: 20, priceCents: 4000 },
          { name: "Extended Consultation", durationMinutes: 60, priceCents: 9500 },
          { name: "Urgent Visit", durationMinutes: 25, priceCents: 8000 },
          { name: "Treatment Session", durationMinutes: 40, priceCents: 7800 },
        ],
      },
      availability: {
        create: [
          { dayOfWeek: 0, startMinute: 9 * 60, endMinute: 17 * 60 },
          { dayOfWeek: 1, startMinute: 9 * 60, endMinute: 17 * 60 },
          { dayOfWeek: 2, startMinute: 9 * 60, endMinute: 17 * 60 },
          { dayOfWeek: 3, startMinute: 9 * 60, endMinute: 17 * 60 },
          { dayOfWeek: 4, startMinute: 9 * 60, endMinute: 17 * 60 },
          { dayOfWeek: 5, startMinute: 9 * 60, endMinute: 17 * 60 },
          { dayOfWeek: 6, startMinute: 9 * 60, endMinute: 17 * 60 },
        ],
      },
    },
    include: { services: true },
  });

  const consultation = business.services[0];
  const tomorrow = addDays(new Date(), 1);
  const startAt = setMinutes(setHours(tomorrow, 10), 0);
  const endAt = setMinutes(setHours(tomorrow, 10), 30);

  await prisma.appointment.create({
    data: {
      businessId: business.id,
      serviceId: consultation.id,
      customerName: "Sarah M.",
      customerEmail: "sarah@example.com",
      startAt,
      endAt,
      status: "CONFIRMED",
    },
  });

  console.log(`Seeded businessId: ${business.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
