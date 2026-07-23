"use client";

import { useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, FeatureGroup } from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import Link from "next/link";
import { Download, X } from "lucide-react";
import { exportLeadsCsvAction } from "@/lib/actions/lead-export";

export type Pin = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  href: string;
  type: "client" | "lead";
  subtitle?: string;
  opportunityScore?: number | null;
};

function scoreColor(score: number | null | undefined) {
  if (score == null) return "#6b6b7d"; // unscored — neutral gray
  if (score >= 75) return "#ef4444"; // hot opportunity
  if (score >= 45) return "#f59e0b";
  return "#22c55e"; // healthy / low opportunity
}

function pinIcon(pin: Pin) {
  const color = pin.type === "client" ? "#2f6feb" : scoreColor(pin.opportunityScore);
  const label = pin.type === "client" ? "C" : pin.opportunityScore != null ? String(pin.opportunityScore) : "?";
  return L.divIcon({
    className: "",
    html: `<div style="width:28px;height:28px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:700;font-family:sans-serif;">${label}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

// Haversine distance in meters
function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Simple ray-casting point-in-polygon
function pointInPolygon(lat: number, lng: number, polygon: Array<[number, number]>) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [lati, lngi] = polygon[i];
    const [latj, lngj] = polygon[j];
    const intersect = lngi > lng !== lngj > lng && lat < ((latj - lati) * (lng - lngi)) / (lngj - lngi) + lati;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function LeafletMap({ pins }: { pins: Pin[] }) {
  const [selected, setSelected] = useState<Pin[] | null>(null);
  const featureGroupRef = useRef<L.FeatureGroup | null>(null);

  const center: [number, number] =
    pins.length > 0
      ? [pins.reduce((s, p) => s + p.latitude, 0) / pins.length, pins.reduce((s, p) => s + p.longitude, 0) / pins.length]
      : [39.8283, -98.5795];

  function handleCreated(e: { layerType: string; layer: L.Layer }) {
    const layer = e.layer;
    let contained: Pin[] = [];

    if (e.layerType === "circle") {
      const circle = layer as L.Circle;
      const c = circle.getLatLng();
      const radius = circle.getRadius();
      contained = pins.filter((p) => distanceMeters(c.lat, c.lng, p.latitude, p.longitude) <= radius);
    } else if (e.layerType === "polygon" || e.layerType === "rectangle") {
      const poly = layer as L.Polygon;
      const latlngs = (poly.getLatLngs()[0] as L.LatLng[]).map((ll) => [ll.lat, ll.lng] as [number, number]);
      contained = pins.filter((p) => pointInPolygon(p.latitude, p.longitude, latlngs));
    }

    setSelected(contained);
  }

  function clearSelection() {
    setSelected(null);
    featureGroupRef.current?.clearLayers();
  }

  async function exportSelected() {
    if (!selected) return;
    const leadIds = selected.filter((p) => p.type === "lead").map((p) => p.id);
    if (leadIds.length === 0) return;
    const { csv, filename } = await exportLeadsCsvAction(leadIds);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      {selected && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-brand/30 bg-brand/10 px-4 py-2.5">
          <span className="text-sm font-medium text-fg">
            {selected.length} pin{selected.length === 1 ? "" : "s"} in this territory ({selected.filter((p) => p.type === "lead").length} leads)
          </span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={exportSelected} className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-fg hover:border-brand/50">
              <Download size={12} /> Export leads CSV
            </button>
            <button type="button" onClick={clearSelection} className="text-fg-subtle hover:text-fg">
              <X size={14} />
            </button>
          </div>
        </div>
      )}
      <MapContainer center={center} zoom={pins.length > 0 ? 10 : 4} style={{ height: "600px", width: "100%", borderRadius: 14 }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FeatureGroup ref={featureGroupRef}>
          <EditControl
            position="topleft"
            onCreated={handleCreated}
            draw={{
              rectangle: true,
              circle: true,
              polygon: true,
              polyline: false,
              marker: false,
              circlemarker: false,
            }}
          />
        </FeatureGroup>
        {pins.map((pin) => (
          <Marker key={pin.id} position={[pin.latitude, pin.longitude]} icon={pinIcon(pin)}>
            <Popup>
              <div style={{ fontSize: 13 }}>
                <strong>{pin.name}</strong>
                {pin.type === "lead" && pin.opportunityScore != null && (
                  <div style={{ color: scoreColor(pin.opportunityScore), fontWeight: 600 }}>Opportunity: {pin.opportunityScore}/100</div>
                )}
                {pin.subtitle && <div style={{ color: "#666" }}>{pin.subtitle}</div>}
                <Link href={pin.href} style={{ color: "#2f6feb" }}>
                  View {pin.type} →
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <p className="mt-2 text-xs text-fg-subtle">
        Use the shape tools (top-left) to draw a circle or polygon territory — pins inside are automatically selected for export. Red = hot
        opportunity, orange = moderate, green = low opportunity, blue = client.
      </p>
    </div>
  );
}
