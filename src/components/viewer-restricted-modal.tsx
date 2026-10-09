"use client";

import React, { useEffect } from "react";
import { ShieldAlert, Lock, X, AlertTriangle, Shield, User } from "lucide-react";

interface ViewerRestrictedModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionLabel?: string;
  officerName?: string;
  officerEmail?: string;
  officerRole?: string;
}

export function ViewerRestrictedModal({
  isOpen,
  onClose,
  actionLabel,
  officerName,
  officerEmail,
  officerRole = "VIEWER",
}: ViewerRestrictedModalProps) {
  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="viewer-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      {/* Click outside backdrop to close */}
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-rose-200/80 overflow-hidden z-10 transition-all scale-100 animate-in zoom-in-95 duration-200">
        {/* Top Military Warning Banner */}
        <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-amber-900 px-6 py-4 flex items-center justify-between text-white border-b border-rose-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/20 rounded-xl border border-rose-400/30 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-rose-300 animate-pulse" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-rose-200 font-semibold flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-rose-300" />
                <span>Security Clearance Restriction</span>
              </div>
              <h3 id="viewer-modal-title" className="text-base font-extrabold tracking-tight">
                Access Restricted: Viewer Role
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-rose-200 hover:text-white hover:bg-rose-700/60 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Main Notice Callout */}
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 flex items-start gap-3.5 shadow-2xs">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-semibold leading-relaxed">
                Your role is viewer only and you&apos;re not allowed or authorize to this command, please request to the system administrators.
              </p>
              {actionLabel && (
                <p className="text-xs text-rose-700 font-mono pt-1">
                  Blocked Command: <span className="font-bold underline decoration-rose-400">&ldquo;{actionLabel}&rdquo;</span>
                </p>
              )}
            </div>
          </div>

          {/* Officer Clearance Details */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="text-[11px] font-mono uppercase text-slate-500 font-bold tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              <span>Current Account Profile</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-mono">Assigned Clearance</span>
                <span className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-amber-100 text-amber-900 border border-amber-300">
                  <User className="w-3 h-3 text-amber-700" />
                  {officerRole || "VIEWER"} (Read-Only)
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-mono">Authorized Actions</span>
                <span className="text-slate-700 font-medium block mt-0.5">
                  View Rosters &amp; Telemetry
                </span>
              </div>
            </div>
            {officerEmail && (
              <div className="pt-2 border-t border-slate-200/80 text-[11px] text-slate-500 font-mono truncate">
                Signed in as: <span className="font-semibold text-slate-700">{officerName ? `${officerName} (${officerEmail})` : officerEmail}</span>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Personnel with <strong>Viewer</strong> access have read-only privileges across unit directories, messaging broadcasts, and contact groups. Modifications, insertions, and deletions require <strong>Admin</strong> or <strong>Group Commander</strong> operational clearance.
          </p>
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 active:scale-98 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            Understood &amp; Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
