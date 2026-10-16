"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Download,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  Radio,
  Volume2,
  Lock,
  Unlock,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  ShieldCheck,
  Settings,
  QrCode,
  Camera,
  Maximize2,
  Copy,
  Check,
  X,
  UserCheck,
  Phone,
  ShieldAlert,
  RefreshCw,
  Clock,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { formatPhMobileDisplay, sanitizePhMobileInput, isValidPhMobileNumber } from "@/lib/sms";
import { RankInsignia } from "@/components/rank-insignia";
import { getPersistentDeviceId, parseDeviceDetails } from "@/lib/device";

export default function SoldierDownloadPage() {
  const [deviceId, setDeviceId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return getPersistentDeviceId();
    }
    return "";
  });
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState({ model: "Android Phone", os: "Android" });
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [troubleshootTab, setTroubleshootTab] = useState<"protect" | "restricted">("protect");
  const [verifyInput, setVerifyInput] = useState("");
  const [isQrAuthorized, setIsQrAuthorized] = useState(false);
  const [qrSoldierId, setQrSoldierId] = useState<string | null>(null);

  const cleanDigits = verifyInput.replace(/\D/g, "");
  const isCompleteNumber = isValidPhMobileNumber(verifyInput);

  const portalSettings = useQuery(api.downloads.getPortalSettings);
  const isVerificationAllowed = portalSettings?.allowRosterVerification !== false;

  // Passcode Gate Modal & 5-Attempt Rate Limiting (15-min lockout)
  const [passcodeInput, setPasscodeInput] = useState("");
  const [passcodeError, setPasscodeError] = useState("");
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const [currentTime, setCurrentTime] = useState(Date.now());

  // Keep live time updated for expiration countdowns
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Check if passcode is required and whether it has expired
  const isPasscodeActive = Boolean(
    portalSettings?.requirePasscode &&
    portalSettings?.passcode &&
    (!portalSettings.passcodeExpiresAt || portalSettings.passcodeExpiresAt > currentTime)
  );

  const isPortalExpired = Boolean(
    portalSettings?.passcodeExpiresAt && portalSettings.passcodeExpiresAt <= currentTime
  );

  // Initialize lockout and unlocked session from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedLockout = localStorage.getItem("rescom_download_lockout_until");
      if (storedLockout) {
        const until = parseInt(storedLockout, 10);
        if (until > Date.now()) {
          setLockoutUntil(until);
        } else {
          localStorage.removeItem("rescom_download_lockout_until");
          localStorage.removeItem("rescom_download_failed_attempts");
        }
      }
      const storedAttempts = localStorage.getItem("rescom_download_failed_attempts");
      if (storedAttempts) {
        setFailedAttempts(parseInt(storedAttempts, 10) || 0);
      }
    }
  }, []);

  // Reset lockout automatically whenever the Commander/Admin starts or renews a new download window (sessionId changed)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const currentServerSession = (portalSettings as any)?.sessionId;
    if (currentServerSession) {
      const lastKnownSession = localStorage.getItem("rescom_download_session_id");
      if (lastKnownSession && lastKnownSession !== currentServerSession) {
        // A new window was launched: immediately forgive previous lockouts and attempts!
        localStorage.removeItem("rescom_download_lockout_until");
        localStorage.removeItem("rescom_download_failed_attempts");
        setLockoutUntil(null);
        setFailedAttempts(0);
        setSecondsLeft(0);
        setPasscodeError("");
      }
      localStorage.setItem("rescom_download_session_id", currentServerSession);
    }
  }, [(portalSettings as any)?.sessionId]);

  // Lockout countdown timer effect
  useEffect(() => {
    if (!lockoutUntil) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        setLockoutUntil(null);
        setFailedAttempts(0);
        if (typeof window !== "undefined") {
          localStorage.removeItem("rescom_download_lockout_until");
          localStorage.removeItem("rescom_download_failed_attempts");
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  // Handle Passcode Submission (5 attempts -> 15 mins lockout)
  const handleVerifyPasscode = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (lockoutUntil) return;

    const inputClean = passcodeInput.trim().toUpperCase();
    const correctPasscode = (portalSettings?.passcode || "").trim().toUpperCase();

    if (!inputClean) {
      setPasscodeError("Please enter the Command Passcode");
      return;
    }

    if (inputClean === correctPasscode) {
      setIsVerifying(true);
      setPasscodeError("");
      setFailedAttempts(0);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("rescom_download_unlocked");
        localStorage.removeItem("rescom_download_failed_attempts");
      }

      // Record successful unlock telemetry for current session (deduplicated by deviceId)
      if (deviceId) {
        recordSessionUnlock({ deviceId }).catch((err) =>
          console.error("Failed to record session unlock:", err)
        );
      }

      // Clean, professional military verification sequence (600ms)
      setTimeout(() => {
        setIsUnlocked(true);
        setIsVerifying(false);
      }, 650);
    } else {
      setPasscodeInput(""); // Clear input on incorrect attempt so user can immediately re-enter
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      if (typeof window !== "undefined") {
        localStorage.setItem("rescom_download_failed_attempts", newAttempts.toString());
      }

      if (newAttempts >= 5) {
        const lockoutTime = Date.now() + 15 * 60 * 1000; // 15 Minutes lockout
        setLockoutUntil(lockoutTime);
        if (typeof window !== "undefined") {
          localStorage.setItem("rescom_download_lockout_until", lockoutTime.toString());
        }
        setPasscodeError("Maximum attempts exceeded. Access locked for 15 minutes.");
      } else {
        const remainingAttempts = 5 - newAttempts;
        setPasscodeError(`Incorrect passcode. ${remainingAttempts} ${remainingAttempts === 1 ? "attempt" : "attempts"} remaining.`);
      }
    }
  };

  // Clean, zero-impersonation download authorization:
  const isDownloadAuthorized =
    !isPortalExpired &&
    !lockoutUntil &&
    (isQrAuthorized || !isPasscodeActive || isUnlocked);

  const recordDownload = useMutation(api.downloads.record);
  const recordSessionUnlock = useMutation(api.downloads.recordSessionUnlock);
  const stats = useQuery(api.downloads.getStats);

  const apkUrl = "https://github.com/JavierSiliacay/RESCOM-ALERT/releases/download/v1.0.7/rescom-alert-v1.0.7.apk";

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

    // 4. Resolve Portal URL for QR Code
    if (typeof window !== "undefined") {
      setPortalUrl(window.location.origin + "/download");

      // 5. Parse Authorized Command QR Code Parameters from camera scan
      const params = new URLSearchParams(window.location.search);
      const verifyParam = params.get("verify") || params.get("phone") || params.get("mobile");
      const authParam = params.get("auth") || params.get("qr");
      const soldierIdParam = params.get("soldierId");

      if (authParam === "command_qr" || authParam === "1" || Boolean(soldierIdParam)) {
        setIsQrAuthorized(true);
      }
      if (soldierIdParam) {
        setQrSoldierId(soldierIdParam);
      }
      if (verifyParam) {
        const cleaned = sanitizePhMobileInput(decodeURIComponent(verifyParam));
        setVerifyInput(cleaned);
      }
    }
  }, []);

  const [showQrModal, setShowQrModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [portalUrl, setPortalUrl] = useState<string>("");

  const activeQrValue = portalUrl || "https://rescom-alert.com/download";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(activeQrValue);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Clipboard fallback
    }
  };

  const handleDownload = async () => {
    if (portalSettings?.isDownloadPortalEnabled === false && !isQrAuthorized) return;
    if (!isDownloadAuthorized) return;
    if (isRecording) return;
    setIsRecording(true);

    try {
      // Record download in Convex database with telemetry
      if (deviceId) {
        await recordDownload({
          deviceId,
          userAgent: navigator.userAgent || "Unknown",
          deviceModel: deviceInfo.model,
          osVersion: deviceInfo.os,
          soldierId: qrSoldierId ? (qrSoldierId as any) : undefined,
          soldierName: isQrAuthorized ? "Verified via QR / Command" : "Command Passcode Authorized",
        });
      }
    } catch (e) {
      console.error("Failed to log telemetry:", e);
    } finally {
      setIsRecording(false);
      setDownloadStarted(true);

      // Trigger APK download cleanly without spawning zombie blank tabs
      window.location.href = apkUrl;
    }
  };

  // Lockdown screen: public visitors blocked, but authorized Command QR codes bypass
  if (portalSettings && portalSettings.isDownloadPortalEnabled === false && !isQrAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-800 antialiased selection:bg-slate-200 selection:text-slate-900">
        <main className="max-w-md w-full mx-auto px-4 py-16 sm:py-24 my-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-5">
            {/* Army & RESCOM Insignia */}
            <div className="flex items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full border border-slate-200 overflow-hidden bg-white p-0.5 shadow-2xs">
                <Image
                  src="/rescom-pa-seal.png"
                  alt="Philippine Army RESCOM"
                  width={48}
                  height={48}
                  className="w-full h-full object-contain"
                  priority
                />
              </div>
              <div className="w-12 h-12 rounded-full border border-slate-200 overflow-hidden bg-white p-0.5 shadow-2xs">
                <Image
                  src="/rescom-emblem.jpg"
                  alt="10RCDG Emblem"
                  width={48}
                  height={48}
                  className="w-full h-full object-contain"
                  priority
                />
              </div>
            </div>

            {/* Clean Status & Notice */}
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 text-slate-500 mx-auto flex items-center justify-center">
                <Lock className="w-5 h-5 text-slate-600" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Portal Temporarily Unavailable
              </h1>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                {portalSettings.lockdownReason ||
                  "The mobile app download portal is currently offline for maintenance or restricted by unit administration. Please coordinate with your unit coordinator."}
              </p>
            </div>

            {/* Clean External Unit Page Link */}
            <div className="pt-2">
              <a
                href="https://www.facebook.com/profile.php?id=61586365277137"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 py-2 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
              >
                <span>10RCDG Facebook Page</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>
            </div>
          </div>
        </main>

        <footer className="py-6 text-center text-[11px] text-slate-400 font-mono">
          10th Regional Community Defense Group (10RCDG), RESCOM, Philippine Army
        </footer>
      </div>
    );
  }

  // EXPIRED DOWNLOAD WINDOW SCREEN (Mobilization Window Closed)
  if (portalSettings && isPortalExpired && !isQrAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-800 antialiased selection:bg-slate-200 selection:text-slate-900">
        <main className="max-w-md w-full mx-auto px-4 py-16 sm:py-24 my-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-5">
            {/* Army & RESCOM Insignia */}
            <div className="flex items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full border border-slate-200 overflow-hidden bg-white p-0.5 shadow-2xs">
                <Image
                  src="/rescom-pa-seal.png"
                  alt="Philippine Army RESCOM"
                  width={48}
                  height={48}
                  className="w-full h-full object-contain"
                  priority
                />
              </div>
              <div className="w-12 h-12 rounded-full border border-slate-200 overflow-hidden bg-white p-0.5 shadow-2xs">
                <Image
                  src="/rescom-emblem.jpg"
                  alt="10RCDG Emblem"
                  width={48}
                  height={48}
                  className="w-full h-full object-contain"
                  priority
                />
              </div>
            </div>

            {/* Clean Status & Notice */}
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 text-amber-600 mx-auto flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Mobilization Download Window Closed
              </h1>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                The scheduled mobilization window for downloading the soldier application has concluded or was closed early by Headquarters. Please coordinate directly with your unit coordinator or system admnistrators.
              </p>
            </div>

            {/* Clean External Unit Page Link */}
            <div className="pt-2">
              <a
                href="https://www.facebook.com/profile.php?id=61586365277137"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 py-2 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
              >
                <span>10RCDG Facebook Page</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>
            </div>
          </div>
        </main>

        <footer className="py-6 text-center text-[11px] text-slate-400 font-mono">
          10th Regional Community Defense Group (10RCDG), RESCOM, Philippine Army
        </footer>
      </div>
    );
  }

  // PASSCODE & LOCKOUT GATE SCREEN (Blocks full download page until unlocked)
  if (portalSettings && isPasscodeActive && !isUnlocked && !isQrAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-800 antialiased selection:bg-emerald-100 selection:text-emerald-900">
        <main className="max-w-md w-full mx-auto px-4 py-12 sm:py-20 my-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8 text-center space-y-6">
            {/* Dual Military Insignia Lockup */}
            <div className="flex items-center justify-center gap-2.5">
              <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-200 bg-white p-0.5 shadow-xs">
                <Image
                  src="/rescom-pa-seal.png"
                  alt="PA Seal"
                  width={48}
                  height={48}
                  className="w-full h-full object-contain"
                  priority
                />
              </div>
              <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-200 bg-white p-0.5 shadow-xs">
                <Image
                  src="/rescom-emblem.jpg"
                  alt="10RCDG Emblem"
                  width={48}
                  height={48}
                  className="w-full h-full object-contain"
                  priority
                />
              </div>
            </div>

            {/* Header Lockup */}
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10.5px] font-mono font-bold tracking-wider uppercase">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Command Security Gate</span>
                </div>

                {/* Mobilization Window Duration Display for Soldiers */}
                {(portalSettings as any)?.passcodeExpiresAt && (portalSettings as any).passcodeExpiresAt > currentTime ? (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-950 text-[10.5px] font-mono font-extrabold shadow-2xs animate-pulse">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>
                      Window Closes:{" "}
                      {(() => {
                        const diff = (portalSettings as any).passcodeExpiresAt - currentTime;
                        const totalSec = Math.floor(diff / 1000);
                        const days = Math.floor(totalSec / 86400);
                        const hours = Math.floor((totalSec % 86400) / 3600);
                        const mins = Math.floor((totalSec % 3600) / 60);
                        const secs = totalSec % 60;
                        if (days > 0) return `${days}d ${hours}h ${mins}m ${secs}s left`;
                        if (hours > 0) return `${hours}h ${mins}m ${secs}s left`;
                        return `${mins}m ${secs}s left`;
                      })()}
                    </span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10.5px] font-mono font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Always Open</span>
                  </div>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                10RCDG RESCOM APP
              </h1>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                Official emergency siren & mobilization companion app. Enter your unit&apos;s Command Passcode to access the download package.
              </p>
            </div>

            {/* Active Lockout State (15-Minute Cooldown Screen) */}
            {lockoutUntil ? (
              <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-950 space-y-3 text-left animate-in fade-in">
                <div className="flex items-center gap-2 text-rose-900 font-bold text-xs sm:text-sm">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Access Temporarily Locked</span>
                </div>
                <p className="text-xs text-rose-800 leading-relaxed">
                  Too many failed passcode attempts. For military operational security, download access is locked for{" "}
                  <strong className="font-mono text-rose-950 font-extrabold">
                    {Math.floor(secondsLeft / 60)}m {secondsLeft % 60}s
                  </strong>.
                </p>
                <div className="pt-2 border-t border-rose-200 flex items-center justify-between text-[11px] text-rose-700 font-mono">
                  <span>Authorized 10RCDG troops only</span>
                  <span className="font-bold bg-rose-100 px-2 py-0.5 rounded border border-rose-300">
                    {secondsLeft}s remaining
                  </span>
                </div>
              </div>
            ) : (
              /* Passcode Unlock Form */
              <form onSubmit={handleVerifyPasscode} className="space-y-4 text-left">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                      Command Passcode
                    </label>
                    {failedAttempts > 0 && failedAttempts < 5 && (
                      <span className="text-[10px] font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        {5 - failedAttempts} {5 - failedAttempts === 1 ? "attempt left" : "attempts left"}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      autoFocus
                      disabled={isVerifying}
                      value={passcodeInput}
                      onChange={(e) => {
                        setPasscodeInput(e.target.value.toUpperCase());
                        if (passcodeError) setPasscodeError("");
                      }}
                      placeholder="ENTER UNIT PASSCODE"
                      maxLength={20}
                      className={`w-full pl-10 pr-4 py-3 text-sm sm:text-base bg-white border rounded-xl focus:outline-none font-mono font-extrabold tracking-widest uppercase shadow-2xs transition-all ${
                        isVerifying
                          ? "border-emerald-500 bg-emerald-50/50 text-emerald-950 ring-2 ring-emerald-500/30"
                          : "border-slate-300 text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-400"
                      }`}
                    />
                  </div>
                  {passcodeError && (
                    <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>{passcodeError}</span>
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!passcodeInput.trim() || isVerifying}
                  className={`w-full py-3.5 px-5 rounded-xl font-extrabold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2.5 uppercase tracking-wider ${
                    isVerifying
                      ? "bg-emerald-700 text-white shadow-emerald-700/20 shadow-lg cursor-wait"
                      : "bg-emerald-800 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white active:scale-[0.98]"
                  }`}
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                      <span>Verifying & Unlocking...</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4" />
                      <span>Unlock Download Portal</span>
                    </>
                  )}
                </button>
              </form>
            )}

            <p className="text-[10.5px] text-slate-400 leading-relaxed">
              Authorized 10RCDG personnel only. Coordinate with your Unit Communications Officer if you need authorization.
            </p>
          </div>
        </main>

        <footer className="py-6 text-center text-[11px] text-slate-400 font-mono">
          10th Regional Community Defense Group (10RCDG), RESCOM, Philippine Army
        </footer>
      </div>
    );
  }

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

      {/* Main Content Container with smooth military entrance animation */}
      <main className="max-w-xl w-full mx-auto px-4 py-8 sm:py-12 space-y-6 animate-in fade-in zoom-in-95 duration-300">
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
            <div className="flex items-center justify-center gap-1.5 flex-wrap mb-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-extrabold uppercase tracking-wider">
                <Shield className="w-3.5 h-3.5" />
                <span>Official Military Mobilization Portal</span>
              </div>

              {/* Mobilization Window Duration Display */}
              {(portalSettings as any)?.passcodeExpiresAt && (portalSettings as any).passcodeExpiresAt > currentTime ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-950 text-[11px] font-mono font-extrabold shadow-2xs">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  <span>
                    Window Closes:{" "}
                    {(() => {
                      const diff = (portalSettings as any).passcodeExpiresAt - currentTime;
                      const totalSec = Math.floor(diff / 1000);
                      const days = Math.floor(totalSec / 86400);
                      const hours = Math.floor((totalSec % 86400) / 3600);
                      const mins = Math.floor((totalSec % 3600) / 60);
                      const secs = totalSec % 60;
                      if (days > 0) return `${days}d ${hours}h ${mins}m left`;
                      if (hours > 0) return `${hours}h ${mins}m ${secs}s left`;
                      return `${mins}m ${secs}s left`;
                    })()}
                  </span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10.5px] font-mono font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Always Open</span>
                </div>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              10RCDG RESCOM APP
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-md mx-auto">
              Companion emergency siren and mobilization alert system for Army reservists and field personnel.
            </p>
          </div>
        </div>

        {/* Command Authorized Direct QR Clearance Pill */}
        {isQrAuthorized && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-900 border border-emerald-700 text-white shadow-md flex items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-800 border border-emerald-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-emerald-300" />
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5 flex-wrap">
                  <span>Command QR Clearance Active</span>
                  <span className="text-[10px] bg-emerald-800 text-emerald-200 px-1.5 py-0.2 rounded font-mono border border-emerald-600">
                    DIRECT PASS
                  </span>
                </div>
                <p className="text-[11px] text-emerald-100 leading-relaxed">
                  Authorized direct provisioning by unit command. Target hardware model ({deviceInfo.model}) will be registered upon download.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Primary Download Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Release Package
              </div>
              <div className="text-lg font-extrabold text-slate-900">
                RESCOM ALERT v1.0.7
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                File Size
              </div>
              <div className="text-sm font-bold text-slate-700">
                55 MB · APK
              </div>
            </div>
          </div>

          {/* Command Authorization Status */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Command Authorization</span>
              </span>
              {isDownloadAuthorized ? (
                <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                  AUTHORIZED
                </span>
              ) : (
                <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                  LOCKED
                </span>
              )}
            </div>

            {lockoutUntil ? (
              <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-950 text-xs space-y-1.5 animate-in fade-in">
                <div className="font-bold flex items-center gap-1.5 text-rose-900">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Access Temporarily Locked (15-Minute Cooldown)</span>
                </div>
                <p className="text-rose-800 text-[11px] leading-relaxed">
                  Too many failed passcode attempts. For military operational security, download access is locked for{" "}
                  <strong>
                    {Math.floor(secondsLeft / 60)}m {secondsLeft % 60}s
                  </strong>.
                </p>
              </div>
            ) : isPortalExpired ? (
              <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-950 text-xs space-y-1 animate-in fade-in">
                <div className="font-bold flex items-center gap-1.5 text-amber-900">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Download Window Closed</span>
                </div>
                <p className="text-amber-800 text-[11px] leading-relaxed">
                  The active mobilization download window has closed. Please coordinate with your Unit Officer or Commander.
                </p>
              </div>
            ) : isDownloadAuthorized ? (
              <div className="p-3 rounded-lg bg-emerald-50/80 border border-emerald-200 text-emerald-950 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">
                  {isQrAuthorized
                    ? "Authorized direct provisioning via Command QR."
                    : "Command Passcode verified. Official 10RCDG Release unlocked."}
                </span>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-950 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                  <span className="font-medium">Command Passcode required to unlock APK package.</span>
                </div>
              </div>
            )}
          </div>

          {/* Download Action Button */}
          <div className="space-y-3">
            {!isDownloadAuthorized ? (
              <button
                type="button"
                disabled
                className="w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-xl font-bold text-sm cursor-not-allowed border bg-slate-100 text-slate-400 border-slate-200"
              >
                <Lock className="w-4 h-4 text-slate-400" />
                <span>
                  {isPortalExpired
                    ? "DOWNLOAD WINDOW CLOSED"
                    : lockoutUntil
                      ? `LOCKED (${secondsLeft}s)`
                      : "ENTER PASSCODE TO UNLOCK DOWNLOAD"}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDownload}
                disabled={isRecording}
                className="w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-emerald-900/15 active:scale-[0.98] transition-all cursor-pointer"
              >
                {isRecording ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Preparing Download...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    <span>DOWNLOAD RESCOM ALERT (v1.0.7 APK)</span>
                  </>
                )}
              </button>
            )}

            {downloadStarted ? (
              <div className="space-y-2 animate-in fade-in duration-200">
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div>
                      <strong>Download started!</strong> Authorized package for{" "}
                      <strong>{deviceInfo.model}</strong>.
                    </div>
                    <div className="text-[11px] text-emerald-800">
                      Open your phone notifications or Downloads folder to tap and install.
                    </div>
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 text-[11px] leading-relaxed">
                  <strong>Tip:</strong> If download shows 100% and pauses while your phone performs security scanning, open your phone&apos;s <strong>My Files</strong> &gt; <strong>Downloads</strong> folder to tap and install immediately.
                </div>
              </div>
            ) : isDownloadAuthorized ? (
              <p className="text-center text-[11px] text-emerald-700 font-medium">
                ✓ Access authorized. Compatible with all Android devices (Android 7.0 to Android 15+)
              </p>
            ) : (
              <p className="text-center text-[11px] text-slate-400">
                Authorized 10RCDG personnel only · Command Passcode verification required
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

        {/* Instant QR Code Scanner Box (Presentation & Quick Troop Sideload) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase tracking-wider mb-1">
                <Camera className="w-3 h-3 text-emerald-700" />
                <span>Instant Troop QR Scanner</span>
              </div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-emerald-700" />
                <span>Scan with Your Phone Camera</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Point your phone camera to download directly — zero typing required.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer shrink-0"
              title="Enlarge for Projector Presentation"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Projector View</span>
            </button>
          </div>

          {/* QR Display Frame */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
            <div className="p-3 bg-white rounded-xl shadow-xs border border-slate-200 shrink-0">
              <QRCodeSVG
                value={activeQrValue}
                size={160}
                level="H"
                includeMargin={false}
              />
            </div>

            <div className="space-y-3 text-center sm:text-left">
              <div className="space-y-1">
                <div className="text-xs font-bold text-slate-900 flex items-center justify-center sm:justify-start gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                  <span>Ready for Live Briefings</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs">
                  Soldiers in formation can scan this QR code with their phone camera to open this portal and verify their identity.
                </p>
              </div>

              {/* Copy URL Button */}
              <div>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Portal Link Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy Portal URL</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
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

        {/* 14-Step Visual Guide Callout Banner */}
        <Link
          href="/download/guide"
          className="group block p-4 bg-gradient-to-r from-emerald-800 to-emerald-950 text-white rounded-2xl shadow-xs hover:shadow-md transition-all border border-emerald-700/60"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20 group-hover:scale-105 transition-transform">
                <Smartphone className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-extrabold flex items-center gap-1.5">
                  <span>Complete 14-Step Visual Guide</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-400 text-slate-950 uppercase">
                    Screenshots
                  </span>
                </div>
                <div className="text-[11px] text-emerald-200/90 mt-0.5">
                  Sundin ang hakbang-hakbang na gabay kung hinarang ng Play Protect.
                </div>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-emerald-300 shrink-0 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

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
                    <span>Android 13–16 SMS & Restricted Settings</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] leading-relaxed space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                      <span>Built-in Android 15/16 Zero-Permission Engine:</span>
                    </div>
                    <p>
                      RESCOM ALERT v1.0.7 features <strong>Google SMS Retriever (Layer 2)</strong>. Even if Android greys out SMS permissions or Samsung Auto Blocker hides the menu, <strong>emergency sirens will still trigger 100% offline</strong> with zero permissions needed!
                    </p>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    To enable <strong>Classic SMS (Layer 1)</strong> as redundant secondary backup (optional):
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
                      Open <strong>RESCOM ALERT</strong> → go to <strong>Phone Setup</strong> to verify dual-engine SMS status.
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

      {/* Fullscreen / Projector Presentation Modal */}
      {showQrModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 text-center space-y-5 animate-in zoom-in-95 duration-200 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Insignia & Military Header */}
            <div className="flex items-center justify-center gap-2.5">
              <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 bg-white p-0.5">
                <Image
                  src="/rescom-pa-seal.png"
                  alt="PA Seal"
                  width={40}
                  height={40}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 bg-white p-0.5">
                <Image
                  src="/rescom-emblem.jpg"
                  alt="10RCDG Emblem"
                  width={40}
                  height={40}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            <div>
              <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 inline-block mb-1.5">
                10RCDG TROOP MOBILIZATION
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                SCAN TO DOWNLOAD APP
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Open phone camera or QR scanner. Point at the code below to download immediately.
              </p>
            </div>

            {/* Giant QR for Projector */}
            <div className="p-4 bg-white rounded-2xl shadow-md border-2 border-slate-200 inline-block mx-auto">
              <QRCodeSVG
                value={activeQrValue}
                size={230}
                level="H"
                includeMargin={false}
              />
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <div className="font-bold text-slate-900 flex items-center justify-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-700" />
                <span>100% Offline GSM Siren · No Internet Needed</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Compatible with all Android phones (Android 7.0 to 15+)
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Close Presentation View
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
