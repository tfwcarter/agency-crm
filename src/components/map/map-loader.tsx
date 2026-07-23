"use client";

import dynamic from "next/dynamic";
import type { Pin } from "./leaflet-map";

const LeafletMap = dynamic(() => import("./leaflet-map").then((m) => m.LeafletMap), {
  ssr: false,
  loading: () => <div className="flex h-[600px] items-center justify-center text-sm text-fg-subtle">Loading map…</div>,
});

export function MapLoader({ pins }: { pins: Pin[] }) {
  return <LeafletMap pins={pins} />;
}
