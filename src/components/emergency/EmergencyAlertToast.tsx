"use client";

import { AlertOctagon, MapPin } from "lucide-react";
import { getEmergencyTypeLabel } from "@/services/emergency-config";
import { formatDistance, timeAgo } from "@/lib/geo";
import type { NearbyEmergency } from "@/services/emergency-types";

interface EmergencyAlertToastProps {
  event: NearbyEmergency;
  onView: () => void;
  onDismiss: () => void;
}

/**
 * Compact in-app notification shown when an emergency is reported by a
 * nearby UrbanSafe user. Shows only what is necessary — type,
 * approximate distance and time — never the reporter's identity.
 */
export function EmergencyAlertToast({ event, onView, onDismiss }: EmergencyAlertToastProps) {
  const typeLabel = getEmergencyTypeLabel(event.type);
  const distance =
    event.distanceMeters !== null ? `Approximately ${formatDistance(event.distanceMeters)} away` : "Nearby";

  return (
    <div className="em-toast" role="alert" onMouseDown={(e) => e.stopPropagation()}>
      <div className="em-toast-head">
        <span className="em-toast-icon"><AlertOctagon size={16} /></span>
        <div>
          <b>🚨 Emergency nearby</b>
          <p>An emergency has been reported nearby.</p>
        </div>
      </div>

      <div className="em-toast-body">
        <span><i>Type:</i> <b>{typeLabel}</b></span>
        <span><i>Distance:</i> <b>{distance}</b></span>
        <span><i>Time:</i> <b>{timeAgo(event.createdAt)}</b></span>
      </div>

      <div className="em-toast-actions">
        <button type="button" className="em-toast-view" onClick={onView}>
          <MapPin size={13} /> View on Safety Map
        </button>
        <button type="button" className="em-toast-safe" onClick={onDismiss}>I&apos;m Safe</button>
      </div>
    </div>
  );
}
