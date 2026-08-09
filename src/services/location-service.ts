export type LocationInfo = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  city?: string;
  locality?: string;
  road?: string;
  displayName?: string;
  areaResolved?: boolean;
};

type ReverseGeocodeResponse = Omit<LocationInfo, "latitude" | "longitude" | "accuracy">;

/**
 * Resolves a browser position into an approximate, display-safe area. Coordinates
 * are sent only to the server endpoint and are never returned as display text.
 */
export async function reverseGeocodeLocation(
  location: Pick<LocationInfo, "latitude" | "longitude" | "accuracy">,
  signal?: AbortSignal,
): Promise<LocationInfo> {
  const params = new URLSearchParams({
    lat: String(location.latitude),
    lon: String(location.longitude),
  });
  const response = await fetch(`/api/location/reverse?${params}`, { signal });

  if (!response.ok) {
    throw new Error("Unable to determine the current area.");
  }

  const area = (await response.json()) as ReverseGeocodeResponse;
  return {
    ...location,
    ...area,
    areaResolved: Boolean(area.city || area.locality || area.road),
  };
}

export function locationLabel(location?: Pick<LocationInfo, "city" | "locality" | "road"> | null): string {
  if (!location) return "Your area";
  return location.road || location.locality || location.city || "Your area";
}
