import Link from "next/link";
import { RefreshCw, Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { getOrgApiKeys } from "@/lib/api-keys";
import { discoverBusinesses } from "@/lib/discovery";
import { LeadFinderForm } from "@/components/leads/lead-finder-form";
import { LeadFinderResults } from "@/components/leads/lead-finder-results";
import { PageHeader, Card, Button, Badge } from "@/components/ui/primitives";

export default async function LeadFinderPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string; niche?: string; radius?: string; keywords?: string; limit?: string; phone?: string; retry?: string }>;
}) {
  const session = await requireSession();
  const { location, niche, radius, keywords, limit, phone } = await searchParams;

  const keys = await getOrgApiKeys(session.user.organizationId);
  const hasPlacesKey = Boolean(keys.googlePlacesApiKey);

  let discovery: Awaited<ReturnType<typeof discoverBusinesses>> | null = null;
  if (location && niche) {
    discovery = await discoverBusinesses({
      location,
      niche,
      keywords,
      radiusMiles: Number(radius) || 8,
      placesApiKey: keys.googlePlacesApiKey,
      tomtomApiKey: keys.tomtomApiKey,
      limit: Number(limit) || 40,
      phoneOnly: phone === "yes",
    });
  }

  const existingNames = (
    await db.lead.findMany({
      where: { organizationId: session.user.organizationId, source: "lead_finder" },
      select: { businessName: true },
    })
  ).map((l) => l.businessName);

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
          <Badge tone={hasPlacesKey || Boolean(keys.tomtomApiKey) ? "brand" : "default"}>
            {hasPlacesKey ? "Google Places connected" : keys.tomtomApiKey ? "TomTom connected" : "Free OpenStreetMap data"}
          </Badge>
        }
      />

      <div className="px-6 py-5">
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
          <LeadFinderResults businesses={discovery.businesses} existingNames={existingNames} source={discovery.source} />
        )}

        {discovery && !discovery.error && discovery.businesses.length === 0 && (
          <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm text-fg-muted">
              No businesses matched &quot;{niche}&quot; near {discovery.resolvedLocation ?? location}. Try a bigger
              radius, a broader niche, or check the phone-only filter.
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
