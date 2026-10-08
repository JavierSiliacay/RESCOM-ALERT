"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  Smartphone,
  Download,
  Shield,
  Radio,
  BellRing,
  Volume2,
  Lock,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Layers,
  BatteryCharging,
  WifiOff,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Phone,
  HelpCircle,
  Users,
  Activity,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export default function MobileAppPage() {
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "INSTALL_GUIDE" | "PROTOCOLS">("OVERVIEW");
  const [downloadPortalUrl, setDownloadPortalUrl] = useState("");

  const stats = useQuery(api.downloads.getStats);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDownloadPortalUrl(`${window.location.origin}/download`);
    }
  }, []);

  const apkDownloadUrl =
    process.env.NEXT_PUBLIC_SOLDIER_APK_URL ||
    "https://github.com/JavierSiliacay/RESCOM-ALERT/releases/latest/download/rescom-alert.apk";

  const handleCopyLink = () => {
    const urlToCopy = downloadPortalUrl || `${window.location.origin}/download`;
    navigator.clipboard.writeText(urlToCopy);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 uppercase mb-1">
            <Shield className="w-4 h-4 text-emerald-600" />
            10RCDG Mobile Alert System
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            10RCDG RESCOM APP
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Official emergency siren and mobilization companion app for reservists and field personnel.
          </p>
        </div>

        {/* Direct Download Button */}
        <div className="flex items-center gap-2.5">
          <a
            href={apkDownloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer uppercase tracking-wider"
          >
            <Download className="w-4 h-4" />
            <span>Download Soldier APK (v1.0.4)</span>
          </a>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-100/90 rounded-2xl max-w-fit border border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("OVERVIEW")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "OVERVIEW"
              ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Smartphone className="w-4 h-4 text-emerald-700" />
          <span>App Download & Features</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("INSTALL_GUIDE")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "INSTALL_GUIDE"
              ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <HelpCircle className="w-4 h-4 text-amber-600" />
          <span>Easy Installation Guide</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("PROTOCOLS")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "PROTOCOLS"
              ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Radio className="w-4 h-4 text-emerald-700" />
          <span>SMS Alert Types & Siren Guide</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & DOWNLOAD */}
      {activeTab === "OVERVIEW" && (
        <div className="space-y-6">
          {/* Main White Hero Card with Emerald/Amber accents */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* App Identity Info */}
              <div className="lg:col-span-8 space-y-5">
                <div className="flex items-start sm:items-center gap-4">
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-amber-500 shadow-md bg-white shrink-0">
                    <Image
                      src="/rescom-emblem.jpg"
                      alt="10RCDG RESCOM APP"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200 uppercase tracking-wider">
                        Official 10RCDG App
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                        Version 1.0 (Android)
                      </span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1.5">
                      10RCDG RESCOM Alert
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                      Works on all Android phones • No internet required
                    </p>
                  </div>
                </div>

                <p className="text-sm text-slate-700 leading-relaxed max-w-2xl">
                  This mobile app makes sure you never miss an urgent military call-up or emergency mobilization order. When Headquarters sends an emergency alert via regular text message (SMS), your phone will sound a loud emergency siren and light up with your mobilization orders—even if your phone is locked or set to Silent.
                </p>

                {/* 3 Key Benefits */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                      <WifiOff className="w-4 h-4 text-emerald-600" />
                      <span>Works Without Internet</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-normal">
                      Works 100% offline using standard text messages. No Wi-Fi or mobile data load needed.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                      <Volume2 className="w-4 h-4 text-amber-600" />
                      <span>Overrides Silent Mode</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-normal">
                      Sounds a loud siren during Red Alerts so you will wake up even if your phone is muted.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                      <Lock className="w-4 h-4 text-slate-600" />
                      <span>Turns Screen On</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-normal">
                      Wakes up your locked screen right away to show the mission details and location.
                    </p>
                  </div>
                </div>
              </div>

              {/* QR Code & Direct Download Box */}
              <div className="lg:col-span-4 flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-4 shadow-sm">
                <div className="space-y-1">
                  <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wide flex items-center justify-center gap-1.5">
                    <QrCode className="w-4 h-4 text-emerald-700" />
                    <span>Scan with Your Phone</span>
                  </span>
                  <p className="text-xs text-slate-500">
                    Open your phone camera to download directly
                  </p>
                </div>

                <div className="p-3.5 bg-white rounded-xl shadow-xs border border-slate-200">
                  <QRCodeSVG
                    value={downloadPortalUrl || "https://rescom-alert.com/download"}
                    size={144}
                    level="H"
                    includeMargin={false}
                  />
                </div>

                <div className="w-full space-y-2">
                  <a
                    href="/download"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md active:scale-98 uppercase tracking-wider"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Open Download Portal</span>
                  </a>

                  <button
                    onClick={handleCopyLink}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium transition-colors cursor-pointer"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Portal Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copy Download Link</span>
                      </>
                    )}
                  </button>

                  <a
                    href={apkDownloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-[11px] text-slate-500 hover:text-slate-800 underline transition-colors pt-1"
                  >
                    Direct APK Binary (v1.0.4 .apk)
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Live Troop Sideload Telemetry Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wide">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <span>Troop Readiness Telemetry</span>
                </div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Live Mobile App Sideload Counter
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Deduplicated by Device ID
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                  <span>UNIQUE DEVICES ARMED</span>
                  <Smartphone className="w-4 h-4 text-emerald-700" />
                </div>
                <div className="text-3xl font-black text-emerald-950">
                  {stats ? stats.uniqueDevices : 0}
                </div>
                <p className="text-[11px] text-emerald-700">
                  Distinct soldier phones equipped with the siren app
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                  <span>TOTAL DOWNLOADS</span>
                  <Download className="w-4 h-4 text-slate-500" />
                </div>
                <div className="text-3xl font-black text-slate-900">
                  {stats ? stats.totalDownloads : 0}
                </div>
                <p className="text-[11px] text-slate-500">
                  Includes repeat downloads and updates
                </p>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-1 sm:col-span-2 lg:col-span-1">
                <div className="flex items-center justify-between text-xs font-bold text-amber-800">
                  <span>ANTI-INFLATION FILTER</span>
                  <Shield className="w-4 h-4 text-amber-700" />
                </div>
                <div className="text-xs font-bold text-amber-900 pt-1">
                  1 Phone = 1 Head Count
                </div>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  Soldiers tapping download multiple times will never inflate your unique readiness tally.
                </p>
              </div>
            </div>

            {/* Recent Device Installations */}
            {stats && stats.recentDownloads && stats.recentDownloads.length > 0 && (
              <div className="pt-2">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                  Recent Device Activity
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {stats.recentDownloads.map((d: any) => (
                    <div
                      key={d.id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1"
                    >
                      <div className="font-bold text-slate-800 truncate flex items-center justify-between">
                        <span>{d.deviceModel}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">
                          {d.osVersion}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center justify-between">
                        <span>
                          {new Date(d.lastDownloadedAt).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          •{" "}
                          {new Date(d.lastDownloadedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {d.downloadCount > 1 && (
                          <span className="text-[10px] text-emerald-700 font-bold">
                            {d.downloadCount}x
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Specifications in Clean Light Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1.5 shadow-xs">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase">
                <Smartphone className="w-4 h-4 text-emerald-700" />
                <span>Phone Compatibility</span>
              </div>
              <div className="text-base font-bold text-slate-900">
                All Android Phones
              </div>
              <p className="text-xs text-slate-500">
                Samsung, Xiaomi, Oppo, Vivo, Realme, Infinix, Google Pixel, etc.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1.5 shadow-xs">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase">
                <BatteryCharging className="w-4 h-4 text-emerald-700" />
                <span>Battery Usage</span>
              </div>
              <div className="text-base font-bold text-emerald-800">
                Zero Extra Battery Drain
              </div>
              <p className="text-xs text-slate-500">
                Sleeps safely in the background and only activates when an alert arrives.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1.5 shadow-xs">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase">
                <Radio className="w-4 h-4 text-amber-600" />
                <span>Connection Type</span>
              </div>
              <div className="text-base font-bold text-slate-900">
                Standard SMS / Cellular
              </div>
              <p className="text-xs text-slate-500">
                Works anywhere as long as your phone has signal reception.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1.5 shadow-xs">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase">
                <Shield className="w-4 h-4 text-emerald-700" />
                <span>Security</span>
              </div>
              <div className="text-base font-bold text-slate-900">
                Private & Encrypted
              </div>
              <p className="text-xs text-slate-500">
                Direct military distribution. No tracking, ads, or personal data uploads.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EASY TROOP INSTALLATION GUIDE */}
      {activeTab === "INSTALL_GUIDE" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-6">
            <div className="border-b border-slate-200 pb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-700" />
                <span>Easy 4-Step Installation Guide for Soldiers</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Share these simple instructions with troops installing the app on their personal phones.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Step 1 */}
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                    STEP 1
                  </span>
                  <Download className="w-4 h-4 text-emerald-700" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Download the App File</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Open your phone's camera and scan the QR code on the first tab, or tap <strong>"Download Soldier APK"</strong> to start downloading the file.
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                    STEP 2
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-amber-600" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Install & Tap "Allow"</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Once downloaded, tap the file in your notifications or Downloads folder. If your phone asks permission to install from Chrome or Files, tap <strong>"Allow"</strong> or <strong>"Install Anyway"</strong>.
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                    STEP 3
                  </span>
                  <BellRing className="w-4 h-4 text-emerald-700" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Allow SMS & Screen Permissions</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Open the <strong>RESCOM-ALERT</strong> app. When prompted, tap <strong>"Allow"</strong> for SMS and Notifications. This allows the app to hear incoming emergency mobilization orders.
                </p>
              </div>

              {/* Step 4 */}
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 text-xs font-bold">
                    STEP 4
                  </span>
                  <BatteryCharging className="w-4 h-4 text-slate-700" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Keep Siren Ready in Background</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  In the app, go to the <strong>Profile tab</strong> and tap <strong>"Battery Setup"</strong>. Choose <strong>"Unrestricted"</strong> or <strong>"No restrictions"</strong> so your phone won't put the siren to sleep when the screen is off.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SMS ALERT TYPES & SIREN GUIDE */}
      {activeTab === "PROTOCOLS" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-6">
            <div className="border-b border-slate-200 pb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Radio className="w-5 h-5 text-emerald-700" />
                <span>How Headquarters Messages Trigger the App</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                When sending broadcasts from this 10RCDG dashboard, the app automatically recognizes these message types:
              </p>
            </div>

            <div className="space-y-4">
              {/* Alert 1: Red Alert */}
              <div className="p-5 rounded-xl bg-red-50/70 border border-red-200 space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-red-700 text-white font-bold text-xs uppercase">
                    RED ALERT — Emergency Mobilization
                  </span>
                  <span className="text-xs font-bold text-red-900">Continuous Siren & Screen Wakeup</span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-red-200 font-mono text-xs text-slate-900">
                  <strong>[10RCDG RED ALERT]</strong> Immediate muster at 1001st CDC Headquarters. Bring full combat load.
                </div>
                <p className="text-xs text-red-900 leading-relaxed">
                  🚨 <strong>What happens on the soldier's phone:</strong> The phone lights up instantly, ignores Silent/Do Not Disturb mode, and plays a loud emergency siren continuously until the soldier taps the <strong>"Acknowledge & Silence"</strong> button on their screen.
                </p>
              </div>

              {/* Alert 2: Standard Alert */}
              <div className="p-5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-amber-700 text-white font-bold text-xs uppercase">
                    TACTICAL ALERT — Muster & Standby Warning
                  </span>
                  <span className="text-xs font-bold text-amber-900">Alert Chime & Vibration</span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-amber-200 font-mono text-xs text-slate-900">
                  <strong>[10RCDG ALERT]</strong> Typhoon Alert Level 3. Ready reservists monitor frequencies and prepare equipment.
                </div>
                <p className="text-xs text-amber-900 leading-relaxed">
                  ⚠️ <strong>What happens on the soldier's phone:</strong> Plays a clear tactical chime sound, vibrates, and logs the instruction directly on the soldier's live order feed.
                </p>
              </div>

              {/* Alert 3: Stand Down */}
              <div className="p-5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-800 text-white font-bold text-xs uppercase">
                    STAND DOWN — Operation Completed
                  </span>
                  <span className="text-xs font-bold text-emerald-900">Normal Standby Posture</span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-emerald-200 font-mono text-xs text-slate-900">
                  <strong>[10RCDG STANDDOWN]</strong> All units stand down. Return to normal standby posture.
                </div>
                <p className="text-xs text-emerald-900 leading-relaxed">
                  🛡️ <strong>What happens on the soldier's phone:</strong> Silences any active sirens and marks the alert as completed on the app home screen.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
