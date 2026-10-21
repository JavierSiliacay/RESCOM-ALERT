"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Shield,
  Smartphone,
  Download,
  ArrowRight,
  Radio,
  CheckCircle2,
  FileText,
  MapPin,
  BookOpen,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { PublicHeader } from "@/components/public-header";
import { RescomAiAvatar } from "@/components/rescom-ai-avatar";

interface PublicLandingViewProps {
  isOfficerLoggedIn: boolean;
  officerName?: string;
  officerRank?: string;
}

export function PublicLandingView({
  isOfficerLoggedIn,
  officerName,
  officerRank,
}: PublicLandingViewProps) {
  const downloadUrl = "https://www.rescom-alert.site/download";

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col justify-between selection:bg-emerald-100 selection:text-emerald-900">
      {/* Official 10RCDG Troops Formation Background with Soft Frosted Overlay */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <Image
          src="/rescom-bg.jpg"
          alt="10RCDG Troops Formation"
          fill
          className="object-cover object-center opacity-15"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50/90 via-slate-50/95 to-slate-50 tactical-grid-light" />
      </div>

      {/* Main Public Header */}
      <PublicHeader
        isOfficerLoggedIn={isOfficerLoggedIn}
        officerName={officerName}
        officerRank={officerRank}
      />

      <main className="relative z-10 flex-1 flex flex-col justify-center py-8 sm:py-12 md:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-10 sm:space-y-12">
          
          {/* ====================================================
              HERO / CORE ACCESS PORTAL
             ==================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Column: Official Briefing & Mission */}
            <div className="lg:col-span-7 space-y-5 sm:space-y-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-900">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                  <span className="truncate">Official Public Portal • Northern Mindanao (Region X)</span>
                </div>
                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-950 leading-[1.18]">
                  Official Mass Notification & Readiness System
                </h1>
              </div>

              <p className="text-sm sm:text-base lg:text-lg text-slate-600 leading-relaxed max-w-xl">
                The official emergency broadcast, readiness, and military science gateway for the{" "}
                <strong className="text-slate-900 font-semibold">
                  10th Regional Community Defense Group (10RCDG)
                </strong>
                , Reserve Command, Philippine Army. Supporting Ready Reservists and Basic ROTC Cadets across Northern Mindanao for civil defense and national readiness.
              </p>

              {/* Direct Actions: Adaptive Thumb-Friendly Mobile Stacking */}
              <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
                <Link
                  href="/download"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm transition-all duration-150 active:scale-98"
                >
                  <Smartphone className="w-4 h-4 shrink-0" />
                  <span>Download Mobile App (APK v1.1.0)</span>
                  <ArrowRight className="w-4 h-4 ml-0.5 shrink-0" />
                </Link>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
                  <Link
                    href="/rescom-ai"
                    className="inline-flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-300 font-bold text-xs sm:text-sm transition-all shadow-xs hover:shadow-sm active:scale-98 group"
                    title="Launch RESCOM AI Assistant"
                  >
                    <RescomAiAvatar size="sm" className="group-hover:scale-105 transition-transform" />
                    <div className="text-left">
                      <div className="leading-tight text-slate-950 font-bold">RESCOM AI</div>
                      <div className="text-[10px] text-emerald-700 font-medium leading-none">ROTC Guide</div>
                    </div>
                  </Link>

                  <Link
                    href="/download/guide"
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-semibold text-xs sm:text-sm shadow-xs transition-colors"
                  >
                    <FileText className="w-4 h-4 text-slate-600 shrink-0" />
                    <span className="truncate">Setup Guide</span>
                  </Link>
                </div>
              </div>

              {/* Verified Mandate Notice */}
              <div className="pt-2 flex items-center gap-2 text-xs text-slate-500">
                <Shield className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Operating under Republic Act No. 7077 (Citizen Armed Forces) & RA 9163 (ROTC)</span>
              </div>
            </div>

            {/* Right Column: Direct Download QR & Card */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-7 space-y-4 sm:space-y-5 text-center">
                {/* Official Insignia Pairing */}
                <div className="flex items-center justify-center gap-3">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-slate-200 p-0.5 bg-slate-50 flex items-center justify-center shadow-xs">
                    <Image
                      src="/rescom-pa-seal.png"
                      alt="Philippine Army RESCOM Seal"
                      width={44}
                      height={44}
                      className="object-contain"
                    />
                  </div>
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-slate-200 p-0.5 bg-slate-50 flex items-center justify-center shadow-xs">
                    <Image
                      src="/rescom-emblem.jpg"
                      alt="10RCDG Emblem"
                      width={44}
                      height={44}
                      className="object-contain"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <h2 className="text-base font-bold text-slate-900">
                    RESCOM ALERT for Android
                  </h2>
                  <p className="text-xs text-slate-500 font-mono">
                    Version 1.1.0 
                  </p>
                </div>

                {/* Desktop/Tablet: QR Code (Point Phone Camera at Screen) */}
                <div className="hidden sm:inline-block p-4 bg-slate-50 rounded-xl border border-slate-200 mx-auto">
                  <QRCodeSVG
                    value={downloadUrl}
                    size={140}
                    level="M"
                    includeMargin={false}
                  />
                  <div className="text-[11px] text-slate-500 font-mono mt-2">
                    Scan with phone camera
                  </div>
                </div>

                {/* Mobile Viewports: Direct Mobile Device Ready Card (No un-scannable QR code on mobile) */}
                <div className="sm:hidden p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200 text-left space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-950">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>Direct Device Installation Ready</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Tap the button below to download the official Android APK directly to your phone.
                  </p>
                </div>

                <div className="pt-1 space-y-2">
                  <Link
                    href="/download"
                    className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>Open Download Hub</span>
                  </Link>

                  <p className="text-[11px] text-slate-400">
                    Compatible with Android 8.0 through Android 15
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* ====================================================
              REAL OPERATIONAL CAPABILITIES (4 CLEAN PILLARS)
             ==================================================== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-4">
            
            <div className="p-5 sm:p-6 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center">
                <Radio className="w-5 h-5 text-emerald-700" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Emergency Alert Broadcasts
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Direct transmission of critical disaster warnings, civil defense instructions, and mobilization orders from unit commanders to personnel devices.
              </p>
            </div>

            <div className="p-5 sm:p-6 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center">
                <Shield className="w-5 h-5 text-emerald-700" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Official Roster Verification
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Enlisted Ready Reservists pair their registered Philippine mobile phone (+63) to verify unit readiness, CDC battalion assignment, and muster locations.
              </p>
            </div>

            <div className="p-5 sm:p-6 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-emerald-700" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                High-Priority Audio Override
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Android background audio service capable of sounding evacuation sirens during Red Alert dispatches, even when phones are set to Silent or Do Not Disturb.
              </p>
            </div>

            <div className="p-5 sm:p-6 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-emerald-700" />
                </div>
                <RescomAiAvatar size="sm" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Basic ROTC Military Science
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Dedicated learning reference for tertiary cadets: 11 General Orders, Philippine Army ranks, AFP core values, military courtesy, and interior guard duty.
              </p>
              <Link
                href="/rescom-ai"
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 hover:text-emerald-700 hover:underline pt-1"
              >
                <span>Study with RESCOM AI</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

          </div>

        </div>
      </main>

      {/* ====================================================
          MINIMAL, DIGNIFIED GOVERNMENT FOOTER
         ==================================================== */}
      <footer className="relative z-10 border-t border-slate-200 bg-white/95 py-6 text-slate-500 text-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-600 text-center sm:text-left">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Camp Evangelista, Patag, Cagayan de Oro City, Northern Mindanao</span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span>© {new Date().getFullYear()} 10RCDG, PA • Reserve Command</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
