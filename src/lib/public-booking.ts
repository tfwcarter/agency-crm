// Shared logic for the public booking widget (marketing-site "Book a Call" →
// this CRM's calendar). No auth — anyone with the link can view open slots
// and book one, so every check here is re-run server-side on submit; nothing
// from the client is trusted.
import { db } from "@/lib/db";

// Single-tenant in practice: one signup = one agency = one Organization row.
// Set PRIMARY_ORG_ID to pin it explicitly (recommended once you know it —
// check /dashboard/settings or query the Organization table for the id).
// Without it, this falls back to the most recently created org, which in
// practice is the real agency's org: any demo/seed data was inserted first,
// and the real owner's signup happens after.
export async function getPrimaryOrganization() {
  const pinnedId = process.env.PRIMARY_ORG_ID;
  if (pinnedId) {
    const pinned = await db.organization.findUnique({ where: { id: pinnedId } });
    if (pinned) return pinned;
  }
  return db.organization.findFirst({ orderBy: { createdAt: "desc" } });
}

export const BUSINESS_TIMEZONE = "America/Chicago";
export const BUSINESS_HOURS = { startHour: 9, endHour: 17 }; // 9am–5pm, last slot starts 4:30pm
export const SLOT_MINUTES = 30;
export const BOOKING_LEAD_HOURS = 2; // no same-slot booking within 2 hours of now
export const BOOKING_WINDOW_DAYS = 14;

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(date).reduce<Record<string, string>>((acc, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {});
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return asUtc - date.getTime();
}

// Converts a wall-clock time in `timeZone` to the actual UTC instant.
function zonedTimeToUtc(y: number, m: number, d: number, hh: number, mm: number, timeZone: string) {
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm, 0));
  const offset = getTimeZoneOffsetMs(guess, timeZone);
  return new Date(guess.getTime() - offset);
}

function localDateParts(date: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
  const parts = dtf.formatToParts(date).reduce<Record<string, string>>((acc, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {});
  return { y: Number(parts.year), m: Number(parts.month), d: Number(parts.day), weekday: parts.weekday };
}

export type DaySlots = { date: string; label: string; times: { iso: string; label: string }[] };

// Every open slot for the next BOOKING_WINDOW_DAYS, minus ones that collide
// with a non-cancelled appointment already on the org's calendar.
export async function getAvailability(organizationId: string): Promise<DaySlots[]> {
  const now = new Date();
  const earliestBookable = new Date(now.getTime() + BOOKING_LEAD_HOURS * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + BOOKING_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const existing = await db.appointment.findMany({
    where: {
      organizationId,
      status: { not: "cancelled" },
      startAt: { gte: now, lte: windowEnd },
    },
    select: { startAt: true, endAt: true },
  });

  const days: DaySlots[] = [];
  for (let i = 0; i < BOOKING_WINDOW_DAYS; i++) {
    const cursor = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    const { y, m, d, weekday } = localDateParts(cursor, BUSINESS_TIMEZONE);
    if (weekday === "Sat" || weekday === "Sun") continue;

    const times: { iso: string; label: string }[] = [];
    for (let hour = BUSINESS_HOURS.startHour; hour < BUSINESS_HOURS.endHour; hour++) {
      for (let min = 0; min < 60; min += SLOT_MINUTES) {
        const slotStart = zonedTimeToUtc(y, m, d, hour, min, BUSINESS_TIMEZONE);
        const slotEnd = new Date(slotStart.getTime() + SLOT_MINUTES * 60 * 1000);
        if (slotStart < earliestBookable) continue;
        const collides = existing.some((a) => a.startAt < slotEnd && a.endAt > slotStart);
        if (collides) continue;
        times.push({
          iso: slotStart.toISOString(),
          label: new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: BUSINESS_TIMEZONE }).format(slotStart),
        });
      }
    }
    if (times.length === 0) continue;

    const label = new Intl.DateTimeFormat("en-US", {
      timeZone: BUSINESS_TIMEZONE,
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(cursor);
    const dateKey = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({ date: dateKey, label, times });
  }
  return days;
}

// Re-check (never trust the client) that `startAt` is still a real, open,
// business-hours slot before writing the appointment.
export async function isSlotBookable(organizationId: string, startAt: Date) {
  const now = new Date();
  const earliestBookable = new Date(now.getTime() + BOOKING_LEAD_HOURS * 60 * 60 * 1000);
  if (startAt < earliestBookable) return false;

  const { weekday } = localDateParts(startAt, BUSINESS_TIMEZONE);
  if (weekday === "Sat" || weekday === "Sun") return false;

  const localHour = Number(
    new Intl.DateTimeFormat("en-US", { hour: "2-digit", hourCycle: "h23", timeZone: BUSINESS_TIMEZONE }).format(startAt)
  );
  const localMinute = Number(
    new Intl.DateTimeFormat("en-US", { minute: "2-digit", timeZone: BUSINESS_TIMEZONE }).format(startAt)
  );
  if (localHour < BUSINESS_HOURS.startHour || localHour >= BUSINESS_HOURS.endHour) return false;
  if (localMinute % SLOT_MINUTES !== 0) return false;

  const slotEnd = new Date(startAt.getTime() + SLOT_MINUTES * 60 * 1000);
  const collision = await db.appointment.findFirst({
    where: {
      organizationId,
      status: { not: "cancelled" },
      startAt: { lt: slotEnd },
      endAt: { gt: startAt },
    },
  });
  return !collision;
}
