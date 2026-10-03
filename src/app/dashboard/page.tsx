"use client";

import Link from "next/link";
import {
  Users,
  Smartphone,
  Send,
  CheckCircle2,
  History,
  Clock,
  ExternalLink,
  ChevronRight,
  Radio,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { QuickMessageCard } from "./quick-message-card";

export default function DashboardPage() {
  const personnel = useQuery(api.personnel.list) || [];
  const broadcasts = useQuery(api.broadcasts.list) || [];

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
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          label="Total Members"
          value={totalPersonnel.toString()}
          sub="Registered Contacts"
          icon={Users}
          accentBorder="border-l-emerald-700"
          iconColor="text-emerald-700 bg-emerald-50 border-emerald-200"
        />
        <StatCard
          label="Mobile Numbers"
          value={activePersonnel.toString()}
          sub="Ready Phone Numbers"
          icon={Smartphone}
          accentBorder="border-l-blue-600"
          iconColor="text-blue-700 bg-blue-50 border-blue-200"
        />
        <StatCard
          label="Messages Sent"
          value={totalBroadcasts.toString()}
          sub="Broadcast Dispatches"
          icon={Send}
          accentBorder="border-l-amber-600"
          iconColor="text-amber-700 bg-amber-50 border-amber-200"
        />
        <StatCard
          label="Delivery Rate"
          value={deliveryPctOverall}
          sub="Network Success Rate"
          icon={CheckCircle2}
          accentBorder="border-l-emerald-600"
          iconColor="text-emerald-700 bg-emerald-50 border-emerald-200"
        />
      </div>

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
              {recentBroadcasts.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  No transmissions sent yet today.
                </div>
              ) : (
                recentBroadcasts.map((msg) => {
                  const deliveryPct = msg.totalRecipients > 0
                    ? Math.round((msg.deliveredCount / msg.totalRecipients) * 100)
                    : 100;
                  return (
                    <div
                      key={msg._id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100/80 transition-all space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-slate-900 truncate pr-2">
                          {msg.title}
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0 font-mono">
                          {deliveryPct}% Delivered
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 line-clamp-1 leading-relaxed">
                        {msg.content}
                      </p>

                      <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 font-mono">
                        <span className="flex items-center gap-1 text-slate-500">
                          <Users className="w-3 h-3" />
                          {msg.totalRecipients} Recipients ({msg.targetGroupNames.join(", ")})
                        </span>
                        <span className="flex items-center gap-1">
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

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accentBorder,
  iconColor,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  accentBorder: string;
  iconColor: string;
}) {
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200 p-5 border-l-4 ${accentBorder} shadow-xs hover:shadow-md transition-all duration-150`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-extrabold text-slate-900 mt-1.5 tracking-tight">{value}</p>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">{sub}</p>
        </div>
        <div className={`p-2.5 rounded-xl border ${iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
