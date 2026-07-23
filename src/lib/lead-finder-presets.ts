// Preset data for the Lead Finder: the biggest US cities with baked-in coordinates
// (so preset searches never depend on a geocoding service), and the local-business
// niches marketing agencies actually sell to — each mapped to the discovery
// strategies verified to work per source:
//   phrase    — a Nominatim category phrase confirmed to return results ("cafes in X")
//   nameQuery — a bounded Nominatim name-search term ("plumbing" inside the city box)
//   tags      — OSM tags for targeted Overpass fallback queries
//   regex     — Overpass name-regex fallback (safe chars only: letters, digits, space, |)

export interface CityPreset {
  city: string;
  state: string;
  lat: number;
  lon: number;
}

export function cityLabel(c: CityPreset): string {
  return `${c.city}, ${c.state}`;
}

export const US_CITIES: CityPreset[] = [
  { city: "New York", state: "NY", lat: 40.7128, lon: -74.006 },
  { city: "Los Angeles", state: "CA", lat: 34.0522, lon: -118.2437 },
  { city: "Chicago", state: "IL", lat: 41.8781, lon: -87.6298 },
  { city: "Houston", state: "TX", lat: 29.7604, lon: -95.3698 },
  { city: "Phoenix", state: "AZ", lat: 33.4484, lon: -112.074 },
  { city: "Philadelphia", state: "PA", lat: 39.9526, lon: -75.1652 },
  { city: "San Antonio", state: "TX", lat: 29.4241, lon: -98.4936 },
  { city: "San Diego", state: "CA", lat: 32.7157, lon: -117.1611 },
  { city: "Dallas", state: "TX", lat: 32.7767, lon: -96.797 },
  { city: "Austin", state: "TX", lat: 30.2672, lon: -97.7431 },
  { city: "Jacksonville", state: "FL", lat: 30.3322, lon: -81.6557 },
  { city: "San Jose", state: "CA", lat: 37.3382, lon: -121.8863 },
  { city: "Fort Worth", state: "TX", lat: 32.7555, lon: -97.3308 },
  { city: "Columbus", state: "OH", lat: 39.9612, lon: -82.9988 },
  { city: "Charlotte", state: "NC", lat: 35.2271, lon: -80.8431 },
  { city: "Indianapolis", state: "IN", lat: 39.7684, lon: -86.1581 },
  { city: "San Francisco", state: "CA", lat: 37.7749, lon: -122.4194 },
  { city: "Seattle", state: "WA", lat: 47.6062, lon: -122.3321 },
  { city: "Denver", state: "CO", lat: 39.7392, lon: -104.9903 },
  { city: "Washington", state: "DC", lat: 38.9072, lon: -77.0369 },
  { city: "Nashville", state: "TN", lat: 36.1627, lon: -86.7816 },
  { city: "Oklahoma City", state: "OK", lat: 35.4676, lon: -97.5164 },
  { city: "El Paso", state: "TX", lat: 31.7619, lon: -106.485 },
  { city: "Boston", state: "MA", lat: 42.3601, lon: -71.0589 },
  { city: "Portland", state: "OR", lat: 45.5152, lon: -122.6784 },
  { city: "Las Vegas", state: "NV", lat: 36.1699, lon: -115.1398 },
  { city: "Detroit", state: "MI", lat: 42.3314, lon: -83.0458 },
  { city: "Memphis", state: "TN", lat: 35.1495, lon: -90.049 },
  { city: "Louisville", state: "KY", lat: 38.2527, lon: -85.7585 },
  { city: "Baltimore", state: "MD", lat: 39.2904, lon: -76.6122 },
  { city: "Milwaukee", state: "WI", lat: 43.0389, lon: -87.9065 },
  { city: "Albuquerque", state: "NM", lat: 35.0844, lon: -106.6504 },
  { city: "Tucson", state: "AZ", lat: 32.2226, lon: -110.9747 },
  { city: "Fresno", state: "CA", lat: 36.7378, lon: -119.7871 },
  { city: "Sacramento", state: "CA", lat: 38.5816, lon: -121.4944 },
  { city: "Kansas City", state: "MO", lat: 39.0997, lon: -94.5786 },
  { city: "Mesa", state: "AZ", lat: 33.4152, lon: -111.8315 },
  { city: "Atlanta", state: "GA", lat: 33.749, lon: -84.388 },
  { city: "Omaha", state: "NE", lat: 41.2565, lon: -95.9345 },
  { city: "Colorado Springs", state: "CO", lat: 38.8339, lon: -104.8214 },
  { city: "Raleigh", state: "NC", lat: 35.7796, lon: -78.6382 },
  { city: "Miami", state: "FL", lat: 25.7617, lon: -80.1918 },
  { city: "Long Beach", state: "CA", lat: 33.7701, lon: -118.1937 },
  { city: "Virginia Beach", state: "VA", lat: 36.8529, lon: -75.978 },
  { city: "Oakland", state: "CA", lat: 37.8044, lon: -122.2712 },
  { city: "Minneapolis", state: "MN", lat: 44.9778, lon: -93.265 },
  { city: "Saint Paul", state: "MN", lat: 44.9537, lon: -93.09 },
  { city: "Tampa", state: "FL", lat: 27.9506, lon: -82.4572 },
  { city: "Tulsa", state: "OK", lat: 36.154, lon: -95.9928 },
  { city: "Arlington", state: "TX", lat: 32.7357, lon: -97.1081 },
  { city: "New Orleans", state: "LA", lat: 29.9511, lon: -90.0715 },
  { city: "Wichita", state: "KS", lat: 37.6872, lon: -97.3301 },
  { city: "Cleveland", state: "OH", lat: 41.4993, lon: -81.6944 },
  { city: "Bakersfield", state: "CA", lat: 35.3733, lon: -119.0187 },
  { city: "Aurora", state: "CO", lat: 39.7294, lon: -104.8319 },
  { city: "Anaheim", state: "CA", lat: 33.8366, lon: -117.9143 },
  { city: "Honolulu", state: "HI", lat: 21.3069, lon: -157.8583 },
  { city: "Riverside", state: "CA", lat: 33.9533, lon: -117.3962 },
  { city: "Pittsburgh", state: "PA", lat: 40.4406, lon: -79.9959 },
  { city: "Cincinnati", state: "OH", lat: 39.1031, lon: -84.512 },
  { city: "St. Louis", state: "MO", lat: 38.627, lon: -90.1994 },
  { city: "Orlando", state: "FL", lat: 28.5383, lon: -81.3792 },
  { city: "Salt Lake City", state: "UT", lat: 40.7608, lon: -111.891 },
];

