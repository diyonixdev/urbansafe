"use client";

/**
 * useJourneyMonitoring — continuous journey safety monitoring.
 *
 * Lifecycle:
 *   - GPS watching starts only when a journey config and signed-in user exist.
 *   - Monitoring is torn down when the journey ends, is cancelled,
 *     the user logs out, or the hook unmounts.
 *
 * Dwell detection:
 *   - Entering a danger-zone influence area starts a dwell window.
 *   - A safety check is shown only after the configured dwell duration
 *     while the user remains effectively stationary.
 *   - Each zone has a cooldown after a prompt.
 *
 * Emergency integration:
 *   - "I Need Help" uses the existing sendSos() pipeline.
 *   - SOS is locked to one successful request per journey.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

import { useEmergency } from "@/components/emergency/EmergencyProvider";
import { nearestZone, type DangerZone } from "@/services/dangerZones";

import {
  JOURNEY_ALERT_COOLDOWN_MS,
  JOURNEY_DESTINATION_REACHED_METERS,
  JOURNEY_DRIFT_LIMIT_METERS,
  JOURNEY_DWELL_THRESHOLD_MS,
  JOURNEY_STATIONARY_SPEED_MS,
  JOURNEY_TICK_MS,
  JOURNEY_ZONE_APPROACH_MARGIN_METERS,
} from "@/services/journey-config";

import type { EmergencyEventRecord } from "@/services/emergency-types";
import { haversineMeters } from "@/lib/geo";
import type { RouteMetrics } from "@/utils/routeScoring";

export type JourneyStatus =
  | "idle"
  | "active"
  | "near"
  | "prompt_shown"
  | "help"
  | "safe"
  | "complete"
  | "cancelled";

export interface JourneyConfig {
  route: RouteMetrics;
  destination: {
    latitude: number;
    longitude: number;
  };
}

export interface UserPositionFix {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

export interface JourneyMonitoringResult {
  status: JourneyStatus;
  userPosition: UserPositionFix | null;
  nearZone: DangerZone | null;
  promptZone: DangerZone | null;
  dwellElapsedMs: number;
  isStationary: boolean;
  journeyElapsedMs: number;
  locationDenied: boolean;
  canRequestHelp: boolean;
  helpSending: boolean;
  helpEvent: EmergencyEventRecord | null;
  dismissPrompt: () => void;
  requestHelp: () => Promise<void>;
  acknowledgeHelp: () => void;
  endJourney: () => void;
}

interface DwellState {
  zoneId: string | null;
  since: number;
  drift: number;
  lastLat: number;
  lastLng: number;
  lastTs: number;
}

const EMPTY_DWELL: DwellState = {
  zoneId: null,
  since: 0,
  drift: 0,
  lastLat: 0,
  lastLng: 0,
  lastTs: 0,
};

export function useJourneyMonitoring(
  config: JourneyConfig | null,
  uid: string | null
): JourneyMonitoringResult {
  const { sendSos, sending } = useEmergency();

  const [status, setStatus] = useState<JourneyStatus>("idle");
  const [userPosition, setUserPosition] =
    useState<UserPositionFix | null>(null);
  const [nearZone, setNearZone] = useState<DangerZone | null>(null);
  const [promptZone, setPromptZone] = useState<DangerZone | null>(null);
  const [dwellElapsedMs, setDwellElapsedMs] = useState(0);
  const [isStationary, setIsStationary] = useState(false);
  const [journeyElapsedMs, setJourneyElapsedMs] = useState(0);
  const [locationDenied, setLocationDenied] = useState(false);
  const [helpEvent, setHelpEvent] =
    useState<EmergencyEventRecord | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const tickIdRef = useRef<number | null>(null);

  const startedAtRef = useRef<number | null>(null);

  const dwellRef = useRef<DwellState>({
    ...EMPTY_DWELL,
  });

  const dismissedUntilRef = useRef<Record<string, number>>({});

  const helpLockedRef = useRef(false);

  const notificationAskedRef = useRef(false);

  const configRef = useRef<JourneyConfig | null>(config);
  configRef.current = config;

  const statusRef = useRef<JourneyStatus>("idle");
  statusRef.current = status;

  const promptZoneRef = useRef<DangerZone | null>(null);
  promptZoneRef.current = promptZone;

  /**
   * Stops GPS + interval monitoring.
   */
  const clearMonitoring = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (tickIdRef.current !== null) {
      window.clearInterval(tickIdRef.current);
      tickIdRef.current = null;
    }
  }, []);

  /**
   * Resets the complete monitoring state.
   */
  const stopAndReset = useCallback(() => {
    clearMonitoring();

    helpLockedRef.current = false;
    startedAtRef.current = null;

    dwellRef.current = {
      ...EMPTY_DWELL,
    };

    setStatus("idle");
    setUserPosition(null);
    setNearZone(null);
    setPromptZone(null);
    setDwellElapsedMs(0);
    setIsStationary(false);
    setJourneyElapsedMs(0);
    setLocationDenied(false);
    setHelpEvent(null);
  }, [clearMonitoring]);

  /**
   * Browser notification helper.
   */
  const notifyBrowser = useCallback((zone: DangerZone) => {
    if (
      typeof window === "undefined" ||
      !("Notification" in window)
    ) {
      return;
    }

    const show = () => {
      try {
        new Notification("UrbanSafe — safety check", {
          body: `You've been near a safety-risk area (${zone.reason}) for a while. Are you okay?`,
        });
      } catch {
        // The in-app popup remains the primary UX.
      }
    };

    if (Notification.permission === "granted") {
      show();
      return;
    }

    if (
      Notification.permission === "default" &&
      !notificationAskedRef.current
    ) {
      notificationAskedRef.current = true;

      void Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          show();
        }
      });
    }
  }, []);

  /**
   * Stable identifier for the current journey.
   *
   * This prevents the GPS effect from restarting simply because
   * the parent recreated the config object during a render.
   */
  const journeyKey = useMemo(() => {
    if (!config || !uid) {
      return null;
    }

    return [
      uid,
      config.destination.latitude,
      config.destination.longitude,
      config.route.dangerZones
        .map((zone) => zone.id)
        .sort()
        .join(","),
    ].join("|");
  }, [config, uid]);

  /**
   * Main journey lifecycle.
   */
  useEffect(() => {
    if (!config || !uid || !journeyKey) {
      stopAndReset();
      return;
    }

    if (!("geolocation" in navigator)) {
      setLocationDenied(true);
      setStatus("active");
      return;
    }

    /*
     * Capture the current journey configuration.
     *
     * The ref prevents GPS callbacks from depending on changing
     * React state/objects.
     */
    const journeyConfig = configRef.current;

    if (!journeyConfig) {
      return;
    }

    const zones = journeyConfig.route.dangerZones;
    const destination = journeyConfig.destination;

    startedAtRef.current = Date.now();

    setStatus("active");
    setJourneyElapsedMs(0);

    const handlePosition = (
      position: GeolocationPosition
    ) => {
      const fix: UserPositionFix = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };

      setUserPosition(fix);
      setLocationDenied(false);

      /*
       * Destination reached.
       */
      const destinationDistance = haversineMeters(
        fix.latitude,
        fix.longitude,
        destination.latitude,
        destination.longitude
      );

      if (
        destinationDistance <=
        JOURNEY_DESTINATION_REACHED_METERS
      ) {
        clearMonitoring();

        startedAtRef.current = null;

        setStatus("complete");

        return;
      }

      /*
       * Update dwell movement.
       */
      const dwell = dwellRef.current;

      const moved =
        dwell.lastTs > 0
          ? haversineMeters(
              dwell.lastLat,
              dwell.lastLng,
              fix.latitude,
              fix.longitude
            )
          : 0;

      dwell.lastLat = fix.latitude;
      dwell.lastLng = fix.longitude;
      dwell.lastTs = position.timestamp;

      /*
       * Find nearest safety-risk zone.
       */
      const zone = nearestZone(
        zones,
        fix.latitude,
        fix.longitude,
        JOURNEY_ZONE_APPROACH_MARGIN_METERS
      );

      if (zone) {
        dwell.drift += moved;

        /*
         * Entered a new zone.
         */
        if (dwell.zoneId !== zone.id) {
          dwell.zoneId = zone.id;
          dwell.since = Date.now();
          dwell.drift = 0;

          setDwellElapsedMs(0);

          if (statusRef.current === "active") {
            setStatus("near");
          }
        }

        setNearZone(zone);
      } else {
        /*
         * User left the zone.
         */
        dwell.zoneId = null;
        dwell.since = 0;
        dwell.drift = 0;

        setDwellElapsedMs(0);
        setIsStationary(false);
        setNearZone(null);

        if (statusRef.current === "near") {
          setStatus("active");
        }
      }
    };

    const handleError = (
      error: GeolocationPositionError
    ) => {
      if (
        error.code ===
        error.PERMISSION_DENIED
      ) {
        setLocationDenied(true);
        setDwellElapsedMs(0);
      }
    };

    /*
     * Start GPS watcher.
     */
    watchIdRef.current =
      navigator.geolocation.watchPosition(
        handlePosition,
        handleError,
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 3000,
        }
      );

    /*
     * Periodically evaluate dwell state.
     */
    tickIdRef.current = window.setInterval(() => {
      if (startedAtRef.current !== null) {
        setJourneyElapsedMs(
          Date.now() - startedAtRef.current
        );
      }

      const dwell = dwellRef.current;

      const currentStatus =
        statusRef.current;

      if (
        currentStatus === "prompt_shown" ||
        currentStatus === "help"
      ) {
        return;
      }

      if (
        !dwell.zoneId ||
        dwell.since === 0
      ) {
        return;
      }

      const elapsed =
        Date.now() - dwell.since;

      const speed =
        elapsed > 1000
          ? dwell.drift /
            (elapsed / 1000)
          : Infinity;

      const stationary =
        dwell.drift <=
          JOURNEY_DRIFT_LIMIT_METERS &&
        speed <
          JOURNEY_STATIONARY_SPEED_MS;

      setDwellElapsedMs(elapsed);
      setIsStationary(stationary);

      const zone =
        zones.find(
          (candidate) =>
            candidate.id === dwell.zoneId
        ) ?? null;

      if (!zone) {
        return;
      }

      const now = Date.now();

      /*
       * Dwell requirement not reached.
       */
      if (
        elapsed <
          JOURNEY_DWELL_THRESHOLD_MS ||
        !stationary
      ) {
        return;
      }

      /*
       * Zone is still on cooldown.
       */
      if (
        (dismissedUntilRef.current[
          zone.id
        ] ?? 0) > now
      ) {
        return;
      }

      /*
       * Prompt the user.
       */
      dismissedUntilRef.current[
        zone.id
      ] =
        now +
        JOURNEY_ALERT_COOLDOWN_MS;

      setPromptZone(zone);
      setStatus("prompt_shown");

      notifyBrowser(zone);
    }, JOURNEY_TICK_MS);

    /*
     * Cleanup when journey changes/unmounts.
     */
    return () => {
      clearMonitoring();
    };
  }, [
    journeyKey,
    uid,
    stopAndReset,
    clearMonitoring,
    notifyBrowser,
  ]);

  /**
   * Dismiss safety prompt / mark safe.
   */
  const dismissPrompt = useCallback(() => {
    const zoneId =
      promptZoneRef.current?.id ??
      dwellRef.current.zoneId;

    if (zoneId) {
      dismissedUntilRef.current[
        zoneId
      ] =
        Date.now() +
        JOURNEY_ALERT_COOLDOWN_MS;
    }

    dwellRef.current.zoneId = null;
    dwellRef.current.since = 0;
    dwellRef.current.drift = 0;

    setPromptZone(null);
    setDwellElapsedMs(0);
    setIsStationary(false);
    setStatus("safe");
  }, []);

  /**
   * Close help state and return to active journey.
   */
  const acknowledgeHelp = useCallback(() => {
    setPromptZone(null);
    setStatus("active");
  }, []);

  /**
   * Send SOS through the existing emergency system.
   *
   * Locked so one journey cannot create duplicate SOS requests.
   */
  const requestHelp = useCallback(async () => {
    if (helpLockedRef.current) {
      return;
    }

    if (!uid) {
      toast.error(
        "Please sign in to request help during a journey."
      );
      return;
    }

    helpLockedRef.current = true;

    setStatus("help");

    try {
      const event = await sendSos({
        type: "personal_safety",
        message:
          "Safety check triggered: user has been stationary near a safety-risk area during a journey.",
      });

      setHelpEvent(event);

      toast.success(
        "Help request sent. Nearby UrbanSafe users have been notified."
      );
    } catch (error) {
      /*
       * No successful SOS was created.
       * Allow retry.
       */
      helpLockedRef.current = false;

      toast.error(
        error instanceof Error
          ? error.message
          : "Could not send the help request."
      );
    }
  }, [uid, sendSos]);

  /**
   * Manually end/cancel journey.
   */
  const endJourney = useCallback(() => {
    clearMonitoring();

    startedAtRef.current = null;

    setStatus("cancelled");
  }, [clearMonitoring]);

  /**
   * Memoized public hook result.
   */
  return useMemo<JourneyMonitoringResult>(
    () => ({
      status,
      userPosition,
      nearZone,
      promptZone,
      dwellElapsedMs,
      isStationary,
      journeyElapsedMs,
      locationDenied,
      canRequestHelp: Boolean(uid),
      helpSending: sending,
      helpEvent,
      dismissPrompt,
      requestHelp,
      acknowledgeHelp,
      endJourney,
    }),
    [
      status,
      userPosition,
      nearZone,
      promptZone,
      dwellElapsedMs,
      isStationary,
      journeyElapsedMs,
      locationDenied,
      uid,
      sending,
      helpEvent,
      dismissPrompt,
      requestHelp,
      acknowledgeHelp,
      endJourney,
    ]
  );
}
