// PRIMARY free business-discovery engine — merges TWO keyless OSM-backed services
// so a single search yields far more leads than either alone:
//
//   • Nominatim (nominatim.openstreetmap.org) — category phrases + bounded name
//     search, rich records (phone/website via extratags). Policy: 1 req/s, so
//     passes are spaced 1.1s and capped per search.
//   • Photon (photon.komoot.io) — komoot's fast fuzzy geocoder with a bbox filter
//     (verified: 50 in-metro POIs in ~200ms). No phone/website in responses, but
//     it surfaces many businesses Nominatim's stricter matching misses. No strict
//     rate limit; passes run in parallel.
//
// Results are merged and deduped by name; when both sources return the same
// business, the record with contact info wins. 20-minute cache per search.

import type { RawOsmLead } from "@/lib/osm-leads";
import { nameQueriesFor, type NichePreset } from "@/lib/lead-finder-presets";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const PHOTON_URL = "https://photon.komoot.io/api/";
const USER_AGENT = "AgencyCRM-LeadFinder/0.3 (contact: dev@agency.local)";

const POI_CLASSES = new Set(["shop", "amenity", "office", "craft", "healthcare", "leisure", "tourism", "club"]);
const MAX_NOMINATIM_NAME_PASSES = 3;
const MAX_PHOTON_PASSES = 4;

interface NominatimResult {
  place_id: number;
  osm_type?: string;
  osm_id?: number;
  lat: string;
  lon: string;
  class?: string;
  category?: string;
  type?: string;
  name?: string;
  display_name?: string;
  address?: {
    house_number?: string;
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    suburb?: string;
    state?: string;
    postcode?: string;
  };
  extratags?: Record<string, string> | null;
}

interface PhotonFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    osm_type?: string;
    osm_id?: number;
    osm_key?: string;
    osm_value?: string;
    name?: string;
    housenumber?: string;
    street?: string;
    city?: string;
    district?: string;
    state?: string;
    postcode?: string;
  };
}

const cache = new Map<string, { ts: number; data: RawOsmLead[] }>();
const CACHE_TTL_MS = 20 * 60 * 1000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function normalizeUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function fromNominatim(r: NominatimResult): RawOsmLead | null {
  const cls = r.class ?? r.category ?? "";
  if (!POI_CLASSES.has(cls)) return null;
  const name = r.name || (r.display_name ? r.display_name.split(",")[0] : "");
  if (!name) return null;

  const ex = r.extratags ?? {};
  const a = r.address ?? {};
  const addressParts = [[a.house_number, a.road].filter(Boolean).join(" "), a.city ?? a.town ?? a.village ?? a.suburb].filter(Boolean);

  return {
    osmId: `${r.osm_type ?? "n"}/${r.osm_id ?? r.place_id}`,
    name,
    category: r.type ? r.type.replace(/_/g, " ") : cls || null,
    phone: ex.phone ?? ex["contact:phone"] ?? null,
    website: normalizeUrl(ex.website ?? ex["contact:website"] ?? null),
    facebookUrl: normalizeUrl(ex["contact:facebook"] ?? null),
    instagramUrl: normalizeUrl(ex["contact:instagram"] ?? null),
    linkedinUrl: normalizeUrl(ex["contact:linkedin"] ?? null),
    address: addressParts.length ? addressParts.join(", ") : null,
    city: a.city ?? a.town ?? a.village ?? a.suburb ?? null,
    state: a.state ?? null,
    zip: a.postcode ?? null,
    latitude: parseFloat(r.lat),
    longitude: parseFloat(r.lon),
  };
}

function fromPhoton(f: PhotonFeature): RawOsmLead | null {
  const p = f.properties ?? {};
  if (!p.name || !p.osm_key || !POI_CLASSES.has(p.osm_key)) return null;
  const coords = f.geometry?.coordinates;
  if (!coords) return null;

  const addressParts = [[p.housenumber, p.street].filter(Boolean).join(" "), p.city ?? p.district].filter(Boolean);

  return {
    osmId: `${p.osm_type ?? "N"}/${p.osm_id ?? p.name}`,
    name: p.name,
    category: p.osm_value ? p.osm_value.replace(/_/g, " ") : null,
    phone: null, // Photon strips contact tags — merged Nominatim records fill these when available
    website: null,
    facebookUrl: null,
    instagramUrl: null,
    linkedinUrl: null,
    address: addressParts.length ? addressParts.join(", ") : null,
    city: p.city ?? p.district ?? null,
    state: p.state ?? null,
    zip: p.postcode ?? null,
    latitude: coords[1],
    longitude: coords[0],
  };
}

