"use client";

import { AlertTriangle, Banknote, Car, Coffee, Construction, Crosshair, HeartPulse, Lightbulb, MapPin, Minus, Plus, Shield, ShieldCheck } from "lucide-react";

const factors = [
  { label: "Crime", value: 78, tone: "good" },
  { label: "Accidents", value: 91, tone: "good" },
  { label: "Lighting", value: 72, tone: "moderate" },
  { label: "Road condition", value: 84, tone: "good" },
  { label: "Police proximity", value: 93, tone: "good" },
];

const alerts = [
  { icon: Construction, label: "Road construction", distance: "500 m away", tone: "orange" },
  { icon: AlertTriangle, label: "Accident reported", distance: "1.2 km away", tone: "red" },
  { icon: Lightbulb, label: "Streetlight not working", distance: "300 m away", tone: "amber" },
];

const nearby = [
  { label: "Police", icon: Shield },
  { label: "Hospital", icon: HeartPulse },
  { label: "ATM", icon: Banknote },
  { label: "Restaurant", icon: Coffee },
];

function MapMarker({ className, icon: Icon, label }: { className: string; icon: typeof AlertTriangle; label: string }) {
  return <div className={`dashboard-map-marker ${className}`} title={label}><span><Icon size={15} /></span><small>{label}</small></div>;
}

export default function DashboardPage() {
  return <div className="urban-dashboard">
    <header className="dashboard-heading">
      <div><p className="dashboard-eyebrow"><MapPin size={15} />Current location</p><h1>Your current area</h1><p>Safety conditions around your current location</p></div>
      <article className="safety-score"><span>Safety score</span><strong>82<small>/100</small></strong><p><i /> Low Risk</p></article>
    </header>

    <section className="dashboard-map" aria-label="Local safety map placeholder">
      <div className="map-water water-one" /><div className="map-water water-two" />
      <div className="map-road road-one" /><div className="map-road road-two" /><div className="map-road road-three" /><div className="map-road road-four" />
      <div className="map-street street-one" /><div className="map-street street-two" /><div className="map-street street-three" /><div className="map-street street-four" />
      <span className="map-neighbourhood n-one">Riverside</span><span className="map-neighbourhood n-two">Central Market</span><span className="map-neighbourhood n-three">Park View</span>
      <div className="dashboard-current-location"><span /><b>Your location</b></div>
      <MapMarker className="crime-marker" icon={AlertTriangle} label="Crime hotspot" /><MapMarker className="construction-marker" icon={Construction} label="Construction" /><MapMarker className="accident-marker" icon={Car} label="Accident" /><MapMarker className="lighting-marker" icon={Lightbulb} label="Poor lighting" /><MapMarker className="police-marker" icon={ShieldCheck} label="Police station" />
      <div className="map-controls"><button aria-label="Zoom in"><Plus size={18} /></button><button aria-label="Zoom out"><Minus size={18} /></button><button aria-label="Current location"><Crosshair size={18} /></button></div>
      <div className="map-legend"><b>Safety markers</b><span><i className="crime" />Crime</span><span><i className="construction" />Construction</span><span><i className="accident" />Accident</span><span><i className="lighting" />Poor lighting</span><span><i className="police" />Police</span></div>
    </section>

    <section className="safety-factors"><div className="section-title"><h2>Safety factors</h2><p>Scores for your surrounding area</p></div><div className="factor-list">{factors.map(factor => <div className="factor-row" key={factor.label}><span>{factor.label}</span><div className="factor-track"><i className={factor.tone} style={{ width: `${factor.value}%` }} /></div><b>{factor.value}/100</b></div>)}</div></section>

    <section className="dashboard-bottom"><article className="dashboard-panel"><div className="section-title"><h2>Recent alerts</h2><p>Reported nearby</p></div><div className="alert-list">{alerts.map(({ icon: Icon, label, distance, tone }) => <div className="alert-row" key={label}><span className={tone}><Icon size={18} /></span><b>{label}</b><small>{distance}</small></div>)}</div></article><article className="dashboard-panel nearby-panel"><div className="section-title"><h2>Nearby</h2><p>Useful places around you</p></div><div className="nearby-actions">{nearby.map(({ label, icon: Icon }) => <button key={label}><Icon size={18} /><span>{label}</span></button>)}</div></article></section>
  </div>;
}
