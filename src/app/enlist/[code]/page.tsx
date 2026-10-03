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
  ChevronRight,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
} from "lucide-react";
import { RankSearchSelect } from "@/components/rank-search-select";
import { sanitizePhMobileInput, isValidPhMobileNumber, formatPhMobileDisplay } from "@/lib/sms";
import { getRankFullName } from "@/lib/military-ranks";

export default function PublicEnlistmentPage() {
  const params = useParams();
  const campaignCode = (params?.code as string) || "";

  const campaign = useQuery(api.enlistment.getCampaignPublic, {
    campaignCode,
  });

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
    unit: "",
    serialNumber: "",
    email: "",
  });

  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Pre-fill unit when campaign loads
  useEffect(() => {
    if (campaign && !formData.unit) {
      setFormData((prev) => ({
        ...prev,
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
      setPasscodeError("Please enter the unit passcode provided by Command.");
      return;
    }
    // Optimistic check + verification will be enforced on submit mutation
    setIsUnlocked(true);
  };

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = sanitizePhMobileInput(raw);
    setFormData((prev) => ({ ...prev, mobileNumber: sanitized }));
    if (sanitized.length >= 4 && !isValidPhMobileNumber(sanitized)) {
      setPhoneError("Enter a valid 11-digit Philippine mobile number (09XXXXXXXXX).");
    } else {
      setPhoneError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionError(null);

    if (!isValidPhMobileNumber(formData.mobileNumber)) {
      setPhoneError("Please enter a valid 11-digit mobile number (e.g. 09171234567).");
      return;
    }

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setSubmissionError("Please complete your full name.");
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
        groupId: campaign?.groupId,
        groupName: campaign?.groupName || "Ready Reserve",
        email: formData.email.trim() || undefined,
        serialNumber: formData.serialNumber.trim() || undefined,
      });
      setIsSubmitted(true);
    } catch (err: any) {
      const msg = err?.message || "Failed to submit enlistment. Please verify your passcode.";
      if (msg.toLowerCase().includes("passcode")) {
        setIsUnlocked(false);
        setPasscodeError("Incorrect unit passcode. Please re-enter the authorized key.");
      } else {
        setSubmissionError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (campaign === undefined) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-950 text-slate-400 font-mono text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
          <span>Verifying 10RCDG Enlistment Gateway...</span>
        </div>
      </div>
    );
  }

  if (campaign === null) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-slate-900 p-4 text-center">
        <div className="w-16 h-16 rounded-full bg-red-950/80 border border-red-500 text-red-400 flex items-center justify-center mb-4 shadow-xl">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-lg font-extrabold text-white">Invalid Enlistment Link</h1>
        <p className="text-xs text-slate-400 max-w-sm mt-1">
          This enlistment link does not exist or has been decommissioned by 10RCDG Command.
        </p>
      </div>
    );
  }

  const isClosedOrExpired = campaign.isExpired || timeLeft.isExpired || campaign.status === "CLOSED";

  return (
    <div className="relative min-h-dvh w-full flex flex-col justify-between bg-[#0f172a] text-slate-100 overflow-y-auto selection:bg-amber-500 selection:text-slate-950">
      {/* Background Military Grid Pattern & Subtle Amber Glow */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
        <Image
          src="/rescom-bg.jpg"
          alt="10RCDG Formation"
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-[2px]" />
      </div>

      <div className="pointer-events-none absolute -top-40 -left-40 w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] rounded-full bg-emerald-600/15 blur-[120px] z-0" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] rounded-full bg-amber-600/15 blur-[120px] z-0" />

      {/* Top Header Bar */}
      <header className="w-full z-20 shrink-0 flex items-center justify-between px-4 sm:px-8 py-3 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center -space-x-2 shrink-0">
            <div className="relative w-8 h-8 rounded-full overflow-hidden border border-amber-500/80 ring-2 ring-emerald-500/30 bg-slate-900 z-10 flex items-center justify-center">
              <Image src="/rescom-pa-seal.png" alt="PA Seal" fill className="object-cover scale-105" priority />
            </div>
            <div className="relative w-8 h-8 rounded-full overflow-hidden border border-amber-500/80 ring-2 ring-emerald-500/30 bg-slate-900 flex items-center justify-center">
              <Image src="/rescom-emblem.jpg" alt="10RCDG Emblem" fill className="object-cover scale-105" priority />
            </div>
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
              <span>10RCDG Official Portal</span>
              <span className="hidden xs:inline-block px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[9px] font-mono font-bold uppercase">
                Enlistment
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Philippine Army Reserve Command
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700 text-[10px] font-mono text-slate-300">
            <Lock className="w-3 h-3 text-amber-400" />
            <span className="hidden sm:inline">Official Form</span>
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 z-10 w-full max-w-xl mx-auto px-4 py-6 sm:py-10 flex flex-col justify-center">
        {/* If Campaign is Closed or Expired */}
        {isClosedOrExpired ? (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-2xl backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-14 h-14 rounded-full bg-amber-950/80 border border-amber-600/80 text-amber-400 flex items-center justify-center mx-auto shadow-lg">
              <Clock className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg sm:text-xl font-extrabold text-white">
                Registration Window Closed
              </h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                The official enlistment window for <strong>{campaign.title}</strong> has concluded. Submissions are no longer accepted online.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 text-xs text-slate-300 text-left space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Target Unit:</span>
                <span className="font-bold text-white">{campaign.targetUnit}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Campaign Code:</span>
                <span className="font-mono text-amber-400">{campaign.campaignCode}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 italic">
              Please report directly to your CDC Adjutant or 10RCDG S3 Operations for manual roster inclusion.
            </p>
          </div>
        ) : isSubmitted ? (
          /* Submission Success Receipt */
          <div className="bg-slate-900/90 border border-emerald-500/40 rounded-2xl p-6 sm:p-8 text-center space-y-5 shadow-2xl backdrop-blur-md animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-950/80 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto shadow-xl">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold uppercase tracking-wider">
                Registration Logged
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight pt-1">
                Official Enlistment Submitted
              </h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Your personnel details have been recorded into the 10RCDG Command Directory.
              </p>
            </div>

            {/* Soldier Receipt Summary */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-left space-y-2 text-xs font-mono">
              <div className="flex justify-between pb-1.5 border-b border-slate-800">
                <span className="text-slate-500">Personnel:</span>
                <span className="font-bold text-white">{formData.rank} {formData.firstName} {formData.lastName}</span>
              </div>
              <div className="flex justify-between pb-1.5 border-b border-slate-800">
                <span className="text-slate-500">Mobile Number:</span>
                <span className="font-bold text-emerald-400">{formData.mobileNumber}</span>
              </div>
              <div className="flex justify-between pb-1.5 border-b border-slate-800">
                <span className="text-slate-500">Assigned Unit:</span>
                <span className="font-bold text-slate-200">{formData.unit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Campaign Batch:</span>
                <span className="text-amber-400">{campaign.title}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-left text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Next Steps & SMS Alerts:</span>
              </div>
              <p className="text-[11px] text-emerald-300/80 leading-relaxed">
                You will receive urgent mobilization notices and official directives via SMS alerts from 10RCDG.
              </p>
            </div>
          </div>
        ) : !isUnlocked ? (
          /* Step 1: Tactical Passcode Shield (Gatekeeper) */
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-5 animate-in fade-in duration-200">
            {/* Header Lockup */}
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-mono font-bold">
                  {campaign.targetUnit}
                </span>
                <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight mt-1.5">
                  {campaign.title}
                </h1>
                {campaign.instructions && (
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
                    {campaign.instructions}
                  </p>
                )}
              </div>
            </div>

            {/* Live Ticking Countdown Box */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-center space-y-1.5">
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>Registration Window Closes In:</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 max-w-xs mx-auto font-mono">
                <div className="bg-slate-900 border border-slate-800 rounded-lg py-1 px-0.5">
                  <div className="text-base font-extrabold text-white">{String(timeLeft.days).padStart(2, "0")}</div>
                  <div className="text-[8px] text-slate-500 uppercase">Days</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-lg py-1 px-0.5">
                  <div className="text-base font-extrabold text-white">{String(timeLeft.hours).padStart(2, "0")}</div>
                  <div className="text-[8px] text-slate-500 uppercase">Hours</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-lg py-1 px-0.5">
                  <div className="text-base font-extrabold text-white">{String(timeLeft.minutes).padStart(2, "0")}</div>
                  <div className="text-[8px] text-slate-500 uppercase">Mins</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-lg py-1 px-0.5">
                  <div className="text-base font-extrabold text-white">{String(timeLeft.seconds).padStart(2, "0")}</div>
                  <div className="text-[8px] text-slate-500 uppercase">Secs</div>
                </div>
              </div>
            </div>

            {/* Passcode Form */}
            <form onSubmit={handleUnlock} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Unit Security Passcode
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Enter Passcode (e.g. 10RCDG-RESCOM)"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value.toUpperCase())}
                    className="w-full pl-3.5 pr-10 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm font-bold tracking-wider placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                </div>
                {passcodeError && (
                  <p className="text-[11px] text-red-400 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{passcodeError}</span>
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 active:scale-[0.99] text-slate-950 font-extrabold text-xs sm:text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Unlock Enlistment Form</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <p className="text-[10px] text-slate-500 text-center font-mono">
              // Authorized 10RCDG Philippine Army Personnel Only
            </p>
          </div>
        ) : (
          /* Step 2: Military Registration Form */
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-2xl backdrop-blur-md space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">
                  {campaign.targetUnit}
                </span>
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {campaign.title}
                </h2>
              </div>
              <div className="text-right font-mono">
                <span className="text-[9px] text-slate-500 block uppercase">Time Remaining</span>
                <span className="text-xs font-bold text-amber-400">
                  {timeLeft.days > 0 ? `${timeLeft.days}d ` : ""}{String(timeLeft.hours).padStart(2, "0")}:{String(timeLeft.minutes).padStart(2, "0")}:{String(timeLeft.seconds).padStart(2, "0")}
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Military Rank */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Military Rank <span className="text-amber-400">*</span>
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
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    First Name <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Juan"
                    value={formData.firstName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Last Name <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dela Cruz"
                    value={formData.lastName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Mobile Phone Number */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Mobile Phone Number <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    placeholder="09171234567"
                    value={formData.mobileNumber}
                    onChange={handleMobileChange}
                    maxLength={11}
                    className={`w-full pl-3.5 pr-10 py-2.5 bg-slate-950 border rounded-xl text-white font-mono text-xs font-bold focus:outline-none focus:ring-2 ${
                      phoneError
                        ? "border-red-500 focus:ring-red-500"
                        : "border-slate-700 focus:ring-amber-500"
                    }`}
                  />
                  <Phone className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                </div>
                {phoneError ? (
                  <p className="text-[11px] text-red-400 mt-1">{phoneError}</p>
                ) : (
                  <p className="text-[10px] text-slate-500 mt-1 font-mono">
                    Formatted: {formatPhMobileDisplay(formData.mobileNumber)}
                  </p>
                )}
              </div>

              {/* Assigned Unit / CDC */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Assigned Unit / CDC <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1001st CDC"
                    value={formData.unit}
                    onChange={(e) => setFormData((prev) => ({ ...prev, unit: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Military ID / AFPSN <span className="text-slate-500 text-[10px]">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 123456-PA"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData((prev) => ({ ...prev, serialNumber: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Optional Email */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Email Address <span className="text-slate-500 text-[10px]">(Optional)</span>
                </label>
                <input
                  type="email"
                  placeholder="soldier@gmail.com"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {submissionError && (
                <div className="p-3 rounded-xl bg-red-950/80 border border-red-500 text-xs text-red-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                  <span>{submissionError}</span>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !!phoneError}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-slate-950 font-extrabold text-xs sm:text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
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
      <footer className="w-full z-20 py-3 text-center text-[11px] text-slate-500 font-mono border-t border-slate-900 bg-slate-950/80 backdrop-blur-md">
        10th Regional Community Defense Group (10RCDG) • Reserve Command, Philippine Army
      </footer>
    </div>
  );
}
