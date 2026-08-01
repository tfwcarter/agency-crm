import { NextResponse } from "next/server";
import { getAvailability, getPrimaryOrganization } from "@/lib/public-booking";

// Public — powers the "Book a Call" widget on the marketing site. No auth by
// design (it's a public booking page), so it only ever returns open slots,
// never appointment details.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function GET() {
  const org = await getPrimaryOrganization();
  if (!org) {
    return NextResponse.json({ days: [] }, { headers: CORS_HEADERS });
  }
  const days = await getAvailability(org.id);
  return NextResponse.json({ days }, { headers: CORS_HEADERS });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
