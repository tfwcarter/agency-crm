"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { auditWebsite } from "@/lib/website-audit";
import { lookupDomainIntel } from "@/lib/enrichment/dns-whois";
import { scoreLead, type LeadSignals } from "@/lib/lead-scoring";
import { estimateDealValue } from "@/lib/deal-estimator";
import { getOrgApiKeys } from "@/lib/api-keys";
import type { DiscoveredBusiness } from "@/lib/discovery";

export type QualifyInput = {
  website: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  linkedinUrl: string | null;
  googleRating: number | null;
  googleReviews: number | null;
};

export type Qualification = {
  opportunityScore: number;
  labels: string[];
  topReasons: string[]; // highest-value reasons to call them, in plain language
  hasWebsite: boolean;
  websiteReachable: boolean | null;
  signals: LeadSignals; // kept so import can re-score authoritatively without re-fetching
  websiteFields: Record<string, unknown>; // audit-derived DB columns to persist on import
};

/**
 * Qualifies a single DISCOVERED (not-yet-saved) business by running the same real,
 * free-signal pipeline used for saved leads — a live website audit (when there's a
 * site) + DNS/domain-age lookup + deterministic opportunity scoring. Nothing is
 * written to the database; the Lead Finder calls this per candidate (with a live
 * progress bar) so it can surface only the businesses worth calling.
 */
export async function qualifyBusinessAction(input: QualifyInput): Promise<Qualification> {
  const session = await requireSession();

  let signals: LeadSignals;
  let websiteFields: Record<string, unknown> = {};

  if (input.website) {
    const keys = await getOrgApiKeys(session.user.organizationId);
    const [audit, domainIntel] = await Promise.all([
      auditWebsite(input.website, keys.pagespeedApiKey),
      lookupDomainIntel(input.website),
    ]);

    signals = {
      hasWebsite: true,
      websiteReachable: audit.reachable,
      hasSsl: audit.hasSsl,
      speedScore: audit.speedScore,
      seoScore: audit.seoScore,
      mobileScore: audit.mobileScore,
      designScore: audit.designScore,
      accessibilityScore: audit.accessibilityScore,
      hasGoogleAnalytics: audit.hasGoogleAnalytics,
      hasGoogleTagManager: audit.hasGoogleTagManager,
      hasMetaPixel: audit.hasMetaPixel,
      hasSchema: audit.hasSchema,
      hasOpenGraph: audit.hasOpenGraph,
      hasFavicon: audit.hasFavicon,
      hasPrivacyPolicy: audit.hasPrivacyPolicy,
      hasChatWidget: audit.hasChatWidget,
      hasBookingLink: audit.hasBookingLink,
      hasContactForm: audit.hasContactForm,
      hasViewportMeta: audit.hasViewportMeta,
      brokenLinkCount: audit.brokenLinkCount,
      copyrightYear: audit.copyrightYear,
      domainCreatedAt: domainIntel.domainCreatedAt,
      googleRating: input.googleRating,
      googleReviews: input.googleReviews,
      hasFacebook: Boolean(input.facebookUrl),
      hasInstagram: Boolean(input.instagramUrl),
      hasLinkedIn: Boolean(input.linkedinUrl),
      hasTikTok: false,
    };

    websiteFields = {
      speedScore: audit.speedScore,
      seoScore: audit.seoScore,
      mobileScore: audit.mobileScore,
      designScore: audit.designScore,
      techStackJson: JSON.stringify(audit.techStack),
      hasSsl: audit.hasSsl,
      hasGoogleAnalytics: audit.hasGoogleAnalytics,
      hasGoogleTagManager: audit.hasGoogleTagManager,
      hasMetaPixel: audit.hasMetaPixel,
      hasSchema: audit.hasSchema,
      hasOpenGraph: audit.hasOpenGraph,
      hasFavicon: audit.hasFavicon,
      hasPrivacyPolicy: audit.hasPrivacyPolicy,
      hasChatWidget: audit.hasChatWidget,
      chatWidgetVendor: audit.chatWidgetVendor,
      hasTikTokPixel: audit.hasTikTokPixel,
      hasLinkedInInsight: audit.hasLinkedInInsight,
      brokenLinkCount: audit.brokenLinkCount,
      copyrightYear: audit.copyrightYear,
      domainCreatedAt: domainIntel.domainCreatedAt,
      dnsProvider: domainIntel.dnsProvider,
      mxProvider: domainIntel.mxProvider,
    };
  } else {
    signals = {
      hasWebsite: false,
      websiteReachable: null,
      hasSsl: null,
      speedScore: null,
      seoScore: null,
      mobileScore: null,
      designScore: null,
      accessibilityScore: null,
      hasGoogleAnalytics: null,
      hasGoogleTagManager: null,
      hasMetaPixel: null,
      hasSchema: null,
      hasOpenGraph: null,
      hasFavicon: null,
      hasPrivacyPolicy: null,
      hasChatWidget: null,
      hasBookingLink: null,
      hasContactForm: null,
      hasViewportMeta: null,
      brokenLinkCount: null,
      copyrightYear: null,
      domainCreatedAt: null,
      googleRating: input.googleRating,
      googleReviews: input.googleReviews,
      hasFacebook: Boolean(input.facebookUrl),
      hasInstagram: Boolean(input.instagramUrl),
      hasLinkedIn: Boolean(input.linkedinUrl),
      hasTikTok: false,
    };
  }

  const scored = scoreLead(signals);
  const topReasons = [...scored.breakdown].sort((a, b) => b.points - a.points).slice(0, 3).map((f) => f.factor);

  return {
    opportunityScore: scored.opportunityScore,
    labels: scored.labels,
    topReasons,
    hasWebsite: signals.hasWebsite,
    websiteReachable: signals.websiteReachable,
    signals,
    websiteFields,
  };
}

