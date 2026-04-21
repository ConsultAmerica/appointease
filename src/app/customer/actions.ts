"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function cancelCustomerAppointment(formData: FormData): Promise<void> {
  const id = formData.get("appointmentId");
  if (typeof id !== "string" || !id) {
    return;
  }

  const session = await auth();
  if (!session?.user?.email || session.user.role !== "CUSTOMER") {
    return;
  }

  const where = {
    id,
    customerEmail: session.user.email,
    ...(session.user.businessId ? { businessId: session.user.businessId } : {}),
  };

  const appt = await prisma.appointment.findFirst({ where });
  if (!appt || appt.status === "CANCELLED") {
    revalidatePath("/customer");
    return;
  }

  await prisma.appointment.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
  revalidatePath("/customer");
}
