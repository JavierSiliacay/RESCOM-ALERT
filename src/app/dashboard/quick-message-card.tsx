"use client";

import { useState } from "react";
import Link from "next/link";
import { Send, CheckCircle2, AlertCircle, Loader2, Users, Smartphone, X, ArrowRight, UserCheck } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useCurrentOfficer } from "@/components/officer-context";
import { PersonnelRecipientCombobox, RecipientChip } from "@/components/personnel-recipient-combobox";

export function QuickMessageCard() {
  const currentOfficer = useCurrentOfficer();
  const { isViewer, guardAction } = currentOfficer;
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
  const [error, setError] = useState<string | null>(null);

  const groups = groupsData || [];
  const personnel = personnelData || [];
  const templates = templatesData || [];

  // Compute active recipient numbers based on mode
  const getActiveNumbers = (): string[] => {
    if (recipientMode === "GROUP") {
      const activePersonnel = personnel.filter((p) => p.status === "ACTIVE");
      if (selectedGroup === "ALL") {
        return activePersonnel.map((p) => p.mobileNumber);
      }
      return activePersonnel
        .filter((p) => p.groupName === selectedGroup || p.groupId === selectedGroup)
        .map((p) => p.mobileNumber);
    }
    return manualRecipients.map((r) => r.number);
  };

  const activeRecipientCount = getActiveNumbers().length;

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

    const numbersToSend = getActiveNumbers();

    if (!message.trim() || numbersToSend.length === 0) {
      if (numbersToSend.length === 0 && recipientMode === "MANUAL") {
        setError("Please select at least one soldier or enter a phone number.");
      }
      return;
    }

    setIsSending(true);
    setError(null);
    setSuccess(false);

    const broadcastTitle = selectedTemplateTitle || "NO SMS TEMPLATE";

    try {
      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: numbersToSend,
          message: message,
          title: broadcastTitle,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // SMS successfully dispatched to carrier network
        setLastSentCount(numbersToSend.length);
        setSuccess(true);
        setMessage("");
        setSelectedTemplateTitle(null);
        if (recipientMode === "MANUAL") {
          setManualRecipients([]);
        }
        setTimeout(() => setSuccess(false), 9000);

        // Record history to Convex DB in background
        try {
          await recordBroadcast({
            title: broadcastTitle,
            content: message,
            senderName: currentOfficer.displayName || "Duty Officer",
            senderEmail: currentOfficer.email || undefined,
            senderRank: currentOfficer.rank || undefined,
            targetGroupNames: recipientMode === "GROUP" ? [selectedGroup] : ["Direct SMS"],
            recipients: numbersToSend,
            totalRecipients: numbersToSend.length,
            deliveredCount: numbersToSend.length,
            failedCount: 0,
            status: "DELIVERED",
            simSubscriptionId: 1,
            gatewayBatchId: data.messageId || data.smsBatchId || undefined,
            recipientStatuses: numbersToSend.map((num) => ({
              number: num,
              status: "sent",
              sentAt: new Date().toLocaleTimeString("en-US", { timeZone: "Asia/Manila" }),
            })),
          });
        } catch (dbErr) {
          console.error("Warning: Failed to save broadcast history to Convex database:", dbErr);
        }
      } else {
        setError(data.error || "Failed to send text message via SMS gateway.");
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
                  Sent to {lastSentCount} {lastSentCount === 1 ? "recipient" : "recipients"} via 10RCDG GSM Gateway.
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
              <option value="ALL">All 10RCDG Personnel ({personnel.length})</option>
              {groups.map((g) => (
                <option key={g._id} value={g.name}>
                  {g.name} ({g.memberCount})
                </option>
              ))}
            </select>
          )}

          {/* Option B: Autocomplete Personnel Combobox + Direct Numbers */}
          {recipientMode === "MANUAL" && (
            <PersonnelRecipientCombobox
              recipients={manualRecipients}
              onChange={setManualRecipients}
              personnel={personnel}
            />
          )}
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
            className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending SMS...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send to {activeRecipientCount} {activeRecipientCount === 1 ? "Recipient" : "Members"}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
