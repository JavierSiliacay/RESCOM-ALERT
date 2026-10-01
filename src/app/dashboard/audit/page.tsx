"use client";

import { useState } from "react";
import {
  FileCheck,
  Search,
  Filter,
  Download,
  Shield,
  Radio,
  UserCheck,
  Lock,
  Calendar,
  Globe,
  Printer,
} from "lucide-react";
import { INITIAL_AUDIT_LOGS, AuditLogItem } from "@/lib/mock-data";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>(INITIAL_AUDIT_LOGS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.ipAddress.includes(searchQuery);

    const matchesCategory =
      selectedCategory === "ALL" || log.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleExportCSV = () => {
    const headers = "Timestamp,User,Role,Category,Action,Details,IP Address\n";
    const rows = filteredLogs
      .map(
        (l) =>
          `"${l.timestamp}","${l.userName}","${l.userRole}","${l.category}","${l.action}","${l.details}","${l.ipAddress}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `10RCDG_Audit_Log_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const handlePrint = () => {
    window.print();
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "BROADCAST":
        return {
          label: "Broadcast SMS",
          icon: Radio,
          classes: "bg-emerald-50 text-emerald-800 border-emerald-200",
        };
      case "AUTH":
        return {
          label: "Authentication",
          icon: Lock,
          classes: "bg-blue-50 text-blue-800 border-blue-200",
        };
      case "PERSONNEL":
        return {
          label: "Personnel Record",
          icon: UserCheck,
          classes: "bg-amber-50 text-amber-900 border-amber-200",
        };
      default:
        return {
          label: "System Security",
          icon: Shield,
          classes: "bg-slate-100 text-slate-700 border-slate-200",
        };
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 uppercase mb-1">
            <Shield className="w-4 h-4 text-emerald-600" />
            10RCDG Compliance & Security Log
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Activity History & Audit Logs
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Immutable military audit trail of all logins, message broadcasts, and roster adjustments.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print Report</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer uppercase tracking-wider"
          >
            <Download className="w-4 h-4" />
            <span>Export Log</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Recorded Events</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{logs.length}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
            <FileCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Audit Integrity</p>
            <p className="text-2xl font-extrabold text-emerald-700 mt-1">VERIFIED</p>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
            <Shield className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">System Retention</p>
            <p className="text-2xl font-extrabold text-blue-700 mt-1">365 Days</p>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700">
            <Calendar className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search audit actions, users, or IP..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            <span>Category:</span>
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-600"
          >
            <option value="ALL">All Categories</option>
            <option value="BROADCAST">Broadcast SMS</option>
            <option value="AUTH">Authentication</option>
            <option value="PERSONNEL">Personnel Records</option>
            <option value="SECURITY">Security Changes</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <FileCheck className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold text-slate-700">No audit logs match criteria</p>
            <p className="text-xs text-slate-400 mt-1">Try clearing your search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">Timestamp</th>
                  <th className="py-3.5 px-4">Officer & Role</th>
                  <th className="py-3.5 px-4">Event Category</th>
                  <th className="py-3.5 px-4">Action Summary</th>
                  <th className="py-3.5 px-4">Details</th>
                  <th className="py-3.5 px-4 text-right sm:pr-6">Station IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {filteredLogs.map((log) => {
                  const badge = getCategoryBadge(log.category);
                  const Icon = badge.icon;
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Timestamp */}
                      <td className="py-3.5 px-4 sm:px-6 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {log.timestamp}
                      </td>

                      {/* Officer & Role */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{log.userName}</span>
                          <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {log.userRole}
                          </span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${badge.classes}`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {log.action}
                      </td>

                      {/* Details */}
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                        {log.details}
                      </td>

                      {/* Station IP */}
                      <td className="py-3.5 px-4 text-right sm:pr-6 font-mono text-[11px] text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Globe className="w-3 h-3 text-slate-400" />
                          <span>{log.ipAddress}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
