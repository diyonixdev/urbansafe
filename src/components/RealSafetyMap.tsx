"use client";

import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getEmergencyTypeEmoji, getEmergencyTypeLabel } from "@/services/emergency-config";
import { formatDistance, timeAgo } from "@/lib/geo";
import type { EmergencyLocation, NearbyEmergency } from "@/services/emergency-types";
import {
  canvasToLatLng,
  MI_ROAD_ANCHOR,
  PLACE_EMOJI,
  PLACES_INFO,
  SAFETY_LAYER_META,
  STATIC_LAYER_MARKERS,
  type PlaceMarkerInfo,
  type StaticLayerMarker,
} from "./RealSafetyMapData";

const userIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      width:18px;
      height:18px;
      background:#2563eb;
      border:4px solid white;
      border-radius:50%;
      box-shadow:0 0 0 8px rgba(37,99,235,.18), 0 4px 12px rgba(0,0,0,.3);
    "></div>
  `,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const dangerIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      width:34px;
      height:34px;
      background:#dc2626;
      border:3px solid white;
      border-radius:50%;
      display:flex;
      align-items:center;
      justify-content:center;
      color:white;
      font-size:16px;
      box-shadow:0 4px 14px rgba(220,38,38,.45);
    ">⚠</div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

function staticLayerIcon(color: string, emoji: string, spotlight: boolean): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `
      <div class="${spotlight ? "rs-spotlight" : ""}" style="
        width:32px;
        height:32px;
        background:${color};
        border:3px solid white;
        border-radius:50%;
        display:flex;
        align-items:center;
        justify-content:center;
        color:white;
        font-size:14px;
        box-shadow:0 4px 12px rgba(0,0,0,.45);
      ">${emoji}</div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function placeIcon(emoji: string, active: boolean): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `
      <div class="${active ? "rs-spotlight" : ""}" style="
        width:26px;
        height:26px;
        background:rgba(15,23,42,.85);
        border:${active ? "2px solid #2563eb" : "1px solid rgba(148,163,184,.6)"};
        border-radius:50%;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:13px;
        box-shadow:0 2px 8px rgba(0,0,0,.45);
      ">${emoji}</div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function emergencyIcon(focused: boolean): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `
      <div class="rs-em${focused ? " rs-em-focus" : ""}" style="
        width:34px;
        height:34px;
        background:#dc2626;
        border:3px solid white;
        border-radius:50%;
        display:flex;
        align-items:center;
        justify-content:center;
        color:white;
        font-size:16px;
        box-shadow:0 4px 14px rgba(220,38,38,.45);
      ">⚠</div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

interface MapControllerProps {
  mapRef?: MutableRefObject<L.Map | null>;
  focusEventId: string | null;
  emergencies: NearbyEmergency[];
  fitPoints: [number, number][];
}

/** Imperative Leaflet bindings: exposes the map instance, fits the
 * initial view once, and flies to the deep-linked emergency. */
function MapController({ mapRef, focusEventId, emergencies, fitPoints }: MapControllerProps) {
  const map = useMap();
  const fittedRef = useRef(false);
  const focusedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!mapRef) return;
    mapRef.current = map;
    return () => {
      mapRef.current = null;
    };
  }, [map, mapRef]);

  useEffect(() => {
    if (focusEventId) {
      const target = emergencies.find((event) => event.id === focusEventId);
      if (!target) return;
      if (focusedRef.current === focusEventId) return;
      focusedRef.current = focusEventId;
      map.flyTo([target.latitude, target.longitude], 16, { duration: 1 });
      return;
    }
    if (fittedRef.current) return;
    fittedRef.current = true;
    if (fitPoints.length > 0) {
      map.fitBounds(fitPoints, { padding: [28, 52] });
    }
  }, [map, focusEventId, emergencies, fitPoints, mapRef]);

  return null;
}

