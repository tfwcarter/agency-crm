import { geocodeLocation } from "@/lib/geocode";
import { searchNominatimBusinesses } from "@/lib/nominatim-leads";
import { searchOverpassBusinesses, type RawOsmLead } from "@/lib/osm-leads";
import { searchPlaces } from "@/lib/places";
import { searchTomTom } from "@/lib/tomtom";
import { findCityPreset, findNichePreset, cityLabel } from "@/lib/lead-finder-presets";

// One normalized business shape regardless of source, so the Lead Finder UI and
// qualification pipeline don't care where a candidate came from.
//
// Source chain (each verified live, in order of data quality):
//   1. Google Places  — authoritative website/ratings/reviews (needs a pasted key)
//   2. Nominatim      — keyless OSM, reliable infra, phones/websites via extratags
//   3. Overpass pool  — keyless OSM mirrors, targeted queries (fallback only)
export interface DiscoveredBusiness {
  key: string;
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
  facebookUrl: string | null;
  instagramUrl: string | null;
  linkedinUrl: string | null;
  googleRating: number | null;
  googleReviews: number | null;
  source: "google_places" | "openstreetmap";
}

export type DiscoveryResult = {
  businesses: DiscoveredBusiness[];
  source: "google_places" | "openstreetmap";
  resolvedLocation: string | null;
  warning: string | null;
  error: string | null;
};

function parseUsAddress(formatted: string | null): { city: string | null; state: string | null; zip: string | null } {
  if (!formatted) return { city: null, state: null, zip: null };
  const m = formatted.match(/,\s*([^,]+),\s*([A-Z]{2})\s*(\d{5})?/);
  if (!m) return { city: null, state: null, zip: null };
  return { city: m[1]?.trim() ?? null, state: m[2] ?? null, zip: m[3] ?? null };
}

function fromOsm(leads: RawOsmLead[]): DiscoveredBusiness[] {
  return leads.map((b) => ({
    key: b.osmId,
    name: b.name,
    category: b.category,
    phone: b.phone,
    website: b.website,
    address: b.address,
    city: b.city,
    state: b.state,
    zip: b.zip,
    latitude: b.latitude,
    longitude: b.longitude,
    facebookUrl: b.facebookUrl,
    instagramUrl: b.instagramUrl,
    linkedinUrl: b.linkedinUrl,
    googleRating: null,
    googleReviews: null,
    source: "openstreetmap" as const,
  }));
}

function finalize(businesses: DiscoveredBusiness[], phoneOnly: boolean, limit: number): DiscoveredBusiness[] {
  const filtered = phoneOnly ? businesses.filter((b) => b.phone) : businesses;
  return filtered.slice(0, limit);
}

