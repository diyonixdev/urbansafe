"use client";

/**
 * Safety-check popup for the Journey Monitoring feature.
 *
 * Appears only after the dwell threshold has been reached while the user
 * is essentially stationary inside/near a heuristic danger zone. Reuses
 * the app's existing emergency overlay visual language (em-* classes).
 */

import { AlertTriangle, CheckCircle2, Loader2, Navigation, PhoneCall } from "lucide-react";
import type { DangerZone } from "@/services/dangerZones";
import type { EmergencyEventRecord } from "@/services/emergency-types";

export interface SafetyCheckModalProps {
  open: boolean;
  zone: DangerZone | null;
  status: "prompt_shown" | "help";
  canRequestHelp: boolean;
  helpSending: boolean;
  helpEvent: EmergencyEventRecord | null;
  onSafe: () => void;
  onHelp: () => void;
  onContinue: () => void;
  onEnd: () => void;
}

export function SafetyCheckModal({
  open,
  zone,
  status,
  canRequestHelp,
  helpSending,
  helpEvent,
  onSafe,
  onHelp,
  onContinue,
  onEnd,
}: SafetyCheckModalProps) {
  if (!open) return null;

  const promptPhase = status === "prompt_shown";
  const failed = status === "help" && !helpSending && !helpEvent;

  return (
    <div className="em-overlay" role="dialog" aria-modal="true" aria-labelledby="jm-safety-title">
      <div className="em-backdrop" />
      <div className="em-modal max-w-[440px]">
        {/* PURPLE accent line */}
        <div className="h-1.5 shrink-0" style={{ background: "linear-gradient(90deg,#ef4444,#f87171,#ef4444)" }} />

        {promptPhase ? (
          <div className="p-6 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <span className="grid place-items-center w-11 h-11 rounded-xl bg-red-500/15 border border-red-500/40 text-red-400 shrink-0">
                <AlertTriangle size={22} />
              </span>
              <div>
                <h2 id="jm-safety-title" className="text-lg font-extrabold text-slate-100 tracking-tight">
                  You&apos;re near a safety-risk area
                </h2>
                <p className="mt-1 text-sm text-slate-400 font-medium">
                  You&apos;ve been here for a while. Are you okay?
                </p>
              </div>
            </div>

            {zone && (
              <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-3 text-xs text-slate-400 font-medium leading-relaxed">
                {zone.reason}
              </div>
            )}
            <p className="text-[11px] font-semibold text-slate-500">
              Heuristic safety estimate based on street-lighting data — not a confirmed incident location.
            </p>

            <div className="flex flex-col gap-2.5 mt-1">
              {!canRequestHelp && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs font-bold text-amber-300">
                  Sign in to let nearby UrbanSafe users know you need help.
                </div>
              )}
              <button
                type="button"
                onClick={onHelp}
                disabled={!canRequestHelp}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-white transition-all active:scale-[0.99] bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PhoneCall size={17} /> I Need Help
              </button>
              <button
                type="button"
                onClick={onSafe}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-slate-200 border border-slate-600 hover:bg-slate-800 transition-colors"
              >
                I&apos;m Safe — Keep Monitoring
              </button>
            </div>
          </div>
        ) : failed ? (
          <div className="p-6 flex flex-col gap-4">
            <h2 id="jm-safety-title" className="text-lg font-extrabold text-red-300 tracking-tight">
              Help request failed
            </h2>
            <p className="text-sm text-slate-400 font-medium">
              The help request could not be sent. You can try again or continue your journey.
            </p>
            <div className="flex flex-col gap-2.5 mt-1">
              <button
                type="button"
                onClick={onHelp}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                <PhoneCall size={17} /> Try Again
              </button>
              <button
                type="button"
                onClick={onContinue}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-slate-200 border border-slate-600 hover:bg-slate-800 transition-colors"
              >
                Back to Monitoring
              </button>
            </div>
          </div>
        ) : helpSending ? (
          <div className="p-6 flex flex-col items-center gap-3 text-center">
            <Loader2 size={28} className="animate-spin text-red-400" />
            <h2 id="jm-safety-title" className="text-lg font-extrabold text-slate-100 tracking-tight">
              Sending help request…
            </h2>
            <p className="text-sm text-slate-400 font-medium">
              Alerting nearby UrbanSafe users with your approximate location.
            </p>
          </div>
        ) : (
          <div className="p-6 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <span className="grid place-items-center w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 shrink-0">
                <CheckCircle2 size={22} />
              </span>
              <div>
                <h2 id="jm-safety-title" className="text-lg font-extrabold text-slate-100 tracking-tight">
                  Help request sent
                </h2>
                <p className="mt-1 text-sm text-slate-400 font-medium">
                  Nearby UrbanSafe users have been notified of your safety check. Your identity and exact location are never shared.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2.5 mt-1">
              <button
                type="button"
                onClick={onContinue}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
              >
                <Navigation size={17} /> Continue Journey
              </button>
              <button
                type="button"
                onClick={onEnd}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-slate-200 border border-slate-600 hover:bg-slate-800 transition-colors"
              >
                End Journey
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}