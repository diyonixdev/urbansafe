"use client";

import { useEffect, useState } from "react";
import { AlertOctagon, Mic, MessageSquareText, PhoneCall, ShieldCheck, Bot } from "lucide-react";
import { UrbanSafeNavbar } from "@/components/layouts/UrbanSafeNavbar";
import { EmergencyPanel } from "@/components/emergency/EmergencyPanel";
import { useEmergency } from "@/components/emergency/EmergencyProvider";
import { useAuth } from "@/hooks/useAuth";
import { getEmergencyHistory } from "@/services/emergency";
import { getEmergencyTypeLabel } from "@/services/emergency-config";
import { formatHistoryTime } from "@/lib/geo";
import type { EmergencyEventRecord } from "@/services/emergency-types";

const EMERGENCY_SERVICES = [
  { label: "Police", number: "100", tone: "#2563eb" },
  { label: "Ambulance", number: "108", tone: "#dc2626" },
  { label: "Fire", number: "101", tone: "#ea580c" },
];

function EmergencyHistory({ uid }: { uid: string }) {
  const [history, setHistory] = useState<EmergencyEventRecord[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getEmergencyHistory(uid, 5).then((events) => {
      if (!cancelled) setHistory(events);
    });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  if (history === null) return null;
  if (history.length === 0) return null;

  return (
    <section className="em-history">
      <h2>Recent emergency activity</h2>
      <div className="em-history-list">
        {history.map((event) => (
          <div key={event.id} className="em-history-row">
            <span className="em-history-icon"><AlertOctagon size={14} /></span>
            <div>
              <b>{getEmergencyTypeLabel(event.type)}</b>
              <small>{formatHistoryTime(event.createdAt)}</small>
            </div>
            <span className={`em-history-status ${event.status}`}>
              {event.status === "active" ? "Active" : "Resolved"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function EmergencyPage() {
  const { user } = useAuth();
  const { openSos } = useEmergency();

  return (
    <div className="urban-safe-page min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      <UrbanSafeNavbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 flex flex-col gap-8 lg:gap-9">
        {/* HEADER */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="sm-eyebrow"><span />Emergency response</p>
            <h1 className="mt-2.5 text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">Emergency</h1>
            <p className="mt-1.5 text-sm font-semibold text-slate-500">
              Get help quickly when you need it.
            </p>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* MAIN EMERGENCY INTERFACE */}
          <section className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
            <div className="flex items-center gap-2.5 mb-6">
              <span className="grid place-items-center w-8 h-8 rounded-lg bg-red-50 text-red-600 shrink-0"><AlertOctagon size={16} /></span>
              <div>
                <h2 className="text-[13px] font-extrabold uppercase tracking-[0.12em] text-slate-900">🚨 SOS</h2>
                <p className="text-xs text-slate-500 mt-0.5">Hold to send an emergency alert.</p>
              </div>
            </div>

            <EmergencyPanel embedded />

            <div className="mt-6 pt-5 border-t border-slate-200 flex flex-col sm:flex-row gap-3">
              <button type="button" className="em-page-btn" onClick={() => openSos("text")}>
                <MessageSquareText size={15} /> Type Message
              </button>
              <button type="button" className="em-page-btn" onClick={() => openSos("voice")}>
                <Mic size={15} /> Record Voice
              </button>
              <button type="button" className="em-page-btn" onClick={() => openSos("chat")}>
                <Bot size={15} /> Chat with AI
              </button>
            </div>
          </section>

          {/* EMERGENCY CONTACTS + HISTORY */}
          <aside className="flex flex-col gap-6">
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="grid place-items-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 shrink-0"><PhoneCall size={15} /></span>
                <div>
                  <h2 className="text-[13px] font-extrabold uppercase tracking-[0.12em] text-slate-900">Emergency contacts</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Call them directly if you can</p>
                </div>
              </div>
              <div className="flex flex-col gap-2.5">
                {EMERGENCY_SERVICES.map((service) => (
                  <div key={service.label} className="em-contact-row">
                    <span className="em-contact-dot" style={{ background: service.tone }} />
                    <span>{service.label}</span>
                    <b>{service.number}</b>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[11px] font-semibold text-slate-400 leading-relaxed">
                UrbanSafe notifies nearby users — it does not contact emergency services automatically.
              </p>
            </section>

            {user && <EmergencyHistory uid={user.uid} />}

            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-2.5">
                <span className="grid place-items-center w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 shrink-0"><ShieldCheck size={16} /></span>
                <div>
                  <h2 className="text-[13px] font-extrabold uppercase tracking-[0.12em] text-slate-900">How it works</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Community SOS</p>
                </div>
              </div>
              <ul className="em-how-list">
                <li>You send an SOS with your approximate location.</li>
                <li>Nearby UrbanSafe users receive a red alert.</li>
                <li>Your identity and exact location are never shared.</li>
                <li>You can cancel the alert when you are safe.</li>
              </ul>
            </section>
          </aside>
        </div>
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
