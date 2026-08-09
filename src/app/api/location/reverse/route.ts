import { NextResponse } from "next/server";

const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";

type NominatimResponse = {
  display_name?: string;
  address?: Record<string, string | undefined>;
};

function firstAddressValue(address: Record<string, string | undefined>, keys: string[]): string | undefined {
  return keys.map((key) => address[key]).find((value): value is string => Boolean(value));
}

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const latitude = Number(requestUrl.searchParams.get("lat"));
    const longitude = Number(requestUrl.searchParams.get("lon"));

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      return NextResponse.json({});
    }

    const url = new URL(NOMINATIM_REVERSE_URL);
    url.search = new URLSearchParams({
      format: "jsonv2",
      lat: String(latitude),
      lon: String(longitude),
      zoom: "18",
      addressdetails: "1",
    }).toString();

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "UrbanSafe/1.0 (location safety suggestions)",
      },
      cache: "no-store",
    });

    if (!response.ok) throw new Error(`Reverse geocoding failed: ${response.status}`);

    const data = (await response.json()) as NominatimResponse;
    const address = data.address ?? {};
    const city = firstAddressValue(address, ["city", "town", "village", "municipality", "county"]);
    const locality = firstAddressValue(address, ["neighbourhood", "suburb", "quarter", "city_district", "district"]);
    const road = firstAddressValue(address, ["road", "pedestrian", "footway", "path", "residential"]);

    return NextResponse.json({ city, locality, road, displayName: data.display_name });
  } catch (error) {
    console.warn("[location/reverse] Reverse geocoding unavailable", error instanceof Error ? error.message : "unknown error");
    // The location name is optional. Returning a successful empty response
    // prevents a provider outage from becoming a client-side console error.
    return NextResponse.json({});
  }
}