export function findCityPreset(text: string): CityPreset | null {
  const t = text.trim().toLowerCase();
  if (!t) return null;
  return (
    US_CITIES.find((c) => cityLabel(c).toLowerCase() === t) ??
    US_CITIES.find((c) => c.city.toLowerCase() === t) ??
    null
  );
}

export interface NichePreset {
  label: string;
  /** Nominatim category phrase verified/likely to hit its special-phrase list ("cafes in Denver"). */
  phrase: string | null;
  /** Bounded Nominatim name-search term — matches real business names inside the city box. */
  nameQuery: string;
  /** OSM tags for targeted Overpass fallback queries. */
  tags: { key: string; value: string }[];
  /** Overpass name-regex fallback. Safe chars only. */
  regex: string;
}

export const NICHES: NichePreset[] = [
  // Home services
  { label: "Plumber", phrase: null, nameQuery: "plumbing", tags: [{ key: "craft", value: "plumber" }], regex: "plumb" },
  { label: "Electrician", phrase: null, nameQuery: "electric", tags: [{ key: "craft", value: "electrician" }], regex: "electric" },
  { label: "HVAC", phrase: null, nameQuery: "heating", tags: [{ key: "craft", value: "hvac" }], regex: "hvac|heating|cooling|air condition" },
  { label: "Roofer", phrase: null, nameQuery: "roofing", tags: [{ key: "craft", value: "roofer" }], regex: "roof" },
  { label: "Landscaping", phrase: null, nameQuery: "landscaping", tags: [{ key: "craft", value: "gardener" }], regex: "landscap|lawn|garden" },
  { label: "Painter", phrase: null, nameQuery: "painting", tags: [{ key: "craft", value: "painter" }], regex: "paint" },
  { label: "General Contractor", phrase: null, nameQuery: "construction", tags: [{ key: "craft", value: "carpenter" }], regex: "contractor|construction|remodel" },
  { label: "Cleaning Service", phrase: null, nameQuery: "cleaning", tags: [], regex: "cleaning|maid|janitorial" },
  { label: "Pest Control", phrase: null, nameQuery: "pest", tags: [], regex: "pest control|exterminat" },
  { label: "Locksmith", phrase: null, nameQuery: "locksmith", tags: [{ key: "craft", value: "locksmith" }, { key: "shop", value: "locksmith" }], regex: "locksmith" },
  { label: "Moving Company", phrase: null, nameQuery: "moving", tags: [{ key: "office", value: "moving_company" }], regex: "moving|movers" },
  // Auto
  { label: "Auto Repair", phrase: "car repair", nameQuery: "auto repair", tags: [{ key: "shop", value: "car_repair" }], regex: "auto repair|auto service|automotive|mechanic|transmission" },
  { label: "Car Dealership", phrase: null, nameQuery: "auto sales", tags: [{ key: "shop", value: "car" }], regex: "dealership|motors|auto sales" },
  { label: "Car Wash & Detailing", phrase: "car washes", nameQuery: "car wash", tags: [{ key: "amenity", value: "car_wash" }], regex: "car wash|detailing" },
  { label: "Towing", phrase: null, nameQuery: "towing", tags: [], regex: "towing" },
  // Health
  { label: "Dentist", phrase: "dentists", nameQuery: "dental", tags: [{ key: "amenity", value: "dentist" }], regex: "dental|dentist|orthodont" },
  { label: "Doctor / Clinic", phrase: "doctors", nameQuery: "clinic", tags: [{ key: "amenity", value: "doctors" }, { key: "amenity", value: "clinic" }], regex: "clinic|medical|physician" },
  { label: "Chiropractor", phrase: null, nameQuery: "chiropractic", tags: [], regex: "chiropract" },
  { label: "Veterinarian", phrase: null, nameQuery: "veterinary", tags: [{ key: "amenity", value: "veterinary" }], regex: "veterinar|animal hospital" },
  { label: "Pharmacy", phrase: "pharmacies", nameQuery: "pharmacy", tags: [{ key: "amenity", value: "pharmacy" }], regex: "pharmacy|drugstore" },
  { label: "Optician / Eye Care", phrase: null, nameQuery: "eye care", tags: [{ key: "shop", value: "optician" }], regex: "optical|optometr|eye care|vision" },
  // Beauty & fitness
  { label: "Hair Salon", phrase: "hairdressers", nameQuery: "salon", tags: [{ key: "shop", value: "hairdresser" }], regex: "salon|hair" },
  { label: "Barber Shop", phrase: null, nameQuery: "barber", tags: [{ key: "shop", value: "hairdresser" }], regex: "barber" },
  { label: "Nail Salon", phrase: null, nameQuery: "nails", tags: [{ key: "shop", value: "beauty" }], regex: "nails|nail" },
  { label: "Spa & Massage", phrase: null, nameQuery: "massage", tags: [{ key: "shop", value: "massage" }], regex: "spa|massage" },
  { label: "Tattoo Studio", phrase: null, nameQuery: "tattoo", tags: [{ key: "shop", value: "tattoo" }], regex: "tattoo|piercing" },
  { label: "Gym & Fitness", phrase: null, nameQuery: "fitness", tags: [{ key: "leisure", value: "fitness_centre" }], regex: "gym|fitness|crossfit" },
  { label: "Yoga Studio", phrase: null, nameQuery: "yoga", tags: [], regex: "yoga|pilates" },
  // Food & drink
  { label: "Restaurant", phrase: "restaurants", nameQuery: "restaurant", tags: [{ key: "amenity", value: "restaurant" }], regex: "restaurant|grill|diner" },
  { label: "Coffee Shop", phrase: "cafes", nameQuery: "coffee", tags: [{ key: "amenity", value: "cafe" }], regex: "coffee|espresso|cafe" },
  { label: "Bakery", phrase: "bakeries", nameQuery: "bakery", tags: [{ key: "shop", value: "bakery" }], regex: "bakery|pastry|donut" },
  { label: "Bar & Pub", phrase: "bars", nameQuery: "tavern", tags: [{ key: "amenity", value: "bar" }, { key: "amenity", value: "pub" }], regex: "tavern|brewery|taproom|pub" },
  // Professional services
  { label: "Lawyer", phrase: null, nameQuery: "law", tags: [{ key: "office", value: "lawyer" }], regex: "law firm|law office|attorney|legal" },
  { label: "Accountant", phrase: null, nameQuery: "accounting", tags: [{ key: "office", value: "accountant" }], regex: "accounting|bookkeep|cpa|tax" },
  { label: "Insurance Agency", phrase: null, nameQuery: "insurance", tags: [{ key: "office", value: "insurance" }], regex: "insurance" },
  { label: "Real Estate", phrase: null, nameQuery: "realty", tags: [{ key: "office", value: "estate_agent" }], regex: "realty|real estate|realtor" },
  { label: "Financial Advisor", phrase: null, nameQuery: "financial", tags: [{ key: "office", value: "financial_advisor" }], regex: "financial|wealth|invest" },
  { label: "Photographer", phrase: null, nameQuery: "photography", tags: [{ key: "craft", value: "photographer" }], regex: "photograph|photo" },
  // Other local
  { label: "Florist", phrase: null, nameQuery: "florist", tags: [{ key: "shop", value: "florist" }], regex: "florist|flower" },
  { label: "Pet Grooming", phrase: null, nameQuery: "grooming", tags: [{ key: "shop", value: "pet_grooming" }], regex: "grooming|pet spa" },
  { label: "Daycare & Childcare", phrase: null, nameQuery: "daycare", tags: [{ key: "amenity", value: "childcare" }, { key: "amenity", value: "kindergarten" }], regex: "daycare|childcare|child care|preschool" },
  { label: "Hotel & Lodging", phrase: "hotels", nameQuery: "hotel", tags: [{ key: "tourism", value: "hotel" }, { key: "tourism", value: "motel" }], regex: "hotel|motel|suites" },
  { label: "Storage Facility", phrase: null, nameQuery: "storage", tags: [{ key: "shop", value: "storage_rental" }], regex: "storage" },
];

