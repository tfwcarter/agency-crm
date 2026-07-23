"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { runAutomations } from "@/lib/automations";
import { buildLeadWhere, type LeadSearchParams } from "@/lib/lead-filters";

const leadSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  ownerName: z.string().optional(),
  phone: z.string().optional(),
  email: z.union([z.literal(""), z.string().email()]).optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  tiktokUrl: z.string().optional(),
  industry: z.string().optional(),
  googleRating: z.coerce.number().min(0).max(5).optional().or(z.literal("")),
  googleReviews: z.coerce.number().min(0).optional().or(z.literal("")),
  estimatedRevenue: z.string().optional(),
  employees: z.string().optional(),
  facebookUrl: z.string().optional(),
  instagramUrl: z.string().optional(),
  linkedinUrl: z.string().optional(),
  painPoints: z.string().optional(),
  timeline: z.string().optional(),
  status: z.enum(["new", "contacted", "qualified", "converted", "dead"]).default("new"),
  ownerId: z.string().optional(),
});

function formToLeadData(formData: FormData) {
  return leadSchema.parse({
    businessName: formData.get("businessName"),
    ownerName: formData.get("ownerName") || undefined,
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    website: formData.get("website") || undefined,
    address: formData.get("address") || undefined,
    city: formData.get("city") || undefined,
    state: formData.get("state") || undefined,
    zip: formData.get("zip") || undefined,
    industry: formData.get("industry") || undefined,
    googleRating: formData.get("googleRating") || undefined,
    googleReviews: formData.get("googleReviews") || undefined,
    estimatedRevenue: formData.get("estimatedRevenue") || undefined,
    employees: formData.get("employees") || undefined,
    facebookUrl: formData.get("facebookUrl") || undefined,
    instagramUrl: formData.get("instagramUrl") || undefined,
    linkedinUrl: formData.get("linkedinUrl") || undefined,
    tiktokUrl: formData.get("tiktokUrl") || undefined,
    painPoints: formData.get("painPoints") || undefined,
    timeline: formData.get("timeline") || undefined,
    status: formData.get("status") || "new",
    ownerId: formData.get("ownerId") || undefined,
  });
}

function computeLeadScore(data: {
  googleRating?: number | "";
  googleReviews?: number | "";
  painPoints?: string;
}) {
  let score = 40;
  if (typeof data.googleRating === "number" && data.googleRating < 4) score += 15;
  if (typeof data.googleReviews === "number" && data.googleReviews < 10) score += 15;
  if (data.painPoints && data.painPoints.trim().length > 0) score += 20;
  return Math.min(100, score);
}

export async function createLeadAction(formData: FormData) {
  const session = await requireSession();
  const data = formToLeadData(formData);

  const lead = await db.lead.create({
    data: {
      organizationId: session.user.organizationId,
      businessName: data.businessName,
      ownerName: data.ownerName,
      phone: data.phone,
      email: data.email || null,
      website: data.website,
      address: data.address,
      city: data.city,
      state: data.state,
      zip: data.zip,
      industry: data.industry,
      googleRating: data.googleRating === "" ? null : data.googleRating,
      googleReviews: data.googleReviews === "" ? null : data.googleReviews,
      estimatedRevenue: data.estimatedRevenue,
      employees: data.employees,
      facebookUrl: data.facebookUrl,
      instagramUrl: data.instagramUrl,
      linkedinUrl: data.linkedinUrl,
      tiktokUrl: data.tiktokUrl,
      painPoints: data.painPoints,
      timeline: data.timeline,
      status: data.status,
      ownerId: data.ownerId || session.user.id,
      leadScore: computeLeadScore(data),
      source: "manual",
    },
  });

  await db.activity.create({
    data: {
      organizationId: session.user.organizationId,
      type: "lead_created",
      description: `${lead.businessName} was added as a lead`,
      leadId: lead.id,
      userId: session.user.id,
    },
  });

  await runAutomations(session.user.organizationId, "lead_created", {
    leadId: lead.id,
    entityName: lead.businessName,
  });

  revalidatePath("/dashboard/leads");
  redirect(`/dashboard/leads/${lead.id}`);
}

