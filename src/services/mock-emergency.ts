/**
 * Shared mock emergency model (Phase 8 + 9).
 *
 * Every emergency in UrbanSafe — text threat, photo threat, voice trigger
 * and manual SOS — goes through ONE state machine defined here and driven
 * by the EmergencyContext. There is deliberately only one EmergencyEvent
 * shape and one MockEmergencyStatus flow.
 *
 * Everything in this system is a DEMO. Police 100 / Emergency 112 are
 * simulated UI states only; no real emergency service is ever contacted.
 */

/** How the emergency was triggered. */
export type EmergencySource = "AI_THREAT_DETECTION" | "VOICE_TRIGGER" | "MANUAL_SOS";

/** Single shared emergency state machine (adapted to the existing app). */
export type MockEmergencyStatus =
  | "IDLE"
  | "CONFIRMATION"
  | "SOS_ACTIVE"
  | "POLICE_CONNECTING"
  | "POLICE_CONNECTED"
  | "EMERGENCY_RESPONSE_CONNECTING"
  | "EMERGENCY_RESPONSE_CONNECTED"
  | "LOCATION_DEMO"
  | "NEARBY_USERS_DEMO"
  | "ACTIVE"
  | "ENDED";

/** One browser GPS fix captured locally at mock-emergency activation. */
export interface MockEmergencyLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: string;
}

export interface MockLocationResult {
  location: MockEmergencyLocation | null;
  error: string | null;
}

/** One emergency event — the same record for every activation source. */
export interface EmergencyEvent {
  type: "MOCK_EMERGENCY";
  status: "ACTIVE" | "ENDED";
  riskLevel: "HIGH";
  policeCall: "SIMULATED";
  emergencyResponse: "SIMULATED";
  /** Local-only browser location; never sent to an API or service. */
  location: MockEmergencyLocation | null;
  locationError: string | null;
  timestamp: string;
  source: EmergencySource;
}

/** Demo nearby users — local/mock state only, never real alerts. */
export interface DemoNearbyUser {
  id: string;
  label: string;
  note: string;
}

export const DEMO_NEARBY_USERS: DemoNearbyUser[] = [
  { id: "demo-1", label: "User nearby", note: "Emergency alert received" },
  { id: "demo-2", label: "User nearby", note: "Emergency alert received" },
  { id: "demo-3", label: "User nearby", note: "Emergency alert received" },
];

/** Delay (ms) before auto-advancing from a status, or null for user-driven steps. */
export function mockStepDelay(status: MockEmergencyStatus): number | null {
  switch (status) {
    case "SOS_ACTIVE":
      return 2000;
    case "POLICE_CONNECTING":
      return 2500;
    case "POLICE_CONNECTED":
      return 1500;
    case "EMERGENCY_RESPONSE_CONNECTING":
      return 2500;
    case "EMERGENCY_RESPONSE_CONNECTED":
      return 1500;
    case "LOCATION_DEMO":
      return 1800;
    case "NEARBY_USERS_DEMO":
      return 1800;
    default:
      return null; // IDLE / CONFIRMATION / ACTIVE / ENDED are user-driven or terminal
  }
}

/** The next status in the single shared flow. */
export function nextMockStatus(status: MockEmergencyStatus): MockEmergencyStatus {
  switch (status) {
    case "SOS_ACTIVE":
      return "POLICE_CONNECTING";
    case "POLICE_CONNECTING":
      return "POLICE_CONNECTED";
    case "POLICE_CONNECTED":
      return "EMERGENCY_RESPONSE_CONNECTING";
    case "EMERGENCY_RESPONSE_CONNECTING":
      return "EMERGENCY_RESPONSE_CONNECTED";
    case "EMERGENCY_RESPONSE_CONNECTED":
      return "LOCATION_DEMO";
    case "LOCATION_DEMO":
      return "NEARBY_USERS_DEMO";
    case "NEARBY_USERS_DEMO":
      return "ACTIVE";
    default:
      return status;
  }
}

/** Human-readable label for the activation source. */
export function formatEmergencySource(source: EmergencySource): string {
  switch (source) {
    case "AI_THREAT_DETECTION":
      return "AI THREAT DETECTION";
    case "VOICE_TRIGGER":
      return "VOICE TRIGGER";
    case "MANUAL_SOS":
      return "MANUAL SOS";
  }
}

/** Fallback demo location label used when no real location is available. */
export const DEMO_LOCATION_LABEL = "Current UrbanSafe location";

/**
 * Gets exactly one browser GPS fix for a demo activation. This deliberately
 * never starts a continuous location watcher and keeps the result in frontend state only.
 */
export function requestMockEmergencyLocation(): Promise<MockLocationResult> {
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
    return Promise.resolve({ location: null, error: "Unable to determine current location." });
  }

  return new Promise((resolve) => {
    const onFailure = (error: GeolocationPositionError) => {
      const message =
        error.code === error.PERMISSION_DENIED
          ? "Location permission was denied."
          : error.code === error.POSITION_UNAVAILABLE
            ? "Current location is unavailable."
            : error.code === error.TIMEOUT
              ? "Location request timed out."
              : "Unable to determine current location.";
      resolve({ location: null, error: message });
    };

    try {
      navigator.geolocation.getCurrentPosition(
      (position) => {
        const accuracy = position.coords.accuracy;
        resolve({
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: Number.isFinite(accuracy) ? accuracy : null,
            timestamp: new Date(position.timestamp).toISOString(),
          },
          error: null,
        });
      },
      onFailure,
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 }
      );
    } catch {
      resolve({ location: null, error: "Unable to determine current location." });
    }
  });
}
