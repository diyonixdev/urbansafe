import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

/**
 * Firebase configuration sourced from environment variables.
 * All keys are client-safe and prefixed with NEXT_PUBLIC_.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** True when all required config values have been provided (no placeholders). */
export function isFirebaseConfigured(): boolean {
  return Object.values(firebaseConfig).every(
    (value) =>
      typeof value === "string" &&
      value.trim().length > 0 &&
      !value.includes("your-") &&
      value !== "replace-me"
  );
}

function assertConfigured(): void {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase is not configured. Copy .env.local.example to .env.local and fill in your Firebase web app configuration, then restart the dev server."
    );
  }
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

/** Lazily initializes and returns the Firebase App singleton. */
export function getFirebaseApp(): FirebaseApp {
  assertConfigured();
  if (app) return app;
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  return app;
}

/** Lazily initializes and returns the Auth service singleton. */
export function getFirebaseAuth(): Auth {
  assertConfigured();
  if (auth) return auth;
  auth = getAuth(getFirebaseApp());
  return auth;
}

/** Lazily initializes and returns the Firestore service singleton. */
export function getFirebaseFirestore(): Firestore {
  assertConfigured();
  if (db) return db;
  db = getFirestore(getFirebaseApp());
  return db;
}

/** Lazily initializes and returns the Storage service singleton. */
export function getFirebaseStorage(): FirebaseStorage {
  assertConfigured();
  if (storage) return storage;
  storage = getStorage(getFirebaseApp());
  return storage;
}
