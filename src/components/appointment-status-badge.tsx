const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  RESCHEDULED: "Rescheduled",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
};

const STATUS_RING: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-950 ring-amber-200/80",
  CONFIRMED: "bg-emerald-100 text-emerald-950 ring-emerald-200/80",
  RESCHEDULED: "bg-violet-100 text-violet-950 ring-violet-200/80",
  CANCELLED: "bg-rose-100 text-rose-950 ring-rose-200/80",
  COMPLETED: "bg-slate-200 text-slate-900 ring-slate-300/80",
};

const STATUS_DOT: Record<string, string | undefined> = {
  PENDING: "bg-amber-600",
  CONFIRMED: "bg-emerald-600",
  RESCHEDULED: "bg-violet-600",
};

export function AppointmentStatusBadge({
  status,
  createdViaAiChat,
}: {
  status: string;
  createdViaAiChat?: boolean;
}) {
  const ring = STATUS_RING[status] ?? "bg-slate-100 text-slate-800 ring-slate-200/80";
  const dot = STATUS_DOT[status];
  const label = STATUS_LABEL[status] ?? status;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${ring}`}
      >
        {dot ? <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} aria-hidden /> : null}
        {label}
      </span>
      {createdViaAiChat ? (
        <span className="inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-900 ring-1 ring-sky-200/80">
          AI-created
        </span>
      ) : null}
    </span>
  );
}
