"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import {
  Shield,
  Mail,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  RotateCw,
  Info,
  X,
  FileText,
  Lock,
} from "lucide-react";

interface SignInCardProps {
  onGoogleSignIn: () => Promise<void>;
  isSuspended?: boolean;
  isRevoked?: boolean;
  isDenied?: boolean;
  isExpired?: boolean;
  suspendedCountdownNode?: React.ReactNode;
}

export function SignInCard({
  onGoogleSignIn,
  isSuspended = false,
  isRevoked = false,
  isDenied = false,
  isExpired = false,
  suspendedCountdownNode,
}: SignInCardProps) {
  // Step state: "EMAIL_INPUT" vs "OTP_VERIFY"
  const [step, setStep] = useState<"EMAIL_INPUT" | "OTP_VERIFY">("EMAIL_INPUT");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [isSubmittingGoogle, setIsSubmittingGoogle] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [expiresIn, setExpiresIn] = useState(300); // 5 minutes (300s)
  const [attemptsLeft, setAttemptsLeft] = useState(3); // 3-Strike counter

  // Legal modal state
  const [legalModal, setLegalModal] = useState<"TERMS" | "PRIVACY" | null>(null);

  // Input refs for 6 OTP boxes
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Cooldown countdown timer (60s)
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Code expiration countdown timer (300s)
  useEffect(() => {
    if (step !== "OTP_VERIFY" || expiresIn <= 0) return;
    const timer = setInterval(() => {
      setExpiresIn((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [step, expiresIn]);

  // Auto-focus first box when entering OTP step
  useEffect(() => {
    if (step === "OTP_VERIFY") {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [step]);

  // Format seconds to MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainder.toString().padStart(2, "0")}`;
  };

  // Handle requesting 6-digit code via Resend
  const handleRequestCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      setErrorMessage("Please enter a valid email address (e.g. officer@yahoo.com or afp.mil.ph).");
      return;
    }

    setErrorMessage(null);
    setIsSendingCode(true);

    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.error === "COOLDOWN") {
          setCooldown(data.remainingSeconds || 60);
        }
        setErrorMessage(data.message || "Unable to send login code. Please check your email.");
        return;
      }

      setStep("OTP_VERIFY");
      setCooldown(60);
      setExpiresIn(300);
      setAttemptsLeft(3);
      setOtp(["", "", "", "", "", ""]);
    } catch (err: any) {
      setErrorMessage(err?.message || "Network error while sending code. Please try again.");
    } finally {
      setIsSendingCode(false);
    }
  };

  // Auto-verify helper when 6 digits are complete
  const executeVerification = async (fullCode: string) => {
    if (fullCode.length !== 6 || isVerifying) return;

    if (expiresIn <= 0) {
      setErrorMessage("This security code has expired. Please request a new code.");
      return;
    }

    setErrorMessage(null);
    setIsVerifying(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await signIn("email-otp", {
        email: cleanEmail,
        code: fullCode,
        redirect: false,
      });

      if (res?.error) {
        let friendlyMessage = "Incorrect security code. Please check your inbox.";

        if (res.code === "already_used_or_expired") {
          friendlyMessage = "This security code has already been used or has expired. For your security, each code can only be used once. Please request a new code.";
        } else if (res.code === "code_expired") {
          friendlyMessage = "Your security code has expired (5-minute limit). Please request a new code.";
        } else if (res.code === "wrong_code_2_left") {
          friendlyMessage = "Incorrect security code. You have 2 attempts remaining.";
          setAttemptsLeft(2);
        } else if (res.code === "wrong_code_1_left") {
          friendlyMessage = "Incorrect security code. Final attempt remaining before this code self-destructs.";
          setAttemptsLeft(1);
        } else if (res.code === "locked_5_minutes") {
          friendlyMessage = "Maximum failed attempts reached. For security, this code was destroyed and your account is locked for 5 minutes.";
          setAttemptsLeft(0);
        } else if (res.code === "throttled_wait") {
          friendlyMessage = "Security speed bump: Please wait a moment before trying again.";
        } else if (res.error === "Configuration" || res.error === "UntrustedHost") {
          friendlyMessage = "Unable to complete verification due to server environment. Please refresh the page and try again.";
        } else if (res.error === "AccessDenied") {
          friendlyMessage = "Account not authorized on the 10RCDG Command Roster.";
        }

        setErrorMessage(friendlyMessage);
        setIsVerifying(false);

        // Auto-clear boxes if wrong code so the officer can re-type immediately
        if (res.code?.startsWith("wrong_code") || res.code === "already_used_or_expired") {
          setOtp(["", "", "", "", "", ""]);
          setTimeout(() => otpInputRefs.current[0]?.focus(), 50);
        }
        return;
      }

      // Successful verification! Handshake complete -> redirect to dashboard
      window.location.href = "/dashboard";
    } catch (err: any) {
      setErrorMessage(err?.message || "Verification failed. Please try again.");
      setIsVerifying(false);
    }
  };

  // Handle OTP box input with auto-advance and instant 6th-digit submission
  const handleOtpChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, "");

    if (cleaned.length === 0) {
      const nextOtp = [...otp];
      nextOtp[index] = "";
      setOtp(nextOtp);
      return;
    }

    const nextOtp = [...otp];
    nextOtp[index] = cleaned[cleaned.length - 1];
    setOtp(nextOtp);

    // Auto-advance to next input
    if (index < 5 && cleaned.length > 0) {
      otpInputRefs.current[index + 1]?.focus();
    } else if (index === 5 && cleaned.length > 0) {
      // 6th digit entered: check if all 6 digits are populated
      const full = nextOtp.join("");
      if (full.length === 6) {
        setTimeout(() => executeVerification(full), 50);
      }
    }
  };

  // Handle Backspace navigation
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Handle Copy-Paste of 6-digit code
  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const nextOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      nextOtp[i] = pasted[i] || "";
    }
    setOtp(nextOtp);

    const focusIndex = Math.min(pasted.length, 5);
    otpInputRefs.current[focusIndex]?.focus();

    if (pasted.length === 6) {
      setTimeout(() => executeVerification(pasted), 50);
    }
  };

  // Handle Manual Code Verification Button
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fullCode = otp.join("");

    if (fullCode.length !== 6) {
      setErrorMessage("Please enter all 6 digits of your security code.");
      return;
    }

    await executeVerification(fullCode);
  };

  return (
    <div className="w-full max-w-md relative corner-bracket-light bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xl transition-all">
      {/* Card Brand Header */}
      <div className="mb-2.5 sm:mb-3 text-center space-y-0.5">
        <div className="inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 mb-0.5 shadow-2xs">
          {step === "EMAIL_INPUT" ? (
            <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700" />
          ) : (
            <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700 animate-pulse" />
          )}
        </div>
        <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
          {step === "EMAIL_INPUT" ? "Sign in to RESCOM ALERT" : "Check Your Email"}
        </h2>
        <p className="text-[11px] text-slate-500">
          {step === "EMAIL_INPUT"
            ? "10th Regional Community Defense Group Portal"
            : `We sent a 6-digit security code to ${email}`}
        </p>
      </div>

      {/* Account Suspended by Command Notice with Live Digital Countdown */}
      {isSuspended && suspendedCountdownNode}

      {/* Access Revoked Security Banner */}
      {isRevoked && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-left flex items-start gap-2.5 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-red-900">Access Revoked</p>
            <p className="text-[11px] text-red-700 leading-relaxed mt-0.5">
              Your system authorization has been revoked or deleted by Command. You no longer have access to this portal.
            </p>
          </div>
        </div>
      )}

      {/* Access Denied Security Banner */}
      {isDenied && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-left flex items-start gap-2.5 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-red-900">Access Denied: Account Not Authorized</p>
            <p className="text-[11px] text-red-700 leading-relaxed mt-0.5">
              Your account is not on the approved 10RCDG personnel roster. Please contact the Group Commander for access authorization.
            </p>
          </div>
        </div>
      )}

      {/* Session Expired Security Banner */}
      {isExpired && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-left flex items-start gap-2.5 animate-in fade-in duration-200">
          <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-950">Session Expired (15-Minute Inactivity)</p>
            <p className="text-[11px] text-amber-800 leading-relaxed mt-0.5">
              Your console was locked after 15 minutes of inactivity for security compliance. Please sign in again.
            </p>
          </div>
        </div>
      )}

      {/* Error Callout */}
      {errorMessage && (
        <div className="mb-3.5 p-3 rounded-xl bg-red-50 border border-red-200 text-left flex items-start gap-2.5 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-red-900 leading-relaxed">{errorMessage}</p>
            {step === "OTP_VERIFY" && cooldown <= 0 && (
              <button
                type="button"
                onClick={() => handleRequestCode()}
                disabled={isSendingCode}
                className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                <span>{isSendingCode ? "Sending new code..." : "Request Fresh Code Now →"}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* STEP 1: INITIAL LOGIN VIEW (GOOGLE OR EMAIL) */}
      {step === "EMAIL_INPUT" && (
        <div className="space-y-3 animate-in fade-in duration-150">
          {/* Option A: 1-Click Google Sign In */}
          <button
            type="button"
            onClick={async () => {
              setIsSubmittingGoogle(true);
              setErrorMessage(null);
              try {
                await onGoogleSignIn();
              } catch (err: any) {
                setErrorMessage(err?.message || "Failed to sign in with Google.");
                setIsSubmittingGoogle(false);
              }
            }}
            disabled={isSubmittingGoogle}
            className="w-full flex items-center justify-center gap-2.5 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-300 hover:border-emerald-600 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 shadow-2xs hover:shadow-xs active:scale-[0.99] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{isSubmittingGoogle ? "Connecting..." : "Continue with Google"}</span>
          </button>

          {/* Clean Modern Divider */}
          <div className="relative flex items-center justify-center my-0.5">
            <div className="w-full border-t border-slate-200" />
            <span className="absolute bg-white px-2.5 text-[9.5px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              or continue with email
            </span>
          </div>

          {/* Option B: Email OTP Form */}
          <form onSubmit={handleRequestCode} className="space-y-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Official or Personal Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="e.g. officer@yahoo.com, outlook, afp.mil.ph"
                  className="w-full pl-9 pr-3.5 py-2 sm:py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 rounded-xl transition-all text-slate-900 placeholder:text-slate-400 outline-none"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSendingCode || !email.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-800 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-xl font-bold text-xs sm:text-sm transition-all shadow-xs hover:shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSendingCode ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending Security Code...</span>
                </>
              ) : (
                <>
                  <span>Continue with Email</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Legal Agreement Micro-Footer */}
          <div className="pt-1 text-center">
            <p className="text-[10px] text-slate-500 leading-normal">
              By signing in, you agree to our{" "}
              <button
                type="button"
                onClick={() => setLegalModal("TERMS")}
                className="font-bold text-emerald-800 hover:underline cursor-pointer"
              >
                Terms of Use
              </button>{" "}
              and{" "}
              <button
                type="button"
                onClick={() => setLegalModal("PRIVACY")}
                className="font-bold text-emerald-800 hover:underline cursor-pointer"
              >
                Privacy Policy
              </button>
              . Authorized 10RCDG personnel only. All access is officially monitored.
            </p>
          </div>
        </div>
      )}

      {/* STEP 2: 6-DIGIT OTP VERIFICATION VIEW (STRIPE / LINEAR STYLE) */}
      {step === "OTP_VERIFY" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Email badge with quick change option */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 truncate">
              <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="font-bold text-slate-800 truncate">{email}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setStep("EMAIL_INPUT");
                setErrorMessage(null);
              }}
              className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 hover:underline shrink-0 ml-2 cursor-pointer"
            >
              Change
            </button>
          </div>

          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <div className="flex items-center justify-between px-1 mb-2">
                <span className="text-xs font-bold text-slate-700">
                  Enter 6-Digit Security Code
                </span>
                <span
                  className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full border transition-all ${
                    attemptsLeft === 3
                      ? "text-slate-600 bg-slate-100 border-slate-200"
                      : attemptsLeft === 2
                      ? "text-amber-800 bg-amber-50 border-amber-300 font-bold"
                      : attemptsLeft === 1
                      ? "text-red-800 bg-red-50 border-red-300 animate-pulse font-bold"
                      : "text-red-900 bg-red-100 border-red-400 font-bold"
                  }`}
                >
                  {attemptsLeft === 1
                    ? "⚠️ 1 attempt left"
                    : attemptsLeft === 0
                    ? "Locked (0 left)"
                    : `${attemptsLeft} of 3 attempts`}
                </span>
              </div>

              {/* 6 Individual Segmented Boxes */}
              <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                {otp.map((digit, idx) => (
                  <div key={idx} className="flex items-center">
                    <input
                      ref={(el) => {
                        otpInputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      disabled={isVerifying || attemptsLeft === 0}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      onPaste={handleOtpPaste}
                      className="w-8 h-10 sm:w-10 sm:h-12 text-center text-lg sm:text-xl font-mono font-bold text-slate-900 bg-slate-50 border-2 border-slate-300 focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-600/20 rounded-xl transition-all outline-none disabled:opacity-50 disabled:bg-slate-100"
                    />
                    {/* Middle Dash Separator between digit 3 and 4 */}
                    {idx === 2 && (
                      <span className="mx-1 text-slate-400 font-bold font-mono text-xs select-none">
                        —
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isVerifying || otp.join("").length !== 6}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-800 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-xl font-bold text-xs sm:text-sm transition-all shadow-xs hover:shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isVerifying ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Verify & Enter Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Countdown & Resend Code Controls */}
          <div className="space-y-1.5 pt-0.5 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>
                Code expires in{" "}
                <strong className="font-mono text-slate-800">{formatTime(expiresIn)}</strong>
              </span>
            </div>

            <div className="text-xs text-slate-600">
              Didn&apos;t get the code?{" "}
              {cooldown > 0 ? (
                <span className="text-slate-400 font-mono">Resend available in {cooldown}s</span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleRequestCode()}
                  className="font-bold text-emerald-800 hover:underline cursor-pointer"
                >
                  Resend security code
                </button>
              )}
            </div>

            {/* Non-technical spam reminder tip */}
            <div className="p-2 rounded-lg bg-amber-50 border border-amber-200/80 text-[10.5px] text-amber-900 flex items-start gap-1.5 text-left">
              <Info className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
              <span>
                <strong>Quick Tip:</strong> Can&apos;t find the email? Please check your <strong>Spam</strong> or{" "}
                <strong>Junk</strong> folder.
              </span>
            </div>

            {/* Back button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  setStep("EMAIL_INPUT");
                  setErrorMessage(null);
                }}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Back to all sign-in options</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Classification & Port Status */}
      <div className="mt-2.5 sm:mt-3 pt-2 sm:pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10.5px] text-slate-500">
        <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Official Defense Portal
        </span>
        <span className="text-slate-400 font-medium">10RCDG Online</span>
      </div>

      {/* NON-TECHNICAL TERMS OF USE MODAL */}
      {legalModal === "TERMS" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 max-h-[85vh]">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-700" />
                <h3 className="text-sm font-bold text-slate-900">10RCDG Terms of Use</h3>
              </div>
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3.5 text-xs text-slate-600 leading-relaxed">
              <p className="font-semibold text-slate-800">
                Please review these simple rules for using the 10RCDG Personnel & Alert Portal:
              </p>

              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-700" />
                    1. Authorized Military Personnel Only
                  </h4>
                  <p>
                    This system is restricted to authorized officers, staff, and commanders of the 10th Regional Community
                    Defense Group. Unauthorized attempts to log in or access data are strictly prohibited.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-700" />
                    2. Keep Your Account Safe
                  </h4>
                  <p>
                    Do not share your email login codes or system permissions with anyone. You are responsible for all actions
                    taken under your account.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    3. Automatic 15-Minute Screen Lock
                  </h4>
                  <p>
                    For security, the portal automatically logs you out after 15 minutes of inactivity so no unauthorized person
                    can view soldier records while you are away from your computer.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    4. Official Military Records
                  </h4>
                  <p>
                    All emergency dispatches, troop roster changes, and system activities are officially recorded for military
                    accountability and operational readiness.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                I Understand & Return to Login
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NON-TECHNICAL PRIVACY POLICY MODAL */}
      {legalModal === "PRIVACY" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 max-h-[85vh]">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-700" />
                <h3 className="text-sm font-bold text-slate-900">10RCDG Privacy Policy</h3>
              </div>
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3.5 text-xs text-slate-600 leading-relaxed">
              <p className="font-semibold text-slate-800">
                How we protect reservist and personnel information under Philippine Law (RA 10173):
              </p>

              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    1. What Information is Stored
                  </h4>
                  <p>
                    We only record official service information necessary for emergency mobilization: military rank, full name,
                    contact phone number, assigned CDC / Company, and active status.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    2. Why We Use This Information
                  </h4>
                  <p>
                    Data is used exclusively to dispatch rapid mobilization advisories, coordinate Disaster Response Operations
                    (DRRO), verify soldier identity during drills, and maintain accurate reserve readiness.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-700" />
                    3. Complete Confidentiality
                  </h4>
                  <p>
                    Reservist and officer records are strictly confidential. We do not sell, share, or disclose troop contact
                    details to commercial companies, advertisers, or outside entities.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-700" />
                    4. Philippine Data Privacy Act
                  </h4>
                  <p>
                    This system adheres strictly to the Republic of the Philippines Data Privacy Act of 2012 (RA 10173). All
                    data in transit is encrypted, and access is monitored by the 10RCDG Command Staff.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                I Understand & Return to Login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

