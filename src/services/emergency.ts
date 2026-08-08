/**
 * UrbanSafe emergency service.
 *
 * Architecture:
 *   User activates SOS
 *     -> resolve current location (browser GPS, or simulated for demo)
 *     -> create emergency event (Firestore, or local store in demo mode)
 *     -> nearby users' real-time subscriptions receive the sanitized event
 *     -> their app shows a compact alert + optional browser notification
 *
 * When Firebase is configured the Firestore adapter is used
 * (src/firebase/emergency.ts) with the `emergencyEvents` collection and
 * geohash range queries. When Firebase is NOT configured (e.g. local
 * development), a local demo store keeps the full flow working so the
 * app can be tested end-to-end; two browser tabs signed in as different
 * demo users sync events in real time via BroadcastChannel.
 *
 * Privacy: events never contain names, emails, phones or exact GPS
 * fixes. Only the reporter's uid (for self-management), an approximate
 * rounded location and a geohash are stored. Voice recordings are kept
 * private to the reporter.
 */

import { isFirebaseConfigured } from "@/firebase/config";
import {
  createFirestoreEmergency,
  getFirestoreEmergencyHistory,
  resolveFirestoreEmergency,
  subscribeFirestoreMyEvents,
  subscribeFirestoreNearby,
  uploadEmergencyAudio,
} from "@/firebase/emergency";
import { encodeGeohash, geohashBoundsForRadius } from "@/lib/geohash";
import { approximateLocation, haversineMeters } from "@/lib/geo";
import { EMERGENCY_ACTIVE_TTL_MS, EMERGENCY_NEARBY_RADIUS_METERS } from "./emergency-config";
import type {
  CreateEmergencyInput,
  CreateEmergencyResult,
  EmergencyEventRecord,
  EmergencyLocation,
  EmergencyTypeId,
  NearbyEmergency,
} from "./emergency-types";

/** True when the real (Firestore + GPS) backend is in use. */
export function isEmergencyBackendConfigured(): boolean {
  return isFirebaseConfigured();
}

export { EMERGENCY_NEARBY_RADIUS_METERS, EMERGENCY_ACTIVE_TTL_MS };

/* ------------------------------------------------------------------ */
/* Location resolution                                                 */
/* ------------------------------------------------------------------ */

const DEMO_BASE = { latitude: 26.9124, longitude: 75.7873 }; // MI Road, Jaipur (demo area)

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Deterministic simulated location per demo user, so two demo accounts
 * land a few hundred meters to ~1.5 km apart — enough to exercise the
 * nearby-notification radius without any real GPS.
 */
export function getSimulatedLocation(uid: string): { latitude: number; longitude: number } {
  const seed = hashString(uid);
  const latOffset = (((seed % 101) - 50) * 0.00016);
  const lngOffset = (((Math.floor(seed / 101) % 101) - 50) * 0.00016);
  return {
    latitude: DEMO_BASE.latitude + latOffset,
    longitude: DEMO_BASE.longitude + lngOffset,
  };
}

const locationCache = new Map<string, { location: EmergencyLocation; at: number }>();

function cacheLocation(uid: string, location: EmergencyLocation): void {
  locationCache.set(uid, { location, at: Date.now() });
}

/**
 * Resolves the user's current location for emergency reporting.
 * - Real mode: browser geolocation (a browser permission prompt is
 *   shown by the browser when required — never silently).
 * - Demo mode: simulated Jaipur-area coordinates.
 */
export function getMyLocation(
  uid: string,
  force = false
): Promise<EmergencyLocation> {
  const cached = locationCache.get(uid);
  if (!force && cached && Date.now() - cached.at < 30_000) {
    return Promise.resolve(cached.location);
  }

  if (!isFirebaseConfigured()) {
    const { latitude, longitude } = getSimulatedLocation(uid);
    const location: EmergencyLocation = {
      latitude,
      longitude,
      permission: "demo",
      areaLabel: "MI Road, Jaipur (demo area)",
    };
    cacheLocation(uid, location);
    return Promise.resolve(location);
  }

  if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
    const location: EmergencyLocation = {
      latitude: 0,
      longitude: 0,
      permission: "unavailable",
      areaLabel: null,
    };
    cacheLocation(uid, location);
    return Promise.resolve(location);
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location: EmergencyLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          permission: "granted",
          areaLabel: null,
        };
        cacheLocation(uid, location);
        resolve(location);
      },
      (error) => {
        const denied = error.code === error.PERMISSION_DENIED;
        const location: EmergencyLocation = {
          latitude: 0,
          longitude: 0,
          permission: denied ? "denied" : "unavailable",
          areaLabel: null,
        };
        cacheLocation(uid, location);
        resolve(location);
      },
      { timeout: 8000, maximumAge: 300_000 }
    );
  });
}

