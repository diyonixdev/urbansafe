import type { EmergencyTypeInfo } from "./emergency-types";

/**
 * Emergency system configuration.
 *
 * NEARBY RADIUS — the distance within which other UrbanSafe users are
 * notified of an emergency. Configurable at deployment time through
 * NEXT_PUBLIC_EMERGENCY_RADIUS_METERS (or by changing the default
 * below). Nothing is hard-coded to a specific city or area.
 */
export const EMERGENCY_NEARBY_RADIUS_METERS = (() => {
  const fromEnv = Number(process.env.NEXT_PUBLIC_EMERGENCY_RADIUS_METERS);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;
  return 2000;
})();

/** Active emergency events expire after this long. */
export const EMERGENCY_ACTIVE_TTL_MS = 60 * 60 * 1000;

/** The optional emergency types a reporter may select. */
export const EMERGENCY_TYPES: EmergencyTypeInfo[] = [
  { id: "general", label: "General Emergency", emoji: "🚨" },
  { id: "accident", label: "Accident", emoji: "⚠️" },
  { id: "medical", label: "Medical", emoji: "🆘" },
  { id: "personal_safety", label: "Personal Safety", emoji: "🔴" },
  { id: "fire", label: "Fire", emoji: "🔥" },
  { id: "road", label: "Road Emergency", emoji: "🚗" },
  { id: "other", label: "Other", emoji: "📢" },
];

export function getEmergencyTypeLabel(id: string): string {
  return EMERGENCY_TYPES.find((type) => type.id === id)?.label ?? "Emergency";
}

/** Display label used in map markers and popups. */
export function getEmergencyTypeEmoji(id: string): string {
  return EMERGENCY_TYPES.find((type) => type.id === id)?.emoji ?? "🚨";
}
