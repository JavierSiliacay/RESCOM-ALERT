"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  Shield,
  Lock,
  Clock,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Phone,
  User,
  Building2,
  ArrowRight,
  Sparkles,
  Check,
  UserCheck,
  Smartphone,
  Download,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { RankSearchSelect } from "@/components/rank-search-select";
import { sanitizePhMobileInput, isValidPhMobileNumber, formatPhMobileDisplay } from "@/lib/sms";
import { AndroidIcon, KeypadPhoneIcon } from "@/components/device-icons";
import { getPersistentDeviceId, parseDeviceDetails } from "@/lib/device";

function extractCleanErrorMessage(err: any): string {
  if (!err) return "Failed to submit enlistment.";
  if (err.data && typeof err.data === "string") return err.data;
  if (typeof err.message === "string") {
    const raw = err.message;
    const match = raw.match(/Uncaught (?:Error|ConvexError):\s*([^\n\r]+)/i);
    if (match && match[1]) return match[1].trim();

    const cleaned = raw
      .replace(/\[CONVEX[^\]]*\]/g, "")
      .replace(/\[Request ID:[^\]]*\]/g, "")
      .replace(/Server Error Called by client/g, "")
      .replace(/Server Error/g, "")
      .trim();
    if (cleaned) return cleaned;
    return raw;
  }
  return String(err);
}

