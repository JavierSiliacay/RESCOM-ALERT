import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

// In-memory cache for server-side deduplication & rate limiting
// Key: soldierId -> { lat, lng, timestamp }
const lastLocationCache = new Map<string, { lat: number; lng: number; timestamp: number }>();

// Haversine formula to calculate distance between two coordinates in meters
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { soldierId, deviceId, latitude, longitude, accuracy, isEmergency } = body;

    if (!soldierId || typeof latitude !== "number" || typeof longitude !== "number") {
      return NextResponse.json(
        { success: false, error: "Missing required location parameters" },
        { status: 400 }
      );
    }

    // Valid range check
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { success: false, error: "Invalid coordinate bounds" },
        { status: 400 }
      );
    }

    const now = Date.now();
    const last = lastLocationCache.get(soldierId);

    // Rule:
    // 1. If isEmergency: always update immediately.
    // 2. If moved >= 100 meters: update immediately.
    // 3. If stationary (< 100 meters) AND elapsed >= 15 minutes (900,000 ms): send heartbeat update.
    // 4. Otherwise: Throttle and acknowledge (200 OK) without overloading database.
    let shouldUpdateDb = false;

    if (!last || isEmergency) {
      shouldUpdateDb = true;
    } else {
      const distanceMoved = calculateDistanceMeters(last.lat, last.lng, latitude, longitude);
      const elapsedMs = now - last.timestamp;
      const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

      if (distanceMoved >= 100) {
        shouldUpdateDb = true;
      } else if (elapsedMs >= FIFTEEN_MINUTES_MS) {
        shouldUpdateDb = true;
      }
    }

    if (!shouldUpdateDb) {
      return NextResponse.json({
        success: true,
        throttled: true,
        message: "Coordinate buffered (movement under 100m and within heartbeat window)",
      });
    }

    // Connect to Convex and patch the personnel record
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      return NextResponse.json({ success: false, error: "Convex URL not configured" }, { status: 500 });
    }

    const convex = new ConvexHttpClient(convexUrl);
    const result = await convex.mutation(api.personnel.updateLocation, {
      soldierId: soldierId as Id<"personnel">,
      latitude,
      longitude,
      accuracy: typeof accuracy === "number" ? accuracy : undefined,
    });

    // Update in-memory cache
    lastLocationCache.set(soldierId, {
      lat: latitude,
      lng: longitude,
      timestamp: now,
    });

    return NextResponse.json({
      success: true,
      throttled: false,
      timestamp: new Date(now).toISOString(),
      updated: result,
    });
  } catch (error: any) {
    console.error("Error ingesting mobile location:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
