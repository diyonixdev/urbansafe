export interface RouteMetrics {
  id: number;
  travelTime: number; // minutes
  distance: number; // km
  crimeRisk: string; // 'Data unavailable'
  accidentRisk: string; // 'Data unavailable'
  lightingCoverage: number | null; // percentage (0-100)
  policeStationsNearby: number | null;
  hospitalsNearby: number | null;
  nearestPoliceKm: number | null;
  nearestHospitalKm: number | null;
  safetyScore: number | null;
  scoreBreakdown: {
    factorsAvailable: number;
    totalFactors: number;
    weights: {
      crime: number;
      accident: number;
      lighting: number;
      police: number;
      hospitals: number;
      base: number;
    };
    points: {
      crime: number;
      accident: number;
      lighting: number;
      police: number;
      hospitals: number;
      base: number;
    };
  };
  recommended: boolean;
  geometry: [number, number][];
  facilities: { lat: number; lon: number; type: 'police' | 'hospital' }[];
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

// Haversine distance
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
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
  
  // Build Overpass query to find police, hospitals, and lit roads in the bounding box
  const query = `
    [out:json][timeout:15];
    (
      node["amenity"="police"](${bbox.s},${bbox.w},${bbox.n},${bbox.e});
      way["amenity"="police"](${bbox.s},${bbox.w},${bbox.n},${bbox.e});
      
      node["amenity"="hospital"](${bbox.s},${bbox.w},${bbox.n},${bbox.e});
      way["amenity"="hospital"](${bbox.s},${bbox.w},${bbox.n},${bbox.e});
      
      way["lit"="yes"](${bbox.s},${bbox.w},${bbox.n},${bbox.e});
    );
    out center;
  `;

  let policeCount = 0;
  let hospitalCount = 0;
  let litRoadsCount = 0;
  
  let nearestPoliceKm: number | null = null;
  let nearestHospitalKm: number | null = null;

  const facilities: { lat: number; lon: number; type: 'police' | 'hospital' }[] = [];
  const routeCenterLat = (bbox.s + bbox.n) / 2;
  const routeCenterLon = (bbox.w + bbox.e) / 2;

  let apiSuccess = false;

  try {
    const res = await fetch(OVERPASS_API, {
      method: "POST",
      body: "data=" + encodeURIComponent(query),
    });
    
    if (res.ok) {
      apiSuccess = true;
      const data = await res.json();
      for (const el of data.elements) {
        const lat = el.lat || el.center?.lat;
        const lon = el.lon || el.center?.lon;
        
        if (el.tags?.amenity === 'police') {
          policeCount++;
          if (lat && lon) {
            facilities.push({ lat, lon, type: 'police' });
            const dist = getDistanceFromLatLonInKm(routeCenterLat, routeCenterLon, lat, lon);
            if (nearestPoliceKm === null || dist < nearestPoliceKm) {
              nearestPoliceKm = Number(dist.toFixed(1));
            }
          }
        } else if (el.tags?.amenity === 'hospital') {
          hospitalCount++;
          if (lat && lon) {
            facilities.push({ lat, lon, type: 'hospital' });
            const dist = getDistanceFromLatLonInKm(routeCenterLat, routeCenterLon, lat, lon);
            if (nearestHospitalKm === null || dist < nearestHospitalKm) {
              nearestHospitalKm = Number(dist.toFixed(1));
            }
          }
        } else if (el.tags?.lit === 'yes') {
          litRoadsCount++;
        }
      }
    }
  } catch (err) {
    console.error("Failed to fetch from Overpass:", err);
  }

  // If API failed, we can't score anything confidently.
  if (!apiSuccess) {
    return {
      id, travelTime, distance, geometry, facilities,
      crimeRisk: "Data unavailable",
      accidentRisk: "Data unavailable",
      lightingCoverage: null,
      policeStationsNearby: null,
      hospitalsNearby: null,
      nearestPoliceKm: null,
      nearestHospitalKm: null,
      safetyScore: null,
      scoreBreakdown: {
        factorsAvailable: 0, totalFactors: 5,
        weights: { crime: 0, accident: 0, lighting: 0, police: 0, hospitals: 0, base: 0 },
        points: { crime: 0, accident: 0, lighting: 0, police: 0, hospitals: 0, base: 0 }
      },
      recommended: false
    };
  }

  // Very basic heuristic for lighting coverage based on lit ways found vs distance
  let lightingCoverage = Math.min(100, Math.round((litRoadsCount / Math.max(1, distance)) * 10));
  if (litRoadsCount === 0) lightingCoverage = 20; // fallback if OSM doesn't have lighting data in the area

  // We have 5 total possible factors: Crime, Accident, Lighting, Police, Hospital
  // Since Crime and Accident data are unavailable from live open APIs for arbitrary segments:
  const factorsAvailable = 3;
  const totalFactors = 5;

  // We allocate available points only to the available factors.
  // Base points: 40%
  // Available factor points: 60%
  // Lighting weight: 30%
  // Police weight: 20%
  // Hospital weight: 10%
  const basePoints = 40;
  
  const lightingPoints = Math.min(30, (lightingCoverage / 100) * 30);
  const policePoints = Math.min(20, policeCount * 5); // 5 points per station up to 20
  const hospitalPoints = Math.min(10, hospitalCount * 3); // 3 points per hospital up to 10

  const totalScore = Math.round(basePoints + lightingPoints + policePoints + hospitalPoints);

  return {
    id,
    travelTime,
    distance,
    crimeRisk: "Data unavailable",
    accidentRisk: "Data unavailable",
    lightingCoverage,
    policeStationsNearby: policeCount,
    hospitalsNearby: hospitalCount,
    nearestPoliceKm: nearestPoliceKm !== null ? Math.max(0.1, nearestPoliceKm) : null,
    nearestHospitalKm: nearestHospitalKm !== null ? Math.max(0.1, nearestHospitalKm) : null,
    safetyScore: totalScore,
    scoreBreakdown: {
      factorsAvailable,
      totalFactors,
      weights: { crime: 0, accident: 0, lighting: 30, police: 20, hospitals: 10, base: 40 },
      points: { 
        crime: 0, 
        accident: 0, 
        lighting: Math.round(lightingPoints), 
        police: Math.round(policePoints), 
        hospitals: Math.round(hospitalPoints), 
        base: basePoints 
      }
    },
    recommended: false, // Will be set later
    geometry,
    facilities
  };
}
