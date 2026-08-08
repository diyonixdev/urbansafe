"use client";

import React from "react";
import { 
  ShieldCheck, MapPin, Search, Navigation, 
  Map as MapIcon, Home, Bell, Phone, 
  Menu, FileWarning, ArrowRight
} from "lucide-react";

export default function AegisLanding() {
  return (
    <div className="bg-slate-100 min-h-screen flex items-center justify-center font-sans">
      {/* Mobile App Shell */}
      <div className="bg-white w-full max-w-md min-h-screen sm:min-h-[850px] relative shadow-2xl overflow-hidden flex flex-col sm:my-8 sm:rounded-[40px] sm:border-8 border-slate-900">
        
        {/* Top Header */}
        <header className="px-5 py-4 flex items-center justify-between z-10 bg-white/90 backdrop-blur-md sticky top-0 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg text-white">
              <ShieldCheck size={20} />
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-900">Urban Safe</span>
          </div>
          <button className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-600 active:scale-95 transition-transform">
            <Menu size={20} />
          </button>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto pb-24 flex flex-col">
          
          {/* Map Area */}
          <div className="w-full h-[320px] bg-slate-200 relative shrink-0">
             <div className="absolute inset-0 bg-[#f0f3f5] z-0">
               <div className="w-full h-full" style={{backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '16px 16px'}}></div>
             </div>
             
             {/* Fake Routes */}
             <div className="absolute inset-0 pointer-events-none">
                 <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none">
                    <path d="M50,80 C150,150 200,50 350,220" fill="none" stroke="#16a34a" strokeWidth="6" strokeLinecap="round" className="drop-shadow-sm opacity-90" />
                    <circle cx="200" cy="110" r="14" fill="#16a34a" />
                    <text x="200" y="114" fontSize="10" fill="white" fontWeight="bold" textAnchor="middle">89</text>
                 </svg>
                 <div className="absolute top-[70px] left-[40px] w-5 h-5 bg-blue-600 border-2 border-white rounded-full shadow-md z-20"></div>
                 <div className="absolute top-[210px] left-[340px] w-6 h-6 bg-slate-900 border-2 border-white rounded-full shadow-md z-20 flex items-center justify-center">
                   <div className="w-2 h-2 bg-white rounded-full"></div>
                 </div>
             </div>
             
             {/* Location Inputs overlaid on map */}
             <div className="absolute top-4 left-4 right-4 bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-lg border border-slate-100">
                <div className="flex items-center gap-3 relative pb-3 border-b border-slate-100">
                  <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                  </div>
                  <input type="text" defaultValue="Current Location" className="bg-transparent w-full text-sm font-medium outline-none text-slate-800" />
                </div>
                <div className="flex items-center gap-3 pt-3">
                  <MapPin size={16} className="text-red-500 shrink-0" />
                  <input type="text" placeholder="Where to?" className="bg-transparent w-full text-sm font-medium outline-none text-slate-800 placeholder:text-slate-400" />
                </div>
             </div>
          </div>

          <div className="px-4 py-5 flex flex-col gap-5">
            {/* Find Route Button */}
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3.5 font-semibold shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2">
              <Search size={18} />
              Find Safest Route
            </button>
            
            {/* Route Options (Horizontal scroll) */}
            <div>
              <h3 className="font-bold text-slate-900 mb-3 px-1">Recommended Routes</h3>
              <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar -mx-4 px-4">
                
                {/* Safe Card */}
                <div className="min-w-[260px] snap-center bg-white border-2 border-green-500 rounded-2xl p-4 shadow-sm relative">
                  <div className="absolute -top-3 left-4 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Safest</div>
                  <div className="flex justify-between items-start mt-1">
                    <div>
                      <h4 className="font-bold text-slate-900">24 min</h4>
                      <p className="text-xs text-slate-500 font-medium">9.3 km • Safe Route</p>
                    </div>
                    <div className="bg-green-50 text-green-700 font-bold text-lg px-2 py-1 rounded-lg">89</div>
                  </div>
                </div>

                {/* Fast Card */}
                <div className="min-w-[260px] snap-center bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-900">18 min</h4>
                      <p className="text-xs text-slate-500 font-medium">7.1 km • Fastest</p>
                    </div>
                    <div className="bg-red-50 text-red-700 font-bold text-lg px-2 py-1 rounded-lg">64</div>
                  </div>
                </div>

              </div>
            </div>

            {/* Safety Score Breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4">Why it's safer</h3>
              <div className="flex flex-col gap-3">
                {[
                  { label: "Crime Risk", score: 92, color: "bg-green-500" },
                  { label: "Accident History", score: 90, color: "bg-green-500" },
                  { label: "Lighting", score: 84, color: "bg-green-400" },
                  { label: "Police Proximity", score: 95, color: "bg-green-500" }
                ].map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1 font-medium text-slate-700">
                      <span>{item.label}</span>
                      <span className="font-bold">{item.score}/100</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div className={`${item.color} h-1.5 rounded-full`} style={{ width: `${item.score}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Travel Time Predictor */}
            <div className="bg-slate-900 rounded-2xl p-5 shadow-sm text-white">
              <h3 className="font-bold text-sm text-slate-300 mb-3 uppercase tracking-wider">Leave later?</h3>
              <div className="flex justify-between items-end">
                {[
                  { time: "NOW", score: 89, color: "bg-green-500" },
                  { time: "6 PM", score: 84, color: "bg-green-400" },
                  { time: "9 PM", score: 76, color: "bg-yellow-500" },
                  { time: "11 PM", score: 62, color: "bg-red-500" },
                ].map((slot, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <span className="text-sm font-bold">{slot.score}</span>
                    <div className="w-1.5 h-8 bg-slate-800 rounded-full my-1 flex items-end">
                      <div className={`w-full rounded-full ${slot.color}`} style={{height: `${slot.score}%`}}></div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">{slot.time}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </main>

        {/* Bottom Navigation */}
        <nav className="absolute bottom-0 w-full bg-white border-t border-slate-200 pb-safe pt-2 px-6 flex justify-between items-center z-20 pb-4 sm:rounded-b-[32px]">
          <button className="flex flex-col items-center gap-1 text-blue-600 p-2">
            <Home size={22} className="fill-blue-100" />
            <span className="text-[10px] font-bold">Home</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600 p-2 transition-colors">
            <MapIcon size={22} />
            <span className="text-[10px] font-bold">Map</span>
          </button>
          
          {/* Floating SOS Button */}
          <div className="relative -top-6">
            <button className="w-14 h-14 bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-red-600/30 border-4 border-white active:scale-95 transition-transform">
              <Phone size={24} className="fill-white/20" />
            </button>
          </div>
          
          <button className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600 p-2 transition-colors">
            <FileWarning size={22} />
            <span className="text-[10px] font-bold">Reports</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600 p-2 transition-colors">
            <Bell size={22} />
            <span className="text-[10px] font-bold">Alerts</span>
          </button>
        </nav>
        
        {/* CSS for hiding scrollbar on horizontal list */}
        <style dangerouslySetInnerHTML={{__html: `
          .hide-scrollbar::-webkit-scrollbar { display: none; }
          .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          .pb-safe { padding-bottom: env(safe-area-inset-bottom, 16px); }
        `}} />
      </div>
    </div>
  );
}
