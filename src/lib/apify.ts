// Apify Google Maps Scraper — the richest Lead Finder source. Runs the
// `compass/crawler-google-places` actor and returns real Google Maps listings:
// name, phone, website, full address, star rating, and review count in one call.
//
// Each org pastes its own Apify API token in Settings (stored on the Organization
// row, same paste-a-key flow as every other key here). Any failure degrades
// honestly to the rest of the discovery chain.
//
// Note: Google Maps scrapes take time. We call the synchronous
// run-sync-get-dataset-items endpoint and cap the place count so it stays within
// a reasonable request window; on a timeout we surface an honest error the UI
// already handles with a "Try again" button.

const ACTOR = "compass~crawler-google-places";
const ENDPOINT = `https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items`;

export interface ApifyBusiness {
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
  googleRating: number | null;
  googleReviews: number | null;
}

// Subset of the actor's dataset item shape that we consume.
interface ApifyItem {
  title?: string;
  categoryName?: string;
  address?: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  phone?: string;
  phoneUnformatted?: string;
  website?: string;
  totalScore?: number;
  reviewsCount?: number;
  placeId?: string;
  location?: { lat?: number; lng?: number };
  permanentlyClosed?: boolean;
  temporarilyClosed?: boolean;
}

export type ApifySearchResult = { ok: true; businesses: ApifyBusiness[] } | { ok: false; error: string };

function normalizeUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export async function searchApifyGoogleMaps(params: {
  apiKey: string;
  search: string;
  location: string;
  maxResults: number;
}): Promise<ApifySearchResult> {
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.apiKey}`,
      },
      body: JSON.stringify({
        searchStringsArray: [params.search],
        locationQuery: params.location,
        maxCrawledPlacesPerSearch: Math.min(120, Math.max(1, params.maxResults)),
        language: "en",
        skipClosedPlaces: true,
      }),
      // Google Maps scrapes can run long; give the sync run generous headroom.
      signal: AbortSignal.timeout(150000),
    });

    if (!res.ok) {
      const hint = res.status === 401 || res.status === 403 ? " (check the token)" : "";
      return { ok: false, error: `Apify returned ${res.status}${hint}` };
    }

    const items = (await res.json()) as ApifyItem[];
    const businesses: ApifyBusiness[] = (items ?? [])
      .filter((i) => i.title && i.location?.lat != null && i.location?.lng != null && !i.permanentlyClosed)
      .map((i) => ({
        id: i.placeId ?? `${i.title}-${i.location!.lat}-${i.location!.lng}`,
        name: i.title!,
        category: i.categoryName ?? null,
        phone: i.phoneUnformatted ?? i.phone ?? null,
        website: normalizeUrl(i.website),
        address: i.address ?? i.street ?? null,
        city: i.city ?? null,
        state: i.state ?? null,
        zip: i.postalCode ?? null,
        latitude: i.location!.lat!,
        longitude: i.location!.lng!,
        googleRating: typeof i.totalScore === "number" ? i.totalScore : null,
        googleReviews: typeof i.reviewsCount === "number" ? i.reviewsCount : null,
      }));

    return { ok: true, businesses };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Apify request failed";
    if (/timeout|abort/i.test(msg)) {
      return { ok: false, error: "Apify timed out — Google Maps scrapes can take a while. Try again or lower the max results." };
    }
    return { ok: false, error: msg };
  }
}
