// Alex's Suggestions — mock provider layer for UrbanSafe's AI safety assistant.
// Replaceable data sources (the UI only consumes AlexPayload):
//   Geolocation API / Google Maps–Mapbox geocoding -> city + current road
//   City crime / incident APIs                      -> incidents, risk, police
//   Street lighting / road-condition APIs           -> lighting, roads
//   LLM endpoint (OpenAI-compatible)                -> suggestion generation

import type { SafetyInsights } from "@/services/location-safety";

export type SuggestionTone = "good" | "info" | "warn";

export type SuggestionIcon =
  | "lighting"
  | "shield"
  | "alert"
  | "clock"
  | "route"
  | "users"
  | "car"
  | "moon"
  | "pin"
  | "safety";

export interface AlexSuggestion {
  id: string;
  icon: SuggestionIcon;
  title: string;
  detail: string;
  tone: SuggestionTone;
}

export interface AlexPayload {
  city: string;
  currentRoad: string;
  destination: string | null;
  routeRisk: string;
  nearbyIncidents: number;
  policePresence: "Low" | "Moderate" | "High";
  streetLighting: number;
  crowdDensity: "Low" | "Moderate" | "High";
  roadConditions: "Good" | "Moderate" | "Poor";
  timeOfDay: string;
  suggestions: AlexSuggestion[];
}

export type RouteId = "safe" | "balanced" | "fastest";
export type Level = "Low" | "Moderate" | "High";

export interface AlexLocationContext {
  city?: string;
  locality?: string;
  road?: string;
}

const FALLBACK_LOCATION = { city: "Current area", currentRoad: "Current area" };

const MOCK_ROAD_PROFILE = {
  nearbyIncidents: 2,
  policePresence: "High" as Level,
  streetLighting: 88,
  crowdDensity: "Moderate" as Level,
  roadConditions: "Good" as "Good" | "Moderate" | "Poor",
};

const ROUTE_PROFILES: Record<RouteId, {
  risk: string;
  incidents: number;
  police: Level;
  lighting: number;
  crowd: Level;
  roads: "Good" | "Moderate" | "Poor";
}> = {
  safe: { risk: "Low", incidents: 1, police: "High", lighting: 96, crowd: "Moderate", roads: "Good" },
  balanced: { risk: "Moderate", incidents: 3, police: "Moderate", lighting: 72, crowd: "Moderate", roads: "Good" },
  fastest: { risk: "High", incidents: 5, police: "Low", lighting: 61, crowd: "High", roads: "Moderate" },
};

export function getTimeOfDay(hour = new Date().getHours()): string {
  if (hour >= 5 && hour < 12) return "Morning";
  if (hour >= 12 && hour < 17) return "Afternoon";
  if (hour >= 17 && hour < 21) return "Evening";
  return "Night";
}

function toneFor(level: "good" | "moderate" | "poor" | "low" | "high"): SuggestionTone {
  if (level === "good" || level === "low") return "good";
  return level === "high" || level === "poor" ? "warn" : "info";
}

function contextualSuggestions(timeOfDay: string, road: string, insights?: SafetyInsights | null): AlexSuggestion[] {
  if (insights) {
    return [
      { id: "ctx-lighting", icon: "lighting", title: insights.streetLighting.status, detail: insights.streetLighting.description, tone: toneFor(insights.streetLighting.level) },
      { id: "ctx-crowd", icon: "users", title: insights.crowdDensity.status, detail: insights.crowdDensity.description, tone: toneFor(insights.crowdDensity.level) },
      { id: "ctx-travel", icon: "safety", title: insights.travelSafety.status, detail: insights.travelSafety.description, tone: toneFor(insights.travelSafety.level) },
      { id: "ctx-route", icon: "route", title: insights.saferRoute.status, detail: insights.saferRoute.description, tone: "info" },
    ];
  }

  const list: AlexSuggestion[] = [
    { id: "ctx-lighting", icon: "lighting", title: "Lighting estimate", detail: `Demo estimate for ${road}; this is not a street-lighting feed.`, tone: "good" },
    { id: "ctx-crowd", icon: "users", title: "Crowd estimate", detail: "Demo estimate based on the approximate area and time, not live crowd data.", tone: "info" },
  ];

  if (timeOfDay === "Night") {
    list.push({ id: "ctx-night", icon: "moon", title: "Nighttime travel estimate", detail: "Demo guidance: consider staying on main roads after dark.", tone: "warn" });
  } else {
    list.push({ id: "ctx-time", icon: "clock", title: "Travel estimate", detail: `Demo guidance based on the time of day around ${road}.`, tone: "good" });
  }

  list.push({ id: "ctx-stretch", icon: "route", title: "Estimated route guidance", detail: "Main roads may offer better visibility than quieter side streets.", tone: "info" });

  return list;
}