export default function PublicEnlistmentPage() {
  const params = useParams();
  const campaignCode = (params?.code as string) || "";

  const campaign = useQuery(api.enlistment.getCampaignPublic, {
    campaignCode,
  });
  const groups = useQuery(api.groups.list);
  const groupsList = groups || [];

  const submitEnlistment = useMutation(api.enlistment.submitEnlistment);
  const validatePasscode = useMutation(api.enlistment.validatePasscode);

  // Flow State
  const [passcode, setPasscode] = useState("");
  const [isValidatingPasscode, setIsValidatingPasscode] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Rate Limiting & Lockout State (5 failed attempts -> 3 minutes lockout)
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [lockoutSecondsLeft, setLockoutSecondsLeft] = useState(0);

  // Form State
  const [formData, setFormData] = useState({
    rank: "PVT",
    firstName: "",
    lastName: "",
    mobileNumber: "09",
    deviceType: "ANDROID" as "ANDROID" | "KEYPAD",
    groupId: "",
    groupName: "All 10RCDG Personnel",
    unit: "",
  });

  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Hardware Device Identification & Anti-Impersonation Binding State
  const [deviceId, setDeviceId] = useState<string>("");
  const [deviceInfo, setDeviceInfo] = useState({ model: "Android Phone", os: "Android" });
  const [isHardwareBound, setIsHardwareBound] = useState(true);

  // Initialize hardware device fingerprinting on mount
  useEffect(() => {
    const id = getPersistentDeviceId();
    setDeviceId(id);
    if (typeof navigator !== "undefined") {
      setDeviceInfo(parseDeviceDetails(navigator.userAgent || ""));
    }
  }, []);

  // Restore failed attempts and active lockout from localStorage
  useEffect(() => {
    if (!campaignCode) return;
    const lockKey = `rescom_lockout_${campaignCode.toLowerCase()}`;
    const failKey = `rescom_failed_${campaignCode.toLowerCase()}`;

    try {
      const storedLock = localStorage.getItem(lockKey);
      const storedFail = localStorage.getItem(failKey);

      if (storedFail) {
        setFailedAttempts(parseInt(storedFail, 10) || 0);
      }

      if (storedLock) {
        const lockTime = parseInt(storedLock, 10);
        if (lockTime > Date.now()) {
          setLockoutUntil(lockTime);
          setLockoutSecondsLeft(Math.ceil((lockTime - Date.now()) / 1000));
        } else {
          localStorage.removeItem(lockKey);
          localStorage.removeItem(failKey);
          setFailedAttempts(0);
          setLockoutUntil(null);
          setLockoutSecondsLeft(0);
        }
      }
    } catch {
      // Ignore storage errors in private browsing
    }
  }, [campaignCode]);

  // Lockout Countdown Ticker
  useEffect(() => {
    if (!lockoutUntil) {
      setLockoutSecondsLeft(0);
      return;
    }

    const interval = setInterval(() => {
      const remainingMs = lockoutUntil - Date.now();
      if (remainingMs <= 0) {
        setLockoutUntil(null);
        setLockoutSecondsLeft(0);
        setFailedAttempts(0);
        setPasscodeError(null);
        if (campaignCode) {
          try {
            localStorage.removeItem(`rescom_lockout_${campaignCode.toLowerCase()}`);
            localStorage.removeItem(`rescom_failed_${campaignCode.toLowerCase()}`);
          } catch {}
        }
      } else {
        setLockoutSecondsLeft(Math.ceil(remainingMs / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockoutUntil, campaignCode]);

  // Pre-fill group & unit when campaign loads
  useEffect(() => {
    if (campaign) {
      setFormData((prev) => ({
        ...prev,
        groupId: campaign.groupId || "",
        groupName: campaign.groupName || "All 10RCDG Personnel",
        unit: prev.unit || (campaign.targetUnit === "All Units" ? "10RCDG HQ" : campaign.targetUnit),
      }));
    }
  }, [campaign]);

  const isGroupLocked = Boolean(
    (campaign?.groupName && campaign.groupName !== "All 10RCDG Personnel") || campaign?.groupId
  );

  // Live Countdown State
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });

  useEffect(() => {
    if (!campaign?.expiresAt) return;

    const tick = () => {
      const diff = campaign.expiresAt - Date.now();
      if (diff <= 0 || campaign.status === "CLOSED") {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }
      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(totalSeconds / (3600 * 24));
      const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      setTimeLeft({ days, hours, minutes, seconds, isExpired: false });
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [campaign]);

  const isLockedOut = lockoutSecondsLeft > 0;

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedOut) return;

    setPasscodeError(null);
    const cleanPasscode = passcode.trim();
    if (!cleanPasscode) {
      setPasscodeError("Please enter the unit security passcode.");
      return;
    }

    setIsValidatingPasscode(true);
    try {
      const res = await validatePasscode({
        campaignCode,
        passcode: cleanPasscode,
      });

      if (!res.valid) {
        const nextFailed = failedAttempts + 1;
        setFailedAttempts(nextFailed);

        if (nextFailed >= 5) {
          const lockDuration = 3 * 60 * 1000; // 3 minutes
          const lockTime = Date.now() + lockDuration;
          setLockoutUntil(lockTime);
          setLockoutSecondsLeft(180);
          try {
            localStorage.setItem(`rescom_lockout_${campaignCode.toLowerCase()}`, String(lockTime));
            localStorage.setItem(`rescom_failed_${campaignCode.toLowerCase()}`, String(nextFailed));
          } catch {}
          setPasscodeError("Maximum attempts exceeded (5/5). Input field locked for 3 minutes.");
        } else {
          try {
            localStorage.setItem(`rescom_failed_${campaignCode.toLowerCase()}`, String(nextFailed));
          } catch {}
          const remaining = 5 - nextFailed;
          setPasscodeError(
            `Incorrect unit security passcode. (${remaining} attempt${remaining === 1 ? "" : "s"} left)`
          );
        }
        return;
      }

      // Success: Clear rate limit counters and unlock form
      setFailedAttempts(0);
      setLockoutUntil(null);
      setLockoutSecondsLeft(0);
      try {
        localStorage.removeItem(`rescom_lockout_${campaignCode.toLowerCase()}`);
        localStorage.removeItem(`rescom_failed_${campaignCode.toLowerCase()}`);
      } catch {}

      setIsUnlocked(true);
    } catch (err: any) {
      setPasscodeError("Unable to verify unit passcode. Please try again.");
    } finally {
      setIsValidatingPasscode(false);
    }
  };

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = sanitizePhMobileInput(raw);
    setFormData((prev) => ({ ...prev, mobileNumber: sanitized }));
    if (phoneError) {
      setPhoneError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionError(null);

    if (!isValidPhMobileNumber(formData.mobileNumber)) {
      setPhoneError("Please enter a valid 11-digit mobile number (e.g. 0917 123 4567).");
      return;
    }

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setSubmissionError("Please enter both your first and last name.");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitEnlistment({
        campaignCode,
        passcode: passcode.trim(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        rank: formData.rank,
        mobileNumber: formData.mobileNumber,
        unit: formData.unit.trim() || (campaign?.targetUnit || "10RCDG HQ"),
        groupId: isGroupLocked ? (campaign?.groupId || undefined) : (formData.groupId || undefined),
        groupName: isGroupLocked ? (campaign?.groupName || "All 10RCDG Personnel") : (formData.groupName || "All 10RCDG Personnel"),
        deviceType: formData.deviceType,
        deviceId: isHardwareBound && formData.deviceType === "ANDROID" ? (deviceId || undefined) : undefined,
        deviceModel: isHardwareBound && formData.deviceType === "ANDROID" ? (deviceInfo.model || undefined) : undefined,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      });
      setIsSubmitted(true);
    } catch (err: any) {
      const msg = extractCleanErrorMessage(err);
      if (msg.toLowerCase().includes("passcode")) {
        setIsUnlocked(false);
        setPasscodeError("Incorrect unit security passcode. Please re-enter the authorized key.");
      } else {
        setSubmissionError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (campaign === undefined) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#f8fafc] text-slate-500 font-mono text-xs">
        <div className="flex items-center gap-2 p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <div className="w-4 h-4 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
          <span>Verifying 10RCDG Enlistment Gateway...</span>
        </div>
      </div>
    );
  }

  if (campaign === null) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-[#f8fafc] p-4 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mb-4 shadow-md">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-lg font-bold text-slate-900">Invalid Enlistment Link</h1>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          This enlistment link does not exist or has been decommissioned by 10RCDG Command.
        </p>
      </div>
    );
  }

  const isClosedOrExpired = campaign.isExpired || timeLeft.isExpired || campaign.status === "CLOSED";

  return (
    <div className="relative min-h-dvh w-full flex flex-col justify-between bg-[#f8fafc] text-slate-800 overflow-y-auto selection:bg-emerald-100 selection:text-emerald-900">
      {/* Official 10RCDG Troop Formation Background with Soft Frosted Overlay */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Image
          src="/rescom-bg.jpg"
          alt="10RCDG Personnel Formation"
          fill
          className="object-cover object-center opacity-25"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-50/95 via-slate-50/85 to-slate-50/90 backdrop-blur-[3px] tactical-grid-light" />
      </div>

      {/* Dynamic Ambient Light Gradients */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] rounded-full bg-emerald-100/50 blur-[100px] sm:blur-[130px] z-0" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] rounded-full bg-amber-100/40 blur-[100px] sm:blur-[130px] z-0" />

      {/* Top Header Bar */}
      <header className="w-full z-20 shrink-0 flex items-center justify-between px-4 sm:px-8 py-2.5 lg:py-3 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="flex items-center -space-x-2 shrink-0">
            <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden border border-amber-500/80 ring-2 ring-emerald-100 shadow-xs bg-white z-10 flex items-center justify-center">
              <Image src="/rescom-pa-seal.png" alt="PA Seal" fill sizes="32px" className="object-cover scale-105" priority />
            </div>
            <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden border border-amber-500/80 ring-2 ring-emerald-100 shadow-xs bg-white flex items-center justify-center">
              <Image src="/rescom-emblem.jpg" alt="10RCDG Emblem" fill sizes="32px" className="object-cover scale-105" priority />
            </div>
          </div>
          <div>
            <span className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
              10RCDG Official Portal
            </span>
            <span className="hidden md:inline-block text-[11px] text-slate-500 ml-2 font-mono">
              // Reserve Command, PA
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 text-xs text-slate-600">
          <span className="hidden xs:flex items-center gap-1.5 font-medium">
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden sm:inline">Protected & Secure</span>
          </span>
          <span className="hidden xs:inline text-slate-300">|</span>
          <span className="text-[11px] sm:text-xs text-amber-800 font-semibold bg-amber-50 px-2 sm:px-2.5 py-0.5 rounded-md border border-amber-200">
            Troop Registration
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 min-h-0 z-10 w-full max-w-xl mx-auto px-4 py-6 sm:py-10 flex flex-col justify-center">
        {/* If Campaign is Closed or Expired */}
        {isClosedOrExpired ? (
          <div className="relative corner-bracket-light bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-xl animate-in fade-in duration-200">
            <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto shadow-xs">
              <Clock className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                Registration Window Closed
              </h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                The official enlistment window for <strong>{campaign.title}</strong> has concluded. Submissions are no longer accepted online.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 text-left space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="font-semibold text-slate-500 uppercase text-[10px]">Assigned Group:</span>
                <span className="font-bold text-slate-900">{campaign.groupName}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="font-semibold text-slate-500 uppercase text-[10px]">Batch Code:</span>
                <span className="font-mono font-bold text-amber-800">{campaign.campaignCode}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 italic">
              Please report directly to your CDC Adjutant or 10RCDG S3 Operations for manual roster inclusion.
            </p>
          </div>
        ) : isSubmitted ? (
          /* Submission Success Receipt */
          <div className="relative corner-bracket-light bg-white border border-emerald-300 rounded-2xl p-6 sm:p-8 text-center space-y-5 shadow-xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-500 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-mono font-bold uppercase tracking-wider">
                Registration Logged
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight pt-1">
                Official Enlistment Submitted
              </h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Your contact details have been successfully submitted to 10RCDG Command.
              </p>
            </div>

            {/* Soldier Receipt Summary */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-2 text-xs font-mono">
              <div className="flex justify-between pb-1.5 border-b border-slate-200">
                <span className="text-slate-500">Personnel:</span>
                <span className="font-bold text-slate-900">{formData.rank} {formData.firstName} {formData.lastName}</span>
              </div>
              <div className="flex justify-between pb-1.5 border-b border-slate-200">
                <span className="text-slate-500">Mobile Number:</span>
                <span className="font-bold text-emerald-700">{formData.mobileNumber}</span>
              </div>
              <div className="flex justify-between pb-1.5 border-b border-slate-200">
                <span className="text-slate-500">Unit / Station:</span>
                <span className="font-bold text-slate-800">{formData.unit}</span>
              </div>
              <div className="flex justify-between pb-1.5 border-b border-slate-200">
                <span className="text-slate-500">Assigned Group:</span>
                <span className="font-bold text-slate-900">{campaign.groupName || formData.groupName}</span>
              </div>
              <div className="flex justify-between items-center pb-1.5 border-b border-slate-200">
                <span className="text-slate-500">Device Type:</span>
                <span className="font-bold text-emerald-800 flex items-center gap-1.5">
                  {formData.deviceType === "ANDROID" ? (
                    <>
                      <AndroidIcon className="w-3.5 h-3.5 text-[#3DDC84] shrink-0" />
                      <span>Android Smartphone</span>
                    </>
                  ) : (
                    <>
                      <KeypadPhoneIcon className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      <span>Basic Keypad Phone</span>
                    </>
                  )}
                </span>
              </div>
              {isHardwareBound && formData.deviceType === "ANDROID" && (
                <div className="flex justify-between items-center pt-1.5 border-t border-slate-200">
                  <span className="text-slate-500">Bound Device:</span>
                  <span className="font-bold text-emerald-800 flex items-center gap-1.5 text-[11px] font-mono">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{deviceInfo.model}</span>
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Campaign Batch:</span>
                <span className="text-amber-800 font-bold">{campaign.title}</span>
              </div>
            </div>

            {/* Bound Hardware Lock Guidance */}
            {isHardwareBound && formData.deviceType === "ANDROID" && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-left text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-slate-900">
                  <Lock className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Hardware Anti-Impersonation Lock Active</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Your phone number is bound to this physical phone (<strong>{deviceInfo.model}</strong>). Once approved by Command, only this phone can download the app at <strong>/download</strong>. If you ever change or replace your phone, ask your unit administrators to re-pair your personal data.
                </p>
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-left text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-emerald-950">
                <Shield className="w-4 h-4 text-emerald-700" />
                <span>What Happens Next:</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Once reviewed by the unit administrators, your mobile number will be activated to receive official 10RCDG SMS alerts and mobilization orders.
              </p>
            </div>

            {/* Companion App Activation Info (No direct download until approved) */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>RESCOM ALERT Mobile App Access</span>
                </div>
                <Link
                  href="/download"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 hover:text-emerald-700 transition-colors"
                >
                  <span>Visit Portal</span>
                  <ExternalLink className="w-3 h-3 text-emerald-700" />
                </Link>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                App access requires an approved roster record. Once the administrators review and approve your enlistment, your mobile number will be unlocked to download and pair the companion app at the{" "}
                <Link
                  href="/download"
                  className="font-bold text-emerald-800 underline underline-offset-2 hover:text-emerald-700"
                >
                  official download portal (/download)
                </Link>
                .
              </p>
            </div>
          </div>
        ) : !isUnlocked ? (
          /* Step 1: Tactical Passcode Shield (Gatekeeper) */
          <div className="relative corner-bracket-light bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xl space-y-5 animate-in fade-in duration-200">
            {/* Header Lockup */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 mb-1 shadow-xs">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-mono font-bold">
                  {campaign.groupName}
                </span>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-1.5">
                  {campaign.title}
                </h1>
                {campaign.instructions && (
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                    {campaign.instructions}
                  </p>
                )}
              </div>
            </div>

            {/* Live Ticking Countdown Box */}
            <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-300 text-center space-y-2">
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-amber-900 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                <span>Registration Window Closes In:</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 max-w-xs mx-auto font-mono">
                <div className="bg-white border border-amber-300 rounded-lg py-1 px-0.5 shadow-2xs">
                  <div className="text-base font-extrabold text-amber-950 leading-none">{String(timeLeft.days).padStart(2, "0")}</div>
                  <div className="text-[8px] font-bold text-amber-700 uppercase mt-0.5">Days</div>
                </div>
                <div className="bg-white border border-amber-300 rounded-lg py-1 px-0.5 shadow-2xs">
                  <div className="text-base font-extrabold text-amber-950 leading-none">{String(timeLeft.hours).padStart(2, "0")}</div>
                  <div className="text-[8px] font-bold text-amber-700 uppercase mt-0.5">Hours</div>
                </div>
                <div className="bg-white border border-amber-300 rounded-lg py-1 px-0.5 shadow-2xs">
                  <div className="text-base font-extrabold text-amber-950 leading-none">{String(timeLeft.minutes).padStart(2, "0")}</div>
                  <div className="text-[8px] font-bold text-amber-700 uppercase mt-0.5">Mins</div>
                </div>
                <div className="bg-white border border-amber-300 rounded-lg py-1 px-0.5 shadow-2xs">
                  <div className="text-base font-extrabold text-amber-950 leading-none">{String(timeLeft.seconds).padStart(2, "0")}</div>
                  <div className="text-[8px] font-bold text-amber-700 uppercase mt-0.5">Secs</div>
                </div>
              </div>
            </div>

            {/* Passcode Form */}
            <form onSubmit={handleUnlock} className="space-y-3.5">
              {isLockedOut && (
                <div className="p-3.5 bg-red-50 border border-red-300 rounded-xl text-xs text-red-800 flex items-center justify-between shadow-xs animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-red-600 shrink-0" />
                    <div>
                      <span className="font-bold block">Security Lockdown Active</span>
                      <span className="text-[11px] text-red-600">5 failed attempts. Please wait before retrying.</span>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-red-900 bg-red-100 px-2.5 py-1 rounded-lg border border-red-200 text-xs shrink-0">
                    {Math.floor(lockoutSecondsLeft / 60)}:
                    {String(lockoutSecondsLeft % 60).padStart(2, "0")}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Unit Security Passcode</span>
                  {!isLockedOut && failedAttempts > 0 && (
                    <span className="text-[10px] font-mono text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      {5 - failedAttempts} {5 - failedAttempts === 1 ? "attempt" : "attempts"} left
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    disabled={isLockedOut}
                    placeholder={
                      isLockedOut
                        ? `Locked for security (${Math.floor(lockoutSecondsLeft / 60)}:${String(lockoutSecondsLeft % 60).padStart(2, "0")})...`
                        : "Enter Passcode (e.g. 10RCDG-RESCOM)"
                    }
                    value={passcode}
                    onChange={(e) => {
                      setPasscode(e.target.value.toUpperCase());
                      if (passcodeError) setPasscodeError(null);
                    }}
                    className={`w-full pl-3.5 pr-10 py-3 rounded-xl font-mono text-sm font-bold tracking-wider shadow-2xs transition-all ${
                      isLockedOut
                        ? "bg-slate-100 border border-red-300 text-slate-400 cursor-not-allowed select-none opacity-80"
                        : "bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                    }`}
                  />
                  <Lock
                    className={`w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 ${
                      isLockedOut ? "text-red-500" : "text-slate-400"
                    }`}
                  />
                </div>
                {passcodeError && !isLockedOut && (
                  <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{passcodeError}</span>
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLockedOut || isValidatingPasscode}
                className={`w-full py-3 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 uppercase tracking-wider ${
                  isLockedOut
                    ? "bg-slate-400 cursor-not-allowed shadow-none"
                    : "bg-emerald-800 hover:bg-emerald-700 active:scale-[0.99] cursor-pointer"
                }`}
              >
                {isLockedOut ? (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>
                      Locked ({Math.floor(lockoutSecondsLeft / 60)}:
                      {String(lockoutSecondsLeft % 60).padStart(2, "0")})
                    </span>
                  </>
                ) : isValidatingPasscode ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Verifying Unit Key...</span>
                  </>
                ) : (
                  <>
                    <span>Unlock Enlistment Form</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1 text-emerald-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Official 10RCDG Portal
              </span>
              <span className="font-mono">Authorized Troops Only</span>
            </div>
          </div>
        ) : (
          /* Step 2: Military Registration Form */
          <div className="relative corner-bracket-light bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xl space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-mono text-emerald-700 font-bold uppercase">
                  {campaign.groupName}
                </span>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  {campaign.title}
                </h2>
              </div>
              <div className="text-right font-mono">
                <span className="text-[9px] text-slate-400 block uppercase">Time Remaining</span>
                <span className="text-xs font-bold text-amber-700">
                  {timeLeft.days > 0 ? `${timeLeft.days}d ` : ""}{String(timeLeft.hours).padStart(2, "0")}:{String(timeLeft.minutes).padStart(2, "0")}:{String(timeLeft.seconds).padStart(2, "0")}
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Military Rank */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Military Rank <span className="text-emerald-700">*</span>
                </label>
                <RankSearchSelect
                  value={formData.rank}
                  onChange={(val) => setFormData((prev) => ({ ...prev, rank: val }))}
                  required
                />
              </div>

              {/* Full Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    First Name <span className="text-emerald-700">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Juan"
                    value={formData.firstName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-600 shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Last Name <span className="text-emerald-700">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dela Cruz"
                    value={formData.lastName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-600 shadow-2xs"
                  />
                </div>
              </div>

              {/* Mobile Phone Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mobile Phone Number <span className="text-emerald-700">*</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    placeholder="0917 123 4567"
                    value={formData.mobileNumber}
                    onChange={handleMobileChange}
                    maxLength={16}
                    className={`w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border rounded-xl text-slate-900 font-mono text-xs font-bold focus:outline-none focus:bg-white focus:ring-2 shadow-2xs ${
                      phoneError
                        ? "border-red-500 focus:ring-red-500"
                        : "border-slate-200 focus:ring-emerald-600"
                    }`}
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                </div>
                {phoneError ? (
                  <p className="text-xs text-red-600 mt-1 font-medium">{phoneError}</p>
                ) : (
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">
                    e.g. 0917 123 4567 or +63 917 123 4567
                  </p>
                )}
              </div>

              {/* Assigned Group & Unit / Station */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Assigned Group <span className="text-emerald-700">*</span>
                  </label>
                  {isGroupLocked ? (
                    <div>
                      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-900 text-xs font-bold shadow-2xs">
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                          <span className="truncate">{campaign?.groupName || formData.groupName}</span>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-extrabold shrink-0 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" />
                          <span>LOCKED</span>
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Pre-assigned to this campaign group by Command.
                      </p>
                    </div>
                  ) : (
                    <select
                      value={formData.groupId}
                      onChange={(e) => {
                        const selectedVal = e.target.value;
                        const grp = groupsList.find((g) => g._id === selectedVal);
                        setFormData((prev) => ({
                          ...prev,
                          groupId: selectedVal,
                          groupName: grp ? grp.name : "All 10RCDG Personnel",
                        }));
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-600 shadow-2xs cursor-pointer"
                    >
                      <option value="">All 10RCDG Personnel (General Roster)</option>
                      {groupsList.map((g) => (
                        <option key={g._id} value={g._id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Unit / Station
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1001st CDC / 10RCDG HQ"
                    value={formData.unit}
                    onChange={(e) => setFormData((prev) => ({ ...prev, unit: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-600 shadow-2xs"
                  />
                </div>
              </div>

              {/* Primary Phone Capability */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Primary Phone Capability <span className="text-emerald-700">*</span></span>
                  <span className="text-[10px] text-slate-400 font-normal">Helps command route emergency siren alerts</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label
                    className={`p-3 rounded-xl border cursor-pointer flex items-center gap-3 transition-all ${
                      formData.deviceType === "ANDROID"
                        ? "bg-emerald-50/80 border-emerald-600 ring-1 ring-emerald-600 text-emerald-950 font-bold shadow-2xs"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="deviceType"
                      value="ANDROID"
                      checked={formData.deviceType === "ANDROID"}
                      onChange={() => setFormData((prev) => ({ ...prev, deviceType: "ANDROID" }))}
                      className="text-emerald-700 focus:ring-emerald-600"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <AndroidIcon className="w-4 h-4 text-[#3DDC84] shrink-0" />
                        <span>Android Smartphone</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-normal block mt-0.5">
                        Touchscreen • App Siren & Free Push
                      </span>
                    </div>
                  </label>

                  <label
                    className={`p-3 rounded-xl border cursor-pointer flex items-center gap-3 transition-all ${
                      formData.deviceType === "KEYPAD"
                        ? "bg-emerald-50/80 border-emerald-600 ring-1 ring-emerald-600 text-emerald-950 font-bold shadow-2xs"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="deviceType"
                      value="KEYPAD"
                      checked={formData.deviceType === "KEYPAD"}
                      onChange={() => setFormData((prev) => ({ ...prev, deviceType: "KEYPAD" }))}
                      className="text-emerald-700 focus:ring-emerald-600"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <KeypadPhoneIcon className="w-4 h-4 text-slate-600 shrink-0" />
                        <span>Basic Keypad Phone</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-normal block mt-0.5">
                        Nokia / Basic cellular SMS only
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Hardware Device Authorization & Anti-Impersonation Card */}
              {formData.deviceType === "ANDROID" && (
                <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 transition-all animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-emerald-700" />
                      <span>Hardware Anti-Impersonation Protection</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      MILITARY OPSEC
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-slate-500 shrink-0" />
                      <div>
                        <div className="font-bold text-slate-900">{deviceInfo.model}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {deviceInfo.os} • ID: {deviceId ? `${deviceId.slice(0, 12)}...` : "Detecting..."}
                        </div>
                      </div>
                    </div>
                    {isHardwareBound ? (
                      <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-300 flex items-center gap-1 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>BOUND</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md border border-slate-200 shrink-0">
                        UNBOUND
                      </span>
                    )}
                  </div>

                  {/* Dedicated Binding Button */}
                  {isHardwareBound ? (
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        onClick={() => setIsHardwareBound(false)}
                        className="w-full p-3 rounded-xl bg-emerald-50 border-2 border-emerald-600 hover:bg-emerald-100/70 text-emerald-950 font-bold text-xs flex items-center justify-between gap-2 shadow-xs transition-all text-left cursor-pointer group"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <span className="block font-black text-xs text-emerald-950 uppercase tracking-tight">
                              ✓ Bound to This Hardware Device ({deviceInfo.model})
                            </span>
                            <span className="block text-[11px] text-emerald-800 font-normal leading-relaxed">
                              Only your physical device can download and re-download the app. To change your hardware device ID later, you can ask the administrators to re-pair your personal data.
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-700 underline group-hover:text-emerald-900 shrink-0 pl-1">
                          Change
                        </span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsHardwareBound(true)}
                      className="w-full p-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-white font-bold text-xs flex items-center justify-between gap-2 shadow-md transition-all text-left cursor-pointer"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <Lock className="w-4 h-4 text-white shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <span className="block font-black text-xs text-white uppercase tracking-tight">
                            Click to bound your hardware device id so only your device can re-download it
                          </span>
                          <span className="block text-[11px] text-amber-100 font-normal leading-relaxed">
                            To change the hardware device ID you can ask the administrators to re-pairing your personal data.
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-amber-700 text-white px-2.5 py-1 rounded-lg shrink-0">
                        BIND NOW
                      </span>
                    </button>
                  )}

                  <p className="text-[10px] text-slate-500 leading-relaxed font-mono">
                    🛡️ Prevents unauthorized users from stealing or using your fresh phone number on other devices.
                  </p>
                </div>
              )}

              {submissionError && (
                submissionError.includes("/download") ||
                submissionError.toLowerCase().includes("already submitted") ||
                submissionError.toLowerCase().includes("already registered") ? (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 space-y-2.5 animate-in fade-in duration-200">
                    <div className="flex items-start gap-2.5">
                      <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                      <div className="space-y-1">
                        <div className="font-bold text-amber-950 text-xs">
                          {submissionError.toLowerCase().includes("already registered")
                            ? "Already Registered in 10RCDG Roster"
                            : "Enlistment Request Already Submitted"}
                        </div>
                        <p className="text-[11px] text-amber-900 leading-relaxed">
                          {submissionError.replace(/\s*\(\/download\)/g, "")}
                        </p>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-amber-200 flex items-center justify-between">
                      <span className="text-[11px] text-amber-800 font-medium">Ready to download?</span>
                      <Link
                        href="/download"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-white px-2.5 py-1 rounded-lg border border-amber-300 hover:bg-emerald-50 hover:border-emerald-300 shadow-2xs transition-all"
                      >
                        <span>Official Download Portal</span>
                        <ExternalLink className="w-3 h-3 text-emerald-700" />
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                    <span>{submissionError}</span>
                  </div>
                )
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-emerald-800 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider active:scale-[0.99]"
                >
                  <Shield className="w-4 h-4" />
                  <span>{isSubmitting ? "Logging Enlistment..." : "Submit Official Enlistment"}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full z-20 py-3 text-center text-[11px] text-slate-500 font-mono border-t border-slate-200/80 bg-white/80 backdrop-blur-md">
        10th Regional Community Defense Group (10RCDG) • Reserve Command, Philippine Army
      </footer>
    </div>
  );
}
