/** The default plan assigned to every new user. */
export const DEFAULT_PLAN = "Free" as const;

/**
 * Firestore document shape for the `users` collection.
 * `createdAt` is a server timestamp (see FirestoreUserDocument).
 */
export interface FirestoreUser {
  uid: string;
  name: string;
  username: string;
  email: string;
  photoURL: string;
  bio: string;
  createdAt: Date | null;
  repositoriesCount: number;
  followers: number;
  following: number;
  starsReceived: number;
  plan: string;
  verified: boolean;
}

/** Raw document as stored in Firestore (createdAt is a server timestamp). */
export interface FirestoreUserDocument {
  uid: string;
  name: string;
  username: string;
  email: string;
  photoURL: string;
  bio: string;
  createdAt: unknown;
  repositoriesCount: number;
  followers: number;
  following: number;
  starsReceived: number;
  plan: string;
  verified: boolean;
}

/** Firestore document shape for the `repositories` collection (reserved for later phases). */
export interface FirestoreRepository {
  id: string;
  ownerUid: string;
  name: string;
  description: string;
  visibility: "public" | "private";
  starsCount: number;
  forksCount: number;
  createdAt: unknown;
  updatedAt: unknown;
}

/** Initial profile payload created right after authentication. */
export type CreateUserProfileInput = Pick<
  FirestoreUserDocument,
  "uid" | "name" | "username" | "email"
> &
  Partial<Pick<FirestoreUserDocument, "photoURL" | "bio">>;
