"use client";

import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";

const TacticalMapView = dynamic(() => import("./tactical-map-view"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-slate-50 text-slate-800 gap-3">
      <div className="relative flex items-center justify-center">
        <span className="w-12 h-12 rounded-full border-2 border-emerald-600/20 border-t-emerald-700 animate-spin" />
        <MapPin className="w-5 h-5 text-emerald-700 absolute" />
      </div>
      <p className="text-xs text-slate-600 font-mono tracking-wider uppercase font-semibold">
        Initializing 10RCDG Tactical Map System...
      </p>
    </div>
  ),
});

export default function MapPage() {
  return <TacticalMapView />;
}
