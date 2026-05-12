import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, addMinutes, setHours, setMinutes } from "date-fns";
import {
  CANONICAL_DEFAULT_AVAILABILITY,
  CANONICAL_DEMO_SERVICES,
  CANONICAL_DEMO_STAFF,
} from "../src/lib/canonical-demo-catalog";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Admin12345", 12);
  const staffPasswordHash = await bcrypt.hash("Staff12345", 12);

  await prisma.notificationLog.deleteMany();
  await prisma.agentConversationLog.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.staffService.deleteMany();
  await prisma.staffAvailabilityRule.deleteMany();
  await prisma.timeBlock.deleteMany();
  await prisma.availabilityRule.deleteMany();
  await prisma.service.deleteMany();
  await prisma.user.deleteMany();
  await prisma.business.deleteMany();

  const business = await prisma.business.create({
    data: {
      name: "Demo Wellness Clinic",
      timezone: "UTC",
      users: {
        create: [
          {
            fullName: "Clinic Admin",
            email: "admin@demo-clinic.com",
            passwordHash,
            emailVerifiedAt: new Date(),
            role: "ADMIN",
          },
          ...CANONICAL_DEMO_STAFF.map((s) => ({
            fullName: s.fullName,
            email: s.email,
            passwordHash: staffPasswordHash,
            emailVerifiedAt: new Date(),
            role: "STAFF" as const,
          })),
        ],
      },
      services: {
        create: [...CANONICAL_DEMO_SERVICES],
      },
      availability: {
        create: [...CANONICAL_DEFAULT_AVAILABILITY],
      },
    },
    include: { services: true, users: true },
  });

  const servicesByName = new Map(business.services.map((s) => [s.name, s]));

  for (const staffRow of CANONICAL_DEMO_STAFF) {
    const user = business.users.find((u) => u.email === staffRow.email);
    if (!user) continue;
    await prisma.staffService.createMany({
      data: staffRow.serviceNames
        .map((name) => {
          const svc = servicesByName.get(name);
          return svc ? { staffUserId: user.id, serviceId: svc.id } : null;
        })
        .filter((x): x is { staffUserId: string; serviceId: string } => x !== null),
    });
    await prisma.staffAvailabilityRule.createMany({
      data: [0, 1, 2, 3, 4, 5, 6].map((d) => ({
        businessId: business.id,
        staffUserId: user.id,
        dayOfWeek: d,
        startMinute: 9 * 60,
        endMinute: 17 * 60,
      })),
    });
  }

  await prisma.business.create({
    data: {
      name: "Harmony Day Spa",
      timezone: "America/New_York",
      users: {
        create: {
          fullName: "Spa Admin",
          email: "admin@harmony-demo-spa.com",
          passwordHash,
          emailVerifiedAt: new Date(),
          role: "ADMIN",
        },
      },
      services: {
        create: [
          { name: "Swedish Massage (60)", durationMinutes: 60, priceCents: 12000, bufferMinutesAfter: 15 },
          { name: "Acupuncture Session", durationMinutes: 45, priceCents: 9500, bufferMinutesAfter: 10 },
          { name: "Nutrition Consultation", durationMinutes: 30, priceCents: 6000, bufferMinutesAfter: 0 },
        ],
      },
      availability: {
        create: [0, 1, 2, 3, 4, 5, 6].map((d) => ({
          dayOfWeek: d,
          startMinute: 10 * 60,
          endMinute: 18 * 60,
        })),
      },
    },
  });

  const wellness = servicesByName.get("Wellness Consultation") ?? business.services[0];
  const tomorrow = addDays(new Date(), 1);
  const startAt = setMinutes(setHours(tomorrow, 10), 0);
  const endAt = addMinutes(startAt, wellness.durationMinutes);

  await prisma.appointment.create({
    data: {
      businessId: business.id,
      serviceId: wellness.id,
      customerName: "Sarah M.",
      customerEmail: "sarah@example.com",
      startAt,
      endAt,
      status: "CONFIRMED",
      createdViaAiChat: false,
    },
  });

  console.log(`Seeded businessId: ${business.id}`);
  console.log("Businesses: Demo Wellness Clinic, Harmony Day Spa (customer signup can choose either).");
  console.log("Staff logins (Demo Wellness):");
  for (const s of CANONICAL_DEMO_STAFF) {
    console.log(`  ${s.email} / Staff12345`);
  }
  console.log("Spa admin: admin@harmony-demo-spa.com / Admin12345");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
