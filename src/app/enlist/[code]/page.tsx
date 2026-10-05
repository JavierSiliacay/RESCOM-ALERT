"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
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
} from "lucide-react";
import { RankSearchSelect } from "@/components/rank-search-select";
import { sanitizePhMobileInput, isValidPhMobileNumber, formatPhMobileDisplay } from "@/lib/sms";

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

  // Flow State
  const [passcode, setPasscode] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    rank: "PVT",
    firstName: "",
    lastName: "",
    mobileNumber: "09",
    groupId: "",
    groupName: "All 10RCDG Personnel",
    unit: "",
    serialNumber: "",
    email: "",
  });

  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Pre-fill group & unit when campaign loads
  useEffect(() => {
    if (campaign) {
      setFormData((prev) => ({
        ...prev,
        groupId: campaign.groupId || "",
        groupName: campaign.groupName || "All 10RCDG Personnel",
        unit: campaign.targetUnit === "All Units" ? "10RCDG HQ" : campaign.targetUnit,
      }));
    }
  }, [campaign]);

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

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasscodeError(null);
    if (!passcode.trim()) {
      setPasscodeError("Please enter the unit security passcode.");
      return;
    }
    setIsUnlocked(true);
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
        groupId: formData.groupId || undefined,
        groupName: formData.groupName || "All 10RCDG Personnel",
        email: formData.email.trim() || undefined,
        serialNumber: formData.serialNumber.trim() || undefined,
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
              <div className="flex justify-between">
                <span className="text-slate-500">Campaign Batch:</span>
                <span className="text-amber-800 font-bold">{campaign.title}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-left text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-emerald-950">
                <Shield className="w-4 h-4 text-emerald-700" />
                <span>What Happens Next:</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Once reviewed by S3 Operations, your mobile number will be activated to receive official 10RCDG SMS alerts and mobilization orders.
              </p>
            </div>

            {/* Offline Siren Companion App Banner */}
            <div className="p-4 rounded-xl bg-slate-50 border border-emerald-300 text-left space-y-3 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-100 border border-emerald-200 text-emerald-800 shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Install RESCOM-ALERT Mobile App</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      OFFLINE GSM
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Install the companion app on your phone so incoming Red Alerts will sound an emergency siren even on Silent mode.
                  </p>
                </div>
              </div>

              <a
                href={
                  process.env.NEXT_PUBLIC_SOLDIER_APK_URL ||
                  "https://github.com/JavierSiliacay/RESCOM-ALERT/releases/latest/download/rescom-alert.apk"
                }
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md active:scale-98 uppercase tracking-wider"
              >
                <Download className="w-4 h-4" />
                <span>Download Android APK</span>
              </a>
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
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Unit Security Passcode
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Enter Passcode (e.g. 10RCDG-RESCOM)"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value.toUpperCase())}
                    className="w-full pl-3.5 pr-10 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-sm font-bold tracking-wider placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 shadow-2xs"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                </div>
                {passcodeError && (
                  <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{passcodeError}</span>
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-800 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
              >
                <span>Unlock Enlistment Form</span>
                <ArrowRight className="w-4 h-4" />
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

              {/* Military ID & Email Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Military ID / AFPSN <span className="text-slate-400 text-[10px]">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 123456-PA"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData((prev) => ({ ...prev, serialNumber: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-mono font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-600 shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Email Address <span className="text-slate-400 text-[10px]">(Optional)</span>
                  </label>
                  <input
                    type="email"
                    placeholder="soldier@gmail.com"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-600 shadow-2xs"
                  />
                </div>
              </div>

              {submissionError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span>{submissionError}</span>
                </div>
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
