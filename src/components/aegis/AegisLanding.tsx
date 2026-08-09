"use client";

import React, { useState, useRef } from "react";
import dynamic from 'next/dynamic';
import { 
  ShieldCheck, MapPin, Search, AlertTriangle, 
  Lightbulb, Car, Crosshair, Phone, Navigation, Clock,
  AlertOctagon, CheckCircle2, Shield, HeartPulse,
  Banknote, Coffee, Fuel, Loader2, Navigation2, Info, ChevronDown, ChevronUp, Share2, Users
} from "lucide-react";
import { UrbanSafeNavbar } from "@/components/layouts/UrbanSafeNavbar";
import { SosChatbot } from "@/components/emergency/SosChatbot";
import { analyzeRoute, RouteMetrics } from "@/utils/routeScoring";

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
  
  const [routes, setRoutes] = useState<RouteMetrics[] | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);

  const [originInput, setOriginInput] = useState("");
  const [destInput, setDestInput] = useState("");
  
  const [destSuggestions, setDestSuggestions] = useState<LocationResult[]>([]);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isRouting, setIsRouting] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  // ALL map layers default to OFF to keep the navigation view clean
  const [mapFilters, setMapFilters] = useState({
    crime: false,
    accidents: false,
    lighting: false,
    construction: false,
    roadblocks: false,
    police: false,
    hospitals: false
  });
  
  const [showScoreCalc, setShowScoreCalc] = useState(false);

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
    setRoutes(null);
    setSelectedRouteId(null);
    setShowScoreCalc(false);
    
    try {
      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${destination.lon},${destination.lat}?overview=full&geometries=geojson&alternatives=true`);
      const data = await res.json();
      
      if (data.routes && data.routes.length > 0) {
        const analyzedRoutes: RouteMetrics[] = [];
        
        for (let i = 0; i < data.routes.length; i++) {
          const r = data.routes[i];
          const coords = r.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]] as [number, number]);
          
          const metrics = await analyzeRoute(i, coords, r.duration, r.distance);
          analyzedRoutes.push(metrics);
        }

        analyzedRoutes.sort((a, b) => {
          if (a.safetyScore === null && b.safetyScore === null) return a.travelTime - b.travelTime;
          if (a.safetyScore === null) return 1;
          if (b.safetyScore === null) return -1;
          
          if (b.safetyScore !== a.safetyScore) {
            return b.safetyScore - a.safetyScore;
          }
          return a.travelTime - b.travelTime;
        });

        if (analyzedRoutes.length > 0 && analyzedRoutes[0].safetyScore !== null) {
          analyzedRoutes[0].recommended = true;
        }
        
        if (analyzedRoutes.length > 0) {
          setSelectedRouteId(analyzedRoutes[0].id);
        }

        analyzedRoutes.sort((a, b) => {
          if (a.recommended) return -1;
          if (b.recommended) return 1;
          return a.id - b.id;
        });

        setRoutes(analyzedRoutes);
      } else {
        setRouteError("No route found.");
      }
    } catch (error) {
      console.error("Routing error", error);
      setRouteError("Failed to calculate route.");
    }
    setIsRouting(false);
  };

  const toggleFilter = (key: keyof typeof mapFilters) => {
    if (['police', 'hospitals'].includes(key)) {
      setMapFilters(prev => ({ ...prev, [key]: !prev[key] }));
    }
  };

  const selectedRoute = routes?.find(r => r.id === selectedRouteId);

  return (
    <div className="urban-safe-page min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      
      <UrbanSafeNavbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 flex flex-col gap-12">
        
        {/* HERO / MAIN SCREEN */}
        <section id="plan-route" className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* LEFT SIDE */}
          <div className="lg:col-span-4 flex flex-col gap-8">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
                Plan a <span className="text-blue-600">safer</span> journey.
              </h1>
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
                {isRouting ? "Analyzing safety data..." : "Find Safest Route"}
              </button>
            </div>
          </div>

          {/* RIGHT SIDE (MAP) */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px] relative">
            
            {/* CLEAN NEARBY TOGGLE BAR (Navigation app style) */}
            <div className="flex flex-wrap items-center gap-3 bg-white px-4 py-3 border-b border-slate-200 z-[1000] shadow-sm relative">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nearby:</span>
              <button 
                onClick={() => toggleFilter('police')} 
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 ${mapFilters.police ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              >
                <Shield size={14} className={mapFilters.police ? 'text-blue-600' : 'text-slate-400'}/> Police
              </button>
              <button 
                onClick={() => toggleFilter('hospitals')} 
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 ${mapFilters.hospitals ? 'bg-red-50 text-red-700 border-red-200 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              >
                <HeartPulse size={14} className={mapFilters.hospitals ? 'text-red-600' : 'text-slate-400'}/> Hospitals
              </button>
              
              <div className="w-px h-4 bg-slate-200 mx-1"></div>
              
              <button disabled className="px-3 py-1.5 rounded-full text-xs font-bold border bg-white text-slate-400 border-slate-100 opacity-50 cursor-not-allowed flex items-center gap-1.5" title="Data unavailable">
                <AlertTriangle size={14} /> Crime
              </button>
              <button disabled className="px-3 py-1.5 rounded-full text-xs font-bold border bg-white text-slate-400 border-slate-100 opacity-50 cursor-not-allowed flex items-center gap-1.5" title="Data unavailable">
                <Car size={14} /> Accidents
              </button>
            </div>

            <div className="flex-1 relative">
              <RouteMap 
                origin={origin ? [origin.lat, origin.lon] : null}
                destination={destination ? [destination.lat, destination.lon] : null}
                routes={routes}
                selectedRouteId={selectedRouteId}
                onRouteSelect={setSelectedRouteId}
                filters={mapFilters}
              />
            </div>
          </div>
        </section>

        {/* ROUTE COMPARISON */}
        {routes && routes.length > 0 && (
          <section className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Choose your route</h2>
              <p className="text-slate-500 mt-1">Routes are ranked based on available safety data and travel time.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {routes.map((route, idx) => {
                const isSelected = selectedRouteId === route.id;
                const isRecommended = route.recommended;

                let borderClass = "border-slate-200 hover:border-blue-300";
                let badge = null;
                let title = `Alternative Route`;

                // Color coding based strictly on safety score
                let scoreColor = "text-slate-700";
                let scoreBg = "bg-slate-50";
                let scoreBorder = "border-slate-200";

                if (route.safetyScore !== null) {
                  if (route.safetyScore >= 75) {
                    scoreColor = "text-green-700";
                    scoreBg = "bg-green-50";
                    scoreBorder = "border-green-100";
                  } else if (route.safetyScore >= 50) {
                    scoreColor = "text-orange-700";
                    scoreBg = "bg-orange-50";
                    scoreBorder = "border-orange-100";
                  } else {
                    scoreColor = "text-red-700";
                    scoreBg = "bg-red-50";
                    scoreBorder = "border-red-100";
                  }
                }

                if (isRecommended) {
                  borderClass = "border-2 border-green-500 shadow-sm shadow-green-100";
                  title = "Safest Route";
                  badge = (
                    <div className="absolute -top-3 left-5 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide flex items-center gap-1">
                      <ShieldCheck size={14} /> Recommended
                    </div>
                  );
                } else if (isSelected) {
                  borderClass = "border-2 border-blue-500 shadow-sm shadow-blue-100";
                }

                return (
                  <div 
                    key={route.id}
                    onClick={() => setSelectedRouteId(route.id)}
                    className={`bg-white rounded-2xl p-5 relative cursor-pointer hover:shadow-md transition-all ${borderClass} ${isSelected ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
                  >
                    {badge}
                    <div className="flex justify-between items-start mt-2">
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg">{title}</h3>
                        <div className="flex items-center gap-2 text-slate-500 text-sm mt-1">
                          <span className="font-semibold text-slate-900">{route.travelTime} min</span>
                          <span>•</span>
                          <span>{route.distance} km</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        {route.safetyScore !== null ? (
                          <div className={`font-bold text-xl px-3 py-1.5 rounded-lg border ${scoreBg} ${scoreColor} ${scoreBorder}`}>
                            {route.safetyScore}<span className="text-sm opacity-70">/100</span>
                          </div>
                        ) : (
                          <div className="font-semibold text-sm px-3 py-1.5 rounded-lg border bg-slate-50 text-slate-500 border-slate-200">
                            Insufficient Data
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* BOTTOM WIDGETS ROW - ONLY SHOW IF ROUTE SELECTED */}
        {selectedRoute && (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
            
            {/* Safety Breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col gap-5 lg:col-span-2">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                    <Info size={20} className="text-blue-500"/> Why this route?
                  </h3>
                  <div className="mt-2 text-sm text-slate-500">
                    {selectedRoute.safetyScore !== null ? (
                      <p>Based on {selectedRoute.scoreBreakdown.factorsAvailable} of {selectedRoute.scoreBreakdown.totalFactors} safety factors</p>
                    ) : (
                      <p>Safety data insufficient to generate a score.</p>
                    )}
                  </div>
                </div>
                {selectedRoute.safetyScore !== null && (
                  <div className="text-right">
                    <div className="font-bold text-3xl text-slate-900">{selectedRoute.safetyScore}<span className="text-lg text-slate-400 font-medium">/100</span></div>
                    <div className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">Safety Score</div>
                  </div>
                )}
              </div>

              {/* Data Factors List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                
                {/* Available Data */}
                <div className="flex flex-col gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Available Data</h4>
                  
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="flex items-center gap-2 text-slate-700"><Shield size={16} className="text-blue-500"/> Police Stations</span>
                    <span className="text-slate-900 font-bold text-right">
                      {selectedRoute.policeStationsNearby ? `${selectedRoute.policeStationsNearby} found` : 'None found'}
                      {selectedRoute.nearestPoliceKm && <span className="block text-xs font-normal text-slate-500">Nearest: {selectedRoute.nearestPoliceKm} km</span>}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="flex items-center gap-2 text-slate-700"><HeartPulse size={16} className="text-red-500"/> Hospitals</span>
                    <span className="text-slate-900 font-bold text-right">
                      {selectedRoute.hospitalsNearby ? `${selectedRoute.hospitalsNearby} found` : 'None found'}
                      {selectedRoute.nearestHospitalKm && <span className="block text-xs font-normal text-slate-500">Nearest: {selectedRoute.nearestHospitalKm} km</span>}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="flex items-center gap-2 text-slate-700"><Lightbulb size={16} className="text-yellow-500"/> Lighting Est.</span>
                    <span className="text-slate-900 font-bold text-right">{selectedRoute.lightingCoverage}%</span>
                  </div>
                </div>

                {/* Unavailable Data */}
                <div className="flex flex-col gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100 opacity-60">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Data Unavailable</h4>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2 text-slate-600"><AlertTriangle size={16} /> Crime Risk</span>
                    <span className="text-slate-400">Unavailable</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2 text-slate-600"><Car size={16} /> Accident Risk</span>
                    <span className="text-slate-400">Unavailable</span>
                  </div>
                </div>
              </div>

              {/* Score Calculation Breakdown */}
              {selectedRoute.safetyScore !== null && (
                <div className="border-t border-slate-100 pt-4 mt-2">
                  <button 
                    onClick={() => setShowScoreCalc(!showScoreCalc)}
                    className="flex items-center justify-between w-full text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors"
                  >
                    <span>How is this calculated?</span>
                    {showScoreCalc ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                  </button>
                  
                  {showScoreCalc && (
                    <div className="mt-4 p-4 bg-slate-800 text-slate-300 rounded-lg text-sm font-mono overflow-x-auto">
                      <p className="text-white mb-2">Safety Score = Base (40%) + Weighted Factors (60%)</p>
                      <ul className="flex flex-col gap-1 ml-4 list-disc marker:text-slate-600">
                        <li>Base Points: <span className="text-white">{selectedRoute.scoreBreakdown.points.base}</span></li>
                        <li>Lighting ({selectedRoute.scoreBreakdown.weights.lighting}% weight): <span className="text-green-400">+{selectedRoute.scoreBreakdown.points.lighting}</span></li>
                        <li>Police ({selectedRoute.scoreBreakdown.weights.police}% weight): <span className="text-green-400">+{selectedRoute.scoreBreakdown.points.police}</span></li>
                        <li>Hospitals ({selectedRoute.scoreBreakdown.weights.hospitals}% weight): <span className="text-green-400">+{selectedRoute.scoreBreakdown.points.hospitals}</span></li>
                        <li className="opacity-50">Crime/Accidents: Excluded due to missing data (0 points)</li>
                      </ul>
                      <div className="mt-3 pt-2 border-t border-slate-700 text-white font-bold">
                        Total: {selectedRoute.safetyScore} / 100
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Simple SOS */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-center gap-6">
              <div className="text-center">
                <AlertOctagon size={32} className="text-red-500 mx-auto mb-2" />
                <h3 className="font-bold text-lg text-slate-900">Emergency Actions</h3>
                <p className="text-slate-500 text-sm mt-1">Quick access to essential services.</p>
              </div>
              
              <div className="flex flex-col gap-3">
                <button className="w-full bg-red-50 text-red-700 border border-red-200 hover:bg-red-600 hover:text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                  <Phone size={18} /> Call Services (100)
                </button>
                <button className="w-full bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                  <Share2 size={18} /> Share Location
                </button>
                <button className="w-full bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                  <Users size={18} /> Notify Contacts
                </button>
              </div>
            </div>

          </section>
        )}

        {/* AI EMERGENCY ASSISTANT */}
        <section className="flex flex-col md:flex-row gap-8 bg-white border border-slate-200 rounded-3xl p-8 shadow-sm mt-8">
          <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-4 tracking-tight">AI Emergency Assistant</h2>
            <p className="text-slate-600 text-lg mb-6 leading-relaxed">
              Get immediate, calm, and actionable advice during critical situations. Whether it's first aid, disaster response, or safety protocols, our AI is ready to guide you step-by-step.
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
        </div>
      </footer>

    </div>
  );
}
