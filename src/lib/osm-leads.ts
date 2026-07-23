// FALLBACK business-discovery source: OpenStreetMap via public Overpass instances.
// Live testing showed these mirrors are frequently overloaded (504s) or down, so
// this layer is only consulted when Nominatim (the primary, see nominatim-leads.ts)
// fails or returns nothing. Three reliability measures:
//   1. Mirror pool — tries several public instances in order instead of one.
//   2. Targeted queries — tag + name-regex clauses scoped to the niche instead of
//      "every named POI in the metro", which is what caused the old timeouts.
//   3. 20-minute result cache keyed by location+niche.

import type { NichePreset } from "@/lib/lead-finder-presets";
import { sanitizeRegex } from "@/lib/lead-finder-presets";

const USER_AGENT = "AgencyCRM-LeadFinder/0.2 (contact: dev@agency.local)";

const MIRRORS = [
  { name: "kumi.systems", url: "https://overpass.kumi.systems/api/interpreter" },
  { name: "overpass-api.de", url: "https://overpass-api.de/api/interpreter" },
  { name: "lz4.overpass-api.de", url: "https://lz4.overpass-api.de/api/interpreter" },
  { name: "private.coffee", url: "https://overpass.private.coffee/api/interpreter" },
];

// POI keys a real business will carry — regex clauses are scoped to these so a
// name match on a street or neighborhood doesn't leak in.
const POI_KEYS = ["shop", "amenity", "office", "craft", "healthcare", "leisure", "tourism"] as const;

export interface RawOsmLead {
  osmId: string;
  name: string;
  category: string | null;
  phone: string | null;
  website: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  linkedinUrl: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  latitude: number;
  longitude: number;
}

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

const cache = new Map<string, { ts: number; data: RawOsmLead[] }>();
const CACHE_TTL_MS = 20 * 60 * 1000;

function buildQuery(lat: number, lon: number, radiusMeters: number, niche: NichePreset | null, freeText: string, keywords?: string | null): string {
  const around = `around:${Math.round(radiusMeters)},${lat.toFixed(5)},${lon.toFixed(5)}`;
  const clauses: string[] = [];

  // Tag clauses — precise category matches (e.g. shop=car_repair).
  for (const tag of niche?.tags ?? []) {
    clauses.push(`nwr(${around})["name"]["${tag.key}"="${tag.value}"];`);
  }

  // Name-regex clauses — catch businesses named "X Plumbing" that carry any POI key.
  const regexParts = [niche?.regex ?? sanitizeRegex(freeText)];
  for (const kw of (keywords ?? "").split(",")) {
    const clean = sanitizeRegex(kw);
    if (clean) regexParts.push(clean);
  }
  const regex = regexParts.filter(Boolean).join("|");
  if (regex) {
    for (const key of POI_KEYS) {
      clauses.push(`nwr(${around})["name"~"${regex}",i]["${key}"];`);
    }
  }

  return `[out:json][timeout:20];\n(\n  ${clauses.join("\n  ")}\n);\nout center 250;`;
}

function normalizeUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/**
 * Runs a targeted business query against the Overpass mirror pool, first success
 * wins. Throws (with the list of mirrors tried) only if every mirror fails.
 */
export async function searchOverpassBusinesses(params: {
  lat: number;
  lon: number;
  radiusMeters: number;
  niche: NichePreset | null;
  freeText: string;
  keywords?: string | null;
}): Promise<RawOsmLead[]> {
  const query = buildQuery(params.lat, params.lon, params.radiusMeters, params.niche, params.freeText, params.keywords);

  const cached = cache.get(query);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data;

  const failures: string[] = [];

  for (const mirror of MIRRORS) {
    try {
      const res = await fetch(mirror.url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": USER_AGENT },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(22000),
      });
      if (!res.ok) {
        failures.push(`${mirror.name} (${res.status})`);
        continue;
      }

      const json = (await res.json()) as { elements: OverpassElement[] };
      const leads = parseElements(json.elements ?? []);

      if (cache.size > 40) {
        const oldest = cache.keys().next().value;
        if (oldest) cache.delete(oldest);
      }
      cache.set(query, { ts: Date.now(), data: leads });
      return leads;
    } catch {
      failures.push(`${mirror.name} (timeout)`);
    }
  }

  throw new Error(`All Overpass mirrors failed: ${failures.join(", ")}`);
}

function parseElements(elements: OverpassElement[]): RawOsmLead[] {
  const byName = new Map<string, RawOsmLead>();

  for (const el of elements) {
    const tags = el.tags;
    if (!tags?.name) continue;

    const latitude = el.lat ?? el.center?.lat;
    const longitude = el.lon ?? el.center?.lon;
    if (latitude === undefined || longitude === undefined) continue;

    const category = POI_KEYS.map((key) => tags[key]).find(Boolean) ?? null;
    const addressParts = [tags["addr:housenumber"], tags["addr:street"], tags["addr:city"]].filter(Boolean);

    const lead: RawOsmLead = {
      osmId: `${el.type}/${el.id}`,
      name: tags.name,
      category,
      phone: tags.phone ?? tags["contact:phone"] ?? null,
      website: normalizeUrl(tags.website ?? tags["contact:website"] ?? null),
      facebookUrl: normalizeUrl(tags["contact:facebook"] ?? null),
      instagramUrl: normalizeUrl(tags["contact:instagram"] ?? null),
      linkedinUrl: normalizeUrl(tags["contact:linkedin"] ?? null),
      address: addressParts.length ? addressParts.join(" ") : null,
      city: tags["addr:city"] ?? null,
      state: tags["addr:state"] ?? null,
      zip: tags["addr:postcode"] ?? null,
      latitude,
      longitude,
    };

    // Nodes and ways can duplicate the same POI — first occurrence wins.
    const key = lead.name.toLowerCase();
    if (!byName.has(key)) byName.set(key, lead);
  }

  return Array.from(byName.values());
}
