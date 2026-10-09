import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Volume2,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

interface GuideStep {
  step: number;
  title: string;
  tagalogSummary: string;
  instructions: string[];
  imageSrc: string;
  imageAlt: string;
  badgeText?: string;
  phase: "INSTALL" | "PERMISSIONS";
}

const STEPS: GuideStep[] = [
  {
    step: 1,
    phase: "INSTALL",
    title: "Open Downloaded APK with Package Installer",
    tagalogSummary: "Buksan ang rescom-alert.apk gamit ang Package installer.",
    instructions: [
      "Pumunta sa inyong Downloads folder o sa browser notification.",
      "Pindutin ang file na rescom-alert.apk.",
      'Sa "Open with" pop-up, piliin ang Package installer at pindutin ang "Just once" o "Always".',
    ],
    imageSrc: "/installation-guide/Step1.jpg",
    imageAlt: "Step 1: Open with Package installer",
  },
  {
    step: 2,
    phase: "INSTALL",
    title: "Confirm App Installation",
    tagalogSummary: "Pindutin ang Install sa lalabas na prompt.",
    instructions: [
      'Lalabas ang system prompt: "RESCOM ALERT — Do you want to install this app?".',
      'Pindutin ang "Install".',
    ],
    imageSrc: "/installation-guide/Step2.jpg",
    imageAlt: "Step 2: Install prompt",
  },
  {
    step: 3,
    phase: "INSTALL",
    title: "Google Play Protect Block Warning",
    tagalogSummary: 'Haharangin ng Google Play Protect. Pindutin ang "Got it".',
    instructions: [
      'Dahil may direct SMS capabilities ang military tool, lalabas ang babala na "App blocked to protect your device".',
      'Kung walang "Install anyway" button, pindutin ang "Got it".',
      "Susunod, pansamantalang papatayin natin ang Play Protect scanning sa Google Play Store (Steps 4–7).",
    ],
    imageSrc: "/installation-guide/Step3.jpg",
    imageAlt: "Step 3: Play Protect block",
    badgeText: "PLAY PROTECT BLOCK",
  },
  {
    step: 4,
    phase: "INSTALL",
    title: "Open Google Play Store & Tap Profile",
    tagalogSummary: "Buksan ang Play Store at pindutin ang inyong Profile Icon.",
    instructions: [
      "Pumunta sa home screen at buksan ang Google Play Store app.",
      "Pindutin ang inyong Profile Picture / Icon sa kanang itaas (top-right corner).",
    ],
    imageSrc: "/installation-guide/Step4.jpg",
    imageAlt: "Step 4: Google Play Store profile icon",
  },
  {
    step: 5,
    phase: "INSTALL",
    title: "Select Play Protect in Menu",
    tagalogSummary: 'Piliin ang "Play Protect" mula sa account menu.',
    instructions: [
      'Sa bubukas na account menu, hanapin at pindutin ang "Play Protect" (may shield icon).',
    ],
    imageSrc: "/installation-guide/Step5.jpg",
    imageAlt: "Step 5: Play Protect menu option",
  },
  {
    step: 6,
    phase: "INSTALL",
    title: "Open Play Protect Settings Gear",
    tagalogSummary: "Pindutin ang Settings Gear (⚙️) sa kanang itaas.",
    instructions: [
      "Sa Play Protect screen, pindutin ang Settings gear icon (⚙️) sa kanang itaas.",
    ],
    imageSrc: "/installation-guide/Step6.jpg",
    imageAlt: "Step 6: Play Protect settings gear",
  },
  {
    step: 7,
    phase: "INSTALL",
    title: 'Turn Off "Scan apps with Play Protect" & Re-Install',
    tagalogSummary: "I-off ang toggle at bumalik sa Downloads para i-install ang APK.",
    instructions: [
      'I-toggle patayin ang "Scan apps with Play Protect" (pindutin ang "Turn off" sa confirmation dialog).',
      "Bumalik sa inyong Downloads folder at pindutin muli ang rescom-alert.apk.",
      'Pindutin ang "Install" — magtutuloy na ang pag-install nang maayos!',
    ],
    imageSrc: "/installation-guide/Step7.jpg",
    imageAlt: "Step 7: Turn off Play Protect app scanning",
    badgeText: "BYPASS COMPLETE",
  },
  {
    step: 8,
    phase: "PERMISSIONS",
    title: 'Allow Text Messages (SMS) in RESCOM ALERT',
    tagalogSummary: 'Buksan ang RESCOM ALERT at i-allow ang "Read text messages".',
    instructions: [
      "Buksan ang RESCOM ALERT app pagkatapos ma-install. Pupunta ito sa Phone Setup tab.",
      'Sa tapat ng "Read text messages", pindutin ang berdeng button na "ALLOW".',
      'Pindutin ang "Allow" sa Android permission dialog.',
    ],
    imageSrc: "/installation-guide/Step8.jpg",
    imageAlt: "Step 8: Allow text messages",
  },
  {
    step: 9,
    phase: "PERMISSIONS",
    title: 'Keep Running in Background (Battery Optimization)',
    tagalogSummary: 'Sa "Keep running in background", pindutin ang "FIX NOW".',
    instructions: [
      "Berde na ang Read text messages (ON).",
      'Sa ilalim ng "Keep running in background", pindutin ang "FIX NOW".',
    ],
    imageSrc: "/installation-guide/Step9.jpg",
    imageAlt: "Step 9: Fix running in background",
  },
  {
    step: 10,
    phase: "PERMISSIONS",
    title: 'Allow Background Execution in Battery Prompt',
    tagalogSummary: 'Pindutin ang "Allow" sa system dialog upang hindi mapatay ang siren.',
    instructions: [
      'Lalabas ang system battery prompt: "Let app always run in background?".',
      'Pindutin ang "Allow". Ito ay para hindi i-sleep ng Android ang siren kahit naka-lock ang phone.',
    ],
    imageSrc: "/installation-guide/Step10.jpg",
    imageAlt: "Step 10: Allow always run in background",
  },
  {
    step: 11,
    phase: "PERMISSIONS",
    title: 'Enable Display Over Apps & Lock Screen',
    tagalogSummary: 'Pindutin ang "ENABLE" sa Display over apps & lock screen.',
    instructions: [
      "Berde na ang Keep running in background (ON).",
      'Sa tapat ng "Display over apps & lock screen", pindutin ang berdeng button na "ENABLE".',
    ],
    imageSrc: "/installation-guide/Step11.jpg",
    imageAlt: "Step 11: Enable display over apps",
  },
  {
    step: 12,
    phase: "PERMISSIONS",
    title: 'Turn On Switch in "Display Over Other Apps"',
    tagalogSummary: "Hanapin ang RESCOM ALERT sa listahan at i-on ang toggle switch.",
    instructions: [
      'Sa Android settings list ng "Display Over Other Apps", hanapin ang RESCOM ALERT.',
      "Pindutin ang toggle switch upang maging ON (kulay asul o berde).",
      "Pindutin ang Back button ng inyong telepono upang bumalik sa app.",
    ],
    imageSrc: "/installation-guide/Step12.jpg",
    imageAlt: "Step 12: Toggle display over other apps switch",
  },
  {
    step: 13,
    phase: "PERMISSIONS",
    title: 'Tap ENABLE for Full Screen Lock Notification',
    tagalogSummary: 'Pindutin muli ang "ENABLE" para sa huling lock screen permission.',
    instructions: [
      'Pagkabalik sa RESCOM ALERT app, pindutin muli ang "ENABLE" sa tapat ng "Display over apps & lock screen".',
    ],
    imageSrc: "/installation-guide/Step13.jpg",
    imageAlt: "Step 13: Tap ENABLE for full screen notifications",
  },
  {
    step: 14,
    phase: "PERMISSIONS",
    title: 'Allow Full Screen Notifications When Locked',
    tagalogSummary: 'I-on ang toggle switch para lumabas ang siren kahit naka-lock ang phone.',
    instructions: [
      'Sa Android system screen ng "Show full screen notifications", i-on ang toggle:',
      '"Allow app to show full screen notifications when the device is locked".',
      "Pindutin ang Back button upang bumalik sa RESCOM ALERT.",
    ],
    imageSrc: "/installation-guide/Step14.jpg",
    imageAlt: "Step 14: Show full screen notifications toggle",
    badgeText: "SIREN FULLY ARMED",
  },
];

