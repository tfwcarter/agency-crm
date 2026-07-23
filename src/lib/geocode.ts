// Free-text location → coordinates, with failover: OSM Nominatim first, then
// komoot's Photon (both keyless). Preset cities in the Lead Finder never hit this
// at all — their coordinates are baked into src/lib/lead-finder-presets.ts — so
// geocoding only runs for custom typed locations. Results are memoized in-process.

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const PHOTON_URL = "https://photon.komoot.io/api/";
const USER_AGENT = "AgencyCRM-LeadFinder/0.2 (contact: dev@agency.local)";

export interface GeocodeResult {
  lat: number;
  lon: number;
  displayName: string;
}

const memo = new Map<string, GeocodeResult | null>();

async function viaNominatim(query: string): Promise<GeocodeResult | null> {
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(9000),
  });
  if (!res.ok) throw new Error(`Nominatim geocoding failed: ${res.status}`);

  const results = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  const first = results[0];
  if (!first) return null;
  return { lat: parseFloat(first.lat), lon: parseFloat(first.lon), displayName: first.display_name };
}

async function viaPhoton(query: string): Promise<GeocodeResult | null> {
  const url = new URL(PHOTON_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "1");

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(9000),
  });
  if (!res.ok) throw new Error(`Photon geocoding failed: ${res.status}`);

  const json = (await res.json()) as {
    features?: Array<{ geometry?: { coordinates?: [number, number] }; properties?: { name?: string; city?: string; state?: string; country?: string } }>;
  };
  const f = json.features?.[0];
  const coords = f?.geometry?.coordinates;
  if (!coords) return null;
  const p = f?.properties ?? {};
  const displayName = [p.name, p.city, p.state, p.country].filter(Boolean).join(", ") || query;
  return { lat: coords[1], lon: coords[0], displayName };
}

export async function geocodeLocation(query: string): Promise<GeocodeResult | null> {
  const key = query.trim().toLowerCase();
  if (memo.has(key)) return memo.get(key) ?? null;

  let result: GeocodeResult | null = null;
  try {
    result = await viaNominatim(query);
  } catch {
    /* fall through to Photon */
  }
  if (!result) {
    try {
      result = await viaPhoton(query);
    } catch {
      /* both failed */
    }
  }

  // Memoize hits and misses (misses only briefly matter; a hit is stable).
  if (memo.size > 200) memo.clear();
  memo.set(key, result);
  return result;
}