export async function updateLeadAction(leadId: string, formData: FormData) {
  const session = await requireSession();
  const data = formToLeadData(formData);

  await db.lead.update({
    where: { id: leadId, organizationId: session.user.organizationId },
    data: {
      businessName: data.businessName,
      ownerName: data.ownerName,
      phone: data.phone,
      email: data.email || null,
      website: data.website,
      address: data.address,
      city: data.city,
      state: data.state,
      zip: data.zip,
      industry: data.industry,
      googleRating: data.googleRating === "" ? null : data.googleRating,
      googleReviews: data.googleReviews === "" ? null : data.googleReviews,
      estimatedRevenue: data.estimatedRevenue,
      employees: data.employees,
      facebookUrl: data.facebookUrl,
      instagramUrl: data.instagramUrl,
      linkedinUrl: data.linkedinUrl,
      tiktokUrl: data.tiktokUrl,
      painPoints: data.painPoints,
      timeline: data.timeline,
      status: data.status,
      ownerId: data.ownerId || null,
    },
  });

  revalidatePath(`/dashboard/leads/${leadId}`);
  revalidatePath("/dashboard/leads");
}

export async function addLeadNoteAction(leadId: string, formData: FormData) {
  const session = await requireSession();
  const body = formData.get("body");
  if (typeof body !== "string" || !body.trim()) return;

  await db.note.create({
    data: {
      organizationId: session.user.organizationId,
      body,
      leadId,
      authorId: session.user.id,
    },
  });

  await db.activity.create({
    data: {
      organizationId: session.user.organizationId,
      type: "note_added",
      description: "Left a note",
      leadId,
      userId: session.user.id,
    },
  });

  revalidatePath(`/dashboard/leads/${leadId}`);
}

export async function convertLeadToClientAction(leadId: string) {
  const session = await requireSession();
  const lead = await db.lead.findFirst({ where: { id: leadId, organizationId: session.user.organizationId } });
  if (!lead) return;

  const client = await db.client.create({
    data: {
      organizationId: session.user.organizationId,
      businessName: lead.businessName,
      contactName: lead.ownerName,
      email: lead.email,
      phone: lead.phone,
      website: lead.website,
      address: lead.address,
      industry: lead.industry,
      facebookUrl: lead.facebookUrl,
      instagramUrl: lead.instagramUrl,
      linkedinUrl: lead.linkedinUrl,
      accountManagerId: lead.ownerId,
      status: "active",
    },
  });

  await db.lead.update({
    where: { id: leadId },
    data: { status: "converted", convertedClientId: client.id },
  });

  await db.activity.create({
    data: {
      organizationId: session.user.organizationId,
      type: "lead_converted",
      description: `${lead.businessName} converted from lead to client`,
      clientId: client.id,
      leadId: lead.id,
      userId: session.user.id,
    },
  });

  revalidatePath("/dashboard/leads");
  revalidatePath("/dashboard/clients");
  redirect(`/dashboard/clients/${client.id}`);
}

export async function deleteLeadAction(leadId: string) {
  const session = await requireSession();
  await db.lead.delete({ where: { id: leadId, organizationId: session.user.organizationId } });
  revalidatePath("/dashboard/leads");
  redirect("/dashboard/leads");
}

/**
 * Bulk/row delete for the Lead Intelligence table — unlike deleteLeadAction this
 * never redirects, so it can be called directly from client code (single row via
 * the trash icon, or many via the selection toolbar) and just refresh in place.
 * Scoped to `deleteMany` on organizationId + id-in-list so a request can never
 * touch another org's data even if a stale/tampered id sneaks into the list.
 */
export async function deleteLeadsAction(leadIds: string[]) {
  const session = await requireSession();
  if (leadIds.length === 0) return { count: 0 };

  const { count } = await db.lead.deleteMany({
    where: { id: { in: leadIds }, organizationId: session.user.organizationId },
  });

  revalidatePath("/dashboard/leads");
  return { count };
}

/**
 * Mass delete — removes every lead matching the CURRENT filter bar state (the
 * same Prisma where-clause the list itself is built from, see lib/lead-filters.ts),
 * not literally every lead in the org. Clearing all filters first makes this a true
 * "delete all leads"; the confirmation UI always shows the exact count about to be
 * removed so there's no ambiguity about scope.
 */
export async function deleteAllLeadsAction(filters: LeadSearchParams) {
  const session = await requireSession();
  const where = buildLeadWhere(session.user.organizationId, filters);

  const { count } = await db.lead.deleteMany({ where });

  revalidatePath("/dashboard/leads");
  return { count };
}

const BULK_STATUS_VALUES = new Set(["new", "contacted", "qualified", "dead"]);

/** Bulk status change from the selection toolbar — e.g. mark a batch "Dead" instead of deleting it. */
export async function bulkUpdateLeadStatusAction(leadIds: string[], status: string) {
  const session = await requireSession();
  if (leadIds.length === 0 || !BULK_STATUS_VALUES.has(status)) return { count: 0 };

  const { count } = await db.lead.updateMany({
    where: { id: { in: leadIds }, organizationId: session.user.organizationId },
    data: { status },
  });

  revalidatePath("/dashboard/leads");
  return { count };
}
