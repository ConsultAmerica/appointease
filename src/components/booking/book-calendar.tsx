"use client";

import { useMemo, useState } from "react";
import { localISODate } from "@/components/booking/types";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function BookCalendar({
  value,
  onChange,
}: {
  value: string;
  onChange: (iso: string) => void;
}) {
  const [viewMonth, setViewMonth] = useState(() => {
    const [y, m] = value.split("-").map(Number);
    return new Date(y, m - 1, 1);
  });

  const todayIso = useMemo(() => localISODate(new Date()), []);
  const year = viewMonth.getFullYear();
  const monthIndex = viewMonth.getMonth();
  const monthLabel = viewMonth.toLocaleString(undefined, { month: "long", year: "numeric" });
  const firstDow = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const cells: { day: number; inMonth: boolean }[] = [];
  for (let i = 0; i < firstDow; i++) cells.push({ day: 0, inMonth: false });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, inMonth: true });
  while (cells.length % 7 !== 0) cells.push({ day: 0, inMonth: false });

  return (
    <div className="rounded-lg border border-slate-200 bg-surface p-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setViewMonth(new Date(year, monthIndex - 1, 1))}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
          aria-label="Previous month"
        >
          ‹
        </button>
        <h3 className="text-sm font-semibold text-slate-900">{monthLabel}</h3>
        <button
          type="button"
          onClick={() => setViewMonth(new Date(year, monthIndex + 1, 1))}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
          aria-label="Next month"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="pb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {w}
          </div>
        ))}
        {cells.map((cell, idx) => {
          if (!cell.inMonth || cell.day === 0) {
            return <div key={`e-${idx}`} className="aspect-square min-h-9" />;
          }
          const iso = localISODate(new Date(year, monthIndex, cell.day));
          const isSelected = value === iso;
          const isPast = iso < todayIso;
          return (
            <button
              key={iso}
              type="button"
              disabled={isPast}
              onClick={() => onChange(iso)}
              className={`aspect-square min-h-9 rounded-md text-sm font-medium transition ${
                isPast
                  ? "cursor-not-allowed text-slate-300"
                  : isSelected
                    ? "bg-[color:var(--btn-primary)] font-semibold text-white"
                    : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
