"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertOctagon, Banknote, CarFront, Check, Cross, Gauge, HardHat, Layers,
  Lightbulb, Loader2, LocateFixed, MapPin, Minus, Plus, Radar, Shield, ShieldAlert,
  ShieldCheck, UtensilsCrossed, X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { UrbanSafeNavbar } from "@/components/layouts/UrbanSafeNavbar";
import { useEmergency } from "@/components/emergency/EmergencyProvider";
import { getEmergencyTypeLabel } from "@/services/emergency-config";
import { timeAgo } from "@/lib/geo";
import type { NearbyEmergency } from "@/services/emergency-types";

type LayerId = "crime" | "construction" | "accident" | "lighting" | "police";

interface LayerConfig {
  id: LayerId;
  label: string;
  color: string;
  icon: LucideIcon;
}

const LAYERS: LayerConfig[] = [
  { id: "crime", label: "Crime hotspots", color: "#ef4444", icon: ShieldAlert },
  { id: "construction", label: "Construction", color: "#64748b", icon: HardHat },
  { id: "accident", label: "Accidents", color: "#f97316", icon: CarFront },
  { id: "lighting", label: "Poor lighting", color: "#eab308", icon: Lightbulb },
  { id: "police", label: "Police", color: "#3b82f6", icon: Shield },
];

interface SafetyMarker {
  id: string;
  layer: LayerId;
  x: number;
  y: number;
  title: string;
  detail: string;
}

const MARKERS: SafetyMarker[] = [
  { id: "crime-1", layer: "crime", x: 392, y: 352, title: "Crime hotspot", detail: "12 incidents · last reported 2 days ago" },
  { id: "crime-2", layer: "crime", x: 566, y: 182, title: "Crime hotspot", detail: "4 incidents · last reported 5 days ago" },
  { id: "construction-1", layer: "construction", x: 300, y: 240, title: "Road construction", detail: "500 m away · ~15 min delay" },
  { id: "accident-1", layer: "accident", x: 470, y: 268, title: "Accident reported", detail: "1.2 km away · 12 min ago" },
  { id: "lighting-1", layer: "lighting", x: 150, y: 330, title: "Poor lighting", detail: "Streetlight not working · 300 m away" },
  { id: "police-1", layer: "police", x: 210, y: 300, title: "Police station", detail: "600 m away · open 24×7" },
  { id: "police-2", layer: "police", x: 620, y: 420, title: "Police patrol", detail: "Active in your area" },
];

interface PlaceMarker {
  id: string;
  x: number;
  y: number;
  title: string;
  detail: string;
  icon: LucideIcon;
}

const PLACES: PlaceMarker[] = [
  { id: "hospital-1", x: 475, y: 178, title: "Hospital", detail: "1.4 km away", icon: Cross },
  { id: "atm-1", x: 120, y: 435, title: "ATM", detail: "450 m away", icon: Banknote },
  { id: "restaurant-1", x: 690, y: 340, title: "Restaurant", detail: "800 m away", icon: UtensilsCrossed },
];

const NEARBY: { id: string; label: string; icon: LucideIcon; targets: string[] }[] = [
  { id: "police", label: "Police", icon: Shield, targets: ["police-1", "police-2"] },
  { id: "hospital", label: "Hospital", icon: Cross, targets: ["hospital-1"] },
  { id: "atm", label: "ATM", icon: Banknote, targets: ["atm-1"] },
  { id: "restaurant", label: "Restaurant", icon: UtensilsCrossed, targets: ["restaurant-1"] },
];

const FACTORS: { label: string; value: number; tone: "good" | "moderate" | "poor" }[] = [
  { label: "Crime", value: 78, tone: "good" },
  { label: "Accidents", value: 91, tone: "good" },
  { label: "Lighting", value: 72, tone: "moderate" },
  { label: "Road condition", value: 84, tone: "good" },
  { label: "Police proximity", value: 93, tone: "good" },
];

const FACTOR_COLORS: Record<"good" | "moderate" | "poor", string> = {
  good: "#10b981",
  moderate: "#f59e0b",
  poor: "#ef4444",
};