export function findNichePreset(text: string): NichePreset | null {
  const t = text.trim().toLowerCase();
  if (!t) return null;
  return NICHES.find((n) => n.label.toLowerCase() === t) ?? null;
}

// Additional name-search terms per niche — each extra term is another pass against
// the free sources, multiplying how many real businesses a search surfaces.
const EXTRA_QUERIES: Record<string, string[]> = {
  Plumber: ["plumber", "drain", "sewer"],
  Electrician: ["electrical"],
  HVAC: ["hvac", "furnace", "air conditioning"],
  Roofer: ["roof", "exteriors"],
  Landscaping: ["lawn", "landscape", "tree service"],
  Painter: ["painters"],
  "General Contractor": ["contracting", "builders", "remodeling"],
  "Cleaning Service": ["maid", "carpet cleaning"],
  "Pest Control": ["exterminator"],
  "Moving Company": ["movers"],
  "Auto Repair": ["automotive", "tire", "auto service", "transmission"],
  "Car Dealership": ["motors", "dealership"],
  "Car Wash & Detailing": ["detailing"],
  Dentist: ["dentistry", "orthodontics"],
  "Doctor / Clinic": ["medical", "family medicine"],
  Chiropractor: ["chiropractor"],
  Veterinarian: ["animal hospital", "pet clinic"],
  "Optician / Eye Care": ["vision", "optical"],
  "Hair Salon": ["hair", "styling"],
  "Barber Shop": ["barbershop"],
  "Nail Salon": ["nail"],
  "Spa & Massage": ["spa", "wellness"],
  "Gym & Fitness": ["gym", "athletic", "crossfit"],
  "Yoga Studio": ["pilates"],
  "Coffee Shop": ["roasters", "espresso"],
  "Bar & Pub": ["brewing", "brewery", "bar"],
  Lawyer: ["attorneys", "legal"],
  Accountant: ["tax", "cpa"],
  "Real Estate": ["real estate", "properties", "homes"],
  "Financial Advisor": ["wealth", "investments"],
  Photographer: ["photo"],
  Florist: ["flowers"],
  "Pet Grooming": ["pet", "dog grooming"],
  "Daycare & Childcare": ["childcare", "learning center", "preschool"],
  "Hotel & Lodging": ["inn", "suites"],
};

/** All name-search terms for a niche (or the raw text for custom niches). */
export function nameQueriesFor(niche: NichePreset | null, freeText: string): string[] {
  if (!niche) return [freeText.trim()].filter(Boolean);
  return [niche.nameQuery, ...(EXTRA_QUERIES[niche.label] ?? [])];
}

/** Sanitizes free text into a safe Overpass/name regex: letters, digits, spaces, | only. */
export function sanitizeRegex(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s|&'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
