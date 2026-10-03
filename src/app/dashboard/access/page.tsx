"use client";

import { useState } from "react";
import {
  UserCheck,
  Search,
  Filter,
  Plus,
  Shield,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  X,
  Mail,
  Crown,
  Radio,
  Activity,
  ShieldAlert,
  ShieldCheck,
  Code2,
} from "lucide-react";
import { UserRole, UserStatus } from "@/auth";
import {
  RANK_GROUPS,
  getRankFullName,
} from "@/lib/military-ranks";
import { RankSearchSelect } from "@/components/rank-search-select";
import { getPresenceStatus } from "@/lib/presence";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

const ROLES_LIST: { label: string; value: UserRole; description: string }[] = [
  {
    label: "Group Commander",
    value: "COMMANDER",
    description: "Full operational authority, mass broadcast, and roster oversight",
  },
  {
    label: "Deputy Commander / Admin",
    value: "ADMIN",
    description: "Executive control, broadcast authorization, and roster admin",
  },
  {
    label: "Operations Officer (S3 / Duty)",
    value: "OPERATOR",
    description: "Authorized to compose and dispatch urgent mass SMS alerts",
  },
  {
    label: "Viewer",
    value: "VIEWER",
    description: "Read-only access to view telemetry and unit rosters",
  },
];

