"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

type Appt = { id: string; title: string; startAt: Date; type: string };

const TYPE_COLOR: Record<string, string> = {
  discovery_call: "#2f6feb",
  strategy_session: "#10b981",
  sales_call: "#f59e0b",
  onboarding: "#38bdf8",
  client_review: "#ef4444",
};

export function MiniCalendar({ appointments }: { appointments: Appt[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.map((day) => {
        const isToday = day.getTime() === today.getTime();
        const dayAppts = appointments.filter((a) => {
          const s = new Date(a.startAt);
          return s.getFullYear() === day.getFullYear() && s.getMonth() === day.getMonth() && s.getDate() === day.getDate();
        });

        return (
          <div
            key={day.toISOString()}
            className={cn(
              "flex min-h-[76px] flex-col items-center gap-1 rounded-lg border p-1.5 text-center",
              isToday ? "border-brand/40 bg-brand/10" : "border-border bg-bg"
            )}
          >
            <span className="text-[9px] uppercase tracking-wide text-fg-subtle">
              {day.toLocaleDateString("en-US", { weekday: "short" })}
            </span>
            <span className={cn("text-sm font-semibold", isToday ? "text-brand" : "text-fg")}>{day.getDate()}</span>
            <div className="flex flex-1 flex-col items-center justify-center gap-0.5">
              {dayAppts.slice(0, 3).map((a) => (
                <Link
                  key={a.id}
                  href="/dashboard/appointments"
                  title={a.title}
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: TYPE_COLOR[a.type] ?? "#6b6b76" }}
                />
              ))}
              {dayAppts.length > 3 && <span className="text-[8px] text-fg-subtle">+{dayAppts.length - 3}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
