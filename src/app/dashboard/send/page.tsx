"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Send,
  Radio,
  Users,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Shield,
  Smartphone,
  Info,
  Clock,
  Check,
  X,
  Bookmark,
} from "lucide-react";
import { INITIAL_GROUPS, PRESET_TEMPLATES, INITIAL_PERSONNEL } from "@/lib/mock-data";

export default function SendAlertPage() {
  const searchParams = useSearchParams();
  const initialGroupQuery = searchParams.get("group");

  // Selected Target Groups
  const [selectedGroups, setSelectedGroups] = useState<string[]>(
    initialGroupQuery ? [initialGroupQuery] : ["ALL"]
  );

  // Message Content
  const [messageTitle, setMessageTitle] = useState("EMERGENCY OPERATIONAL ALERT");
  const [messageContent, setMessageContent] = useState(
    "ATTN 10RCDG PERSONNEL: Mandatory assembly this Saturday, 0700H at Camp General Manuel T. Yan Senior. Complete Type A uniform required."
  );

  // Confirmation Safety Modal
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Recipient Calculation
  const calculateRecipients = () => {
    if (selectedGroups.includes("ALL")) {
      return INITIAL_PERSONNEL.length;
    }
    return INITIAL_PERSONNEL.filter((p) =>
      selectedGroups.some((gName) => p.groupName === gName)
    ).length;
  };

  const recipientCount = calculateRecipients();
  const charCount = messageContent.length;
  const smsSegments = Math.ceil(charCount / 160) || 1;

  const handleApplyTemplate = (templateText: string, templateTitle: string) => {
    setMessageContent(templateText);
    setMessageTitle(templateTitle.toUpperCase());
  };

  const handleToggleGroup = (groupName: string) => {
    if (groupName === "ALL") {
      setSelectedGroups(["ALL"]);
      return;
    }

    let newSelection = selectedGroups.filter((g) => g !== "ALL");
    if (newSelection.includes(groupName)) {
      newSelection = newSelection.filter((g) => g !== groupName);
      if (newSelection.length === 0) newSelection = ["ALL"];
    } else {
      newSelection.push(groupName);
    }
    setSelectedGroups(newSelection);
  };

  const handleStartDispatch = () => {
    setIsConfirmModalOpen(true);
  };

  const handleConfirmSend = async () => {
    setIsSending(true);
    try {
      // Gather target mobile numbers
      const targetPersonnel = selectedGroups.includes("ALL")
        ? INITIAL_PERSONNEL
        : INITIAL_PERSONNEL.filter((p) =>
            selectedGroups.some((gName) => p.groupName === gName)
          );
      const recipientNumbers = targetPersonnel.map((p) => p.mobileNumber);

      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: recipientNumbers,
          message: messageContent,
          title: messageTitle,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsConfirmModalOpen(false);
        setIsSuccess(true);
        setTimeout(() => setIsSuccess(false), 8000);
      } else {
        alert(data.error || "Failed to dispatch broadcast");
      }
    } catch {
      alert("Network error connecting to SMS transmission service");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 uppercase mb-1">
            <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
            10RCDG Mass Broadcast Engine
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Send Broadcast Alert
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Compose and broadcast instant SMS notifications to 10RCDG battalions and quick response units.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-mono font-semibold text-emerald-800">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          SMS GATEWAY: ONLINE
        </div>
      </div>

      {/* Success Notification Banner */}
      {isSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-200 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold">Mass SMS Alert Successfully Dispatched!</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              Broadcasting to {recipientCount} personnel via 10RCDG gateway. Delivery reports are being generated in real-time.
            </p>
          </div>
          <button
            onClick={() => setIsSuccess(false)}
            className="text-emerald-600 hover:text-emerald-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Grid: Left Composer & Right Phone Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Form & Template Controls (8 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Step 1: Select Target Recipients */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
                <Users className="w-4 h-4 text-emerald-700" />
                Step 1: Select Recipients
              </h2>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
                {recipientCount} Personnel Selected
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* All Personnel Option */}
              <button
                type="button"
                onClick={() => handleToggleGroup("ALL")}
                className={`flex items-center justify-between p-3 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                  selectedGroups.includes("ALL")
                    ? "bg-emerald-800 text-white border-emerald-800 shadow-sm"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <span>ALL 10RCDG Personnel</span>
                </div>
                <span className="text-[11px] opacity-80 font-mono">
                  {INITIAL_PERSONNEL.length} Pax
                </span>
              </button>

              {/* Individual Groups */}
              {INITIAL_GROUPS.map((group) => {
                const isSelected = selectedGroups.includes(group.name);
                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => handleToggleGroup(group.name)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? "bg-emerald-800 text-white border-emerald-800 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: group.color }}
                      />
                      <span className="truncate">{group.name}</span>
                    </div>
                    <span className="text-[11px] opacity-80 font-mono shrink-0 ml-1">
                      {group.memberCount} Pax
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Fast Presets & Templates Hub */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
                <FileText className="w-4 h-4 text-amber-700" />
                Step 2: Quick Military Templates
              </h2>
              <span className="text-[11px] text-slate-400 font-medium">Click to insert</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => handleApplyTemplate(tpl.text, tpl.title)}
                  className="flex flex-col text-left p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-emerald-50 hover:border-emerald-300 transition-all text-xs group cursor-pointer"
                >
                  <span className="font-bold text-slate-800 group-hover:text-emerald-900 flex items-center gap-1.5">
                    <Bookmark className="w-3 h-3 text-slate-400 group-hover:text-emerald-700 transition-colors" />
                    {tpl.title}
                  </span>
                  <span className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                    {tpl.text}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Message Composer */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
                <Send className="w-4 h-4 text-emerald-700" />
                Step 3: Compose Broadcast SMS
              </h2>
              <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                Sender: 10RCDG ALERT
              </span>
            </div>

            {/* Alert Headline */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Alert Title / Subject Header
              </label>
              <input
                type="text"
                value={messageTitle}
                onChange={(e) => setMessageTitle(e.target.value)}
                placeholder="e.g. EMERGENCY MOBILIZATION ORDER"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
              />
            </div>

            {/* Message Body */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                SMS Text Message Content *
              </label>
              <textarea
                rows={4}
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Type your official alert announcement..."
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all shadow-inner leading-relaxed resize-none"
              />
            </div>

            {/* SMS Telemetry & Segment Meter */}
            <div className="flex items-center justify-between text-xs font-mono pt-1 text-slate-500 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700">{charCount}</span>
                <span>/ 160 chars</span>
                <span>•</span>
                <span className={`font-bold ${smsSegments > 1 ? "text-amber-700" : "text-emerald-700"}`}>
                  {smsSegments} SMS Segment{smsSegments > 1 ? "s" : ""}
                </span>
              </div>
              <span className="text-[11px] text-slate-400">Standard GSM-7 Encoding</span>
            </div>

            {/* Send Dispatch Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleStartDispatch}
                disabled={!messageContent.trim() || recipientCount === 0}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-sm uppercase tracking-wider transition-all shadow-lg shadow-emerald-950/20 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Broadcast Alert to {recipientCount} Personnel</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Phone SMS Simulator (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full max-w-sm sticky top-6 space-y-4">
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-slate-500" />
                Live Recipient Phone Preview
              </span>
              <span className="text-[11px] font-mono text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                ● SIMULATION
              </span>
            </div>

            {/* Mobile Phone Mockup Frame */}
            <div className="w-full bg-slate-900 rounded-[2.5rem] p-3 shadow-2xl border-4 border-slate-800">
              {/* Phone Inner Screen */}
              <div className="bg-[#f0f4f8] rounded-[2rem] overflow-hidden min-h-[480px] flex flex-col justify-between border border-slate-700">
                
                {/* Phone Status Bar */}
                <div className="bg-slate-800 text-white px-5 py-2 flex items-center justify-between text-[11px] font-mono font-medium">
                  <span>09:41</span>
                  <div className="flex items-center gap-1.5">
                    <span>5G</span>
                    <div className="w-4 h-2 rounded-xs border border-white flex items-center p-0.5">
                      <div className="w-full h-full bg-emerald-400"></div>
                    </div>
                  </div>
                </div>

                {/* Messages Header */}
                <div className="bg-white px-4 py-3 border-b border-slate-200 shadow-xs flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-800 text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
                    RA
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">10RCDG ALERT</p>
                    <p className="text-[10px] text-emerald-600 font-medium font-mono">
                      Official Military SMS
                    </p>
                  </div>
                </div>

                {/* Message Bubble Container */}
                <div className="flex-1 p-4 flex flex-col justify-end space-y-3">
                  <div className="text-center">
                    <span className="text-[10px] font-mono font-medium text-slate-400 bg-white/70 px-2.5 py-0.5 rounded-full border border-slate-200">
                      Today, 09:41 AM
                    </span>
                  </div>

                  {/* SMS Bubble */}
                  <div className="self-start max-w-[90%] bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm border border-slate-200 space-y-1.5">
                    {messageTitle && (
                      <p className="text-[11px] font-extrabold text-amber-900 tracking-wide uppercase border-b border-slate-100 pb-1">
                        {messageTitle}
                      </p>
                    )}
                    <p className="text-xs text-slate-800 leading-relaxed font-sans">
                      {messageContent || "Type a message on the left to preview..."}
                    </p>
                    <p className="text-[9px] text-slate-400 text-right font-mono mt-1">
                      SMS • Delivered
                    </p>
                  </div>
                </div>

                {/* Phone Bottom Notch / Home Indicator */}
                <div className="py-2 flex justify-center bg-white border-t border-slate-100">
                  <div className="w-24 h-1 rounded-full bg-slate-300"></div>
                </div>
              </div>
            </div>

            {/* Note */}
            <p className="text-center text-[11px] text-slate-400 font-mono">
              Live representation of how the SMS appears on officers' phones.
            </p>
          </div>
        </div>
      </div>

      {/* Safety Dispatch Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-900">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h3 className="font-extrabold text-base">
                  Confirm Mass SMS Broadcast
                </h3>
              </div>
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                You are about to dispatch a live mass notification to{" "}
                <strong className="text-slate-900 font-bold">{recipientCount} personnel</strong>.
                Please review the broadcast details below:
              </p>

              {/* Message Summary Card */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Target Groups:</span>
                  <p className="font-semibold text-slate-800">{selectedGroups.join(", ")}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Alert Title:</span>
                  <p className="font-bold text-amber-800">{messageTitle}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Message Text:</span>
                  <p className="text-slate-700 mt-0.5 italic">"{messageContent}"</p>
                </div>
                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between font-mono text-[11px] text-slate-500">
                  <span>Segments: {smsSegments} SMS</span>
                  <span>Total SMS Units: {recipientCount * smsSegments}</span>
                </div>
              </div>

              {/* Confirmation Notice */}
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-medium border border-emerald-200">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Authorized under 10RCDG Commander Discretion</span>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsConfirmModalOpen(false)}
                  disabled={isSending}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSend}
                  disabled={isSending}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <Radio className="w-4 h-4 animate-spin" />
                      <span>Broadcasting SMS...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Confirm & Send Now</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
