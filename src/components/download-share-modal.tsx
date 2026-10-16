"use client";

import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import {
  X,
  Copy,
  Check,
  QrCode,
  Share2,
  Download,
  ExternalLink,
  ShieldCheck,
  KeyRound,
  Clock,
  Radio,
} from "lucide-react";

interface DownloadShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  portal: {
    passcode?: string;
    duration?: string;
    expiresAt?: number;
    title?: string;
  } | null;
}

export function DownloadShareModal({
  isOpen,
  onClose,
  portal,
}: DownloadShareModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedViber, setCopiedViber] = useState(false);
  const [copiedPasscode, setCopiedPasscode] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const publicUrl = `${origin}/download`;

  useEffect(() => {
    if (publicUrl && isOpen) {
      QRCode.toDataURL(publicUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: "#064e3b", // Emerald dark
          light: "#ffffff",
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error("QR Code Error:", err));
    }
  }, [publicUrl, isOpen]);

  if (!isOpen || !portal) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyPasscode = () => {
    if (!portal.passcode) return;
    navigator.clipboard.writeText(portal.passcode);
    setCopiedPasscode(true);
    setTimeout(() => setCopiedPasscode(false), 2000);
  };

  const viberTemplate = `🇵🇭 10RCDG OFFICIAL SOLDIER APP PROVISIONING
App: 10RCDG RESCOM ALERT (v1.0.8)
Companion Emergency Siren & Mobilization Alert System

All Army reservists and field personnel are directed to download and install the official soldier companion application:

🔗 Portal Download Link: ${publicUrl}
${portal.passcode ? `🔑 Command Security Passcode: ${portal.passcode}\n` : ""}${
    portal.expiresAt && portal.expiresAt > Date.now()
      ? `⏱️ Mobilization Window: Closes ${new Date(portal.expiresAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}\n`
      : "⏱️ Mobilization Window: Open\n"
}
📱 Android Compatibility: Android 7.0 to Android 15+ (100% Offline GSM Siren)
// 10th Regional Community Defense Group (10RCDG), Philippine Army`;

  const handleCopyViber = () => {
    navigator.clipboard.writeText(viberTemplate);
    setCopiedViber(true);
    setTimeout(() => setCopiedViber(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `10RCDG-APP-DOWNLOAD-QR.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[92dvh]">
        {/* Modal Header */}
        <div className="p-4 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-bold shadow-xs">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                Share Download Link & QR
              </h3>
              <p className="text-[11px] text-emerald-800 font-mono">
                10RCDG RESCOM ALERT (Soldier APK)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs text-slate-700">
          {/* QR Code Card Display */}
          <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-b from-emerald-50/50 to-slate-50 border border-slate-200 text-center space-y-2.5">
            {qrDataUrl ? (
              <div className="p-2.5 bg-white rounded-2xl shadow-xs border-2 border-emerald-800/10">
                <img
                  src={qrDataUrl}
                  alt="App Download QR Code"
                  className="w-44 h-44 sm:w-48 sm:h-48 object-contain"
                />
              </div>
            ) : (
              <div className="w-48 h-48 bg-slate-200 rounded-2xl flex items-center justify-center font-mono text-[11px] text-slate-500">
                Generating QR...
              </div>
            )}

            <div className="space-y-0.5">
              <div className="font-bold text-slate-900 text-xs">
                Scan on Troop Smartphone to Open /download
              </div>
              <div className="text-[10.5px] text-slate-500 font-mono">
                Compatible with all phone camera apps & QR scanners
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadQr}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-[11px] rounded-xl border border-slate-200 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Download High-Res QR Image</span>
            </button>
          </div>

          {/* Passcode Callout (if active) */}
          {portal.passcode ? (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <KeyRound className="w-4 h-4 text-emerald-700 shrink-0" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                    Required Command Passcode:
                  </span>
                  <span className="text-sm font-mono font-black text-emerald-950 tracking-wider">
                    {portal.passcode}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyPasscode}
                className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-950 font-bold text-[11px] rounded-lg border border-emerald-300 shadow-2xs flex items-center gap-1 transition-colors cursor-pointer"
              >
                {copiedPasscode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPasscode ? "Copied" : "Copy"}</span>
              </button>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Open Portal: No command passcode required for this release.</span>
            </div>
          )}

          {/* Public Link Box */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Public Download Portal URL
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                readOnly
                value={publicUrl}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800 font-medium select-all"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? "Copied" : "Copy Link"}</span>
              </button>
            </div>
          </div>

          {/* Viber / Group Chat Message Template */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Viber / Messenger Broadcast Template
              </label>
              <button
                type="button"
                onClick={handleCopyViber}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
              >
                {copiedViber ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedViber ? "Copied to Clipboard!" : "Copy Full Broadcast"}</span>
              </button>
            </div>
            <textarea
              readOnly
              rows={5}
              value={viberTemplate}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] text-slate-700 leading-relaxed resize-none"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:px-6 sm:py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
