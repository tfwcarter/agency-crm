"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { runAutomations } from "@/lib/automations";

const apptSchema = z.object({
  title: z.string().min(1),
  type: z.string().min(1),
  startAt: z.string().min(1),
  endAt: z.string().min(1),
  location: z.string().optional(),
  clientId: z.string().optional(),
  leadId: z.string().optional(),
  assignedToId: z.string().optional(),
});

export async function createAppointmentAction(formData: FormData) {
  const session = await requireSession();
  const data = apptSchema.parse({
    title: formData.get("title"),
    type: formData.get("type"),
    startAt: formData.get("startAt"),
    endAt: formData.get("endAt"),
    location: formData.get("location") || undefined,
    clientId: formData.get("clientId") || undefined,
    leadId: formData.get("leadId") || undefined,
    assignedToId: formData.get("assignedToId") || undefined,
  });

  const appt = await db.appointment.create({
    data: {
      organizationId: session.user.organizationId,
      title: data.title,
      type: data.type,
      startAt: new Date(data.startAt),
      endAt: new Date(data.endAt),
      location: data.location,
      clientId: data.clientId || null,
      leadId: data.leadId || null,
      assignedToId: data.assignedToId || session.user.id,
    },
  });

  await db.activity.create({
    data: {
      organizationId: session.user.organizationId,
      type: "appointment_booked",
      description: `Appointment "${appt.title}" booked`,
      clientId: data.clientId || null,
      leadId: data.leadId || null,
      userId: session.user.id,
    },
  });

  await runAutomations(session.user.organizationId, "appointment_booked", {
    clientId: data.clientId || null,
    leadId: data.leadId || null,
    entityName: appt.title,
  });

  revalidatePath("/dashboard/appointments");
  redirect("/dashboard/appointments");
}

export async function updateAppointmentStatusAction(id: string, status: string) {
  const session = await requireSession();
  await db.appointment.update({
    where: { id, organizationId: session.user.organizationId },
    data: { status },
  });
  revalidatePath("/dashboard/appointments");
}
