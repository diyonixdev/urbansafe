import { NextRequest, NextResponse } from "next/server";
import { getLocationSafetyInsights, type LocationSafetyInput } from "@/services/location-safety";

export async function POST(request: NextRequest) {
  let body: Partial<LocationSafetyInput>;
  try {
    body = (await request.json()) as Partial<LocationSafetyInput>;
  } catch {
    return NextResponse.json({ error: "A valid JSON body is required." }, { status: 400 });
  }

  const { latitude, longitude, city, locality } = body;

  if (typeof latitude !== "number" || typeof longitude !== "number" || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json({ error: "A valid latitude and longitude are required." }, { status: 400 });
  }
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return NextResponse.json({ error: "A valid location is required." }, { status: 400 });
  }
  if (city !== undefined && typeof city !== "string") {
    return NextResponse.json({ error: "city must be a string." }, { status: 400 });
  }
  if (locality !== undefined && typeof locality !== "string") {
    return NextResponse.json({ error: "locality must be a string." }, { status: 400 });
  }

  const insights = getLocationSafetyInsights({ latitude, longitude, city, locality });
  return NextResponse.json(insights);
}
