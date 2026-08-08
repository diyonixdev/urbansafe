"use client";

import { useAuthContext } from "@/context/AuthContext";
import type { AuthContextValue } from "@/context/AuthContext";

/** Accesses the auth context inside a client component. */
export function useAuth(): AuthContextValue {
  return useAuthContext();
}
