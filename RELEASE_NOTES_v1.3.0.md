# Release Notes — RESCOM ALERT v1.3.0

**Version 1.3.0** (`versionCode 12`) introduces 24/7 persistent background tactical location tracking engineered to scale for thousands of personnel across Northern Mindanao.

---

## 🗺️ Key Features & Enhancements in v1.3.0

### 1. 24/7 Persistent Background Location Service
- **Android Native Foreground Service**: Runs with a sticky ongoing notification (`10RCDG RESCOM Duty Active`) preventing OEM aggressive battery savers (Samsung, Xiaomi, Vivo) from killing GPS when the device screen is off.
- **Smart Motion Displacement Filter (100m+)**:
  - Drops battery drain by over 85% by only requesting location updates when the soldier moves beyond **100 meters**.
  - Includes a **15-minute idle heartbeat** to keep HQ informed that the soldier is online without spamming the database.
- **Emergency Dynamic Mode**: Automatically drops to high-frequency tracking (15–20m / 10s updates) during active Red Alert broadcasts or SOS operations.
- **Reboot Auto-Recovery**: Includes `TacticalBootReceiver` to automatically re-arm background tracking when the device restarts.

### 2. Cloudflare Edge Telemetry Routing
- **Ingestion Route (`/api/mobile/location`)**: Mobile devices report location coordinates through the Cloudflare Anycast CDN network (`rescom-alert.site`).
- **Server-Side Deduplication**: Verifies distance deltas and prevents redundant writes to Convex.
- **Scale Capacity**: Designed to comfortably handle 2,500 to 10,000+ personnel within Cloudflare's free quota tiers without database contention.

### 3. Component & Documentation Version Updates
- Updated landing page, download portal, installation guide, and AI assistant references to **v1.3.0**.
- Binary published as `rescom-alert-v1.3.0.apk` (55.8 MB).
