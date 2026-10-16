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
  Unlock,
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
  Siren,
  ShieldAlert,
  ShieldCheck,
  Power,
  Loader2,
  Clock,
  KeyRound,
  Share2,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useCurrentOfficer } from "@/components/officer-context";
import { RankInsignia } from "@/components/rank-insignia";
import { DownloadShareModal } from "@/components/download-share-modal";

// Smart Duration preview helper exactly like in Enlistment Campaign Generator
function getDurationPreview(inputStr: string): {
  type: "empty" | "valid" | "unrecognized";
  normalizedLabel?: string;
  expiryDateFormatted?: string;
  ms?: number;
} {
  let d = inputStr.toLowerCase().trim();
  if (!d) return { type: "empty" };

  const wordToNum: Record<string, string> = {
    "a ": "1 ",
    "an ": "1 ",
    "one": "1",
    "two": "2",
    "three": "3",
    "four": "4",
    "five": "5",
    "six": "6",
    "seven": "7",
    "eight": "8",
    "nine": "9",
    "ten": "10",
    "twelve": "12",
    "fourteen": "14",
    "twenty": "20",
    "thirty": "30",
    "sixty": "60",
    "ninety": "90",
  };
  for (const [w, n] of Object.entries(wordToNum)) {
    d = d.replace(new RegExp(`\\b${w}\\b`, "g"), n);
  }

  let ms = 0;
  let normalizedLabel = "";

  if (d === "tomorrow") {
    ms = 24 * 60 * 60 * 1000;
    normalizedLabel = "1 Day (Tomorrow)";
  } else if (d === "next week") {
    ms = 7 * 24 * 60 * 60 * 1000;
    normalizedLabel = "1 Week (7 Days)";
  } else if (d === "next month") {
    ms = 30 * 24 * 60 * 60 * 1000;
    normalizedLabel = "1 Month (30 Days)";
  } else {
    const matchMinutes = d.match(/(\d+)\s*(minute|min|m\b)/);
    const matchHours = d.match(/(\d+)\s*(hour|hr|h\b)/);
    const matchWeeks = d.match(/(\d+)\s*(week|wk|w\b)/);
    const matchMonths = d.match(/(\d+)\s*(month|mo\b)/);
    const matchDays = d.match(/(\d+)\s*(day|d\b)?/);

    if (matchMinutes) {
      const val = parseInt(matchMinutes[1], 10);
      ms = val * 60 * 1000;
      normalizedLabel = `${val} Minute${val > 1 ? "s" : ""}`;
    } else if (matchHours) {
      const val = parseInt(matchHours[1], 10);
      ms = val * 60 * 60 * 1000;
      normalizedLabel = `${val} Hour${val > 1 ? "s" : ""}`;
    } else if (matchWeeks) {
      const val = parseInt(matchWeeks[1], 10);
      ms = val * 7 * 24 * 60 * 60 * 1000;
      normalizedLabel = `${val} Week${val > 1 ? "s" : ""}`;
    } else if (matchMonths) {
      const val = parseInt(matchMonths[1], 10);
      ms = val * 30 * 24 * 60 * 60 * 1000;
      normalizedLabel = `${val} Month${val > 1 ? "s" : ""}`;
    } else if (matchDays && matchDays[1]) {
      const val = parseInt(matchDays[1], 10);
      ms = val * 24 * 60 * 60 * 1000;
      normalizedLabel = `${val} Day${val > 1 ? "s" : ""}`;
    }
  }

  if (ms > 0) {
    const targetDate = new Date(Date.now() + ms);
    return {
      type: "valid",
      ms,
      normalizedLabel,
      expiryDateFormatted: targetDate.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
    };
  }

  return { type: "unrecognized" };
}