function StaticMarker({ marker, spotlight }: { marker: StaticLayerMarker; spotlight: boolean }) {
  const meta = SAFETY_LAYER_META[marker.layer];
  const position = useMemo<[number, number]>(
    () =>
      marker.position ??
      (marker.canvas
        ? canvasToLatLng(marker.canvas[0], marker.canvas[1])
        : [MI_ROAD_ANCHOR.latitude, MI_ROAD_ANCHOR.longitude]),
    [marker]
  );
  const icon = useMemo(() => staticLayerIcon(meta.color, meta.emoji, spotlight), [meta, spotlight]);

  return (
    <Marker position={position} icon={icon}>
      <Popup>
        <b>{marker.title}</b>
        <br />
        {marker.detail}
      </Popup>
      <Tooltip direction="top">{marker.title}</Tooltip>
    </Marker>
  );
}

function PlaceMarker({ place, active }: { place: PlaceMarkerInfo; active: boolean }) {
  const position = useMemo<[number, number]>(
    () => canvasToLatLng(place.canvas[0], place.canvas[1]),
    [place]
  );
  const icon = useMemo(() => placeIcon(PLACE_EMOJI[place.kind], active), [place.kind, active]);

  return (
    <Marker position={position} icon={icon}>
      <Popup>
        <b>{place.title}</b>
        <br />
        {place.detail}
      </Popup>
      <Tooltip direction="top">
        {place.title} · {place.detail}
      </Tooltip>
    </Marker>
  );
}

function EmergencyMarker({ event, focused }: { event: NearbyEmergency; focused: boolean }) {
  const markerRef = useRef<L.Marker>(null);

  /* Opens the popup when the user arrives via ?event=<id>. */
  useEffect(() => {
    if (focused) markerRef.current?.openPopup();
  }, [focused]);

  const distanceLabel = useMemo(() => {
    if (event.distanceMeters === null || event.distanceMeters === undefined) return "Nearby";
    return `Approximately ${formatDistance(event.distanceMeters)} away`;
  }, [event.distanceMeters]);

  return (
    <Marker
      ref={markerRef}
      position={[event.latitude, event.longitude]}
      icon={emergencyIcon(focused)}
    >
      <Popup>
        <div style={{ minWidth: 170 }}>
          <div style={{ fontWeight: 800, color: "#dc2626", fontSize: 13 }}>
            {getEmergencyTypeEmoji(event.type)} {getEmergencyTypeLabel(event.type)} reported
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: "#334155", lineHeight: 1.5 }}>
            {distanceLabel}
            <br />
            Reported {timeAgo(event.createdAt)}
            {event.areaLabel ? (
              <>
                <br />
                {event.areaLabel}
              </>
            ) : null}
          </div>
        </div>
      </Popup>
      <Tooltip direction="top">🚨 {getEmergencyTypeLabel(event.type)}</Tooltip>
    </Marker>
  );
}

export interface RealSafetyMapProps {
  /** Live community SOS events from the emergency system. */
  emergencies?: NearbyEmergency[];
  /** Known location of the current user (the "You" marker). */
  userLocation?: EmergencyLocation | null;
  /** Deep-link id arriving via ?event=<id> — focused and popup opened. */
  focusedEventId?: string | null;
  /** Layer ids the user has hidden with the map layer panel. */
  hiddenLayers?: string[];
  /** Marker ids to highlight (nearby Police/Hospital/ATM/Restaurant). */
  spotlightIds?: string[];
  /** "standalone" renders the map's own floating overlays. */
  variant?: "standalone" | "embedded";
  /** Receives the Leaflet map instance for external controls (zoom…). */
  mapRef?: MutableRefObject<L.Map | null>;
}

