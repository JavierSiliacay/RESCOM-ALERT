# Release Notes — RESCOM Alert v1.0.6

## Summary
This release fixes the device pairing verification block on the Android mobile app, introduces hardware-level phone binding (one number per physical device), and modernizes the pairing modal UI to align seamlessly with the RESCOM theme design system.

---

### What's Fixed & Improved

#### 1. Hardware-Level Device Pairing (Anti-Impersonation)
- **Resolved pairing stall**: Previously, the mobile app could not verify against browser-generated `localStorage` device IDs, causing verification to silently fail without feedback.
- **Hardware Android ID binding**: The app now reads the device's hardware identity (`ANDROID_ID`) and links it directly to the soldier's record in Convex on first pairing.
- **Single-Device Enforcement**: Once a mobile number is paired to a physical device, pairing attempts from unrecognized devices are immediately blocked with a clear on-screen notice and logged under security audits.
- **Clean Unit Officer Transfer**: When an officer unlinks a device from the admin dashboard (e.g., replacement or damaged phone), both the web and hardware bindings are cleared cleanly for the new device.

#### 2. Pair Modal UI Redesign & Feedback
- **Consistent Visual Design**: Replaced the legacy dark/tactical modal with the clean, light-themed design tokens (`#ffffff` sheet, emerald action buttons, subtle slate inputs, and proper typography) matching the web dashboard and app views.
- **Explicit On-Screen Statuses**: Eliminated silent failures. Every response (unregistered number, pending enlistment, phone already bound to another device, locked portal, or network offline) displays a clear and actionable message.
- **Real Hardware Telemetry**: The app now reports the true device manufacturer and model instead of generic fallbacks.

#### 3. Build & Stability Improvements
- **Windows MAX_PATH CMake Fix**: Resolved the Ninja C++ 260-character path error when compiling `react-native-safe-area-context` on Windows.
- **Robust Error Handling**: Added resilient Convex query response checking for mobile HTTP calls.

---

### Verification Checklist
- [x] Backend schema updated with `appDeviceId` and deployed to Convex production.
- [x] Kotlin native module compiled with hardware identification.
- [x] Release APK packaged and tested (`app-release.apk`).
- [x] Git changes committed and pushed to remote `main`.
