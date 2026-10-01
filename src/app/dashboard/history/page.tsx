"use client";

import { useState } from "react";
import Link from "next/link";
import {
  History,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Users,
  Search,
  Filter,
  RefreshCw,
  Phone,
  Shield,
  FileText,
  X,
  ExternalLink,
} from "lucide-react";
import { INITIAL_BROADCASTS, BroadcastMessage, INITIAL_PERSONNEL } from "@/lib/mock-data";

export default function MessageHistoryPage() {
  const [messages, setMessages] = useState<BroadcastMessage[]>(INITIAL_BROADCASTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<BroadcastMessage | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  // Filter messages
  const filteredMessages = messages.filter((msg) =>
    msg.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    msg.senderName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalDispatches = messages.length;
  const totalRecipientsSent = messages.reduce((acc, m) => acc + m.totalRecipients, 0);
  const totalDelivered = messages.reduce((acc, m) => acc + m.deliveredCount, 0);
  const deliveryPercentage = Math.round((totalDelivered / totalRecipientsSent) * 100) || 100;

  const handleRetryFailed = (msgId: string) => {
    setIsRetrying(true);
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? { ...m, deliveredCount: m.totalRecipients, failedCount: 0 }
            : m
        )
      );
      if (selectedMessage && selectedMessage.id === msgId) {
        setSelectedMessage({
          ...selectedMessage,
          deliveredCount: selectedMessage.totalRecipients,
          failedCount: 0,
        });
      }
      setIsRetrying(false);
    }, 1200);
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 uppercase mb-1">
            <History className="w-4 h-4 text-emerald-600" />
            10RCDG Broadcast Telemetry
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Sent Messages History
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Review past mass SMS transmissions, delivery rates, and cellular operator receipt logs.
          </p>
        </div>

        <Link
          href="/dashboard/send"
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer uppercase tracking-wider self-start sm:self-auto"
        >
          <Send className="w-4 h-4" />
          <span>New Broadcast</span>
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Broadcasts</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{totalDispatches}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
            <Send className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total SMS Sent</p>
            <p className="text-2xl font-extrabold text-emerald-700 mt-1">{totalRecipientsSent}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Delivery Rate</p>
            <p className="text-2xl font-extrabold text-blue-700 mt-1">{deliveryPercentage}%</p>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search Filter Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, keywords, or sender..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white"
          />
        </div>
      </div>

      {/* Transmissions List */}
      <div className="space-y-4">
        {filteredMessages.map((msg) => {
          const successRate = Math.round((msg.deliveredCount / msg.totalRecipients) * 100);
          return (
            <div
              key={msg.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs hover:shadow-md transition-all space-y-4"
            >
              {/* Message Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <Send className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{msg.title}</h3>
                    <p className="text-xs text-slate-400 font-medium">
                      Dispatched by {msg.senderName} • {msg.sentAt}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{successRate}% Delivered</span>
                  </span>
                  {msg.failedCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{msg.failedCount} Failed</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Message Content Preview */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs sm:text-sm text-slate-800 leading-relaxed font-sans">
                "{msg.content}"
              </div>

              {/* Footer Breakdown */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-500 border-t border-slate-100">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-600">Recipients:</span>
                  <span className="font-mono font-bold text-slate-800">{msg.totalRecipients} Personnel</span>
                  <span>•</span>
                  <span className="text-slate-400">Target: {msg.targetGroupNames.join(", ")}</span>
                </div>

                <button
                  onClick={() => setSelectedMessage(msg)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-xs transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <span>View Delivery Telemetry</span>
                  <ExternalLink className="w-3 h-3 text-slate-500" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Delivery Telemetry Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Delivery Report: {selectedMessage.title}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Transmission ID: {selectedMessage.id} • {selectedMessage.sentAt}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedMessage(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Delivery Stats Bar */}
              <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-500">Total SMS</p>
                  <p className="text-lg font-extrabold text-slate-900 mt-0.5">
                    {selectedMessage.totalRecipients}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-emerald-700">Delivered</p>
                  <p className="text-lg font-extrabold text-emerald-700 mt-0.5">
                    {selectedMessage.deliveredCount}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-red-600">Failed / Retried</p>
                  <p className="text-lg font-extrabold text-red-600 mt-0.5">
                    {selectedMessage.failedCount}
                  </p>
                </div>
              </div>

              {/* Roster Receipt Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Recipient Statuses (Sample Roster)
                </h4>
                <div className="rounded-xl border border-slate-200 overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Personnel</th>
                        <th className="py-2.5 px-3">Mobile Number</th>
                        <th className="py-2.5 px-3">Gateway Carrier</th>
                        <th className="py-2.5 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {INITIAL_PERSONNEL.slice(0, 6).map((person, idx) => {
                        const isFailed = selectedMessage.failedCount > 0 && idx === 3;
                        return (
                          <tr key={person.id} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 font-semibold text-slate-800">
                              {person.rank} {person.firstName} {person.lastName}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-600">
                              {person.mobileNumber}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 font-mono">
                              {idx % 2 === 0 ? "Globe Telecom" : "Smart Communications"}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {isFailed ? (
                                <span className="inline-flex items-center gap-1 font-bold text-red-600">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  <span>No Signal</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Delivered</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between">
              {selectedMessage.failedCount > 0 ? (
                <button
                  type="button"
                  onClick={() => handleRetryFailed(selectedMessage.id)}
                  disabled={isRetrying}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? "animate-spin" : ""}`} />
                  <span>{isRetrying ? "Retrying..." : "Resend to Failed Numbers"}</span>
                </button>
              ) : (
                <div className="text-xs text-emerald-700 font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>All SMS transmissions verified by cellular gateway.</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => setSelectedMessage(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
