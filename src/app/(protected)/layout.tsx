"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";

/**
 * Layout for all authenticated routes (/dashboard, /profile,
 * /repositories, /create). Redirects unauthenticated users to /login.
 */
export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <ProtectedShell>{children}</ProtectedShell>
    </ProtectedRoute>
  );
}

function ProtectedShell({ children }: { children: ReactNode }) {
  const { user, profile, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/repositories", label: "Repositories" },
    { href: "/create", label: "Create" },
    { href: "/profile", label: "Profile" },
  ];

  const displayName = profile?.name ?? user?.displayName ?? "Operator";
  const initial = (displayName.charAt(0) ?? "O").toUpperCase();

  const handleLogout = async () => {
    await logout();
    router.replace("/");
  };

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col selection:bg-neon-cyan/30 selection:text-white">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-neon-cyan/20 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto h-16 px-6 flex items-center justify-between gap-6">
          <Link
            href="/"
            className="flex items-center gap-3 hover-target"
            aria-label="Back to landing"
          >
            <span className="w-8 h-8 rounded-lg bg-neon-cyan/20 border border-neon-cyan/60 flex items-center justify-center glow-cyan">
              <span className="w-2 h-2 bg-neon-cyan rounded-full animate-pulse" />
            </span>
            <span className="font-display-lg text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-electric-blue text-glow text-lg font-bold tracking-tight hidden sm:inline">
              AEGIS AI
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 font-data-label text-data-label">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 text-xs tracking-wider rounded-md transition-colors duration-200 hover-target ${
                    isActive
                      ? "text-neon-cyan font-bold border border-neon-cyan/40 bg-neon-cyan/10"
                      : "text-on-surface-variant/60 hover:text-neon-cyan"
                  }`}
                >
                  {item.label.toUpperCase()}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="hidden lg:block font-code-sm text-on-surface-variant/60 text-[11px] uppercase tracking-widest">
                {user?.email}
              </span>
              <span className="w-9 h-9 rounded-full bg-gradient-to-tr from-electric-blue to-neon-cyan p-[1px]">
                <span className="w-full h-full rounded-full bg-background flex items-center justify-center text-xs font-bold text-neon-cyan">
                  {initial}
                </span>
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="hologram-capsule text-[#ff4d67] px-5 py-2 font-data-label tracking-widest text-[11px] flex items-center gap-2 hover-target"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
              <span className="hidden sm:inline">LOG OUT</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 z-10">
        {children}
      </main>
    </div>
  );
}