async function nominatimSearch(params: Record<string, string>): Promise<NominatimResult[]> {
  const url = new URL(NOMINATIM_URL);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "50");
  url.searchParams.set("extratags", "1");
  url.searchParams.set("addressdetails", "1");

  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" }, signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`Nominatim returned ${res.status}`);
  return (await res.json()) as NominatimResult[];
}

async function photonSearch(q: string, bbox: string): Promise<PhotonFeature[]> {
  const url = new URL(PHOTON_URL);
  url.searchParams.set("q", q);
  url.searchParams.set("bbox", bbox);
  url.searchParams.set("limit", "50");

  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" }, signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Photon returned ${res.status}`);
  const json = (await res.json()) as { features?: PhotonFeature[] };
  return json.features ?? [];
}

/** Nominatim viewbox: lon1,lat1,lon2,lat2 (top-left → bottom-right). */
function nominatimViewbox(lat: number, lon: number, radiusMiles: number): string {
  const dLat = radiusMiles / 69;
  const dLon = radiusMiles / (69 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
  return `${(lon - dLon).toFixed(4)},${(lat + dLat).toFixed(4)},${(lon + dLon).toFixed(4)},${(lat - dLat).toFixed(4)}`;
}

/** Photon bbox: minLon,minLat,maxLon,maxLat. */
function photonBbox(lat: number, lon: number, radiusMiles: number): string {
  const dLat = radiusMiles / 69;
  const dLon = radiusMiles / (69 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
  return `${(lon - dLon).toFixed(4)},${(lat - dLat).toFixed(4)},${(lon + dLon).toFixed(4)},${(lat + dLat).toFixed(4)}`;
}

/**
 * Runs the full free-source sweep for one search: Nominatim category phrase (when
 * the niche has one) + up to 3 bounded name passes, sequential at 1.1s spacing per
 * usage policy, while Photon runs all its bbox passes in parallel. Everything is
 * merged, deduped, and cached.
 */
export async function searchNominatimBusinesses(params: {
  lat: number;
  lon: number;
  radiusMiles: number;
  locationText: string;
  niche: NichePreset | null;
  freeText: string;
  keywords?: string | null;
}): Promise<RawOsmLead[]> {
  const viewbox = nominatimViewbox(params.lat, params.lon, params.radiusMiles);
  const bbox = photonBbox(params.lat, params.lon, params.radiusMiles);

  const keywordTerms = (params.keywords ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  const terms = Array.from(new Set([...nameQueriesFor(params.niche, params.freeText), ...keywordTerms].map((t) => t.toLowerCase()))).filter(Boolean);

  const cacheKey = JSON.stringify([params.lat.toFixed(3), params.lon.toFixed(3), params.radiusMiles, params.niche?.label ?? params.freeText, terms]);
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data;

  const collected = new Map<string, RawOsmLead>();
  function absorb(lead: RawOsmLead | null) {
    if (!lead) return;
    const key = lead.name.toLowerCase();
    const existing = collected.get(key);
    // Prefer the record that actually has contact info (Nominatim over Photon dups).
    if (!existing || (!existing.phone && !existing.website && (lead.phone || lead.website))) {
      collected.set(key, lead);
    }
  }

  let anySucceeded = false;
  let lastError: Error | null = null;

  // Photon passes — parallel, fast, no strict rate limit.
  const photonPromise = Promise.allSettled(
    terms.slice(0, MAX_PHOTON_PASSES).map((t) => photonSearch(t, bbox))
  );

  // Nominatim passes — sequential, 1.1s apart.
  if (params.niche?.phrase) {
    try {
      (await nominatimSearch({ q: `${params.niche.phrase} in ${params.locationText}`, viewbox })).forEach((r) => absorb(fromNominatim(r)));
      anySucceeded = true;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error("Nominatim phrase search failed");
    }
    await sleep(1100);
  }

  for (const term of terms.slice(0, MAX_NOMINATIM_NAME_PASSES)) {
    try {
      (await nominatimSearch({ q: term, viewbox, bounded: "1" })).forEach((r) => absorb(fromNominatim(r)));
      anySucceeded = true;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error("Nominatim name search failed");
    }
    await sleep(1100);
  }

  for (const settled of await photonPromise) {
    if (settled.status === "fulfilled") {
      settled.value.forEach((f) => absorb(fromPhoton(f)));
      anySucceeded = true;
    }
  }

  if (!anySucceeded && lastError) throw lastError;

  const leads = Array.from(collected.values());
  if (cache.size > 60) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(cacheKey, { ts: Date.now(), data: leads });
  return leads;
}
