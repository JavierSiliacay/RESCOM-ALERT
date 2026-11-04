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
  ArrowLeft,
  Check,
  UserCheck,
  Smartphone,
  Download,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  GraduationCap,
  Briefcase,
  MapPin,
  Award,
  Wrench,
  Calendar,
  Loader2,
  Navigation,
  X,
  Mail,
} from "lucide-react";
import { RankSearchSelect } from "@/components/rank-search-select";
import { sanitizePhMobileInput, isValidPhMobileNumber, formatPhMobileDisplay } from "@/lib/sms";
import { COMMON_10RCDG_LOCATIONS, requestDeviceLocation } from "@/lib/geo";
import { AndroidIcon, KeypadPhoneIcon, AppleIcon } from "@/components/device-icons";

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

const TRAINING_CATEGORIES = [
  { id: "BASIC ROTC", label: "Basic ROTC", desc: "MS 1 & 2 Graduate" },
  { id: "ADVANCE ROTC", label: "Advance ROTC", desc: "Officer Candidate" },
  { id: "BCMT", label: "BCMT", desc: "Basic Citizen Military Training" },
  { id: "POTC GRADUATE", label: "POTC Graduate", desc: "Probationary Officer Course" },
  { id: "COMMISSION UNDER RA2334", label: "RA 2334 Commission", desc: "Direct Commission" },
];

const QUICK_SKILLS = [
  "Combat Medic / First Aid",
  "Radio / Comms",
  "Driver (Prof DL)",
  "Heavy Equipment",
  "IT / Cybersecurity",
  "Civil Works / Engineering",
  "Disaster Rescue (DRRO)",
  "Security / Law Enforcement",
];

