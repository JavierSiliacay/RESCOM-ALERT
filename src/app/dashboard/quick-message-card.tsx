"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Send, CheckCircle2, AlertCircle, Loader2, Users, Smartphone, X, ArrowRight, UserCheck, Phone, Radio, Info } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useCurrentOfficer } from "@/components/officer-context";
import { PersonnelRecipientCombobox, RecipientChip } from "@/components/personnel-recipient-combobox";
import { AndroidIcon, KeypadPhoneIcon, HybridIcon, ForceSmsIcon } from "@/components/device-icons";
import { isSamePhMobileNumber } from "@/lib/sms";

export interface QuickMessageCardProps {
  onBroadcastSent?: (broadcastId?: string) => void;
}

export function QuickMessageCard({ onBroadcastSent }: QuickMessageCardProps = {}) {
  const currentOfficer = useCurrentOfficer();
  const { isViewer, guardAction, isGlobalAdmin, isScopedAdmin, isGroupAuthorized } = currentOfficer;
  const groupsData = useQuery(api.groups.list);
  const personnelData = useQuery(api.personnel.list);
  const templatesData = useQuery(api.templates.list);
  const recordBroadcast = useMutation(api.broadcasts.record);

  // Mode: "GROUP" (Simple Contact Group) vs "MANUAL" (Search Personnel / Direct Numbers)
  const [recipientMode, setRecipientMode] = useState<"GROUP" | "MANUAL">("GROUP");

  // Group Mode State
  const [selectedGroup, setSelectedGroup] = useState<string>("ALL");

  // Personnel / Direct Mode State
  const [manualRecipients, setManualRecipients] = useState<RecipientChip[]>([]);

  const [message, setMessage] = useState("");
  const [selectedTemplateTitle, setSelectedTemplateTitle] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [lastSentCount, setLastSentCount] = useState<number>(0);
  const [lastChannelBreakdown, setLastChannelBreakdown] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [dispatchChannel, setDispatchChannel] = useState<"HYBRID" | "APP_PUSH" | "KEYPAD_SMS" | "FORCE_SMS">("HYBRID");

  const rawGroups = groupsData || [];
  const rawPersonnel = personnelData || [];
  const templates = templatesData || [];

  const groups = useMemo(() => {
    if (isGlobalAdmin) return rawGroups;
    return rawGroups.filter((g) => isGroupAuthorized(g.name));
  }, [rawGroups, isGlobalAdmin, isGroupAuthorized]);

  const personnel = useMemo(() => {
    if (isGlobalAdmin) return rawPersonnel;
    return rawPersonnel.filter((p) => isGroupAuthorized(p.groupName));
  }, [rawPersonnel, isGlobalAdmin, isGroupAuthorized]);

  // Categorize active recipients into Android and Keypad
  const getCategorizedRecipients = () => {
    let targetPersonnel: typeof personnel = [];
    if (recipientMode === "GROUP") {
      const active = personnel.filter((p) => p.status === "ACTIVE");
      if (selectedGroup === "ALL") {
        targetPersonnel = active;
      } else {
        targetPersonnel = active.filter((p) => p.groupName === selectedGroup || p.groupId === selectedGroup);
      }
    } else {
      targetPersonnel = manualRecipients.map((r) => {
        const found = personnel.find((p) => isSamePhMobileNumber(p.mobileNumber, r.number));
        return found || ({ mobileNumber: r.number, deviceType: "ANDROID" } as any);
      });
    }

    const androidTroops = targetPersonnel.filter((p) => ((p as any).deviceType || "ANDROID") === "ANDROID");
    const keypadTroops = targetPersonnel.filter((p) => (p as any).deviceType === "KEYPAD");

    return {
      total: targetPersonnel.length,
      androidTroops,
      keypadTroops,
    };
  };

  const categorizedRecipients = getCategorizedRecipients();
  const activeRecipientCount = categorizedRecipients.total;

  const handleApplyTemplate = (tpl: (typeof templates)[number]) => {
    setMessage(tpl.text);
    setSelectedTemplateTitle(tpl.title);
    setError(null);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewer) {
      guardAction("transmit text message broadcast");
      return;
    }

    const { total, androidTroops, keypadTroops } = getCategorizedRecipients();

    let smsNumbers: string[] = [];
    let pushNumbers: string[] = [];

    if (dispatchChannel === "HYBRID") {
      smsNumbers = keypadTroops.map((p) => p.mobileNumber);
      pushNumbers = androidTroops.map((p) => p.mobileNumber);
    } else if (dispatchChannel === "APP_PUSH") {
      smsNumbers = [];
      pushNumbers = androidTroops.map((p) => p.mobileNumber);
    } else if (dispatchChannel === "KEYPAD_SMS") {
      smsNumbers = keypadTroops.map((p) => p.mobileNumber);
      pushNumbers = [];
    } else {
      smsNumbers = [
        ...keypadTroops.map((p) => p.mobileNumber),
        ...androidTroops.map((p) => p.mobileNumber),
      ];
      pushNumbers = [];
    }

    const totalTarget = smsNumbers.length + pushNumbers.length;

    if (!message.trim() || totalTarget === 0) {
      if (totalTarget === 0) {
        setError("No recipients match the selected dispatch channel.");
      }
      return;
    }

    setIsSending(true);
    setError(null);
    setSuccess(false);

    const broadcastTitle = selectedTemplateTitle || "NO SMS TEMPLATE";

    try {
      let data: any = { success: true };
      
      // 1. Dispatch Free Android Push Notifications (Layer 1)
      if (pushNumbers.length > 0) {
        try {
          await fetch("/api/fcm/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              recipients: pushNumbers,
              message: message,
              title: broadcastTitle,
              sender: currentOfficer.displayName || "10RCDG Tactical HQ",
            }),
          });
        } catch (pushErr) {
          console.error("FCM dispatch error:", pushErr);
        }
      }

      // 2. Dispatch Cellular SMS (Layer 2)
      if (smsNumbers.length > 0) {
        const res = await fetch("/api/sms/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipients: smsNumbers,
            message: message,
            title: broadcastTitle,
          }),
        });
        data = await res.json();
        if (!res.ok || !data.success) {
          setError(data.error || "Failed to send text message via SMS gateway.");
          setIsSending(false);
          return;
        }
      }

      // Successfully dispatched
      setLastSentCount(totalTarget);
      const breakdownText =
        dispatchChannel === "HYBRID"
          ? `${pushNumbers.length} App Pushes (₱0) + ${smsNumbers.length} Keypad SMS`
          : dispatchChannel === "APP_PUSH"
          ? `${pushNumbers.length} Free App Pushes (₱0 Cost)`
          : dispatchChannel === "KEYPAD_SMS"
          ? `${smsNumbers.length} Keypad SMS`
          : `${smsNumbers.length} Mass Cellular SMS`;
      setLastChannelBreakdown(breakdownText);
      setSuccess(true);
      setMessage("");
      setSelectedTemplateTitle(null);
      if (recipientMode === "MANUAL") {
        setManualRecipients([]);
      }
      setTimeout(() => setSuccess(false), 9000);

      // Record history to Convex DB in background
      try {
        const newBroadcastId = await recordBroadcast({
          title: broadcastTitle,
          content: message,
          senderName: currentOfficer.displayName || "Duty Officer",
          senderEmail: currentOfficer.email || undefined,
          senderRank: currentOfficer.rank || undefined,
          targetGroupNames:
            recipientMode === "GROUP"
              ? selectedGroup === "ALL"
                ? isScopedAdmin
                  ? groups.map((g) => g.name)
                  : ["All 10RCDG Personnel"]
                : [selectedGroup]
              : ["Direct SMS"],
          recipients: [...smsNumbers, ...pushNumbers],
          totalRecipients: totalTarget,
          deliveredCount: totalTarget,
          failedCount: 0,
          channel: dispatchChannel,
          pushRecipientCount: pushNumbers.length,
          smsRecipientCount: smsNumbers.length,
          status: "DELIVERED",
          simSubscriptionId: smsNumbers.length > 0 ? 1 : undefined,
          gatewayBatchId: data.messageId || data.smsBatchId || "APP_PUSH_INSTANT",
          recipientStatuses: [
            ...pushNumbers.map((num) => ({
              number: num,
              status: "sent",
              channel: "APP_PUSH",
              sentAt: new Date().toLocaleTimeString("en-US", { timeZone: "Asia/Manila" }),
            })),
            ...smsNumbers.map((num) => ({
              number: num,
              status: "sent",
              channel: "SMS_GATEWAY",
              sentAt: new Date().toLocaleTimeString("en-US", { timeZone: "Asia/Manila" }),
            })),
          ],
        });
        if (newBroadcastId) {
          onBroadcastSent?.(String(newBroadcastId));
        }
      } catch (dbErr) {
        console.error("Warning: Failed to save broadcast history to Convex database:", dbErr);
      }
    } catch (err: unknown) {
      console.error("Network or gateway dispatch error:", err);
      const errMsg = err instanceof Error ? err.message : "Cannot reach SMS gateway. Check internet connection.";
      setError(errMsg);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Send Text Message</h2>
          <p className="text-xs text-slate-500 mt-0.5">Quick broadcast to soldiers and reservists</p>
        </div>
        <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 font-mono">
          {activeRecipientCount} {activeRecipientCount === 1 ? "Recipient" : "Recipients"}
        </span>
      </div>

      {success && (
        <div className="p-4 bg-emerald-50/95 border border-emerald-300 rounded-2xl shadow-xs space-y-3 animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs relative">
                <span className="absolute inset-0 rounded-xl bg-emerald-400 animate-ping opacity-30" />
                <CheckCircle2 className="w-5 h-5 text-white relative z-10" />
              </div>
              <div>
                <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wide flex items-center gap-1.5">
                  <span>Broadcast Dispatched Successfully</span>
                </h4>
                <p className="text-xs text-emerald-800 font-medium mt-0.5">
                  Sent to {lastSentCount} {lastSentCount === 1 ? "recipient" : "recipients"}
                  {lastChannelBreakdown ? ` [${lastChannelBreakdown}]` : " via RESCOM ALERT"}.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSuccess(false)}
              className="text-emerald-700 hover:text-emerald-950 p-1 rounded-lg hover:bg-emerald-100/60 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-emerald-200/70">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold text-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Highlighted green in Outbox
            </span>
            <Link
              href="/dashboard/messaging?tab=outbox"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-800 hover:bg-emerald-900 text-white shadow-xs transition-all hover:translate-x-0.5 cursor-pointer"
            >
              <span>View the Sent SMS</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-900 rounded-xl text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSend} className="space-y-4">
        {/* Recipient Mode Switcher */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Send To
            </label>
            <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200/80">
              <button
                type="button"
                onClick={() => setRecipientMode("GROUP")}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  recipientMode === "GROUP"
                    ? "bg-white text-emerald-800 shadow-2xs border border-slate-200"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Contact Group
              </button>
              <button
                type="button"
                onClick={() => setRecipientMode("MANUAL")}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  recipientMode === "MANUAL"
                    ? "bg-white text-emerald-800 shadow-2xs border border-slate-200"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                Direct Personnel
              </button>
            </div>
          </div>

          {/* Option A: Simple Clean Contact Group Dropdown (Default) */}
          {recipientMode === "GROUP" && (
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:border-emerald-700 focus:bg-white cursor-pointer"
            >
              <option value="ALL">
                {isScopedAdmin
                  ? `All My Assigned Units (${personnel.length})`
                  : `All 10RCDG Personnel (${personnel.length})`}
              </option>
              {groups.map((g) => (
                <option key={g._id} value={g.name}>
                  {g.name} ({g.memberCount})
                </option>
              ))}
            </select>
          )}

          {/* Option B: Autocomplete Personnel Combobox + Direct Numbers */}
          {recipientMode === "MANUAL" && (
            <div className="space-y-2">
              <PersonnelRecipientCombobox
                recipients={manualRecipients}
                onChange={setManualRecipients}
                personnel={personnel}
              />
              {manualRecipients.length === 0 ? (
                <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>
                    Direct Mode: Type phone number or soldier name, then press <strong>Enter</strong> or <strong>Add +</strong>.
                  </span>
                </div>
              ) : (
                <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
                  <span>Targeting <strong>{manualRecipients.length} direct soldier{manualRecipients.length === 1 ? "" : "s"}</strong> only.</span>
                  <span className="font-mono font-bold text-[10px] bg-white px-2 py-0.5 rounded border border-emerald-200">
                    Direct Mode
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 4-Mode Dispatch Channel Selector */}
        <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-700" />
              Dispatch Channel Strategy
            </label>
            <span className="text-[10px] font-mono text-slate-500 font-semibold flex items-center gap-1.5">
              <span className="flex items-center gap-1">
                <AndroidIcon className="w-3 h-3 text-[#3DDC84]" />
                <span>{categorizedRecipients.androidTroops.length} Android</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <KeypadPhoneIcon className="w-3 h-3 text-slate-500" />
                <span>{categorizedRecipients.keypadTroops.length} Keypad</span>
              </span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {/* 1. Smart Hybrid */}
            <label
              className={`p-2.5 rounded-xl border cursor-pointer flex flex-col justify-between gap-1.5 transition-all ${
                dispatchChannel === "HYBRID"
                  ? "bg-white border-emerald-600 ring-1 ring-emerald-600 text-slate-900 font-bold shadow-2xs"
                  : "bg-slate-100/70 border-slate-200 text-slate-600 hover:bg-white"
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <input
                    type="radio"
                    name="dispatchChannel"
                    value="HYBRID"
                    checked={dispatchChannel === "HYBRID"}
                    onChange={() => setDispatchChannel("HYBRID")}
                    className="text-emerald-700 focus:ring-emerald-600"
                  />
                  <span className="text-xs font-bold flex items-center gap-1.5 text-slate-900">
                    <HybridIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>Smart Hybrid</span>
                  </span>
                </div>
                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-900 font-mono shrink-0">
                  AUTO ROUTE
                </span>
              </div>
              <p className="text-[10.5px] font-medium text-slate-600 pl-4 leading-tight">
                Free Push for Android + SMS for Keypad
              </p>
              <span className="text-[10px] font-semibold text-emerald-700 pl-4 font-mono">
                {categorizedRecipients.androidTroops.length} Free Push (₱0) + {categorizedRecipients.keypadTroops.length} SMS
              </span>
            </label>

            {/* 2. Android Push (₱0) */}
            <label
              className={`p-2.5 rounded-xl border cursor-pointer flex flex-col justify-between gap-1.5 transition-all ${
                dispatchChannel === "APP_PUSH"
                  ? "bg-white border-emerald-600 ring-1 ring-emerald-600 text-slate-900 font-bold shadow-2xs"
                  : "bg-slate-100/70 border-slate-200 text-slate-600 hover:bg-white"
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <input
                    type="radio"
                    name="dispatchChannel"
                    value="APP_PUSH"
                    checked={dispatchChannel === "APP_PUSH"}
                    onChange={() => setDispatchChannel("APP_PUSH")}
                    className="text-emerald-700 focus:ring-emerald-600"
                  />
                  <span className="text-xs font-bold flex items-center gap-1.5 text-slate-900">
                    <AndroidIcon className="w-3.5 h-3.5 text-[#3DDC84] shrink-0" />
                    <span>Android Push (₱0)</span>
                  </span>
                </div>
                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-blue-100 text-blue-900 font-mono shrink-0">
                  FREE ₱0
                </span>
              </div>
              <p className="text-[10.5px] font-medium text-slate-600 pl-4 leading-tight">
                Companion App alert only; zero SMS cost
              </p>
              <span className="text-[10px] font-semibold text-blue-700 pl-4 font-mono">
                {categorizedRecipients.androidTroops.length} Android troops • 0 SMS
              </span>
            </label>

            {/* 3. Keypad SMS Only */}
            <label
              className={`p-2.5 rounded-xl border cursor-pointer flex flex-col justify-between gap-1.5 transition-all ${
                dispatchChannel === "KEYPAD_SMS"
                  ? "bg-white border-emerald-600 ring-1 ring-emerald-600 text-slate-900 font-bold shadow-2xs"
                  : "bg-slate-100/70 border-slate-200 text-slate-600 hover:bg-white"
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <input
                    type="radio"
                    name="dispatchChannel"
                    value="KEYPAD_SMS"
                    checked={dispatchChannel === "KEYPAD_SMS"}
                    onChange={() => setDispatchChannel("KEYPAD_SMS")}
                    className="text-emerald-700 focus:ring-emerald-600"
                  />
                  <span className="text-xs font-bold flex items-center gap-1.5 text-slate-900">
                    <KeypadPhoneIcon className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    <span>Keypad SMS Only</span>
                  </span>
                </div>
                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-slate-200 text-slate-800 font-mono shrink-0">
                  BASIC CELLULAR
                </span>
              </div>
              <p className="text-[10.5px] font-medium text-slate-600 pl-4 leading-tight">
                Cellular gateway for basic feature phones
              </p>
              <span className="text-[10px] font-semibold text-slate-700 pl-4 font-mono">
                {categorizedRecipients.keypadTroops.length} Keypads via SMS
              </span>
            </label>

            {/* 4. Force SMS (All) */}
            <label
              className={`p-2.5 rounded-xl border cursor-pointer flex flex-col justify-between gap-1.5 transition-all ${
                dispatchChannel === "FORCE_SMS"
                  ? "bg-white border-emerald-600 ring-1 ring-emerald-600 text-slate-900 font-bold shadow-2xs"
                  : "bg-slate-100/70 border-slate-200 text-slate-600 hover:bg-white"
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <input
                    type="radio"
                    name="dispatchChannel"
                    value="FORCE_SMS"
                    checked={dispatchChannel === "FORCE_SMS"}
                    onChange={() => setDispatchChannel("FORCE_SMS")}
                    className="text-emerald-700 focus:ring-emerald-600"
                  />
                  <span className="text-xs font-bold flex items-center gap-1.5 text-slate-900">
                    <ForceSmsIcon className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>Force SMS (All)</span>
                  </span>
                </div>
                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-red-100 text-red-900 font-mono shrink-0">
                  RED ALERT
                </span>
              </div>
              <p className="text-[10.5px] font-medium text-slate-600 pl-4 leading-tight">
                Direct cellular blast to 100% of troops
              </p>
              <span className="text-[10px] font-semibold text-rose-700 pl-4 font-mono">
                {categorizedRecipients.total} Total via Cellular SMS
              </span>
            </label>
          </div>

          {/* Active Strategy Operational Protocol Note */}
          <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200/80 text-[11px] text-emerald-950 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
            <div className="leading-snug">
              <span className="font-bold text-emerald-950">
                {dispatchChannel === "HYBRID" && "Strategy: Smart Hybrid Routing — "}
                {dispatchChannel === "APP_PUSH" && "Strategy: Zero-Cost Android App Siren — "}
                {dispatchChannel === "KEYPAD_SMS" && "Strategy: Keypad SMS Cellular Channel — "}
                {dispatchChannel === "FORCE_SMS" && "Strategy: Full Cellular SMS Blast — "}
              </span>
              <span className="text-emerald-900 font-medium">
                {dispatchChannel === "HYBRID" &&
                  "Auto-splits recipients to cut SMS costs: Android phones receive free app sirens (₱0), while keypad phones receive cellular SMS."}
                {dispatchChannel === "APP_PUSH" &&
                  "Sends in-app sirens exclusively to Android soldiers. Consumes 0 SMS credits. Basic keypad phone users are bypassed."}
                {dispatchChannel === "KEYPAD_SMS" &&
                  "Sends SMS only to soldiers with basic feature/keypad phones. Android soldiers are bypassed to save unnecessary charges."}
                {dispatchChannel === "FORCE_SMS" &&
                  "Forces a cellular SMS to all soldiers regardless of device type. Ideal for red alerts, power grid outages, or offline areas."}
              </span>
            </div>
          </div>
        </div>

        {/* Textarea & Dynamic Connected Templates */}
        <div>
          <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Message
            </label>

            {/* Dynamic Templates Linked to Messaging Page */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-400">Templates:</span>
              {templates.slice(0, 4).map((tpl, idx) => {
                const shortLabel = tpl.title.split("/")[0].split("—")[0].trim();
                return (
                  <span key={tpl._id} className="inline-flex items-center">
                    {idx > 0 && <span className="text-slate-300 mr-1.5">•</span>}
                    <button
                      type="button"
                      onClick={() => handleApplyTemplate(tpl)}
                      className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 hover:underline cursor-pointer"
                      title={tpl.title}
                    >
                      {shortLabel}
                    </button>
                  </span>
                );
              })}

              <span className="text-slate-300">•</span>
              <Link
                href="/dashboard/messaging?tab=send"
                className="text-[11px] font-bold text-amber-700 hover:text-amber-800 hover:underline inline-flex items-center gap-0.5"
                title="Manage and create templates"
              >
                <span>+ Edit / Add</span>
              </Link>
            </div>
          </div>

          <textarea
            rows={4}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              if (!e.target.value.trim()) setSelectedTemplateTitle(null);
            }}
            placeholder="Type your message here or click a template above..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-700 focus:bg-white resize-none leading-relaxed transition-all font-mono"
          />
        </div>

        {/* Footer & Button */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-slate-400 font-mono">
            {message.length} characters
          </span>

          <button
            type="submit"
            disabled={isSending || !message.trim() || activeRecipientCount === 0}
            className={`px-6 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer ${
              recipientMode === "MANUAL"
                ? "bg-blue-700 hover:bg-blue-800"
                : "bg-emerald-800 hover:bg-emerald-900"
            }`}
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>
                  {recipientMode === "MANUAL"
                    ? `Send to ${manualRecipients.length} Direct Recipient${manualRecipients.length === 1 ? `: ${manualRecipients[0].name || manualRecipients[0].number}` : "s"}`
                    : `Broadcast to Group: ${selectedGroup === "ALL" ? "All 10RCDG Personnel" : selectedGroup} (${activeRecipientCount})`}
                </span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
