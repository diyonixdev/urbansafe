"use client";

/** Full-screen loading state used while auth state is being resolved. */
export function PageLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[#02060a] text-on-surface">
      <div className="w-14 h-14 rounded-full border border-neon-cyan/40 relative flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-neon-cyan border-t-transparent animate-spin" />
      </div>
      <p className="font-code-sm text-neon-cyan uppercase tracking-[0.3em] text-xs text-glow animate-pulse">
        Authenticating
      </p>
    </div>
  );
}
