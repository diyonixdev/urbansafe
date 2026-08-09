'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
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

const createIcon = (color: string) => {
  return new L.DivIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const originIcon = createIcon('#3b82f6'); // blue-500
const destinationIcon = createIcon('#16a34a'); // green-600

function MapController({
  origin,
  destination,
  routes,
}: {
  origin: [number, number] | null;
  destination: [number, number] | null;
  routes: RouteMetrics[] | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (routes && routes.length > 0) {
      // Gather all coordinates to fit bounds
      const allCoords = routes.flatMap(r => r.geometry);
      if (allCoords.length > 0) {
        const bounds = L.latLngBounds(allCoords);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    } else if (origin && destination) {
      const bounds = L.latLngBounds([origin, destination]);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (origin) {
      map.setView(origin, 13);
    } else if (destination) {
      map.setView(destination, 13);
    }
  }, [origin, destination, routes, map]);

  return null;
}

interface RouteMapProps {
  origin: [number, number] | null;
  destination: [number, number] | null;
  routes: RouteMetrics[] | null;
  selectedRouteId: number | null;
  onRouteSelect: (id: number) => void;
}

export default function RouteMap({ origin, destination, routes, selectedRouteId, onRouteSelect }: RouteMapProps) {
  const defaultCenter: [number, number] = [28.6139, 77.2090];

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer
        center={origin || destination || defaultCenter}
        zoom={13}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        <MapController
          origin={origin}
          destination={destination}
          routes={routes}
        />

        {origin && (
          <Marker position={origin} icon={originIcon}>
            <Popup>
              <div className="font-bold text-sm text-slate-900">Origin</div>
            </Popup>
          </Marker>
        )}

        {destination && (
          <Marker position={destination} icon={destinationIcon}>
            <Popup>
              <div className="font-bold text-sm text-slate-900">Destination</div>
            </Popup>
          </Marker>
        )}

        {routes && routes.map(route => {
          const isSelected = selectedRouteId === route.id;
          const isRecommended = route.recommended;
          
          let color = '#94a3b8'; // slate-400 (inactive)
          let weight = 4;
          let opacity = 0.6;
          
          if (isSelected) {
            color = isRecommended ? '#10b981' : '#3b82f6'; // emerald-500 or blue-500
            weight = 6;
            opacity = 1;
          }

          return (
            <Polyline
              key={route.id}
              positions={route.geometry}
              pathOptions={{ color, weight, opacity }}
              eventHandlers={{
                click: () => onRouteSelect(route.id)
              }}
              className="cursor-pointer transition-all duration-300 hover:opacity-100"
            />
          );
        })}
      </MapContainer>
    </div>
  );
}
