// Google Places API (New) — Text Search. One call returns everything the Lead
// Finder needs, most importantly the AUTHORITATIVE website presence (websiteUri)
// plus real Google ratings and review counts — far more accurate than the
// spotty website tags in OpenStreetMap.
//
// This is the optional "pull Google Business information" source. It only runs
// when the org has pasted a Google Places API key in Settings; with no key the
// Lead Finder transparently falls back to the free OpenStreetMap source. Any
// failure (bad key, quota, network) degrades honestly to an empty result +
// error string rather than faking businesses.
//
// Docs: https://developers.google.com/maps/documentation/places/web-service/text-search

const TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";

// Only request the fields we use — keeps the response small and the billing SKU
// in the cheaper "Text Search (ID Only + Basic + Contact)" tier.
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.websiteUri",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.rating",
  "places.userRatingCount",
  "places.location",
  "places.primaryTypeDisplayName",
  "places.businessStatus",
].join(",");

export interface PlaceBusiness {
  placeId: string;
  name: string;
  category: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  googleRating: number | null;
  googleReviews: number | null;
}

interface PlacesResponse {
  places?: Array<{
    id: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    websiteUri?: string;
    nationalPhoneNumber?: string;
    internationalPhoneNumber?: string;
    rating?: number;
    userRatingCount?: number;
    location?: { latitude?: number; longitude?: number };
    primaryTypeDisplayName?: { text?: string };
    businessStatus?: string;
  }>;
  error?: { message?: string };
}

export type PlacesSearchResult =
  | { ok: true; businesses: PlaceBusiness[] }
  | { ok: false; error: string };

export async function searchPlaces(params: {
  apiKey: string;
  niche: string;
  location: string;
  keywords?: string | null;
  lat: number;
  lon: number;
  radiusMeters: number;
  maxResults?: number;
}): Promise<PlacesSearchResult> {
  const textQuery = [params.niche, params.keywords].filter(Boolean).join(" ") + ` in ${params.location}`;

  try {
    const res = await fetch(TEXT_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": params.apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery,
        maxResultCount: Math.min(20, params.maxResults ?? 20),
        // Bias (not hard-restrict) toward the searched area so we still get results
        // if the radius is tight but the city center is slightly off.
        locationBias: {
          circle: {
            center: { latitude: params.lat, longitude: params.lon },
            radius: Math.min(50000, Math.max(1, params.radiusMeters)),
          },
        },
      }),
      signal: AbortSignal.timeout(12000),
    });

    const json = (await res.json()) as PlacesResponse;

    if (!res.ok) {
      return { ok: false, error: json.error?.message || `Google Places returned ${res.status}` };
    }

    const businesses: PlaceBusiness[] = (json.places ?? [])
      .filter((p) => p.businessStatus !== "CLOSED_PERMANENTLY")
      .map((p) => ({
        placeId: p.id,
        name: p.displayName?.text ?? "Unnamed business",
        category: p.primaryTypeDisplayName?.text ?? null,
        phone: p.nationalPhoneNumber ?? p.internationalPhoneNumber ?? null,
        website: p.websiteUri ?? null,
        address: p.formattedAddress ?? null,
        latitude: p.location?.latitude ?? params.lat,
        longitude: p.location?.longitude ?? params.lon,
        googleRating: typeof p.rating === "number" ? p.rating : null,
        googleReviews: typeof p.userRatingCount === "number" ? p.userRatingCount : null,
      }));

    return { ok: true, businesses };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Google Places request failed" };
  }
}