export default function AuthorizedPersonnelPage() {
  const officersData = useQuery(api.access.list);
  const createOfficer = useMutation(api.access.create);
  const updateOfficer = useMutation(api.access.update);
  const updateOfficerRole = useMutation(api.access.updateRole);
  const removeOfficer = useMutation(api.access.remove);
  const suspendOfficer = useMutation(api.access.suspendOfficer);
  const reactivateOfficer = useMutation(api.access.reactivateOfficer);

  const officers = officersData || [];

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [presenceFilter, setPresenceFilter] = useState("ALL");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState<(typeof officers)[number] | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Revoke Confirmation Modal State
  const [revokeTarget, setRevokeTarget] = useState<(typeof officers)[number] | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  // Suspension Modal State
  const [suspendTarget, setSuspendTarget] = useState<(typeof officers)[number] | null>(null);
  const [suspendReason, setSuspendReason] = useState("Administrative Review");
  const [customReason, setCustomReason] = useState("");
  const [suspendDuration, setSuspendDuration] = useState("Indefinite (Until Command Reinstatement)");
  const [isSubmittingSuspension, setIsSubmittingSuspension] = useState(false);

  // Reactivate Modal State
  const [reactivateTarget, setReactivateTarget] = useState<(typeof officers)[number] | null>(null);
  const [isReactivating, setIsReactivating] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    rank: "CPT",
    role: "OPERATOR" as UserRole,
    unit: "10RCDG HQ",
    status: "ACTIVE" as UserStatus,
  });

  const handleOpenAdd = () => {
    setEditingOfficer(null);
    setFormData({
      name: "",
      email: "",
      rank: "CPT",
      role: "OPERATOR",
      unit: "10RCDG HQ",
      status: "ACTIVE",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (officer: (typeof officers)[number]) => {
    setEditingOfficer(officer);
    setFormData({
      name: officer.name,
      email: officer.email,
      rank: officer.rank,
      role: officer.role as UserRole,
      unit: officer.unit,
      status: (officer.status as UserStatus) || "ACTIVE",
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = formData.email.trim().toLowerCase();
    if (!cleanEmail) return;

    try {
      setIsSaving(true);
      if (editingOfficer) {
        await updateOfficer({
          id: editingOfficer._id,
          name: formData.name.trim() || cleanEmail.split("@")[0],
          email: cleanEmail,
          rank: formData.rank,
          role: formData.role,
          unit: formData.unit.trim() || "10RCDG HQ",
          status: formData.status as any,
        });
      } else {
        await createOfficer({
          name: formData.name.trim() || cleanEmail.split("@")[0],
          email: cleanEmail,
          rank: formData.rank,
          role: formData.role,
          unit: formData.unit.trim() || "10RCDG HQ",
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err?.message || "Failed to save officer clearance");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = (officer: (typeof officers)[number]) => {
    const commanderEmail = "siliacay.javier@gmail.com";
    if (officer.email.toLowerCase() === commanderEmail.toLowerCase()) {
      alert("Master Developer / Commander account cannot be suspended.");
      return;
    }
    const isSuspended = officer.status === "SUSPENDED" || officer.status === "REJECTED";
    if (isSuspended) {
      setReactivateTarget(officer);
    } else {
      setSuspendTarget(officer);
      setSuspendReason("Administrative Review");
      setCustomReason("");
      setSuspendDuration("Indefinite (Until Command Reinstatement)");
    }
  };

  const handleConfirmSuspension = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suspendTarget) return;
    const finalReason =
      suspendReason === "Other (Specify Below)"
        ? customReason.trim() || "Administrative review by Command"
        : suspendReason;

    try {
      setIsSubmittingSuspension(true);
      await suspendOfficer({
        id: suspendTarget._id,
        reason: finalReason,
        duration: suspendDuration,
      });
      setSuspendTarget(null);
    } catch (err: any) {
      alert(err?.message || "Failed to suspend officer");
    } finally {
      setIsSubmittingSuspension(false);
    }
  };

  const handleConfirmReactivate = async () => {
    if (!reactivateTarget) return;
    try {
      setIsReactivating(true);
      await reactivateOfficer({ id: reactivateTarget._id });
      setReactivateTarget(null);
    } catch (err: any) {
      alert(err?.message || "Failed to reinstate officer access");
    } finally {
      setIsReactivating(false);
    }
  };

  const handleOpenRevokeModal = (officer: (typeof officers)[number]) => {
    const commanderEmail = "siliacay.javier@gmail.com";
    if (officer.email.toLowerCase() === commanderEmail.toLowerCase()) {
      alert("Primary Group Commander access cannot be revoked.");
      return;
    }
    setRevokeTarget(officer);
  };

  const handleConfirmRevoke = async () => {
    if (!revokeTarget) return;
    try {
      setIsRevoking(true);
      await removeOfficer({ id: revokeTarget._id });
      setRevokeTarget(null);
    } catch (err: any) {
      alert(err?.message || "Failed to revoke access");
    } finally {
      setIsRevoking(false);
    }
  };

  const filteredOfficers = officers.filter((o) => {
    const matchesSearch =
      o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.unit.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.rank.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === "ALL" || o.role === roleFilter;
    
    const presence = getPresenceStatus(o.lastSeenAt);
    let matchesPresence = true;
    if (presenceFilter === "ONLINE") {
      matchesPresence = presence.isOnline;
    } else if (presenceFilter === "OFFLINE") {
      matchesPresence = !presence.isOnline;
    } else if (presenceFilter === "SUSPENDED") {
      matchesPresence = o.status === "SUSPENDED";
    }

    return matchesSearch && matchesRole && matchesPresence;
  });

  const onlineCount = officers.filter((o) => getPresenceStatus(o.lastSeenAt).isOnline).length;
  const commanderCount = officers.filter((o) => o.role === "COMMANDER" || o.role === "ADMIN").length;

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 uppercase mb-1">
            <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
            Security & Access Management
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Authorized Personnel
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Real-time officer presence tracking, military clearance roles, and login access management.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer uppercase tracking-wider"
          >
            <Plus className="w-4 h-4" />
            <span>Authorize Personnel</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Authorized</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{officers.length}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 text-slate-700 border border-slate-200">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Online Now</p>
            </div>
            <p className="text-2xl font-extrabold text-emerald-700 mt-1">{onlineCount}</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Command & S-Staff</p>
            <p className="text-2xl font-extrabold text-amber-700 mt-1">{commanderCount}</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
            <Crown className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, email, or rank..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            <span>Role:</span>
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
          >
            <option value="ALL">All Roles</option>
            <option value="DEVELOPER">⚡ System Developer</option>
            <option value="COMMANDER">Commander</option>
            <option value="ADMIN">Deputy Commander / Admin</option>
            <option value="OPERATOR">Operations Officer (S3)</option>
            <option value="VIEWER">Viewer</option>
          </select>

          <select
            value={presenceFilter}
            onChange={(e) => setPresenceFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
          >
            <option value="ALL">All Activity</option>
            <option value="ONLINE">🟢 Online Now Only</option>
            <option value="OFFLINE">🔴 Offline</option>
            <option value="SUSPENDED">Suspended Accounts</option>
          </select>
        </div>
      </div>

      {/* Authorized Officers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4 sm:px-6">Officer & Account</th>
                <th className="py-3.5 px-4">Military Role</th>
                <th className="py-3.5 px-4">Assigned Unit</th>
                <th className="py-3.5 px-4">Live Activity</th>
                <th className="py-3.5 px-4 text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredOfficers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-semibold text-slate-700">No personnel found</p>
                    <p className="text-xs text-slate-400 mt-0.5">Try changing your search query or filter options.</p>
                  </td>
                </tr>
              ) : (
                filteredOfficers.map((officer) => {
                  const presence = getPresenceStatus(officer.lastSeenAt);
                  const isSuspended = officer.status === "SUSPENDED" || officer.status === "REJECTED";

                  return (
                    <tr key={officer._id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Officer Info */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-slate-800 font-bold flex items-center justify-center shrink-0 shadow-2xs">
                              {officer.name.charAt(0).toUpperCase()}
                            </div>
                            {/* Small presence indicator dot on avatar */}
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${presence.dotColor}`}
                            />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{officer.name}</span>
                              <span className="text-[10px] font-mono text-slate-400">({officer.rank})</span>
                              {isSuspended && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-red-100 text-red-700 border border-red-200 uppercase tracking-wide">
                                  Suspended
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                              {officer.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Military Role */}
                      <td className="py-3.5 px-4">
                        {officer.role === "DEVELOPER" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-purple-100 text-purple-950 border border-purple-300 font-mono shadow-2xs">
                            <Code2 className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                            SYSTEM DEVELOPER
                          </span>
                        ) : officer.role === "COMMANDER" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 font-mono shadow-2xs">
                            <Crown className="w-3 h-3 text-amber-600 shrink-0" />
                            COMMANDER
                          </span>
                        ) : officer.role === "ADMIN" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 font-mono">
                            DEPUTY / ADMIN
                          </span>
                        ) : officer.role === "OPERATOR" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                            OPERATIONS (S3)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                            VIEWER
                          </span>
                        )}
                      </td>

                      {/* Unit */}
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {officer.unit}
                      </td>

                      {/* Live Activity (Accurate Presence & Timestamp) */}
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-mono font-medium shadow-2xs"
                          style={{
                            backgroundColor: presence.isOnline ? "#ecfdf5" : "#fff1f2",
                            borderColor: presence.isOnline ? "#a7f3d0" : "#fecdd3",
                          }}
                        >
                          <span className={`w-2 h-2 rounded-full ${presence.dotColor} shrink-0`} />
                          <span className={presence.isOnline ? "text-emerald-800 font-bold" : "text-rose-700 font-medium"}>
                            {presence.label}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right pr-6 space-x-1">
                        <button
                          onClick={() => handleToggleStatus(officer)}
                          title={isSuspended ? "Re-activate Account" : "Suspend Access"}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            isSuspended
                              ? "text-red-600 hover:text-emerald-700 hover:bg-emerald-50"
                              : "text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                          }`}
                        >
                          {isSuspended ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                        </button>

                        <button
                          onClick={() => handleOpenEdit(officer)}
                          title="Edit Officer Details & Role"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleOpenRevokeModal(officer)}
                          title="Revoke Clearance"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Authorize / Edit Officer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header (Pinned) */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                    {editingOfficer ? "Edit Officer Access Clearance" : "Authorize New 10RCDG Personnel"}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500">
                    Grant Google OAuth login permissions and set command roles
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0">
              {/* Scrollable Form Body */}
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Officer Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Maj. Alfred Agbong"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Authorized Google Email
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="officer.name@gmail.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white font-mono"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Must match the exact Google account used to sign in to RESCOM ALERT.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Military Rank
                    </label>
                    <RankSearchSelect
                      value={formData.rank}
                      onChange={(rankCode) => setFormData({ ...formData, rank: rankCode })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Assigned Unit
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="10RCDG HQ"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    System Role & Authority Level
                  </label>
                  <div className="space-y-2">
                    {/* Developer role (only when editing root developer) */}
                    {formData.role === "DEVELOPER" && (
                      <div className="flex items-start gap-3 p-3 rounded-xl border bg-purple-50/80 border-purple-300 ring-1 ring-purple-300">
                        <input
                          type="radio"
                          name="userRole"
                          value="DEVELOPER"
                          checked
                          readOnly
                          className="mt-0.5 text-purple-700 focus:ring-purple-600"
                        />
                        <div>
                          <div className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                            <Code2 className="w-3.5 h-3.5 text-purple-700" />
                            System Developer (Exclusive Root)
                          </div>
                          <div className="text-[11px] text-purple-800/80 leading-tight">
                            Master technical developer with full system configuration & database authority
                          </div>
                        </div>
                      </div>
                    )}

                    {ROLES_LIST.map((r) => (
                      <label
                        key={r.value}
                        className={`flex items-start gap-3 p-2.5 sm:p-3 rounded-xl border cursor-pointer transition-all ${
                          formData.role === r.value
                            ? "bg-emerald-50/80 border-emerald-600 ring-1 ring-emerald-600 shadow-2xs"
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <input
                          type="radio"
                          name="userRole"
                          value={r.value}
                          checked={formData.role === r.value}
                          onChange={() => setFormData({ ...formData, role: r.value })}
                          className="mt-0.5 text-emerald-700 focus:ring-emerald-600"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-900">{r.label}</div>
                          <div className="text-[11px] text-slate-500 leading-tight">{r.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer (Pinned) */}
              <div className="p-3.5 sm:px-6 sm:py-3.5 border-t border-slate-100 bg-slate-50/90 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:bg-slate-400 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {isSaving ? "Saving..." : editingOfficer ? "Save Changes" : "Confirm Authorization"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revoke Access Confirmation Modal */}
      {revokeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md max-h-[calc(100dvh-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 sm:p-6 text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-100 border border-red-200 text-red-600 flex items-center justify-center shadow-xs">
                <Trash2 className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                  Revoke Access Clearance?
                </h3>
                <p className="text-xs text-slate-500">
                  This action will permanently remove this account from the authorized personnel registry.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-500 uppercase text-[10px]">Officer:</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {revokeTarget.rank} {revokeTarget.name}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-500 uppercase text-[10px]">Google Email:</span>
                  <span className="font-mono text-slate-700 font-medium">{revokeTarget.email}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-left text-[11px] text-amber-900 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  Once revoked, this user will receive an <strong>Access Revoked</strong> notice upon attempting to sign in.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setRevokeTarget(null)}
                  disabled={isRevoking}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRevoke}
                  disabled={isRevoking}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isRevoking ? "Revoking..." : "Revoke Access"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Access Confirmation Modal with Reason & Duration */}
      {suspendTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header (Pinned) */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-amber-50/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0 border border-amber-200">
                  <ShieldAlert className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                    Suspend Officer Clearance
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500">
                    Temporarily restrict login access and specify official terms
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSuspendTarget(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleConfirmSuspension} className="flex flex-col flex-1 min-h-0">
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
                {/* Officer Summary Card */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 font-mono">
                    {suspendTarget.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {suspendTarget.rank} {suspendTarget.name}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate font-mono">
                      {suspendTarget.email} • {suspendTarget.unit}
                    </p>
                  </div>
                </div>

                {/* Suspension Reason Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Suspension Reason
                  </label>
                  <div className="space-y-1.5">
                    {[
                      "Administrative Review",
                      "Security / Protocol Audit",
                      "Duty Reassignment / Leave of Absence",
                      "Temporary Inactivity Hold",
                      "Other (Specify Below)",
                    ].map((reasonOption) => (
                      <label
                        key={reasonOption}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer text-xs transition-all ${
                          suspendReason === reasonOption
                            ? "bg-amber-50/90 border-amber-400 text-amber-950 font-bold ring-1 ring-amber-300 shadow-2xs"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-medium"
                        }`}
                      >
                        <input
                          type="radio"
                          name="suspendReason"
                          value={reasonOption}
                          checked={suspendReason === reasonOption}
                          onChange={() => setSuspendReason(reasonOption)}
                          className="text-amber-700 focus:ring-amber-600"
                        />
                        <span>{reasonOption}</span>
                      </label>
                    ))}
                  </div>

                  {suspendReason === "Other (Specify Below)" && (
                    <div className="mt-2.5">
                      <textarea
                        required
                        rows={2}
                        placeholder="Explain the specific reason for suspension..."
                        value={customReason}
                        onChange={(e) => setCustomReason(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white font-medium resize-none"
                      />
                    </div>
                  )}
                </div>

                {/* Suspension Duration */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Suspension Duration
                  </label>
                  <select
                    value={suspendDuration}
                    onChange={(e) => setSuspendDuration(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white font-medium cursor-pointer"
                  >
                    <option value="Indefinite (Until Command Reinstatement)">
                      Indefinite (Until Command Reinstatement)
                    </option>
                    <option value="24 Hours">24 Hours</option>
                    <option value="3 Days">3 Days</option>
                    <option value="7 Days">7 Days</option>
                    <option value="14 Days">14 Days</option>
                    <option value="30 Days">30 Days</option>
                  </select>
                </div>

                {/* Information Callout */}
                <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <span>
                    When attempting to sign in, the officer will see this official reason and duration on their sign-in screen.
                  </span>
                </div>
              </div>

              {/* Modal Footer (Pinned) */}
              <div className="p-3.5 sm:px-6 sm:py-3.5 border-t border-slate-100 bg-slate-50/90 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setSuspendTarget(null)}
                  disabled={isSubmittingSuspension}
                  className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSuspension}
                  className="px-5 py-2 bg-amber-700 hover:bg-amber-800 disabled:bg-slate-400 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>{isSubmittingSuspension ? "Suspending..." : "Confirm Suspension"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reactivate Clearance Confirmation Modal */}
      {reactivateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md max-h-[calc(100dvh-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 sm:p-6 text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center shadow-xs">
                <ShieldCheck className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                  Reinstate Officer Access?
                </h3>
                <p className="text-xs text-slate-500">
                  Restore active login clearance and broadcast privileges for this account.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-500 uppercase text-[10px]">Officer:</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {reactivateTarget.rank} {reactivateTarget.name}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-500 uppercase text-[10px]">Google Email:</span>
                  <span className="font-mono text-slate-700 font-medium">{reactivateTarget.email}</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setReactivateTarget(null)}
                  disabled={isReactivating}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReactivate}
                  disabled={isReactivating}
                  className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-900 disabled:bg-slate-400 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isReactivating ? "Reinstating..." : "Reinstate Access"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
