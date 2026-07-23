"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { aiAvailable, generateAiText, logAiGeneration } from "@/lib/ai";

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function generateWebsiteAction(formData: FormData) {
  const session = await requireSession();
  const clientId = (formData.get("clientId") as string) || null;
  const leadId = (formData.get("leadId") as string) || null;
  const tagline = (formData.get("tagline") as string) || "";

  let businessName: string;
  let industry: string | null;
  let servicesList: string;
  let recommendedServices: string[] = [];
  let painPoints: string | null = null;

  if (leadId) {
    const lead = await db.lead.findFirst({ where: { id: leadId, organizationId: session.user.organizationId } });
    if (!lead) return;
    businessName = lead.businessName;
    industry = lead.industry;
    recommendedServices = lead.recommendedServicesJson ? JSON.parse(lead.recommendedServicesJson) : [];
    servicesList = recommendedServices.join(", ") || "general marketing services";
    painPoints = lead.painPoints;
  } else if (clientId) {
    const client = await db.client.findFirst({ where: { id: clientId, organizationId: session.user.organizationId }, include: { services: true } });
    if (!client) return;
    businessName = client.businessName;
    industry = client.industry;
    servicesList = client.services.map((s) => s.name).join(", ") || "general services";
  } else {
    return;
  }

  if (!(await aiAvailable(session.user.organizationId))) {
    redirect(`/dashboard/website-builder?error=no_api_key`);
  }

  const prompt = `Generate website copy for a small business's marketing site — this is a "what it could look like"
mockup for a sales pitch, so make it aspirational and polished.

Business name: ${businessName}
Industry: ${industry ?? "unspecified"}
Services to feature: ${servicesList}
${painPoints ? `Known current pain points to address in the copy: ${painPoints}\n` : ""}${tagline ? `Desired tone/angle: ${tagline}` : ""}

Respond with ONLY valid JSON (no markdown fences) in this exact shape:
{
  "heroHeadline": "short punchy headline, under 8 words",
  "heroSubheadline": "1 sentence supporting the headline",
  "aboutContent": "2-3 sentence About section, written in third person about the business",
  "services": [{"title": "Service name", "description": "1 sentence benefit-focused description"}],
  "contactContent": "1 short sentence inviting visitors to get in touch"
}
Include 3-5 items in "services", based on the services listed above.`;

  const raw = await generateAiText({ organizationId: session.user.organizationId, prompt, maxTokens: 700 });
  await logAiGeneration(session.user.organizationId, "website_copy", businessName, prompt, raw);

  let parsed: {
    heroHeadline?: string;
    heroSubheadline?: string;
    aboutContent?: string;
    services?: Array<{ title: string; description: string }>;
    contactContent?: string;
  } = {};
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) parsed = JSON.parse(match[0]);
  } catch {
    parsed = {};
  }

  const existing = leadId ? await db.website.findFirst({ where: { leadId } }) : await db.website.findFirst({ where: { clientId } });

  const data = {
    organizationId: session.user.organizationId,
    clientId,
    leadId,
    businessName,
    industry,
    tagline: tagline || null,
    status: "draft",
    heroHeadline: parsed.heroHeadline ?? `Welcome to ${businessName}`,
    heroSubheadline: parsed.heroSubheadline ?? "",
    aboutContent: parsed.aboutContent ?? "",
    servicesJson: JSON.stringify(parsed.services ?? []),
    contactContent: parsed.contactContent ?? "Get in touch to learn more.",
  };

  const website = existing
    ? await db.website.update({ where: { id: existing.id }, data })
    : await db.website.create({ data });

  revalidatePath("/dashboard/website-builder");
  if (leadId) revalidatePath(`/dashboard/leads/${leadId}`);
  redirect(`/dashboard/website-builder/${website.id}`);
}

export async function publishWebsiteAction(id: string) {
  const session = await requireSession();
  const website = await db.website.findFirst({ where: { id, organizationId: session.user.organizationId } });
  if (!website) return;

  let slug = website.publishedSlug ?? slugify(website.businessName);
  let attempt = 0;
  while (await db.website.findFirst({ where: { publishedSlug: slug, NOT: { id: website.id } } })) {
    attempt += 1;
    slug = `${slugify(website.businessName)}-${attempt}`;
  }

  await db.website.update({ where: { id }, data: { status: "published", publishedSlug: slug } });
  revalidatePath(`/dashboard/website-builder/${id}`);
}

export async function unpublishWebsiteAction(id: string) {
  const session = await requireSession();
  await db.website.update({
    where: { id, organizationId: session.user.organizationId },
    data: { status: "draft" },
  });
  revalidatePath(`/dashboard/website-builder/${id}`);
}
