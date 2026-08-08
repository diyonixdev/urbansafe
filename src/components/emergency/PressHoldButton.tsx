"use client";

import { useEffect, useRef, useState } from "react";

interface PressHoldButtonProps {
  /** How long (ms) the button must be held to complete. */
  holdDurationMs?: number;
  label: string;
  subLabel?: string;
  onComplete: () => void;
  onCancel?: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Deliberate press-and-hold interaction used for emergency activation.
 * A single tap does nothing — the user must hold for the full duration,
 * with a live progress fill, to trigger the callback. Releasing early
 * cancels. This prevents accidental SOS activation.
 */
export function PressHoldButton({
  holdDurationMs = 2000,
  label,
  subLabel = "Release to cancel",
  onComplete,
  onCancel,
  disabled = false,
  className = "",
}: PressHoldButtonProps) {
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const stopHold = () => {
    if (holding) onCancel?.();
    setHolding(false);
    setProgress(0);
    startRef.current = null;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const beginHold = () => {
    if (disabled || holding) return;
    setHolding(true);
    startRef.current = performance.now();

    const tick = (now: number) => {
      if (startRef.current === null) return;
      const elapsed = now - startRef.current;
      const next = Math.min(1, elapsed / holdDurationMs);
      setProgress(next);
      if (next >= 1) {
        setHolding(false);
        setProgress(0);
        startRef.current = null;
        onComplete();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={label}
      onPointerDown={beginHold}
      onPointerUp={stopHold}
      onPointerLeave={stopHold}
      onPointerCancel={stopHold}
      onContextMenu={(event) => event.preventDefault()}
      className={`em-hold ${className} ${holding ? "em-hold-active" : ""}`}
      style={{ ["--hold-progress" as string]: `${progress * 100}%` }}
    >
      <span className="em-hold-track" />
      <span className="em-hold-content">
        <b>{holding ? label : label}</b>
        {subLabel && <small>{holding ? subLabel : "Press and hold"}</small>}
      </span>
    </button>
  );
}
