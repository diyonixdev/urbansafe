/**
 * Heuristic danger-zone model for the Journey Monitoring feature.
 *
 * IMPORTANT: UrbanSafe currently has no live crime/accident dataset.
 * Danger zones here are derived from OpenStreetMap data that route
 * analysis already fetches (street-lighting coverage). They are
 * EXPLICITLY heuristic safety-risk indicators — never confirmed crime
 * or accident locations. UI copy must say "safety-risk area", not
 * "crime happened here".
 */

import { haversineMeters } from "@/lib/geo";
import {
  JOURNEY_MAX_ZONES,
  JOURNEY_ZONE_CORRIDOR_METERS,
  JOURNEY_ZONE_MIN_SPACING_METERS,
  JOURNEY_ZONE_RADIUS_METERS,
} from "./journey-config";

export type DangerZoneRiskLevel = "low" | "medium" | "high";

export interface DangerZone {
  id: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  riskLevel: DangerZoneRiskLevel;
  /** Where the zone came from (e.g. "OpenStreetMap street-lighting data"). */
  source: string;
  /** Always true today — there is no confirmed incident dataset yet. */
  isHeuristic: boolean;
  /** Human-readable explanation shown in the map popup. */
  reason: string;
}

export interface GeoPoint {
  lat: number;
  lon: number;
}

/** Nearest danger zone whose influence (radius + approach margin)
 * contains the given position, or null. */
export function nearestZone(
  zones: DangerZone[],
  latitude: number,
  longitude: number,
  marginMeters: number
): DangerZone | null {
  let best: DangerZone | null = null;
  let bestDistance = Infinity;
  for (const zone of zones) {
    const distance = haversineMeters(latitude, longitude, zone.latitude, zone.longitude);
    if (distance <= zone.radiusMeters + marginMeters && distance < bestDistance) {
      best = zone;
      bestDistance = distance;
    }
  }
  return best;
}

/** Coarse sampling of a route polyline so corridor checks stay cheap. */
function sampleRoute(geometry: [number, number][], maxPoints = 400): GeoPoint[] {
  if (geometry.length === 0) return [];
  if (geometry.length <= maxPoints) {
    return geometry.map(([lat, lon]) => ({ lat, lon }));
  }
  const stride = Math.ceil(geometry.length / maxPoints);
  const sampled: GeoPoint[] = [];
  for (let i = 0; i < geometry.length; i += stride) {
    const [lat, lon] = geometry[i];
    sampled.push({ lat, lon });
  }
  return sampled;
}

/**
 * Builds heuristic danger zones from unlit (or lighting-unverified)
 * street segments returned by the Overpass query in routeScoring.
 *
 * Only segments within `corridorMeters` of the route are kept, then the
 * remaining points are greedily clustered (nearest-to-route first) into
 * a small number of distinct zones so the map stays readable.
 */
export function deriveDangerZones(
  geometry: [number, number][],
  unlitWayNodes: GeoPoint[]
): DangerZone[] {
  const sampled = sampleRoute(geometry);
  if (sampled.length === 0 || unlitWayNodes.length === 0) return [];

  const candidates = unlitWayNodes
    .map((node) => {
      let best = Infinity;
      for (const point of sampled) {
        const distance = haversineMeters(node.lat, node.lon, point.lat, point.lon);
        if (distance < best) {
          best = distance;
          if (best === 0) break;
        }
      }
      return { node, distance: best };
    })
    .filter((candidate) => candidate.distance <= JOURNEY_ZONE_CORRIDOR_METERS)
    .sort((a, b) => a.distance - b.distance);

  const clusters: { point: GeoPoint; members: number }[] = [];
  for (const { node } of candidates) {
    let absorbed = false;
    for (const cluster of clusters) {
      if (
        haversineMeters(node.lat, node.lon, cluster.point.lat, cluster.point.lon) <=
        JOURNEY_ZONE_MIN_SPACING_METERS
      ) {
        cluster.members += 1;
        absorbed = true;
        break;
      }
    }
    if (absorbed) continue;
    if (clusters.length >= JOURNEY_MAX_ZONES) break;
    clusters.push({ point: node, members: 1 });
  }

  return clusters.map((cluster, index) => {
    const riskLevel: DangerZoneRiskLevel =
      cluster.members > 14 ? "high" : cluster.members > 6 ? "medium" : "low";
    return {
      id: `hz-${index}`,
      latitude: cluster.point.lat,
      longitude: cluster.point.lon,
      radiusMeters: JOURNEY_ZONE_RADIUS_METERS,
      riskLevel,
      source: "OpenStreetMap street-lighting data",
      isHeuristic: true,
      reason:
        `Unlit or unverified-lighting street segment${cluster.members === 1 ? "" : "s"} near your route (${cluster.members} nearby). Heuristic risk estimate based on street-lighting data — not a confirmed incident location.`,
    };
  });
}