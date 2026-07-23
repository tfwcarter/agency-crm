import type { Prisma } from "@/generated/prisma/client";

export type LeadSearchParams = Record<string, string | undefined>;

/**
 * Builds the Prisma where-clause for the Lead Intelligence list's filter bar.
 * Shared between the leads page (to list/paginate) and the "delete all matching"
 * action (to mass-delete exactly what's currently on screen) — kept in one place
 * so the two can never drift apart.
 */
export function buildLeadWhere(orgId: string, sp: LeadSearchParams): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = { organizationId: orgId, status: { not: "converted" } };

  if (sp.q) where.businessName = { contains: sp.q };
  if (sp.industry) where.industry = sp.industry;
  if (sp.city) where.city = { contains: sp.city };
  if (sp.state) where.state = { contains: sp.state };
  if (sp.status) where.status = sp.status;
  if (sp.owner) where.ownerId = sp.owner;
  if (sp.favoritesOnly === "yes") where.favorited = true;
  if (sp.minScore) where.opportunityScore = { gte: Number(sp.minScore) };
  if (sp.hasWebsite === "yes") where.website = { not: null };
  if (sp.hasWebsite === "no") where.website = null;
  if (sp.label) where.labelsJson = { contains: sp.label };
  if (sp.tech) where.techStackJson = { contains: sp.tech };
  if (sp.ssl === "yes") where.hasSsl = true;
  if (sp.ssl === "no") where.hasSsl = false;
  if (sp.pixel === "yes") where.hasMetaPixel = true;
  if (sp.pixel === "no") where.hasMetaPixel = false;
  if (sp.analytics === "yes") where.OR = [{ hasGoogleAnalytics: true }, { hasGoogleTagManager: true }];
  if (sp.analytics === "no") where.AND = [{ hasGoogleAnalytics: false }, { hasGoogleTagManager: false }];

  return where;
}