export default function PublicEnlistmentPage() {
  const params = useParams();
  const campaignCode = (params?.code as string) || "";

  const campaign = useQuery(api.enlistment.getCampaignPublic, {
    campaignCode,
  });
  const groups = useQuery(api.groups.listOptions);
  const groupsList = groups || [];

  const submitEnlistment = useMutation(api.enlistment.submitEnlistment);
  const validatePasscode = useMutation(api.enlistment.validatePasscode);
  const checkStep1Duplicate = useMutation(api.enlistment.checkStep1Duplicate);
  const updateSoldierToIos = useMutation(api.enlistment.updateSoldierToIos);

  // Flow State
  const [passcode, setPasscode] = useState("");
  const [isValidatingPasscode, setIsValidatingPasscode] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [isCheckingStep1, setIsCheckingStep1] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [enlistStep, setEnlistStep] = useState<1 | 2 | 3>(1);

  // iOS Self-Service Update State
  const [iosMobileNumber, setIosMobileNumber] = useState("09");
  const [iosEmail, setIosEmail] = useState("");
  const [isUpdatingIos, setIsUpdatingIos] = useState(false);
  const [iosUpdateError, setIosUpdateError] = useState<string | null>(null);
  const [iosSuccessReceipt, setIosSuccessReceipt] = useState<{
    soldierName: string;
    unit: string;
    email: string;
    mobileNumber: string;
  } | null>(null);

  // Live Query to verify soldier when mobile number is valid 11 digits
  const verifiedSoldier = useQuery(
    api.enlistment.verifySoldierForIosUpdate,
    campaign?.campaignType === "IOS_UPDATE" && isValidPhMobileNumber(iosMobileNumber)
      ? { campaignCode, mobileNumber: iosMobileNumber }
      : "skip"
  );

  // Auto-fill existing email if soldier already has one
  useEffect(() => {
    if (verifiedSoldier && verifiedSoldier.found && verifiedSoldier.currentEmail && !iosEmail) {
      setIosEmail(verifiedSoldier.currentEmail);
    }
  }, [verifiedSoldier]);

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
    age: "" as string | number,
    currentAddress: "",
    trainingCategory: "BASIC ROTC",
    school: "",
    yearGraduated: "",
    currentJob: "",
    skills: "",
    email: "",
    deviceType: "ANDROID" as "ANDROID" | "KEYPAD" | "IOS",
    groupId: "",
    groupName: "All 10RCDG Personnel",
    unit: "",
    company: "HHC",
  });

  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationNotice, setLocationNotice] = useState<{ message: string; type: "success" | "error" } | null>(null);

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
        unit: (campaign.targetUnit && campaign.targetUnit !== "All Units") ? campaign.targetUnit : (prev.unit || "10RCDG HQ"),
        company: (campaign as any).targetCompany || prev.company || "HHC",
      }));
    }
  }, [campaign]);

  const isGroupLocked = Boolean(
    (campaign?.groupName && campaign.groupName !== "All 10RCDG Personnel") || campaign?.groupId
  );
  const isUnitLocked = Boolean(
    campaign?.targetUnit && campaign.targetUnit.trim().length > 0 && campaign.targetUnit !== "All Units"
  );
  const isCompanyLocked = Boolean(
    (campaign as any)?.targetCompany &&
    (campaign as any).targetCompany.trim().length > 0 &&
    (campaign as any).targetCompany !== "ALL"
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
        setPasscode(""); // Erase input on incorrect attempt for cleaner UX
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

  const handleDetectLocation = async () => {
    setIsDetectingLocation(true);
    setLocationNotice(null);
    try {
      const { address } = await requestDeviceLocation();
      setFormData((prev) => ({ ...prev, currentAddress: address }));
      setLocationNotice({ message: `GPS lock acquired: ${address}`, type: "success" });
    } catch (err: any) {
      setLocationNotice({ message: err?.message || "Could not detect location.", type: "error" });
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = sanitizePhMobileInput(raw);
    setFormData((prev) => ({ ...prev, mobileNumber: sanitized }));
    if (phoneError) {
      setPhoneError(null);
    }
    if (submissionError) {
      setSubmissionError(null);
    }
  };

  const handleIosMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = sanitizePhMobileInput(raw);
    setIosMobileNumber(sanitized);
    if (iosUpdateError) {
      setIosUpdateError(null);
    }
  };

  const handleIosUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIosUpdateError(null);

    if (!isValidPhMobileNumber(iosMobileNumber)) {
      setIosUpdateError("Please enter a valid 11-digit Philippine mobile number (09XXXXXXXXX).");
      return;
    }

    if (!verifiedSoldier || !verifiedSoldier.found) {
      setIosUpdateError("Mobile number is not recognized in the 10RCDG personnel roster.");
      return;
    }

    const cleanEmail = iosEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setIosUpdateError("Please enter a valid email address (e.g. soldier@gmail.com).");
      return;
    }

    setIsUpdatingIos(true);
    try {
      const res = await updateSoldierToIos({
        campaignCode,
        mobileNumber: iosMobileNumber,
        email: cleanEmail,
      });

      setIosSuccessReceipt(res);
    } catch (err: any) {
      setIosUpdateError(extractCleanErrorMessage(err));
    } finally {
      setIsUpdatingIos(false);
    }
  };

  const validateStep1 = () => {
    setSubmissionError(null);
    const f = formData.firstName.trim();
    const l = formData.lastName.trim();

    if (!f || !l) {
      setSubmissionError("Please enter both your first and last name before proceeding.");
      return false;
    }
    if (f.length < 2 || l.length < 2) {
      setSubmissionError("First name and last name must each be at least 2 characters.");
      return false;
    }
    const dummyRegex = /^(asdf|qwert|zxcv|1234|test|none|n\/a|na|xxx|aaa|bbb|ccc)/i;
    const repeatPattern = /^(.{2,4})\1+$/i;
    if (dummyRegex.test(f) || dummyRegex.test(l) || repeatPattern.test(f.toLowerCase()) || repeatPattern.test(l.toLowerCase())) {
      setSubmissionError("Please enter your genuine legal soldier name. Dummy or placeholder inputs are not allowed.");
      return false;
    }
    if (!isValidPhMobileNumber(formData.mobileNumber)) {
      setPhoneError("Please enter a valid 11-digit mobile number (e.g. 0917 123 4567).");
      return false;
    }
    if (formData.age) {
      const ageNum = Number(formData.age);
      if (isNaN(ageNum) || !Number.isInteger(ageNum) || ageNum < 16 || ageNum > 85) {
        setSubmissionError("Please enter a valid age between 16 and 85 years.");
        return false;
      }
    }
    if (formData.currentAddress && formData.currentAddress.trim().length > 250) {
      setSubmissionError("Current address must not exceed 250 characters.");
      return false;
    }
    setPhoneError(null);
    return true;
  };

  const handleProceedToStep2 = async () => {
    if (!validateStep1()) {
      return;
    }

    setIsCheckingStep1(true);
    setSubmissionError(null);

    try {
      const res = await checkStep1Duplicate({
        mobileNumber: formData.mobileNumber,
        firstName: formData.firstName,
        lastName: formData.lastName,
        campaignCode,
      });

      if (res.isDuplicate) {
        setSubmissionError(res.message);
        return;
      }

      setEnlistStep(2);
    } catch (err: any) {
      setSubmissionError(extractCleanErrorMessage(err));
    } finally {
      setIsCheckingStep1(false);
    }
  };

  const handleProceedToStep3 = () => {
    setSubmissionError(null);
    if (formData.yearGraduated) {
      const cleanYear = formData.yearGraduated.trim();
      const currentYear = new Date().getFullYear();
      const yearNum = Number(cleanYear);
      if (!/^\d{4}$/.test(cleanYear) || isNaN(yearNum) || yearNum < 1950 || yearNum > currentYear + 1) {
        setSubmissionError(`Please enter a valid 4-digit graduation year between 1950 and ${currentYear + 1} (e.g. 2018).`);
        return;
      }
    }
    if (formData.school && formData.school.trim().length > 150) {
      setSubmissionError("School name must not exceed 150 characters.");
      return;
    }
    setEnlistStep(3);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionError(null);

    if (!validateStep1()) {
      setEnlistStep(1);
      return;
    }

    if (formData.yearGraduated) {
      const cleanYear = formData.yearGraduated.trim();
      const currentYear = new Date().getFullYear();
      const yearNum = Number(cleanYear);
      if (!/^\d{4}$/.test(cleanYear) || isNaN(yearNum) || yearNum < 1950 || yearNum > currentYear + 1) {
        setEnlistStep(2);
        setSubmissionError(`Please enter a valid 4-digit graduation year between 1950 and ${currentYear + 1} (e.g. 2018).`);
        return;
      }
    }

    if (formData.skills && formData.skills.trim().length > 300) {
      setEnlistStep(3);
      setSubmissionError("Special skills field must not exceed 300 characters.");
      return;
    }

    if (formData.currentJob && formData.currentJob.trim().length > 150) {
      setEnlistStep(3);
      setSubmissionError("Current job occupation must not exceed 150 characters.");
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
        email: formData.email.trim() || undefined,
        unit: isUnitLocked ? campaign!.targetUnit : (formData.unit.trim() || campaign?.targetUnit || "10RCDG HQ"),
        company: isCompanyLocked ? (campaign as any)!.targetCompany : (formData.company?.trim() || undefined),
        groupId: isGroupLocked ? (campaign?.groupId || undefined) : (formData.groupId || undefined),
        groupName: isGroupLocked ? (campaign?.groupName || "All 10RCDG Personnel") : (formData.groupName || "All 10RCDG Personnel"),
        school: formData.school.trim() || undefined,
        yearGraduated: formData.yearGraduated.trim() || undefined,
        trainingCategory: formData.trainingCategory || undefined,
        skills: formData.skills.trim() || undefined,
        currentAddress: formData.currentAddress.trim() || undefined,
        age: formData.age !== "" && !isNaN(Number(formData.age)) ? Number(formData.age) : undefined,
        currentJob: formData.currentJob.trim() || undefined,
        deviceType: formData.deviceType,
        deviceId: undefined,
        deviceModel: undefined,
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
            {campaign.campaignType === "IOS_UPDATE" ? "🍎 iOS Update" : "Troop Registration"}
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
                {campaign.campaignType === "IOS_UPDATE"
                  ? `The official Apple iOS update window for ${campaign.title} has concluded. Submissions are no longer accepted online.`
                  : `The official enlistment window for ${campaign.title} has concluded. Submissions are no longer accepted online.`}
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
              Please report directly to your CDC Unit Administrator for manual roster inclusion.
            </p>
          </div>
        ) : iosSuccessReceipt ? (
          /* Apple iOS Alert Activation Success Receipt */
          <div className="relative corner-bracket-light bg-white border border-blue-300 rounded-2xl p-6 sm:p-8 text-center space-y-5 shadow-xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-blue-50 border-2 border-blue-500 text-blue-700 flex items-center justify-center mx-auto shadow-sm">
              <AppleIcon className="w-8 h-8 text-blue-800" />
            </div>

            <div className="space-y-1">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 text-[10px] font-mono font-bold uppercase tracking-wider">
                Apple iOS Alert Layer Activated
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight pt-1">
                iOS Profile Registered
              </h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Your soldier profile has been updated in the 10RCDG Emergency Broadcast Directory.
              </p>
            </div>

            {/* Soldier Receipt Summary */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-2 text-xs font-mono">
              <div className="flex justify-between pb-1.5 border-b border-slate-200">
                <span className="text-slate-500">Personnel:</span>
                <span className="font-bold text-slate-900">{iosSuccessReceipt.soldierName}</span>
              </div>
              <div className="flex justify-between pb-1.5 border-b border-slate-200">
                <span className="text-slate-500">Mobile Number:</span>
                <span className="font-bold text-emerald-700">{formatPhMobileDisplay(iosSuccessReceipt.mobileNumber)}</span>
              </div>
              <div className="flex justify-between pb-1.5 border-b border-slate-200">
                <span className="text-slate-500">Alert Email:</span>
                <span className="font-bold text-blue-700">{iosSuccessReceipt.email}</span>
              </div>
              <div className="flex justify-between pb-1.5 border-b border-slate-200">
                <span className="text-slate-500">Assigned Unit:</span>
                <span className="font-bold text-slate-800">{iosSuccessReceipt.unit}</span>
              </div>
              <div className="flex justify-between items-center pb-1.5 border-b border-slate-200">
                <span className="text-slate-500">Device Type:</span>
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <AppleIcon className="w-3.5 h-3.5 text-slate-800 shrink-0" />
                  <span>Apple iPhone (iOS Broadcast Layer)</span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Active in Emergency Broadcast</span>
                </span>
              </div>
            </div>

            {/* Dispatch Guidance */}
            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-left text-xs space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-blue-950">
                <Mail className="w-4 h-4 text-blue-700 shrink-0" />
                <span>Emergency Email Broadcasts Enabled</span>
              </div>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                High-priority mobilization orders, DRRO disaster alerts, and official 10RCDG bulletins will now be sent directly to <strong>{iosSuccessReceipt.email}</strong> via Resend.
              </p>
              <p className="text-[10.5px] text-blue-700 italic">
                💡 Tip: Ensure notifications for your Mail app are turned ON on your iPhone so you never miss an urgent muster dispatch.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1 text-emerald-700 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                10RCDG Command Verified
              </span>
              <span className="font-mono">Self-Service Portal</span>
            </div>
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
              {formData.age ? (
                <div className="flex justify-between pb-1.5 border-b border-slate-200">
                  <span className="text-slate-500">Age:</span>
                  <span className="font-bold text-slate-800">{formData.age} years old</span>
                </div>
              ) : null}
              <div className="flex justify-between pb-1.5 border-b border-slate-200">
                <span className="text-slate-500">Mobile Number:</span>
                <span className="font-bold text-emerald-700">{formData.mobileNumber}</span>
              </div>
              {formData.currentAddress ? (
                <div className="flex justify-between pb-1.5 border-b border-slate-200">
                  <span className="text-slate-500">Address:</span>
                  <span className="font-bold text-slate-800 truncate max-w-[240px] text-right">{formData.currentAddress}</span>
                </div>
              ) : null}
              {formData.trainingCategory ? (
                <div className="flex justify-between pb-1.5 border-b border-slate-200">
                  <span className="text-slate-500">Training Background:</span>
                  <span className="font-bold text-emerald-800">{formData.trainingCategory}</span>
                </div>
              ) : null}
              {formData.school ? (
                <div className="flex justify-between pb-1.5 border-b border-slate-200">
                  <span className="text-slate-500">School / ROTC Unit:</span>
                  <span className="font-bold text-slate-800 truncate max-w-[240px] text-right">
                    {formData.school} {formData.yearGraduated ? `(${formData.yearGraduated})` : ""}
                  </span>
                </div>
              ) : null}
              {formData.currentJob ? (
                <div className="flex justify-between pb-1.5 border-b border-slate-200">
                  <span className="text-slate-500">Current Job:</span>
                  <span className="font-bold text-slate-800 truncate max-w-[240px] text-right">{formData.currentJob}</span>
                </div>
              ) : null}
              {formData.skills ? (
                <div className="flex justify-between pb-1.5 border-b border-slate-200">
                  <span className="text-slate-500">Special Skills:</span>
                  <span className="font-bold text-slate-800 truncate max-w-[240px] text-right">{formData.skills}</span>
                </div>
              ) : null}
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
                  ) : formData.deviceType === "IOS" ? (
                    <>
                      <AppleIcon className="w-3.5 h-3.5 text-slate-800 shrink-0" />
                      <span>Apple iPhone (iOS)</span>
                    </>
                  ) : (
                    <>
                      <KeypadPhoneIcon className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      <span>Basic Keypad Phone</span>
                    </>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Campaign Batch:</span>
                <span className="text-amber-800 font-bold">{campaign.title}</span>
              </div>
            </div>

            {formData.deviceType === "ANDROID" && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-left text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-slate-900">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Companion App Activation</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Once your enlistment is approved by your Unit Officer, download the official <strong>RESCOM Alert</strong> app at <strong>/download</strong> and pair your phone to receive live push sirens and emergency mobilizations.
                </p>
              </div>
            )}

            {formData.deviceType === "IOS" && (
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-left text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-blue-950">
                  <AppleIcon className="w-3.5 h-3.5 text-blue-800" />
                  <span>Apple iOS Alert Layer Enabled</span>
                </div>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  Your iPhone is registered for emergency dispatches. Once approved, mobilization alerts will be transmitted directly to your registered email {formData.email ? <strong>({formData.email})</strong> : ""} via <strong>Resend</strong>.
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
                <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  OFFICIAL APK
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                App access requires an approved roster record. Once the administrators review and approve your enlistment, your mobile number will be unlocked to download the companion app.
              </p>
              <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <span className="text-[11px] text-slate-500">
                  Note: Ask the download passcode from your administrators to unlock the file.
                </span>
                <Link
                  href="/download"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-2xs transition-all shrink-0"
                >
                  <Download className="w-3.5 h-3.5 text-white" />
                  <span>Go to Download Page</span>
                  <ExternalLink className="w-3 h-3 text-emerald-200" />
                </Link>
              </div>
            </div>
          </div>
        ) : !isUnlocked ? (
          /* Step 1: Tactical Passcode Shield (Gatekeeper) */
          <div className="relative corner-bracket-light bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xl space-y-5 animate-in fade-in duration-200">
            {/* Header Lockup */}
            <div className="text-center space-y-2">
              <div
                className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-1 shadow-xs border ${
                  campaign.campaignType === "IOS_UPDATE"
                    ? "bg-blue-50 border-blue-200 text-blue-700"
                    : "bg-emerald-50 border-emerald-200 text-emerald-700"
                }`}
              >
                {campaign.campaignType === "IOS_UPDATE" ? (
                  <AppleIcon className="w-6 h-6 text-slate-800" />
                ) : (
                  <KeyRound className="w-6 h-6" />
                )}
              </div>
              <div>
                <span
                  className={`px-2.5 py-0.5 rounded-full border text-[10px] font-mono font-bold ${
                    campaign.campaignType === "IOS_UPDATE"
                      ? "bg-blue-50 text-blue-800 border-blue-200"
                      : "bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  {campaign.campaignType === "IOS_UPDATE" ? "Apple iOS Alert Gateway" : campaign.groupName}
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
                  <span>Unit Security Passcode <span className="text-red-500 font-bold ml-0.5">*</span></span>
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
                        : "Enter Passcode (e.g. 123456)"
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
                    : campaign.campaignType === "IOS_UPDATE"
                    ? "bg-blue-700 hover:bg-blue-800 active:scale-[0.99] cursor-pointer"
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
                    <span>
                      {campaign.campaignType === "IOS_UPDATE"
                        ? "Unlock iOS Update Portal"
                        : "Unlock Enlistment Form"}
                    </span>
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
        ) : campaign?.campaignType === "IOS_UPDATE" ? (
          /* Step 2 (Dedicated): Apple iOS Alert Activation Form */
          <div className="relative corner-bracket-light bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xl space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shadow-2xs">
                  <AppleIcon className="w-5 h-5 text-slate-800" />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-blue-700 font-bold uppercase tracking-wider">
                    Apple iOS Alert Gateway
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                    {campaign.title}
                  </h2>
                </div>
              </div>
              <div className="text-right font-mono">
                <span className="text-[9px] text-slate-400 block uppercase">Time Remaining</span>
                <span className="text-xs font-bold text-amber-700">
                  {timeLeft.days > 0 ? `${timeLeft.days}d ` : ""}{String(timeLeft.hours).padStart(2, "0")}:{String(timeLeft.minutes).padStart(2, "0")}:{String(timeLeft.seconds).padStart(2, "0")}
                </span>
              </div>
            </div>

            {campaign.instructions && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
                {campaign.instructions}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleIosUpdateSubmit} className="space-y-4">
              {/* Mobile Number Verification */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Registered Mobile Number <span className="text-red-500 font-bold">*</span></span>
                  <span className="text-[10px] font-mono text-slate-400 font-normal">PH (+63) format</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    placeholder="0917 123 4567"
                    value={formatPhMobileDisplay(iosMobileNumber)}
                    onChange={handleIosMobileChange}
                    maxLength={13}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono font-bold text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs"
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>

                {/* Real-time Soldier Identification Status Card */}
                {iosMobileNumber.replace(/\D/g, "").length < 11 ? (
                  <p className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                    <span>ℹ Enter your 11-digit registered mobile number to verify your record.</span>
                  </p>
                ) : verifiedSoldier === undefined ? (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin shrink-0" />
                    <span>Searching 10RCDG personnel records...</span>
                  </div>
                ) : verifiedSoldier.found ? (
                  <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-300 text-emerald-950 space-y-1 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Verified 10RCDG Soldier
                      </span>
                      <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-300">
                        Found in Roster
                      </span>
                    </div>
                    <div className="text-sm font-extrabold text-slate-900">
                      {verifiedSoldier.name}
                    </div>
                    <div className="text-xs text-slate-600 flex items-center gap-2 pt-0.5">
                      <span>{verifiedSoldier.rank || "Troop"}</span>
                      <span>•</span>
                      <span>{verifiedSoldier.unit || "10RCDG"}</span>
                      <span>({verifiedSoldier.company || "HHC"})</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 space-y-1 animate-in fade-in duration-150">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-amber-950">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Mobile Number Not Recognized</span>
                    </div>
                    <p className="text-[11px] text-amber-900 leading-relaxed">
                      We could not find <strong>{iosMobileNumber}</strong> in the 10RCDG active personnel directory. Please verify that this is the exact mobile number you registered with, or contact your CDC unit administrator.
                    </p>
                  </div>
                )}
              </div>

              {/* Email Address Field */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span>
                    Emergency Alert Email <span className="text-red-500 font-bold">*</span>
                  </span>
                  <span className="text-[10px] text-blue-600 font-bold flex items-center gap-1">
                    <AppleIcon className="w-3 h-3" /> Required for iOS
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="soldier@gmail.com"
                    value={iosEmail}
                    onChange={(e) => {
                      setIosEmail(e.target.value);
                      if (iosUpdateError) setIosUpdateError(null);
                    }}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all font-mono"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>

                {/* Quick Email Domain Chips */}
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-mono mr-1">Quick:</span>
                  {["@gmail.com", "@icloud.com", "@yahoo.com", "@outlook.com"].map((dom) => (
                    <button
                      key={dom}
                      type="button"
                      onClick={() => {
                        const prefix = iosEmail.includes("@") ? iosEmail.split("@")[0] : iosEmail;
                        if (prefix) {
                          setIosEmail(`${prefix}${dom}`);
                        } else {
                          setIosEmail(dom);
                        }
                      }}
                      className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 transition-colors text-slate-600 cursor-pointer"
                    >
                      +{dom}
                    </button>
                  ))}
                </div>

                {/* Why Email Box */}
                <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-blue-950 text-[11px]">
                    <AppleIcon className="w-3.5 h-3.5 text-blue-800" />
                    <span>Why is Email Required for iPhone Users?</span>
                  </div>
                  <p className="text-[10.5px] text-blue-800 leading-relaxed">
                    Because Apple iOS does not allow downloading Android APK files, 10RCDG Command dispatches mobilization orders and emergency bulletins directly to this email address via Resend.
                  </p>
                </div>
              </div>

              {/* Error Message */}
              {iosUpdateError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2 animate-in fade-in duration-150">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span>{iosUpdateError}</span>
                </div>
              )}

              {/* Submit Action Button */}
              <button
                type="submit"
                disabled={
                  isUpdatingIos ||
                  !isValidPhMobileNumber(iosMobileNumber) ||
                  !verifiedSoldier ||
                  !verifiedSoldier.found ||
                  !iosEmail.trim()
                }
                className="w-full py-3 bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider active:scale-[0.99]"
              >
                {isUpdatingIos ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Activating iOS Emergency Alerts...</span>
                  </>
                ) : (
                  <>
                    <AppleIcon className="w-4 h-4 text-white" />
                    <span>Activate Apple iOS Emergency Alerts</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1 text-emerald-700 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Official 10RCDG Defense Portal
              </span>
              <span className="font-mono">Self-Service Update</span>
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

            {/* Step Wizard Progress Bar */}
            <div className="py-1">
              <div className="flex items-center justify-between text-xs mb-2">
                <button
                  type="button"
                  onClick={() => setEnlistStep(1)}
                  className={`flex items-center gap-1.5 font-bold transition-all cursor-pointer ${
                    enlistStep === 1
                      ? "text-emerald-700"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      enlistStep === 1
                        ? "bg-emerald-700 text-white shadow-xs"
                        : enlistStep > 1
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {enlistStep > 1 ? "✓" : "1"}
                  </span>
                  <span className="hidden sm:inline">1. Soldier Identity</span>
                  <span className="sm:hidden">Identity</span>
                </button>

                <div className={`h-0.5 flex-1 mx-2 rounded-full transition-all ${enlistStep >= 2 ? "bg-emerald-500" : "bg-slate-200"}`} />

                <button
                  type="button"
                  onClick={() => {
                    if (enlistStep === 1) {
                      handleProceedToStep2();
                    } else {
                      setEnlistStep(2);
                    }
                  }}
                  className={`flex items-center gap-1.5 font-bold transition-all cursor-pointer ${
                    enlistStep === 2
                      ? "text-emerald-700"
                      : enlistStep > 2
                      ? "text-slate-600 hover:text-slate-900"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      enlistStep === 2
                        ? "bg-emerald-700 text-white shadow-xs"
                        : enlistStep > 2
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {enlistStep > 2 ? "✓" : "2"}
                  </span>
                  <span className="hidden sm:inline">2. Military & ROTC</span>
                  <span className="sm:hidden">Military</span>
                </button>

                <div className={`h-0.5 flex-1 mx-2 rounded-full transition-all ${enlistStep >= 3 ? "bg-emerald-500" : "bg-slate-200"}`} />

                <button
                  type="button"
                  onClick={() => {
                    if (enlistStep === 1) {
                      handleProceedToStep2();
                    } else {
                      setEnlistStep(3);
                    }
                  }}
                  className={`flex items-center gap-1.5 font-bold transition-all cursor-pointer ${
                    enlistStep === 3
                      ? "text-emerald-700"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      enlistStep === 3
                        ? "bg-emerald-700 text-white shadow-xs"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    3
                  </span>
                  <span className="hidden sm:inline">3. Skills & Station</span>
                  <span className="sm:hidden">Station</span>
                </button>
              </div>

              {/* Step indicator label banner */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 flex items-center justify-between text-[11px] text-slate-600">
                <span className="font-semibold text-slate-700">
                  {enlistStep === 1 && "Step 1 of 3: Personal & Contact Information"}
                  {enlistStep === 2 && "Step 2 of 3: ROTC & Military Training Records"}
                  {enlistStep === 3 && "Step 3 of 3: Readiness Skills, Station & Device"}
                </span>
                <span className="text-[10px] font-mono text-emerald-700 font-bold">
                  {enlistStep === 1 ? "Step 1 / 3" : enlistStep === 2 ? "Step 2 / 3" : "Final Step"}
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* STEP 1: SOLDIER IDENTITY & CONTACT */}
              {enlistStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[11px]">
                          1
                        </div>
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                          Soldier Identity & Contact
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                        Required
                      </span>
                    </div>

                    {/* Military Rank */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Military Rank <span className="text-red-500 font-bold ml-0.5">*</span>
                      </label>
                      <RankSearchSelect
                        value={formData.rank}
                        onChange={(val) => setFormData((prev) => ({ ...prev, rank: val }))}
                        required
                      />
                    </div>

                    {/* Full Name */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                          First Name <span className="text-red-500 font-bold ml-0.5">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Juan"
                          value={formData.firstName}
                          onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-2xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Last Name <span className="text-red-500 font-bold ml-0.5">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Dela Cruz"
                          value={formData.lastName}
                          onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-2xs"
                        />
                      </div>
                    </div>

                    {/* Mobile Phone Number & Age */}
                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="col-span-2">
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Mobile Phone Number <span className="text-red-500 font-bold ml-0.5">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="tel"
                            required
                            placeholder="0917 123 4567"
                            value={formData.mobileNumber}
                            onChange={handleMobileChange}
                            maxLength={16}
                            className={`w-full pl-3 pr-9 py-2 bg-white border rounded-xl text-slate-900 font-mono text-xs font-bold focus:outline-none focus:ring-2 shadow-2xs ${
                              phoneError
                                ? "border-red-500 focus:ring-red-500"
                                : "border-slate-200 focus:ring-emerald-600"
                            }`}
                          />
                          <Phone className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                        </div>
                        {phoneError ? (
                          <p className="text-[11px] text-red-600 mt-1 font-medium">{phoneError}</p>
                        ) : (
                          <p className="text-[10px] text-slate-400 mt-1 font-mono">
                            e.g. 0917 123 4567 or +63 917 123 4567
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Age
                        </label>
                        <input
                          type="number"
                          min={16}
                          max={85}
                          placeholder="e.g. 24"
                          value={formData.age}
                          onChange={(e) => setFormData((prev) => ({ ...prev, age: e.target.value }))}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-2xs"
                        />
                      </div>
                    </div>

                    {/* Current Residential Address */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <span>Current Address</span>
                        </label>
                        <button
                          type="button"
                          onClick={handleDetectLocation}
                          disabled={isDetectingLocation}
                          className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer bg-emerald-50 hover:bg-emerald-100/80 px-2.5 py-0.5 rounded-md border border-emerald-300 transition-all active:scale-95 disabled:opacity-50 shadow-2xs"
                          title="Auto-detect address using device GPS"
                        >
                          {isDetectingLocation ? (
                            <>
                              <Loader2 className="w-3 h-3 text-emerald-700 animate-spin" />
                              <span>Detecting GPS...</span>
                            </>
                          ) : (
                            <>
                              <Navigation className="w-3 h-3 text-emerald-700" />
                              <span>Auto-Detect GPS</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="relative">
                        <input
                          type="text"
                          placeholder="e.g. Brgy. Carmen, Cagayan de Oro City, Misamis Oriental"
                          value={formData.currentAddress}
                          onChange={(e) => {
                            setFormData((prev) => ({ ...prev, currentAddress: e.target.value }));
                            if (locationNotice) setLocationNotice(null);
                          }}
                          className="w-full pl-3 pr-16 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-2xs"
                        />
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                          {formData.currentAddress && (
                            <button
                              type="button"
                              onClick={() => {
                                setFormData((prev) => ({ ...prev, currentAddress: "" }));
                                if (locationNotice) setLocationNotice(null);
                              }}
                              className="p-0.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 cursor-pointer"
                              title="Clear address"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                      </div>

                      {/* GPS Detection Feedback */}
                      {locationNotice && (
                        <div className={`p-2 rounded-lg text-[11px] mt-1.5 flex items-center gap-1.5 border animate-in fade-in duration-150 ${
                          locationNotice.type === "success"
                            ? "bg-emerald-50 text-emerald-900 border-emerald-200 font-medium"
                            : "bg-amber-50 text-amber-900 border-amber-200"
                        }`}>
                          {locationNotice.type === "success" ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          )}
                          <span className="truncate">{locationNotice.message}</span>
                        </div>
                      )}

                      {/* Quick-Tap 10RCDG Regional Chips */}
                      <div className="mt-2">
                        <span className="text-[10px] text-slate-400 block mb-1">
                          Quick-tap 10RCDG troop locations:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {COMMON_10RCDG_LOCATIONS.map((loc) => {
                            const isSelected = formData.currentAddress.toLowerCase().includes(loc.short.toLowerCase());
                            return (
                              <button
                                key={loc.full}
                                type="button"
                                onClick={() => {
                                  setFormData((prev) => ({ ...prev, currentAddress: loc.full }));
                                  if (locationNotice) setLocationNotice(null);
                                }}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                                  isSelected
                                    ? "bg-emerald-100 text-emerald-950 border-emerald-300 shadow-2xs font-extrabold"
                                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                                }`}
                              >
                                {isSelected ? "✓ " : "📍 "}
                                {loc.short}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 1 Error Feedback */}
                  {submissionError && (
                    submissionError.includes("/download") ||
                    submissionError.toLowerCase().includes("already registered") ||
                    submissionError.toLowerCase().includes("already submitted") ||
                    submissionError.toLowerCase().includes("already used") ||
                    submissionError.toLowerCase().includes("already on record") ? (
                      <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 space-y-2.5 animate-in fade-in duration-200">
                        <div className="flex items-start gap-2.5">
                          <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                          <div className="space-y-1">
                            <div className="font-bold text-amber-950 text-xs">
                              {submissionError.toLowerCase().includes("already registered") || submissionError.toLowerCase().includes("already on record")
                                ? "Soldier Record Already on File"
                                : "Enlistment Request Already Pending"}
                            </div>
                            <p className="text-[11px] text-amber-900 leading-relaxed">
                              {submissionError.replace(/\s*\(\/download\)/g, "")}
                            </p>
                          </div>
                        </div>
                        {submissionError.toLowerCase().includes("already registered") && (
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
                        )}
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                        <span>{submissionError}</span>
                      </div>
                    )
                  )}

                  {/* Proceed to Step 2 Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleProceedToStep2}
                      disabled={isCheckingStep1}
                      className="w-full py-3 bg-emerald-700 hover:bg-emerald-600 disabled:bg-slate-400 active:scale-[0.99] text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
                    >
                      {isCheckingStep1 ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Verifying Soldier Record...</span>
                        </>
                      ) : (
                        <>
                          <span>Proceed to Step 2: Military & ROTC</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: MILITARY TRAINING & ROTC BACKGROUND */}
              {enlistStep === 2 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-[11px]">
                          2
                        </div>
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                          Military & ROTC Background
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-bold">
                        HQ Record Lookup
                      </span>
                    </div>

                    {/* Training Category Pill Options */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                        <span>Source of Enlistment / Training Category</span>
                        <span className="text-[10px] text-slate-400 font-normal">Select 1</span>
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {TRAINING_CATEGORIES.map((cat) => {
                          const isSelected = formData.trainingCategory === cat.id;
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => setFormData((prev) => ({ ...prev, trainingCategory: cat.id }))}
                              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-emerald-50 border-emerald-600 ring-1 ring-emerald-600 text-emerald-950 shadow-2xs"
                                  : "bg-white border-slate-200 hover:bg-slate-100/80 text-slate-700"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`text-[11px] font-bold leading-tight ${isSelected ? "text-emerald-950 font-extrabold" : "text-slate-800"}`}>
                                  {cat.label}
                                </span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />}
                              </div>
                              <span className={`text-[9px] block truncate mt-0.5 ${isSelected ? "text-emerald-700 font-medium" : "text-slate-400"}`}>
                                {cat.desc}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* School & Year Graduated */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                          <span>School / ROTC Unit</span>
                          <span className="text-[10px] text-slate-400 font-normal">Where you took Basic ROTC</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="e.g. USTP, Liceo, Xavier, BukSU, etc."
                            value={formData.school}
                            onChange={(e) => setFormData((prev) => ({ ...prev, school: e.target.value }))}
                            className="w-full pl-3 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-2xs"
                          />
                          <GraduationCap className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Year Graduated in ROTC
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="e.g. 2018"
                            value={formData.yearGraduated}
                            onChange={(e) => setFormData((prev) => ({ ...prev, yearGraduated: e.target.value }))}
                            className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-2xs"
                          />
                          <Calendar className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 italic">
                      * Even if you graduated 10+ years ago, this data allows HQ to retrieve your Special Orders (SO) and military serial numbers.
                    </p>
                  </div>

                  {/* Navigation Buttons for Step 2 */}
                  <div className="pt-2 flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setEnlistStep(1)}
                      className="py-3 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleProceedToStep3}
                      className="flex-1 py-3 bg-emerald-700 hover:bg-emerald-600 active:scale-[0.99] text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
                    >
                      <span>Proceed to Step 3: Skills & Station</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: SKILLS, STATION & DEVICE */}
              {enlistStep === 3 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* SECTION 3: CIVILIAN OCCUPATION & SPECIAL SKILLS */}
                  <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-md bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[11px]">
                          3
                        </div>
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                          Civilian Occupation & Readiness Skills
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-bold">
                        Standby Reserve MOS
                      </span>
                    </div>

                    {/* Current Job */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Current Job / Occupation
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="e.g. Teacher, Civil Engineer, Security, IT, Private Employee, Self-Employed"
                          value={formData.currentJob}
                          onChange={(e) => setFormData((prev) => ({ ...prev, currentJob: e.target.value }))}
                          className="w-full pl-3 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-2xs"
                        />
                        <Briefcase className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>

                    {/* Special Skills & Quick-Tap Tags */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                        <span>Special Skills & Qualifications</span>
                        <span className="text-[10px] text-slate-400 font-normal">Tap tags below or type</span>
                      </label>
                      <div className="relative mb-2">
                        <input
                          type="text"
                          placeholder="e.g. First Aid, Radio Comms, Heavy Equipment, Driving, IT"
                          value={formData.skills}
                          onChange={(e) => setFormData((prev) => ({ ...prev, skills: e.target.value }))}
                          className="w-full pl-3 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-2xs"
                        />
                        <Wrench className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                      </div>

                      {/* Quick-Tap Skill Chips */}
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {QUICK_SKILLS.map((sk) => {
                          const isIncluded = formData.skills.toLowerCase().includes(sk.toLowerCase());
                          return (
                            <button
                              key={sk}
                              type="button"
                              onClick={() => {
                                if (isIncluded) {
                                  const updated = formData.skills
                                    .split(",")
                                    .map((s) => s.trim())
                                    .filter((s) => s.toLowerCase() !== sk.toLowerCase())
                                    .join(", ");
                                  setFormData((prev) => ({ ...prev, skills: updated }));
                                } else {
                                  const current = formData.skills.trim();
                                  const updated = current ? `${current}, ${sk}` : sk;
                                  setFormData((prev) => ({ ...prev, skills: updated }));
                                }
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                                isIncluded
                                  ? "bg-emerald-100 text-emerald-900 border-emerald-300 shadow-2xs"
                                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                              }`}
                            >
                              {isIncluded ? "✓ " : "+ "}
                              {sk}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* SECTION 4: STATION ASSIGNMENT & PHONE CAPABILITY */}
                  <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-3 shadow-2xs">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                      <div className="w-5 h-5 rounded-md bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-[11px]">
                        4
                      </div>
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        Station Assignment & Phone Capability
                      </span>
                    </div>

                    {/* Assigned Group & Unit / Station */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Assigned Group <span className="text-red-500 font-bold ml-0.5">*</span>
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
                          Unit / Station <span className="text-red-500 font-bold ml-0.5">*</span>
                        </label>
                        {isUnitLocked ? (
                          <div>
                            <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-900 text-xs font-bold shadow-2xs">
                              <div className="flex items-center gap-2 truncate">
                                <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                                <span className="truncate">{campaign?.targetUnit}</span>
                              </div>
                              <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-extrabold shrink-0 flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5" />
                                <span>LOCKED</span>
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">
                              Pre-assigned to {campaign?.targetUnit} by Command.
                            </p>
                          </div>
                        ) : (
                          <input
                            type="text"
                            placeholder="e.g. 1001st CDC / 10RCDG HQ"
                            value={formData.unit}
                            onChange={(e) => setFormData((prev) => ({ ...prev, unit: e.target.value }))}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-600 shadow-2xs"
                          />
                        )}
                      </div>
                    </div>

                    {/* Company Designation */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                        <span>Assigned Company <span className="text-red-500 font-bold ml-0.5">*</span></span>
                        <span className="text-[10px] text-slate-400 font-normal">Battalion / CDC Sub-unit</span>
                      </label>
                      {isCompanyLocked ? (
                        <div>
                          <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-900 text-xs font-bold shadow-2xs">
                            <div className="flex items-center gap-2 truncate">
                              <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                              <span className="truncate">
                                {(campaign as any)?.targetCompany === "HHC"
                                  ? "Headquarters & HQ Company (HHC)"
                                  : `${(campaign as any)?.targetCompany} Company`}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-extrabold shrink-0 flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" />
                              <span>LOCKED</span>
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">
                            Pre-assigned to {(campaign as any)?.targetCompany} Company by Command.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                          {[
                            { code: "HHC", label: "HHC", sub: "Headquarters" },
                            { code: "Alpha", label: "Alpha", sub: "A Company" },
                            { code: "Bravo", label: "Bravo", sub: "B Company" },
                            { code: "Charlie", label: "Charlie", sub: "C Company" },
                            { code: "Delta", label: "Delta", sub: "D Company" },
                          ].map((c) => {
                            const isSelected = formData.company === c.code;
                            return (
                              <button
                                key={c.code}
                                type="button"
                                onClick={() => setFormData((prev) => ({ ...prev, company: c.code }))}
                                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                                  isSelected
                                    ? "bg-emerald-50/90 border-emerald-600 ring-1 ring-emerald-600 shadow-2xs"
                                    : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className={`text-xs font-bold ${isSelected ? "text-emerald-950 font-extrabold" : "text-slate-800"}`}>
                                    {c.label}
                                  </span>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-emerald-700" />}
                                </div>
                                <span className={`text-[10px] block truncate ${isSelected ? "text-emerald-700 font-medium" : "text-slate-400"}`}>
                                  {c.sub}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Primary Phone Capability */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                        <span>Primary Phone Capability <span className="text-red-500 font-bold ml-0.5">*</span></span>
                        <span className="text-[10px] text-slate-400 font-normal">Helps command route emergency siren alerts</span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
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
                              <span>Android Phone</span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-normal block mt-0.5">
                              App Siren & Free Push
                            </span>
                          </div>
                        </label>

                        <label
                          className={`p-3 rounded-xl border cursor-pointer flex items-center gap-3 transition-all ${
                            formData.deviceType === "IOS"
                              ? "bg-emerald-50/80 border-emerald-600 ring-1 ring-emerald-600 text-emerald-950 font-bold shadow-2xs"
                              : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-white"
                          }`}
                        >
                          <input
                            type="radio"
                            name="deviceType"
                            value="IOS"
                            checked={formData.deviceType === "IOS"}
                            onChange={() => setFormData((prev) => ({ ...prev, deviceType: "IOS" }))}
                            className="text-emerald-700 focus:ring-emerald-600"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <AppleIcon className="w-4 h-4 text-slate-800 shrink-0" />
                              <span>Apple iPhone</span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-normal block mt-0.5">
                              iOS • Email Alert Layer
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
                              <span>Keypad Phone</span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-normal block mt-0.5">
                              Basic Cellular SMS
                            </span>
                          </div>
                        </label>
                      </div>

                      {/* Email Field - Highlighted for iOS */}
                      <div className="mt-3.5 pt-3.5 border-t border-slate-200">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                          <span>
                            Email Address {formData.deviceType === "IOS" ? <span className="text-red-500 font-bold">*</span> : <span className="text-slate-400 font-normal lowercase">(optional)</span>}
                          </span>
                          {formData.deviceType === "IOS" && (
                            <span className="text-[10px] text-blue-600 font-bold flex items-center gap-1">
                              <AppleIcon className="w-3 h-3" /> Required for iOS alerts
                            </span>
                          )}
                        </label>
                        <input
                          type="email"
                          placeholder="e.g. soldier@gmail.com"
                          value={formData.email}
                          onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                          required={formData.deviceType === "IOS"}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 bg-white placeholder-slate-400 focus:outline-none transition-all ${
                            formData.deviceType === "IOS" && !formData.email.trim()
                              ? "border-blue-400 ring-2 ring-blue-100"
                              : "border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                          }`}
                        />
                        {formData.deviceType === "IOS" && (
                          <p className="text-[10.5px] text-blue-800 bg-blue-50/80 border border-blue-200/80 rounded-lg p-2 mt-2 leading-relaxed">
                            💡 <strong>iOS Alert Notice:</strong> Because iPhones cannot install APK files, 10RCDG emergency alerts and mobilization orders will be dispatched directly to this email inbox via Resend.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Submission Error Feedback */}
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

                  {/* Navigation & Submit Buttons for Step 3 */}
                  <div className="pt-2 flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setEnlistStep(2)}
                      disabled={isSubmitting}
                      className="py-3 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 py-3 bg-emerald-800 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider active:scale-[0.99]"
                    >
                      <Shield className="w-4 h-4" />
                      <span>{isSubmitting ? "Logging Enlistment..." : "Submit Official Enlistment"}</span>
                    </button>
                  </div>
                </div>
              )}
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
