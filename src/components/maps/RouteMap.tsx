'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { RouteMetrics } from '@/utils/routeScoring';

// Fix Leaflet's default icon paths in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Helper to create custom SVG icons
const createSvgIcon = (svgString: string, color: string, bgColor: string) => {
  return new L.DivIcon({
    className: 'custom-div-icon',
    html: `
      <div style="background-color: ${bgColor}; width: 28px; height: 28px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: ${color};">
        ${svgString}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
  });
};

const createSimpleDotIcon = (color: string) => {
  return new L.DivIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
};

// SVG Strings for icons
const svgShield = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2-1 4-2 7-2 2.5 0 4.5 1 7 2a1 1 0 0 1 1 1z"></path></svg>`;
const svgHeart = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path><path d="M12 5 9.04 7.96a2.17 2.17 0 0 0 0 3.08v0c.82.82 2.13.85 3 .07l2.07-1.9a2.82 2.82 0 0 1 3.79 0l2.96 2.66"></path><path d="m18 15-2-2"></path><path d="m15 18-2-2"></path></svg>`;
const svgCrime = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>`;
const svgCar = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"></path><circle cx="7" cy="17" r="2"></circle><path d="M9 17h6"></path><circle cx="17" cy="17" r="2"></circle></svg>`;
const svgLight = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"></path><path d="M9 18h6"></path><path d="M10 22h4"></path></svg>`;
const svgCone = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2-7.1 14.1A2 2 0 0 0 6.7 19h10.6a2 2 0 0 0 1.8-2.9z"></path><path d="M2.5 19h19"></path><path d="m8.5 9 7 3"></path><path d="m6 15 12 5"></path></svg>`;
const svgBlock = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="m4.9 4.9 14.2 14.2"></path></svg>`;

const icons = {
  origin: createSimpleDotIcon('#3b82f6'),
  destination: createSimpleDotIcon('#16a34a'),
  police: createSvgIcon(svgShield, '#2563eb', '#eff6ff'), // blue
  hospital: createSvgIcon(svgHeart, '#dc2626', '#fef2f2'), // red
  crime: createSvgIcon(svgCrime, '#dc2626', '#fee2e2'), // red
  accident: createSvgIcon(svgCar, '#ea580c', '#ffedd5'), // orange
  lighting: createSvgIcon(svgLight, '#ca8a04', '#fef9c3'), // yellow
  construction: createSvgIcon(svgCone, '#64748b', '#f1f5f9'), // slate
  roadblock: createSvgIcon(svgBlock, '#475569', '#e2e8f0'), // slate
};

function MapController({
  origin,
  destination,
  routes,
  selectedRouteId
}: {
  origin: [number, number] | null;
  destination: [number, number] | null;
  routes: RouteMetrics[] | null;
  selectedRouteId: number | null;
}) {
  const map = useMap();

  useEffect(() => {
    // ONLY fit bounds to the selected route (or all routes if none selected)
    // Ignore all POIs/Facilities to keep the view tight on the actual journey.
    if (routes && routes.length > 0) {
      let activeCoords: [number, number][] = [];
      
      if (selectedRouteId) {
        const sr = routes.find(r => r.id === selectedRouteId);
        if (sr) activeCoords = sr.geometry;
      }
      
      if (activeCoords.length === 0) {
        activeCoords = routes.flatMap(r => r.geometry);
      }
      
      if (activeCoords.length > 0) {
        const bounds = L.latLngBounds(activeCoords);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    } else if (origin && destination) {
      const bounds = L.latLngBounds([origin, destination]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    } else if (origin) {
      map.setView(origin, 13);
    } else if (destination) {
      map.setView(destination, 13);
    }
  }, [origin, destination, routes, selectedRouteId, map]);

  return null;
}

export type MapFilters = {
  crime: boolean;
  accidents: boolean;
  lighting: boolean;
  construction: boolean;
  roadblocks: boolean;
  police: boolean;
  hospitals: boolean;
};

interface RouteMapProps {
  origin: [number, number] | null;
  destination: [number, number] | null;
  routes: RouteMetrics[] | null;
  selectedRouteId: number | null;
  onRouteSelect: (id: number) => void;
  filters: MapFilters;
}

export default function RouteMap({ origin, destination, routes, selectedRouteId, onRouteSelect, filters }: RouteMapProps) {
  const defaultCenter: [number, number] = [28.6139, 77.2090];
  const selectedRoute = routes?.find(r => r.id === selectedRouteId);

  // Custom cluster styling to prevent huge clusters from looking ugly
  const createClusterCustomIcon = function (cluster: any) {
    const count = cluster.getChildCount();
    let size = 'w-8 h-8';
    if (count > 20) size = 'w-10 h-10';
    if (count > 50) size = 'w-12 h-12';
    
    return L.divIcon({
      html: `<div class="bg-slate-900 text-white font-bold text-sm rounded-full ${size} flex items-center justify-center border-2 border-white shadow-md">${count}</div>`,
      className: 'custom-cluster-icon',
      iconSize: L.point(40, 40, true),
    });
  };

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer
        center={origin || destination || defaultCenter}
        zoom={13}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        <MapController
          origin={origin}
          destination={destination}
          routes={routes}
          selectedRouteId={selectedRouteId}
        />

        {/* CLUSTERED LAYER FOR ALL FACILITIES & INCIDENTS */}
        <MarkerClusterGroup 
          iconCreateFunction={createClusterCustomIcon}
          maxClusterRadius={50}
          spiderfyOnMaxZoom={true}
        >
          {selectedRoute && selectedRoute.facilities.map((fac, idx) => {
            if (fac.type === 'police' && !filters.police) return null;
            if (fac.type === 'hospital' && !filters.hospitals) return null;
            
            // Allow for other facility types if the backend starts sending them
            const icon = icons[fac.type as keyof typeof icons] || icons.police;
            
            return (
              <Marker key={`fac-${idx}`} position={[fac.lat, fac.lon]} icon={icon}>
                <Popup>
                  <div className="font-bold text-sm text-slate-900 capitalize">{fac.type}</div>
                </Popup>
              </Marker>
            );
          })}
        </MarkerClusterGroup>

        {origin && (
          <Marker position={origin} icon={icons.origin}>
            <Popup><div className="font-bold text-sm text-slate-900">Origin</div></Popup>
          </Marker>
        )}

        {destination && (
          <Marker position={destination} icon={icons.destination}>
            <Popup><div className="font-bold text-sm text-slate-900">Destination</div></Popup>
          </Marker>
        )}

        {routes && routes.map(route => {
          const isSelected = selectedRouteId === route.id;
          const isRecommended = route.recommended;
          
          let color = '#94a3b8'; // slate-400 (inactive/alternative)
          let weight = 4;
          let opacity = 0.6;
          
          if (isSelected) {
            // Only use green if it's the safest route AND has a good score
            if (isRecommended && route.safetyScore !== null && route.safetyScore >= 75) {
              color = '#10b981'; // emerald-500
            } else if (route.safetyScore !== null && route.safetyScore < 50) {
              color = '#ef4444'; // red-500 (high risk)
            } else if (route.safetyScore !== null && route.safetyScore < 75) {
              color = '#f97316'; // orange-500 (caution)
            } else {
              color = '#3b82f6'; // blue-500 (default active)
            }
            weight = 6;
            opacity = 1;
          }

          return (
            <Polyline
              key={route.id}
              positions={route.geometry}
              pathOptions={{ color, weight, opacity }}
              eventHandlers={{ click: () => onRouteSelect(route.id) }}
              className="cursor-pointer transition-all duration-300 hover:opacity-100"
            />
          );
        })}
      </MapContainer>

      {/* CLEAN MAP LEGEND (Unobtrusive) */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur shadow-sm rounded-lg p-2.5 border border-slate-200 text-[10px] font-medium text-slate-600 flex gap-4 pointer-events-none">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5"><div className="w-3 h-1 bg-green-500 rounded"></div> Safest Route</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-1 bg-blue-500 rounded"></div> Alternative</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-1 bg-orange-500 rounded"></div> Caution Route</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-1 bg-red-500 rounded"></div> High Risk</div>
        </div>
        <div className="w-px bg-slate-100"></div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-100 border border-blue-600"></div> Police</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-100 border border-red-600"></div> Hospital</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-100 border border-red-600"></div> Crime</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-orange-100 border border-orange-600"></div> Accident</div>
        </div>
      </div>
    </div>
  );
}
