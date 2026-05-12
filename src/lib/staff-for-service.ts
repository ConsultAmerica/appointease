import { prisma } from "@/lib/prisma";

export type StaffOption = { id: string; fullName: string; email: string };

/** Staff linked via StaffService, or all business staff when no mappings exist for this service. */
export async function getEligibleStaffForService(businessId: string, serviceId: string): Promise<StaffOption[]> {
  const service = await prisma.service.findFirst({
    where: { id: serviceId, businessId, isActive: true },
    select: { id: true },
  });
  if (!service) return [];

  const links = await prisma.staffService.findMany({
    where: { serviceId },
    select: { staffUserId: true },
  });

  if (links.length === 0) {
    return prisma.user.findMany({
      where: { businessId, role: "STAFF" },
      select: { id: true, fullName: true, email: true },
      orderBy: { fullName: "asc" },
    });
  }

  const ids = [...new Set(links.map((l) => l.staffUserId))];
  return prisma.user.findMany({
    where: { id: { in: ids }, businessId, role: "STAFF" },
    select: { id: true, fullName: true, email: true },
    orderBy: { fullName: "asc" },
  });
}

export async function staffCanPerformService(staffUserId: string, serviceId: string, businessId: string) {
  const staff = await prisma.user.findFirst({
    where: { id: staffUserId, businessId, role: "STAFF" },
  });
  if (!staff) return false;

  const count = await prisma.staffService.count({ where: { serviceId, staffUserId } });
  if (count > 0) return true;

  const any = await prisma.staffService.count({ where: { serviceId } });
  return any === 0;
}
