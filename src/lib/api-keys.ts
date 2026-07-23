import { db } from "@/lib/db";

export type OrgApiKeys = {
  groqApiKey: string | null;
  anthropicApiKey: string | null;
  pagespeedApiKey: string | null;
  stripeSecretKey: string | null;
  googlePlacesApiKey: string | null;
  tomtomApiKey: string | null;
};

/**
 * Resolves an organization's API keys: a key pasted into Settings (stored on the
 * Organization row) always wins over the matching env var, so pasting a key in the
 * UI takes effect immediately with no .env editing or server restart.
 */
export async function getOrgApiKeys(organizationId: string): Promise<OrgApiKeys> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { groqApiKey: true, anthropicApiKey: true, pagespeedApiKey: true, stripeSecretKey: true, googlePlacesApiKey: true, tomtomApiKey: true },
  });

  return {
    groqApiKey: org?.groqApiKey || process.env.GROQ_API_KEY || null,
    anthropicApiKey: org?.anthropicApiKey || process.env.ANTHROPIC_API_KEY || null,
    pagespeedApiKey: org?.pagespeedApiKey || process.env.PAGESPEED_API_KEY || null,
    stripeSecretKey: org?.stripeSecretKey || process.env.STRIPE_SECRET_KEY || null,
    googlePlacesApiKey: org?.googlePlacesApiKey || process.env.GOOGLE_PLACES_API_KEY || null,
    tomtomApiKey: org?.tomtomApiKey || process.env.TOMTOM_API_KEY || null,
  };
}
