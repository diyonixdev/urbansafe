"use client";

import type { ReactNode } from "react";
import Link from "next/link";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

/**
 * Shared frame for the login/signup pages, styled with the
 * Aegis AI visual language (glass panels, neon accents, mono labels).
 */
export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="min-h-screen relative overflow-hidden bg-background text-on-surface flex items-center justify-center px-4 py-12">
      {/* Ambient glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[400px] bg-neon-cyan/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-neon-purple/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-0 left-0 w-[300px] h-[300px] bg-electric-blue/10 rounded-full blur-[120px] pointer-events-none" />

      {/* HUD accent lines */}
      <div className="absolute top-8 left-8 hidden md:flex flex-col gap-1 font-code-sm text-neon-cyan/50 uppercase tracking-[0.2em] text-[10px] pointer-events-none">
        <span>Secure Channel</span>
        <span className="hud-line" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="glass-panel rounded-2xl p-8 md:p-10 relative overflow-hidden flex flex-col gap-6">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-neon-cyan to-transparent opacity-70" />

          {/* Brand */}
          <div className="flex flex-col items-center gap-4 text-center">
            <Link
              href="/"
              className="w-11 h-11 rounded-lg bg-neon-cyan/20 border border-neon-cyan/60 flex items-center justify-center glow-cyan hover-target"
              aria-label="Back to home"
            >
              <span className="w-2.5 h-2.5 bg-neon-cyan rounded-full animate-pulse" />
            </Link>
            <div className="flex flex-col gap-1.5">
              <p className="font-code-sm text-neon-cyan uppercase tracking-[0.3em] text-glow text-xs">
                Aegis AI
              </p>
              <h1 className="font-display-lg-mobile text-3xl md:text-4xl font-bold text-white tracking-tight">
                {title}
              </h1>
              <p className="font-body-md text-on-surface-variant/70 text-sm max-w-sm">
                {subtitle}
              </p>
            </div>
          </div>

          {children}

          {footer}
        </div>
      </div>
    </div>
  );
}
