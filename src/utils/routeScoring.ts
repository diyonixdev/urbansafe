import { deriveDangerZones, type DangerZone } from "@/services/dangerZones";

export interface RouteMetrics {
  id: number;
  travelTime: number; // minutes
  distance: number; // km
  crimeRisk: string; // 'Data unavailable'
  accidentRisk: string; // 'Data unavailable'
  lightingCoverage: number; // percentage (0-100)
  policeStationsNearby: number;
  hospitalsNearby: number;
  safetyScore: number;
  recommended: boolean;
  geometry: [number, number][];
  /** Heuristic safety-risk zones near this route (OSM lighting data),
   * used by journey monitoring. Never confirmed incident locations. */
  dangerZones: DangerZone[];
}

const OVERPASS_API = "https://overpass-api.de/api/interpreter";

// Helper to calculate bounding box for a route with a small buffer
function getBoundingBox(coords: [number, number][], bufferDegree = 0.02) {
  let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
  for (const [lat, lon] of coords) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
  }
  return {
    s: minLat - bufferDegree,
    n: maxLat + bufferDegree,
    w: minLon - bufferDegree,
    e: maxLon + bufferDegree
  };
}

export async function analyzeRoute(
  id: number,
  geometry: [number, number][], 
  durationSec: number, 
  distanceMeters: number
): Promise<RouteMetrics> {
  const travelTime = Math.round(durationSec / 60);
  const distance = Number((distanceMeters / 1000).toFixed(2));
  
  const bbox = getBoundingBox(geometry);
  
  // Build Overpass query to find police, hospitals, lit roads, AND
  // unlit highway segments (geometry) in the bounding box. The unlit
  // segments feed the heuristic danger-zone model — no extra network
  // call is made for them.
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="police"](${bbox.s},${bbox.w},${bbox.n},${bbox.e});
      way["amenity"="police"](${bbox.s},${bbox.w},${bbox.n},${bbox.e});
      
      node["amenity"="hospital"](${bbox.s},${bbox.w},${bbox.n},${bbox.e});
      way["amenity"="hospital"](${bbox.s},${bbox.w},${bbox.n},${bbox.e});
      
      way["lit"="yes"](${bbox.s},${bbox.w},${bbox.n},${bbox.e});
    );
    out center;
    way[highway]["lit"!="yes"](${bbox.s},${bbox.w},${bbox.n},${bbox.e});
    out geom;
  `;

  let policeCount = 0;
  let hospitalCount = 0;
  let litRoadsCount = 0;
  const unlitWayNodes: { lat: number; lon: number }[] = [];

  try {
    const res = await fetch(OVERPASS_API, {
      method: "POST",
      body: "data=" + encodeURIComponent(query),
    });
    
    if (res.ok) {
      const data = await res.json();
      for (const el of data.elements) {
        if (el.tags?.amenity === 'police') policeCount++;
        else if (el.tags?.amenity === 'hospital') hospitalCount++;
        else if (el.tags?.lit === 'yes') litRoadsCount++;
        // `out geom` ways carry a geometry array; these are the unlit
        // highway segments used for heuristic danger-zone derivation.
        if (el.type === 'way' && Array.isArray(el.geometry)) {
          for (const point of el.geometry) {
            unlitWayNodes.push({ lat: point.lat, lon: point.lon });
            if (unlitWayNodes.length >= 3000) break;
          }
        }
        if (unlitWayNodes.length >= 3000) break;
      }
    }
  } catch (err) {
    console.error("Failed to fetch from Overpass:", err);
  }

  // Very basic heuristic for lighting coverage based on lit ways found vs distance
  // This is highly approximate since we can't easily intersect the exact geometries on the client
  let lightingCoverage = Math.min(100, Math.round((litRoadsCount / Math.max(1, distance)) * 10));
  if (litRoadsCount === 0) lightingCoverage = 20; // fallback if OSM doesn't have lighting data in the area

  // Base score 50. 
  // Add up to 20 points for police
  // Add up to 10 points for hospitals
  // Add up to 20 points for lighting
  let score = 50;
  score += Math.min(20, policeCount * 5);
  score += Math.min(10, hospitalCount * 3);
  score += Math.min(20, (lightingCoverage / 100) * 20);

  return {
    id,
    travelTime,
    distance,
    crimeRisk: "Data unavailable",
    accidentRisk: "Data unavailable",
    lightingCoverage,
    policeStationsNearby: policeCount,
    hospitalsNearby: hospitalCount,
    safetyScore: Math.round(score),
    recommended: false, // Will be set later
    geometry,
    dangerZones: deriveDangerZones(geometry, unlitWayNodes),
  };
}
