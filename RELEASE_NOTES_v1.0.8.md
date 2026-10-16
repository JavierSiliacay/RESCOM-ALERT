# Release Notes — RESCOM Alert v1.0.8

## Summary
Version 1.0.8 introduces critical OPSEC anti-impersonation security protections during soldier device verification, dynamic soft keyboard elevation on Android devices, and flexible 10-digit Philippine phone number normalization.

---

### What's New & Fixed in v1.0.8

#### 1. OPSEC & Anti-Impersonation Protection (Profile Redaction)
- **Zero Information Leakage**: When a phone number is already registered and paired to an existing physical soldier device, all sensitive soldier profile information (Full Name, Military Rank, Serial Number, RCDG Unit, MOS) is completely stripped and hidden.
- **Immediate Rejection Feedback**: Displays a secure, clear alert informing the user that the number is already provisioned to another authorized device and must not be used on unauthorized hardware.
- **Hardware ID & Status Integrity**: Hardens the backend verification API (`verifyMobile`) against probe attempts.

#### 2. Dynamic Soft Keyboard Elevation in Device Setup Modal
- **Smart Keyboard Auto-Lift**: Added real-time Android `keyboardDidShow` and `keyboardDidHide` listeners to dynamically elevate `DevicePairingModal` above the keyboard by the exact keyboard height.
- **Unobstructed Input & Action Buttons**: Ensures the phone input field, military number formatting, and "VERIFY MY NUMBER" action button remain completely visible and clickable while the keyboard is active.
- **Tap-to-Dismiss Backdrop**: Touching outside the bottom sheet now cleanly dismisses the soft keyboard.

#### 3. 10-Digit Philippine Mobile Number Normalization
- **Seamless Interoperability**: Robust normalization algorithm (`normalizePhMobile`) extracts the canonical 10-digit core (`9XXXXXXXXX`).
- **Input Flexibility**: Troops entering numbers starting with `09` (e.g. `0917 123 4567`) match soldiers stored as `+639171234567` or `639...` seamlessly in database lookups.

#### 4. Dashboard Enhancements
- **Dispatch Auto-Scroll & Visual Feedback**: When an alert or broadcast message is sent from the Command Dashboard, the page smoothly scrolls to the top of the "RECENT MESSAGES SENT" feed and highlights the newly dispatched message with a prominent emerald glow for 5 seconds.
- **Streamlined UI**: Removed AI sparkle ornamentation for an austere military dashboard aesthetic.

#### 5. Version Bumps
- Android `versionCode` bumped to `9`.
- Android `versionName` bumped to `"1.0.8"`.
- Mobile `package.json` bumped to `"1.0.8"`.
- Download portal, guides, and binary references updated across the web application.

---

### Verification Checklist
- [x] TypeScript validation passed on web (`pnpm tsc --noEmit`) with 0 errors.
- [x] TypeScript validation passed on mobile (`npx tsc --noEmit`) with 0 errors.
- [x] React Native offline bundle compiled.
- [x] Android release APK assembled (`rescom-alert-v1.0.8.apk`).
