export type LocationSafetyInput = {
  latitude: number;
  longitude: number;
  city?: string;
  locality?: string;
};

export type SafetyInsights = {
  locationName: string;
  timeOfDay: string;
  streetLighting: {
    status: string;
    level: "good" | "moderate" | "poor";
    description: string;
  };
  crowdDensity: {
    status: string;
    level: "low" | "moderate" | "high";
    description: string;
  };
  travelSafety: {
    status: string;
    level: "good" | "moderate" | "poor";
    description: string;
  };
  saferRoute: {
    status: string;
    description: string;
  };
};

type LightingLevel = SafetyInsights["streetLighting"]["level"];
type CrowdLevel = SafetyInsights["crowdDensity"]["level"];
type TravelLevel = SafetyInsights["travelSafety"]["level"];

function getTimeOfDay(hour = new Date().getHours()): string {
  if (hour >= 5 && hour < 12) return "Morning";
  if (hour >= 12 && hour < 17) return "Afternoon";
  if (hour >= 17 && hour < 21) return "Evening";
  return "Night";
}

// A stable area bucket lets the demo respond to a user's approximate location
// without persisting or displaying their exact coordinates.
function areaSeed(latitude: number, longitude: number): number {
  const latBucket = Math.round(latitude * 100);
  const lonBucket = Math.round(longitude * 100);
  return Math.abs((latBucket * 73856093) ^ (lonBucket * 19349663));
}

function locationName({ city, locality }: LocationSafetyInput): string {
  if (locality && city && locality !== city) return `${locality}, ${city}`;
  return locality || city || "your area";
}

export function getLocationSafetyInsights(input: LocationSafetyInput, hour = new Date().getHours()): SafetyInsights {
  const timeOfDay = getTimeOfDay(hour);
  const name = locationName(input);
  const seed = areaSeed(input.latitude, input.longitude);
  const lightingLevels: LightingLevel[] = timeOfDay === "Night"
    ? ["moderate", "poor", "moderate"]
    : timeOfDay === "Evening"
      ? ["moderate", "good", "moderate"]
      : ["good", "good", "moderate"];
  const crowdLevels: CrowdLevel[] = timeOfDay === "Night"
    ? ["low", "moderate", "low"]
    : timeOfDay === "Morning"
      ? ["low", "moderate", "low"]
      : ["moderate", "high", "low"];
  const lighting = lightingLevels[seed % lightingLevels.length];
  const crowd = crowdLevels[(seed >> 3) % crowdLevels.length];
  const travel: TravelLevel = lighting === "poor" ? "moderate" : (seed % 4 === 0 ? "moderate" : "good");

  const lightingStatus = lighting === "good" ? "Estimated good lighting" : lighting === "moderate" ? "Estimated mixed lighting" : "Estimated limited lighting";
  const crowdStatus = crowd === "low" ? "Estimated low crowds" : crowd === "moderate" ? "Estimated moderate crowds" : "Estimated busy area";
  const travelStatus = timeOfDay === "Morning"
    ? "Favorable morning travel estimate"
    : timeOfDay === "Night"
      ? "Nighttime travel estimate"
      : travel === "good" ? "Favorable travel estimate" : "Use extra care";

  return {
    locationName: name,
    timeOfDay,
    streetLighting: {
      status: lightingStatus,
      level: lighting,
      description: timeOfDay === "Night"
        ? "Demo estimate based on your area and local time. Prefer well-lit streets after dark; this is not a street-lighting feed."
        : `Estimate based on the approximate area and ${timeOfDay.toLowerCase()} time; this is not a street-lighting feed.`,
    },
    crowdDensity: {
      status: crowdStatus,
      level: crowd,
      description: crowd === "high"
        ? `Estimated from the approximate area and time of day; this is not a live crowd feed.`
        : `Estimated from the approximate area and time of day; not live crowd data.`,
    },
    travelSafety: {
      status: travelStatus,
      level: travel,
      description: timeOfDay === "Morning"
        ? "Travel conditions are generally favorable in this demo estimate, based on your approximate area and local time."
        : timeOfDay === "Evening"
          ? "Evening demo guidance: favor active, familiar streets as daylight changes."
          : timeOfDay === "Night"
            ? "Nighttime demo guidance: prefer well-lit, active streets after dark."
            : travel === "good"
              ? "This is a demo recommendation based on your approximate area and local time."
              : "This is a demo recommendation. Stay on familiar, active routes and share your trip if needed.",
    },
    saferRoute: {
      status: "Estimated route guidance",
      description: timeOfDay === "Night"
        ? `Nighttime demo guidance for ${name}: prefer main, well-lit roads after dark.`
        : `Demo guidance for ${name}: prefer main, well-lit roads for better visibility and access to help.`,
    },
  };
}
