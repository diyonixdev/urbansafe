"use client";

import React, { useEffect, useState } from "react";
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
    summary: ["Excellent lighting", "Low incident activity", "Police nearby"],
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
    summary: ["Balanced risk profile", "Good average speed"],
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
    summary: ["Shortest travel time", "Higher risk corridors"],
    color: "#ef4444",
    path: "M70,470 C280,420 480,320 730,95",
    chipX: 300,
    chipY: 396,
  },
];

const SIGNALS: { icon: LucideIcon; label: string; status: string; tone: string }[] = [
  { icon: ShieldAlert, label: "Crime Risk", status: "Low", tone: "#10b981" },
  { icon: Shield, label: "Police Presence", status: "High", tone: "#3b82f6" },
  { icon: AlertTriangle, label: "Recent Incidents", status: "2 nearby", tone: "#f59e0b" },
  { icon: Car, label: "Road Conditions", status: "Good", tone: "#10b981" },
  { icon: Lightbulb, label: "Street Lighting", status: "Good", tone: "#10b981" },
  { icon: Users, label: "Crowd Density", status: "Moderate", tone: "#f59e0b" },
];

const SCORE_BREAKDOWN: Record<RouteId, { label: string; value: number }[]> = {
  safe: [
    { label: "Crime", value: 91 },
    { label: "Lighting", value: 96 },
    { label: "Police proximity", value: 84 },
    { label: "Incidents", value: 90 },
  ],
  balanced: [
    { label: "Crime", value: 78 },
    { label: "Lighting", value: 72 },
    { label: "Police proximity", value: 76 },
    { label: "Incidents", value: 80 },
  ],
  fastest: [
    { label: "Crime", value: 55 },
    { label: "Lighting", value: 61 },
    { label: "Police proximity", value: 43 },
    { label: "Incidents", value: 58 },
  ],
};

const LIVE_INTEL: { icon: LucideIcon; label: string; value: string; detail: string; tint: string }[] = [
  { icon: AlertTriangle, label: "Recent incident", value: "0.6 km away", detail: "8 min ago", tint: "bg-red-50 text-red-500" },
  { icon: Shield, label: "Police presence", value: "High", detail: "2 units nearby", tint: "bg-blue-50 text-blue-600" },
  { icon: Lightbulb, label: "Street lighting", value: "94%", detail: "Route coverage", tint: "bg-orange-50 text-orange-500" },
  { icon: Users, label: "Crowd density", value: "Moderate", detail: "Main road", tint: "bg-slate-100 text-slate-600" },
];

const SAFETY_TIPS: { icon: LucideIcon; text: string }[] = [
  { icon: Lightbulb, text: "Stick to well-lit streets, especially after dark" },
  { icon: Users, text: "Share your live route with trusted contacts" },
  { icon: Moon, text: "Check the nighttime score before travelling late" },
  { icon: AlertOctagon, text: "Keep emergency numbers one tap away" },
];

const SCORE_GUIDE: { icon: LucideIcon; label: string; tier: string; color: string }[] = [
  { icon: ShieldAlert, label: "Crime risk", tier: "Low", color: "#10b981" },
  { icon: Lightbulb, label: "Street lighting", tier: "Excellent", color: "#10b981" },
  { icon: Shield, label: "Police proximity", tier: "Nearby", color: "#3b82f6" },
  { icon: AlertTriangle, label: "Incident activity", tier: "Minimal", color: "#10b981" },
];

const SCORE_TIERS = [
  { label: "85+ Low", color: "#10b981" },
  { label: "70–84 Moderate", color: "#f59e0b" },
  { label: "<70 High", color: "#ef4444" },
];

