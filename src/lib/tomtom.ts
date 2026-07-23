// TomTom Search API — the recommended free upgrade for the Lead Finder. Unlike
// every keyless option (Nominatim/Photon/Overpass are all the same OpenStreetMap
// dataset, which is sparse for US small businesses), TomTom serves a real
// commercial POI database: name, phone, website, and address in one call.
// Free tier: 2,500 requests/day with a key from developer.tomtom.com — no credit
// card. Wired through the same paste-a-key Settings flow as every other key here;
// any failure degrades honestly to the free OSM chain.

export interface TomTomBusiness {
  id: string;
  name: string;
  category: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  latitude: number;
  longitude: number;
}

interface TomTomResult {
  id?: string;
  poi?: {
    name?: string;
    phone?: string;
    url?: string;
    categories?: string[];
  };
  address?: {
    freeformAddress?: string;
    municipality?: string;
    countrySubdivision?: string;
    postalCode?: string;
  };
  position?: { lat?: number; lon?: number };
}

export type TomTomSearchResult = { ok: true; businesses: TomTomBusiness[] } | { ok: false; error: string };

function normalizeUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export async function searchTomTom(params: {
  apiKey: string;
  query: string;
  lat: number;
  lon: number;
  radiusMeters: number;
  limit?: number;
}): Promise<TomTomSearchResult> {
  try {
    const url = new URL(`https://api.tomtom.com/search/2/poiSearch/${encodeURIComponent(params.query)}.json`);
    url.searchParams.set("key", params.apiKey);
    url.searchParams.set("lat", String(params.lat));
    url.searchParams.set("lon", String(params.lon));
    url.searchParams.set("radius", String(Math.min(50000, Math.round(params.radiusMeters))));
    url.searchParams.set("limit", String(Math.min(100, params.limit ?? 100)));
    url.searchParams.set("countrySet", "US");

    const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) {
      return { ok: false, error: `TomTom returned ${res.status}${res.status === 403 ? " (check the key)" : ""}` };
    }

    const json = (await res.json()) as { results?: TomTomResult[] };
    const businesses: TomTomBusiness[] = (json.results ?? [])
      .filter((r) => r.poi?.name && r.position?.lat !== undefined && r.position?.lon !== undefined)
      .map((r) => ({
        id: r.id ?? `${r.poi!.name}-${r.position!.lat}`,
        name: r.poi!.name!,
        category: r.poi?.categories?.[0] ?? null,
        phone: r.poi?.phone ?? null,
        website: normalizeUrl(r.poi?.url ?? null),
        address: r.address?.freeformAddress ?? null,
        city: r.address?.municipality ?? null,
        state: r.address?.countrySubdivision ?? null,
        zip: r.address?.postalCode ?? null,
        latitude: r.position!.lat!,
        longitude: r.position!.lon!,
      }));

    return { ok: true, businesses };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "TomTom request failed" };
  }
}
