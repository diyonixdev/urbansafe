"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertOctagon, AlertTriangle, ArrowUpDown, Bot, Car, CheckCircle2, ChevronRight, Clock, Gauge, Lightbulb, Layers,
  Loader2, LocateFixed, MapPin, Minus, Moon, Navigation, Plus, Radar,
  Route as RouteIcon, Search, Shield, ShieldAlert, ShieldCheck,
  Sparkles, Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { UrbanSafeNavbar } from "@/components/layouts/UrbanSafeNavbar";
import { buildAlexPayload } from "./alex-suggestions";
import type { AlexPayload, SuggestionIcon, SuggestionTone } from "./alex-suggestions";
import { useGeolocation } from "@/hooks/useGeolocation";
import { locationLabel, reverseGeocodeLocation } from "@/services/location-service";
import type { LocationInfo } from "@/services/location-service";
import { getLocationSafetyInsights } from "@/services/location-safety";
import type { SafetyInsights } from "@/services/location-safety";

type RouteId = "safe" | "balanced" | "fastest";

interface RouteOption {
  id: RouteId;
  label: string;
  mapChip: string;
  time: string;
  distance: string;
  score: number;
  summary: string[];
  color: string;
  path: string;
  chipX: number;
  chipY: number;
  recommended?: boolean;
}

const ROUTES: RouteOption[] = [
  {
    id: "safe",
    label: "Safest Route",
    mapChip: "SAFE ROUTE",
    time: "18 min",
    distance: "4.2 km",
    score: 92,
    summary: ["Estimated lighting", "Estimated lower-risk corridor", "Main-road guidance"],
    color: "#22c55e",
    path: "M70,470 C210,430 300,380 380,300 C440,240 520,180 640,150 C680,142 705,115 730,95",
    chipX: 480,
    chipY: 138,
    recommended: true,
  },
  {
    id: "balanced",
    label: "Balanced Route",
    mapChip: "BALANCED",
    time: "15 min",
    distance: "3.8 km",
    score: 84,
    summary: ["Balanced estimate", "Good average speed"],
    color: "#f59e0b",
    path: "M70,470 C220,470 400,430 520,340 C600,280 660,200 730,95",
    chipX: 528,
    chipY: 370,
  },
  {
    id: "fastest",
    label: "Fastest Route",
    mapChip: "FASTEST",
    time: "12 min",
    distance: "3.5 km",
    score: 67,
    summary: ["Shortest travel time", "Higher estimated risk"],
    color: "#ef4444",
    path: "M70,470 C280,420 480,320 730,95",
    chipX: 300,
    chipY: 396,
  },
];

const SIGNALS: { icon: LucideIcon; label: string; status: string; tone: string }[] = [
  { icon: ShieldAlert, label: "Travel Safety", status: "Estimated", tone: "#3b82f6" },
  { icon: Shield, label: "Location Data", status: "Permission needed", tone: "#3b82f6" },
  { icon: AlertTriangle, label: "Safety Model", status: "Demo estimate", tone: "#3b82f6" },
  { icon: Car, label: "Route Guidance", status: "Estimated", tone: "#3b82f6" },
  { icon: Lightbulb, label: "Lighting Estimate", status: "Estimated", tone: "#3b82f6" },
  { icon: Users, label: "Crowd Estimate", status: "Estimated", tone: "#3b82f6" },
];

function signalTone(level: "good" | "moderate" | "poor" | "low" | "high"): string {
  if (level === "good" || level === "low") return "#10b981";
  if (level === "poor" || level === "high") return "#ef4444";
  return "#f59e0b";
}

function signalsForArea(insights: SafetyInsights | null): typeof SIGNALS {
  if (!insights) return SIGNALS;

  const riskStatus = insights.travelSafety.level === "good"
    ? "Low"
    : insights.travelSafety.level === "moderate" ? "Moderate" : "High";

  return [
    { icon: ShieldAlert, label: "Travel Safety", status: `${riskStatus} estimate`, tone: signalTone(insights.travelSafety.level) },
    { icon: Shield, label: "Location Data", status: "Area resolved", tone: "#3b82f6" },
    { icon: AlertTriangle, label: "Safety Model", status: "Demo estimate", tone: "#3b82f6" },
    { icon: Car, label: "Route Guidance", status: insights.saferRoute.status, tone: "#3b82f6" },
    { icon: Lightbulb, label: "Lighting Estimate", status: insights.streetLighting.status, tone: signalTone(insights.streetLighting.level) },
    { icon: Users, label: "Crowd Estimate", status: insights.crowdDensity.status, tone: signalTone(insights.crowdDensity.level) },
  ];
}

const SCORE_BREAKDOWN: Record<RouteId, { label: string; value: number }[]> = {
  safe: [
    { label: "Area model", value: 91 },
    { label: "Visibility estimate", value: 96 },
    { label: "Main-road guidance", value: 84 },
    { label: "Time-of-day model", value: 90 },
  ],
  balanced: [
    { label: "Area model", value: 78 },
    { label: "Visibility estimate", value: 72 },
    { label: "Main-road guidance", value: 76 },
    { label: "Time-of-day model", value: 80 },
  ],
  fastest: [
    { label: "Area model", value: 55 },
    { label: "Visibility estimate", value: 61 },
    { label: "Main-road guidance", value: 43 },
    { label: "Time-of-day model", value: 58 },
  ],
};

