"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export default function DashboardPage() {
  const { user, profile, profileLoading } = useAuth();

  const displayName = profile?.name ?? user?.displayName ?? "Operator";
  const username = profile?.username ?? "…";
  const plan = profile?.plan ?? "Free";
  const verified = profile?.verified ?? false;

  const stats = [
    { label: "Repositories", value: profile?.repositoriesCount ?? 0 },
    { label: "Followers", value: profile?.followers ?? 0 },
    { label: "Following", value: profile?.following ?? 0 },
    { label: "Stars Received", value: profile?.starsReceived ?? 0 },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Welcome header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 fade-up visible">
        <div>
          <p className="font-code-sm text-neon-cyan uppercase tracking-[0.3em] text-glow text-xs flex items-center gap-3">
            <span className="w-8 h-[1px] bg-neon-cyan inline-block"></span>
            System Online
          </p>
          <h1 className="font-display-lg-mobile text-3xl md:text-5xl font-bold text-white tracking-tight mt-2">
            Welcome back,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan via-electric-blue to-neon-purple">
              {displayName}
            </span>
          </h1>
          <p className="font-code-sm text-on-surface-variant/60 text-xs mt-2 uppercase tracking-widest">
            @{username} {verified && "· VERIFIED"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="glass-panel rounded-full px-4 py-2 font-data-label tracking-widest text-[11px] text-neon-cyan">
            PLAN: {plan.toUpperCase()}
          </span>
          <Link
            href="/create"
            className="hologram-capsule text-neon-cyan px-5 py-2 font-data-label font-bold tracking-widest text-[11px] flex items-center gap-2 hover-target"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            NEW REPOSITORY
          </Link>
        </div>
      </div>

      {/* Profile loading indicator */}
      {profileLoading && (
        <p className="font-code-sm text-on-surface-variant/50 text-[11px] uppercase tracking-widest animate-pulse">
          Synchronizing profile…
        </p>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="glass-panel rounded-2xl p-6 flex flex-col gap-2 relative overflow-hidden hologram-flicker"
          >
            <span className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-neon-cyan/50 to-transparent" />
            <span className="font-code-sm text-on-surface-variant/60 uppercase tracking-[0.2em] text-[10px]">
              {stat.label}
            </span>
            <span className="font-display-lg text-4xl text-white font-bold text-glow">
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      {/* Placeholder for Phase 3 content */}
      <div className="glass-panel rounded-2xl p-8 relative overflow-hidden flex flex-col gap-3">
        <span className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-neon-cyan to-transparent" />
        <h2 className="font-headline-md text-xl text-white tracking-tight">
          Command Center
        </h2>
        <p className="font-body-md text-on-surface-variant/70 text-sm max-w-xl">
          Your workspace is ready. Repositories, telemetry and live monitoring
          modules are being deployed in the next phase.
        </p>
        <div className="flex gap-4 mt-2">
          <Link
            href="/repositories"
            className="font-code-sm text-neon-cyan hover:text-white transition-colors uppercase tracking-widest text-xs hover-target"
          >
            View Repositories →
          </Link>
          <Link
            href="/profile"
            className="font-code-sm text-neon-cyan hover:text-white transition-colors uppercase tracking-widest text-xs hover-target"
          >
            Edit Profile →
          </Link>
        </div>
      </div>
    </div>
  );
}