/* ------------------------------------------------------------------ */
/* Event lifecycle                                                     */
/* ------------------------------------------------------------------ */

/**
 * Creates an emergency event with the user's current location attached.
 * Coordinates are rounded before storage (privacy: exact GPS fixes are
 * never stored or published).
 */
export async function createEmergency(
  uid: string,
  input: CreateEmergencyInput,
  options?: { location?: EmergencyLocation }
): Promise<CreateEmergencyResult> {
  const location = options?.location ?? (await getMyLocation(uid));

  if (isFirebaseConfigured() && location.permission !== "granted") {
    throw new Error(
      "LOCATION_REQUIRED: Location access is needed to share your emergency location."
    );
  }

  const approximate = approximateLocation(location.latitude, location.longitude);

  const event: EmergencyEventRecord = {
    id: "",
    createdBy: uid,
    type: input.type,
    message: input.message?.trim() ? input.message.trim().slice(0, 500) : null,
    latitude: approximate.latitude,
    longitude: approximate.longitude,
    geohash: encodeGeohash(approximate.latitude, approximate.longitude, 7),
    areaLabel: location.areaLabel,
    createdAt: Date.now(),
    expiresAt: Date.now() + EMERGENCY_ACTIVE_TTL_MS,
    status: "active",
    hasAudio: false,
  };

  if (isFirebaseConfigured()) {
    const created = await createFirestoreEmergency({
      createdBy: uid,
      type: event.type,
      message: event.message,
      latitude: event.latitude,
      longitude: event.longitude,
      geohash: event.geohash,
      areaLabel: event.areaLabel,
      hasAudio: Boolean(input.audio),
    });
    event.id = created.id;

    if (input.audio) {
      const audioRef = await uploadEmergencyAudio(uid, event.id, input.audio);
      event.hasAudio = true;
      // audioRef is intentionally NOT stored on the public document.
      void audioRef;
    }
  } else {
    event.id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    event.hasAudio = Boolean(input.audio);
    if (input.audio) {
      rememberLocalAudio(event.id, input.audio);
    }
    localStore.add(event);
  }

  return { event, location };
}

/** Cancels/resolves an active emergency. Only the creator may do this. */
export async function resolveEmergency(uid: string, eventId: string): Promise<void> {
  if (isFirebaseConfigured()) {
    await resolveFirestoreEmergency(eventId);
    return;
  }
  const events = localStore.all();
  const target = events.find((event) => event.id === eventId);
  if (!target || target.createdBy !== uid) return;
  localStore.update(eventId, { status: "resolved" });
}

/** Returns the current user's active emergency, if any. */
export async function getMyActiveEvent(uid: string): Promise<EmergencyEventRecord | null> {
  if (isFirebaseConfigured()) {
    const history = await getFirestoreEmergencyHistory(uid, 5);
    return history.find((event) => event.status === "active" && event.expiresAt > Date.now()) ?? null;
  }
  return (
    localStore
      .all()
      .find((event) => event.createdBy === uid && event.status === "active" && event.expiresAt > Date.now()) ??
    null
  );
}

/** Loads the current user's recent emergency activity. */
export async function getEmergencyHistory(uid: string, count = 10): Promise<EmergencyEventRecord[]> {
  if (isFirebaseConfigured()) {
    return getFirestoreEmergencyHistory(uid, count);
  }
  return localStore
    .all()
    .filter((event) => event.createdBy === uid)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, count);
}

/* ------------------------------------------------------------------ */
/* Nearby discovery                                                    */
/* ------------------------------------------------------------------ */

function toNearbyEvent(
  event: EmergencyEventRecord,
  uid: string,
  myLat: number | null,
  myLng: number | null
): NearbyEmergency | null {
  if (event.createdBy === uid) return null;
  if (event.status !== "active") return null;
  if (event.expiresAt < Date.now()) return null;

  const distanceMeters =
    myLat !== null && myLng !== null
      ? haversineMeters(myLat, myLng, event.latitude, event.longitude)
      : null;

  if (distanceMeters !== null && distanceMeters > EMERGENCY_NEARBY_RADIUS_METERS) {
    return null;
  }

  return {
    id: event.id,
    type: event.type,
    message: event.message,
    latitude: event.latitude,
    longitude: event.longitude,
    areaLabel: event.areaLabel,
    createdAt: event.createdAt,
    status: event.status,
    distanceMeters,
  };
}

