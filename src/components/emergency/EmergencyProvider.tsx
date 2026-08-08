"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  createEmergency,
  getMyLocation,
  isEmergencyBackendConfigured,
  resolveEmergency,
  subscribeMyEvents,
  subscribeNearbyEmergencies,
  type NearbySubscriptionOptions,
} from "@/services/emergency";
import { getEmergencyTypeLabel } from "@/services/emergency-config";
import { formatDistance, timeAgo } from "@/lib/geo";
import type {
  CreateEmergencyInput,
  EmergencyEventRecord,
  EmergencyLocation,
  NearbyEmergency,
} from "@/services/emergency-types";
import { SosModal } from "./SosModal";
import { EmergencyAlertToast } from "./EmergencyAlertToast";
import { FloatingSosTrigger } from "./FloatingSosTrigger";

export type SosSection = "quick" | "text" | "voice";

interface EmergencyContextValue {
  sosOpen: boolean;
  sosSection: SosSection;
  openSos: (section?: SosSection) => void;
  closeSos: () => void;
  activeEvent: EmergencyEventRecord | null;
  nearby: NearbyEmergency[];
  location: EmergencyLocation | null;
  sending: boolean;
  /** Resolves/refreshes the user's location (re-prompts the browser). */
  refreshLocation: () => Promise<EmergencyLocation>;
  /** Sends an emergency alert. Throws when location access is required. */
  sendSos: (input: CreateEmergencyInput) => Promise<EmergencyEventRecord>;
  /** Cancels/resolves the current user's active emergency. */
  cancelEmergency: () => Promise<void>;
}

const EmergencyContext = createContext<EmergencyContextValue | null>(null);

