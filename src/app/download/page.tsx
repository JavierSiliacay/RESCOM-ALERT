"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  Download,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  Radio,
  Volume2,
  Lock,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  ShieldCheck,
  Settings,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

function parseDeviceDetails(ua: string): { model: string; os: string } {
  let os = "Android";
  const osMatch = ua.match(/Android\s([0-9.]+)/i);
  if (osMatch) {
    os = `Android ${osMatch[1]}`;
  }

  let model = "Android Device";
  // Look for build model in user agent, e.g. "Build/SP1A...; SM-A525F" or "Build/...; RMX3085"
  const modelMatch = ua.match(/;\s([^;]+)\sBuild\//i);
  if (modelMatch && modelMatch[1]) {
    model = modelMatch[1].trim();
  } else if (/Samsung/i.test(ua)) {
    model = "Samsung Galaxy";
  } else if (/Realme/i.test(ua)) {
    model = "Realme Device";
  } else if (/Redmi|POCO|Xiaomi/i.test(ua)) {
    model = "Xiaomi / Redmi";
  } else if (/Oppo/i.test(ua)) {
    model = "Oppo Device";
  } else if (/Vivo/i.test(ua)) {
    model = "Vivo Device";
  } else if (/Infinix|Tecno/i.test(ua)) {
    model = "Infinix / Tecno";
  }

  return { model, os };
}

export default function SoldierDownloadPage() {
  const [deviceId, setDeviceId] = useState<string>("");
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState({ model: "Android Phone", os: "Android" });
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [troubleshootTab, setTroubleshootTab] = useState<"protect" | "restricted">("protect");

  const recordDownload = useMutation(api.downloads.record);
  const stats = useQuery(api.downloads.getStats);

  const apkUrl =
    process.env.NEXT_PUBLIC_SOLDIER_APK_URL ||
    "https://github.com/JavierSiliacay/RESCOM-ALERT/releases/latest/download/rescom-alert.apk";

  useEffect(() => {
    // 1. Persistent Device ID (Deduplication)
    let storedId = localStorage.getItem("rescom_device_id");
    if (!storedId) {
      storedId = "dev_" + Math.random().toString(36).substring(2, 10) + "_" + Date.now().toString(36);
      localStorage.setItem("rescom_device_id", storedId);
    }
    setDeviceId(storedId);

    // 2. Parse User-Agent
    const ua = navigator.userAgent || "";
    setDeviceInfo(parseDeviceDetails(ua));

    // 3. Detect In-App Browsers (Messenger, Instagram, FB, Viber)
    const inApp = /FBAN|FBAV|Instagram|Messenger|Viber|Line/i.test(ua);
    setIsInAppBrowser(inApp);
  }, []);

  const handleDownload = async () => {
    if (isRecording) return;
    setIsRecording(true);

    try {
      // Record download in Convex database (deduplicated by deviceId)
      if (deviceId) {
        await recordDownload({
          deviceId,
          userAgent: navigator.userAgent || "Unknown",
          deviceModel: deviceInfo.model,
          osVersion: deviceInfo.os,
        });
      }
    } catch (e) {
      console.error("Failed to log telemetry:", e);
    } finally {
      setIsRecording(false);
      setDownloadStarted(true);

      // Trigger APK download
      const downloadAnchor = document.createElement("a");
      downloadAnchor.href = apkUrl;
      downloadAnchor.setAttribute("download", "rescom-alert.apk");
      downloadAnchor.target = "_blank";
      downloadAnchor.rel = "noopener noreferrer";
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-800 antialiased selection:bg-emerald-100 selection:text-emerald-900">
      {/* Top Banner for In-App Browsers */}
      {isInAppBrowser && (
        <div className="bg-amber-500 text-slate-950 px-4 py-3 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 max-w-4xl mx-auto">
            <AlertTriangle className="w-4 h-4 shrink-0 text-slate-950" />
            <span>
              In-app browser detected. For best results, tap the three dots <strong>(⋮)</strong> and choose <strong>"Open in Chrome"</strong>.
            </span>
          </div>
        </div>
      )}

      {/* Main Content Container */}
      <main className="max-w-xl w-full mx-auto px-4 py-8 sm:py-12 space-y-6">
        {/* Header Lockup (Dual Military Insignia) */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-full border-2 border-white shadow-md overflow-hidden bg-white p-0.5">
              <Image
                src="/rescom-pa-seal.png"
                alt="Philippine Army RESCOM"
                width={56}
                height={56}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <div className="w-14 h-14 rounded-full border-2 border-white shadow-md overflow-hidden bg-white p-0.5">
              <Image
                src="/rescom-emblem.jpg"
                alt="10RCDG Emblem"
                width={56}
                height={56}
                className="w-full h-full object-contain"
                priority
              />
            </div>
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-extrabold uppercase tracking-wider mb-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>Official Military Mobilization Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              10RCDG RESCOM APP
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-md mx-auto">
              Companion emergency siren and mobilization alert system for Army reservists and field personnel.
            </p>
          </div>
        </div>

        {/* Primary Download Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Release Package
              </div>
              <div className="text-lg font-extrabold text-slate-900">
                RESCOM ALERT v1.0.3
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                File Size
              </div>
              <div className="text-sm font-bold text-slate-700">
                52 MB · APK
              </div>
            </div>
          </div>

          {/* Download Action Button */}
          <div className="space-y-3">
            <button
              onClick={handleDownload}
              disabled={isRecording}
              className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-emerald-900/10 active:scale-[0.98] transition-all cursor-pointer"
            >
              {isRecording ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Preparing Download...</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  <span>DOWNLOAD SOLDIER APP</span>
                </>
              )}
            </button>

            {downloadStarted ? (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  <strong>Download started!</strong> Open your phone notifications or Downloads folder to install.
                </span>
              </div>
            ) : (
              <p className="text-center text-[11px] text-slate-500">
                Compatible with all Android devices (Android 7.0 to Android 15+)
              </p>
            )}
          </div>

          {/* Sideload Safety Notice */}
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Android Safety Note:</span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              If your phone says <em>"File might be harmful"</em>, tap <strong>"Download anyway"</strong>. This is an official private military application distributed outside Google Play Store.
            </p>
          </div>

          {/* Live Telemetry Pill */}
          {stats && (
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span className="flex items-center gap-1.5 font-medium text-slate-600">
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Total App Downloads:</span>
              </span>
              <span className="font-bold text-slate-900 bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200/60 text-[11px]">
                {stats.uniqueDevices} {stats.uniqueDevices === 1 ? "Device" : "Devices"}
              </span>
            </div>
          )}
        </div>

        {/* 3-Step Troop Sideload Instructions */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <span>Quick 3-Step Installation</span>
          </h2>

          <div className="space-y-3.5">
            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                1
              </div>
              <div className="text-xs text-slate-600 leading-relaxed">
                <strong className="text-slate-900 block font-bold">Download & Tap Open</strong>
                Tap the big green button above. When finished, tap the notification or open <strong>Downloads</strong> in your phone's file manager.
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                2
              </div>
              <div className="text-xs text-slate-600 leading-relaxed">
                <strong className="text-slate-900 block font-bold">Install Anyway & Play Protect</strong>
                If prompted <em>&quot;Install unknown apps&quot;</em>, toggle <strong>Allow</strong>. If Google Play Protect warns or blocks installation, tap <em>&quot;More details → Install anyway&quot;</em> (or see the Play Protect fix below).
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                3
              </div>
              <div className="text-xs text-slate-600 leading-relaxed">
                <strong className="text-slate-900 block font-bold">Allow SMS & Restricted Settings</strong>
                Open <strong>RESCOM ALERT</strong> and tap <strong>&quot;Allow&quot;</strong>. On Android 13–15, if SMS is greyed out or says <em>&quot;Restricted setting&quot;</em>, see the 3-dots unlock guide below.
              </div>
            </div>
          </div>
        </div>

        {/* Android Troubleshooting & Setup Guide Accordion */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
          <button
            type="button"
            onClick={() => setShowTroubleshooting(!showTroubleshooting)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span>Having Trouble Installing or Enabling SMS?</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    HELP
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Step-by-step fix for Google Play Protect & Android 13–15 permissions.
                </div>
              </div>
            </div>
            <div className="text-slate-400 pl-2 shrink-0">
              {showTroubleshooting ? (
                <ChevronUp className="w-4 h-4 text-slate-600" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-600" />
              )}
            </div>
          </button>

          {showTroubleshooting && (
            <div className="p-4 pt-1 border-t border-slate-100 space-y-4 bg-slate-50/50">
              {/* Tab Selector */}
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setTroubleshootTab("protect")}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                    troubleshootTab === "protect"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  🛡️ 1. Play Protect Block
                </button>
                <button
                  type="button"
                  onClick={() => setTroubleshootTab("restricted")}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                    troubleshootTab === "restricted"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  🔒 2. Android 13–15 SMS Fix
                </button>
              </div>

              {troubleshootTab === "protect" ? (
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    <span>Temporarily Disable Play Protect During Install</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Google Play Protect scans apps for SMS capabilities. Because this is an official private military app distributed outside the Play Store, Play Protect may block installation.
                  </p>
                  <ol className="text-xs text-slate-700 space-y-2 list-decimal list-inside pl-1">
                    <li className="leading-relaxed">
                      Open the <strong>Google Play Store</strong> app.
                    </li>
                    <li className="leading-relaxed">
                      Tap your <strong>Profile Icon</strong> at the top right corner.
                    </li>
                    <li className="leading-relaxed">
                      Tap <strong>Play Protect</strong>.
                    </li>
                    <li className="leading-relaxed">
                      Tap the <strong>Gear icon (⚙️)</strong> in the top right corner.
                    </li>
                    <li className="leading-relaxed">
                      Turn OFF <strong>&quot;Scan apps with Play Protect&quot;</strong> (this disables both toggles).
                    </li>
                    <li className="leading-relaxed">
                      Return to your <strong>Downloads</strong> folder and install <strong>RESCOM ALERT</strong>.
                    </li>
                    <li className="leading-relaxed text-emerald-800 font-semibold">
                      Once installed, re-open Play Protect Settings and turn both toggles back <strong>ON</strong>.
                    </li>
                  </ol>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <Settings className="w-4 h-4 text-emerald-700" />
                    <span>Unlock Restricted Settings for SMS (Android 13, 14, 15)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    On modern Android, SMS permissions for sideloaded apps are restricted by default and greyed out in settings.
                  </p>
                  <ol className="text-xs text-slate-700 space-y-2 list-decimal list-inside pl-1">
                    <li className="leading-relaxed">
                      Long-press the <strong>RESCOM ALERT</strong> icon on your home screen and tap <strong>App info (ⓘ)</strong> <em>(or go to Settings → Apps → RESCOM ALERT)</em>.
                    </li>
                    <li className="leading-relaxed">
                      Tap the <strong>three dots (⋮)</strong> in the top-right corner.
                    </li>
                    <li className="leading-relaxed">
                      Tap <strong>&quot;Allow restricted settings&quot;</strong> and verify with your phone PIN or fingerprint.
                    </li>
                    <li className="leading-relaxed">
                      Tap <strong>Permissions</strong> → tap <strong>SMS</strong> → select <strong>&quot;Allow&quot;</strong>.
                    </li>
                    <li className="leading-relaxed text-emerald-800 font-semibold">
                      Open <strong>RESCOM ALERT</strong> → go to <strong>Phone Setup</strong> to verify SMS is <strong>ON</strong>.
                    </li>
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Core Specs Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-bold">
              <Radio className="w-3.5 h-3.5" />
              <span>100% Offline GSM</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              Siren triggers without internet or mobile data.
            </p>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-bold">
              <Volume2 className="w-3.5 h-3.5" />
              <span>Bypasses Silent</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              Sounds military siren even if phone is on mute.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-200 text-center text-xs text-slate-500 space-y-1">
        <div>© {new Date().getFullYear()} 10th RCDG, Reserve Command, Philippine Army.</div>
        <div className="text-[11px] text-slate-400">
          Confidential Troop Mobilization System · Developed by{" "}
          <a
            href="https://javiersiliacay.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-emerald-800 hover:text-emerald-950 underline underline-offset-2 transition-colors"
          >
            Javier Siliacay
          </a>
        </div>
      </footer>
    </div>
  );
}
