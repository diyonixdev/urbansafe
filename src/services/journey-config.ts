/**
 * Journey Monitoring configuration.
 *
 * Every threshold is configurable at deployment/dev time through
 * NEXT_PUBLIC_JOURNEY_* environment variables. For development you can
 * shorten the dwell threshold, e.g.:
 *
 *   NEXT_PUBLIC_JOURNEY_DWELL_MS=30000
 *
 * so the safety check can be exercised in ~30 seconds instead of the
 * product default of 10 minutes.
 */

function envMs(name: string, fallback: number): number {
  const fromEnv = Number(process.env[name]);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;
  return fallback;
}

/** How long a user must remain essentially stationary inside/near a
 * danger zone before the safety check appears. Default: 10 minutes. */
export const JOURNEY_DWELL_THRESHOLD_MS = envMs(
  "NEXT_PUBLIC_JOURNEY_DWELL_MS",
  10 * 60 * 1000
);

/** After a safety check is shown (and dismissed or answered), the same
 * zone stays silent for this long to avoid repeated nagging. */
export const JOURNEY_ALERT_COOLDOWN_MS = envMs(
  "NEXT_PUBLIC_JOURNEY_ALERT_COOLDOWN_MS",
  5 * 60 * 1000
);

/** Interval used to re-evaluate dwell state between GPS fixes. */
export const JOURNEY_TICK_MS = envMs("NEXT_PUBLIC_JOURNEY_TICK_MS", 5000);

/** Average speed (m/s) below which the user is treated as stationary.
 * A slow walker (~1.2 m/s) is still "moving through"; a user standing
 * or wandering in place (~0.2 m/s) is stopped. */
export const JOURNEY_STATIONARY_SPEED_MS = envMs(
  "NEXT_PUBLIC_JOURNEY_STATIONARY_SPEED_MS",
  0.6
);

/** Total accumulated movement allowed while inside a zone before the
 * dwell timer resets. Deliberately generous (zone radius + margin) so a
 * normal GPS wobble or a short 25 m step does NOT reset the timer. */
export const JOURNEY_DRIFT_LIMIT_METERS = envMs(
  "NEXT_PUBLIC_JOURNEY_DRIFT_LIMIT_METERS",
  220
);

/** Distance beyond a zone's radius within which the user counts as
 * being near the zone. */
export const JOURNEY_ZONE_APPROACH_MARGIN_METERS = envMs(
  "NEXT_PUBLIC_JOURNEY_ZONE_APPROACH_MARGIN_METERS",
  40
);

/** Distance from the destination that completes the journey. */
export const JOURNEY_DESTINATION_REACHED_METERS = envMs(
  "NEXT_PUBLIC_JOURNEY_DESTINATION_REACHED_METERS",
  60
);

/* ------------------------------------------------------------------ */
/* Danger-zone derivation (used once per route analysis)               */
/* ------------------------------------------------------------------ */

/** Corridor width around the route used to keep danger zones relevant. */
export const JOURNEY_ZONE_CORRIDOR_METERS = envMs(
  "NEXT_PUBLIC_JOURNEY_ZONE_CORRIDOR_METERS",
  150
);

/** Default radius of a heuristic danger zone. */
export const JOURNEY_ZONE_RADIUS_METERS = envMs(
  "NEXT_PUBLIC_JOURNEY_ZONE_RADIUS_METERS",
  100
);

/** Minimum spacing between two distinct danger zones (keeps the map
 * readable instead of painting the corridor solid red). */
export const JOURNEY_ZONE_MIN_SPACING_METERS = envMs(
  "NEXT_PUBLIC_JOURNEY_ZONE_MIN_SPACING_METERS",
  180
);

/** Maximum number of danger zones rendered for one route. */
export const JOURNEY_MAX_ZONES = (() => {
  const fromEnv = Number(process.env.NEXT_PUBLIC_JOURNEY_MAX_ZONES);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return Math.min(20, Math.floor(fromEnv));
  return 6;
})();