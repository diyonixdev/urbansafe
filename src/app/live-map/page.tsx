'use client';

import dynamic from 'next/dynamic';
import { UrbanSafeNavbar } from '@/components/layouts/UrbanSafeNavbar';
import { LocationPermission } from '@/components/maps/LocationPermission';
import { NearbyFacilitiesPanel } from '@/components/emergency/NearbyFacilitiesPanel';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useNearbyFacilities } from '@/hooks/useNearbyFacilities';
import { Loader2, ShieldCheck } from 'lucide-react';
import { useState, useCallback } from 'react';

// Dynamically import the map to avoid SSR issues with Leaflet
const SafetyMap = dynamic(() => import('@/components/maps/SafetyMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] md:h-[600px] bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center justify-center">
      <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
      <p className="text-sm font-medium text-slate-500">Loading Map...</p>
    </div>
  ),
});

export default function LiveMapPage() {
  const location = useGeolocation();
  const { facilities, loading: facilitiesLoading, error: facilitiesError } = useNearbyFacilities(
    location.latitude,
    location.longitude,
    3 // 3km radius
  );
  
  // We use a dummy state just to force a re-render if the user clicks "Try Again"
  const [, setRetryCounter] = useState(0);

  const requestPermission = useCallback(() => {
    setRetryCounter((c) => c + 1);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(() => {}, () => {});
    }
  }, []);

  const hasLocation = location.latitude !== null && location.longitude !== null && location.permission === 'granted';

  return (
    <div className="urban-safe-page min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900 flex flex-col">
      <UrbanSafeNavbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 flex flex-col gap-6 flex-1 w-full">
        {/* HEADER */}
        <section className="flex flex-col gap-2 mb-2">
          <p className="sm-eyebrow"><span />Live Tracking</p>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
            Emergency Services
          </h1>
          <p className="text-sm font-medium text-slate-500 max-w-2xl leading-relaxed">
            View your current location and quickly find nearby police stations, hospitals, fire stations, and pharmacies in case of an emergency.
          </p>
        </section>

        {!hasLocation ? (
          <LocationPermission location={location} onRequestPermission={requestPermission} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start flex-1">
            {/* MAP SECTION */}
            <section className="lg:col-span-2 h-full">
              <SafetyMap
                latitude={location.latitude!}
                longitude={location.longitude!}
                accuracy={location.accuracy}
                facilities={facilities}
              />
            </section>

            {/* NEARBY FACILITIES SECTION */}
            <aside className="lg:col-span-1 h-full sticky top-8">
              <NearbyFacilitiesPanel
                facilities={facilities}
                loading={facilitiesLoading}
                error={facilitiesError}
              />
            </aside>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white mt-auto py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-blue-600" />
            <span className="font-bold text-slate-900">Urban Safe</span>
            <span className="text-slate-400 text-sm ml-2">© 2024</span>
          </div>

          <p className="text-sm text-slate-500 font-medium text-center md:text-left">
            Your location is used to show nearby safety services. Location access can be disabled at any time.
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