const AI_POINTS = [
  "31% lower reported incident activity",
  "Better street lighting coverage",
  "Police presence within 500m",
  "Lower nighttime risk",
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

export default function PlanRoutePage() {
  const [origin, setOrigin] = useState("Current Location");
  const [destination, setDestination] = useState("");
  const [searched, setSearched] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selected, setSelected] = useState<RouteId>("safe");
  const [zoom, setZoom] = useState(1);

  const selectedRoute = ROUTES.find(r => r.id === selected)!;
  const risk = riskFor(selectedRoute.score);
  const animatedScore = useAnimatedScore(selectedRoute.score, searched);
  const isGps = origin === "Current Location";

  const alex: AlexPayload = buildAlexPayload(
    searched ? destination.trim() || null : null,
    searched ? selected : null
  );

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

  const handleSwap = () => {
    setOrigin(destination.trim() ? destination : "Current Location");
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
              Plan your route using real-time safety, road, lighting and incident intelligence.
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
                    <p className="text-xs text-slate-500 mt-0.5">Choose your destination and UrbanSafe will compare routes using safety intelligence.</p>
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
                            <LocateFixed size={10} /> GPS detected
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={origin}
                        onChange={e => setOrigin(e.target.value)}
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
                  onClick={() => setOrigin("Current Location")}
                  className="w-full text-sm font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg py-2 transition-colors flex items-center justify-center gap-1.5"
                >
                  <LocateFixed size={14} /> Use my current location
                </button>
              </form>

              {/* ALEX'S SUGGESTIONS */}
              <aside className="pr-alex">
                <div className="pr-alex-glow" aria-hidden />
                <div className="pr-alex-header">
                  <span className="pr-alex-avatar"><Bot size={17} /></span>
                  <div className="min-w-0">
                    <h2 className="pr-alex-title">Alex&rsquo;s suggestions</h2>
                    <p className="pr-alex-sub">AI-powered recommendations based on your route and local safety conditions.</p>
                  </div>
                  <Sparkles size={15} className="pr-alex-sparkle" aria-hidden />
                </div>

                <div className="pr-alex-context">
                  <span><MapPin size={10} /> {alex.city}, {alex.currentRoad}</span>
                  <span><Clock size={10} /> {alex.timeOfDay}</span>
                  {alex.destination && <span><Navigation size={10} /> {alex.destination}</span>}
                </div>

                <div className="pr-alex-divider" />

                <div key={`${searched}-${selected}`} className="flex flex-col gap-1">
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
                    <span className="pr-pin-tip">Police station</span>
                  </span>
                  <span className="pr-map-pin pr-marker pr-marker-d3" style={{ ...pos(660, 110), width: 28, height: 28, background: "#2563eb" }}>
                    <Shield size={13} />
                    <span className="pr-pin-tip">Police station</span>
                  </span>
                  <span className="pr-map-pin pr-marker pr-marker-d2" style={{ ...pos(380, 360), width: 28, height: 28, background: "#ef4444" }}>
                    <AlertTriangle size={13} />
                    <span className="pr-pin-tip">Recent incident</span>
                  </span>
                  <span className="pr-map-pin pr-marker pr-marker-d1" style={{ ...pos(240, 140), width: 28, height: 28, background: "#f59e0b" }}>
                    <Lightbulb size={13} />
                    <span className="pr-pin-tip">Street lighting</span>
                  </span>
                  <span className="pr-map-pin pr-marker pr-marker-d3" style={{ ...pos(560, 220), width: 28, height: 28, background: "#f59e0b" }}>
                    <Lightbulb size={13} />
                    <span className="pr-pin-tip">Street lighting</span>
                  </span>
                  <span className="pr-map-pin pr-marker pr-marker-d2" style={{ ...pos(95, 330), width: 28, height: 28, background: "#8b5cf6" }}>
                    <Users size={13} />
                    <span className="pr-pin-tip">Crowd density</span>
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
                      <p className="text-xs text-slate-500 mt-0.5">Live intelligence for your area</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {SIGNALS.map(signal => (
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
                </div>

                {!searched && (
                  <div className="border-t border-slate-200 px-6 py-4 flex items-center gap-4">
                    <span className="grid place-items-center w-11 h-11 shrink-0 rounded-xl bg-blue-50 text-blue-600">
                      <Navigation size={20} />
                    </span>
                    <div className="min-w-0">
                      <h2 className="font-bold tracking-tight text-slate-900 text-[15px]">Plan your safer journey</h2>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Enter a destination above to compare routes using UrbanSafe safety intelligence.
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

              {/* Live safety intelligence */}
              <section className="flex flex-col gap-5 pr-fade-up pr-fade-up-d1">
                <SectionHeader
                  eyebrow="Live data"
                  title="Live safety intelligence"
                  subtitle="Updated from city safety sensors and community reports."
                />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {LIVE_INTEL.map(card => (
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
