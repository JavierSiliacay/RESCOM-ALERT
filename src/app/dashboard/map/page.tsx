"use client";

import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";

const TacticalMapView = dynamic(() => import("./tactical-map-view"), {
  ssr: false,
  loading: () => (
    <div className="relative w-full h-[calc(100vh-4rem)] overflow-hidden bg-slate-100 font-sans">
      {/* Top HUD Skeleton */}
      <div className="absolute top-4 left-4 z-20 w-80 sm:w-96 max-w-[calc(100vw-2rem)]">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-md border border-slate-200/80 p-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-4 h-4 rounded-full bg-slate-200 animate-pulse" />
            <div className="h-3.5 w-40 rounded bg-slate-200 animate-pulse" />
          </div>
          <div className="h-5 w-20 rounded-full bg-slate-100 animate-pulse" />
        </div>
      </div>

      {/* Top Right Controls Skeleton */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-slate-200/80 p-1 flex gap-1">
          <div className="h-6 w-14 rounded-lg bg-emerald-800/10 animate-pulse" />
          <div className="h-6 w-16 rounded-lg bg-slate-100" />
        </div>
        <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 shadow-md" />
      </div>

      {/* Center Tactical Spinner Card */}
      <div className="w-full h-full flex flex-col items-center justify-center gap-3">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 p-6 flex flex-col items-center gap-3 text-center">
          <div className="relative flex items-center justify-center">
            <span className="w-10 h-10 rounded-full border-2 border-emerald-600/20 border-t-emerald-700 animate-spin" />
            <MapPin className="w-4 h-4 text-emerald-800 absolute" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800 tracking-wide uppercase">
              10RCDG Tactical Map
            </p>
            <p className="text-[11px] text-slate-500 font-medium">
              Loading situational awareness grid...
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Left Contact Groups Skeleton */}
      <div className="absolute bottom-6 left-4 z-20 hidden md:block w-64">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-md border border-slate-200/80 p-3 space-y-2">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <div className="h-3 w-24 bg-slate-200 rounded animate-pulse" />
            <div className="h-4 w-14 bg-emerald-50 rounded animate-pulse" />
          </div>
          <div className="space-y-1.5 pt-1">
            <div className="h-6 w-full bg-emerald-800/10 rounded-lg animate-pulse" />
            <div className="h-6 w-3/4 bg-slate-100 rounded-lg" />
            <div className="h-6 w-5/6 bg-slate-100 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  ),
});

export default function MapPage() {
  return <TacticalMapView />;
}
