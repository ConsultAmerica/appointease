type MinimalSession = {
  id: string;
  role: "ADMIN" | "STAFF" | "CUSTOMER";
};

type AppointmentRow = {
  assignedStaffUserId: string | null;
};

export function canStaffActOnAppointment(session: MinimalSession, appt: AppointmentRow): boolean {
  if (session.role === "ADMIN") return true;
  if (session.role !== "STAFF") return false;
  return appt.assignedStaffUserId === null || appt.assignedStaffUserId === session.id;
}
