import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "./config";

/**
 * Creates a new account with email + password.
 * Returns the authenticated user.
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  name?: string
): Promise<User> {
  const userCredential = await createUserWithEmailAndPassword(
    getFirebaseAuth(),
    email,
    password
  );

  if (name) {
    await updateProfile(userCredential.user, { displayName: name });
  }

  return userCredential.user;
}

/** Signs in an existing user with email + password. */
export async function logInWithEmail(email: string, password: string): Promise<User> {
  const userCredential = await signInWithEmailAndPassword(
    getFirebaseAuth(),
    email,
    password
  );
  return userCredential.user;
}

/** Signs in with a Google popup. */
export async function logInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const userCredential = await signInWithPopup(getFirebaseAuth(), provider);
  return userCredential.user;
}

/** Signs out the current user. */
export async function logOut(): Promise<void> {
  await signOut(getFirebaseAuth());
}

/** Sends a password reset email. */
export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(getFirebaseAuth(), email);
}

/**
 * Subscribes to authentication state changes.
 * Returns an unsubscribe function. Persists login state across refreshes.
 */
export function subscribeToAuthChanges(
  onChange: (user: User | null) => void
): () => void {
  return onAuthStateChanged(getFirebaseAuth(), onChange);
}