const ALERTS: { icon: LucideIcon; bg: string; tone: string; title: string; distance: string; time: string }[] = [
  { icon: HardHat, bg: "rgba(245,158,11,.14)", tone: "#b45309", title: "Road construction", distance: "500 m away", time: "12 min ago" },
  { icon: CarFront, bg: "rgba(249,115,22,.14)", tone: "#c2410c", title: "Accident reported", distance: "1.2 km away", time: "24 min ago" },
  { icon: Lightbulb, bg: "rgba(234,179,8,.14)", tone: "#a16207", title: "Streetlight not working", distance: "300 m away", time: "2 h ago" },
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

/** Map anchor: MI Road, Jaipur, mapped to the "You" marker on the canvas. */
const MAP_ANCHOR = { x: 400, y: 305, latitude: 26.9124, longitude: 75.7873 };
/** Rough meter -> pixel scale for placing emergency markers. */
const METERS_TO_PX = 0.16;

function CardHead({ icon: Icon, title, sub }: { icon: LucideIcon; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid place-items-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 shrink-0"><Icon size={16} /></span>
      <div className="min-w-0">
        <h2 className="text-[13px] font-extrabold uppercase tracking-[0.12em] text-slate-900">{title}</h2>
        <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

function SafetyMapContent() {
  const [hiddenLayers, setHiddenLayers] = useState<Set<LayerId>>(() => new Set());
  const [layersOpen, setLayersOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nearby, setNearby] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [locating, setLocating] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const hintTimer = useRef<number | null>(null);

  const { nearby: nearbyEmergencies, location } = useEmergency();
  const searchParams = useSearchParams();
  const focusedEventId = searchParams.get("event");
  const [selectedEmergency, setSelectedEmergency] = useState<NearbyEmergency | null>(null);
  const focusedOnce = useRef<string | null>(null);

  useEffect(() => () => { if (hintTimer.current) window.clearTimeout(hintTimer.current); }, []);

  /* Place emergency markers relative to the map anchor + my location. */
  const emergencyMarkers = useMemo(() => {
    const myLat = location?.latitude ?? MAP_ANCHOR.latitude;
    const myLng = location?.longitude ?? MAP_ANCHOR.longitude;
    const cosLat = Math.cos((myLat * Math.PI) / 180);

    return nearbyEmergencies.map((event) => {
      const dLng = (event.longitude - myLng) * 111320 * cosLat * METERS_TO_PX;
      const dLat = (event.latitude - myLat) * 111320 * METERS_TO_PX;
      return {
        event,
        x: Math.min(790, Math.max(10, MAP_ANCHOR.x + dLng)),
        y: Math.min(590, Math.max(10, MAP_ANCHOR.y + dLat)),
      };
    });
  }, [nearbyEmergencies, location]);

  /* Focus the map on an emergency when arriving via ?event=<id>. */
  useEffect(() => {
    if (!focusedEventId) return;
    if (focusedOnce.current === focusedEventId) return;
    const target = emergencyMarkers.find((marker) => marker.event.id === focusedEventId);
    if (!target) return;
    focusedOnce.current = focusedEventId;
    setSelectedEmergency(target.event);
    setSelectedId(null);
    setOffset({ x: MAP_ANCHOR.x - target.x, y: MAP_ANCHOR.y - target.y });
    setZoom(1.35);
    setHint("Emergency location");
  }, [focusedEventId, emergencyMarkers]);

  const selected = selectedId ? MARKERS.find(m => m.id === selectedId) ?? null : null;
  const activeChip = nearby ? NEARBY.find(c => c.id === nearby) ?? null : null;

  const toggleLayer = (id: LayerId) => {
    setHiddenLayers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const showHint = (message: string, duration = 2600) => {
    if (hintTimer.current) window.clearTimeout(hintTimer.current);
    setHint(message);
    hintTimer.current = window.setTimeout(() => setHint(null), duration);
  };

  const handleLocate = () => {
    if (locating) return;
    if (!("geolocation" in navigator)) {
      showHint("Location is unavailable on this device");
      return;
    }
    setLocating(true);
    showHint("Finding your location…", 4500);
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocating(false);
        setZoom(1);
        setOffset({ x: 0, y: 0 });
        showHint("You are near MI Road, Jaipur");
      },
      () => {
        setLocating(false);
        showHint("Could not access your location");
      },
      { timeout: 6000 }
    );
  };

  const closeEmergencyPopup = () => {
    setSelectedEmergency(null);
    setOffset({ x: 0, y: 0 });
    setZoom(1);
  };

  const popupStyle = selected
    ? selected.y < 165
      ? { left: `${(selected.x / 800) * 100}%`, top: `calc(${(selected.y / 600) * 100}% + 20px)`, transform: "translateX(-50%)" }
      : { left: `${(selected.x / 800) * 100}%`, top: `calc(${(selected.y / 600) * 100}% - 18px)`, transform: "translate(-50%, -100%)" }
    : undefined;

  const emergencyPopupStyle = (() => {
    const marker = selectedEmergency
      ? emergencyMarkers.find((item) => item.event.id === selectedEmergency.id) ?? null
      : null;
    if (!marker) return undefined;
    return marker.y < 165
      ? { left: `${(marker.x / 800) * 100}%`, top: `calc(${(marker.y / 600) * 100}% + 20px)`, transform: "translateX(-50%)" }
      : { left: `${(marker.x / 800) * 100}%`, top: `calc(${(marker.y / 600) * 100}% - 18px)`, transform: "translate(-50%, -100%)" };
  })();

  const selectedEmergencyDistance =
    selectedEmergency?.distanceMeters !== null && selectedEmergency?.distanceMeters !== undefined
      ? selectedEmergency.distanceMeters < 1000
        ? `Approximately ${Math.max(1, Math.round(selectedEmergency.distanceMeters / 10) * 10)} m away`
        : `Approximately ${(selectedEmergency.distanceMeters / 1000).toFixed(1)} km away`
      : "Nearby";

  return (
    <div className="urban-safe-page min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">

      <UrbanSafeNavbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 flex flex-col gap-8 lg:gap-9">

        {/* HEADER */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="sm-eyebrow"><span />Live safety overlay</p>
            <h1 className="mt-2.5 text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">Safety Map</h1>
            <p className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-500">
              <MapPin size={14} className="text-blue-600 shrink-0" /> Your current area — MI Road, Jaipur
            </p>
          </div>

          <div className="sm-head-chip">
            <span>Area safety score</span>
            <b>82<i>/100</i></b>
            <p><i />Low risk</p>
          </div>
        </section>

        {/* MAP */}
        <section
          className="sm-map h-[520px] sm:h-[560px] lg:h-[640px]"
          role="application"
          aria-label="Safety map of your current area"
          onMouseDown={e => {
            const t = e.target as HTMLElement;
            if (!t.closest(".sm-marker, .sm-place, .sm-popup, .sm-controls, .sm-layers")) {
              setSelectedId(null);
              setNearby(null);
            }
          }}
        >
          <div className="sm-map-viewport" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}>
            <svg className="sm-map-svg" viewBox="0 0 800 600" preserveAspectRatio="none" aria-hidden="true">
              <ellipse cx="95" cy="555" rx="92" ry="44" fill="rgba(59,130,246,0.12)" />
              <rect x="655" y="235" width="105" height="95" rx="18" fill="rgba(34,197,94,0.08)" />
              <ellipse cx="470" cy="262" rx="150" ry="92" fill="rgba(239,68,68,0.05)" stroke="rgba(239,68,68,0.16)" strokeDasharray="5 6" />

              {BLOCKS.map(block => (
                <rect
                  key={`${block.x}-${block.y}`}
                  x={block.x} y={block.y} width={block.w} height={block.h} rx="6"
                  fill="rgba(30,41,59,0.55)" stroke="rgba(148,163,184,0.10)"
                />
              ))}

              {STREETS.map(d => (
                <g key={d}>
                  <path d={d} stroke="rgba(148,163,184,0.16)" strokeWidth={9} fill="none" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
                  <path d={d} stroke="rgba(226,232,240,0.12)" strokeWidth={1.2} fill="none" vectorEffect="non-scaling-stroke" strokeDasharray="6 11" strokeLinecap="round" />
                </g>
              ))}

              {ROADS.map(road => (
                <g key={road.d}>
                  <path d={road.d} stroke="rgba(148,163,184,0.16)" strokeWidth={road.w + 7} fill="none" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
                  <path d={road.d} stroke="rgba(148,163,184,0.30)" strokeWidth={road.w} fill="none" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
                  <path d={road.d} stroke="rgba(226,232,240,0.22)" strokeWidth={1.4} fill="none" vectorEffect="non-scaling-stroke" strokeDasharray="10 12" strokeLinecap="round" />
                </g>
              ))}
            </svg>

            {/* Area labels */}
            <span className="sm-label" style={pos(140, 505)}>Riverside</span>
            <span className="sm-label" style={pos(355, 100)}>Downtown</span>
            <span className="sm-label" style={pos(630, 372)}>Old Town</span>
            <span className="sm-label" style={pos(707, 282)}>Central Park</span>
            <span className="sm-label sm-label-route" style={pos(400, 185)}>MI Road</span>
            <span className="sm-label sm-label-route" style={{ ...pos(215, 60), transform: "translate(-50%,-50%) rotate(-86deg)" }}>Station Rd</span>
            <span className="sm-label sm-label-route" style={{ ...pos(575, 45), transform: "translate(-50%,-50%) rotate(-85deg)" }}>Ajmer Rd</span>
            <span className="sm-label sm-label-route" style={{ ...pos(300, 396), transform: "translate(-50%,-50%) rotate(-32deg)" }}>Ring Rd</span>

            {/* Current location */}
            <span className="sm-you" style={pos(400, 305)}>
              <span />You
            </span>

            {/* Nearby places */}
            {PLACES.map(place => (
              <button
                key={place.id}
                type="button"
                className={`sm-place${activeChip && activeChip.targets.includes(place.id) ? " sm-place-on" : ""}`}
                style={pos(place.x, place.y)}
                aria-label={place.title}
              >
                <place.icon size={11} />
                <span className="sm-marker-tip">{place.title} · {place.detail}</span>
              </button>
            ))}

            {/* Safety markers */}
            {MARKERS.filter(m => !hiddenLayers.has(m.layer)).map(marker => {
              const layer = LAYERS.find(l => l.id === marker.layer)!;
              const Icon = layer.icon;
              const spotlight = activeChip && activeChip.targets.includes(marker.id);
              return (
                <button
                  key={marker.id}
                  type="button"
                  className={`sm-marker${selectedId === marker.id ? " sm-selected" : ""}${spotlight ? " sm-spotlight" : ""}`}
                  style={{ ...pos(marker.x, marker.y), background: layer.color }}
                  onClick={() => { setSelectedId(selectedId === marker.id ? null : marker.id); setSelectedEmergency(null); }}
                  aria-label={marker.title}
                  aria-expanded={selectedId === marker.id}
                >
                  <Icon size={13} />
                  <span className="sm-marker-tip">{marker.title}</span>
                </button>
              );
            })}

            {/* LIVE EMERGENCY MARKERS (community SOS) */}
            {emergencyMarkers.map(({ event, x, y }) => (
              <button
                key={event.id}
                type="button"
                className={`sm-marker sm-em-marker${selectedEmergency?.id === event.id ? " sm-selected" : ""}`}
                style={{ ...pos(x, y), background: "#dc2626" }}
                onClick={() => { setSelectedEmergency(selectedEmergency?.id === event.id ? null : event); setSelectedId(null); }}
                aria-label={`${getEmergencyTypeLabel(event.type)} emergency`}
                aria-expanded={selectedEmergency?.id === event.id}
              >
                <AlertOctagon size={13} />
                <span className="sm-marker-tip">🚨 {getEmergencyTypeLabel(event.type)}</span>
              </button>
            ))}

            {/* Live emergency popup */}
            {selectedEmergency && (
              <div className="sm-popup sm-em-popup" style={emergencyPopupStyle} onMouseDown={e => e.stopPropagation()}>
                <div className="sm-popup-head">
                  <span className="sm-popup-title">
                    <i style={{ background: "#dc2626" }} />
                    Emergency
                  </span>
                  <button type="button" className="sm-popup-close" onClick={() => setSelectedEmergency(null)} aria-label="Close popup">
                    <X size={11} />
                  </button>
                </div>
                <p>
                  <b>{getEmergencyTypeLabel(selectedEmergency.type)} reported</b>
                  <br />
                  {selectedEmergencyDistance}
                  <br />
                  Reported {timeAgo(selectedEmergency.createdAt)}
                </p>
              </div>
            )}

            {/* Marker popup */}
            {selected && (
              <div className="sm-popup" style={popupStyle} onMouseDown={e => e.stopPropagation()}>
                <div className="sm-popup-head">
                  <span className="sm-popup-title">
                    <i style={{ background: LAYERS.find(l => l.id === selected.layer)!.color }} />
                    {selected.title}
                  </span>
                  <button type="button" className="sm-popup-close" onClick={() => setSelectedId(null)} aria-label="Close popup">
                    <X size={11} />
                  </button>
                </div>
                <p>{selected.detail}</p>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="sm-controls">
            <button type="button" aria-label="Zoom in" onClick={() => setZoom(z => Math.min(z + 0.15, 1.55))}><Plus size={17} /></button>
            <button type="button" aria-label="Zoom out" onClick={() => setZoom(z => Math.max(z - 0.15, 0.75))}><Minus size={17} /></button>
            <button type="button" aria-label="Locate me" onClick={handleLocate} disabled={locating}>
              {locating ? <Loader2 size={15} className="animate-spin" /> : <LocateFixed size={16} />}
            </button>
            <button
              type="button"
              aria-label="Map layers"
              aria-expanded={layersOpen}
              className={layersOpen ? "sm-on" : ""}
              onClick={() => setLayersOpen(o => !o)}
            >
              <Layers size={16} />
            </button>
          </div>

          {/* Layers panel */}
          {layersOpen && (
            <div className="sm-layers" onMouseDown={e => e.stopPropagation()}>
              <p className="sm-layers-title">Map layers</p>
              {LAYERS.map(layer => {
                const off = hiddenLayers.has(layer.id);
                const count = MARKERS.filter(m => m.layer === layer.id).length;
                return (
                  <button
                    key={layer.id}
                    type="button"
                    className="sm-layer-row"
                    onClick={() => toggleLayer(layer.id)}
                    role="checkbox"
                    aria-checked={!off}
                  >
                    <span className={`sm-layer-check${off ? "" : " sm-checked"}`} style={off ? undefined : { background: layer.color }}>
                      {!off && <Check size={10} strokeWidth={3.5} />}
                    </span>
                    <span className="sm-layer-label">{layer.label}</span>
                    <b className="sm-layer-count">{count}</b>
                  </button>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className="sm-legend" aria-hidden="true">
            <b>Safety map</b>
            {LAYERS.map(layer => (
              <span key={layer.id} className={hiddenLayers.has(layer.id) ? "sm-dim" : ""}>
                <i style={{ background: layer.color }} />{layer.label}
              </span>
            ))}
            <span><i style={{ background: "#dc2626", boxShadow: "0 0 6px rgba(220,38,38,.8)" }} />Live emergency</span>
          </div>

          {/* Area score card */}
          <aside className="sm-score">
            <span className="sm-score-label">Your area</span>
            <div className="sm-score-num">82<small>/100</small></div>
            <div className="sm-score-risk"><i />Low risk</div>
            <p className="sm-score-sub">MI Road, Jaipur</p>
          </aside>

          {/* Transient hint */}
          {hint && (
            <div className="sm-hint" onMouseDown={e => e.stopPropagation()}>
              {locating ? <Loader2 size={13} className="animate-spin text-blue-400" /> : <MapPin size={13} className="text-blue-400" />}
              {hint}
            </div>
          )}
        </section>

        {/* BELOW THE MAP */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Safety factors */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-5">
            <CardHead icon={Gauge} title="Safety factors" sub="Scores for your surrounding area" />
            <div className="flex flex-col gap-4">
              {FACTORS.map(factor => (
                <div className="sm-factor-row" key={factor.label}>
                  <span>{factor.label}</span>
                  <div className="sm-factor-track">
                    <div className="sm-factor-fill" style={{ width: `${factor.value}%`, background: FACTOR_COLORS[factor.tone] }} />
                  </div>
                  <b>{factor.value}/100</b>
                </div>
              ))}
            </div>
            <div className="mt-1 pt-4 border-t border-slate-200 flex flex-wrap gap-x-5 gap-y-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                <i className="w-2 h-2 rounded-full" style={{ background: "#10b981" }} />Good
              </span>
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                <i className="w-2 h-2 rounded-full" style={{ background: "#f59e0b" }} />Moderate
              </span>
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                <i className="w-2 h-2 rounded-full" style={{ background: "#ef4444" }} />High risk
              </span>
            </div>
          </section>

          {/* Recent alerts */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-5">
            <CardHead icon={Radar} title="Recent alerts" sub="Nearby incidents and reports" />
            <div className="flex flex-col">
              {ALERTS.map(alert => (
                <div className="sm-alert-row" key={alert.title}>
                  <span className="sm-alert-ico" style={{ background: alert.bg, color: alert.tone }}>
                    <alert.icon size={15} />
                  </span>
                  <div className="min-w-0">
                    <b>{alert.title}</b>
                    <small>{alert.distance}</small>
                  </div>
                  <time>{alert.time}</time>
                </div>
              ))}
            </div>
            <p className="mt-auto text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Updated from city sensors and community reports
            </p>
          </section>

          {/* Nearby — compact, place types only */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-5">
            <CardHead icon={MapPin} title="Nearby" sub="Tap to highlight on the map" />
            <div className="sm-nearby">
              {NEARBY.map(chip => (
                <button
                  key={chip.id}
                  type="button"
                  className={nearby === chip.id ? "sm-nearby-on" : ""}
                  onClick={() => setNearby(nearby === chip.id ? null : chip.id)}
                  aria-pressed={nearby === chip.id}
                >
                  <chip.icon size={15} />
                  {chip.label}
                </button>
              ))}
            </div>
          </section>
        </section>
      </main>

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

export default function SafetyMapPage() {
  return <Suspense fallback={null}><SafetyMapContent /></Suspense>;
}
