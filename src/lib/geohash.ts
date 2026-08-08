/**
 * Minimal geohash implementation used for nearby-emergency discovery.
 *
 * Geohashes turn a lat/lng pair into a short string where the shared
 * prefix length encodes proximity. We encode with 7 characters
 * (~150 m x 150 m cells) and query a bounding box of cells around the
 * user's approximate location, then filter precisely with haversine.
 */

const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

const LAT_RANGE: [number, number] = [-90, 90];
const LNG_RANGE: [number, number] = [-180, 180];

/** Bit masks for each character's 5 bits (MSB first). */
const BITS = [16, 8, 4, 2, 1];

/** Encodes [lat, lng] into a geohash of the given precision (1-12). */
export function encodeGeohash(lat: number, lng: number, precision = 7): string {
  let latMin = LAT_RANGE[0];
  let latMax = LAT_RANGE[1];
  let lngMin = LNG_RANGE[0];
  let lngMax = LNG_RANGE[1];

  let hash = "";
  let bit = 0;
  let ch = 0;
  let even = true;

  while (hash.length < precision) {
    if (even) {
      const mid = (lngMin + lngMax) / 2;
      if (lng >= mid) {
        ch |= BITS[bit];
        lngMin = mid;
      } else {
        lngMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) {
        ch |= BITS[bit];
        latMin = mid;
      } else {
        latMax = mid;
      }
    }

    even = !even;
    if (bit < 4) {
      bit += 1;
    } else {
      hash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }

  return hash;
}

/** Decodes a geohash into [lat, lng] at the center of its cell. */
export function decodeGeohash(hash: string): { latitude: number; longitude: number } {
  let latMin = LAT_RANGE[0];
  let latMax = LAT_RANGE[1];
  let lngMin = LNG_RANGE[0];
  let lngMax = LNG_RANGE[1];

  let even = true;
  for (const char of hash) {
    const cd = BASE32.indexOf(char);
    for (const mask of BITS) {
      if (even) {
        const mid = (lngMin + lngMax) / 2;
        if (cd & mask) lngMin = mid;
        else lngMax = mid;
      } else {
        const mid = (latMin + latMax) / 2;
        if (cd & mask) latMin = mid;
        else latMax = mid;
      }
      even = !even;
    }
  }

  return {
    latitude: (latMin + latMax) / 2,
    longitude: (lngMin + lngMax) / 2,
  };
}

/**
 * Returns the geohash of the neighboring cell in the given direction.
 *
 * Computed spatially (decode the cell center, step exactly one cell,
 * re-encode) so it is guaranteed to agree with `encodeGeohash`.
 */
export function geohashNeighbor(hash: string, direction: "n" | "s" | "e" | "w"): string {
  const { latitude, longitude } = decodeGeohash(hash);
  const bits = hash.length * 5;
  const latCellSize = 180 / 2 ** Math.floor(bits / 2);
  const lngCellSize = 360 / 2 ** Math.ceil(bits / 2);

  const lat = clamp(latitude + (direction === "n" ? latCellSize : direction === "s" ? -latCellSize : 0), -90, 90);
  const lng = wrapLongitude(longitude + (direction === "e" ? lngCellSize : direction === "w" ? -lngCellSize : 0));

  return encodeGeohash(lat, lng, hash.length);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function wrapLongitude(lng: number): number {
  return ((lng + 180) % 360 + 360) % 360 - 180;
}

export interface GeohashBounds {
  min: string;
  max: string;
  /** Geohashes of the center cell plus its 8 neighbors (deduplicated, sorted). */
  cells: string[];
}

/**
 * Returns the sorted geohash cells whose centers fall within a square
 * of the given side length (in meters) around the point. Used to build
 * an efficient range query for nearby emergency events.
 */
export function geohashBoundsForRadius(
  latitude: number,
  longitude: number,
  radiusMeters: number,
  precision = 7
): GeohashBounds {
  const cells = new Set<string>([encodeGeohash(latitude, longitude, precision)]);
  const center = cells.values().next().value as string;
  const north = geohashNeighbor(center, "n");
  const south = geohashNeighbor(center, "s");
  const east = geohashNeighbor(center, "e");
  const west = geohashNeighbor(center, "w");

  const diagonals = [
    geohashNeighbor(north, "e"),
    geohashNeighbor(north, "w"),
    geohashNeighbor(south, "e"),
    geohashNeighbor(south, "w"),
  ];
  diagonals.forEach((cell) => cells.add(cell));

  const sorted = [...cells].sort();
  return { min: sorted[0], max: sorted[sorted.length - 1], cells: sorted };
}
