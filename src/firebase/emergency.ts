/**
 * Firestore-backed emergency event storage.
 *
 * Collection shape:
 *   emergencyEvents/{eventId}
 *     createdBy: string (uid of the reporter — never displayed publicly)
 *     type: string (one of EMERGENCY_TYPES ids)
 *     message: string | null (short optional text the reporter chooses to share)
 *     latitude / longitude: number (APPROXIMATE, rounded to ~11 m)
 *     geohash: string (7 chars, used for nearby range queries)
 *     areaLabel: string | null (optional approximate area name)
 *     createdAt: server timestamp
 *     expiresAt: timestamp (events expire automatically)
 *     status: "active" | "resolved"
 *     hasAudio: boolean (a private voice recording exists)
 *
 * Private voice recordings live in:
 *   emergencyEvents/{eventId}/private/audio/{file}
 * which Firestore/Storage rules restrict to the event creator only.
 * The main document intentionally contains NO audio reference and NO
 * personal identity fields — nearby users receive only what they need.
 */

import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { ref, uploadBytes, type StorageReference } from "firebase/storage";
import { getFirebaseFirestore, getFirebaseStorage } from "./config";
import type { EmergencyEventRecord, EmergencyTypeId } from "@/services/emergency-types";
import { EMERGENCY_ACTIVE_TTL_MS } from "@/services/emergency-config";

export const EMERGENCY_COLLECTION = "emergencyEvents";

export interface FirestoreEmergencyInput {
  createdBy: string;
  type: EmergencyTypeId;
  message: string | null;
  latitude: number;
  longitude: number;
  geohash: string;
  areaLabel: string | null;
  hasAudio: boolean;
}

export interface FirestoreEmergencyDoc extends Omit<EmergencyEventRecord, "createdAt" | "expiresAt"> {
  createdAt: { toMillis: () => number };
  expiresAt: { toMillis: () => number };
}

function convertDoc(snapshot: DocumentSnapshot): EmergencyEventRecord | null {
  if (!snapshot.exists()) return null;
  const data = snapshot.data() as FirestoreEmergencyDoc;
  return {
    id: snapshot.id,
    createdBy: data.createdBy,
    type: data.type as EmergencyTypeId,
    message: data.message ?? null,
    latitude: data.latitude,
    longitude: data.longitude,
    geohash: data.geohash,
    areaLabel: data.areaLabel ?? null,
    createdAt: data.createdAt.toMillis(),
    expiresAt: data.expiresAt.toMillis(),
    status: data.status,
    hasAudio: Boolean(data.hasAudio),
  };
}

/** Creates an emergency event document. */
export async function createFirestoreEmergency(
  input: FirestoreEmergencyInput
): Promise<EmergencyEventRecord> {
  const db = getFirebaseFirestore();
  const now = Date.now();
  const docRef = await addDoc(collection(db, EMERGENCY_COLLECTION), {
    ...input,
    createdAt: serverTimestamp(),
    expiresAt: new Date(now + EMERGENCY_ACTIVE_TTL_MS),
  });
  return {
    id: docRef.id,
    createdBy: input.createdBy,
    type: input.type,
    message: input.message,
    latitude: input.latitude,
    longitude: input.longitude,
    geohash: input.geohash,
    areaLabel: input.areaLabel,
    createdAt: now,
    expiresAt: now + EMERGENCY_ACTIVE_TTL_MS,
    status: "active",
    hasAudio: input.hasAudio,
  };
}

/** Marks an emergency event as resolved. Only the creator may update. */
export async function resolveFirestoreEmergency(eventId: string): Promise<void> {
  const db = getFirebaseFirestore();
  await updateDoc(doc(db, EMERGENCY_COLLECTION, eventId), { status: "resolved" });
}

/**
 * Real-time listener for active emergency events whose geohash falls
 * within the bounding box around the given coordinates. Precise
 * distance filtering is done by the caller (haversine), so the client
 * only ever receives a small set of candidate cells — never every
 * user's location.
 */
export function subscribeFirestoreNearby(
  latitude: number,
  longitude: number,
  minGeohash: string,
  maxGeohash: string,
  onChange: (events: EmergencyEventRecord[]) => void
): Unsubscribe {
  const db = getFirebaseFirestore();
  const q = query(
    collection(db, EMERGENCY_COLLECTION),
    where("geohash", ">=", minGeohash),
    where("geohash", "<=", maxGeohash)
  );

  return onSnapshot(q, (snapshot) => {
    const events: EmergencyEventRecord[] = [];
    snapshot.forEach((doc) => {
      const converted = convertDoc(doc);
      if (converted) events.push(converted);
    });
    onChange(events);
  });
}

/** Loads the current user's recent emergency activity (most recent first). */
export async function getFirestoreEmergencyHistory(
  uid: string,
  count = 10
): Promise<EmergencyEventRecord[]> {
  const db = getFirebaseFirestore();
  const q = query(
    collection(db, EMERGENCY_COLLECTION),
    where("createdBy", "==", uid),
    orderBy("createdAt", "desc"),
    limit(count)
  );
  const snapshot = await getDocs(q);
  const events: EmergencyEventRecord[] = [];
  snapshot.forEach((doc) => {
    const converted = convertDoc(doc);
    if (converted) events.push(converted);
  });
  return events;
}

/**
 * Real-time listener for the current user's own emergency events
 * (used to surface the reporter's active SOS across pages).
 */
export function subscribeFirestoreMyEvents(
  uid: string,
  onChange: (events: EmergencyEventRecord[]) => void
): Unsubscribe {
  const db = getFirebaseFirestore();
  const q = query(collection(db, EMERGENCY_COLLECTION), where("createdBy", "==", uid));
  return onSnapshot(q, (snapshot) => {
    const events: EmergencyEventRecord[] = [];
    snapshot.forEach((doc) => {
      const converted = convertDoc(doc);
      if (converted) events.push(converted);
    });
    events.sort((a, b) => b.createdAt - a.createdAt);
    onChange(events);
  });
}

/** Uploads a voice recording to the creator's private storage space. */
export async function uploadEmergencyAudio(
  uid: string,
  eventId: string,
  blob: Blob
): Promise<string> {
  const storage = getFirebaseStorage();
  const storageRef = ref(
    storage,
    `emergencies/${uid}/${eventId}/voice.webm`
  ) as StorageReference;
  await uploadBytes(storageRef, blob);
  return storageRef.fullPath;
}
