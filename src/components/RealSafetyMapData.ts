/**
 * Shared static map data for the Safety Map. This module contains NO
 * Leaflet/leaflet imports so it can be imported statically (SSR-safe)
 * by both the real Leaflet map and the page that renders it.
 *
 * The `canvas` coordinates come from the original decorative 800×600
 * map layout and are converted to real lat/lng relative to the MI Road
 * anchor by `canvasToLatLng`.
 */

export type SafetyLayerId =
  | "crime"
  | "construction"
  | "accident"
  | "lighting"
  | "police";

export interface SafetyLayerMeta {
  label: string;
  color: string;
  emoji: string;
}

export const SAFETY_LAYER_META: Record<SafetyLayerId, SafetyLayerMeta> = {
  crime: { label: "Crime hotspots", color: "#ef4444", emoji: "⚠️" },
  construction: { label: "Construction", color: "#64748b", emoji: "🚧" },
  accident: { label: "Accidents", color: "#f97316", emoji: "🚗" },
  lighting: { label: "Poor lighting", color: "#eab308", emoji: "💡" },
  police: { label: "Police", color: "#3b82f6", emoji: "🛡️" },
};

export interface StaticLayerMarker {
  id: string;
  layer: SafetyLayerId;
  /** Explicit real coordinates (used instead of the canvas offset). */
  position?: [number, number];
  /** Legacy decorative canvas position to convert to lat/lng. */
  canvas?: [number, number];
  title: string;
  detail: string;
}

export const STATIC_LAYER_MARKERS: StaticLayerMarker[] = [
  { id: "crime-1", layer: "crime", canvas: [392, 352], title: "Crime hotspot", detail: "12 incidents · last reported 2 days ago" },
  { id: "crime-2", layer: "crime", canvas: [566, 182], title: "Crime hotspot", detail: "4 incidents · last reported 5 days ago" },
  { id: "construction-1", layer: "construction", canvas: [300, 240], title: "Road construction", detail: "500 m away · ~15 min delay" },
  { id: "accident-1", layer: "accident", canvas: [470, 268], title: "Accident reported", detail: "1.2 km away · 12 min ago" },
  { id: "lighting-1", layer: "lighting", canvas: [150, 330], title: "Poor lighting", detail: "Streetlight not working · 300 m away" },
  { id: "police-1", layer: "police", position: [26.9112, 75.7845], title: "Police Station", detail: "Open 24×7 · 600 m away" },
  { id: "police-2", layer: "police", canvas: [620, 420], title: "Police patrol", detail: "Active in your area" },
];

export type PlaceKind = "hospital" | "atm" | "restaurant";

export interface PlaceMarkerInfo {
  id: string;
  kind: PlaceKind;
  canvas: [number, number];
  title: string;
  detail: string;
}

export const PLACES_INFO: PlaceMarkerInfo[] = [
  { id: "hospital-1", kind: "hospital", canvas: [475, 178], title: "Hospital", detail: "1.4 km away" },
  { id: "atm-1", kind: "atm", canvas: [120, 435], title: "ATM", detail: "450 m away" },
  { id: "restaurant-1", kind: "restaurant", canvas: [690, 340], title: "Restaurant", detail: "800 m away" },
];

export const PLACE_EMOJI: Record<PlaceKind, string> = {
  hospital: "🏥",
  atm: "🏧",
  restaurant: "🍽️",
};

/** Rough meter-per-pixel scale of the original 800×600 map canvas. */
const METERS_TO_PX = 0.16;

/** Converts a legacy canvas coordinate to a real lat/lng near the given anchor. */
export function canvasToLatLng(x: number, y: number, anchorLat: number, anchorLng: number): [number, number] {
  const dLngMeters = (x - 400) / METERS_TO_PX;
  const dLatMeters = (305 - y) / METERS_TO_PX;
  const lng =
    anchorLng +
    dLngMeters / (111320 * Math.cos((anchorLat * Math.PI) / 180));
  const lat = anchorLat + dLatMeters / 111320;
  return [lat, lng];
}