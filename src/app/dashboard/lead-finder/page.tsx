import Link from "next/link";
import { RefreshCw, Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { getOrgApiKeys } from "@/lib/api-keys";
import { discoverBusinesses } from "@/lib/discovery";
import { LeadFinderForm } from "@/components/leads/lead-finder-form";
import { LeadFinderResults } from "@/components/leads/lead-finder-results";
import { PageHeader, Card, Button, Badge } from "@/components/ui/primitives";

// The Apify Google Maps scrape can run for tens of seconds; allow the render a
// generous budget on Vercel (respected on Pro/Fluid; harmless elsewhere).
export const maxDuration = 300;

export default async function LeadFinderPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string; niche?: string; radius?: string; keywords?: string; limit?: string; phone?: string; retry?: string }>;
}) {
  const session = await requireSession();
  const { location, niche, radius, keywords, limit, phone } = await searchParams;

  const keys = await getOrgApiKeys(session.user.organizationId);
  const hasPlacesKey = Boolean(keys.googlePlacesApiKey);
  const hasApifyKey = Boolean(keys.apifyApiKey);

  let discovery: Awaited<ReturnType<typeof discoverBusinesses>> | null = null;
  if (location && niche) {
    discovery = await discoverBusinesses({
      location,
      niche,
      keywords,
      radiusMiles: Number(radius) || 8,
      placesApiKey: keys.googlePlacesApiKey,
      tomtomApiKey: keys.tomtomApiKey,
      apifyApiKey: keys.apifyApiKey,
      limit: Number(limit) || 40,
      phoneOnly: phone === "yes",
    });
  }

  // Every business name already in this org's leads (any source), so the finder
  // never re-surfaces a business you've already added.
  const existingNames = (
    await db.lead.findMany({
      where: { organizationId: session.user.organizationId },
      select: { businessName: true },
    })
  ).map((l) => l.businessName);
  const existingNameSet = new Set(existingNames.map((n) => n.trim().toLowerCase()));

  let hiddenCount = 0;
  if (discovery && discovery.businesses.length > 0) {
    const before = discovery.businesses.length;
    discovery.businesses = discovery.businesses.filter(
      (b) => !existingNameSet.has(b.name.trim().toLowerCase())
    );
    hiddenCount = before - discovery.businesses.length;
  }

  const formKey = [location, niche, radius, keywords, limit, phone].join("|");
  const retryHref = (() => {
    const p = new URLSearchParams();
    if (location) p.set("location", location);
    if (niche) p.set("niche", niche);
    if (radius) p.set("radius", radius);
    if (keywords) p.set("keywords", keywords);
    if (limit) p.set("limit", limit);
    if (phone) p.set("phone", phone);
    p.set("retry", String(new Date().getTime()));
    return `/dashboard/lead-finder?${p.toString()}`;
  })();

  return (
    <div>
      <PageHeader
        title="Lead Finder"
        description="Pick a city and a niche, auto-analyze real businesses, and surface only the ones worth calling"
        action={
          <Badge tone={hasApifyKey || hasPlacesKey || Boolean(keys.tomtomApiKey) ? "brand" : "default"}>
            {hasApifyKey
              ? "Apify Google Maps connected"
              : hasPlacesKey
                ? "Google Places connected"
                : keys.tomtomApiKey
                  ? "TomTom connected"
                  : "Free OpenStreetMap data"}
          </Badge>
        }
      />

      <div className="px-4 py-5 sm:px-6">
        <Card className="mb-6 p-6">
          <LeadFinderForm
            key={formKey}
            initial={{
              location: location ?? "",
              niche: niche ?? "",
              radius: radius ?? "8",
              keywords: keywords ?? "",
              limit: limit ?? "40",
              phone: phone ?? "",
            }}
          />
          {!hasPlacesKey && !keys.tomtomApiKey && (
            <p className="mt-3 text-xs text-fg-subtle">
              Free keyless data comes from OpenStreetMap, which is thin on US small businesses. For far more leads,{" "}
              <Link href="/dashboard/settings" className="text-brand hover:text-brand-hover">
                connect a free TomTom key in Settings
              </Link>{" "}
              (real commercial listings, 2,500 searches/day, no credit card) — or a Google Places key for ratings &amp;
              review counts too.
            </p>
          )}
        </Card>

        {discovery?.error && (
          <Card className="mb-6 flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm text-danger">{discovery.error}</p>
            <Link href={retryHref}>
              <Button variant="secondary" size="sm">
                <RefreshCw size={13} /> Try again
              </Button>
            </Link>
          </Card>
        )}
        {discovery?.warning && <Card className="mb-6 p-4 text-sm text-warning">{discovery.warning}</Card>}

        {discovery && !discovery.error && discovery.businesses.length > 0 && (
          <>
            {hiddenCount > 0 && (
              <p className="mb-3 text-xs text-fg-subtle">
                {hiddenCount} business{hiddenCount === 1 ? "" : "es"} already in your leads {hiddenCount === 1 ? "was" : "were"} hidden.
              </p>
            )}
            <LeadFinderResults businesses={discovery.businesses} existingNames={existingNames} source={discovery.source} />
          </>
        )}

        {discovery && !discovery.error && discovery.businesses.length === 0 && (
          <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm text-fg-muted">
              {hiddenCount > 0
                ? `Every business we found for "${niche}" near ${discovery.resolvedLocation ?? location} is already in your leads. Try a bigger radius or a different niche to find new ones.`
                : `No businesses matched "${niche}" near ${discovery.resolvedLocation ?? location}. Try a bigger radius, a broader niche, or check the phone-only filter.`}
            </p>
            <Link href={retryHref}>
              <Button variant="secondary" size="sm">
                <RefreshCw size={13} /> Try again
              </Button>
            </Link>
          </Card>
        )}

        {!location && (
          <Card className="flex flex-col items-center justify-center py-16 text-center">
            <Sparkles size={28} className="mb-3 text-brand" />
            <p className="text-sm font-medium text-fg">Find businesses that need marketing help</p>
            <p className="mt-1 max-w-md text-sm text-fg-muted">
              Choose from the biggest US cities and 40+ proven niches — or type your own and save it for next time. We pull real businesses, audit each one live, and show you only the high-opportunity leads.
            </p>
            <Link href="/dashboard/leads" className="mt-4 text-sm text-brand hover:text-brand-hover">
              Or view your existing leads →
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}