export async function discoverBusinesses(params: {
  location: string;
  niche: string;
  keywords?: string | null;
  radiusMiles: number;
  placesApiKey: string | null;
  tomtomApiKey?: string | null;
  limit?: number;
  phoneOnly?: boolean;
}): Promise<DiscoveryResult> {
  const limit = params.limit ?? 40;
  const phoneOnly = params.phoneOnly ?? false;
  const nichePreset = findNichePreset(params.niche);

  // Preset cities skip geocoding entirely — one less network dependency.
  const cityPreset = findCityPreset(params.location);
  let lat: number, lon: number, resolvedLocation: string;
  if (cityPreset) {
    lat = cityPreset.lat;
    lon = cityPreset.lon;
    resolvedLocation = cityLabel(cityPreset);
  } else {
    const geo = await geocodeLocation(params.location);
    if (!geo) {
      return {
        businesses: [],
        source: "openstreetmap",
        resolvedLocation: null,
        warning: null,
        error: `Couldn't find "${params.location}" — try a city from the list, or a more specific "City, ST" or ZIP code.`,
      };
    }
    lat = geo.lat;
    lon = geo.lon;
    resolvedLocation = geo.displayName;
  }

  const radiusMeters = params.radiusMiles * 1609.34;

  // --- 1. Google Places (authoritative, needs key) ---
  if (params.placesApiKey) {
    const res = await searchPlaces({
      apiKey: params.placesApiKey,
      niche: params.niche,
      location: params.location,
      keywords: params.keywords,
      lat,
      lon,
      radiusMeters,
      maxResults: 20,
    });

    if (res.ok) {
      const businesses: DiscoveredBusiness[] = res.businesses.map((b) => {
        const parsed = parseUsAddress(b.address);
        return {
          key: b.placeId,
          name: b.name,
          category: b.category,
          phone: b.phone,
          website: b.website,
          address: b.address,
          city: parsed.city,
          state: parsed.state,
          zip: parsed.zip,
          latitude: b.latitude,
          longitude: b.longitude,
          facebookUrl: null,
          instagramUrl: null,
          linkedinUrl: null,
          googleRating: b.googleRating,
          googleReviews: b.googleReviews,
          source: "google_places",
        };
      });
      return {
        businesses: finalize(businesses, phoneOnly, limit),
        source: "google_places",
        resolvedLocation,
        warning: null,
        error: null,
      };
    }
    // Key present but the call failed — continue down the free chain, but say why.
    const free = await discoverViaFreeSources({ ...params, lat, lon, resolvedLocation, radiusMeters, nichePreset, phoneOnly, limit });
    return { ...free, warning: `Google Places couldn't be reached (${res.error}); showing free OpenStreetMap results instead.` };
  }

  // --- 2. TomTom (real commercial POI data, free 2,500/day key) ---
  if (params.tomtomApiKey) {
    const query = [params.niche, params.keywords?.split(",")[0]].filter(Boolean).join(" ");
    const res = await searchTomTom({
      apiKey: params.tomtomApiKey,
      query,
      lat,
      lon,
      radiusMeters,
      limit: Math.max(limit, 60),
    });
    if (res.ok && res.businesses.length > 0) {
      const businesses: DiscoveredBusiness[] = res.businesses.map((b) => ({
        key: b.id,
        name: b.name,
        category: b.category,
        phone: b.phone,
        website: b.website,
        address: b.address,
        city: b.city,
        state: b.state,
        zip: b.zip,
        latitude: b.latitude,
        longitude: b.longitude,
        facebookUrl: null,
        instagramUrl: null,
        linkedinUrl: null,
        googleRating: null,
        googleReviews: null,
        source: "openstreetmap", // rendered as the generic non-Google badge
      }));
      return { businesses: finalize(businesses, phoneOnly, limit), source: "openstreetmap", resolvedLocation, warning: null, error: null };
    }
    const free = await discoverViaFreeSources({ ...params, lat, lon, resolvedLocation, radiusMeters, nichePreset, phoneOnly, limit });
    if (!res.ok) return { ...free, warning: `TomTom couldn't be reached (${res.error}); showing free OpenStreetMap results instead.` };
    return free;
  }

  // --- 3 & 4. Free chain: Nominatim + Photon, then Overpass mirrors ---
  return discoverViaFreeSources({ ...params, lat, lon, resolvedLocation, radiusMeters, nichePreset, phoneOnly, limit });
}

async function discoverViaFreeSources(params: {
  location: string;
  niche: string;
  keywords?: string | null;
  radiusMiles: number;
  lat: number;
  lon: number;
  resolvedLocation: string;
  radiusMeters: number;
  nichePreset: ReturnType<typeof findNichePreset>;
  phoneOnly: boolean;
  limit: number;
}): Promise<DiscoveryResult> {
  // Primary free source: Nominatim (fast, reliable, same OSM data).
  try {
    const leads = await searchNominatimBusinesses({
      lat: params.lat,
      lon: params.lon,
      radiusMiles: params.radiusMiles,
      locationText: params.resolvedLocation.split(",").slice(0, 2).join(",") || params.location,
      niche: params.nichePreset,
      freeText: params.niche,
      keywords: params.keywords,
    });
    if (leads.length > 0) {
      return {
        businesses: finalize(fromOsm(leads), params.phoneOnly, params.limit),
        source: "openstreetmap",
        resolvedLocation: params.resolvedLocation,
        warning: null,
        error: null,
      };
    }
  } catch {
    /* fall through to Overpass */
  }

  // Fallback: Overpass mirror pool with a targeted query.
  try {
    const leads = await searchOverpassBusinesses({
      lat: params.lat,
      lon: params.lon,
      radiusMeters: params.radiusMeters,
      niche: params.nichePreset,
      freeText: params.niche,
      keywords: params.keywords,
    });
    return {
      businesses: finalize(fromOsm(leads), params.phoneOnly, params.limit),
      source: "openstreetmap",
      resolvedLocation: params.resolvedLocation,
      warning: null,
      error: null,
    };
  } catch {
    return {
      businesses: [],
      source: "openstreetmap",
      resolvedLocation: params.resolvedLocation,
      warning: null,
      error:
        "Both free data sources came up empty just now (Nominatim found nothing and the Overpass mirrors are unavailable). Hit Try Again, broaden the radius, or connect a Google Places key in Settings for guaranteed results.",
    };
  }
}
