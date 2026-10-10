"use client";

import Link from "next/link";
import {
  Users,
  Send,
  CheckCircle2,
  History,
  Clock,
  ExternalLink,
  ChevronRight,
  Radio,
  Bookmark,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { QuickMessageCard } from "./quick-message-card";
import { Skeleton } from "@/components/skeleton";
import { formatBroadcastTitle } from "@/lib/sms";

export default function DashboardPage() {
  const personnelData = useQuery(api.personnel.list);
  const broadcastsData = useQuery(api.broadcasts.list);

  const isLoading = personnelData === undefined || broadcastsData === undefined;

  const personnel = personnelData || [];
  const broadcasts = broadcastsData || [];

  const totalPersonnel = personnel.length;
  const activePersonnel = personnel.filter((p) => p.status === "ACTIVE").length;
  const totalBroadcasts = broadcasts.length;
  const recentBroadcasts = broadcasts.slice(0, 3);

  const totalSentRecipients = broadcasts.reduce((acc, b) => acc + b.totalRecipients, 0);
  const totalDeliveredRecipients = broadcasts.reduce((acc, b) => acc + b.deliveredCount, 0);
  const deliveryPctOverall = totalSentRecipients > 0
    ? `${Math.round((totalDeliveredRecipients / totalSentRecipients) * 100)}%`
    : "100%";

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 uppercase mb-1">
            <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
            10RCDG Mass Messaging System
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-slate-500 mt-0.5 text-sm">
            Operational SMS gateway & live unit dispatch console.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 self-start sm:self-auto shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Ready to Send Messages
        </div>
      </div>

      {/* Operational Quick-Links Strip */}
      {isLoading ? (
        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <Skeleton className="h-9 w-48 rounded-lg" />
          <Skeleton className="h-9 w-60 rounded-lg" />
          <Skeleton className="h-5 w-44 rounded-lg ml-auto hidden md:block" />
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 sm:p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Quick jump to Members & Contacts */}
            <Link
              href="/dashboard/personnel"
              className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-emerald-50/80 border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-950 transition-all font-medium"
              title="Open Members & Contacts Directory"
            >
              <div className="p-1 rounded bg-white border border-slate-200 group-hover:border-emerald-300 text-emerald-700 transition-colors">
                <Users className="w-3.5 h-3.5" />
              </div>
              <span className="font-extrabold text-slate-900 group-hover:text-emerald-950 font-mono">
                {totalPersonnel}
              </span>
              <span className="text-slate-600 text-xs">Members</span>
              <span className="text-slate-300">·</span>
              <span className="text-[11px] text-emerald-700 font-semibold font-mono">
                {activePersonnel} Active Mobile
              </span>
              <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all" />
            </Link>

            {/* Quick jump to Messaging Outbox */}
            <Link
              href="/dashboard/messaging?tab=outbox"
              className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-blue-50/80 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-950 transition-all font-medium"
              title="Open Sent Outbox & Delivery Status"
            >
              <div className="p-1 rounded bg-white border border-slate-200 group-hover:border-blue-300 text-blue-700 transition-colors">
                <Send className="w-3.5 h-3.5" />
              </div>
              <span className="font-extrabold text-slate-900 group-hover:text-blue-950 font-mono">
                {totalBroadcasts}
              </span>
              <span className="text-slate-600 text-xs">Dispatches</span>
              <span className="text-slate-300">·</span>
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold font-mono">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                {deliveryPctOverall} Delivered
              </span>
              <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-blue-700 group-hover:translate-x-0.5 transition-all" />
            </Link>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
            <span>Quick shortcuts to detailed rosters & broadcast logs</span>
          </div>
        </div>
      )}

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Quick Send Alert Card (Interactive) */}
        <div className="lg:col-span-7">
          <QuickMessageCard />
        </div>

        {/* Recent Messages Sent */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-800" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Recent Messages Sent
                </h2>
              </div>
              <Link
                href="/dashboard/messaging?tab=outbox"
                className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 inline-flex items-center gap-1 transition-colors"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* List of Recent Transmissions */}
            <div className="space-y-3">
              {isLoading ? (
                <>
                  <Skeleton className="h-20 w-full rounded-xl" />
                  <Skeleton className="h-20 w-full rounded-xl" />
                  <Skeleton className="h-20 w-full rounded-xl" />
                </>
              ) : recentBroadcasts.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  No transmissions sent yet today.
                </div>
              ) : (
                recentBroadcasts.map((msg) => {
                  const deliveryPct = msg.totalRecipients > 0
                    ? Math.round((msg.deliveredCount / msg.totalRecipients) * 100)
                    : 100;
                  const { title: displayTitle, isTemplate } = formatBroadcastTitle(msg.title);
                  return (
                    <div
                      key={msg._id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100/80 transition-all space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        {isTemplate ? (
                          <h3 className="text-xs font-bold text-slate-900 truncate pr-2 flex items-center gap-1.5">
                            <Bookmark className="w-3 h-3 text-emerald-700 shrink-0" />
                            <span>{displayTitle}</span>
                          </h3>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase font-mono bg-slate-100 text-slate-500 border border-slate-200">
                            NO SMS TEMPLATE
                          </span>
                        )}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0 font-mono">
                          {deliveryPct}% Delivered
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 line-clamp-1 leading-relaxed">
                        {msg.content}
                      </p>

                      <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1.5 text-slate-500 truncate mr-2">
                          <Users className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{msg.totalRecipients} Recipients</span>
                          <span className="text-slate-300">·</span>
                          <span className="truncate">Sent by: <strong className="text-slate-700 font-semibold">{msg.senderName || "Command"}</strong></span>
                        </span>
                        <span className="flex items-center gap-1 shrink-0 font-mono text-slate-400">
                          <Clock className="w-3 h-3" />
                          {msg.sentAt}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4">
            <Link
              href="/dashboard/messaging?tab=send"
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Open Messaging Broadcast Hub</span>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
