"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { runAutomations } from "@/lib/automations";

const clientSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  contactName: z.string().optional(),
  email: z.union([z.literal(""), z.string().email()]).optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  googleBusinessProfile: z.string().optional(),
  facebookUrl: z.string().optional(),
  instagramUrl: z.string().optional(),
  linkedinUrl: z.string().optional(),
  industry: z.string().optional(),
  monthlyPackage: z.string().optional(),
  monthlySpend: z.coerce.number().min(0).default(0),
  contractStart: z.string().optional(),
  contractEnd: z.string().optional(),
  status: z.enum(["active", "paused", "churned"]).default("active"),
  accountManagerId: z.string().optional(),
});

function formToClientData(formData: FormData) {
  return clientSchema.parse({
    businessName: formData.get("businessName"),
    contactName: formData.get("contactName") || undefined,
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    website: formData.get("website") || undefined,
    address: formData.get("address") || undefined,
    googleBusinessProfile: formData.get("googleBusinessProfile") || undefined,
    facebookUrl: formData.get("facebookUrl") || undefined,
    instagramUrl: formData.get("instagramUrl") || undefined,
    linkedinUrl: formData.get("linkedinUrl") || undefined,
    industry: formData.get("industry") || undefined,
    monthlyPackage: formData.get("monthlyPackage") || undefined,
    monthlySpend: formData.get("monthlySpend") || 0,
    contractStart: formData.get("contractStart") || undefined,
    contractEnd: formData.get("contractEnd") || undefined,
    status: formData.get("status") || "active",
    accountManagerId: formData.get("accountManagerId") || undefined,
  });
}

export async function createClientAction(formData: FormData) {
  const session = await requireSession();
  const data = formToClientData(formData);

  const client = await db.client.create({
    data: {
      organizationId: session.user.organizationId,
      businessName: data.businessName,
      contactName: data.contactName,
      email: data.email || null,
      phone: data.phone,
      website: data.website,
      address: data.address,
      googleBusinessProfile: data.googleBusinessProfile,
      facebookUrl: data.facebookUrl,
      instagramUrl: data.instagramUrl,
      linkedinUrl: data.linkedinUrl,
      industry: data.industry,
      monthlyPackage: data.monthlyPackage,
      monthlySpend: data.monthlySpend,
      contractStart: data.contractStart ? new Date(data.contractStart) : null,
      contractEnd: data.contractEnd ? new Date(data.contractEnd) : null,
      status: data.status,
      accountManagerId: data.accountManagerId || null,
    },
  });

  await db.activity.create({
    data: {
      organizationId: session.user.organizationId,
      type: "client_created",
      description: `${client.businessName} was added as a client`,
      clientId: client.id,
      userId: session.user.id,
    },
  });

  await runAutomations(session.user.organizationId, "client_created", {
    clientId: client.id,
    entityName: client.businessName,
  });

  revalidatePath("/dashboard/clients");
  redirect(`/dashboard/clients/${client.id}`);
}

export async function updateClientAction(clientId: string, formData: FormData) {
  const session = await requireSession();
  const data = formToClientData(formData);

  const existing = await db.client.findFirst({ where: { id: clientId, organizationId: session.user.organizationId } });
  const addressChanged = existing && existing.address !== (data.address ?? null);

  await db.client.update({
    where: { id: clientId, organizationId: session.user.organizationId },
    data: {
      businessName: data.businessName,
      contactName: data.contactName,
      email: data.email || null,
      phone: data.phone,
      website: data.website,
      address: data.address,
      ...(addressChanged ? { latitude: null, longitude: null } : {}),
      googleBusinessProfile: data.googleBusinessProfile,
      facebookUrl: data.facebookUrl,
      instagramUrl: data.instagramUrl,
      linkedinUrl: data.linkedinUrl,
      industry: data.industry,
      monthlyPackage: data.monthlyPackage,
      monthlySpend: data.monthlySpend,
      contractStart: data.contractStart ? new Date(data.contractStart) : null,
      contractEnd: data.contractEnd ? new Date(data.contractEnd) : null,
      status: data.status,
      accountManagerId: data.accountManagerId || null,
    },
  });

  revalidatePath(`/dashboard/clients/${clientId}`);
  revalidatePath("/dashboard/clients");
}

export async function addContactAction(clientId: string, formData: FormData) {
  const session = await requireSession();
  const name = formData.get("name");
  if (typeof name !== "string" || !name.trim()) return;

  await db.contact.create({
    data: {
      clientId,
      name,
      email: (formData.get("email") as string) || null,
      phone: (formData.get("phone") as string) || null,
      title: (formData.get("title") as string) || null,
    },
  });

  await db.activity.create({
    data: {
      organizationId: session.user.organizationId,
      type: "contact_added",
      description: `Added contact ${name}`,
      clientId,
      userId: session.user.id,
    },
  });

  revalidatePath(`/dashboard/clients/${clientId}`);
}

export async function addServiceAction(clientId: string, formData: FormData) {
  await requireSession();
  const name = formData.get("name");
  if (typeof name !== "string" || !name.trim()) return;

  await db.clientService.create({
    data: {
      clientId,
      name,
      price: Number(formData.get("price")) || 0,
    },
  });

  revalidatePath(`/dashboard/clients/${clientId}`);
}

export async function addClientNoteAction(clientId: string, formData: FormData) {
  const session = await requireSession();
  const body = formData.get("body");
  if (typeof body !== "string" || !body.trim()) return;

  await db.note.create({
    data: {
      organizationId: session.user.organizationId,
      body,
      clientId,
      authorId: session.user.id,
    },
  });

  await db.activity.create({
    data: {
      organizationId: session.user.organizationId,
      type: "note_added",
      description: `Left a note`,
      clientId,
      userId: session.user.id,
    },
  });

  revalidatePath(`/dashboard/clients/${clientId}`);
}
