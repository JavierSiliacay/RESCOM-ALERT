"use client";

import { useState } from "react";
import Link from "next/link";
import { Send, CheckCircle2, AlertCircle, Loader2, Users, Smartphone, X } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { sanitizePhMobileInput } from "@/lib/sms";

export function QuickMessageCard() {
  const groupsData = useQuery(api.groups.list);
  const personnelData = useQuery(api.personnel.list);
  const templatesData = useQuery(api.templates.list);
  const recordBroadcast = useMutation(api.broadcasts.record);

  // Mode: "GROUP" (Simple Contact Group) vs "MANUAL" (TextBee Direct Numbers)
  const [recipientMode, setRecipientMode] = useState<"GROUP" | "MANUAL">("GROUP");

  // Group Mode State
  const [selectedGroup, setSelectedGroup] = useState<string>("ALL");

  // Manual Mode State (TextBee Style)
  const [manualNumbers, setManualNumbers] = useState<string[]>([]);
  const [numberInputValue, setNumberInputValue] = useState("");

  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [success, setSuccess] = useState(false);
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
    return manualNumbers;
  };

  const activeRecipientCount = getActiveNumbers().length;

  const handleApplyTemplate = (text: string) => {
    setMessage(text);
    setError(null);
  };

  // Manual Tag Management (TextBee Style)
  const addManualNumbers = (rawText: string) => {
    const rawTokens = rawText.split(/[\r\n,;\s]+/);
    const toAdd: string[] = [];

    for (const token of rawTokens) {
      const clean = token.trim();
      if (!clean) continue;
      const sanitized = sanitizePhMobileInput(clean);
      if (sanitized && !manualNumbers.includes(sanitized) && !toAdd.includes(sanitized)) {
        toAdd.push(sanitized);
      }
    }

    if (toAdd.length > 0) {
      setManualNumbers((prev) => [...prev, ...toAdd]);
    }
  };

  const removeManualNumber = (indexToRemove: number) => {
    setManualNumbers((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleKeyDownManual = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      if (numberInputValue.trim()) {
        addManualNumbers(numberInputValue);
        setNumberInputValue("");
      }
    } else if (e.key === "Backspace" && !numberInputValue && manualNumbers.length > 0) {
      setManualNumbers((prev) => prev.slice(0, -1));
    }
  };

  const handlePasteManual = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    if (pasted) {
      addManualNumbers(pasted);
      setNumberInputValue("");
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const numbersToSend = getActiveNumbers();

    if (!message.trim() || numbersToSend.length === 0) {
      if (numbersToSend.length === 0 && recipientMode === "MANUAL") {
        setError("Please enter at least one recipient phone number.");
      }
      return;
    }

    setIsSending(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: numbersToSend,
          message: message,
          title: "10RCDG ALERT",
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Record to Convex DB
        await recordBroadcast({
          title: "10RCDG ALERT",
          content: message,
          senderName: "Duty Officer",
          senderEmail: "admin@10rcdg.mil.ph",
          senderRank: "CPT",
          targetGroupNames: recipientMode === "GROUP" ? [selectedGroup] : ["Direct SMS"],
          recipients: numbersToSend,
          totalRecipients: numbersToSend.length,
          deliveredCount: numbersToSend.length,
          failedCount: 0,
          status: "DELIVERED",
          simSubscriptionId: 1,
        });

        setSuccess(true);
        setMessage("");
        if (recipientMode === "MANUAL") {
          setManualNumbers([]);
        }
        setTimeout(() => setSuccess(false), 5000);
      } else {
        setError(data.error || "Failed to send text message.");
      }
    } catch {
      setError("Cannot reach SMS gateway. Check internet connection.");
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
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Message successfully sent to {activeRecipientCount} recipients!</span>
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
                <Smartphone className="w-3.5 h-3.5" />
                Manual Numbers
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

          {/* Option B: TextBee Style Manual Recipient Input */}
          {recipientMode === "MANUAL" && (
            <div className="space-y-1.5">
              <div className="p-2.5 bg-slate-50 border border-slate-200 focus-within:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-700/20 rounded-xl transition-all flex flex-wrap items-center gap-1.5 min-h-[46px]">
                {manualNumbers.map((num, idx) => (
                  <span
                    key={`${num}-${idx}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-200/90 text-slate-800 text-xs font-mono font-medium rounded-full"
                  >
                    <span>{num}</span>
                    <button
                      type="button"
                      onClick={() => removeManualNumber(idx)}
                      className="w-3.5 h-3.5 flex items-center justify-center rounded-full hover:bg-slate-400 text-slate-500 hover:text-slate-900 cursor-pointer"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}

                <input
                  type="text"
                  value={numberInputValue}
                  onChange={(e) => setNumberInputValue(e.target.value)}
                  onKeyDown={handleKeyDownManual}
                  onPaste={handlePasteManual}
                  placeholder={manualNumbers.length === 0 ? "Type mobile number (e.g. 09171234567) & press Enter" : "Add another number"}
                  className="flex-1 min-w-[170px] bg-transparent text-xs text-slate-900 font-mono placeholder:text-slate-400 focus:outline-none py-1"
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Press Enter or comma to add. Paste a list to add several at once.</span>
                {manualNumbers.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setManualNumbers([])}
                    className="text-red-600 hover:underline font-bold cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>
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
                      onClick={() => handleApplyTemplate(tpl.text)}
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
            onChange={(e) => setMessage(e.target.value)}
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
