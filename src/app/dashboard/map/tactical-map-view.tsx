"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import L from "leaflet";
import {
  Search,
  MapPin,
  Users,
  Shield,
  Layers,
  Send,
  Phone,
  Crosshair,
  X,
  Compass,
  Radio,
  ChevronRight,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useCurrentOfficer } from "@/components/officer-context";

// Map center on Northern Mindanao (Camp Evangelista, Cagayan de Oro)
const REGION_X_CENTER: [number, number] = [8.4822, 124.6472];
const DEFAULT_ZOOM = 9;

// Calculate distance in km between two lat/lng coordinates (Haversine formula)
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const TILE_LAYERS = {
  street: {
    name: "Street Map",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
  },
  satellite: {
    name: "Tactical Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
  },
};

export default function TacticalMapView() {
  const personnel = useQuery(api.personnel.list) || [];
  const currentOfficer = useCurrentOfficer();

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const circleLayerRef = useRef<L.Circle | null>(null);

  // UI state (Street Map default, 100% free)
  const [activeTileKey, setActiveTileKey] = useState<keyof typeof TILE_LAYERS>("street");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUnit, setSelectedUnit] = useState<string>("ALL");
  const [selectedSoldierId, setSelectedSoldierId] = useState<string | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Geo-fence dispatch mode
  const [isGeoFenceMode, setIsGeoFenceMode] = useState(false);
  const [geoFenceRadiusKm, setGeoFenceRadiusKm] = useState<number>(10);
  const [geoFenceCenter, setGeoFenceCenter] = useState<[number, number]>(REGION_X_CENTER);

  // Soldiers with active coordinates
  const locatedSoldiers = useMemo(() => {
    return personnel.filter(
      (p) => typeof p.latitude === "number" && typeof p.longitude === "number"
    );
  }, [personnel]);

  // Filtered by selected CDC / Unit
  const filteredSoldiers = useMemo(() => {
    if (selectedUnit === "ALL") return locatedSoldiers;
    return locatedSoldiers.filter((p) => {
      const u = (p.unit || p.groupName || "").toLowerCase();
      return u.includes(selectedUnit.toLowerCase());
    });
  }, [locatedSoldiers, selectedUnit]);

  // Selected soldier document
  const selectedSoldier = useMemo(() => {
    if (!selectedSoldierId) return null;
    return personnel.find((p) => String(p._id) === selectedSoldierId) || null;
  }, [personnel, selectedSoldierId]);

  // Soldiers inside active geo-fence radius
  const soldiersInGeoFence = useMemo(() => {
    if (!isGeoFenceMode) return [];
    return locatedSoldiers.filter((s) => {
      if (typeof s.latitude !== "number" || typeof s.longitude !== "number") return false;
      const d = getDistanceKm(geoFenceCenter[0], geoFenceCenter[1], s.latitude, s.longitude);
      return d <= geoFenceRadiusKm;
    });
  }, [isGeoFenceMode, locatedSoldiers, geoFenceCenter, geoFenceRadiusKm]);

  // Search results
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return personnel
      .filter((p) => {
        const full = `${p.rank || ""} ${p.firstName || ""} ${p.lastName || ""} ${p.unit || ""} ${p.groupName || ""} ${p.mobileNumber || ""}`.toLowerCase();
        return full.includes(q);
      })
      .slice(0, 8);
  }, [personnel, searchQuery]);

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: REGION_X_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
    });

    // Custom bottom-right zoom control
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Initial tile layer
    const tileConf = TILE_LAYERS[activeTileKey];
    const tileLayer = L.tileLayer(tileConf.url, {
      maxZoom: 19,
      attribution: tileConf.attribution,
    }).addTo(map);

    (map as any)._activeTileLayer = tileLayer;

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;

    // Click map in Geo-fence mode to reposition radius
    map.on("click", (e) => {
      setGeoFenceCenter([e.latlng.lat, e.latlng.lng]);
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Change Tile Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const currentLayer = (map as any)._activeTileLayer;
    if (currentLayer) map.removeLayer(currentLayer);

    const tileConf = TILE_LAYERS[activeTileKey];
    const newLayer = L.tileLayer(tileConf.url, {
      maxZoom: 19,
      attribution: tileConf.attribution,
    }).addTo(map);

    (map as any)._activeTileLayer = newLayer;
  }, [activeTileKey]);

  // 3. Render Personnel Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    filteredSoldiers.forEach((soldier) => {
      if (typeof soldier.latitude !== "number" || typeof soldier.longitude !== "number") return;

      const isSelected = String(soldier._id) === selectedSoldierId;
      const rank = soldier.rank || "PVT";

      // Custom Clean Military Tactical Pin HTML
      const pinHtml = `
        <div class="relative cursor-pointer transition-transform duration-200 ${isSelected ? "scale-125 z-50" : "hover:scale-110"}">
          <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] text-white shadow-lg border-2 ${
            isSelected
              ? "bg-amber-500 border-white ring-4 ring-amber-400/50"
              : "bg-emerald-800 border-emerald-400/80 shadow-emerald-950/60"
          }">
            ${rank.slice(0, 3)}
          </div>
          <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 ${
            isSelected ? "bg-white" : "bg-emerald-400"
          }"></div>
        </div>
      `;

      const icon = L.divIcon({
        className: "custom-tactical-pin",
        html: pinHtml,
        iconSize: [32, 36],
        iconAnchor: [16, 36],
      });

      const marker = L.marker([soldier.latitude, soldier.longitude], { icon });

      marker.on("click", () => {
        setSelectedSoldierId(String(soldier._id));
      });

      marker.addTo(layer);
    });
  }, [filteredSoldiers, selectedSoldierId]);

  // 4. Render Geo-fence Circle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (circleLayerRef.current) {
      map.removeLayer(circleLayerRef.current);
      circleLayerRef.current = null;
    }

    if (isGeoFenceMode) {
      const circle = L.circle(geoFenceCenter, {
        radius: geoFenceRadiusKm * 1000,
        color: "#10b981",
        fillColor: "#10b981",
        fillOpacity: 0.15,
        weight: 2,
        dashArray: "6, 8",
      }).addTo(map);

      circleLayerRef.current = circle;
    }
  }, [isGeoFenceMode, geoFenceCenter, geoFenceRadiusKm]);

  // Fly to soldier coordinates
  const handleSelectSoldier = (soldier: (typeof personnel)[0]) => {
    setSelectedSoldierId(String(soldier._id));
    setSearchQuery("");
    setIsSearchFocused(false);

    if (
      mapInstanceRef.current &&
      typeof soldier.latitude === "number" &&
      typeof soldier.longitude === "number"
    ) {
      mapInstanceRef.current.flyTo([soldier.latitude, soldier.longitude], 15, {
        duration: 1.5,
      });
    }
  };

  // Reset view to Region X
  const handleResetView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(REGION_X_CENTER, DEFAULT_ZOOM, { duration: 1 });
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] overflow-hidden bg-slate-100 font-sans">
      
      {/* ====================================================
          MAP CANVAS CONTAINER
         ==================================================== */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* ====================================================
          TOP-LEFT FLOATING HUD SEARCH BAR
         ==================================================== */}
      <div className="absolute top-4 left-4 z-20 w-80 sm:w-96 max-w-[calc(100vw-2rem)]">
        <div className="relative bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/80 p-1.5 transition-all focus-within:ring-2 focus-within:ring-emerald-700/40">
          <div className="flex items-center gap-2 px-2.5 py-1.5">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              placeholder="Search soldier, rank, CDC unit..."
              className="w-full text-xs sm:text-sm bg-transparent outline-none text-slate-800 placeholder-slate-400 font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0">
              <span className={`w-1.5 h-1.5 rounded-full ${locatedSoldiers.length > 0 ? "bg-emerald-600 animate-pulse" : "bg-slate-400"}`} />
              <span>{locatedSoldiers.length} Live GPS</span>
            </div>
          </div>

          {/* Autocomplete Dropdown */}
          {isSearchFocused && searchResults.length > 0 && (
            <div className="mt-1 pt-1 border-t border-slate-100 max-h-64 overflow-y-auto divide-y divide-slate-50">
              {searchResults.map((soldier) => {
                const hasLocation =
                  typeof soldier.latitude === "number" && typeof soldier.longitude === "number";
                return (
                  <button
                    key={String(soldier._id)}
                    onClick={() => handleSelectSoldier(soldier)}
                    className="w-full text-left p-2.5 hover:bg-slate-50 rounded-xl flex items-center justify-between gap-2 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {soldier.rank} {soldier.firstName} {soldier.lastName}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                          {soldier.unit || soldier.groupName}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono">{soldier.mobileNumber}</p>
                    </div>
                    <div>
                      {hasLocation ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-emerald-600" />
                          <span>Track</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Offline</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ====================================================
          TOP-RIGHT CONTROLS: LAYER TOGGLE & RESET
         ==================================================== */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        {/* Layer Switcher: Street & Satellite (100% Free) */}
        <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200/80 p-1 flex items-center gap-1">
          {(["street", "satellite"] as const).map((key) => (
            <button
              key={key}
              onClick={() => setActiveTileKey(key)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                activeTileKey === key
                  ? "bg-emerald-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              {key === "street" ? "Street" : "Satellite"}
            </button>
          ))}
        </div>

        {/* Center Region X */}
        <button
          onClick={handleResetView}
          title="Reset to 10RCDG Northern Mindanao"
          className="bg-white/95 backdrop-blur-md hover:bg-slate-50 text-slate-700 p-2 rounded-xl shadow-lg border border-slate-200/80 transition-colors"
        >
          <Compass className="w-4 h-4 text-emerald-800" />
        </button>
      </div>

      {/* Real-time GPS Standby Notification (When 0 active GPS fixes) */}
      {locatedSoldiers.length === 0 && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none max-w-[90vw]">
          <div className="bg-white/95 backdrop-blur-md text-slate-700 text-xs font-medium px-4 py-2 rounded-2xl shadow-lg border border-slate-200/90 flex items-center gap-2.5">
            <Radio className="w-3.5 h-3.5 text-emerald-700 animate-pulse shrink-0" />
            <span>
              <strong>GPS Standby:</strong> Awaiting real-time troop coordinates from soldier mobile devices.
            </span>
          </div>
        </div>
      )}

      {/* ====================================================
          LEFT CDC UNIT FILTER STRIP
         ==================================================== */}
      <div className="absolute bottom-6 left-4 z-20 hidden md:block">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/80 p-3 w-64 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800 border-b border-slate-100 pb-1.5">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-800" />
              <span>Unit Deployments</span>
            </div>
            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-mono">
              {filteredSoldiers.length} Plotted
            </span>
          </div>

          <div className="space-y-1 text-xs">
            {[
              { id: "ALL", label: "All 10RCDG Personnel" },
              { id: "1001", label: "1001st CDC (Camiguin)" },
              { id: "1002", label: "1002nd CDC (MisOr)" },
              { id: "1003", label: "1003rd CDC (Bukidnon)" },
              { id: "1004", label: "1004th CDC (MisOcc)" },
              { id: "1005", label: "1005th CDC (Iligan / Lanao)" },
            ].map((unit) => (
              <button
                key={unit.id}
                onClick={() => setSelectedUnit(unit.id)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                  selectedUnit === unit.id
                    ? "bg-emerald-800 text-white font-semibold"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span>{unit.label}</span>
                {selectedUnit === unit.id && <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>

          {/* Geo-fence Toggle */}
          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => setIsGeoFenceMode((prev) => !prev)}
              className={`w-full py-1.5 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                isGeoFenceMode
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>{isGeoFenceMode ? "Geo-Fence Active" : "Enable Radius Alert"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ====================================================
          GEO-FENCE RADIUS DISPATCH DOCK (WHEN ACTIVE)
         ==================================================== */}
      {isGeoFenceMode && (
        <div className="absolute top-20 right-4 z-20 w-80 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-emerald-300 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
              <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
              <span>Emergency Geo-Fence Alert</span>
            </div>
            <button
              onClick={() => setIsGeoFenceMode(false)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[11px] text-slate-600">
            Click anywhere on the map to set epicenter. Alert will be sent exclusively to troops inside this perimeter.
          </p>

          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
              <span>Perimeter Radius:</span>
              <span className="font-bold text-emerald-700 font-mono">{geoFenceRadiusKm} km</span>
            </div>
            <input
              type="range"
              min="2"
              max="50"
              value={geoFenceRadiusKm}
              onChange={(e) => setGeoFenceRadiusKm(Number(e.target.value))}
              className="w-full accent-emerald-700 cursor-pointer"
            />
          </div>

          <div className="bg-emerald-50 rounded-xl p-2.5 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">Troops in Perimeter:</span>
            <span className="font-extrabold text-emerald-900 text-sm">
              {soldiersInGeoFence.length} Personnel
            </span>
          </div>

          <Link
            href={`/dashboard/messaging?tab=send&geoRadius=${geoFenceRadiusKm}&geoLat=${geoFenceCenter[0]}&geoLng=${geoFenceCenter[1]}&geoRecipients=${encodeURIComponent(soldiersInGeoFence.map((s) => s.mobileNumber).join(","))}`}
            className="w-full bg-emerald-800 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Dispatch Siren Broadcast</span>
          </Link>
        </div>
      )}

      {/* ====================================================
          SELECTED SOLDIER INTEL CARD (FLOATING HUD)
         ==================================================== */}
      {selectedSoldier && (
        <div className="absolute bottom-6 right-4 z-20 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 p-4 space-y-3.5 transition-all animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-900 border-2 border-emerald-400/80 flex items-center justify-center text-white font-extrabold text-sm shadow-md shrink-0">
                {selectedSoldier.rank?.slice(0, 3) || "SOL"}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-mono">
                    {selectedSoldier.rank}
                  </span>
                  <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    <span>Active</span>
                  </span>
                </div>
                <h4 className="font-extrabold text-slate-950 text-sm sm:text-base leading-tight truncate mt-0.5">
                  {selectedSoldier.firstName} {selectedSoldier.lastName}
                </h4>
                <p className="text-[11px] text-slate-500 font-medium truncate">
                  {selectedSoldier.unit || selectedSoldier.groupName}
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedSoldierId(null)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Details Pill Strip */}
          <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 rounded-xl p-2.5 border border-slate-100">
            <div>
              <span className="text-slate-400 text-[10px] block">Contact Number</span>
              <span className="font-bold text-slate-800 font-mono">{selectedSoldier.mobileNumber}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">Coordinates</span>
              <span className="font-semibold text-slate-700 font-mono text-[10px]">
                {selectedSoldier.latitude?.toFixed(4)}, {selectedSoldier.longitude?.toFixed(4)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Link
              href={`/dashboard/messaging?tab=send&recipient=${encodeURIComponent(selectedSoldier.mobileNumber)}`}
              className="bg-emerald-800 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Direct Alert</span>
            </Link>

            <button
              onClick={() => {
                if (
                  mapInstanceRef.current &&
                  typeof selectedSoldier.latitude === "number" &&
                  typeof selectedSoldier.longitude === "number"
                ) {
                  mapInstanceRef.current.flyTo(
                    [selectedSoldier.latitude, selectedSoldier.longitude],
                    16,
                    { duration: 1 }
                  );
                }
              }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-200"
            >
              <Crosshair className="w-3.5 h-3.5 text-emerald-800" />
              <span>Center Pin</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
