# Release Notes — RESCOM ALERT v1.2.0

**Version 1.2.0** (`versionCode 11`) is a major tactical and operational milestone for the 10th Regional Community Defense Group (10RCDG), Reserve Command, Philippine Army. 

This update introduces the command portal **Interactive Tactical Map**, **Geo-Fence Emergency Radius Siren Dispatching**, automated **Troop GPS Synchronization** from soldier devices, universal **Android 8+ (API 24+)** hardware compatibility, a **Collapsible/Expandable Dashboard Sidebar**, and zero-cost high-performance infrastructure.

---

## 🗺️ Key Features & Enhancements in v1.2.0

### 1. Dedicated Command Portal Tactical Map (`/dashboard/map`)
- **Northern Mindanao Troop Plotted Visualization**: Real-time deployment mapping centered on 10RCDG Headquarters (Camp Evangelista, Cagayan de Oro) covering the 1001st through 1005th Community Defense Centers (Camiguin, MisOr, Bukidnon, MisOcc, Iligan / Lanao) and university ROTC DMST units.
- **Instant Search & Fly-To Camera**: Autocomplete search bar allowing commanders and operations officers to search personnel by First Name, Last Name, Rank, Mobile Number, or CDC Unit with smooth camera flight directly to their GPS coordinates.
- **Clean Military Intel Card**: Minimalist, clutter-free tactical popup displaying soldier Rank, Name, Contact Number (with direct dial), Plotted Coordinates, and Last Ping. Unnecessary device diagnostic clutter (battery percentage, hardware specs) was intentionally omitted for a distraction-free command environment.
- **Unit Deployments Filter**: Quick-filter strip to isolate personnel stationed under specific CDC commands.
- **Zero-Cost Tile Engine**: Uses OpenStreetMap Standard Topo as the default layer with high-definition Esri World Imagery (Satellite) toggle — 100% free with zero paid API billing or watermarked tiles.

### 2. Emergency Geo-Fence Radius Siren Dispatch
- **Perimeter Hazard Zone Selection**: Commanders can click any location on the map to place an incident epicenter and adjust a tactical radius (from 2 km to 50 km) for natural disasters, flash floods, landslides, or localized security alarms.
- **Automated Messaging Hub Handoff**: Clicking **"Dispatch Siren Broadcast"** automatically transfers the commander into the Send Broadcast composer with:
  - Exact perimeter personnel pre-selected as recipients (soldiers outside the hazard zone are excluded).
  - Pre-populated official mobilization alert subject and emergency directive body.
  - One-click transmission to trigger high-decibel audio siren overrides on targeted soldier devices.

### 3. Mobile Companion App v1.2.0 (`mobile/`)
- **Native Android GPS Bridge**: Implemented native `LocationManager` fused provider (`AlertBridgeModule.kt`) utilizing `GPS_PROVIDER` and `NETWORK_PROVIDER` with battery-conscious coordinate resolution.
- **Automated Cloud Sync**: Automatically transmits updated coordinates to Convex cloud upon permission approval, app launch, and background heartbeat while preserving offline siren readiness.
- **Android 8+ (API 24 to 35+) Universal Support**: Tested and verified across Android 7.0 Nougat through Android 15/16. Compatible with Samsung, Xiaomi/Redmi, Oppo, Vivo, Realme, Transsion/Infinix, and standard military mobile devices.
- **Readiness Setup Checklist**: Added **"Tactical GPS Location"** permission status row in the Phone Setup tab (`ProfileScreen.tsx`) with an inline permission grant prompt.

### 4. Collapsible & Expandable Dashboard Sidebar
- **Centered Border Chevron Toggle**: A circular, hover-reactive arrow button placed at the vertical center (`top-1/2 -translate-y-1/2`) of the sidebar's dividing border.
- **Compact Rail Mode (`72px`)**: Collapses to give extra screen real estate for map tracking, rosters, and broadcast logs with centered icon badges and hover tooltips.
- **State Persistence**: Remembers collapse/expand preference across page navigation and browser reloads via `localStorage`.

### 5. AI Doctrine Intercept & Rate-Limit Resiliency
- **Smart Local Doctrine Intercept**: Answers standard Philippine Army doctrines, cadet procedures, and leadership scenarios locally in 0ms without consuming OpenRouter API credits.
- **Rate-Limit Resilience**: Graceful handling for 1,000+ simultaneous users during mass cadet mobilizations with automated retry and local fallback.
- **Expanded Operational Scope**: Practical cadet formation welfare (latrine breaks, heat injury first aid, reporting protocols) fully supported in Tagalog, Taglish, Bisaya, and English.

---

## 📦 Version Matrix

| Component | Previous Version | New Version |
| :--- | :--- | :--- |
| **Android Field App** | `1.1.0` (Build 10) | **`1.2.0` (Build 11)** |
| **Mobile package.json** | `1.1.0` | **`1.2.0`** |
| **Web Command Portal** | `v1.1.0` | **`v1.2.0`** |
| **Convex Backend** | `1.46.0` | **`1.47.0` (Tactical GPS Schema Deployed)** |
| **Target Android SDK** | `API 35` | **`API 35` (minSdk 24)** |

---

## 🔒 Security & Privacy (OPSEC)
- GPS coordinates are transmitted exclusively over encrypted TLS 1.3 connections to authorized 10RCDG Convex backend endpoints.
- Unpaired and unverified devices cannot transmit coordinates or trigger siren endpoints.
- Master developer and commander role-based access control (RBAC) strictly enforced on all tactical queries and mutations.

---

*10th Regional Community Defense Group (10RCDG)*  
*Reserve Command (RESCOM), Philippine Army*  
*Camp Evangelista, Patag, Cagayan de Oro City*
