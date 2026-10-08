"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FolderKanban,
  Plus,
  Users,
  Send,
  Trash2,
  Edit2,
  Shield,
  CheckCircle2,
  X,
  Layers,
  Search,
  Phone,
  Eye,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { StatCardSkeleton, GroupCardSkeleton } from "@/components/skeleton";
import { getRankBadgeStyle } from "@/lib/military-ranks";
import { formatPhMobileDisplay } from "@/lib/sms";

const COLOR_PRESETS = [
  { label: "Military Green", value: "#15803d" },
  { label: "Command Gold", value: "#b45309" },
  { label: "Emergency Red", value: "#dc2626" },
  { label: "Tactical Blue", value: "#2563eb" },
  { label: "Air Defense Cyan", value: "#0891b2" },
  { label: "Special Ops Purple", value: "#7c3aed" },
];

export default function GroupsPage() {
  const groupsData = useQuery(api.groups.list);
  const personnelData = useQuery(api.personnel.list);
  const createGroup = useMutation(api.groups.create);
  const updateGroup = useMutation(api.groups.update);
  const removeGroup = useMutation(api.groups.remove);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<Id<"contactGroups"> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Group Roster Inspection Modal State
  const [selectedGroupRoster, setSelectedGroupRoster] = useState<(typeof groups)[number] | null>(null);
  const [rosterSearch, setRosterSearch] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#15803d",
    unit: "10RCDG HQ",
  });

  const isLoading = groupsData === undefined;
  const groups = groupsData || [];
  const personnelList = personnelData || [];

  const handleOpenAdd = () => {
    setEditingGroupId(null);
    setFormData({
      name: "",
      description: "",
      color: "#15803d",
      unit: "10RCDG HQ",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (group: (typeof groups)[number]) => {
    setEditingGroupId(group._id);
    setFormData({
      name: group.name,
      description: group.description,
      color: group.color,
      unit: group.unit,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      if (editingGroupId) {
        await updateGroup({
          id: editingGroupId,
          name: formData.name,
          description: formData.description,
          color: formData.color,
          unit: formData.unit,
        });
      } else {
        await createGroup({
          name: formData.name,
          description: formData.description,
          color: formData.color,
          unit: formData.unit,
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err?.message || "Failed to save group");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: Id<"contactGroups">) => {
    if (confirm("Are you sure you want to delete this contact group?")) {
      try {
        await removeGroup({ id });
      } catch (err: any) {
        alert(err?.message || "Failed to delete group");
      }
    }
  };

  const totalMembers = groups.reduce((acc, g) => acc + g.memberCount, 0);

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 uppercase mb-1">
            <Shield className="w-4 h-4 text-emerald-600" />
            10RCDG Unit Organization
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Contact Groups
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Organize personnel into battalions, companies, and quick-dispatch alert units.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer uppercase tracking-wider self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Group</span>
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Groups</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">{groups.length}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
                <FolderKanban className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Grouped Members</p>
                <p className="text-2xl font-extrabold text-blue-700 mt-1">{totalMembers}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">SMS Dispatch Ready</p>
                <p className="text-2xl font-extrabold text-emerald-700 mt-1">100%</p>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
        {isLoading ? (
          <>
            <GroupCardSkeleton />
            <GroupCardSkeleton />
            <GroupCardSkeleton />
            <GroupCardSkeleton />
          </>
        ) : groups.length === 0 ? (
          <div className="col-span-2 p-12 bg-white rounded-2xl border border-slate-200 text-center text-slate-400">
            <FolderKanban className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold text-slate-700">No contact groups created yet</p>
            <p className="text-xs text-slate-400 mt-1">Click "Create New Group" to organize your roster.</p>
          </div>
        ) : (
          groups.map((group) => (
          <div
            key={group._id}
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden"
          >
            {/* Top Color Accent Line */}
            <div
              className="absolute top-0 left-0 right-0 h-1.5"
              style={{ backgroundColor: group.color }}
            />

            <div>
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                    style={{ backgroundColor: group.color }}
                  />
                  <div>
                    <h3
                      onClick={() => {
                        setSelectedGroupRoster(group);
                        setRosterSearch("");
                      }}
                      className="text-base sm:text-lg font-bold text-slate-900 leading-snug hover:text-emerald-800 cursor-pointer transition-colors"
                      title="Click to view assigned troops"
                    >
                      {group.name}
                    </h3>
                    <p className="text-[11px] font-mono text-slate-400 font-medium">
                      {group.unit}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(group)}
                    title="Edit Group"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(group._id)}
                    title="Delete Group"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-600 leading-relaxed mb-6">
                {group.description}
              </p>
            </div>

            {/* Footer Row */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setSelectedGroupRoster(group);
                  setRosterSearch("");
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 -ml-2 rounded-xl text-xs font-bold text-slate-700 hover:text-emerald-950 hover:bg-slate-100 transition-all cursor-pointer group/roster"
                title="Click to view assigned troops in this group"
              >
                <Users className="w-4 h-4 text-slate-400 group-hover/roster:text-emerald-700 transition-colors" />
                <span>{group.memberCount} Personnel</span>
                <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200 opacity-90 group-hover/roster:opacity-100 flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  <span>View Roster</span>
                </span>
              </button>

              <Link
                href={`/dashboard/messaging?tab=send&group=${encodeURIComponent(group.name)}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Alert</span>
              </Link>
            </div>
          </div>
        ))
        )}
      </div>

      {/* Create / Edit Group Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                  <Layers className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">
                  {editingGroupId ? "Edit Contact Group" : "Create Contact Group"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Group Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Charlie Ready Reserve Battalion"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Unit / Designation
                </label>
                <input
                  type="text"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="e.g. 1002nd RRIBn / Davao del Sur"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Description / Mission
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Operational responsibilities and scope..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-600 focus:bg-white resize-none"
                />
              </div>

              {/* Color Picker Presets */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Color Tag Accent
                </label>
                <div className="flex items-center gap-2.5">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: c.value })}
                      title={c.label}
                      className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${
                        formData.color === c.value ? "ring-2 ring-offset-2 ring-slate-800 scale-110" : ""
                      }`}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold tracking-wider uppercase transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  {editingGroupId ? "Save Changes" : "Create Group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Group Members Roster Modal */}
      {selectedGroupRoster && (() => {
        const assignedMembers = personnelList.filter(
          (p) => p.groupId === selectedGroupRoster._id || p.groupName === selectedGroupRoster.name
        );
        const activeCount = assignedMembers.filter((p) => p.status === "ACTIVE").length;
        const inactiveCount = assignedMembers.filter((p) => p.status === "INACTIVE").length;

        const q = rosterSearch.toLowerCase().trim();
        const filteredMembers = assignedMembers.filter((p) => {
          if (!q) return true;
          return (
            p.firstName.toLowerCase().includes(q) ||
            p.lastName.toLowerCase().includes(q) ||
            p.rank.toLowerCase().includes(q) ||
            p.mobileNumber.toLowerCase().includes(q) ||
            p.unit.toLowerCase().includes(q)
          );
        });

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
              {/* Top Accent Stripe */}
              <div
                className="h-1.5 w-full shrink-0"
                style={{ backgroundColor: selectedGroupRoster.color }}
              />

              {/* Modal Header */}
              <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-3 bg-slate-50/70 shrink-0">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs border border-white"
                    style={{ backgroundColor: `${selectedGroupRoster.color}20`, color: selectedGroupRoster.color }}
                  >
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
                        {selectedGroupRoster.name}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-mono font-bold">
                        {selectedGroupRoster.unit}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs">
                      <span className="font-bold text-slate-700">
                        {assignedMembers.length} Total {assignedMembers.length === 1 ? "Troop" : "Troops"}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.2 rounded-full border border-emerald-200">
                        {activeCount} Active for SMS
                      </span>
                      {inactiveCount > 0 && (
                        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.2 rounded-full border border-slate-200">
                          {inactiveCount} Inactive
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedGroupRoster(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search & Filter Bar */}
              <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-white shrink-0">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                    placeholder="Search troop by name, rank, or mobile in this group..."
                    className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white font-medium shadow-2xs"
                  />
                  {rosterSearch && (
                    <button
                      type="button"
                      onClick={() => setRosterSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Members List Container */}
              <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-2.5">
                {assignedMembers.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">No Troops Assigned Yet</p>
                      <p className="text-xs text-slate-500 mt-0.5 max-w-sm mx-auto">
                        There are currently no personnel assigned to <strong>{selectedGroupRoster.name}</strong>.
                      </p>
                    </div>
                    <Link
                      href="/dashboard/personnel"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-xs"
                    >
                      <span>Assign Troops in Personnel Directory</span>
                    </Link>
                  </div>
                ) : filteredMembers.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-xs">
                    <p>No troops found matching &quot;<strong>{rosterSearch}</strong>&quot; in this group.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                    {filteredMembers.map((member) => (
                      <div
                        key={member._id}
                        className="p-3 sm:px-4 sm:py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors text-xs"
                      >
                        {/* Left: Soldier & Rank */}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold font-mono border shrink-0 ${getRankBadgeStyle(
                              member.rank
                            )}`}
                          >
                            {member.rank}
                          </span>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 text-xs truncate">
                              {member.firstName} {member.lastName}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium truncate">
                              {member.unit}
                            </div>
                          </div>
                        </div>

                        {/* Right: Mobile Number & Status */}
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="font-mono font-bold text-slate-800 text-xs sm:text-[13px] flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400 hidden sm:inline" />
                            <span>{formatPhMobileDisplay(member.mobileNumber)}</span>
                          </div>

                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              member.status === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-slate-100 text-slate-500 border-slate-200"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                member.status === "ACTIVE" ? "bg-emerald-600" : "bg-slate-400"
                              }`}
                            />
                            <span>{member.status}</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-5 sm:px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
                <div className="text-xs text-slate-500 font-medium">
                  Showing <strong className="text-slate-800">{filteredMembers.length}</strong> of{" "}
                  <strong className="text-slate-800">{assignedMembers.length}</strong> members
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedGroupRoster(null)}
                    className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Close
                  </button>

                  <Link
                    href={`/dashboard/messaging?tab=send&group=${encodeURIComponent(selectedGroupRoster.name)}`}
                    className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-xs flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Alert</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
