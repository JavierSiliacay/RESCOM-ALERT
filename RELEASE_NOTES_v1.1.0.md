# Release Notes — RESCOM Alert v1.1.0

## Summary
Version 1.1.0 is a major feature and operational security milestone introducing live troop profile synchronization, administrative remote device unpairing with explicit dismissal notices, same-device auto-recovery, public enlistment OPSEC hardening (zero information leakage), and an administrative safety confirmation modal for the public download portal.

---

### What's New & Fixed in v1.1.0

#### 1. Live Soldier Profile Synchronization
- **Real-Time Data Refresh**: In `mobile/App.tsx` and `convexHttpService.checkPairing`, troop profiles are dynamically re-synced against the cloud database on mobile app focus and during a periodic 15-second heartbeat.
- **Instant Rank & Group Updates**: When HQ promotes a soldier or updates their operational group/unit, changes immediately reflect in the soldier's header card and profile view without requiring app re-installation or manual re-pairing.

#### 2. Admin Deletion & Remote Device Unpair Notice
- **Explicit Military Dismissal Dialog**: When an administrator deletes a soldier's profile in Command HQ, the mobile app receives `reason: "DELETED_BY_ADMIN"`.
- **Zero-Footprint Storage Wipe**: The app automatically clears all local credentials, active tokens, and identity flags from `AsyncStorage`, then presents a military-standard alert: *"Personnel Data Removed: Your soldier profile has been removed from the 10RCDG Personnel Roster by unit administration."*

#### 3. Same-Device Auto-Recovery (Re-Pair Resilience)
- **Zero-Admin Re-linking**: If a soldier uninstalls or reinstalls the app on the same physical phone, `pairDevice` verifies the hardware `appDeviceId`. If the device fingerprint matches the enrolled device, `DEVICE_MISMATCH` is safely bypassed.
- **Audit Logging**: Successful same-device recoveries are logged in system audit logs as `DEVICE_REPAIRED`.

#### 4. Public Enlistment OPSEC Hardening (Zero Information Leak)
- **Eliminated Data Enumeration**: Entering an already registered mobile number in `/enlist/[code]` no longer exposes the soldier's military rank or full name.
- **Dynamic Field Error Clearing**: Modifying the phone number field immediately resets previous error banners for a smooth and responsive registration experience.

#### 5. Download Portal Safety Lockdown Confirmation Modal
- **Accidental Lockdown Prevention**: In `/dashboard/app`, toggling off the public download portal now prompts officers with an explicit confirmation dialog with an `[OFFLINE LOCKDOWN]` badge before taking the portal offline.
- **Instant Re-enable**: Enabling the portal continues to be single-click for rapid mobilization readiness.

#### 6. Monorepo & Native Alignment
- Android `versionCode` bumped to `10`.
- Android `versionName` bumped to `"1.1.0"`.
- Mobile `package.json` bumped to `"1.1.0"`.
- Mobile in-app footer updated to `Version 1.1.0`.
- Web portal APK binary download links, guide references, and Viber templates updated to `v1.1.0`.

---

### Verification Checklist
- [x] Backend functions deployed to Convex Cloud (`npx convex deploy`).
- [x] TypeScript validation passed on web (`pnpm tsc --noEmit`) with 0 errors.
- [x] TypeScript validation passed on mobile (`npx tsc --noEmit`) with 0 errors.
- [x] Monorepo version references unified across Android native gradle, React Native package, and Next.js portal.
