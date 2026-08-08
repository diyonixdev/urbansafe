/** Shared types for the UrbanSafe emergency system. */

export type EmergencyTypeId =
  | "general"
  | "accident"
  | "medical"
  | "personal_safety"
  | "fire"
  | "road"
  | "other";

export interface EmergencyTypeInfo {
  id: EmergencyTypeId;
  label: string;
  emoji: string;
}

export type EmergencyStatus = "active" | "resolved";

/**
 * Full emergency event as stored. The Firestore document intentionally
 * contains NO personal identity fields (no name, email, phone, photo).
 * `createdBy` is only used to allow the reporter to manage their own
 * event and to prevent self-notifications.
 */
export interface EmergencyEventRecord {
  id: string;
  createdBy: string;
  type: EmergencyTypeId;
  message: string | null;
  /** APPROXIMATE coordinates (rounded), never the raw GPS fix. */
  latitude: number;
  longitude: number;
  geohash: string;
  /** Optional friendly area label (e.g. "MI Road, Jaipur"). */
  areaLabel: string | null;
  createdAt: number;
  expiresAt: number;
  status: EmergencyStatus;
  /** True when the reporter attached a private voice recording. */
  hasAudio: boolean;
}

/**
 * Public view of an emergency as received by nearby users. Contains no
 * identity and only the approximate location required to render help.
 */
export interface NearbyEmergency {
  id: string;
  type: EmergencyTypeId;
  message: string | null;
  latitude: number;
  longitude: number;
  areaLabel: string | null;
  createdAt: number;
  status: EmergencyStatus;
  /** Distance from the receiving user's last known location. */
  distanceMeters: number | null;
}

export interface EmergencyLocation {
  latitude: number;
  longitude: number;
  permission: "granted" | "denied" | "demo" | "unavailable";
  areaLabel: string | null;
}

export interface CreateEmergencyInput {
  type: EmergencyTypeId;
  message?: string | null;
  /** Optional private voice recording blob. */
  audio?: Blob | null;
}

export interface CreateEmergencyResult {
  event: EmergencyEventRecord;
  location: EmergencyLocation;
}
