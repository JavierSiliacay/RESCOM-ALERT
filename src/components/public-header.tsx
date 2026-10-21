"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Smartphone, CheckCircle2 } from "lucide-react";
import { RescomAiAvatar } from "@/components/rescom-ai-avatar";

interface PublicHeaderProps {
  isOfficerLoggedIn?: boolean;
  officerName?: string;
  officerRank?: string;
  onOpenAiAssistant?: () => void;
}

export function PublicHeader({
  isOfficerLoggedIn = false,
  officerName,
  officerRank,
  onOpenAiAssistant,
}: PublicHeaderProps) {
  const [pstTime, setPstTime] = useState("");

  // Live Philippine Standard Time clock (UTC+8)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatted = now.toLocaleTimeString("en-PH", {
        timeZone: "Asia/Manila",
        hour12: true,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setPstTime(formatted);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 text-slate-900 transition-all shadow-xs">
      {/* Official Government Masthead Strip (GOV.PH / AFP Standard) */}
      <div className="w-full bg-slate-100/90 border-b border-slate-200/80 px-3 sm:px-6 lg:px-8 py-1.5 text-[11px] text-slate-600">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 truncate min-w-0">
            <span className="hidden md:inline text-slate-500">Reserve Command Philippine Army •</span>
            <span className="truncate">10th Regional Community Defense Group</span>
          </div>
          <div className="flex items-center gap-1 text-slate-500 font-mono text-[10px] sm:text-[11px] shrink-0">
            <span className="hidden sm:inline">PST:</span>
            <span className="font-semibold text-slate-800">{pstTime || "12:00 PM"}</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2">
        {/* Official Identity with Dual Heraldic Seals */}
        <Link href="/" className="flex items-center gap-2 sm:gap-3 group min-w-0 shrink">
          <div className="flex items-center -space-x-2 shrink-0">
            <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden border border-amber-500/80 ring-2 ring-emerald-50 bg-white shadow-xs z-10 flex items-center justify-center">
              <Image
                src="/rescom-pa-seal.png"
                alt="Philippine Army Seal"
                fill
                sizes="32px"
                className="object-cover scale-105"
                priority
              />
            </div>
            <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden border border-amber-500/80 ring-2 ring-emerald-50 bg-white shadow-xs flex items-center justify-center">
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
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm sm:text-base text-slate-950 tracking-tight group-hover:text-emerald-800 transition-colors whitespace-nowrap">
                RESCOM ALERT
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                10RCDG
              </span>
            </div>
            <p className="hidden md:block text-[11px] text-slate-500 font-medium leading-none truncate">
              Camp Evangelista, Cagayan de Oro City
            </p>
          </div>
        </Link>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* RESCOM AI Assistant Trigger with Mascot Avatar */}
          <Link
            href="/rescom-ai"
            className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-300/80 text-xs font-bold transition-all shadow-2xs hover:shadow-xs active:scale-98"
            title="Open RESCOM AI Assistant"
          >
            <RescomAiAvatar size="xs" className="sm:w-8 sm:h-8" />
            <span className="hidden xs:inline">RESCOM AI</span>
          </Link>

          {/* Download App button: Visible on tablet/desktop, Hero has primary button on mobile */}
          <Link
            href="/download"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-800 hover:bg-emerald-700 text-white font-medium text-xs transition-colors shadow-xs"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Download App</span>
          </Link>

          {isOfficerLoggedIn && (
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors shadow-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">
                Console: {officerRank ? `${officerRank} ` : ""}{officerName || "Officer"}
              </span>
              <span className="sm:hidden text-xs">Console</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