export function EmergencyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();

  const [sosOpen, setSosOpen] = useState(false);
  const [sosSection, setSosSection] = useState<SosSection>("quick");
  const [activeEvent, setActiveEvent] = useState<EmergencyEventRecord | null>(null);
  const [nearby, setNearby] = useState<NearbyEmergency[]>([]);
  const [location, setLocation] = useState<EmergencyLocation | null>(null);
  const [sending, setSending] = useState(false);
  const [alerts, setAlerts] = useState<NearbyEmergency[]>([]);

  const seenAlertIds = useRef(new Set<string>());
  const notificationAsked = useRef(false);
  const uid = user?.uid ?? null;

  const openSos = useCallback(
    (section?: SosSection) => {
      if (!uid) return;
      setSosSection(section ?? "quick");
      setSosOpen(true);
    },
    [uid]
  );
  const closeSos = useCallback(() => setSosOpen(false), []);

  const refreshLocation = useCallback(async () => {
    if (!uid) throw new Error("Not authenticated");
    const resolved = await getMyLocation(uid, true);
    setLocation(resolved);
    return resolved;
  }, [uid]);

  /* Resolve my location once (cached by the service). */
  useEffect(() => {
    if (!uid) {
      setLocation(null);
      return;
    }
    let cancelled = false;
    getMyLocation(uid).then((resolved) => {
      if (!cancelled) setLocation(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  /* Subscribe to my active event. */
  useEffect(() => {
    if (!uid) {
      setActiveEvent(null);
      return;
    }
    let unsubscribe: (() => void) | undefined;

    unsubscribe = subscribeMyEvents(uid, (events) => {
      const active =
        events.find(
          (event) => event.status === "active" && event.expiresAt > Date.now()
        ) ?? null;
      setActiveEvent(active);
    });

    return () => {
      unsubscribe?.();
    };
  }, [uid]);

  const notifyBrowser = useCallback((event: NearbyEmergency) => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    const distance = event.distanceMeters !== null ? formatDistance(event.distanceMeters) : "";
    try {
      new Notification("🚨 UrbanSafe Emergency Nearby", {
        body: `${getEmergencyTypeLabel(event.type)} reported${distance ? ` ${distance} away` : ""}. ${timeAgo(event.createdAt)}`,
      });
    } catch {
      // Browser refused the notification; in-app alert still covers it.
    }
  }, []);

  /* Subscribe to nearby emergency alerts (real-time). */
  useEffect(() => {
    if (!uid) {
      setNearby([]);
      setAlerts([]);
      seenAlertIds.current.clear();
      return;
    }
    let unsubscribe: (() => void) | undefined;

    const startSubscription = (myLocation: EmergencyLocation | null) => {
      const options: NearbySubscriptionOptions = {
        uid,
        location: myLocation,
        onEvents: (events) => {
          setNearby(events);
          events.forEach((event) => {
            if (seenAlertIds.current.has(event.id)) return;
            seenAlertIds.current.add(event.id);
            setAlerts((prev) => [...prev, event]);
            notifyBrowser(event);
          });
        },
      };
      unsubscribe = subscribeNearbyEmergencies(options);
    };

    if (isEmergencyBackendConfigured()) {
      getMyLocation(uid).then((resolved) => {
        if (resolved.permission === "granted") {
          startSubscription(resolved);
        } else {
          startSubscription(null);
        }
      });
    } else {
      getMyLocation(uid).then((resolved) => startSubscription(resolved));
    }

    return () => {
      unsubscribe?.();
    };
  }, [uid, notifyBrowser]);

  /* Auto-dismiss alert toasts after 20 seconds. */
  useEffect(() => {
    if (alerts.length === 0) return;
    const timers = alerts.map((event) =>
      window.setTimeout(() => {
        setAlerts((prev) => prev.filter((item) => item.id !== event.id));
      }, 20_000)
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [alerts]);

  const sendSos = useCallback(
    async (input: CreateEmergencyInput): Promise<EmergencyEventRecord> => {
      if (!uid) throw new Error("Not authenticated");
      setSending(true);
      try {
        const currentLocation =
          location ?? (await getMyLocation(uid));
        const result = await createEmergency(uid, input, {
          location: currentLocation,
        });
        setActiveEvent(result.event);
        setLocation(result.location);
        toast.success("SOS sent. Nearby UrbanSafe users have been notified.", {
          duration: 5000,
        });

        // Ask for notification permission once, after an explicit user
        // action — never on page load and never repeatedly.
        if (!notificationAsked.current && "Notification" in window && Notification.permission === "default") {
          notificationAsked.current = true;
          void Notification.requestPermission();
        }

        return result.event;
      } finally {
        setSending(false);
      }
    },
    [uid, location]
  );

  const cancelEmergency = useCallback(async () => {
    if (!uid || !activeEvent) return;
    await resolveEmergency(uid, activeEvent.id);
    setActiveEvent(null);
    toast.success("Emergency resolved. Nearby users have been updated.", {
      duration: 5000,
    });
  }, [uid, activeEvent]);

  const dismissAlert = useCallback((eventId: string) => {
    setAlerts((prev) => prev.filter((item) => item.id !== eventId));
  }, []);

  const viewOnMap = useCallback(
    (eventId: string) => {
      setAlerts((prev) => prev.filter((item) => item.id !== eventId));
      closeSos();
      router.push(`/safety-map?event=${encodeURIComponent(eventId)}`);
    },
    [router, closeSos]
  );

  const value = useMemo<EmergencyContextValue>(
    () => ({
      sosOpen,
      sosSection,
      openSos,
      closeSos,
      activeEvent,
      nearby,
      location,
      sending,
      refreshLocation,
      sendSos,
      cancelEmergency,
    }),
    [sosOpen, sosSection, openSos, closeSos, activeEvent, nearby, location, sending, refreshLocation, sendSos, cancelEmergency]
  );

  return (
    <EmergencyContext.Provider value={value}>
      {children}
      {uid && <FloatingSosTrigger />}
      {uid && <SosModal />}
      {alerts.map((event) => (
        <EmergencyAlertToast
          key={event.id}
          event={event}
          onView={() => viewOnMap(event.id)}
          onDismiss={() => dismissAlert(event.id)}
        />
      ))}
    </EmergencyContext.Provider>
  );
}

/** Accesses the emergency context. Throws when used outside the provider. */
export function useEmergency(): EmergencyContextValue {
  const context = useContext(EmergencyContext);
  if (!context) {
    throw new Error("useEmergency must be used within an EmergencyProvider");
  }
  return context;
}
