"use client";

/**
 * useJourneyMonitoring — continuous journey safety monitoring.
 *
 * Lifecycle:
 *   - Watching (navigator.geolocation.watchPosition) starts ONLY when a
 *     journey config is supplied AND a user is signed in.
 *   - A short interval re-evaluates dwell state between GPS fixes.
 *   - Everything is torn down when the journey completes, is cancelled,
 *     the user logs out, or the hook unmounts.
 *
 * Dwell detection:
 *   - Entering a zone's influence (radius + approach margin) starts a
 *     dwell window. Accumulated drift inside the zone is tracked.
 *   - The safety check fires only when the user has been inside the zone
 *     for >= JOURNEY_DWELL_THRESHOLD_MS AND has been effectively
 *     stationary (low average speed / bounded drift). Passing through a
 *     zone never triggers the check by itself.
 *   - After a check is shown, the zone enters a cooldown so the user is
 *     not nagged repeatedly.
 *
 * Emergency integration:
 *   - "I Need Help" calls the EXISTING real sendSos() pipeline once per
 *     journey (lock guard). The mock activateEmergency() flow is never
 *     used here.
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
  destination: { latitude: number; longitude: number };
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
  const [userPosition, setUserPosition] = useState<UserPositionFix | null>(null);
  const [nearZone, setNearZone] = useState<DangerZone | null>(null);
  const [promptZone, setPromptZone] = useState<DangerZone | null>(null);
  const [dwellElapsedMs, setDwellElapsedMs] = useState(0);
  const [isStationary, setIsStationary] = useState(false);
  const [journeyElapsedMs, setJourneyElapsedMs] = useState(0);
  const [locationDenied, setLocationDenied] = useState(false);
  const [helpEvent, setHelpEvent] = useState<EmergencyEventRecord | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const tickIdRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const dwellRef = useRef<DwellState>({ ...EMPTY_DWELL });
  const dismissedUntilRef = useRef<Record<string, number>>({});
  const helpLockedRef = useRef(false);
  const notificationAskedRef = useRef(false);

  const configRef = useRef<JourneyConfig | null>(config);
  configRef.current = config;

  const statusRef = useRef<JourneyStatus>("idle");
  statusRef.current = status;

  const promptZoneRef = useRef<DangerZone | null>(null);
  promptZoneRef.current = promptZone;

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

  const stopAndReset = useCallback(() => {
    clearMonitoring();
    helpLockedRef.current = false;
    startedAtRef.current = null;
    dwellRef.current = { ...EMPTY_DWELL };
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

  /* Main lifecycle: start/stop the watcher based on journey + auth. */
  useEffect(() => {
    if (!config || !uid) {
      stopAndReset();
      return;
    }

    if (!("geolocation" in navigator)) {
      setLocationDenied(true);
      setStatus("active");
      return;
    }

    const zones = config.route.dangerZones;
    const destination = config.destination;
    startedAtRef.current = Date.now();
    setStatus("active");

    const handlePosition = (position: GeolocationPosition) => {
      const fix: UserPositionFix = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };
      setUserPosition(fix);
      setLocationDenied(false);

      // Destination reached → stop monitoring.
      if (
        haversineMeters(fix.latitude, fix.longitude, destination.latitude, destination.longitude) <=
        JOURNEY_DESTINATION_REACHED_METERS
      ) {
        clearMonitoring();
        startedAtRef.current = null;
        setStatus("complete");
        return;
      }

      const dwell = dwellRef.current;
      const moved =
        dwell.lastTs > 0
          ? haversineMeters(dwell.lastLat, dwell.lastLng, fix.latitude, fix.longitude)
          : 0;
      dwell.lastLat = fix.latitude;
      dwell.lastLng = fix.longitude;
      dwell.lastTs = position.timestamp;

      const zone = nearestZone(zones, fix.latitude, fix.longitude, JOURNEY_ZONE_APPROACH_MARGIN_METERS);

      if (zone) {
        dwell.drift += moved;
        if (dwell.zoneId !== zone.id) {
          dwell.zoneId = zone.id;
          dwell.since = Date.now();
          dwell.drift = 0;
          setDwellElapsedMs(0);
          if (statusRef.current === "active") setStatus("near");
        }
        setNearZone(zone);
      } else {
        dwell.zoneId = null;
        dwell.since = 0;
        dwell.drift = 0;
        setDwellElapsedMs(0);
        setIsStationary(false);
        setNearZone(null);
        if (statusRef.current === "near") setStatus("active");
      }
    };

    const handleError = (error: GeolocationPositionError) => {
      if (error.code === error.PERMISSION_DENIED) {
        setLocationDenied(true);
        setDwellElapsedMs(0);
      }
    };

    watchIdRef.current = navigator.geolocation.watchPosition(handlePosition, handleError, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 3000,
    });

    tickIdRef.current = window.setInterval(() => {
      if (startedAtRef.current) setJourneyElapsedMs(Date.now() - startedAtRef.current);

      const dwell = dwellRef.current;
      const currentStatus = statusRef.current;
      if (currentStatus === "prompt_shown" || currentStatus === "help") return;
      if (!dwell.zoneId || dwell.since === 0) return;

      const elapsed = Date.now() - dwell.since;
      const speed = elapsed > 1000 ? dwell.drift / (elapsed / 1000) : Infinity;
      const stationary = dwell.drift <= JOURNEY_DRIFT_LIMIT_METERS && speed < JOURNEY_STATIONARY_SPEED_MS;
      setDwellElapsedMs(elapsed);
      setIsStationary(stationary);

      const zone = zones.find((candidate) => candidate.id === dwell.zoneId) ?? null;
      if (!zone) return;
      const now = Date.now();
      if (elapsed < JOURNEY_DWELL_THRESHOLD_MS || !stationary) return;
      if ((dismissedUntilRef.current[zone.id] ?? 0) > now) return;

      // Prompt shown → cooldown starts now so the same zone stays quiet
      // whether the user dismisses or the popup is otherwise closed.
      dismissedUntilRef.current[zone.id] = now + JOURNEY_ALERT_COOLDOWN_MS;
      setPromptZone(zone);
      setStatus("prompt_shown");
      notifyBrowser(zone);
    }, JOURNEY_TICK_MS);

    return () => {
      clearMonitoring();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, uid, clearMonitoring, stopAndReset]);

  const notifyBrowser = useCallback((zone: DangerZone) => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const show = () => {
      try {
        new Notification("UrbanSafe — safety check", {
          body: `You've been near a safety-risk area (${zone.reason}) for a while. Are you okay?`,
        });
      } catch {
        // In-app popup remains the primary UX.
      }
    };
    if (Notification.permission === "granted") {
      show();
    } else if (Notification.permission === "default" && !notificationAskedRef.current) {
      notificationAskedRef.current = true;
      void Notification.requestPermission().then((permission) => {
        if (permission === "granted") show();
      });
    }
  }, []);

  const dismissPrompt = useCallback(() => {
    const zoneId = promptZoneRef.current?.id ?? dwellRef.current.zoneId;
    if (zoneId) {
      dismissedUntilRef.current[zoneId] = Date.now() + JOURNEY_ALERT_COOLDOWN_MS;
    }
    dwellRef.current.zoneId = null;
    dwellRef.current.since = 0;
    dwellRef.current.drift = 0;
    setPromptZone(null);
    setDwellElapsedMs(0);
    setStatus("safe");
  }, []);

  const acknowledgeHelp = useCallback(() => {
    setPromptZone(null);
    setStatus("active");
  }, []);

  const requestHelp = useCallback(async () => {
    if (helpLockedRef.current) return;
    if (!uid) {
      toast.error("Please sign in to request help during a journey.");
      return;
    }
    helpLockedRef.current = true;
    setStatus("help");
    try {
      const event = await sendSos({
        type: "personal_safety",
        message: "Safety check triggered: user has been stationary near a safety-risk area during a journey.",
      });
      setHelpEvent(event);
      toast.success("Help request sent. Nearby UrbanSafe users have been notified.");
    } catch (error) {
      // Nothing was created — allow one retry from the popup.
      helpLockedRef.current = false;
      toast.error(error instanceof Error ? error.message : "Could not send the help request.");
    }
  }, [uid, sendSos]);

  const endJourney = useCallback(() => {
    clearMonitoring();
    startedAtRef.current = null;
    setStatus("cancelled");
  }, [clearMonitoring]);

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