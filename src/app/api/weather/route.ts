import { NextResponse } from "next/server";

// Live local weather for the welcome screen. Uses only keyless, free services:
//   1. ipapi.co   — approximate location from the request's IP (no key)
//   2. open-meteo — current temperature + condition code (no key)
// Everything degrades honestly: if either call fails or is blocked, we return
// { available: false } and the UI simply omits weather rather than faking it.
//
// Note: in local dev the IP resolves to the user's own location. In production
// behind a server it resolves to the server's egress location unless a
// geo-forwarding header is present — acceptable for a decorative greeting.

export const revalidate = 900; // cache the (coarse) result for 15 minutes

type Geo = { city: string | null; region: string | null; lat: number; lon: number };

async function fetchGeo(): Promise<Geo | null> {
  try {
    const res = await fetch("https://ipapi.co/json/", {
      headers: { "User-Agent": "AgencyCRM/1.0" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as {
      city?: string;
      region_code?: string;
      region?: string;
      latitude?: number;
      longitude?: number;
    };
    if (typeof j.latitude !== "number" || typeof j.longitude !== "number") return null;
    return {
      city: j.city ?? null,
      region: j.region_code ?? j.region ?? null,
      lat: j.latitude,
      lon: j.longitude,
    };
  } catch {
    return null;
  }
}

async function fetchWeather(lat: number, lon: number) {
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lon));
    url.searchParams.set("current", "temperature_2m,weather_code,is_day");
    url.searchParams.set("temperature_unit", "fahrenheit");
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const j = (await res.json()) as {
      current?: { temperature_2m?: number; weather_code?: number; is_day?: number };
    };
    if (!j.current || typeof j.current.temperature_2m !== "number") return null;
    return {
      tempF: Math.round(j.current.temperature_2m),
      code: j.current.weather_code ?? 0,
      isDay: j.current.is_day !== 0,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const geo = await fetchGeo();
  if (!geo) return NextResponse.json({ available: false });

  const weather = await fetchWeather(geo.lat, geo.lon);
  if (!weather) return NextResponse.json({ available: false });

  return NextResponse.json({
    available: true,
    city: geo.city,
    region: geo.region,
    ...weather,
  });
}