export default function RealSafetyMap({
  emergencies = [],
  userLocation = null,
  focusedEventId = null,
  hiddenLayers = [],
  spotlightIds = [],
  variant = "standalone",
  mapRef,
}: RealSafetyMapProps) {
  const hiddenSet = useMemo(() => new Set(hiddenLayers), [hiddenLayers]);
  const spotlightSet = useMemo(() => new Set(spotlightIds), [spotlightIds]);

  const visibleStatics = useMemo(
    () => STATIC_LAYER_MARKERS.filter((marker) => !hiddenSet.has(marker.layer)),
    [hiddenSet]
  );

  const userPosition: [number, number] = useMemo(() => {
    if (userLocation && userLocation.permission !== "denied") {
      return [userLocation.latitude, userLocation.longitude];
    }
    return [MI_ROAD_ANCHOR.latitude, MI_ROAD_ANCHOR.longitude];
  }, [userLocation]);

  const fitPoints = useMemo<[number, number][]>(() => {
    const points: [number, number][] = [
      [MI_ROAD_ANCHOR.latitude, MI_ROAD_ANCHOR.longitude],
      [26.914, 75.789],
    ];
    visibleStatics.forEach((marker) => {
      points.push(
        marker.position ??
          (marker.canvas
            ? canvasToLatLng(marker.canvas[0], marker.canvas[1])
            : [MI_ROAD_ANCHOR.latitude, MI_ROAD_ANCHOR.longitude])
      );
    });
    PLACES_INFO.forEach((place) => points.push(canvasToLatLng(place.canvas[0], place.canvas[1])));
    emergencies.forEach((event) => points.push([event.latitude, event.longitude]));
    return points;
  }, [visibleStatics, emergencies]);

  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        borderRadius: "24px",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <MapContainer
        center={userPosition}
        zoom={15}
        scrollWheelZoom={true}
        zoomControl={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController
          mapRef={mapRef}
          focusEventId={focusedEventId}
          emergencies={emergencies}
          fitPoints={fitPoints}
        />

        {/* Your location */}
        <Marker position={userPosition} icon={userIcon}>
          <Popup>
            <strong>📍 You are here</strong>
            <br />
            {userLocation?.areaLabel ?? "MI Road, Jaipur"}
          </Popup>
        </Marker>

        {/* Danger zone */}
        <Circle
          center={[26.914, 75.789]}
          radius={350}
          pathOptions={{
            color: "#ef4444",
            fillColor: "#ef4444",
            fillOpacity: 0.12,
            weight: 2,
          }}
        />
        <Marker position={[26.914, 75.789]} icon={dangerIcon}>
          <Popup>
            <strong>⚠️ High-risk area</strong>
            <br />
            Recent safety reports
            <br />
            Poor lighting reported
          </Popup>
        </Marker>

        {/* Safety layers (crime / construction / accident / lighting / police) */}
        {visibleStatics.map((marker) => (
          <StaticMarker key={marker.id} marker={marker} spotlight={spotlightSet.has(marker.id)} />
        ))}

        {/* Nearby places */}
        {PLACES_INFO.map((place) => (
          <PlaceMarker key={place.id} place={place} active={spotlightSet.has(place.id)} />
        ))}

        {/* LIVE EMERGENCY MARKERS (community SOS) */}
        {emergencies.map((event) => (
          <EmergencyMarker key={event.id} event={event} focused={focusedEventId === event.id} />
        ))}
      </MapContainer>

      {variant === "standalone" && (
        <>
          {/* Floating map badge */}
          <div
            style={{
              position: "absolute",
              top: 18,
              left: 18,
              zIndex: 1000,
              background: "rgba(255,255,255,.94)",
              backdropFilter: "blur(12px)",
              padding: "10px 14px",
              borderRadius: "14px",
              boxShadow: "0 6px 20px rgba(0,0,0,.12)",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            🛡️ Live Safety Map
          </div>

          {/* Safety score */}
          <div
            style={{
              position: "absolute",
              right: 18,
              top: 18,
              zIndex: 1000,
              background: "rgba(255,255,255,.95)",
              backdropFilter: "blur(12px)",
              padding: "12px 16px",
              borderRadius: "16px",
              boxShadow: "0 6px 20px rgba(0,0,0,.12)",
            }}
          >
            <div style={{ fontSize: 11, color: "#64748b" }}>AREA SAFETY</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#16a34a" }}>
              82<span style={{ fontSize: 12 }}>/100</span>
            </div>
            <div style={{ fontSize: 11, color: "#16a34a" }}>● Low risk</div>
          </div>
        </>
      )}
    </div>
  );
}