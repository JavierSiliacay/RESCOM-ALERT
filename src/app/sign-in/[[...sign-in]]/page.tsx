import Image from "next/image";
import { Shield, Radio, Lock, Activity, CheckCircle2, ExternalLink, AlertCircle } from "lucide-react";
import { signIn, auth } from "@/auth";
import { SuspensionCountdown } from "@/components/suspension-countdown";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reason?: string; duration?: string; until?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  const sessionUser = session?.user as any;

  const isSuspended =
    params?.error === "AccountSuspended" ||
    sessionUser?.status === "SUSPENDED";

  const isRevoked =
    !isSuspended &&
    (params?.error === "AccessRevoked" ||
      sessionUser?.isRevoked ||
      sessionUser?.status === "REJECTED");

  const isDenied =
    !isSuspended &&
    !isRevoked &&
    (params?.error === "AccessDenied" ||
      params?.error === "OAuthAccountNotLinked" ||
      params?.error === "Configuration");

  const suspendedReason =
    params?.reason
      ? decodeURIComponent(params.reason)
      : sessionUser?.suspendedReason || "Administrative Review";

  const suspendedDuration =
    params?.duration
      ? decodeURIComponent(params.duration)
      : sessionUser?.suspendedDuration || "Indefinite";

  const suspendedUntil =
    params?.until
      ? decodeURIComponent(params.until)
      : sessionUser?.suspendedUntil;
  return (
    <div className="relative min-h-dvh lg:h-screen lg:max-h-screen w-full flex flex-col justify-between bg-[#f8fafc] overflow-y-auto lg:overflow-hidden selection:bg-emerald-100 selection:text-emerald-900">
      {/* Official 10RCDG Troop Formation Background with Soft Frosted Overlay */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Image
          src="/rescom-bg.jpg"
          alt="10RCDG Personnel Formation"
          fill
          className="object-cover object-center opacity-25"
          priority
        />
        {/* Frosted Glass & Light Gradient Wash */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-50/95 via-slate-50/85 to-slate-50/90 backdrop-blur-[3px] tactical-grid-light" />
      </div>

      {/* Dynamic Ambient Light Gradients */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] rounded-full bg-emerald-100/50 blur-[100px] sm:blur-[130px] z-0" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] rounded-full bg-amber-100/40 blur-[100px] sm:blur-[130px] z-0" />

      {/* Top Header Bar — Pinned at the very top */}
      <header className="w-full z-20 shrink-0 flex items-center justify-between px-4 sm:px-8 py-2.5 lg:py-3 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="flex items-center -space-x-2 shrink-0">
            <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden border border-amber-500/80 ring-2 ring-emerald-100 shadow-xs bg-white z-10 flex items-center justify-center">
              <Image
                src="/rescom-pa-seal.png"
                alt="RESCOM PA Seal"
                fill
                sizes="32px"
                className="object-cover scale-105"
                priority
              />
            </div>
            <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden border border-amber-500/80 ring-2 ring-emerald-100 shadow-xs bg-white flex items-center justify-center">
              <Image
                src="/rescom-emblem.jpg"
                alt="10RCDG Emblem"
                fill
                sizes="32px"
                className="object-cover scale-105"
                priority
              />
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
            Authorized Personnel
          </span>
        </div>
      </header>

      {/* Main Container — Dynamically centered without overflowing viewport */}
      <main className="flex-1 min-h-0 z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2 lg:py-2 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 xl:gap-12 items-center">
          
          {/* Left Column: Official Unit Insignia & Branding */}
          <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left space-y-3 lg:space-y-3.5 xl:space-y-5">
            
            {/* Classification Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-amber-50 border border-amber-300/80 shadow-xs">
              <Shield className="w-3.5 h-3.5 text-amber-700" />
              <span className="text-[10px] sm:text-xs tracking-wider text-amber-900 font-bold uppercase">
                Philippine Army Reserve Command
              </span>
            </div>

            {/* Emblem and Hero Title */}
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5 lg:gap-6">
              {/* Dual Insignia Lockup (RESCOM PA + 10RCDG) */}
              <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                {/* 1. Reserve Command Philippine Army Seal */}
                <div className="relative group">
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 lg:w-22 lg:h-22 xl:w-26 xl:h-26 rounded-full overflow-hidden border-2 sm:border-3 border-amber-500/80 ring-4 ring-emerald-100/90 shadow-lg bg-white flex items-center justify-center transition-transform group-hover:scale-105">
                    <Image
                      src="/rescom-pa-seal.png"
                      alt="Reserve Command, Philippine Army Seal"
                      fill
                      sizes="(max-width: 768px) 80px, 120px"
                      className="object-cover scale-105"
                      priority
                    />
                  </div>
                </div>

                {/* Divider Link */}
                <div className="w-1.5 h-8 lg:h-9 xl:h-10 rounded-full bg-gradient-to-b from-amber-400 via-emerald-600 to-amber-500 opacity-60" />

                {/* 2. 10th Regional Community Defense Group Emblem */}
                <div className="relative group">
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 lg:w-22 lg:h-22 xl:w-26 xl:h-26 rounded-full overflow-hidden border-2 sm:border-3 border-amber-500/80 ring-4 ring-emerald-100/90 shadow-lg bg-white flex items-center justify-center transition-transform group-hover:scale-105">
                    <Image
                      src="/rescom-emblem.jpg"
                      alt="10th Regional Community Defense Group Emblem"
                      fill
                      sizes="(max-width: 768px) 80px, 120px"
                      className="object-cover scale-105"
                      priority
                    />
                  </div>
                </div>
              </div>

              {/* Title & Subtitle */}
              <div className="space-y-0.5 sm:space-y-1">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-extrabold tracking-tight text-slate-900 leading-none">
                  <span className="text-emerald-950">RESCOM </span>
                  <span className="text-amber-600">ALERT</span>
                </h1>
                <p className="text-sm sm:text-base lg:text-lg font-semibold text-slate-700 tracking-wide flex items-center justify-center lg:justify-start gap-1.5 pt-0.5">
                  <Radio className="w-4 h-4 text-emerald-600 animate-pulse shrink-0" />
                  <span>Mass Text Notification System</span>
                </p>
                <div className="text-xs sm:text-sm text-slate-600 font-medium leading-tight">
                  10th Regional Community Defense Group
                  <div className="text-[10px] sm:text-xs text-slate-500 mt-0.5">
                    Reserve Command, Philippine Army
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop: Feature Highlights Grid */}
            <div className="hidden lg:grid grid-cols-3 gap-2.5 w-full max-w-xl">
              <div className="flex items-center gap-2.5 p-2.5 xl:p-3 rounded-xl bg-white border border-slate-200 shadow-xs hover:border-emerald-300 transition-colors">
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                  <Radio className="w-4 h-4" />
                </div>
                <div className="text-left min-w-0">
                  <div className="text-xs font-bold text-slate-800 truncate">Fast Group SMS</div>
                  <div className="text-[10px] xl:text-[11px] text-slate-500 truncate">Reach everyone in seconds</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2.5 xl:p-3 rounded-xl bg-white border border-slate-200 shadow-xs hover:border-amber-300 transition-colors">
                <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <div className="text-left min-w-0">
                  <div className="text-xs font-bold text-slate-800 truncate">Safe & Approved</div>
                  <div className="text-[10px] xl:text-[11px] text-slate-500 truncate">Approved members only</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2.5 xl:p-3 rounded-xl bg-white border border-slate-200 shadow-xs hover:border-blue-300 transition-colors">
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                  <Activity className="w-4 h-4" />
                </div>
                <div className="text-left min-w-0">
                  <div className="text-xs font-bold text-slate-800 truncate">Instant Reports</div>
                  <div className="text-[10px] xl:text-[11px] text-slate-500 truncate">See sent & received status</div>
                </div>
              </div>
            </div>

            {/* Desktop: Notice Box */}
            <div className="hidden lg:flex items-start gap-2.5 p-2.5 xl:p-3 rounded-xl bg-amber-50/80 border border-amber-200 max-w-xl text-left">
              <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
              <p className="text-[11px] xl:text-xs text-amber-950 leading-relaxed">
                <strong className="text-amber-900 font-bold">Important Notice:</strong> This messaging service is for authorized 10RCDG personnel. Please sign in with your approved Google account.
              </p>
            </div>
          </div>

          {/* Right Column: Google Sign In Card */}
          <div className="lg:col-span-5 w-full flex flex-col items-center space-y-3">
            <div className="w-full max-w-md relative corner-bracket-light bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 xl:p-8 shadow-xl">
              
              {/* Card Header */}
              <div className="mb-4 xl:mb-5 text-center space-y-1">
                <div className="inline-flex items-center justify-center w-10 h-10 xl:w-12 xl:h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 mb-1 shadow-xs">
                  <Shield className="w-5 h-5 xl:w-6 xl:h-6" />
                </div>
                <h2 className="text-lg xl:text-xl font-extrabold text-slate-900 tracking-tight">
                  Welcome to RESCOM ALERT
                </h2>
                <p className="text-[11px] xl:text-xs text-slate-500">
                  10th Regional Community Defense Group Portal
                </p>
              </div>

              {/* Account Suspended by Command Notice with Live Digital Countdown */}
              {isSuspended && (
                <SuspensionCountdown
                  suspendedUntil={suspendedUntil}
                  suspendedDuration={suspendedDuration}
                  suspendedReason={suspendedReason}
                />
              )}

              {/* Access Revoked Security Banner */}
              {isRevoked && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-left flex items-start gap-2.5 animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-red-900">
                      Access Revoked
                    </p>
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
                    <p className="text-xs font-bold text-red-900">
                      Access Denied: Account Not Authorized
                    </p>
                    <p className="text-[11px] text-red-700 leading-relaxed mt-0.5">
                      Your Google account is not on the approved 10RCDG personnel roster. Please contact the Group Commander for access authorization.
                    </p>
                  </div>
                </div>
              )}

              {/* Direct NextAuth Google Sign In Form */}
              <form
                action={async () => {
                  "use server";
                  await signIn("google", { redirectTo: "/dashboard" });
                }}
                className="w-full space-y-3"
              >
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 xl:py-3.5 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-300 hover:border-emerald-600 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.99] cursor-pointer"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" viewBox="0 0 24 24">
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
                  <span>Continue with Google</span>
                </button>
              </form>

              {/* Security & System Details */}
              <div className="mt-4 xl:mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] xl:text-xs text-slate-500">
                <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Official & Secure
                </span>
                <span className="text-slate-400 font-medium">10RCDG Portal</span>
              </div>
            </div>

            {/* Help & Official Facebook Channel */}
            <div className="flex flex-col items-center gap-1 px-4 text-center">
              <p className="text-[10px] xl:text-xs text-slate-500">
                Need account authorization or assistance?
              </p>
              <a
                href="https://www.facebook.com/profile.php?id=61586365277137"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 hover:underline transition-colors bg-white/80 hover:bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-xs"
              >
                <svg className="w-3.5 h-3.5 text-[#1877F2] shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span>Contact 10RCDG Official Page</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            </div>

            {/* Mobile Only: 3 Feature Highlight Cards (Placed below sign-in card) */}
            <div className="lg:hidden w-full max-w-md grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs">
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                  <Radio className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-slate-800">Fast Group SMS</div>
                  <div className="text-[10px] text-slate-500">Reach everyone in seconds</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs">
                <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                  <Shield className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-slate-800">Safe & Approved</div>
                  <div className="text-[10px] text-slate-500">Approved members only</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs">
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                  <Activity className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-slate-800">Instant Reports</div>
                  <div className="text-[10px] text-slate-500">See sent & received status</div>
                </div>
              </div>
            </div>

            {/* Mobile Only: Notice Box */}
            <div className="lg:hidden w-full max-w-md p-2.5 rounded-xl bg-amber-50/90 border border-amber-200 text-left flex items-start gap-2">
              <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-950 leading-relaxed">
                Authorized 10RCDG personnel only. Please sign in with your approved Google account.
              </p>
            </div>
          </div>

        </div>
      </main>

      {/* Responsive Bottom Footer — Pinned at the very bottom */}
      <footer className="w-full z-20 shrink-0 flex flex-col sm:flex-row items-center justify-between px-4 sm:px-8 py-2.5 lg:py-3 border-t border-slate-200/80 bg-white/80 backdrop-blur-md text-xs text-slate-500 gap-1 sm:gap-0 text-center sm:text-left">
        <div>
          © {new Date().getFullYear()} 10th RCDG, Reserve Command, Philippine Army.
        </div>
        <div className="flex items-center gap-2 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span className="text-emerald-700 font-semibold">Official Mass Messaging System</span>
        </div>
      </footer>
    </div>
  );
}
