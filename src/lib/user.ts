import type { CreateUserProfileInput, FirestoreUserDocument } from "@/firebase/types";

/**
 * Builds a URL-safe, lowercase username from a name or email address.
 * Falls back to a random suffix when the source yields nothing usable.
 */
export function generateUsername(name?: string | null, email?: string | null): string {
  const source = (name ?? "").trim().toLowerCase() || (email ?? "").split("@")[0].toLowerCase();

  const cleaned = source
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_.-]/g, "")
    .replace(/[_.-]+/g, "_")
    .replace(/^[_-]+|[_-]+$/g, "")
    .slice(0, 20);

  if (cleaned.length >= 3) {
    return cleaned;
  }

  return `user_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Builds the profile payload used when creating a Firestore user document
 * right after a successful authentication.
 */
export function buildUserProfileInput(
  user: {
    uid: string;
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
  },
  override?: Partial<CreateUserProfileInput>
): CreateUserProfileInput {
  return {
    uid: user.uid,
    name: override?.name ?? user.displayName ?? user.email?.split("@")[0] ?? "User",
    username: override?.username ?? generateUsername(user.displayName, user.email),
    email: user.email ?? "",
    photoURL: override?.photoURL ?? user.photoURL ?? "",
    bio: override?.bio ?? "",
  };
}

/**
 * Application-facing user profile with `createdAt` parsed into a Date.
 */
export type UserProfile = Omit<FirestoreUserDocument, "createdAt"> & {
  createdAt: Date | null;
};

/**
 * Converts a raw Firestore user document into the application-facing
 * UserProfile shape (parsing timestamps into Dates).
 */
export function parseUserProfile(doc: FirestoreUserDocument): UserProfile {
  const createdAt = doc.createdAt as { toDate?: () => Date } | null;
  return {
    ...doc,
    createdAt: createdAt && typeof createdAt.toDate === "function" ? createdAt.toDate() : null,
  };
}
