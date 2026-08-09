"use client";

import React, { useState, useRef } from "react";
import dynamic from 'next/dynamic';
import { 
  ShieldCheck, MapPin, Search, AlertTriangle, 
  Lightbulb, Car, UserCheck, Crosshair, 
  ChevronRight, Phone, Navigation, Clock,
  AlertOctagon, CheckCircle2, Shield, HeartPulse,
  Banknote, Coffee, Fuel, Loader2, Navigation2
} from "lucide-react";
import { UrbanSafeNavbar } from "@/components/layouts/UrbanSafeNavbar";
import { SosChatbot } from "@/components/emergency/SosChatbot";

// Dynamically import map to avoid SSR issues
const RouteMap = dynamic(() => import("@/components/maps/RouteMap"), { ssr: false, loading: () => <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400"><Loader2 className="animate-spin" size={32} /></div> });

interface LocationResult {
  lat: string;
  lon: string;
  display_name: string;
}

export default function AegisLanding() {
  const [origin, setOrigin] = useState<{lat: number, lon: number, name: string} | null>(null);
  const [destination, setDestination] = useState<{lat: number, lon: number, name: string} | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][] | null>(null);
  
  const [originInput, setOriginInput] = useState("");
  const [destInput, setDestInput] = useState("");
  
  const [destSuggestions, setDestSuggestions] = useState<LocationResult[]>([]);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isRouting, setIsRouting] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const destTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleLocateMe = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      setIsLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
          const data = await res.json();
          const name = data.display_name || "Current Location";
          setOrigin({ lat, lon, name });
          setOriginInput(name);
        } catch (error) {
          console.error("Reverse geocode error", error);
          setOrigin({ lat, lon, name: "Current Location" });
          setOriginInput("Current Location");
        }
        setIsLocating(false);
      },
      (error) => {
        alert("Failed to get location. Please allow location access.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleDestChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDestInput(val);
    setDestination(null);
    
    if (destTimeoutRef.current) clearTimeout(destTimeoutRef.current);
    
    if (val.length < 3) {
      setDestSuggestions([]);
      setShowDestSuggestions(false);
      return;
    }

    destTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=5`);
        const data = await res.json();
        setDestSuggestions(data);
        setShowDestSuggestions(true);
      } catch (error) {
        console.error("Geocoding error", error);
      }
    }, 500);
  };

  const selectDest = (s: LocationResult) => {
    setDestination({ lat: parseFloat(s.lat), lon: parseFloat(s.lon), name: s.display_name });
    setDestInput(s.display_name);
    setShowDestSuggestions(false);
  };

  const calculateRoute = async () => {
    if (!origin || !destination) {
      alert("Please set both origin and destination.");
      return;
    }
    setIsRouting(true);
    setRouteError(null);
    try {
      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${destination.lon},${destination.lat}?overview=full&geometries=geojson`);
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const coords = data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]] as [number, number]);
        setRouteCoords(coords);
      } else {
        setRouteError("No route found.");
      }
    } catch (error) {
      console.error("Routing error", error);
      setRouteError("Failed to calculate route.");
    }
    setIsRouting(false);
  };

  return (
    <div className="urban-safe-page min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      
      <UrbanSafeNavbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 flex flex-col gap-12">
        
        {/* HERO / MAIN SCREEN */}
        <section id="plan-route" className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* LEFT SIDE */}
          <div className="lg:col-span-5 flex flex-col gap-8">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
                Find the <span className="text-blue-600">safest</span> way to go.
              </h1>
              <p className="mt-4 text-lg text-slate-600 leading-relaxed">
                Plan your route using real-time and historical data on crime, accidents, lighting, road conditions, and more.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4 relative">
              <div className="absolute left-[31px] top-[46px] bottom-[46px] w-[2px] bg-slate-200 z-0"></div>
              
              <div className="relative z-10 flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 border-2 border-white">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
                </div>
                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-2">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Your location</p>
                    <input 
                      type="text" 
                      value={originInput}
                      onChange={(e) => setOriginInput(e.target.value)}
                      placeholder="Current Location" 
                      className="bg-transparent w-full text-slate-900 font-medium outline-none" 
                    />
                  </div>
                  <button 
                    onClick={handleLocateMe}
                    disabled={isLocating}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                    title="Use my current location"
                  >
                    {isLocating ? <Loader2 size={18} className="animate-spin" /> : <Navigation2 size={18} />}
                  </button>
                </div>
              </div>
              
              <div className="relative z-10 flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0 border-2 border-white">
                  <MapPin size={14} className="fill-green-600 text-white" />
                </div>
                <div className="flex-1 relative">
                  <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all shadow-sm">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Where do you want to go?</p>
                    <input 
                      type="text" 
                      value={destInput}
                      onChange={handleDestChange}
                      onFocus={() => { if(destSuggestions.length > 0) setShowDestSuggestions(true); }}
                      placeholder="Enter destination" 
                      className="bg-transparent w-full text-slate-900 font-medium outline-none placeholder:text-slate-400" 
                    />
                  </div>
                  {showDestSuggestions && destSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto">
                      {destSuggestions.map((s, i) => (
                        <div 
                          key={i} 
                          className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 text-sm"
                          onClick={() => selectDest(s)}
                        >
                          {s.display_name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {routeError && (
                <div className="text-red-500 text-sm mt-2 font-medium bg-red-50 p-3 rounded-lg border border-red-100 flex items-center gap-2">
                  <AlertTriangle size={16} /> {routeError}
                </div>
              )}

              <button 
                onClick={calculateRoute}
                disabled={isRouting || !origin || !destination}
                className="mt-2 w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl py-3.5 font-semibold shadow-sm shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
              >
                {isRouting ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                {isRouting ? "Calculating..." : "Find Safest Route"}
              </button>
            </div>

            <div className="flex flex-wrap gap-4 items-center pt-2">
              <span className="text-sm font-medium text-slate-500">Analyzes:</span>
              <div className="flex items-center gap-1.5 text-xs font-medium bg-white border border-slate-200 px-2.5 py-1.5 rounded-md text-slate-600"><AlertTriangle size={14} className="text-red-500"/> Crime</div>
              <div className="flex items-center gap-1.5 text-xs font-medium bg-white border border-slate-200 px-2.5 py-1.5 rounded-md text-slate-600"><Car size={14} className="text-orange-500"/> Accidents</div>
              <div className="flex items-center gap-1.5 text-xs font-medium bg-white border border-slate-200 px-2.5 py-1.5 rounded-md text-slate-600"><Lightbulb size={14} className="text-yellow-500"/> Lighting</div>
              <div className="flex items-center gap-1.5 text-xs font-medium bg-white border border-slate-200 px-2.5 py-1.5 rounded-md text-slate-600"><Navigation size={14} className="text-slate-500"/> Roads</div>
              <div className="flex items-center gap-1.5 text-xs font-medium bg-white border border-slate-200 px-2.5 py-1.5 rounded-md text-slate-600"><Shield size={14} className="text-blue-500"/> Police</div>
            </div>
          </div>

          {/* RIGHT SIDE (MAP) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px] relative">
            <RouteMap 
              origin={origin ? [origin.lat, origin.lon] : null}
              destination={destination ? [destination.lat, destination.lon] : null}
              routeCoordinates={routeCoords}
            />
          </div>
        </section>

        {/* ROUTE COMPARISON */}
        <section className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Choose your route</h2>
              <p className="text-slate-500 mt-1">Routes are ranked based on safety score and travel time.</p>
            </div>
            <button className="text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors border border-blue-100">
              <Crosshair size={14} /> Customize Weightage
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Safe Route */}
            <div className="bg-white border-2 border-green-500 rounded-2xl p-5 shadow-sm shadow-green-100 relative cursor-pointer hover:shadow-md transition-shadow">
              <div className="absolute -top-3 left-5 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide flex items-center gap-1">
                <CheckCircle2 size={14} /> Recommended
              </div>
              <div className="flex justify-between items-start mt-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Safe Route</h3>
                  <div className="flex items-center gap-2 text-slate-500 text-sm mt-1">
                    <span className="font-semibold text-slate-900">24 min</span>
                    <span>•</span>
                    <span>9.3 km</span>
                  </div>
                </div>
                <div className="bg-green-50 text-green-700 font-bold text-xl px-3 py-1.5 rounded-lg border border-green-100">
                  89<span className="text-sm text-green-600/70">/100</span>
                </div>
              </div>
              <ul className="mt-5 flex flex-col gap-2 text-sm text-slate-600 font-medium">
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Low crime</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Well lit</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Police nearby</li>
              </ul>
            </div>

            {/* Balanced Route */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-orange-300 hover:shadow-md transition-all cursor-pointer opacity-80 hover:opacity-100">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Balanced Route</h3>
                  <div className="flex items-center gap-2 text-slate-500 text-sm mt-1">
                    <span className="font-semibold text-slate-900">21 min</span>
                    <span>•</span>
                    <span>8.5 km</span>
                  </div>
                </div>
                <div className="bg-orange-50 text-orange-700 font-bold text-xl px-3 py-1.5 rounded-lg border border-orange-100">
                  81<span className="text-sm text-orange-600/70">/100</span>
                </div>
              </div>
              <ul className="mt-5 flex flex-col gap-2 text-sm text-slate-600 font-medium">
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div> Moderate risk</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Average lighting</li>
              </ul>
            </div>

            {/* Fastest Route */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-red-300 hover:shadow-md transition-all cursor-pointer opacity-80 hover:opacity-100">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Fastest Route</h3>
                  <div className="flex items-center gap-2 text-slate-500 text-sm mt-1">
                    <span className="font-semibold text-slate-900">18 min</span>
                    <span>•</span>
                    <span>7.1 km</span>
                  </div>
                </div>
                <div className="bg-red-50 text-red-700 font-bold text-xl px-3 py-1.5 rounded-lg border border-red-100">
                  64<span className="text-sm text-red-600/70">/100</span>
                </div>
              </div>
              <ul className="mt-5 flex flex-col gap-2 text-sm text-slate-600 font-medium">
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> High risk area</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> Poor lighting</li>
              </ul>
            </div>
          </div>
        </section>

        {/* AI EMERGENCY ASSISTANT */}
        <section className="flex flex-col md:flex-row gap-8 bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
          <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-4 tracking-tight">AI Emergency Assistant</h2>
            <p className="text-slate-600 text-lg mb-6 leading-relaxed">
              Get immediate, calm, and actionable advice during critical situations. Whether it&apos;s first aid, disaster response, or safety protocols, our AI is ready to guide you step-by-step.
            </p>
            <div className="flex items-center gap-3 bg-blue-50 text-blue-700 px-4 py-3 rounded-xl border border-blue-100 font-medium text-sm w-fit">
              <ShieldCheck size={20} />
              Free and accessible 24/7 for all users.
            </div>
          </div>
          <div className="flex-1 max-w-md w-full mx-auto">
            <SosChatbot />
          </div>
        </section>

        {/* BOTTOM WIDGETS ROW */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Safety Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col gap-5 lg:row-span-2">
            <div>
              <h3 className="font-bold text-lg text-slate-900">Why this route is safer</h3>
              <div className="flex items-center gap-2 mt-1 bg-green-50 text-green-700 w-fit px-2 py-1 rounded-md text-sm font-bold border border-green-100">
                Overall Score: 89/100
              </div>
            </div>

            <div className="flex flex-col gap-4 mt-2">
              {[
                { label: "Crime Risk", score: 92, color: "bg-green-500" },
                { label: "Accident History", score: 90, color: "bg-green-500" },
                { label: "Lighting Conditions", score: 84, color: "bg-green-400" },
                { label: "Road Conditions", score: 76, color: "bg-yellow-500" },
                { label: "Police Proximity", score: 95, color: "bg-green-500" }
              ].map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1 font-medium">
                    <span className="text-slate-700">{item.label}</span>
                    <span className="text-slate-900 font-bold">{item.score}/100</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className={`${item.color} h-2 rounded-full`} style={{ width: `${item.score}%` }}></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-2 pt-4 border-t border-slate-100 flex flex-col gap-2 text-sm text-slate-600">
              <p className="flex items-start gap-2"><span className="text-green-600 font-bold">✓</span> 2 police stations within 1 km</p>
              <p className="flex items-start gap-2"><span className="text-green-600 font-bold">✓</span> Good lighting for most of the route</p>
              <p className="flex items-start gap-2"><span className="text-green-600 font-bold">✓</span> No active roadblocks</p>
              <p className="flex items-start gap-2"><span className="text-green-600 font-bold">✓</span> Low recent accident activity</p>
              <p className="flex items-start gap-2"><span className="text-yellow-600 font-bold text-lg leading-none">⚠</span> Construction work ahead</p>
            </div>
          </div>

          {/* Emergency / SOS */}
          <div id="emergency" className="bg-white rounded-2xl border-2 border-red-100 p-6 shadow-sm relative overflow-hidden flex flex-col justify-between group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-bl-[100px] z-0 transition-transform group-hover:scale-110"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-red-600 mb-2">
                <AlertOctagon size={20} />
                <h3 className="font-bold text-lg">Emergency / SOS</h3>
              </div>
              <p className="text-slate-600 text-sm mb-6">Tap to alert your contacts and emergency services.</p>
              
              <button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl shadow-md shadow-red-600/20 transition-all active:scale-95 text-lg">
                SOS
              </button>
            </div>
            
            <div className="relative z-10 mt-6 flex flex-col gap-3 text-sm text-slate-700 font-medium">
              <label className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100 cursor-pointer">
                <span>Share live location</span>
                <div className="w-10 h-5 bg-blue-600 rounded-full relative">
                  <div className="w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] right-[3px]"></div>
                </div>
              </label>
              <div className="flex gap-2">
                <button className="flex-1 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center justify-center gap-2"><Shield size={14}/> Police</button>
                <button className="flex-1 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center justify-center gap-2"><HeartPulse size={14}/> Hospital</button>
              </div>
            </div>
          </div>

          {/* Time-Based Safety */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col">
            <div className="mb-4">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2"><Clock size={18} className="text-blue-600"/> Travel time preview</h3>
              <p className="text-slate-500 text-sm mt-1">Safety can change depending on when you travel.</p>
            </div>

            <div className="flex justify-between items-end h-full">
              {[
                { time: "NOW", score: 89, color: "bg-green-500", text: "text-green-700", bg: "bg-green-50", border: "border-green-200" },
                { time: "6 PM", score: 84, color: "bg-green-400", text: "text-slate-700", bg: "bg-white", border: "border-slate-200" },
                { time: "9 PM", score: 76, color: "bg-yellow-500", text: "text-slate-700", bg: "bg-white", border: "border-slate-200" },
                { time: "11 PM", score: 62, color: "bg-red-500", text: "text-slate-700", bg: "bg-white", border: "border-slate-200" },
              ].map((slot, i) => (
                <div key={i} className={`flex flex-col items-center p-3 rounded-xl border ${slot.border} ${slot.bg} w-[22%]`}>
                  <span className={`text-xl font-bold ${slot.text}`}>{slot.score}</span>
                  <div className="w-full h-1 bg-slate-200 rounded-full my-2 overflow-hidden">
                    <div className={`h-full ${slot.color}`} style={{width: `${slot.score}%`}}></div>
                  </div>
                  <span className="text-xs font-bold text-slate-500">{slot.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Nearby Safe Places */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col">
            <h3 className="font-bold text-lg text-slate-900 mb-4">Nearby safe places on route</h3>
            <div className="flex flex-col gap-3">
              {[
                { name: "Police Station", dist: "0.8 km", icon: <Shield size={16} className="text-blue-600"/>, color: "bg-blue-50" },
                { name: "City Hospital", dist: "1.2 km", icon: <HeartPulse size={16} className="text-red-600"/>, color: "bg-red-50" },
                { name: "Bank ATM", dist: "200 m", icon: <Banknote size={16} className="text-green-600"/>, color: "bg-green-50" },
                { name: "24/7 Restaurant", dist: "350 m", icon: <Coffee size={16} className="text-orange-600"/>, color: "bg-orange-50" },
                { name: "Petrol Pump", dist: "1.5 km", icon: <Fuel size={16} className="text-slate-600"/>, color: "bg-slate-100" },
              ].map((place, i) => (
                <div key={i} className="flex justify-between items-center p-2 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full ${place.color} flex items-center justify-center`}>
                      {place.icon}
                    </div>
                    <span className="font-medium text-sm text-slate-700">{place.name}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{place.dist}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Report an Issue */}
          <div className="bg-slate-900 rounded-2xl p-6 shadow-sm text-white flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-600/20 rounded-full blur-2xl pointer-events-none"></div>
            <div>
              <h3 className="font-bold text-lg mb-1">Report an issue</h3>
              <p className="text-slate-400 text-sm mb-5">Help make the city safer for everyone by reporting hazards.</p>
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="text-xs font-medium bg-slate-800 text-slate-300 px-2.5 py-1.5 rounded-lg border border-slate-700">Suspicious Activity</span>
                <span className="text-xs font-medium bg-slate-800 text-slate-300 px-2.5 py-1.5 rounded-lg border border-slate-700">Broken Light</span>
                <span className="text-xs font-medium bg-slate-800 text-slate-300 px-2.5 py-1.5 rounded-lg border border-slate-700">Accident</span>
              </div>
            </div>
            <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-colors">
              Report Now
            </button>
          </div>

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
