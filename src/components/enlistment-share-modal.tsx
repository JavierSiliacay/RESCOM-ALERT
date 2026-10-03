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
  Shield,
  KeyRound,
  Clock,
  Send,
} from "lucide-react";

interface EnlistmentShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: {
    title: string;
    campaignCode: string;
    passcode: string;
    targetUnit: string;
    duration: string;
    expiresAt: number;
  } | null;
}

export function EnlistmentShareModal({
  isOpen,
  onClose,
  campaign,
}: EnlistmentShareModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedViber, setCopiedViber] = useState(false);
  const [copiedPasscode, setCopiedPasscode] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const publicUrl = campaign ? `${origin}/enlist/${campaign.campaignCode}` : "";

  useEffect(() => {
    if (publicUrl) {
      QRCode.toDataURL(publicUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error("QR Code Error:", err));
    }
  }, [publicUrl]);

  if (!isOpen || !campaign) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyPasscode = () => {
    navigator.clipboard.writeText(campaign.passcode);
    setCopiedPasscode(true);
    setTimeout(() => setCopiedPasscode(false), 2000);
  };

  const viberTemplate = `🇵🇭 10RCDG OFFICIAL ENLISTMENT REGISTRATION
Batch: ${campaign.title}
Target Unit: ${campaign.targetUnit}

All personnel are directed to register their active mobile number for official military SMS alerts & mobilization orders:

🔗 Registration Link: ${publicUrl}
🔑 Unit Security Passcode: ${campaign.passcode}
⏱️ Window Duration: ${campaign.duration}

// Philippine Army Reserve Command`;

  const handleCopyViber = () => {
    navigator.clipboard.writeText(viberTemplate);
    setCopiedViber(true);
    setTimeout(() => setCopiedViber(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `10RCDG-QR-${campaign.campaignCode}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[92dvh]">
        {/* Modal Header */}
        <div className="p-4 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
              <Share2 className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Share Enlistment Link & QR
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                Batch: {campaign.title}
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
          <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/70 border border-slate-200 text-center space-y-2">
            {qrDataUrl ? (
              <div className="p-2 bg-white rounded-xl shadow-xs border border-slate-200">
                <img
                  src={qrDataUrl}
                  alt="Enlistment QR Code"
                  className="w-44 h-44 sm:w-48 sm:h-48 object-contain"
                />
              </div>
            ) : (
              <div className="w-48 h-48 bg-slate-200 rounded-xl flex items-center justify-center font-mono text-[11px] text-slate-500">
                Generating QR...
              </div>
            )}

            <div className="space-y-0.5">
              <div className="font-bold text-slate-900 text-xs">
                Scan to Enlist on Smartphone
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                Project on muster screens or print for troops
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadQr}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-[11px] rounded-lg border border-slate-200 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Download High-Res QR Image</span>
            </button>
          </div>

          {/* Passcode Callout */}
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-700 shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-800 block">
                  Required Security Passcode:
                </span>
                <span className="text-sm font-mono font-extrabold text-amber-950 tracking-wider">
                  {campaign.passcode}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyPasscode}
              className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-950 font-bold text-[11px] rounded-lg border border-amber-300 shadow-2xs flex items-center gap-1 transition-colors cursor-pointer"
            >
              {copiedPasscode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedPasscode ? "Copied" : "Copy"}</span>
            </button>
          </div>

          {/* Public Link Box */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Public Enlistment URL
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
                <span>{copiedViber ? "Copied to Clipboard!" : "Copy Full Message"}</span>
              </button>
            </div>
            <textarea
              readOnly
              rows={4}
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
