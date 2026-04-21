import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CustomerDashboard } from "./customer-dashboard";

export default async function CustomerPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CUSTOMER") {
    redirect("/auth/login");
  }

  const appointments = await prisma.appointment.findMany({
    where: {
      customerEmail: session.user.email ?? "",
      ...(session.user.businessId ? { businessId: session.user.businessId } : {}),
    },
    include: { service: true, business: true },
    orderBy: { startAt: "asc" },
    take: 100,
  });

  const rows = appointments.map((a) => ({
    id: a.id,
    serviceName: a.service.name,
    businessName: a.business.name,
    startAt: a.startAt.toISOString(),
    endAt: a.endAt.toISOString(),
    status: a.status,
    priceCents: a.service.priceCents,
  }));

  const displayName =
    session.user.name?.trim() ||
    session.user.email?.split("@")[0] ||
    "Member";

  return (
    <CustomerDashboard
      userName={displayName}
      userEmail={session.user.email ?? ""}
      appointments={rows}
    />
  );
}
