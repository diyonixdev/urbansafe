"use client";

import { useEffect } from "react";
import { AlertOctagon, X } from "lucide-react";
import { useEmergency } from "./EmergencyProvider";
import { EmergencyPanel } from "./EmergencyPanel";

/**
 * Dedicated Emergency SOS interface. Opened from the navbar SOS button,
 * the floating trigger, or the /emergency page.
 */
export function SosModal() {
  const { sosOpen, sosSection, closeSos } = useEmergency();

  useEffect(() => {
    if (!sosOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSos();
    };
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [sosOpen, closeSos]);

  if (!sosOpen) return null;

  return (
    <div className="em-overlay" role="dialog" aria-modal="true" aria-labelledby="em-modal-title">
      <div className="em-backdrop" onClick={closeSos} />
      <div className="em-modal" onMouseDown={(event) => event.stopPropagation()}>
        <header className="em-modal-head">
          <div className="em-modal-title">
            <span className="em-modal-icon"><AlertOctagon size={19} /></span>
            <div>
              <h2 id="em-modal-title">Emergency SOS</h2>
              <p>Tell UrbanSafe what happened and get help quickly.</p>
            </div>
          </div>
          <button type="button" className="em-modal-close" onClick={closeSos} aria-label="Close emergency panel">
            <X size={17} />
          </button>
        </header>
        <div className="em-modal-body">
          <EmergencyPanel key={sosSection} initialSection={sosSection} />
        </div>
      </div>
    </div>
  );
}
