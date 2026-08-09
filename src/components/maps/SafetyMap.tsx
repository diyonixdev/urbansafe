'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { Facility } from '@/hooks/useNearbyFacilities';
import { LocateFixed } from 'lucide-react';

// Fix Leaflet's default icon paths in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icons for facilities
const createIcon = (color: string) => {
  return new L.DivIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const ICONS = {
  user: createIcon('#3b82f6'), // blue-500
  police: createIcon('#2563eb'), // blue-600
  hospital: createIcon('#dc2626'), // red-600
  fire_station: createIcon('#ea580c'), // orange-600
  pharmacy: createIcon('#16a34a'), // green-600
};

// Component to handle map centering
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);

  return null;
}

interface SafetyMapProps {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  facilities: Facility[];
}

export default function SafetyMap({ latitude, longitude, accuracy, facilities }: SafetyMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([latitude, longitude]);

  useEffect(() => {
    // Keep user location updated if we haven't manually panned
    setMapCenter([latitude, longitude]);
  }, [latitude, longitude]);

  const handleLocateMe = () => {
    if (mapRef.current) {
      mapRef.current.setView([latitude, longitude], 15);
    }
  };

  return (
    <div className="relative w-full h-[500px] md:h-[600px] rounded-2xl overflow-hidden border border-slate-200 shadow-sm z-0">
      <MapContainer
        center={mapCenter}
        zoom={15}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
        <MapController center={mapCenter} zoom={15} />

        {/* User Location */}
        <Marker position={[latitude, longitude]} icon={ICONS.user}>
          <Popup>
            <div className="font-bold text-sm text-slate-900">You are here</div>
          </Popup>
        </Marker>

        {/* Accuracy Circle */}
        {accuracy && (
          <Circle
            center={[latitude, longitude]}
            radius={accuracy}
            pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1, weight: 1 }}
          />
        )}

        {/* Facilities Markers */}
        {facilities.map((facility) => (
          <Marker
            key={facility.id}
            position={[facility.latitude, facility.longitude]}
            icon={ICONS[facility.category]}
          >
            <Popup>
              <div className="font-sans">
                <div className="font-bold text-sm text-slate-900 capitalize mb-1">
                  {facility.name}
                </div>
                {facility.address && (
                  <div className="text-xs text-slate-500 mb-1">{facility.address}</div>
                )}
                <div className="text-xs font-semibold text-blue-600 mb-1">
                  {facility.distance.toFixed(2)} km away
                </div>
                {facility.phone && (
                  <a href={`tel:${facility.phone}`} className="block mt-2 text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded text-center">
                    📞 {facility.phone}
                  </a>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Custom Locate Me Button */}
      <button
        onClick={handleLocateMe}
        className="absolute bottom-6 right-6 z-[1000] bg-white text-slate-700 p-3 rounded-full shadow-lg border border-slate-200 hover:bg-slate-50 hover:text-blue-600 transition-colors"
        aria-label="Locate Me"
        title="Locate Me"
      >
        <LocateFixed size={24} />
      </button>
    </div>
  );
}
