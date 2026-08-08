"use client";

import Link from "next/link";

export default function RepositoriesPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="font-code-sm text-neon-cyan uppercase tracking-[0.3em] text-glow text-xs flex items-center gap-3">
            <span className="w-8 h-[1px] bg-neon-cyan inline-block"></span>
            Data Vault
          </p>
          <h1 className="font-display-lg-mobile text-3xl md:text-4xl font-bold text-white tracking-tight mt-2">
            Repositories
          </h1>
        </div>
        <Link
          href="/create"
          className="hologram-capsule text-neon-cyan px-5 py-2 font-data-label font-bold tracking-widest text-[11px] flex items-center gap-2 hover-target"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          NEW REPOSITORY
        </Link>
      </div>

      <div className="glass-panel rounded-2xl p-10 relative overflow-hidden flex flex-col items-center gap-4 text-center">
        <span className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-neon-cyan to-transparent" />
        <span className="w-14 h-14 rounded-xl bg-neon-cyan/10 border border-neon-cyan/40 text-neon-cyan flex items-center justify-center text-glow">
          <span className="material-symbols-outlined text-3xl">database</span>
        </span>
        <h2 className="font-headline-md text-xl text-white tracking-tight">
          No repositories yet
        </h2>
        <p className="font-body-md text-on-surface-variant/70 text-sm max-w-md">
          The repository storage layer is provisioned and awaiting deployment.
          Create your first one when the create flow goes live.
        </p>
        <Link
          href="/create"
          className="hologram-capsule text-neon-cyan px-6 py-2.5 font-data-label font-bold tracking-widest text-[11px] flex items-center gap-2 hover-target mt-2"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          DEPLOY FIRST REPOSITORY
        </Link>
      </div>
    </div>
  );
}
