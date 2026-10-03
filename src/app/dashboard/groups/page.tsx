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
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

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
  const createGroup = useMutation(api.groups.create);
  const updateGroup = useMutation(api.groups.update);
  const removeGroup = useMutation(api.groups.remove);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<Id<"contactGroups"> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#15803d",
    unit: "10RCDG HQ",
  });

  const groups = groupsData || [];

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
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
        {groups.map((group) => (
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
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
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
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(group._id)}
                    title="Delete Group"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
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
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Users className="w-4 h-4 text-slate-400" />
                <span>{group.memberCount} Personnel</span>
              </div>

              <Link
                href={`/dashboard/messaging?tab=send&group=${encodeURIComponent(group.name)}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Alert</span>
              </Link>
            </div>
          </div>
        ))}
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
    </div>
  );
}
