"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { auditWebsite } from "@/lib/website-audit";
import { lookupDomainIntel } from "@/lib/enrichment/dns-whois";
import { scoreLead, type LeadSignals } from "@/lib/lead-scoring";
import { estimateDealValue } from "@/lib/deal-estimator";
import { getOrgApiKeys } from "@/lib/api-keys";

export type EnrichResult = {
  leadId: string;
  businessName: string;
  opportunityScore: number | null;
  error: string | null;
};

/**
 * Runs the full free-signal enrichment pipeline for one lead: website audit (if a
 * website is on file), DNS/domain-age lookup, deterministic opportunity scoring, and
 * historical deal-value estimation from the org's own closed data. Callable directly
 * (not just via a <form action>) so the bulk-enrich UI can invoke it per lead with a
 * live progress bar — there's no background job queue in this app, so this always
 * runs synchronously in the request that calls it.
 */
export async function enrichLeadAction(leadId: string): Promise<EnrichResult> {
  const session = await requireSession();
  const lead = await db.lead.findFirst({ where: { id: leadId, organizationId: session.user.organizationId } });
  if (!lead) return { leadId, businessName: "Unknown", opportunityScore: null, error: "Lead not found" };

  try {
    let signals: LeadSignals;
    let websiteFields: Record<string, unknown> = {};

    if (lead.website) {
      const keys = await getOrgApiKeys(session.user.organizationId);
      const [audit, domainIntel] = await Promise.all([
        auditWebsite(lead.website, keys.pagespeedApiKey),
        lookupDomainIntel(lead.website),
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
        googleRating: lead.googleRating,
        googleReviews: lead.googleReviews,
        hasFacebook: Boolean(lead.facebookUrl),
        hasInstagram: Boolean(lead.instagramUrl),
        hasLinkedIn: Boolean(lead.linkedinUrl),
        hasTikTok: Boolean(lead.tiktokUrl),
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
        googleRating: lead.googleRating,
        googleReviews: lead.googleReviews,
        hasFacebook: Boolean(lead.facebookUrl),
        hasInstagram: Boolean(lead.instagramUrl),
        hasLinkedIn: Boolean(lead.linkedinUrl),
        hasTikTok: Boolean(lead.tiktokUrl),
      };
    }

    const scored = scoreLead(signals);
    const dealEstimate = await estimateDealValue(session.user.organizationId, scored.recommendations);

    await db.lead.update({
      where: { id: leadId },
      data: {
        ...websiteFields,
        opportunityScore: scored.opportunityScore,
        scoreBreakdownJson: JSON.stringify(scored.breakdown),
        labelsJson: JSON.stringify(scored.labels),
        recommendedServicesJson: JSON.stringify(scored.recommendations.map((r) => r.service)),
        estimatedDealSetup: dealEstimate.setup,
        estimatedDealMonthly: dealEstimate.monthly,
        lastEnrichedAt: new Date(),
      },
    });

    revalidatePath(`/dashboard/leads/${leadId}`);
    revalidatePath("/dashboard/leads");

    return { leadId, businessName: lead.businessName, opportunityScore: scored.opportunityScore, error: null };
  } catch (err) {
    return { leadId, businessName: lead.businessName, opportunityScore: null, error: err instanceof Error ? err.message : "Enrichment failed" };
  }
}

export async function toggleFavoriteLeadAction(leadId: string, favorited: boolean) {
  const session = await requireSession();
  await db.lead.update({ where: { id: leadId, organizationId: session.user.organizationId }, data: { favorited } });
  revalidatePath("/dashboard/leads");
  revalidatePath(`/dashboard/leads/${leadId}`);
}
