"use client";

import { useState } from "react";
import { Send, Users, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { INITIAL_GROUPS, INITIAL_PERSONNEL } from "@/lib/mock-data";

export function QuickMessageCard() {
  const [selectedGroup, setSelectedGroup] = useState("ALL");
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const charCount = messageText.length;
  const segments = Math.ceil(charCount / 160) || 1;

  const targetCount =
    selectedGroup === "ALL"
      ? INITIAL_PERSONNEL.length
      : INITIAL_PERSONNEL.filter((p) => p.groupName === selectedGroup).length;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    setIsSending(true);
    setErrorMessage(null);
    setSendSuccess(false);

    try {
      const targetPersonnel =
        selectedGroup === "ALL"
          ? INITIAL_PERSONNEL
          : INITIAL_PERSONNEL.filter((p) => p.groupName === selectedGroup);

      const recipientNumbers = targetPersonnel.map((p) => p.mobileNumber);

      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: recipientNumbers,
          message: messageText,
          title: "QUICK ALERT",
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSendSuccess(true);
        setMessageText("");
        setTimeout(() => setSendSuccess(false), 6000);
      } else {
        setErrorMessage(data.error || "Failed to dispatch message.");
      }
    } catch {
      setErrorMessage("Network error connecting to SMS transmission service.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-100/70 text-emerald-800">
            <Send className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Send a Quick Message
          </h2>
        </div>

        {/* Target Recipient Selector */}
        <div className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
          >
            <option value="ALL">All Personnel ({INITIAL_PERSONNEL.length})</option>
            {INITIAL_GROUPS.map((g) => (
              <option key={g.id} value={g.name}>
                {g.name} ({g.memberCount})
              </option>
            ))}
          </select>
        </div>
      </div>

      {sendSuccess && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Broadcast dispatched successfully to {targetCount} personnel.</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSend} className="space-y-4">
        <textarea
          rows={4}
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder="Type your announcement or alert message here..."
          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-600/20 transition-all font-sans leading-relaxed"
        />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
          <div className="text-xs text-slate-500 font-mono">
            <span className="font-bold text-slate-700">{charCount}</span> / 160 characters
            <span className="text-slate-400 ml-1.5">
              ({segments} {segments === 1 ? "SMS segment" : "SMS segments"})
            </span>
          </div>

          <button
            type="submit"
            disabled={isSending || charCount === 0}
            className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-xs cursor-pointer inline-flex items-center justify-center gap-2"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Dispatching...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Message Now
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
