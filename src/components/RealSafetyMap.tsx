"use client";

import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

const policeIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      width:32px;
      height:32px;
      background:#2563eb;
      border:3px solid white;
      border-radius:50%;
      display:flex;
      align-items:center;
      justify-content:center;
      color:white;
      font-size:15px;
      box-shadow:0 4px 12px rgba(37,99,235,.35);
    ">🛡️</div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

export default function RealSafetyMap() {
  const center: [number, number] = [26.9124, 75.7873];

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
        center={center}
        zoom={15}
        scrollWheelZoom={true}
        zoomControl={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Your location */}
        <Marker position={center} icon={userIcon}>
          <Popup>
            <strong>📍 You are here</strong>
            <br />
            MI Road, Jaipur
          </Popup>
        </Marker>

        {/* Danger zone */}
        <Circle
          center={[26.9140, 75.7890]}
          radius={350}
          pathOptions={{
            color: "#ef4444",
            fillColor: "#ef4444",
            fillOpacity: 0.12,
            weight: 2,
          }}
        />

        <Marker position={[26.9140, 75.7890]} icon={dangerIcon}>
          <Popup>
            <strong>⚠️ High-risk area</strong>
            <br />
            Recent safety reports
            <br />
            Poor lighting reported
          </Popup>
        </Marker>

        {/* Police */}
        <Marker position={[26.9112, 75.7845]} icon={policeIcon}>
          <Popup>
            <strong>🛡️ Police Station</strong>
            <br />
            Open 24×7
          </Popup>
        </Marker>
      </MapContainer>

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
        <div style={{ fontSize: 11, color: "#64748b" }}>
          AREA SAFETY
        </div>

        <div
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: "#16a34a",
          }}
        >
          82<span style={{ fontSize: 12 }}>/100</span>
        </div>

        <div style={{ fontSize: 11, color: "#16a34a" }}>
          ● Low risk
        </div>
      </div>
    </div>
  );
}