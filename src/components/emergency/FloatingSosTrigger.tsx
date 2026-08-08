"use client";

import { useRef, useState } from "react";
import { AlertOctagon } from "lucide-react";
import { useEmergency } from "./EmergencyProvider";

const TRIGGER_HOLD_MS = 900;

/**
 * Small persistent emergency control available on every authenticated
 * page. It opens the Emergency SOS interface — it never sends an alert
 * by itself. A deliberate press-and-hold (or a plain tap on this tiny,
 * dedicated control) is required, so normal taps and scrolling on the
 * rest of the app can never trigger SOS.
 */
export function FloatingSosTrigger() {
  const { openSos } = useEmergency();
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);

  const stopHold = () => {
    setProgress(0);
    startRef.current = null;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const beginHold = () => {
    if (startRef.current !== null) return;
    startRef.current = performance.now();
    const tick = (now: number) => {
      if (startRef.current === null) return;
      const elapsed = now - startRef.current;
      const next = Math.min(1, elapsed / TRIGGER_HOLD_MS);
      setProgress(next);
      if (next >= 1) {
        stopHold();
        suppressClickRef.current = true;
        openSos("quick");
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const handleClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    openSos("quick");
  };

  return (
    <button
      type="button"
      className="em-float-trigger"
      aria-label="Open emergency SOS"
      title="Emergency SOS — tap or press and hold"
      onPointerDown={beginHold}
      onPointerUp={stopHold}
      onPointerLeave={stopHold}
      onPointerCancel={stopHold}
      onClick={handleClick}
      onContextMenu={(event) => event.preventDefault()}
    >
      <AlertOctagon size={17} />
      {progress > 0 && <span className="em-float-ring" style={{ ["--ring" as string]: `${progress * 360}deg` }} />}
    </button>
  );
}
