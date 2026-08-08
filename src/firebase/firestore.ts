import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  updateDoc,
  type DocumentReference,
  type Transaction,
} from "firebase/firestore";
import { getFirebaseFirestore } from "./config";
import type {
  CreateUserProfileInput,
  FirestoreUserDocument,
} from "./types";

export const COLLECTIONS = {
  users: "users",
  repositories: "repositories",
} as const;

export function userDocRef(uid: string): DocumentReference {
  return doc(getFirebaseFirestore(), COLLECTIONS.users, uid);
}

export function repositoryDocRef(id: string): DocumentReference {
  return doc(getFirebaseFirestore(), COLLECTIONS.repositories, id);
}

/**
 * Returns the user profile document for the given uid,
 * or null when it does not exist.
 */
export async function getUserProfile(
  uid: string
): Promise<FirestoreUserDocument | null> {
  const snapshot = await getDoc(userDocRef(uid));
  if (!snapshot.exists()) return null;
  return snapshot.data() as FirestoreUserDocument;
}

/**
 * Creates the user profile document for the given uid if one does not
 * already exist. Uses a transaction to guarantee a document is never
 * created twice, even when invoked concurrently.
 *
 * Returns the created profile, or the existing profile when one already exists.
 */
export async function createUserProfileIfMissing(
  input: CreateUserProfileInput
): Promise<FirestoreUserDocument> {
  const db = getFirebaseFirestore();
  const ref = userDocRef(input.uid);

  const defaultProfile: FirestoreUserDocument = {
    uid: input.uid,
    name: input.name,
    username: input.username,
    email: input.email,
    photoURL: input.photoURL ?? "",
    bio: input.bio ?? "",
    createdAt: serverTimestamp(),
    repositoriesCount: 0,
    followers: 0,
    following: 0,
    starsReceived: 0,
    plan: "Free",
    verified: false,
  };

  await runTransaction(db, async (transaction: Transaction) => {
    const existing = await transaction.get(ref);
    if (!existing.exists()) {
      transaction.set(ref, defaultProfile);
    }
  });

  const snapshot = await getDoc(ref);
  return snapshot.data() as FirestoreUserDocument;
}

/**
 * Ensures a user profile exists for the given uid. Equivalent to
 * createUserProfileIfMissing, but tolerates the profile being created
 * between the check and the write by re-running the transaction.
 */
export async function ensureUserProfile(
  input: CreateUserProfileInput
): Promise<FirestoreUserDocument> {
  return createUserProfileIfMissing(input);
}

/** Partially updates a user profile document. */
export async function updateUserProfile(
  uid: string,
  data: Partial<FirestoreUserDocument>
): Promise<void> {
  const db = getFirebaseFirestore();
  await updateDoc(userDocRef(uid), data);
}
