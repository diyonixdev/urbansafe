"use client";

import type { ReactNode } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { UrbanSafeNavbar } from "@/components/layouts/UrbanSafeNavbar";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return <ProtectedRoute><div className="urban-app-shell"><UrbanSafeNavbar /><main className="urban-app-content">{children}</main></div></ProtectedRoute>;
}
