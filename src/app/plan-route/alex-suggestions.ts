// Alex's Suggestions — mock provider layer for UrbanSafe's AI safety assistant.
// Replaceable data sources (the UI only consumes AlexPayload):
//   Geolocation API / Google Maps–Mapbox geocoding -> city + current road
//   City crime / incident APIs                      -> incidents, risk, police
//   Street lighting / road-condition APIs           -> lighting, roads
//   LLM endpoint (OpenAI-compatible)                -> suggestion generation

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

const MOCK_LOCATION = { city: "Jaipur", currentRoad: "MI Road" };

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

function contextualSuggestions(timeOfDay: string): AlexSuggestion[] {
  const road = MOCK_LOCATION.currentRoad;
  const list: AlexSuggestion[] = [
    { id: "ctx-lighting", icon: "lighting", title: "Street lighting is good", detail: `${road} holds 88% light coverage through the main stretch.`, tone: "good" },
    { id: "ctx-crowd", icon: "users", title: "Moderate crowd density nearby", detail: "Crowds around the main junction are moderate right now.", tone: "info" },
  ];

  if (timeOfDay === "Night") {
    list.push({ id: "ctx-night", icon: "moon", title: "Nighttime risk is rising", detail: "Consider staying on the main road after 9 PM — lighting drops on side lanes.", tone: "warn" });
  } else {
    list.push({ id: "ctx-time", icon: "clock", title: "Good time to travel", detail: `Safety conditions on ${road} are favorable at this hour.`, tone: "good" });
  }

  list.push({ id: "ctx-stretch", icon: "route", title: "A safer stretch is available", detail: "Two blocks ahead, the Tonk Road junction has lower incident counts.", tone: "info" });

  return list;
}

function routeSuggestions(destination: string, route: RouteId): AlexSuggestion[] {
  if (route === "safe") {
    return [
      { id: "safe-road", icon: "safety", title: "Safer road ahead", detail: "The next stretch has better lighting and lower reported incidents.", tone: "good" },
      { id: "safe-police", icon: "shield", title: "Police presence nearby", detail: "Police presence is high around your current road.", tone: "good" },
      { id: "safe-lighting", icon: "lighting", title: "Well-lit route available", detail: `Street-light coverage stays at 96% end to end toward ${destination}.`, tone: "good" },
      { id: "safe-time", icon: "clock", title: "Good time to travel", detail: `Crowd levels are moderate on this route — about 18 min to ${destination}.`, tone: "info" },
    ];
  }

  if (route === "balanced") {
    return [
      { id: "bal-risk", icon: "alert", title: "Moderate risk stretch ahead", detail: `Incident activity rises around the market junction in the ${destination} direction.`, tone: "warn" },
      { id: "bal-lighting", icon: "lighting", title: "Lighting dips mid-route", detail: "Street-light coverage drops to 72% after the Broadway junction.", tone: "warn" },
      { id: "bal-police", icon: "shield", title: "Patrol active nearby", detail: "Units are monitoring the mid-route junction.", tone: "good" },
      { id: "bal-time", icon: "clock", title: "Balanced travel time", detail: `Estimated 15 min to ${destination} with moderate safety conditions.`, tone: "info" },
    ];
  }

  return [
    { id: "fast-risk", icon: "alert", title: "High-risk area nearby", detail: "A recent incident was reported 400m ahead. Consider the alternate route.", tone: "warn" },
    { id: "fast-alternate", icon: "route", title: "Safer alternate route available", detail: `The Safest Route adds 6 min but scores 92 vs 67 on this corridor to ${destination}.`, tone: "warn" },
    { id: "fast-lighting", icon: "moon", title: "Poor lighting on sections", detail: "Street-light coverage drops to 61% near the high-risk corridor.", tone: "warn" },
    { id: "fast-police", icon: "shield", title: "Limited police coverage", detail: "Only one unit sits within range of the fastest corridor.", tone: "warn" },
  ];
}

export function buildAlexPayload(destination: string | null, route: RouteId | null): AlexPayload {
  const timeOfDay = getTimeOfDay();

  if (!destination || !route) {
    return {
      city: MOCK_LOCATION.city,
      currentRoad: MOCK_LOCATION.currentRoad,
      destination: null,
      routeRisk: "Low",
      nearbyIncidents: MOCK_ROAD_PROFILE.nearbyIncidents,
      policePresence: MOCK_ROAD_PROFILE.policePresence,
      streetLighting: MOCK_ROAD_PROFILE.streetLighting,
      crowdDensity: MOCK_ROAD_PROFILE.crowdDensity,
      roadConditions: MOCK_ROAD_PROFILE.roadConditions,
      timeOfDay,
      suggestions: contextualSuggestions(timeOfDay),
    };
  }

  const profile = ROUTE_PROFILES[route];
  return {
    city: MOCK_LOCATION.city,
    currentRoad: MOCK_LOCATION.currentRoad,
    destination,
    routeRisk: profile.risk,
    nearbyIncidents: profile.incidents,
    policePresence: profile.police,
    streetLighting: profile.lighting,
    crowdDensity: profile.crowd,
    roadConditions: profile.roads,
    timeOfDay,
    suggestions: routeSuggestions(destination, route),
  };
}
