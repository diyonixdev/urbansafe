"use client";

import type { ReactNode } from "react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { PageLoader } from "@/components/ui/PageLoader";

/**
 * Route guard wrapper. Renders a loader while auth state resolves and
 * redirects unauthenticated users to /login.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useRequireAuth();

  if (loading || !user) {
    return <PageLoader />;
  }

  return <>{children}</>;
}
