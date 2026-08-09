"use client";

import { CheckCircle2, Loader2, MapPin, PhoneCall, Radio } from "lucide-react";
import { useEmergency } from "./EmergencyProvider";
import {
  DEMO_LOCATION_LABEL,
  DEMO_NEARBY_USERS,
  formatEmergencySource,
} from "@/services/mock-emergency";

/**
 * The ONE mock emergency flow UI. Rendered by the EmergencyProvider for
 * every activation source (TEXT / PHOTO / VOICE / MANUAL SOS).
 *
 * This is a pure UI simulation: Police 100 and Emergency 112 are
 * SIMULATED states only — no real service is ever contacted.
 */
export function MockEmergencyFlow() {
  const { status, event, pendingSource, confirmMockEmergency, cancelMockEmergency, endEmergency } =
    useEmergency();

  if (status === "IDLE") return null;

  const source = event?.source ?? pendingSource;
  const formattedSource = source ? formatEmergencySource(source) : null;

  const timestampLabel = event?.timestamp
    ? new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;

  /* ---------------------------------------------------------- */
  /* STEP 1 — CONFIRMATION                                       */
  /* ---------------------------------------------------------- */
  if (status === "CONFIRMATION") {
    return (
      <div className="em-overlay em-mock-overlay" role="dialog" aria-modal="true" aria-labelledby="em-mock-confirm-title">
        <div className="em-backdrop" />
        <div className="em-modal em-mock-modal">
          <div className="em-mock-body">
            <div className="em-mock-confirm-icon">⚠️</div>
            <h2 id="em-mock-confirm-title" className="em-mock-confirm-title">Potential Emergency</h2>
            <p className="em-mock-confirm-text">
              You&apos;re about to activate the UrbanSafe emergency demo.
            </p>
            <p className="em-mock-confirm-note">
              This is a simulated emergency flow. No real emergency services will be contacted.
            </p>
            <div className="em-mock-actions">
              <button type="button" className="em-mock-btn-primary" onClick={confirmMockEmergency}>
                Continue Demo
              </button>
              <button type="button" className="em-mock-btn-secondary" onClick={cancelMockEmergency}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------- */
  /* STEP 2 — SOS ACTIVE                                         */
  /* ---------------------------------------------------------- */
  if (status === "SOS_ACTIVE") {
    return (
      <Overlay title="🚨 SOS ACTIVE — DEMO">
        <div className="em-mock-demo-badge">DEMO ONLY · NO REAL EMERGENCY SERVICES CONTACTED</div>
        <div className="em-mock-source-line">Source: <b>{formattedSource}</b></div>
        <MockSpinner />
      </Overlay>
    );
  }

  /* ---------------------------------------------------------- */
  /* STEPS 3/4 — POLICE 100 + EMERGENCY 112 (SIMULATED)          */
  /* ---------------------------------------------------------- */
  if (status === "POLICE_CONNECTING") {
    return (
      <Overlay title="📞 Police 100 — SIMULATING">
        <div className="em-mock-connect-row">
          <PhoneCall size={16} className="em-mock-pulse-icon" />
          <span>Connecting...</span>
        </div>
        <MockSpinner />
      </Overlay>
    );
  }
  if (status === "POLICE_CONNECTED") {
    return (
      <Overlay title="📞 Police 100 — SIMULATED">
        <div className="em-mock-connected"><CheckCircle2 size={16} /> <span>Connected</span></div>
        <MockSpinner />
      </Overlay>
    );
  }
  if (status === "EMERGENCY_RESPONSE_CONNECTING") {
    return (
      <Overlay title="🚨 Emergency Response 112 — SIMULATING">
        <div className="em-mock-connect-row">
          <Radio size={16} className="em-mock-pulse-icon" />
          <span>Connecting...</span>
        </div>
        <MockSpinner />
      </Overlay>
    );
  }
  if (status === "EMERGENCY_RESPONSE_CONNECTED") {
    return (
      <Overlay title="🚨 Emergency Response 112 — SIMULATED">
        <div className="em-mock-connected"><CheckCircle2 size={16} /> <span>Connected</span></div>
        <MockSpinner />
      </Overlay>
    );
  }

  /* ---------------------------------------------------------- */
  /* STEP 5 — LOCATION DEMO                                      */
  /* ---------------------------------------------------------- */
  if (status === "LOCATION_DEMO") {
    return (
      <Overlay title="📍 Location — DEMO">
        <div className="em-mock-demo-badge">Demo Location</div>
        <div className="em-mock-connect-row">
          <MapPin size={16} className="em-mock-pulse-icon" />
          <span>{event?.location ?? DEMO_LOCATION_LABEL}</span>
        </div>
        <MockSpinner />
      </Overlay>
    );
  }

  /* ---------------------------------------------------------- */
  /* STEP 6 — NEARBY USERS DEMO                                  */
  /* ---------------------------------------------------------- */
  if (status === "NEARBY_USERS_DEMO") {
    return (
      <Overlay title="👥 Nearby UrbanSafe Users">
        <div className="em-mock-demo-badge">DEMO NEARBY USER ALERTS</div>
        <p className="em-mock-nearby-count">
          <b>{DEMO_NEARBY_USERS.length}</b> users nearby have been notified.
        </p>
        <div className="em-mock-users">
          {DEMO_NEARBY_USERS.map((user) => (
            <div key={user.id} className="em-mock-user">
              <span className="em-mock-user-dot">🟢</span>
              <div>
                <b>{user.label}</b>
                <span>&quot;{user.note}&quot;</span>
              </div>
            </div>
          ))}
        </div>
        <MockSpinner />
      </Overlay>
    );
  }

  /* ---------------------------------------------------------- */
  /* STEP 7 — EMERGENCY ACTIVE                                   */
  /* ---------------------------------------------------------- */
  if (status === "ACTIVE") {
    return (
      <div className="em-overlay em-mock-overlay" role="dialog" aria-modal="true" aria-labelledby="em-mock-active-title">
        <div className="em-backdrop" />
        <div className="em-modal em-mock-modal">
          <div className="em-mock-body">
            <h2 id="em-mock-active-title" className="em-mock-active-title">🚨 EMERGENCY ACTIVE — DEMO</h2>
            <div className="em-mock-demo-badge">DEMO ONLY · NO REAL EMERGENCY SERVICES CONTACTED</div>
            <ul className="em-mock-summary">
              <li><span>Source:</span><b>{formattedSource}</b></li>
              <li><span>Risk:</span><b>HIGH</b></li>
              <li><span>Status:</span><b>ACTIVE — DEMO</b></li>
              <li><span>Police 100:</span><b>SIMULATED · Connected</b></li>
              <li><span>Emergency 112:</span><b>SIMULATED · Connected</b></li>
              <li><span>Location:</span><b>{event?.location ?? DEMO_LOCATION_LABEL}</b></li>
              <li><span>Nearby users:</span><b>{DEMO_NEARBY_USERS.length} demo users notified</b></li>
              <li><span>Time:</span><b>{timestampLabel ?? "—"}</b></li>
            </ul>
            <button type="button" className="em-mock-end-btn" onClick={endEmergency}>
              🔴 END DEMO CALL
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------- */
  /* FINAL — DEMO ENDED                                          */
  /* ---------------------------------------------------------- */
  return (
    <div className="em-overlay em-mock-overlay" role="dialog" aria-modal="true" aria-labelledby="em-mock-ended-title">
      <div className="em-backdrop" />
      <div className="em-modal em-mock-modal">
        <div className="em-mock-body">
          <div className="em-mock-ended-icon"><CheckCircle2 size={26} /></div>
          <h2 id="em-mock-ended-title" className="em-mock-ended-title">✓ DEMO EMERGENCY ENDED</h2>
          <p className="em-mock-ended-note">No real emergency service was contacted.</p>
          <button type="button" className="em-mock-btn-primary" onClick={cancelMockEmergency}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */

function Overlay({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="em-overlay em-mock-overlay" role="dialog" aria-modal="true" aria-live="assertive">
      <div className="em-backdrop" />
      <div className="em-modal em-mock-modal">
        <div className="em-mock-body">
          <h2 className="em-mock-step-title">{title}</h2>
          {children}
        </div>
      </div>
    </div>
  );
}

function MockSpinner() {
  return <Loader2 size={18} className="em-spin em-mock-spinner" aria-hidden="true" />;
}
