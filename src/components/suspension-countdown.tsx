"use client";

import React, { useState, useEffect } from "react";
import { Clock, ShieldAlert, ShieldCheck, CheckCircle2 } from "lucide-react";

interface SuspensionCountdownProps {
  suspendedUntil?: string | number | null;
  suspendedDuration?: string;
  suspendedReason?: string;
}

export function SuspensionCountdown({
  suspendedUntil,
  suspendedDuration = "Indefinite",
  suspendedReason = "Administrative Review",
}: SuspensionCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
    isExpired: boolean;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalSeconds: 0,
    isExpired: false,
  });

  const targetTimestamp = suspendedUntil
    ? typeof suspendedUntil === "number"
      ? suspendedUntil
      : Date.parse(suspendedUntil)
    : null;

  const isIndefinite =
    !targetTimestamp ||
    isNaN(targetTimestamp) ||
    suspendedDuration.toLowerCase().includes("indefinite");

  useEffect(() => {
    if (isIndefinite || !targetTimestamp) return;

    const calculateTime = () => {
      const diffMs = targetTimestamp - Date.now();
      if (diffMs <= 0) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          totalSeconds: 0,
          isExpired: true,
        });
        return;
      }

      const totalSeconds = Math.floor(diffMs / 1000);
      const days = Math.floor(totalSeconds / (3600 * 24));
      const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      setTimeLeft({
        days,
        hours,
        minutes,
        seconds,
        totalSeconds,
        isExpired: false,
      });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [targetTimestamp, isIndefinite]);

  // Formatted date string for exact auto-reactivation
  const targetDateFormatted = targetTimestamp && !isNaN(targetTimestamp)
    ? new Date(targetTimestamp).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : null;

  if (timeLeft.isExpired) {
    return (
      <div className="mb-4 p-3.5 rounded-xl bg-emerald-50/90 border border-emerald-300 text-left space-y-2 animate-in fade-in duration-300">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
              <span>Suspension Concluded</span>
              <span className="px-1.5 py-0.2 bg-emerald-200/80 text-emerald-900 rounded text-[9px] font-extrabold uppercase font-mono">
                Active
              </span>
            </p>
            <p className="text-[11px] text-emerald-800 leading-relaxed mt-0.5 font-medium">
              Your temporary suspension has expired and operational clearance has been restored automatically.
            </p>
          </div>
        </div>
        <div className="p-2 rounded-lg bg-emerald-100/60 border border-emerald-200 text-[11px] text-emerald-900 font-semibold flex items-center justify-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
          <span>You may now sign in with Google below.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 p-3.5 rounded-xl bg-amber-50/90 border border-amber-300 text-left space-y-2.5 animate-in fade-in duration-200">
      <div className="flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-amber-950">
              Account Suspended by Command
            </p>
            {!isIndefinite && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-200/80 text-amber-900 text-[9px] font-mono font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                Live Timer
              </span>
            )}
          </div>
          <p className="text-[11px] text-amber-900 leading-relaxed mt-0.5">
            Your operational clearance has been temporarily suspended by 10RCDG Command.
          </p>
        </div>
      </div>

      {/* Suspension Metadata Details */}
      <div className="p-2.5 rounded-lg bg-amber-100/60 border border-amber-200 text-[11px] space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-amber-800 uppercase text-[10px]">Reason:</span>
          <span className="font-bold text-amber-950 text-right truncate ml-2">
            {suspendedReason}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-semibold text-amber-800 uppercase text-[10px]">Duration:</span>
          <span className="font-bold text-amber-950">
            {suspendedDuration}
          </span>
        </div>

        {/* Live Digital Countdown Timer if duration has an expiry */}
        {!isIndefinite && (
          <div className="pt-2 border-t border-amber-200/70 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold text-amber-900 uppercase tracking-wide">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-700" />
                Lifting In:
              </span>
              {targetDateFormatted && (
                <span className="font-mono text-amber-800 font-normal text-[9px]">
                  Until {targetDateFormatted}
                </span>
              )}
            </div>

            {/* Tactical Digital Countdown Blocks */}
            <div className="grid grid-cols-4 gap-1.5 text-center font-mono">
              <div className="bg-white/80 border border-amber-300/80 rounded-md py-1 px-0.5 shadow-2xs">
                <div className="text-sm font-extrabold text-amber-950 leading-none">
                  {String(timeLeft.days).padStart(2, "0")}
                </div>
                <div className="text-[8px] font-bold text-amber-700 uppercase tracking-wider mt-0.5">
                  Days
                </div>
              </div>
              <div className="bg-white/80 border border-amber-300/80 rounded-md py-1 px-0.5 shadow-2xs">
                <div className="text-sm font-extrabold text-amber-950 leading-none">
                  {String(timeLeft.hours).padStart(2, "0")}
                </div>
                <div className="text-[8px] font-bold text-amber-700 uppercase tracking-wider mt-0.5">
                  Hours
                </div>
              </div>
              <div className="bg-white/80 border border-amber-300/80 rounded-md py-1 px-0.5 shadow-2xs">
                <div className="text-sm font-extrabold text-amber-950 leading-none">
                  {String(timeLeft.minutes).padStart(2, "0")}
                </div>
                <div className="text-[8px] font-bold text-amber-700 uppercase tracking-wider mt-0.5">
                  Mins
                </div>
              </div>
              <div className="bg-white/80 border border-amber-300/80 rounded-md py-1 px-0.5 shadow-2xs">
                <div className="text-sm font-extrabold text-amber-950 leading-none">
                  {String(timeLeft.seconds).padStart(2, "0")}
                </div>
                <div className="text-[8px] font-bold text-amber-700 uppercase tracking-wider mt-0.5">
                  Secs
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="text-[10px] text-amber-800 italic">
        {isIndefinite
          ? "Please report to the Group Commander or S3 Operations for clearance reinstatement."
          : "Your account will automatically reactivate once the countdown timer reaches zero."}
      </p>
    </div>
  );
}