export interface NearbySubscriptionOptions {
  uid: string;
  location: EmergencyLocation | null;
  onEvents: (events: NearbyEmergency[]) => void;
}

/**
 * Subscribes to nearby emergency alerts. Real-time in Firestore mode
 * (geohash-bounded listener) and in demo mode (cross-tab sync).
 */
export function subscribeNearbyEmergencies(
  options: NearbySubscriptionOptions
): () => void {
  const { uid, location, onEvents } = options;

  if (isFirebaseConfigured()) {
    if (!location) return () => undefined;
    const bounds = geohashBoundsForRadius(location.latitude, location.longitude, EMERGENCY_NEARBY_RADIUS_METERS);
    const unsubscribe = subscribeFirestoreNearby(
      location.latitude,
      location.longitude,
      bounds.min,
      bounds.max,
      (events) => {
        const nearby = events
          .map((event) => toNearbyEvent(event, uid, location.latitude, location.longitude))
          .filter((event): event is NearbyEmergency => event !== null);
        onEvents(nearby);
      }
    );
    return unsubscribe;
  }

  return localStore.subscribe((events) => {
    const nearby = events
      .map((event) =>
        toNearbyEvent(event, uid, location?.latitude ?? null, location?.longitude ?? null)
      )
      .filter((event): event is NearbyEmergency => event !== null);
    onEvents(nearby);
  });
}

/**
 * Subscribes to the current user's own emergency events (active or
 * resolved) in real time. Used to surface the reporter's active SOS.
 */
export function subscribeMyEvents(
  uid: string,
  onChange: (events: EmergencyEventRecord[]) => void
): () => void {
  if (isFirebaseConfigured()) {
    return subscribeFirestoreMyEvents(uid, onChange);
  }
  return localStore.subscribe((events) => {
    const mine = events
      .filter((event) => event.createdBy === uid)
      .sort((a, b) => b.createdAt - a.createdAt);
    onChange(mine);
  });
}

/* ------------------------------------------------------------------ */
/* Private voice recordings (demo mode)                                */
/* ------------------------------------------------------------------ */

const localAudio = new Map<string, { blob: Blob; url: string }>();

function rememberLocalAudio(eventId: string, blob: Blob): void {
  const url = typeof URL !== "undefined" ? URL.createObjectURL(blob) : "";
  localAudio.set(eventId, { blob, url });
}

/** Retrieves the reporter's private demo recording (preview/playback). */
export function getLocalAudio(eventId: string): { blob: Blob; url: string } | null {
  return localAudio.get(eventId) ?? null;
}

/* ------------------------------------------------------------------ */
/* Local demo store                                                    */
/* ------------------------------------------------------------------ */

const LOCAL_STORAGE_KEY = "urbansafe-emergency-events";
const LOCAL_CHANNEL_NAME = "urbansafe-emergency-sync";

type LocalListener = (events: EmergencyEventRecord[]) => void;

class LocalEmergencyStore {
  private listeners = new Set<LocalListener>();
  private channel: BroadcastChannel | null = null;

  constructor() {
    if (typeof BroadcastChannel !== "undefined") {
      this.channel = new BroadcastChannel(LOCAL_CHANNEL_NAME);
      this.channel.onmessage = (message: MessageEvent) => {
        if (message?.data?.type === "sync") this.notify();
      };
    }
    if (typeof window !== "undefined") {
      window.addEventListener("storage", (event) => {
        if (event.key === LOCAL_STORAGE_KEY) this.notify();
      });
    }
  }

  all(): EmergencyEventRecord[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as EmergencyEventRecord[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private save(events: EmergencyEventRecord[]): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(events));
    } catch {
      // Storage full/unavailable — keep in-memory listeners consistent.
    }
    this.channel?.postMessage({ type: "sync" });
    this.notify();
  }

  add(event: EmergencyEventRecord): void {
    const next = [...this.all(), event];
    this.save(next);
  }

  update(id: string, patch: Partial<EmergencyEventRecord>): void {
    const next = this.all().map((event) => (event.id === id ? { ...event, ...patch } : event));
    this.save(next);
  }

  subscribe(listener: LocalListener): () => void {
    this.listeners.add(listener);
    listener(this.all());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const events = this.all();
    this.listeners.forEach((listener) => listener(events));
  }
}

const localStore = new LocalEmergencyStore();

/** Testable entry point for the demo store (used by tests). */
export const _localStore = localStore;
export type { EmergencyTypeId };