const LIVE_INTEL: { icon: LucideIcon; label: string; value: string; detail: string; tint: string }[] = [
  { icon: AlertTriangle, label: "Safety model", value: "Demo estimate", detail: "No live incident feed", tint: "bg-blue-50 text-blue-600" },
  { icon: Shield, label: "Location source", value: "Browser area", detail: "Real location data", tint: "bg-blue-50 text-blue-600" },
  { icon: Lightbulb, label: "Lighting estimate", value: "Pending", detail: "Not a lighting feed", tint: "bg-orange-50 text-orange-500" },
  { icon: Users, label: "Crowd estimate", value: "Pending", detail: "Not a live crowd feed", tint: "bg-slate-100 text-slate-600" },
];

function intelForArea(insights: SafetyInsights | null): typeof LIVE_INTEL {
  if (!insights) return LIVE_INTEL;
  return [
    { icon: AlertTriangle, label: "Safety model", value: insights.travelSafety.status, detail: "Demo estimate", tint: "bg-blue-50 text-blue-600" },
    { icon: Shield, label: "Location source", value: insights.locationName, detail: `${insights.timeOfDay} · browser area`, tint: "bg-blue-50 text-blue-600" },
    { icon: Lightbulb, label: "Lighting estimate", value: insights.streetLighting.status, detail: "Not a lighting feed", tint: "bg-orange-50 text-orange-500" },
    { icon: Users, label: "Crowd estimate", value: insights.crowdDensity.status, detail: "Not a live crowd feed", tint: "bg-slate-100 text-slate-600" },
  ];
}

function cityFromOrigin(origin: string): string | undefined {
  const firstPart = origin.split(",")[0]?.trim();
  if (!firstPart || /^current location$/i.test(firstPart)) return undefined;
  return firstPart;
}

function distanceInMeters(
  first: Pick<LocationInfo, "latitude" | "longitude">,
  second: Pick<LocationInfo, "latitude" | "longitude">,
): number {
  const earthRadius = 6_371_000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(second.latitude - first.latitude);
  const longitudeDelta = toRadians(second.longitude - first.longitude);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(toRadians(first.latitude)) * Math.cos(toRadians(second.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const SAFETY_TIPS: { icon: LucideIcon; text: string }[] = [
  { icon: Lightbulb, text: "Stick to well-lit streets, especially after dark" },
  { icon: Users, text: "Share your live route with trusted contacts" },
  { icon: Moon, text: "Check the nighttime score before travelling late" },
  { icon: AlertOctagon, text: "Keep emergency numbers one tap away" },
];

const SCORE_GUIDE: { icon: LucideIcon; label: string; tier: string; color: string }[] = [
  { icon: ShieldAlert, label: "Area model", tier: "Estimated", color: "#3b82f6" },
  { icon: Lightbulb, label: "Visibility", tier: "Estimated", color: "#3b82f6" },
  { icon: Shield, label: "Route guidance", tier: "Estimated", color: "#3b82f6" },
  { icon: AlertTriangle, label: "Time of day", tier: "Real", color: "#10b981" },
];

const SCORE_TIERS = [
  { label: "85+ Low", color: "#10b981" },
  { label: "70–84 Moderate", color: "#f59e0b" },
  { label: "<70 High", color: "#ef4444" },
];

const AI_POINTS = [
  "Your reverse-geocoded area and current time",
  "Estimated visibility conditions",
  "Main-road route guidance",
  "Estimated time-of-day travel conditions",
];

const ROADS = [
  { d: "M0,210 L800,160", w: 26 },
  { d: "M0,440 L800,410", w: 22 },
  { d: "M220,0 L190,600", w: 20 },
  { d: "M560,0 L590,600", w: 20 },
  { d: "M0,560 L800,60", w: 15 },
];

const STREETS = [
  "M0,120 L800,95",
  "M0,320 L800,300",
  "M400,0 L420,600",
  "M90,0 L80,600",
  "M680,0 L700,600",
  "M250,0 L235,600",
];

const BLOCKS = [
  { x: 40, y: 140, w: 150, h: 60 },
  { x: 250, y: 90, w: 120, h: 60 },
  { x: 420, y: 60, w: 120, h: 70 },
  { x: 620, y: 190, w: 120, h: 60 },
  { x: 260, y: 260, w: 120, h: 80 },
  { x: 450, y: 230, w: 110, h: 80 },
  { x: 120, y: 280, w: 100, h: 70 },
  { x: 300, y: 450, w: 140, h: 70 },
  { x: 540, y: 420, w: 150, h: 80 },
  { x: 655, y: 450, w: 110, h: 60 },
];

const pos = (x: number, y: number) => ({ left: `${(x / 800) * 100}%`, top: `${(y / 600) * 100}%` });

const ALEX_ICONS: Record<SuggestionIcon, LucideIcon> = {
  lighting: Lightbulb,
  shield: Shield,
  alert: AlertTriangle,
  clock: Clock,
  route: RouteIcon,
  users: Users,
  car: Car,
  moon: Moon,
  pin: MapPin,
  safety: ShieldCheck,
};

const ALEX_TONES: Record<SuggestionTone, { dot: string; icon: string; tile: string }> = {
  good: { dot: "#10b981", icon: "#34d399", tile: "rgba(16,185,129,0.14)" },
  info: { dot: "#60a5fa", icon: "#93c5fd", tile: "rgba(59,130,246,0.14)" },
  warn: { dot: "#f59e0b", icon: "#fbbf24", tile: "rgba(245,158,11,0.14)" },
};

function barColor(value: number) {
  if (value >= 85) return "#10b981";
  if (value >= 70) return "#f59e0b";
  return "#ef4444";
}

function riskFor(score: number) {
  if (score >= 85) return { label: "LOW RISK", color: "#10b981" };
  if (score >= 70) return { label: "MODERATE", color: "#f59e0b" };
  return { label: "HIGH RISK", color: "#ef4444" };
}

function useAnimatedScore(target: number, active: boolean) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const t0 = performance.now();
    const dur = 850;
    const tick = (t: number) => {
      const p = Math.min((t - t0) / dur, 1);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active]);
  return value;
}

function AnimatedBar({ value }: { value: number }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setWidth(value));
    return () => cancelAnimationFrame(id);
  }, [value]);
  return (
    <div className="pr-score-track">
      <div className="pr-score-fill" style={{ width: `${width}%`, background: barColor(value) }} />
    </div>
  );
}

function SectionHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div>
      <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-blue-600">{eyebrow}</p>
      <h2 className="mt-1 text-xl md:text-2xl font-bold tracking-tight text-slate-900">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
    </div>
  );
}

function PlanRouteContent() {
  const searchParams = useSearchParams();
  const { location } = useGeolocation();
  const [origin, setOrigin] = useState("Current Location");
  const [usingCurrentLocation, setUsingCurrentLocation] = useState(true);
  const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(null);
  const [locationLookupFailed, setLocationLookupFailed] = useState(false);
  const [safetyPosition, setSafetyPosition] = useState<Pick<LocationInfo, "latitude" | "longitude" | "accuracy"> | null>(null);
  const lastAcceptedPosition = useRef<Pick<LocationInfo, "latitude" | "longitude" | "accuracy"> | null>(null);
  const lastGeocodedArea = useRef<string | null>(null);
  const [destination, setDestination] = useState("");
  const [searched, setSearched] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selected, setSelected] = useState<RouteId>("safe");
  const [zoom, setZoom] = useState(1);

  const selectedRoute = ROUTES.find(r => r.id === selected)!;
  const risk = riskFor(selectedRoute.score);
  const animatedScore = useAnimatedScore(selectedRoute.score, searched);
  const isGps = usingCurrentLocation;
  // The browser position is the primary input. Reverse geocoding only enriches
  // the area label, so an unavailable geocoding provider never disables the
  // deterministic location-aware demo engine.
  const browserLocation: LocationInfo | null = safetyPosition
    ? {
        latitude: safetyPosition.latitude,
        longitude: safetyPosition.longitude,
        accuracy: safetyPosition.accuracy,
        city: locationInfo?.city || (usingCurrentLocation ? cityFromOrigin(origin) : undefined),
        locality: locationInfo?.locality,
        road: locationInfo?.road,
      }
    : null;
  const safetyInsights = browserLocation
    ? getLocationSafetyInsights({
        latitude: browserLocation.latitude,
        longitude: browserLocation.longitude,
        city: browserLocation.city,
        locality: browserLocation.locality,
      })
    : null;
  const safetySignals = signalsForArea(safetyInsights);
  const safetyIntel = intelForArea(safetyInsights);

  useEffect(() => {
    if (location.latitude === null || location.longitude === null) return;

    const nextPosition = {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy ?? undefined,
    };
    const previousPosition = lastAcceptedPosition.current;
    const accuracyAllowance = Math.max(nextPosition.accuracy ?? 0, previousPosition?.accuracy ?? 0);
    const meaningfulMovement = Math.max(150, Math.min(500, accuracyAllowance));

    if (previousPosition && distanceInMeters(previousPosition, nextPosition) < meaningfulMovement) return;

    lastAcceptedPosition.current = nextPosition;
    setSafetyPosition(nextPosition);
    // Do not briefly apply the previous neighbourhood's name to a new position.
    setLocationInfo(null);
  }, [location.latitude, location.longitude, location.accuracy]);

  useEffect(() => {
    if (!safetyPosition) return;

    // Accepted positions are already movement-gated; this key also prevents a
    // duplicate lookup if a watch event repeats the same accepted position.
    const areaKey = `${safetyPosition.latitude.toFixed(4)},${safetyPosition.longitude.toFixed(4)}`;
    if (lastGeocodedArea.current === areaKey) return;
    lastGeocodedArea.current = areaKey;

    const controller = new AbortController();
    setLocationLookupFailed(false);
    reverseGeocodeLocation(
      safetyPosition,
      controller.signal,
    )
      .then((area) => {
        setLocationInfo(area);
        setLocationLookupFailed(!area.areaResolved);
        if (usingCurrentLocation && (area.city || area.locality || area.road)) {
          setOrigin(locationLabel(area));
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLocationLookupFailed(true);
      });

    return () => controller.abort();
  }, [safetyPosition, usingCurrentLocation]);

  const alex: AlexPayload = buildAlexPayload(
    searched ? destination.trim() || null : null,
    searched ? selected : null,
    browserLocation,
    safetyInsights,
  );
  const locationUnavailable = location.permission === "denied"
    || location.permission === "unsupported"
    || Boolean(location.error)
    || locationLookupFailed;
  const alexIsLoading = !locationUnavailable && (!safetyPosition || !locationInfo?.areaResolved);

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (processing) return;
    setProcessing(true);
    window.setTimeout(() => {
      setProcessing(false);
      setSearched(true);
      setSelected("safe");
    }, 950);
  };

  /* Deep link from the landing page (?origin=&destination=): prefill and
     run the route analysis automatically. */
  useEffect(() => {
    const dest = searchParams.get("destination");
    if (!dest) return;
    const from = searchParams.get("origin");
    if (from && from !== "Current Location") setOrigin(from);
    setDestination(dest);
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleSwap = () => {
    setOrigin(destination.trim() ? destination : "Current Location");
    setUsingCurrentLocation(!isGps);
    setDestination(isGps ? "" : origin);
  };

  const sortedRoutes = [...ROUTES].sort(
    (a, b) => (a.id === selected ? 1 : 0) - (b.id === selected ? 1 : 0)
  );

  return (
    <div className="urban-safe-page min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">

      <UrbanSafeNavbar />

      <div className="pr-page-wrap">
        <div aria-hidden className="pr-glow pr-glow-a" />
        <div aria-hidden className="pr-glow pr-glow-b" />

        <main className="pr-main max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 flex flex-col gap-8 lg:gap-10">

          {/* HERO */}
          <section className="flex flex-col gap-3">
            <span className="pr-status"><span className="pr-status-dot" />SAFETY INTELLIGENCE ACTIVE</span>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.12] text-slate-900">
              Find the <span className="text-blue-600">safest</span> way to go.
            </h1>
            <p className="max-w-xl text-base md:text-lg text-slate-500 leading-relaxed">
              Plan your route with your current area and time, plus clearly labelled safety estimates.
            </p>
          </section>

          {/* PLANNER + MAP */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* ROUTE PLANNER */}
            <div className="lg:col-span-5 flex flex-col gap-6 order-1">
              <form onSubmit={handleSearch} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4 relative overflow-hidden">
                <div className="flex items-center gap-2.5">
                  <span className="grid place-items-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 shrink-0"><RouteIcon size={16} /></span>
                  <div className="min-w-0">
                    <h2 className="text-[13px] font-extrabold uppercase tracking-[0.12em] text-slate-900">Plan your journey</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Choose your destination and UrbanSafe will compare routes using area-based demo estimates.</p>
                  </div>
                </div>

                <div className="relative flex flex-col gap-3 mt-1">
                  <div className="absolute left-[4px] top-7 bottom-7 w-[2px] z-0" style={{ background: "linear-gradient(to bottom, color-mix(in srgb, var(--text-muted) 30%, transparent), color-mix(in srgb, var(--text-muted) 12%, transparent))" }} />

                  {/* Origin */}
                  <div className="relative z-10 flex items-center gap-3">
                    <span className="relative w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 border-2 border-white">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                    </span>
                    <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 transition-all focus-within:border-blue-500/60 focus-within:ring-2 focus-within:ring-blue-500/10">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Current location</p>
                        {isGps && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-green-50 border border-green-100 rounded-full px-2 py-0.5">
                            <LocateFixed size={10} />
                            {locationInfo ? locationLabel(locationInfo) : "GPS detected"}
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={origin}
                        onChange={e => { setOrigin(e.target.value); setUsingCurrentLocation(false); }}
                        placeholder="Your location"
                        className="bg-transparent w-full text-slate-900 font-medium outline-none placeholder:text-slate-400 mt-0.5"
                      />
                    </div>
                  </div>

                  {/* Swap */}
                  <button
                    type="button"
                    onClick={handleSwap}
                    aria-label="Swap origin and destination"
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-white border border-slate-200 text-slate-500 grid place-items-center shadow-sm transition-colors hover:text-blue-600 hover:border-blue-400"
                  >
                    <ArrowUpDown size={12} />
                  </button>

                  {/* Destination */}
                  <div className="relative z-10 flex items-center gap-3">
                    <span className="w-6 h-6 text-green-600 flex items-center justify-center shrink-0">
                      <MapPin size={22} className="fill-green-600/90 text-white drop-shadow-sm" />
                    </span>
                    <div className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 transition-all focus-within:border-blue-500/60 focus-within:ring-2 focus-within:ring-blue-500/10 shadow-sm">
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500 mb-0.5">Destination</p>
                      <input
                        id="destination-input"
                        type="text"
                        placeholder="Enter destination"
                        value={destination}
                        onChange={e => setDestination(e.target.value)}
                        className="bg-transparent w-full text-slate-900 font-medium outline-none placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={processing}
                  className="mt-1 w-full rounded-xl py-3.5 font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.99] hover:brightness-110 disabled:opacity-90"
                  style={{ background: "linear-gradient(135deg,#2563eb,#1d4ed8)", boxShadow: "0 12px 26px -12px rgba(37,99,235,.6)" }}
                >
                  {processing ? (
                    <><Loader2 size={18} className="animate-spin" /> Analyzing routes…</>
                  ) : (
                    <><Search size={18} /> Find Safest Route</>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (location.permission === 'denied' || location.permission === 'unsupported') {
                      alert(location.error || "Please enable location services in your browser settings.");
                      return;
                    }
                    setUsingCurrentLocation(true);
                    setOrigin("Current Location");
                    setLocationInfo(null);
                    setLocationLookupFailed(false);
                    setSafetyPosition(null);
                    lastAcceptedPosition.current = null;
                    lastGeocodedArea.current = null;
                    location.refresh();

                    if (!destination.trim()) {
                      document.getElementById('destination-input')?.focus();
                    } else {
                      handleSearch();
                    }
                  }}
                  className="w-full text-sm font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg py-2 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                  disabled={location.permission === 'loading'}
                >
                  {location.permission === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <LocateFixed size={14} />}
                  {location.permission === 'loading' ? 'Locating...' : 'Use my current location'}
                </button>
                {location.permission !== 'granted' && location.permission !== 'loading' && (
                  <p className="text-center text-xs text-slate-500" role="status">
                    Location access needed for area-based safety estimates.
                  </p>
                )}
                {locationUnavailable && (
                  <p className="text-center text-xs text-slate-500" role="status">
                    Location unavailable — showing demo safety guidance.
                  </p>
                )}
              </form>

              {/* ALEX'S SUGGESTIONS */}
              <aside className="pr-alex">
                <div className="pr-alex-glow" aria-hidden />
                <div className="pr-alex-header">
                  <span className="pr-alex-avatar"><Bot size={17} /></span>
                  <div className="min-w-0">
                    <h2 className="pr-alex-title">Alex&rsquo;s suggestions</h2>
                    <p className="pr-alex-sub">Recommendations use your real area and time with clearly labelled demo safety estimates.</p>
                  </div>
                  <Sparkles size={15} className="pr-alex-sparkle" aria-hidden />
                </div>

                {!alexIsLoading && !locationUnavailable && (
                  <div className="pr-alex-context">
                    <span><MapPin size={10} /> {locationInfo?.locality || alex.currentRoad} <span aria-hidden>•</span> {alex.timeOfDay}</span>
                    {alex.destination && <span><Navigation size={10} /> {alex.destination}</span>}
                  </div>
                )}

                <div className="pr-alex-divider" />

                {alexIsLoading ? (
                  <div className="pr-alex-row pr-fade-in">
                    <span className="pr-alex-row-icon" style={{ background: "rgba(59,130,246,0.14)", color: "#93c5fd" }}>
                      <Loader2 size={15} className="animate-spin" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <b>Detecting your location...</b>
                      <p>Preparing local safety suggestions...</p>
                    </div>
                  </div>
                ) : locationUnavailable ? (
                  <div className="pr-alex-row pr-fade-in">
                    <span className="pr-alex-row-icon" style={{ background: "rgba(245,158,11,0.14)", color: "#fbbf24" }}>
                      <AlertTriangle size={15} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <b>Location unavailable</b>
                      <p>Showing demo safety guidance until location access is available.</p>
                    </div>
                  </div>
                ) : (
                  <div key={`${searched}-${selected}-${locationInfo?.displayName ?? "area"}`} className="flex flex-col gap-1">
                  {alex.suggestions.map((s, i) => {
                    const Icon = ALEX_ICONS[s.icon];
                    const tone = ALEX_TONES[s.tone];
                    return (
                      <div key={s.id} className="pr-alex-row pr-fade-in" style={{ animationDelay: `${0.05 + i * 0.08}s` }}>
                        <span className="pr-alex-row-icon" style={{ background: tone.tile, color: tone.icon }}>
                          <Icon size={15} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <b>{s.title}</b>
                            <i className="pr-alex-dot" style={{ background: tone.dot }} />
                          </div>
                          <p>{s.detail}</p>
                        </div>
                        <ChevronRight size={15} className="pr-alex-chev shrink-0" />
                      </div>
                    );
                  })}
                  </div>
                )}
              </aside>
            </div>

            {/* MAP */}
            <div className="lg:col-span-7 order-2">
              <div className="pr-map h-[520px] sm:h-[560px] lg:h-[660px]" role="img" aria-label="Interactive safety map with three route alternatives">

                <div className="pr-map-viewport" style={{ transform: `scale(${zoom})` }}>
                  <svg className="pr-map-svg" viewBox="0 0 800 600" preserveAspectRatio="none" aria-hidden="true">
                    {/* Water */}
                    <ellipse cx="95" cy="555" rx="92" ry="44" fill="rgba(59,130,246,0.13)" />
                    {/* Park */}
                    <rect x="655" y="235" width="105" height="95" rx="18" fill="rgba(34,197,94,0.10)" />
                    {/* Risk zones */}
                    <ellipse cx="390" cy="355" rx="105" ry="78" fill="rgba(239,68,68,0.06)" stroke="rgba(239,68,68,0.18)" strokeDasharray="5 6" />
                    <ellipse cx="560" cy="190" rx="140" ry="65" fill="rgba(34,197,94,0.05)" />

                    {/* City blocks */}
                    {BLOCKS.map(block => (
                      <rect
                        key={`${block.x}-${block.y}`}
                        x={block.x} y={block.y} width={block.w} height={block.h} rx="6"
                        fill="rgba(30,41,59,0.55)" stroke="rgba(148,163,184,0.10)"
                      />
                    ))}

                    {/* Streets */}
                    {STREETS.map(d => (
                      <g key={d}>
                        <path d={d} stroke="rgba(148,163,184,0.16)" strokeWidth={9} fill="none" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
                        <path d={d} stroke="rgba(226,232,240,0.12)" strokeWidth={1.2} fill="none" vectorEffect="non-scaling-stroke" strokeDasharray="6 11" strokeLinecap="round" />
                      </g>
                    ))}

                    {/* Roads */}
                    {ROADS.map(road => (
                      <g key={road.d}>
                        <path d={road.d} stroke="rgba(148,163,184,0.16)" strokeWidth={road.w + 7} fill="none" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
                        <path d={road.d} stroke="rgba(148,163,184,0.30)" strokeWidth={road.w} fill="none" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
                        <path d={road.d} stroke="rgba(226,232,240,0.22)" strokeWidth={1.4} fill="none" vectorEffect="non-scaling-stroke" strokeDasharray="10 12" strokeLinecap="round" />
                      </g>
                    ))}

                    {/* Routes */}
                    <g key={String(searched)}>
                      {sortedRoutes.map((route, i) => {
                        const active = route.id === selected;
                        return (
                          <g key={route.id}>
                            <path className="pr-route-hit" d={route.path} strokeWidth={20} onClick={() => setSelected(route.id)} />
                            <path
                              d={route.path}
                              fill="none"
                              stroke={route.color}
                              strokeWidth={active ? 5.5 : 3}
                              strokeLinecap="round"
                              opacity={active ? 1 : 0.35}
                              className="pr-route-path pr-route-draw"
                              style={{
                                animationDelay: `${i * 0.12}s`,
                                filter: active ? `drop-shadow(0 0 8px ${route.color}66)` : undefined,
                              }}
                            />
                          </g>
                        );
                      })}
                    </g>
                  </svg>

                  {/* Neighborhood / road labels */}
                  <span className="pr-map-label" style={pos(140, 505)}>Riverside</span>
                  <span className="pr-map-label" style={pos(355, 110)}>Downtown</span>
                  <span className="pr-map-label" style={pos(620, 385)}>Old Town</span>
                  <span className="pr-map-label" style={pos(707, 285)}>Central Park</span>
                  <span className="pr-map-label pr-map-route-label" style={pos(400, 183)}>Broadway</span>
                  <span className="pr-map-label pr-map-route-label" style={{ ...pos(215, 60), transform: "translate(-50%,-50%) rotate(-86deg)" }}>Market St</span>
                  <span className="pr-map-label pr-map-route-label" style={{ ...pos(575, 42), transform: "translate(-50%,-50%) rotate(-85deg)" }}>5th Ave</span>
                  <span className="pr-map-label" style={{ ...pos(390, 262), color: "rgba(239,68,68,0.9)" }}>High-risk corridor</span>
                  <span className="pr-map-label" style={{ ...pos(555, 108), color: "rgba(34,197,94,0.92)" }}>Well-lit area</span>

                  {/* Start */}
                  <span className="pr-start-pin" style={pos(70, 470)} />

                  {/* Destination */}
                  <span className="pr-pos pr-marker pr-marker-d1" style={pos(730, 95)}>
                    <MapPin size={26} className="fill-[#1e293b] text-white" strokeWidth={2.2} />
                    <span className="pr-pin-tip">Destination</span>
                  </span>

                  {/* POI markers */}
                  <span className="pr-map-pin pr-marker pr-marker-d2" style={{ ...pos(300, 170), width: 30, height: 30, background: "#2563eb" }}>
                    <Shield size={15} />
                    <span className="pr-pin-tip">Demo map marker</span>
                  </span>
                  <span className="pr-map-pin pr-marker pr-marker-d3" style={{ ...pos(660, 110), width: 28, height: 28, background: "#2563eb" }}>
                    <Shield size={13} />
                    <span className="pr-pin-tip">Demo map marker</span>
                  </span>
                  <span className="pr-map-pin pr-marker pr-marker-d2" style={{ ...pos(380, 360), width: 28, height: 28, background: "#ef4444" }}>
                    <AlertTriangle size={13} />
                    <span className="pr-pin-tip">Demo safety marker</span>
                  </span>
                  <span className="pr-map-pin pr-marker pr-marker-d1" style={{ ...pos(240, 140), width: 28, height: 28, background: "#f59e0b" }}>
                    <Lightbulb size={13} />
                    <span className="pr-pin-tip">Demo lighting marker</span>
                  </span>
                  <span className="pr-map-pin pr-marker pr-marker-d3" style={{ ...pos(560, 220), width: 28, height: 28, background: "#f59e0b" }}>
                    <Lightbulb size={13} />
                    <span className="pr-pin-tip">Demo lighting marker</span>
                  </span>
                  <span className="pr-map-pin pr-marker pr-marker-d2" style={{ ...pos(95, 330), width: 28, height: 28, background: "#8b5cf6" }}>
                    <Users size={13} />
                    <span className="pr-pin-tip">Demo crowd marker</span>
                  </span>

                  {/* Route chips */}
                  {searched && ROUTES.map(route => (
                    <button
                      key={route.id}
                      type="button"
                      onClick={() => setSelected(route.id)}
                      className="pr-route-chip pr-fade-up"
                      style={{ ...pos(route.chipX, route.chipY), color: route.color }}
                      aria-label={`Select ${route.label}`}
                    >
                      <i style={{ background: route.color }} />
                      {route.mapChip}
                      <small style={{ color: route.color }}>{route.score}</small>
                    </button>
                  ))}
                </div>

                {/* Controls */}
                <div className="pr-map-controls">
                  <button aria-label="Zoom in" onClick={() => setZoom(z => Math.min(z + 0.15, 1.6))}><Plus size={17} /></button>
                  <button aria-label="Zoom out" onClick={() => setZoom(z => Math.max(z - 0.15, 0.7))}><Minus size={17} /></button>
                  <button aria-label="Locate me" onClick={() => setZoom(1)}><LocateFixed size={16} /></button>
                  <button aria-label="Layers"><Layers size={16} /></button>
                </div>

                {/* Legend */}
                <div className="pr-map-legend">
                  <b>Safety level</b>
                  <span><i style={{ background: "#22c55e" }} />Low risk</span>
                  <span><i style={{ background: "#f59e0b" }} />Moderate</span>
                  <span><i style={{ background: "#ef4444" }} />High risk</span>
                </div>

                {/* Search hint */}
                {!searched && (
                  <div className="pr-map-hint">
                    <Search size={13} className="text-blue-400" />
                    Enter a destination to see route options
                  </div>
                )}

                {/* Safety score card */}
                {searched && (
                  <aside className="pr-score-card pr-fade-up">
                    <div className="pr-score-label">
                      <span>Route safety</span>
                      <em>{selectedRoute.label}</em>
                    </div>
                    <div className="pr-score-num">{animatedScore}<small>/ 100</small></div>
                    <div className="pr-score-risk" style={{ color: risk.color }}>
                      <i style={{ background: risk.color }} />{risk.label}
                    </div>
                    <p className="pr-score-recommended">
                      {selected === "safe" ? "Recommended route" : "Comparable alternative"}
                    </p>
                    <div className="pr-score-break">
                      {SCORE_BREAKDOWN[selected].map(row => (
                        <div className="pr-score-break-row" key={row.label}>
                          <span>{row.label}</span>
                          <b>{row.value}%</b>
                          <AnimatedBar value={row.value} />
                        </div>
                      ))}
                    </div>
                  </aside>
                )}
              </div>
            </div>
          </section>

          {/* BELOW THE FOLD: SIGNALS + COMPANION */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full">
                <div className="p-6 flex flex-col gap-4">
                  <div className="flex items-center gap-2.5">
                    <span className="grid place-items-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 shrink-0"><Radar size={16} /></span>
                    <div className="min-w-0">
                      <h2 className="text-[13px] font-extrabold uppercase tracking-[0.12em] text-slate-900">Safety signals</h2>
                      <p className="text-xs text-slate-500 mt-0.5">Real: your area and time · Estimated: safety conditions</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {safetySignals.map(signal => (
                      <div className="pr-signal" key={signal.label}>
                        <span className="pr-signal-icon"><signal.icon size={15} /></span>
                        <div className="min-w-0">
                          <b>{signal.label}</b>
                          <small style={{ color: signal.tone }}>
                            <i style={{ background: signal.tone }} />{signal.status}
                          </small>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    Lighting, crowd, and travel signals are demo estimates—not live police, crime, or infrastructure feeds.
                  </p>
                </div>

                {!searched && (
                  <div className="border-t border-slate-200 px-6 py-4 flex items-center gap-4">
                    <span className="grid place-items-center w-11 h-11 shrink-0 rounded-xl bg-blue-50 text-blue-600">
                      <Navigation size={20} />
                    </span>
                    <div className="min-w-0">
                      <h2 className="font-bold tracking-tight text-slate-900 text-[15px]">Plan your safer journey</h2>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Enter a destination above to compare routes using area-based demo estimates.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-7">
              {!searched ? (
                <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4 h-full">
                  <div className="flex items-center gap-2.5">
                    <span className="grid place-items-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 shrink-0"><Lightbulb size={16} /></span>
                    <div className="min-w-0">
                      <h2 className="text-[13px] font-extrabold uppercase tracking-[0.12em] text-slate-900">Safety tips</h2>
                      <p className="text-xs text-slate-500 mt-0.5">Quick habits that keep your journey safer</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2.5 mt-1">
                    {SAFETY_TIPS.map(tip => (
                      <div key={tip.text} className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                        <span className="grid place-items-center w-7 h-7 rounded-lg bg-slate-100 text-slate-600 shrink-0">
                          <tip.icon size={14} />
                        </span>
                        {tip.text}
                      </div>
                    ))}
                  </div>
                </section>
              ) : (
                <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col h-full">
                  <div className="flex items-center gap-2.5">
                    <span className="grid place-items-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 shrink-0"><Gauge size={16} /></span>
                    <div className="min-w-0">
                      <h2 className="text-[13px] font-extrabold uppercase tracking-[0.12em] text-slate-900">Score guide</h2>
                      <p className="text-xs text-slate-500 mt-0.5">How UrbanSafe scores each factor</p>
                    </div>
                  </div>
                  <div className="flex flex-col mt-2">
                    {SCORE_GUIDE.map(row => (
                      <div key={row.label} className="flex items-center justify-between gap-3 py-2.5 border-b border-slate-100 last:border-0">
                        <span className="flex items-center gap-2.5 text-sm font-semibold text-slate-700">
                          <span className="grid place-items-center w-7 h-7 rounded-lg bg-slate-100 text-slate-600 shrink-0">
                            <row.icon size={14} />
                          </span>
                          {row.label}
                        </span>
                        <span className="text-xs font-extrabold" style={{ color: row.color }}>{row.tier}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-4 border-t border-slate-200 flex flex-wrap gap-x-5 gap-y-2">
                    {SCORE_TIERS.map(tier => (
                      <span key={tier.label} className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                        <i className="w-2 h-2 rounded-full" style={{ background: tier.color }} />{tier.label}
                      </span>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </section>

          {/* RESULTS */}
          {searched && (
            <section className="flex flex-col gap-8 lg:gap-10">

              {/* Recommended routes */}
              <section className="flex flex-col gap-5 pr-fade-up">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                  <SectionHeader
                    eyebrow="Route analysis"
                    title="Recommended routes"
                    subtitle="Ranked by UrbanSafe safety score and travel time."
                  />
                  <div className="text-xs font-semibold text-slate-500">
                    <span className="text-slate-400 mr-1.5">From:</span> Current Location
                    <span className="mx-2 text-slate-300">→</span>
                    <span className="text-slate-700 font-bold">{destination || "Destination"}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {ROUTES.map((route, i) => {
                    const active = route.id === selected;
                    return (
                      <div
                        key={route.id}
                        onClick={() => setSelected(route.id)}
                        className={`relative bg-white rounded-2xl p-5 pt-6 cursor-pointer transition-all duration-300 pr-fade-up ${
                          active
                            ? "border border-blue-500 shadow-lg ring-2 ring-blue-500/15"
                            : "border border-slate-200 shadow-sm hover:-translate-y-1 hover:shadow-lg hover:border-slate-300"
                        }`}
                        style={{ animationDelay: `${i * 0.1}s` }}
                      >
                        {route.recommended && (
                          <div className="absolute -top-3 left-5 bg-emerald-500 text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-md flex items-center gap-1">
                            <ShieldCheck size={13} /> Recommended
                          </div>
                        )}

                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-extrabold tracking-tight text-slate-900 text-[15px]">{route.label}</h3>
                            <p className="mt-1 text-sm text-slate-500">
                              <span className="font-bold text-slate-900">{route.time}</span>
                              <span className="text-slate-300 mx-1.5">•</span>
                              {route.distance}
                            </p>
                          </div>
                          <div
                            className="rounded-lg px-2.5 py-1.5 text-right shrink-0"
                            style={{ background: `${route.color}1a`, border: `1px solid ${route.color}45` }}
                          >
                            <div className="text-sm font-extrabold leading-none" style={{ color: route.color }}>{route.score}</div>
                            <div className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">Safety</div>
                          </div>
                        </div>

                        <ul className="mt-4 flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
                          {route.summary.map(item => (
                            <li key={item} className="flex items-center gap-2">
                              <span className="w-1 h-1 rounded-full shrink-0" style={{ background: route.color }} />
                              {item}
                            </li>
                          ))}
                        </ul>

                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); setSelected(route.id); }}
                          className={`mt-5 w-full rounded-xl py-2.5 text-sm font-bold transition-all ${
                            active
                              ? "text-white hover:brightness-110"
                              : "border border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600"
                          }`}
                          style={active ? { background: "linear-gradient(135deg,#2563eb,#1d4ed8)", boxShadow: "0 8px 18px -8px rgba(37,99,235,.5)" } : undefined}
                        >
                          {active ? "Selected route" : "Use this route"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Safety estimates */}
              <section className="flex flex-col gap-5 pr-fade-up pr-fade-up-d1">
                <SectionHeader
                  eyebrow="Safety estimates"
                  title="Area-based safety estimates"
                  subtitle="Real inputs: browser area and time. Estimated inputs: safety conditions and route guidance."
                />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {safetyIntel.map(card => (
                    <div
                      key={card.label}
                      className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`grid place-items-center w-8 h-8 rounded-lg shrink-0 ${card.tint}`}>
                          <card.icon size={16} />
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{card.label}</span>
                      </div>
                      <p className="mt-3 text-lg font-extrabold tracking-tight text-slate-900 leading-tight">{card.value}</p>
                      <p className="mt-0.5 text-xs font-semibold text-slate-500">{card.detail}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* AI route explanation */}
              <section className="pr-fade-up pr-fade-up-d2">
                <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <div
                    aria-hidden
                    className="absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none"
                    style={{ background: "radial-gradient(circle, rgba(37,99,235,0.10), transparent 70%)" }}
                  />
                  <div className="relative flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg tracking-tight text-slate-900 flex items-center gap-2">
                          <Sparkles size={18} className="text-blue-600" /> Why this route?
                        </h3>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        UrbanSafe recommends this route because it has:
                      </p>
                    </div>
                    <span className="flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-blue-600 shrink-0">
                      <Sparkles size={11} /> UrbanSafe Intelligence
                    </span>
                  </div>
                  <ul className="relative mt-4 grid sm:grid-cols-2 gap-x-8 gap-y-2.5">
                    {AI_POINTS.map(point => (
                      <li key={point} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <CheckCircle2 size={16} className="text-green-500 shrink-0" /> {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            </section>
          )}
        </main>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white mt-8 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-blue-600" />
            <span className="font-bold text-slate-900">Urban Safe</span>
            <span className="text-slate-400 text-sm ml-2">© 2024</span>
          </div>

          <p className="text-sm text-slate-500 font-medium text-center md:text-left">
            In case of emergency, always contact local emergency services immediately.
          </p>

          <div className="flex gap-4">
            <span className="text-sm font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg">Police: 100</span>
            <span className="text-sm font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg">Ambulance: 108</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default function PlanRoutePage() {
  return <Suspense fallback={null}><PlanRouteContent /></Suspense>;
}