export default function InstallationGuidePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased selection:bg-emerald-100 selection:text-emerald-900 pb-16">
      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/download"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Download Page</span>
          </Link>
          <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            10RCDG TROOP MANUAL
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-8 space-y-6">
        {/* Header Hero */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs text-center space-y-3">
          <div className="inline-block font-mono text-[11px] font-bold tracking-wider uppercase bg-emerald-900 text-emerald-100 px-3 py-1 rounded-full">
            OFFICIAL INSTALLATION GUIDE
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            RESCOM ALERT Mobile App Setup
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
            Kumpletong 14-Step Visual Guide para sa mga sundalo at reservists kung paano i-bypass ang Google Play Protect block at i-activate ang emergency siren permissions.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-slate-500">
            <span className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg">
              <Radio className="w-3.5 h-3.5 text-emerald-700" />
              100% Offline GSM
            </span>
            <span className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg">
              <Volume2 className="w-3.5 h-3.5 text-emerald-700" />
              Bypasses Silent Mode
            </span>
            <span className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              Official 10RCDG App
            </span>
          </div>
        </div>

        {/* Warning Callout */}
        <div className="p-4 sm:p-5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 space-y-1.5 shadow-2xs">
          <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-amber-950">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Paalala ukol sa Google Play Protect Block:</span>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed pl-6">
            Dahil may kakayahang magbasa ng emergency broadcast SMS ang RESCOM ALERT kahit walang internet, awtomatikong haharangin ito ng Google Play Protect kapag walang lumabas na <em>&quot;Install anyway&quot;</em> button. Sundin ang <strong>Steps 1 hanggang 7</strong> sa ibaba upang pansamantalang patayin ang Play Protect scanning habang nag-iinstall.
          </p>
        </div>

        {/* Phase 1 Header */}
        <div className="flex items-center justify-between p-3.5 bg-emerald-900 text-white rounded-2xl shadow-xs">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-700 text-emerald-100 text-xs font-bold flex items-center justify-center">
              1
            </span>
            <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wide">
              Phase 1: Play Protect Bypass &amp; APK Install
            </span>
          </div>
          <span className="text-[11px] font-mono font-bold bg-white/20 px-2.5 py-0.5 rounded-full">
            Steps 1–7
          </span>
        </div>

        {/* Phase 1 Steps */}
        <div className="space-y-4">
          {STEPS.filter((s) => s.phase === "INSTALL").map((s) => (
            <div
              key={s.step}
              className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs grid grid-cols-1 md:grid-cols-[1fr_260px] gap-4 sm:gap-6 items-center"
            >
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-800 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {s.step}
                  </span>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                    {s.title}
                  </h3>
                  {s.badgeText && (
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md border border-amber-200">
                      {s.badgeText}
                    </span>
                  )}
                </div>

                <p className="text-xs font-semibold text-emerald-800 bg-emerald-50/80 px-2.5 py-1.5 rounded-lg border border-emerald-100">
                  {s.tagalogSummary}
                </p>

                <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside pl-1">
                  {s.instructions.map((inst, i) => (
                    <li key={i} className="leading-relaxed">
                      {inst}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex justify-center">
                <div className="relative w-full max-w-[220px] aspect-[9/18] rounded-xl overflow-hidden border border-slate-300 shadow-sm bg-slate-100">
                  <Image
                    src={s.imageSrc}
                    alt={s.imageAlt}
                    fill
                    sizes="(max-width: 768px) 220px, 260px"
                    className="object-contain"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Phase 2 Header */}
        <div className="flex items-center justify-between p-3.5 bg-emerald-900 text-white rounded-2xl shadow-xs mt-8">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-700 text-emerald-100 text-xs font-bold flex items-center justify-center">
              2
            </span>
            <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wide">
              Phase 2: In-App Emergency Siren Permissions
            </span>
          </div>
          <span className="text-[11px] font-mono font-bold bg-white/20 px-2.5 py-0.5 rounded-full">
            Steps 8–14
          </span>
        </div>

        {/* Phase 2 Steps */}
        <div className="space-y-4">
          {STEPS.filter((s) => s.phase === "PERMISSIONS").map((s) => (
            <div
              key={s.step}
              className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs grid grid-cols-1 md:grid-cols-[1fr_260px] gap-4 sm:gap-6 items-center"
            >
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-800 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {s.step}
                  </span>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                    {s.title}
                  </h3>
                  {s.badgeText && (
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-md border border-emerald-300">
                      {s.badgeText}
                    </span>
                  )}
                </div>

                <p className="text-xs font-semibold text-emerald-800 bg-emerald-50/80 px-2.5 py-1.5 rounded-lg border border-emerald-100">
                  {s.tagalogSummary}
                </p>

                <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside pl-1">
                  {s.instructions.map((inst, i) => (
                    <li key={i} className="leading-relaxed">
                      {inst}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex justify-center">
                <div className="relative w-full max-w-[220px] aspect-[9/18] rounded-xl overflow-hidden border border-slate-300 shadow-sm bg-slate-100">
                  <Image
                    src={s.imageSrc}
                    alt={s.imageAlt}
                    fill
                    sizes="(max-width: 768px) 220px, 260px"
                    className="object-contain"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Finished Ready Card */}
        <div className="p-6 bg-emerald-50 border border-emerald-300 rounded-3xl text-center space-y-2 shadow-xs">
          <div className="w-12 h-12 bg-emerald-700 text-white rounded-2xl flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-black text-emerald-950">
            SIREN PROTECTION IS ACTIVE
          </h2>
          <p className="text-xs text-emerald-800 max-w-md mx-auto leading-relaxed">
            Nakahanda na ang inyong telepono! Kapag nagpadala ang 10RCDG ng emergency broadcast, tutunog ang siren kahit naka-lock o walang internet ang inyong cellphone.
          </p>
          <div className="pt-2">
            <Link
              href="/download"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              <span>Download APK / Return</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