export default function MobileAppPage() {
  const officer = useCurrentOfficer();
  const { guardAction } = officer;
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPasscode, setCopiedPasscode] = useState(false);
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "INSTALL_GUIDE" | "PROTOCOLS">("OVERVIEW");
  const [downloadPortalUrl, setDownloadPortalUrl] = useState("");
  const [isUpdatingPortal, setIsUpdatingPortal] = useState(false);
  const [localPasscode, setLocalPasscode] = useState("");
  const [hasPasscodeEdits, setHasPasscodeEdits] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [saveStatus, setSaveStatus] = useState<{ message: string; type: "success" | "info" } | null>(null);
  const [durationPreset, setDurationPreset] = useState("Always Open");
  const [customDurationInput, setCustomDurationInput] = useState("");
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCloseEarlyModalOpen, setIsCloseEarlyModalOpen] = useState(false);

  const showConfirmation = (message: string, type: "success" | "info" = "success") => {
    setSaveStatus({ message, type });
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const stats = useQuery(api.downloads.getStats);
  const portalSettings = useQuery(api.downloads.getPortalSettings);
  const updatePortalSettings = useMutation(api.downloads.updatePortalSettings);

  // Sync server passcode with local editing state
  useEffect(() => {
    if (portalSettings?.passcode !== undefined) {
      setLocalPasscode(portalSettings.passcode || "");
    }
  }, [portalSettings?.passcode]);

  // Sync server duration with preset selector
  useEffect(() => {
    const expAt = (portalSettings as any)?.passcodeExpiresAt;
    if (!expAt || expAt <= Date.now()) {
      if (expAt && expAt <= Date.now()) {
        setDurationPreset("Expired (Locked)");
      } else {
        setDurationPreset("Always Open");
      }
    } else {
      const diffHrs = Math.round((expAt - Date.now()) / (1000 * 60 * 60));
      if (diffHrs === 1) setDurationPreset("1 Hour");
      else if (diffHrs === 6) setDurationPreset("6 Hours");
      else if (diffHrs === 12) setDurationPreset("12 Hours");
      else if (diffHrs === 24) setDurationPreset("24 Hours (1 Day)");
      else if (diffHrs === 72) setDurationPreset("3 Days");
      else if (diffHrs === 168) setDurationPreset("7 Days (1 Week)");
      else if (diffHrs === 336) setDurationPreset("14 Days");
      else if (diffHrs === 720) setDurationPreset("30 Days");
      else setDurationPreset("Custom Duration");
    }
  }, [portalSettings]);

  // Keep live countdown refreshed every 10 seconds
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDownloadPortalUrl(`${window.location.origin}/download`);
    }
  }, []);

  const apkDownloadUrl =
    "https://github.com/JavierSiliacay/RESCOM-ALERT/releases/download/v1.0.7/rescom-alert-v1.0.7.apk";

  const handleCopyLink = () => {
    const urlToCopy = downloadPortalUrl || `${window.location.origin}/download`;
    navigator.clipboard.writeText(urlToCopy);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleTogglePortal = async () => {
    guardAction("Toggle Download Portal", async () => {
      if (isUpdatingPortal) return;
      setIsUpdatingPortal(true);
      try {
        const currentEnabled = portalSettings?.isDownloadPortalEnabled ?? true;
        const nextState = !currentEnabled;
        await updatePortalSettings({
          isDownloadPortalEnabled: nextState,
          allowRosterVerification: nextState,
          lockdownReason:
            "The mobile app download portal is currently offline for maintenance or restricted by unit administration. Please coordinate with your Administrators.",
          updatedBy: officer.displayName || "Authorized Officer",
          updatedByEmail: officer.email,
        });
      } catch (err) {
        console.error("Failed to toggle portal:", err);
      } finally {
        setIsUpdatingPortal(false);
      }
    });
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

        {/* Direct Download & Share Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsShareModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-200 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer uppercase tracking-wider"
          >
            <Share2 className="w-4 h-4 text-emerald-700" />
            <span>Share Link & QR</span>
          </button>

          <a
            href={apkDownloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer uppercase tracking-wider"
          >
            <Download className="w-4 h-4" />
            <span>Download Soldier APK (v1.0.7)</span>
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
          {/* Public Download Portal Access Control (Toggle + Passcode + Duration) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div
                  className={`p-2.5 rounded-xl border shrink-0 ${
                    portalSettings?.isDownloadPortalEnabled === false
                      ? "bg-slate-100 border-slate-200 text-slate-500"
                      : "bg-emerald-50 border-emerald-200 text-emerald-700"
                  }`}
                >
                  {portalSettings?.isDownloadPortalEnabled === false ? (
                    <Lock className="w-5 h-5 text-slate-600" />
                  ) : (
                    <ShieldCheck className="w-5 h-5 text-emerald-700" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-slate-900">
                      Public Mobile App Download Portal
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                        portalSettings?.isDownloadPortalEnabled === false
                          ? "bg-slate-100 text-slate-600 border border-slate-200"
                          : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      }`}
                    >
                      {portalSettings?.isDownloadPortalEnabled === false
                        ? "Disabled (Offline)"
                        : "Enabled (Active)"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Controls access to <code className="text-slate-700 font-mono">/download</code>. Require a unit passcode or set a timer window for security.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                <button
                  type="button"
                  onClick={handleTogglePortal}
                  disabled={isUpdatingPortal}
                  aria-label="Toggle Public Download Portal"
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 ${
                    portalSettings?.isDownloadPortalEnabled === false
                      ? "bg-slate-300"
                      : "bg-emerald-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      portalSettings?.isDownloadPortalEnabled === false
                        ? "translate-x-0"
                        : "translate-x-5"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Live Action Confirmation Toast */}
            {saveStatus && (
              <div
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-1 duration-200 ${
                  saveStatus.type === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-slate-100 border-slate-300 text-slate-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{saveStatus.message}</span>
                </div>
                <span className="text-[10px] uppercase font-mono text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                  Saved Live
                </span>
              </div>
            )}

            {/* Passcode & Expiration Config Box */}
            {portalSettings?.isDownloadPortalEnabled !== false && (
              <div className="pt-4 border-t border-slate-100 grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 1. Command Download Passcode Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-b from-white to-slate-50/80 border border-slate-200/90 shadow-2xs space-y-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/70">
                        <Lock className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block leading-tight">
                          Command Download Passcode
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {portalSettings?.passcode ? (
                            <span className="text-emerald-700 font-bold">● Passcode Protected: {portalSettings.passcode}</span>
                          ) : (
                            <span className="text-slate-400">○ Open Access (No Passcode)</span>
                          )}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        const randomPin = Math.floor(100000 + Math.random() * 900000).toString();
                        setLocalPasscode(randomPin);
                        setHasPasscodeEdits(false);
                        await updatePortalSettings({
                          isDownloadPortalEnabled: true,
                          allowRosterVerification: true,
                          requirePasscode: true,
                          passcode: randomPin,
                          passcodeExpiresAt: (portalSettings as any)?.passcodeExpiresAt,
                          updatedBy: officer.displayName || "Admin",
                          updatedByEmail: officer.email || undefined,
                        });
                        showConfirmation(`Generated & saved new PIN: ${randomPin}`);
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border border-emerald-200/80 rounded-lg cursor-pointer transition-all flex items-center gap-1 shadow-2xs"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Generate PIN</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={localPasscode}
                        onChange={(e) => {
                          setLocalPasscode(e.target.value.toUpperCase());
                          setHasPasscodeEdits(true);
                        }}
                        onKeyDown={async (e) => {
                          if (e.key === "Enter") {
                            const val = localPasscode.trim().toUpperCase();
                            setHasPasscodeEdits(false);
                            await updatePortalSettings({
                              isDownloadPortalEnabled: true,
                              allowRosterVerification: true,
                              requirePasscode: val.length > 0,
                              passcode: val || undefined,
                              passcodeExpiresAt: (portalSettings as any)?.passcodeExpiresAt,
                              updatedBy: officer.displayName || "Admin",
                              updatedByEmail: officer.email || undefined,
                            });
                            showConfirmation(val ? `Passcode saved as "${val}"` : "Passcode cleared (open access)");
                          }
                        }}
                        placeholder="e.g. 10RCDG or leave blank for none"
                        className="w-full pl-3 pr-28 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 font-mono font-extrabold text-slate-900 uppercase tracking-widest placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-400 shadow-2xs transition-all"
                      />
                      <div className="absolute right-1.5 flex items-center gap-1">
                        {localPasscode && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(localPasscode);
                              setCopiedPasscode(true);
                              setTimeout(() => setCopiedPasscode(false), 2000);
                            }}
                            title="Copy passcode"
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            {copiedPasscode ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={async () => {
                            const val = localPasscode.trim().toUpperCase();
                            setHasPasscodeEdits(false);
                            await updatePortalSettings({
                              isDownloadPortalEnabled: true,
                              allowRosterVerification: true,
                              requirePasscode: val.length > 0,
                              passcode: val || undefined,
                              passcodeExpiresAt: (portalSettings as any)?.passcodeExpiresAt,
                              updatedBy: officer.displayName || "Admin",
                              updatedByEmail: officer.email || undefined,
                            });
                            showConfirmation(val ? `Passcode saved as "${val}"` : "Passcode cleared (open access)");
                          }}
                          className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                            hasPasscodeEdits
                              ? "bg-emerald-800 hover:bg-emerald-700 text-white shadow-xs"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                          }`}
                        >
                          Save
                        </button>
                      </div>
                    </div>

                    {/* Quick suggestion tags */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-500 font-medium">Quick presets:</span>
                      {["10RCDG", "RESCOM", "1001CDC"].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={async () => {
                            setLocalPasscode(preset);
                            setHasPasscodeEdits(false);
                            await updatePortalSettings({
                              isDownloadPortalEnabled: true,
                              allowRosterVerification: true,
                              requirePasscode: true,
                              passcode: preset,
                              passcodeExpiresAt: (portalSettings as any)?.passcodeExpiresAt,
                              updatedBy: officer.displayName || "Admin",
                              updatedByEmail: officer.email || undefined,
                            });
                            showConfirmation(`Applied preset passcode: ${preset}`);
                          }}
                          className={`px-2.5 py-1 text-[10.5px] font-mono font-bold rounded-lg border cursor-pointer transition-colors ${
                            localPasscode === preset
                              ? "bg-emerald-100 text-emerald-900 border-emerald-400 shadow-2xs"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                      {localPasscode && (
                        <button
                          type="button"
                          onClick={async () => {
                            setLocalPasscode("");
                            setHasPasscodeEdits(false);
                            await updatePortalSettings({
                              isDownloadPortalEnabled: true,
                              allowRosterVerification: true,
                              requirePasscode: false,
                              passcode: undefined,
                              passcodeExpiresAt: (portalSettings as any)?.passcodeExpiresAt,
                              updatedBy: officer.displayName || "Admin",
                              updatedByEmail: officer.email || undefined,
                            });
                            showConfirmation("Removed passcode (portal is now open access)");
                          }}
                          className="px-2 py-0.5 text-[10px] font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-md border border-transparent cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-[10.5px] text-slate-500 leading-relaxed">
                    Troops enter this passcode on <strong>/download</strong> before unlocking the Soldier APK package.
                  </p>
                </div>

                {/* 2. Download Window Duration Card (Enlistment Style) */}
                <div className="p-4 rounded-2xl bg-gradient-to-b from-white to-slate-50/80 border border-slate-200/90 shadow-2xs space-y-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/70">
                        <Clock className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block leading-tight">
                          Download Window Duration
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Automatic portal lockout timer
                        </span>
                      </div>
                    </div>

                    {/* Expiration Status Badge & Close Early Action */}
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {(portalSettings as any)?.passcodeExpiresAt && (portalSettings as any).passcodeExpiresAt > currentTime ? (
                        <>
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-900 shadow-2xs">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                            </span>
                            <span className="text-[11px] font-mono font-extrabold">
                              {(() => {
                                const diff = (portalSettings as any).passcodeExpiresAt - currentTime;
                                const totalSec = Math.floor(diff / 1000);
                                const days = Math.floor(totalSec / 86400);
                                const hours = Math.floor((totalSec % 86400) / 3600);
                                const mins = Math.floor((totalSec % 3600) / 60);
                                if (days > 0) return `${days}d ${hours}h left`;
                                if (hours > 0) return `${hours}h ${mins}m left`;
                                return `${mins}m left`;
                              })()}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setIsCloseEarlyModalOpen(true)}
                            className="px-2 py-1 text-[10.5px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg cursor-pointer transition-colors shadow-2xs flex items-center gap-1"
                          >
                            <Clock className="w-3 h-3 text-amber-700" />
                            <span>Close Early</span>
                          </button>
                        </>
                      ) : (portalSettings as any)?.passcodeExpiresAt && (portalSettings as any).passcodeExpiresAt <= currentTime ? (
                        <span className="text-[10.5px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg">
                          Expired (Locked)
                        </span>
                      ) : (
                        <span className="text-[10.5px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Always Open
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Enlistment-style Duration Select Dropdown */}
                  <div className="space-y-2">
                    <select
                      value={durationPreset}
                      onChange={async (e) => {
                        const selectedVal = e.target.value;
                        setDurationPreset(selectedVal);

                        if (selectedVal === "Always Open") {
                          await updatePortalSettings({
                            isDownloadPortalEnabled: true,
                            allowRosterVerification: true,
                            requirePasscode: (portalSettings as any)?.requirePasscode ?? false,
                            passcode: (portalSettings as any)?.passcode,
                            passcodeExpiresAt: undefined,
                            sessionId: "sess_" + Date.now(),
                            updatedBy: officer.displayName || "Admin",
                            updatedByEmail: officer.email || undefined,
                          });
                          showConfirmation("Download window set to Always Open (No time limit)");
                        } else if (selectedVal !== "Custom Duration") {
                          const presetHoursMap: Record<string, number> = {
                            "1 Hour": 1,
                            "6 Hours": 6,
                            "12 Hours": 12,
                            "24 Hours (1 Day)": 24,
                            "3 Days": 72,
                            "7 Days (1 Week)": 168,
                            "14 Days": 336,
                            "30 Days": 720,
                          };
                          const hrs = presetHoursMap[selectedVal];
                          if (hrs) {
                            const exp = Date.now() + hrs * 60 * 60 * 1000;
                            await updatePortalSettings({
                              isDownloadPortalEnabled: true,
                              allowRosterVerification: true,
                              requirePasscode: (portalSettings as any)?.requirePasscode ?? false,
                              passcode: (portalSettings as any)?.passcode,
                              passcodeExpiresAt: exp,
                              sessionId: "sess_" + Date.now(),
                              updatedBy: officer.displayName || "Admin",
                              updatedByEmail: officer.email || undefined,
                            });
                            showConfirmation(`Download window set to ${selectedVal}`);
                          }
                        }
                      }}
                      className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 font-semibold text-slate-800 cursor-pointer shadow-2xs"
                    >
                      <option value="Always Open">Always Open (No Auto-Lockout)</option>
                      <option value="1 Hour">1 Hour</option>
                      <option value="6 Hours">6 Hours</option>
                      <option value="12 Hours">12 Hours</option>
                      <option value="24 Hours (1 Day)">24 Hours (1 Day)</option>
                      <option value="3 Days">3 Days</option>
                      <option value="7 Days (1 Week)">7 Days (1 Week)</option>
                      <option value="14 Days">14 Days</option>
                      <option value="30 Days">30 Days</option>
                      <option value="Custom Duration">Custom Duration (Specify Below)...</option>
                    </select>

                    {/* Custom Duration Input Box & Live Preview (Identical to Enlistment Form) */}
                    {durationPreset === "Custom Duration" && (() => {
                      const preview = getDurationPreview(customDurationInput);
                      return (
                        <div className="space-y-2 animate-in fade-in duration-150 pt-1">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={customDurationInput}
                              onChange={(e) => setCustomDurationInput(e.target.value)}
                              placeholder="e.g. 2 Hours, 45 Days, 3 Weeks, 90m..."
                              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium text-slate-900 shadow-2xs"
                            />
                            <button
                              type="button"
                              disabled={preview.type !== "valid"}
                              onClick={async () => {
                                if (preview.type === "valid" && preview.ms) {
                                  const exp = Date.now() + preview.ms;
                                  await updatePortalSettings({
                                    isDownloadPortalEnabled: true,
                                    allowRosterVerification: true,
                                    requirePasscode: (portalSettings as any)?.requirePasscode ?? false,
                                    passcode: (portalSettings as any)?.passcode,
                                    passcodeExpiresAt: exp,
                                    sessionId: "sess_" + Date.now(),
                                    updatedBy: officer.displayName || "Admin",
                                    updatedByEmail: officer.email || undefined,
                                  });
                                  showConfirmation(`Download window set to ${preview.normalizedLabel}`);
                                }
                              }}
                              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-800 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white transition-all cursor-pointer shrink-0 shadow-xs"
                            >
                              Apply
                            </button>
                          </div>

                          {/* Quick Duration Suggestion Chips */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mr-1">Quick Select:</span>
                            {["2 Hours", "4 Hours", "45 Days", "60 Days", "3 Months"].map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => setCustomDurationInput(preset)}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                                  customDurationInput === preset
                                    ? "bg-emerald-100 text-emerald-950 border-emerald-300 ring-1 ring-emerald-300"
                                    : "bg-slate-100/80 hover:bg-slate-200 text-slate-700 border-slate-200"
                                }`}
                              >
                                +{preset}
                              </button>
                            ))}
                          </div>

                          {/* Live Smart Auto-Correction & Expiry Preview */}
                          {preview.type === "valid" && (
                            <div className="p-2.5 rounded-xl bg-emerald-50/90 border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2 animate-in fade-in duration-150 shadow-2xs">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <div className="font-bold flex items-center gap-1.5 flex-wrap text-emerald-900">
                                  <span>Portal auto-closes in:</span>
                                  <span className="px-1.5 py-0.2 bg-emerald-200/80 text-emerald-950 rounded text-[10px] font-mono font-extrabold">
                                    {preview.normalizedLabel}
                                  </span>
                                </div>
                                <div className="text-[10.5px] text-emerald-700 font-mono mt-0.5">
                                  Exact Auto-Lock: {preview.expiryDateFormatted}
                                </div>
                              </div>
                            </div>
                          )}

                          {preview.type === "unrecognized" && customDurationInput.trim().length > 0 && (
                            <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-300 text-xs text-amber-950 flex items-start gap-2 animate-in fade-in duration-150">
                              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                              <div className="text-[11px] leading-relaxed">
                                <span className="font-bold text-amber-900">Custom Duration Format:</span> Type e.g. <code className="bg-amber-200/60 px-1 py-0.5 rounded font-mono font-bold text-[10px]">2 Weeks</code>, <code className="bg-amber-200/60 px-1 py-0.5 rounded font-mono font-bold text-[10px]">45 Days</code>, or <code className="bg-amber-200/60 px-1 py-0.5 rounded font-mono font-bold text-[10px]">3 Hours</code>.
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  <p className="text-[10.5px] text-slate-500 leading-relaxed">
                    Automatically closes download access when mobilization window ends to prevent unauthorized off-hours distribution.
                  </p>
                </div>
              </div>
            )}
          </div>

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
                    Direct APK Binary (rescom-alert-v1.0.7.apk)
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

            {/* Recent Device Installations with Soldier Identity & Hardware Telemetry */}
            {stats && stats.recentDownloads && stats.recentDownloads.length > 0 && (
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Recent Soldier Downloads & Hardware Tracking</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Latest {stats.recentDownloads.length} downloads
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {stats.recentDownloads.map((d: any) => (
                    <div
                      key={d.id}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2 hover:border-slate-300 transition-all shadow-2xs"
                    >
                      {/* Top Row: Soldier Name / Rank or Unassigned */}
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                          {d.soldierRank && (
                            <RankInsignia rank={d.soldierRank} size={14} />
                          )}
                          <span className="truncate">
                            {d.soldierName
                              ? `${d.soldierRank ? `${d.soldierRank} ` : ""}${d.soldierName}`
                              : "Troop Sideload"}
                          </span>
                        </div>
                        {d.downloadCount > 1 && (
                          <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100/80 px-1.5 py-0.2 rounded border border-emerald-200 shrink-0">
                            {d.downloadCount}x
                          </span>
                        )}
                      </div>

                      {/* Hardware and OS Row */}
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-700 bg-white p-2 rounded-lg border border-slate-200/80">
                        <span className="font-bold text-slate-800 truncate pr-1" title={d.deviceModel}>
                          {d.deviceModel}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold shrink-0">
                          {d.osVersion}
                        </span>
                      </div>

                      {/* Previous Device Badge (if device switch or previous device recorded) */}
                      {d.previousDeviceModel && (
                        <div
                          className={`p-1.5 rounded-lg text-[10px] flex items-center gap-1 border ${
                            d.isDeviceSwitch
                              ? "bg-amber-50 text-amber-900 border-amber-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          <span className="font-bold shrink-0">
                            {d.isDeviceSwitch ? "🔄 Switched from:" : "Previously:"}
                          </span>
                          <span className="font-mono truncate" title={d.previousDeviceModel}>
                            {d.previousDeviceModel}
                          </span>
                        </div>
                      )}

                      {/* Bottom Footer: Unit / Group and Timestamp */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/60">
                        <span className="truncate font-medium text-slate-500">
                          {d.unit || d.groupName || "10RCDG"}
                        </span>
                        <span className="shrink-0 font-mono">
                          {new Date(d.lastDownloadedAt).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          {new Date(d.lastDownloadedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
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
                <p className="text-xs text-red-900 leading-relaxed flex items-start gap-1.5">
                  <Siren className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>What happens on the soldier's phone:</strong> The phone lights up instantly, ignores Silent/Do Not Disturb mode, and plays a loud emergency siren continuously until the soldier taps the <strong>"Acknowledge & Silence"</strong> button on their screen.
                  </span>
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

      {/* Close Early Confirmation Modal (Identical to Enlistment close early modal) */}
      {isCloseEarlyModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-amber-200 overflow-hidden transform animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-50 to-orange-50/40 border-b border-amber-200/80 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center shrink-0 shadow-xs">
                  <Clock className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                    Close Download Window Early?
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      IMMEDIATE LOCKOUT
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCloseEarlyModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-amber-100/60 rounded-lg transition-colors cursor-pointer"
              >
                <span className="sr-only">Close</span>
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-3">
              <p className="text-xs font-bold text-slate-900">
                Are you sure you want to close the active soldier app download window ahead of schedule?
              </p>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                The public download link at <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold text-slate-800">/download</code> will immediately display a <strong>&ldquo;Mobilization Download Window Closed&rdquo;</strong> gate screen. Troops will no longer be able to download the APK package.
              </p>
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-1">
                <div className="flex justify-between items-center text-amber-950">
                  <span className="text-slate-600">Unit:</span>
                  <span className="font-bold">10RCDG RESCOM APP</span>
                </div>
                <div className="flex justify-between items-center text-amber-950">
                  <span className="text-slate-600">Action:</span>
                  <span className="font-mono font-bold text-rose-700">Immediate Expiration</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsCloseEarlyModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/80 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const newSession = "sess_" + Date.now();
                  await updatePortalSettings({
                    isDownloadPortalEnabled: true,
                    allowRosterVerification: true,
                    requirePasscode: (portalSettings as any)?.requirePasscode ?? false,
                    passcode: (portalSettings as any)?.passcode,
                    passcodeExpiresAt: Date.now() - 1000, // Expire immediately
                    sessionId: newSession,
                    updatedBy: officer.displayName || "Admin",
                    updatedByEmail: officer.email || undefined,
                  });
                  setIsCloseEarlyModalOpen(false);
                  showConfirmation("Download window closed early successfully", "info");
                }}
                className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Confirm Close Early</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share / QR Code Modal (Identical to Enlistment Share / QR Modal) */}
      <DownloadShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        portal={{
          passcode: (portalSettings as any)?.passcode,
          expiresAt: (portalSettings as any)?.passcodeExpiresAt,
          duration: durationPreset,
          title: "10RCDG RESCOM Alert Mobile App",
        }}
      />
    </div>
  );
}
