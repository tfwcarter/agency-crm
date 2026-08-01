import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { runAutomations } from "@/lib/automations";
import { getPrimaryOrganization, isSlotBookable, SLOT_MINUTES } from "@/lib/public-booking";

// Public — the marketing site's "Book a Call" form posts here. Unauthenticated
// by design, so nothing from the request body is trusted until it's re-checked
// against the real calendar (isSlotBookable re-derives business hours +
// conflicts server-side rather than trusting the slot the client claims is open).
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const bookSchema = z.object({
  name: z.string().trim().min(1).max(120),
  businessName: z.string().trim().max(160).optional(),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional(),
  website: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(2000).optional(),
  startAt: z.string().datetime(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400, headers: CORS_HEADERS });
  }

  const parsed = bookSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400, headers: CORS_HEADERS }
    );
  }
  const data = parsed.data;
  const startAt = new Date(data.startAt);

  const org = await getPrimaryOrganization();
  if (!org) {
    return NextResponse.json({ ok: false, error: "Booking is not available right now" }, { status: 503, headers: CORS_HEADERS });
  }

  const bookable = await isSlotBookable(org.id, startAt);
  if (!bookable) {
    return NextResponse.json(
      { ok: false, error: "That time just filled up — please pick another slot." },
      { status: 409, headers: CORS_HEADERS }
    );
  }

  const normalizedEmail = data.email.toLowerCase();
  let lead = await db.lead.findFirst({
    where: { organizationId: org.id, email: { equals: normalizedEmail } },
  });

  if (!lead) {
    lead = await db.lead.create({
      data: {
        organizationId: org.id,
        businessName: data.businessName || data.name,
        ownerName: data.name,
        email: normalizedEmail,
        phone: data.phone || null,
        website: data.website || null,
        source: "website",
        status: "contacted",
      },
    });
  }

  const endAt = new Date(startAt.getTime() + SLOT_MINUTES * 60 * 1000);
  const title = `Discovery call — ${data.businessName || data.name}`;

  const appt = await db.appointment.create({
    data: {
      organizationId: org.id,
      leadId: lead.id,
      title,
      type: "discovery_call",
      startAt,
      endAt,
      location: "Video call — link sent via email",
      status: "scheduled",
    },
  });

  if (data.notes) {
    await db.note.create({
      data: { organizationId: org.id, leadId: lead.id, body: data.notes },
    });
  }

  await db.activity.create({
    data: {
      organizationId: org.id,
      type: "appointment_booked",
      description: `${title} booked from the website`,
      leadId: lead.id,
    },
  });

  await runAutomations(org.id, "appointment_booked", { leadId: lead.id, entityName: title });

  return NextResponse.json(
    { ok: true, id: appt.id, startAt: appt.startAt, endAt: appt.endAt },
    { headers: CORS_HEADERS }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
