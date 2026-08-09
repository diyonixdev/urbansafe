"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Banknote,
  CarFront,
  Check,
  Cross,
  Gauge,
  HardHat,
  Layers,
  Lightbulb,
  Loader2,
  LocateFixed,
  MapPin,
  Minus,
  Plus,
  Radar,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UtensilsCrossed,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Map as LeafletMap } from "leaflet";
import { UrbanSafeNavbar } from "@/components/layouts/UrbanSafeNavbar";
import { useEmergency } from "@/components/emergency/EmergencyProvider";
import {
  SAFETY_LAYER_META,
  STATIC_LAYER_MARKERS,
  type SafetyLayerId,
} from "@/components/RealSafetyMapData";

const RealSafetyMap = dynamic(() => import("@/components/RealSafetyMap"), { ssr: false });

const LAYER_ICONS: Record<SafetyLayerId, LucideIcon> = {
  crime: ShieldAlert,
  construction: HardHat,
  accident: CarFront,
  lighting: Lightbulb,
  police: Shield,
};

interface LayerConfig {
  id: SafetyLayerId;
  label: string;
  color: string;
  icon: LucideIcon;
}

const LAYERS: LayerConfig[] = (Object.keys(SAFETY_LAYER_META) as SafetyLayerId[]).map((id) => ({
  id,
  ...SAFETY_LAYER_META[id],
  icon: LAYER_ICONS[id],
}));

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
  const [hiddenLayers, setHiddenLayers] = useState<Set<SafetyLayerId>>(() => new Set());
  const [layersOpen, setLayersOpen] = useState(false);
  const [nearby, setNearby] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const hintTimer = useRef<number | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  const { nearby: nearbyEmergencies, location } = useEmergency();
  const searchParams = useSearchParams();
  const focusedEventId = searchParams.get("event");

  useEffect(() => () => { if (hintTimer.current) window.clearTimeout(hintTimer.current); }, []);

  /* Focus hint when arriving via ?event=<id>. */
  useEffect(() => {
    if (focusedEventId) setHint("Emergency location");
  }, [focusedEventId]);

  const activeChip = nearby ? NEARBY.find(c => c.id === nearby) ?? null : null;

  const toggleLayer = (id: SafetyLayerId) => {
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
    const map = mapRef.current;
    if (!map) {
      showHint("Map is still loading");
      return;
    }
    if (!("geolocation" in navigator)) {
      showHint("Location is unavailable on this device");
      return;
    }
    setLocating(true);
    showHint("Finding your location…", 4500);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        map.flyTo([pos.coords.latitude, pos.coords.longitude], 16, { duration: 1 });
        showHint("You are near your current location");
      },
      () => {
        setLocating(false);
        showHint("Could not access your location");
      },
      { timeout: 6000 }
    );
  };

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
            if (!t.closest(".sm-controls, .sm-layers, .leaflet-marker-icon, .leaflet-popup")) {
              setNearby(null);
            }
          }}
        >
          <RealSafetyMap
            emergencies={nearbyEmergencies}
            userLocation={location}
            focusedEventId={focusedEventId}
            hiddenLayers={Array.from(hiddenLayers)}
            spotlightIds={activeChip?.targets ?? []}
            variant="embedded"
            mapRef={mapRef}
          />

          {/* Controls */}
          <div className="sm-controls">
            <button type="button" aria-label="Zoom in" onClick={() => mapRef.current?.zoomIn()}>
              <Plus size={17} />
            </button>
            <button type="button" aria-label="Zoom out" onClick={() => mapRef.current?.zoomOut()}>
              <Minus size={17} />
            </button>
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
                const count = STATIC_LAYER_MARKERS.filter(m => m.layer === layer.id).length;
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