function routeSuggestions(destination: string, route: RouteId, road: string, insights?: SafetyInsights | null): AlexSuggestion[] {
  const lightingDetail = insights?.streetLighting.description;
  const travelDetail = insights?.travelSafety.description;
  const saferRouteDetail = insights?.saferRoute.description;

  if (route === "safe") {
    return [
      { id: "safe-road", icon: "safety", title: insights?.saferRoute.status || "Estimated route guidance", detail: saferRouteDetail || "Demo guidance favors main, well-lit routes.", tone: "good" },
      { id: "safe-route", icon: "shield", title: "Route estimate", detail: `This route is a demo comparison for travel toward ${destination}.`, tone: "good" },
      { id: "safe-lighting", icon: "lighting", title: insights?.streetLighting.status || "Lighting estimate", detail: lightingDetail || "This is a demo lighting estimate, not a street-lighting feed.", tone: insights ? toneFor(insights.streetLighting.level) : "good" },
      { id: "safe-time", icon: "clock", title: insights?.travelSafety.status || "Travel estimate", detail: travelDetail || "This is a demo estimate based on your area and time of day.", tone: insights ? toneFor(insights.travelSafety.level) : "info" },
    ];
  }

  if (route === "balanced") {
    return [
      { id: "bal-risk", icon: "alert", title: "Moderate travel estimate", detail: `Demo guidance for the ${destination} direction.`, tone: "warn" },
      { id: "bal-lighting", icon: "lighting", title: insights?.streetLighting.status || "Lighting estimate", detail: lightingDetail || "This is a demo lighting estimate, not a street-lighting feed.", tone: insights ? toneFor(insights.streetLighting.level) : "warn" },
      { id: "bal-route", icon: "shield", title: "Route guidance", detail: "Prefer active, familiar streets when practical.", tone: "good" },
      { id: "bal-time", icon: "clock", title: "Balanced travel time", detail: `Estimated 15 min to ${destination}; safety conditions are demo estimates.`, tone: "info" },
    ];
  }

  return [
    { id: "fast-risk", icon: "alert", title: "Higher travel estimate", detail: "This is a demo comparison, not a live incident report.", tone: "warn" },
    { id: "fast-alternate", icon: "route", title: insights?.saferRoute.status || "Estimated alternate guidance", detail: saferRouteDetail || `The demo safest route adds 6 min toward ${destination}.`, tone: "warn" },
    { id: "fast-lighting", icon: "moon", title: insights?.streetLighting.status || "Lighting estimate", detail: lightingDetail || "This is a demo lighting estimate, not a street-lighting feed.", tone: insights ? toneFor(insights.streetLighting.level) : "warn" },
    { id: "fast-route", icon: "shield", title: "Route guidance", detail: "Use familiar, active streets if you prefer an alternate route.", tone: "warn" },
  ];
}

export function buildAlexPayload(
  destination: string | null,
  route: RouteId | null,
  location?: AlexLocationContext | null,
  insights?: SafetyInsights | null,
): AlexPayload {
  const timeOfDay = getTimeOfDay();
  const city = location?.city || location?.locality || FALLBACK_LOCATION.city;
  const currentRoad = location?.road || location?.locality || city || FALLBACK_LOCATION.currentRoad;

  if (!destination || !route) {
    return {
      city,
      currentRoad,
      destination: null,
      routeRisk: "Low",
      nearbyIncidents: MOCK_ROAD_PROFILE.nearbyIncidents,
      policePresence: MOCK_ROAD_PROFILE.policePresence,
      streetLighting: MOCK_ROAD_PROFILE.streetLighting,
      crowdDensity: MOCK_ROAD_PROFILE.crowdDensity,
      roadConditions: MOCK_ROAD_PROFILE.roadConditions,
      timeOfDay,
      suggestions: contextualSuggestions(timeOfDay, currentRoad, insights),
    };
  }

  const profile = ROUTE_PROFILES[route];
  return {
    city,
    currentRoad,
    destination,
    routeRisk: profile.risk,
    nearbyIncidents: profile.incidents,
    policePresence: profile.police,
    streetLighting: profile.lighting,
    crowdDensity: profile.crowd,
    roadConditions: profile.roads,
    timeOfDay,
    suggestions: routeSuggestions(destination, route, currentRoad, insights),
  };
}
