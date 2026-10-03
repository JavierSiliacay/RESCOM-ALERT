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
} from "lucide-react";
import { UserRole, UserStatus } from "@/auth";
import {
  RANK_GROUPS,
  getRankFullName,
} from "@/lib/military-ranks";
import { RankSearchSelect } from "@/components/rank-search-select";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

const ROLES_LIST: { label: string; value: UserRole; description: string }[] = [
  {
    label: "Commander",
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

  const officers = officersData || [];

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState<(typeof officers)[number] | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    rank: "CPT",
    role: "OPERATOR" as UserRole,
    unit: "10RCDG HQ",
  });

  const handleOpenAdd = () => {
    setEditingOfficer(null);
    setFormData({
      name: "",
      email: "",
      rank: "CPT",
      role: "OPERATOR",
      unit: "10RCDG HQ",
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
          status: editingOfficer.status as any,
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

  const handleToggleStatus = async (officer: (typeof officers)[number]) => {
    const commanderEmails = ["siliacay.javier@gmail.com", "javiersiliacaysiliacay1234@gmail.com"];
    if (commanderEmails.includes(officer.email.toLowerCase())) {
      alert("Group Commander account cannot be suspended.");
      return;
    }
    const newStatus = officer.status === "ACTIVE" || officer.status === "APPROVED" ? "SUSPENDED" : "ACTIVE";
    try {
      await updateOfficerRole({
        id: officer._id,
        role: officer.role as any,
        status: newStatus as any,
      });
    } catch (err: any) {
      alert(err?.message || "Failed to toggle status");
    }
  };

  const handleRevoke = async (id: Id<"authorizedUsers">, email: string) => {
    if (email === "siliacay.javier@gmail.com") {
      alert("Primary Group Commander access cannot be revoked.");
      return;
    }
    if (confirm(`Are you sure you want to revoke login access for ${email}?`)) {
      try {
        await removeOfficer({ id });
      } catch (err: any) {
        alert(err?.message || "Failed to revoke access");
      }
    }
  };

  const filteredOfficers = officers.filter((o) => {
    const matchesSearch =
      o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.unit.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.rank.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === "ALL" || o.role === roleFilter;
    const matchesStatus = statusFilter === "ALL" || o.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const activeCount = officers.filter((o) => o.status === "ACTIVE" || o.status === "APPROVED").length;
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
            Manage authorized officer Google login clearances, assign military roles, and control dispatch permissions.
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
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Clearances</p>
            <p className="text-2xl font-extrabold text-emerald-700 mt-1">{activeCount}</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-5 h-5" />
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

        <div className="flex items-center gap-2 w-full sm:w-auto">
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
            <option value="COMMANDER">Commander</option>
            <option value="ADMIN">Deputy Commander / Admin</option>
            <option value="OPERATOR">Operations Officer (S3)</option>
            <option value="VIEWER">Viewer</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>
      </div>

      {/* Authorized Officers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4 sm:px-6">Officer & Email</th>
                <th className="py-3.5 px-4">Military Role</th>
                <th className="py-3.5 px-4">Assigned Unit</th>
                <th className="py-3.5 px-4">Clearance Status</th>
                <th className="py-3.5 px-4">Last Login</th>
                <th className="py-3.5 px-4 text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredOfficers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    No authorized personnel found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredOfficers.map((officer) => (
                  <tr key={officer._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold flex items-center justify-center shrink-0">
                          {officer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{officer.name}</span>
                            <span className="text-[10px] font-mono text-slate-400">({officer.rank})</span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            {officer.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {officer.role === "COMMANDER" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 font-mono">
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

                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {officer.unit}
                    </td>

                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleStatus(officer)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                          officer.status === "ACTIVE" || officer.status === "APPROVED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                            : "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                        }`}
                        title="Click to toggle status"
                      >
                        {officer.status === "ACTIVE" || officer.status === "APPROVED" ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" />
                            <span>Suspended</span>
                          </>
                        )}
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 text-[11px] font-mono">
                      {officer.lastLogin}
                    </td>

                    <td className="py-3.5 px-4 text-right pr-6 space-x-1">
                      <button
                        onClick={() => handleOpenEdit(officer)}
                        title="Edit Officer Access"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleRevoke(officer._id, officer.email)}
                        title="Revoke Clearance"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Authorize / Edit Officer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingOfficer ? "Edit Officer Access Clearance" : "Authorize New 10RCDG Personnel"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Grant Google OAuth login permissions and set command roles
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
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

              <div className="grid grid-cols-2 gap-3">
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
                  {ROLES_LIST.map((r) => (
                    <label
                      key={r.value}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        formData.role === r.value
                          ? "bg-emerald-50/80 border-emerald-600 ring-1 ring-emerald-600"
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

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 disabled:bg-slate-400 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {isSaving ? "Saving..." : editingOfficer ? "Save Changes" : "Confirm Authorization"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
