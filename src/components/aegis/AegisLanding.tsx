"use client";

import Link from "next/link";
import { AnimatePresence, motion, useInView } from "framer-motion";
import { Bell, Bot, ChevronRight, Crosshair, Leaf, MapPin, Shield, ShieldCheck, Sparkles, UsersRound, Video, X, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Filter = "all" | "safe" | "monitoring" | "attention";
type ZoneState = Exclude<Filter, "all">;

const features = [
  { title: "Intelligent vision", copy: "See beyond. Detect early.", detail: "24/7 AI Surveillance", icon: Video, tone: "cyan" },
  { title: "Predictive shield", copy: "Stop threats before they rise.", detail: "Behavior Analysis", icon: ShieldCheck, tone: "blue" },
  { title: "Instant response", copy: "Act fast. Reduce risk.", detail: "Real-time Alerts", icon: Zap, tone: "purple" },
  { title: "Community first", copy: "Stronger together. Safer together.", detail: "Smart Engagement", icon: UsersRound, tone: "magenta" },
  { title: "Sustainable future", copy: "Building cities that care.", detail: "Eco + Safety Sync", icon: Leaf, tone: "green" },
];

const zones = [
  { id: "12", district: "Downtown Sector", state: "safe" as ZoneState, status: "Secure", position: "zone-12", detail: "Protected perimeter clear", confidence: "98.9%" },
  { id: "07", district: "Central District", state: "monitoring" as ZoneState, status: "AI Monitoring", position: "zone-07", detail: "Sensor signal stable", confidence: "96.4%" },
  { id: "03", district: "North District", state: "safe" as ZoneState, status: "Secure", position: "zone-03", detail: "Protected perimeter clear", confidence: "99.2%" },
  { id: "14", district: "West Sector", state: "monitoring" as ZoneState, status: "AI Monitoring", position: "zone-14", detail: "Signal analyzing", confidence: "91.7%" },
  { id: "19", district: "East District", state: "attention" as ZoneState, status: "Attention", position: "zone-19", detail: "Unusual crowd movement", confidence: "94.2%" },
  { id: "22", district: "Transit Sector", state: "attention" as ZoneState, status: "Attention", position: "zone-22", detail: "Traffic pattern deviation", confidence: "87.6%" },
];

const panelContent = {
  safe: { title: "Safe zones", subtitle: "Protected areas operating normally.", stats: [["Safe zones", "12"], ["Threats", "0"], ["Avg response", "00:24"], ["Protection", "98.9%"]] },
  monitoring: { title: "Active monitoring", subtitle: "AI is currently observing these zones.", stats: [["Active zones", "07"], ["AI sensors", "128"], ["Anomalies", "03"], ["Monitoring", "24/7"]] },
  attention: { title: "Attention required", subtitle: "AI has detected unusual activity.", stats: [["Active alerts", "03"], ["High priority", "01"], ["Medium priority", "02"], ["Response ETA", "00:38"]] },
};

const entrance = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

function HudCard({ title, text, sub, className }: { title: string; text: string; sub: string; className: string }) {
  return <motion.div whileHover={{ y: -5, scale: 1.02 }} className={`hud-card ${className}`}><div className="hud-title"><Sparkles size={15} />{title}</div><p>{text}</p><small>{sub}</small></motion.div>;
}

function CountUp({ value }: { value: string }) {
  const [display, setDisplay] = useState(value.includes(":") ? "00:00" : "0");
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  useEffect(() => {
    if (!inView) return;
    const match = value.match(/[\d.]+/); const target = Number(match?.[0] ?? 0); const decimals = value.includes(".") ? 1 : 0; const prefix = value.includes(":") ? "00:" : ""; const suffix = value.includes("%") ? "%" : "";
    let start = 0; const duration = 1150; const tick = (time: number) => { if (!start) start = time; const p = Math.min((time - start) / duration, 1); const n = target * (1 - Math.pow(1 - p, 3)); setDisplay(prefix ? `${prefix}${Math.round(n).toString().padStart(2, "0")}` : `${n.toLocaleString("en-US", { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}${suffix}`); if (p < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }, [inView, value]);
  return <span ref={ref}>{display}</span>;
}

function MissionKpiCard({ label, value, trend, tone, index }: { label: string; value: string; trend: string; tone: string; index: number }) {
  return <motion.article variants={entrance} transition={{ duration: .45, delay: index * .1 }} className={`kpi ${tone}`}><p>{label}</p><strong><CountUp value={value} /></strong><span>{trend}</span><small>Last 24 Hours</small></motion.article>;
}

function IntelligencePanel({ filter, selectedZone, onClose }: { filter: ZoneState; selectedZone?: typeof zones[number] | null; onClose: () => void }) {
  const content = panelContent[filter]; const items = selectedZone ? [selectedZone] : zones.filter(zone => zone.state === filter);
  return <motion.aside className={`intelligence-panel ${filter}`} initial={{ opacity: 0, y: 20, scale: .94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: .96 }} transition={{ type: "spring", stiffness: 280, damping: 26 }} onClick={e => e.stopPropagation()}>
    <button className="panel-close" onClick={onClose} aria-label="Close intelligence panel"><X size={17} /></button>
    <div className="panel-kicker"><i />{selectedZone ? `Zone ${selectedZone.id} intelligence` : filter === "monitoring" ? "AI scanning..." : "Live intelligence"}</div>
    <h2>{selectedZone ? `Zone ${selectedZone.id} · ${selectedZone.status}` : content.title}</h2><p className="panel-subtitle">{selectedZone ? selectedZone.district : content.subtitle}</p>
    {!selectedZone && <div className="panel-stats">{content.stats.map(([label, value]) => <div key={label}><span>{label}</span><b>{value}</b></div>)}</div>}
    <div className="zone-list">{items.map(zone => <article key={zone.id} className="panel-zone"><span className="zone-dot" /><div><b>Zone {zone.id}</b><p>{zone.district}</p></div><small>{selectedZone ? <><em>{zone.detail}</em>AI confidence: {zone.confidence}<br />Last updated: 12 sec ago</> : <><em>Status:</em>{zone.status}{filter === "monitoring" && <><br /><em>Signal:</em> {zone.detail.replace("Sensor signal ", "")}</>}</>}</small></article>)}</div>
    {filter === "attention" && <a className="response-button" href="#mission">View response plan <ChevronRight size={17} /></a>}
  </motion.aside>;
}

export default function AegisLanding() {
  const [selectedFilter, setSelectedFilter] = useState<Filter>("all");
  const [selectedZone, setSelectedZone] = useState<typeof zones[number] | null>(null);
  const missionRef = useRef<HTMLElement>(null); const missionInView = useInView(missionRef, { once: true, margin: "-80px" });
  const closePanel = () => { setSelectedFilter("all"); setSelectedZone(null); };
  useEffect(() => { const escape = (e: KeyboardEvent) => e.key === "Escape" && closePanel(); window.addEventListener("keydown", escape); return () => window.removeEventListener("keydown", escape); }, []);
  const selectFilter = (filter: Filter) => { setSelectedFilter(filter); setSelectedZone(null); };
  return <div className="aegis-page" onClick={() => selectedFilter !== "all" && closePanel()}>
    <div className="aegis-stars" aria-hidden="true" />
    <motion.nav className="aegis-nav" initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .65, ease: "easeOut" }}>
      <Link href="/" className="aegis-brand"><span className="brand-mark"><Shield size={26} /><b>A</b></span><span>AEGIS <i>AI</i></span></Link>
      <div className="aegis-nav-links"><a className="active" href="#home">HOME</a><a href="#mission">PLANNING</a><a href="#details">DETAILS</a><a href="#about">ABOUT</a></div>
      <div className="aegis-actions"><button aria-label="System status"><Crosshair size={18} /></button><button aria-label="Notifications"><Bell size={18} /></button><span className="aegis-avatar"><Bot size={21} /></span></div>
    </motion.nav>
    <main id="home" className="aegis-shell">
      <section className="aegis-hero">
        <div className="hero-copy"><motion.p className="eyebrow" initial="hidden" animate="visible" variants={entrance} transition={{ duration: .55 }}>Guardians of tomorrow</motion.p><motion.h1 initial="hidden" animate="visible" variants={entrance} transition={{ duration: .65, delay: .15 }}>Safer today.<br />Stronger tomorrow.</motion.h1><motion.h2 initial="hidden" animate="visible" variants={entrance} transition={{ duration: .55, delay: .3 }}>AI-powered intelligence for a world that thrives.</motion.h2><motion.p className="hero-description" initial="hidden" animate="visible" variants={entrance} transition={{ duration: .55, delay: .4 }}>Aegis AI blends real-time predictive analytics, adaptive surveillance and proactive response to protect what matters most.</motion.p><motion.div className="hero-ctas" initial="hidden" animate="visible" variants={entrance} transition={{ duration: .55, delay: .55 }}><Link href="/dashboard" className="launch-button"><Shield size={18} />Launch shield <ChevronRight size={18} /></Link><a href="#features" className="explore-button">Explore platform <ChevronRight size={17} /></a></motion.div></div>
        <div className="city-stage" aria-label="Holographic city intelligence visualization"><HudCard title="Predict" text="AI Threat Forecast" sub="98.7% Accuracy" className="hud-predict" /><HudCard title="Prevent" text="Risk Mitigation" sub="Active" className="hud-prevent" /><HudCard title="Protect" text="Communities Safe" sub="Always" className="hud-protect" /><div className="orbital-ring ring-one" /><div className="orbital-ring ring-two" /><div className="globe"><div className="globe-grid" /><div className="city"><span /><span /><span /><span /><span /><span /><span /><span /></div><div className="globe-haze" /></div><div className="city-platform"><i /><i /><i /></div><div className="drone drone-one">✦</div><div className="drone drone-two">✦</div></div>
      </section>
      <section id="features" className="feature-strip">{features.map(({ title, copy, detail, icon: Icon, tone }, index) => <motion.article key={title} className={`feature-card ${tone}`} initial={{ opacity: 0, y: 18, scale: .98 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true, amount: .35 }} transition={{ duration: .42, delay: index * .08 }} whileHover={{ y: -6 }}><span className="feature-icon"><Icon size={25} /></span><div><h3>{title}</h3><p>{copy}</p><small>• {detail}</small></div></motion.article>)}</section>
      <motion.section id="mission" ref={missionRef} className="mission-panel" initial={{ opacity: 0, y: 18 }} animate={missionInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: .6 }}>
        <div className="mission-heading"><div><h2>Mission control <span>• Live feed</span></h2><p>Real-time intelligence across the urban safety network.</p></div><span className="system-state"><i /> All systems synchronized</span></div>
        <div className="mission-grid"><motion.div className="kpi-area" initial="hidden" animate={missionInView ? "visible" : "hidden"}>{[["Threats detected", "1,248", "-8.2%", "violet"], ["Zones monitored", "326", "+12.5%", "cyan"], ["Response time", "00:38", "-22%", "cyan"], ["Communities safe", "98.9%", "+3.4%", "cyan"]].map(([label, value, trend, tone], index) => <MissionKpiCard key={label} label={label} value={value} trend={trend} tone={tone} index={index} />)}</motion.div>
          <div id="details" className={`city-overview filter-${selectedFilter}`}><div className="map-header"><h3>Live city overview</h3><div className="filter-tabs">{(["all", "safe", "monitoring", "attention"] as Filter[]).map(filter => <button key={filter} onClick={e => { e.stopPropagation(); selectFilter(filter); }} className={selectedFilter === filter ? `selected ${filter}` : ""}>{filter}</button>)}</div></div><div className="city-map"><div className="map-lines" />{zones.map(zone => <button key={zone.id} className={`map-marker ${zone.position} ${zone.state} ${selectedFilter !== "all" && selectedFilter !== zone.state ? "dimmed" : ""}`} onClick={e => { e.stopPropagation(); setSelectedFilter(zone.state); setSelectedZone(zone); }}><span className="marker-ring" /><MapPin size={14} /><div><b>Zone {zone.id}</b><span>{zone.status}</span></div><span className="marker-tooltip">ZONE {zone.id}<br />{zone.status.toUpperCase()}</span></button>)}</div></div>
          <div className="threat-index"><h3>Threat index</h3><div className="threat-ring"><div><b>Low</b><span>23%</span></div></div><p><i /> All systems normal</p></div>
        </div>
        <AnimatePresence>{selectedFilter !== "all" && <IntelligencePanel filter={selectedFilter} selectedZone={selectedZone} onClose={closePanel} />}</AnimatePresence>
      </motion.section>
    </main><footer id="about">© 2038 Aegis AI · Autonomous urban intelligence</footer>
  </div>;
}
