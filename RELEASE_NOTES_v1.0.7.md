# Release Notes — RESCOM Alert v1.0.7

## Summary
Version 1.0.7 delivers full Google Firebase Cloud Messaging (FCM) integration for real-time mobile push notifications, an automated siren awakening engine on lockscreens, minimalist light-themed top headers for both the Alerts and Phone Setup screens, and fixed custom audio preview functionality.

---

### What's New & Fixed in v1.0.7

#### 1. Real Google Firebase Cloud Messaging (FCM) Integration
- **Automated Push Delivery**: Integrated Firebase BOM `33.9.0` and `firebase-messaging` into the Android native core (`FcmAlertReceiverService.kt`).
- **Lockscreen & Siren Awakening**: Incoming push alerts immediately wake the device screen (`FLAG_KEEP_SCREEN_ON`, `FLAG_TURN_SCREEN_ON`, `FLAG_SHOW_WHEN_LOCKED`), trigger the high-priority siren, and launch the fullscreen alert activity over any active app or lockscreen.
- **Persistent FCM Token Registration**: The Android client now fetches its real Firebase FCM registration token upon device pairing and updates the soldier's record in Convex, allowing commanders to dispatch targeted sirens directly via Cloud Messaging.

#### 2. Clean & Minimalist Top UI (Consistent Design System)
- **Unified Header**: Redesigned the top navigation and status bar across `App.tsx` and child screens to match the light theme design system (`#ffffff` surfaces, slate borders, emerald accents).
- **Streamlined Soldier Identity Card**: Redesigned `SoldierHeaderCard.tsx` into an elegant, clean white card with rank insignia, soldier name, unit badge, and a real-time battery / signal / siren telemetry pill.
- **Removed Header Redundancy**: Eliminated duplicate identity headers in `ProfileScreen.tsx` (Phone Setup), providing a seamless, uncluttered soldier configuration experience.

#### 3. Custom Audio Tone Preview Fix
- **Accurate Playback**: Fixed custom audio preview in `AlertBridgeModule.kt` so previewing an alert tone uses the selected user `.mp3`/`.wav` file instead of reverting to the fallback siren.
- **Dynamic Button State**: Updated Phone Setup action button to clearly indicate `"▶ PLAY YOUR OWN ALERT TONE"` when custom audio is selected.

#### 4. Web Portal & Binary Updates
- Updated all download portal links, release labels, and direct binary references across `src/app/download/page.tsx`, `src/app/download/guide/page.tsx`, and `src/app/dashboard/app/page.tsx` to `v1.0.7`.
- Bumped Android `versionCode` to `8` and `versionName` to `"1.0.7"`.

---

### Verification Checklist
- [x] FCM Service registered in `AndroidManifest.xml` with high priority.
- [x] Google Services Gradle plugin and JSON configuration integrated.
- [x] Mobile UI refactored to light theme minimalist aesthetics.
- [x] React Native bundle generated and compiled into release APK (`app-release.apk`).
