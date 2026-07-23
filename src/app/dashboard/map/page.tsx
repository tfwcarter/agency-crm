import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { geocodeLocation } from "@/lib/geocode";
import { PageHeader, Card } from "@/components/ui/primitives";
import { MapLoader } from "@/components/map/map-loader";
import type { Pin } from "@/components/map/leaflet-map";

const MAX_GEOCODE_PER_LOAD = 4;

export default async function MapViewPage() {
  const session = await requireSession();

  const [clients, leads] = await Promise.all([
    db.client.findMany({ where: { organizationId: session.user.organizationId } }),
    db.lead.findMany({ where: { organizationId: session.user.organizationId, status: { not: "converted" } } }),
  ]);

  let geocodedThisLoad = 0;
  const pins: Pin[] = [];

  for (const client of clients) {
    if (client.latitude != null && client.longitude != null) {
      pins.push({
        id: client.id,
        name: client.businessName,
        latitude: client.latitude,
        longitude: client.longitude,
        href: `/dashboard/clients/${client.id}`,
        type: "client",
        subtitle: client.industry ?? undefined,
      });
    } else if (client.address && geocodedThisLoad < MAX_GEOCODE_PER_LOAD) {
      geocodedThisLoad += 1;
      try {
        const geo = await geocodeLocation(client.address);
        if (geo) {
          await db.client.update({ where: { id: client.id }, data: { latitude: geo.lat, longitude: geo.lon } });
          pins.push({
            id: client.id,
            name: client.businessName,
            latitude: geo.lat,
            longitude: geo.lon,
            href: `/dashboard/clients/${client.id}`,
            type: "client",
            subtitle: client.industry ?? undefined,
          });
        }
      } catch {
        // geocoding is best-effort; skip pin if it fails
      }
    }
  }

  for (const lead of leads) {
    if (lead.latitude != null && lead.longitude != null) {
      pins.push({
        id: lead.id,
        name: lead.businessName,
        latitude: lead.latitude,
        longitude: lead.longitude,
        href: `/dashboard/leads/${lead.id}`,
        type: "lead",
        subtitle: lead.industry ?? undefined,
        opportunityScore: lead.opportunityScore,
      });
    } else if (lead.address && geocodedThisLoad < MAX_GEOCODE_PER_LOAD) {
      geocodedThisLoad += 1;
      try {
        const geo = await geocodeLocation(lead.address);
        if (geo) {
          await db.lead.update({ where: { id: lead.id }, data: { latitude: geo.lat, longitude: geo.lon } });
          pins.push({
            id: lead.id,
            name: lead.businessName,
            latitude: geo.lat,
            longitude: geo.lon,
            href: `/dashboard/leads/${lead.id}`,
            type: "lead",
            subtitle: lead.industry ?? undefined,
            opportunityScore: lead.opportunityScore,
          });
        }
      } catch {
        // geocoding is best-effort; skip pin if it fails
      }
    }
  }

  const unmapped = clients.length + leads.length - pins.length;

  return (
    <div>
      <PageHeader
        title="Map View"
        description={`${pins.length} pinned · ${unmapped > 0 ? `${unmapped} without a mappable address` : "all mapped"}`}
      />

      <div className="px-6 py-5">
        {pins.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm font-medium text-fg">No addresses to map yet</p>
            <p className="mt-1 text-sm text-fg-muted">Add addresses to clients or leads to see them plotted here.</p>
          </Card>
        ) : (
          <Card className="overflow-hidden p-0">
            <MapLoader pins={pins} />
          </Card>
        )}
      </div>
    </div>
  );
}