/**
 * Imports a qualified discovered business as a fully-scored Lead. Re-runs the
 * deterministic scorer server-side from the qualification's signals (so the stored
 * score is authoritative, not whatever the client sent), then persists the audit
 * fields, labels, recommendations, and historical deal estimate — no second website
 * fetch needed since qualification already gathered everything.
 */
export async function importQualifiedLeadAction(business: DiscoveredBusiness, q: Qualification): Promise<{ imported: boolean; leadId?: string }> {
  const session = await requireSession();
  const orgId = session.user.organizationId;

  const existing = await db.lead.findFirst({
    where: { organizationId: orgId, businessName: business.name, source: "lead_finder" },
    select: { id: true },
  });
  if (existing) return { imported: false, leadId: existing.id };

  // Authoritative re-score from the (server-produced) signals.
  const scored = scoreLead(q.signals);
  const dealEstimate = await estimateDealValue(orgId, scored.recommendations);

  const lead = await db.lead.create({
    data: {
      organizationId: orgId,
      businessName: business.name,
      phone: business.phone,
      website: business.website,
      address: business.address,
      city: business.city,
      state: business.state,
      zip: business.zip,
      industry: business.category,
      facebookUrl: business.facebookUrl,
      instagramUrl: business.instagramUrl,
      linkedinUrl: business.linkedinUrl,
      latitude: business.latitude,
      longitude: business.longitude,
      googleRating: business.googleRating,
      googleReviews: business.googleReviews,
      ...q.websiteFields,
      opportunityScore: scored.opportunityScore,
      leadScore: scored.opportunityScore,
      scoreBreakdownJson: JSON.stringify(scored.breakdown),
      labelsJson: JSON.stringify(scored.labels),
      recommendedServicesJson: JSON.stringify(scored.recommendations.map((r) => r.service)),
      estimatedDealSetup: dealEstimate.setup,
      estimatedDealMonthly: dealEstimate.monthly,
      painPoints: business.website ? null : "No website found",
      lastEnrichedAt: new Date(),
      source: "lead_finder",
      ownerId: session.user.id,
    },
  });

  await db.activity.create({
    data: {
      organizationId: orgId,
      type: "lead_created",
      description: `${lead.businessName} added from Lead Finder — opportunity score ${scored.opportunityScore}`,
      leadId: lead.id,
      userId: session.user.id,
    },
  });

  revalidatePath("/dashboard/leads");
  revalidatePath("/dashboard/lead-finder");
  return { imported: true, leadId: lead.id };
}
