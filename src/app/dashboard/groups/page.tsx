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
import { getRankBadgeStyle, getRankFullName } from "@/lib/military-ranks";
import { formatPhMobileDisplay } from "@/lib/sms";
import { useCurrentOfficer } from "@/components/officer-context";

/**
 * Highlight matching words/characters with a light-green badge.
 * Space-insensitive, punctuation-insensitive, and case-insensitive.
 */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  const trimmed = query.trim();
  if (!trimmed || !text) {
    return <span>{text}</span>;
  }

  // Tokenize by spaces to allow multi-word or spaced matching
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return <span>{text}</span>;

  // Build pattern for tokens: if numeric or phone-like, allow optional spaces or hyphens between digits
  const tokenPatterns: string[] = [];

  for (const token of tokens) {
    if (/^[+\d\-()]+$/.test(token)) {
      const digitsOnly = token.replace(/\D/g, "");
      if (digitsOnly.length > 0) {
        // Standard digit pattern with flexible spacing
        const standardPattern = digitsOnly
          .split("")
          .map((d) => d.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
          .join("[\\s\\-_]*");
        tokenPatterns.push(standardPattern);

        // PH Mobile number normalization: cross-match 09... and +639... formats
        let coreDigits = "";
        if (digitsOnly.startsWith("639") && digitsOnly.length >= 4) {
          coreDigits = digitsOnly.slice(2); // starts with 9
        } else if (digitsOnly.startsWith("09") && digitsOnly.length >= 3) {
          coreDigits = digitsOnly.slice(1); // starts with 9
        } else if (digitsOnly.startsWith("9") && digitsOnly.length >= 3) {
          coreDigits = digitsOnly;
        }

        if (coreDigits) {
          const corePattern = coreDigits
            .split("")
            .map((d) => d.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
            .join("[\\s\\-_]*");
          // Match with optional (+63 or 0) prefix or just the core digits
          tokenPatterns.push(`(?:(?:\\+?63|0)[\\s\\-_]*)?${corePattern}`);
          tokenPatterns.push(corePattern);
        }
      }
    } else {
      tokenPatterns.push(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    }
  }

  try {
    const fullPattern = `(${tokenPatterns.join("|")})`;
    const regex = new RegExp(fullPattern, "gi");
    const parts = text.split(regex);

    return (
      <span>
        {parts.map((part, index) => {
          if (!part) return null;
          const isMatch = tokenPatterns.some((pattern) => new RegExp(`^${pattern}$`, "gi").test(part));
          return isMatch ? (
            <mark
              key={index}
              className="bg-emerald-200 text-emerald-950 font-extrabold px-1 py-0.5 rounded-sm shadow-2xs"
            >
              {part}
            </mark>
          ) : (
            <span key={index}>{part}</span>
          );
        })}
      </span>
    );
  } catch {
    return <span>{text}</span>;
  }
}

// Cross-match local (09...) and international (639...) formats & core national digits
function getPhCoreDigits(str: string) {
  const d = str.replace(/\D/g, "");
  if (d.startsWith("639")) return d.slice(2);
  if (d.startsWith("09")) return d.slice(1);
  return d;
}

const COLOR_PRESETS = [
  { label: "Military Green", value: "#15803d" },
  { label: "Command Gold", value: "#b45309" },
  { label: "Emergency Red", value: "#dc2626" },
  { label: "Tactical Blue", value: "#2563eb" },
  { label: "Air Defense Cyan", value: "#0891b2" },
  { label: "Special Ops Purple", value: "#7c3aed" },
];

export default function GroupsPage() {
  const currentOfficer = useCurrentOfficer();
  const { isViewer, guardAction, isGlobalAdmin, isScopedAdmin, isGroupAuthorized } = currentOfficer;
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
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#15803d",
    unit: "10RCDG HQ",
  });

  const isLoading = groupsData === undefined;
  const groups = groupsData || [];
  const personnelList = personnelData || [];

  // Filter groups with tokenized, space-insensitive logic
  const trimmedGroupQuery = searchQuery.trim();
  const groupWords = trimmedGroupQuery.split(/\s+/).filter(Boolean);
  const qGroupClean = trimmedGroupQuery.replace(/[\s\-_+()]/g, "").toLowerCase();

  const filteredGroups = groups.filter((group) => {
    if (!trimmedGroupQuery) return true;

    const name = group.name.toLowerCase();
    const cleanName = name.replace(/[\s\-_]/g, "");

    const unit = (group.unit || "").toLowerCase();
    const cleanUnit = unit.replace(/[\s\-_]/g, "");

    const desc = (group.description || "").toLowerCase();
    const cleanDesc = desc.replace(/[\s\-_]/g, "");

    // Multi-word tokens: every token must match name, unit, or description
    const matchesAllTokens =
      groupWords.length > 0 &&
      groupWords.every((w) => {
        const wLower = w.toLowerCase();
        const wClean = wLower.replace(/[\s\-_+()]/g, "");
        return (
          name.includes(wLower) ||
          cleanName.includes(wClean) ||
          unit.includes(wLower) ||
          cleanUnit.includes(wClean) ||
          desc.includes(wLower) ||
          cleanDesc.includes(wClean)
        );
      });

    return (
      name.includes(trimmedGroupQuery.toLowerCase()) ||
      cleanName.includes(qGroupClean) ||
      unit.includes(trimmedGroupQuery.toLowerCase()) ||
      cleanUnit.includes(qGroupClean) ||
      desc.includes(trimmedGroupQuery.toLowerCase()) ||
      cleanDesc.includes(qGroupClean) ||
      matchesAllTokens
    );
  });

  const handleOpenAdd = () => {
    if (isScopedAdmin) {
      alert("Access Denied: Creating new contact groups is restricted to Command / Global Administrators.");
      return;
    }
    guardAction("create new contact group", () => {
      setEditingGroupId(null);
      setFormData({
        name: "",
        description: "",
        color: "#15803d",
        unit: "10RCDG HQ",
      });
      setIsModalOpen(true);
    });
  };

  const handleOpenEdit = (group: (typeof groups)[number]) => {
    if (!isGroupAuthorized(group.name)) {
      alert("Access Denied: You are not authorized to modify contact groups outside your assigned unit.");
      return;
    }
    guardAction("edit contact group", () => {
      setEditingGroupId(group._id);
      setFormData({
        name: group.name,
        description: group.description,
        color: group.color,
        unit: group.unit,
      });
      setIsModalOpen(true);
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewer) {
      guardAction("save contact group");
      return;
    }

    try {
      setIsSaving(true);
      if (editingGroupId) {
        await updateGroup({
          id: editingGroupId,
          name: formData.name,
          description: formData.description,
          color: formData.color,
          unit: formData.unit,
          officerEmail: currentOfficer.email,
        });
      } else {
        await createGroup({
          name: formData.name,
          description: formData.description,
          color: formData.color,
          unit: formData.unit,
          officerEmail: currentOfficer.email,
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err?.message || "Failed to save group");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: Id<"contactGroups">, groupName?: string) => {
    if (groupName && !isGroupAuthorized(groupName)) {
      alert("Access Denied: You are not authorized to delete contact groups outside your assigned unit.");
      return;
    }
    guardAction("delete contact group", async () => {
      if (confirm(`Are you sure you want to delete this contact group${groupName ? ` "${groupName}"` : ""}?`)) {
        try {
          await removeGroup({
            id,
            officerEmail: currentOfficer.email,
          });
        } catch (err: any) {
          alert(err?.message || "Failed to delete group");
        }
      }
    });
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

      {/* Viewer Clearance Alert Banner */}
      {isViewer && (
        <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-950 flex items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Viewer Clearance Mode:</strong> You are viewing unit contact groups with read-only privileges. Creating, modifying, or removing groups requires Administrative clearance.
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-amber-100 border border-amber-300 font-mono text-[10px] font-bold shrink-0 text-amber-900">
            READ-ONLY
          </span>
        </div>
      )}

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

      {/* Search & Filter Bar for Contact Groups */}
      {!isLoading && groups.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contact groups by name, unit, or mission..."
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                title="Clear group search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-slate-500 font-medium px-1 sm:px-0 shrink-0">
            <span>
              Showing <strong className="text-slate-800">{filteredGroups.length}</strong> of{" "}
              <strong className="text-slate-800">{groups.length}</strong> {groups.length === 1 ? "group" : "groups"}
            </span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-xs text-emerald-800 hover:text-emerald-950 font-bold underline cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      )}

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
        ) : filteredGroups.length === 0 ? (
          <div className="col-span-2 p-12 bg-white rounded-2xl border border-slate-200 text-center text-slate-400">
            <FolderKanban className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold text-slate-700">No contact groups match &quot;{searchQuery}&quot;</p>
            <p className="text-xs text-slate-400 mt-1">Try searching with a different name, unit, or operational scope.</p>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Filter</span>
            </button>
          </div>
        ) : (
          filteredGroups.map((group) => (
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
                      <HighlightMatch text={group.name} query={searchQuery} />
                    </h3>
                    <p className="text-[11px] font-mono text-slate-400 font-medium">
                      <HighlightMatch text={group.unit} query={searchQuery} />
                    </p>
                  </div>
                </div>

                {isGroupAuthorized(group.name) ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(group)}
                      title="Edit Group"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(group._id, group.name)}
                      title="Delete Group"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                    Read Only
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-xs text-slate-600 leading-relaxed mb-6">
                <HighlightMatch text={group.description} query={searchQuery} />
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

              {isGroupAuthorized(group.name) ? (
                <Link
                  href={`/dashboard/messaging?tab=send&group=${encodeURIComponent(group.name)}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Alert</span>
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-400 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg">
                  Restricted Scope
                </span>
              )}
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

        const trimmedRosterQuery = rosterSearch.trim();
        const rosterWords = trimmedRosterQuery.split(/\s+/).filter(Boolean);
        const qDigits = trimmedRosterQuery.replace(/\D/g, "");
        const qClean = trimmedRosterQuery.replace(/[\s\-_+()]/g, "").toLowerCase();
        const queryCore = getPhCoreDigits(qDigits);

        const filteredMembers = assignedMembers.filter((person) => {
          if (!trimmedRosterQuery) return true;

          // 1. Mobile Number (space-insensitive and PH format cross-matching)
          const rawMobile = (person.mobileNumber || "").toLowerCase();
          const cleanMobile = rawMobile.replace(/[\s\-_+()]/g, "");
          const mobileDigits = rawMobile.replace(/\D/g, "");
          const formattedMobile = formatPhMobileDisplay(person.mobileNumber).toLowerCase();
          const formattedDigits = formattedMobile.replace(/\D/g, "");
          const storedCore = getPhCoreDigits(mobileDigits);

          const localMobileDigits = mobileDigits.startsWith("63")
            ? "0" + mobileDigits.slice(2)
            : mobileDigits;
          const intlMobileDigits = mobileDigits.startsWith("0")
            ? "63" + mobileDigits.slice(1)
            : mobileDigits;

          const matchesMobile =
            rawMobile.includes(trimmedRosterQuery.toLowerCase()) ||
            cleanMobile.includes(qClean) ||
            formattedMobile.includes(trimmedRosterQuery.toLowerCase()) ||
            (qDigits.length > 0 && (
              mobileDigits.includes(qDigits) ||
              formattedDigits.includes(qDigits) ||
              localMobileDigits.includes(qDigits) ||
              intlMobileDigits.includes(qDigits) ||
              (queryCore.length >= 2 && storedCore.includes(queryCore))
            ));

          // 2. Name, Rank & Unit
          const fullName = `${person.firstName} ${person.lastName}`.toLowerCase();
          const cleanFullName = fullName.replace(/[\s\-_]/g, "");

          const rankFullName = getRankFullName(person.rank).toLowerCase();
          const rankCode = person.rank.toLowerCase();

          const unit = (person.unit || "").toLowerCase();
          const cleanUnit = unit.replace(/[\s\-_]/g, "");

          // Multi-word tokens: all tokens must match at least one field of the member
          const matchesAllTokens =
            rosterWords.length > 0 &&
            rosterWords.every((w) => {
              const wLower = w.toLowerCase();
              const wClean = wLower.replace(/[\s\-_+()]/g, "");
              const wDigits = w.replace(/\D/g, "");
              const wCore = getPhCoreDigits(wDigits);

              return (
                fullName.includes(wLower) ||
                cleanFullName.includes(wClean) ||
                rankCode.includes(wLower) ||
                rankFullName.includes(wLower) ||
                unit.includes(wLower) ||
                cleanUnit.includes(wClean) ||
                cleanMobile.includes(wClean) ||
                (wDigits.length > 0 && (
                  mobileDigits.includes(wDigits) ||
                  localMobileDigits.includes(wDigits) ||
                  intlMobileDigits.includes(wDigits) ||
                  (wCore.length >= 2 && storedCore.includes(wCore))
                ))
              );
            });

          const matchesName =
            fullName.includes(trimmedRosterQuery.toLowerCase()) ||
            cleanFullName.includes(qClean) ||
            matchesAllTokens;

          const matchesRank =
            rankCode.includes(trimmedRosterQuery.toLowerCase()) ||
            rankFullName.includes(trimmedRosterQuery.toLowerCase()) ||
            rankFullName.replace(/[\s\-_]/g, "").includes(qClean);

          const matchesUnit =
            unit.includes(trimmedRosterQuery.toLowerCase()) ||
            cleanUnit.includes(qClean);

          return matchesMobile || matchesName || matchesRank || matchesUnit || matchesAllTokens;
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
                    placeholder="Search troop by name, rank, unit, or mobile number..."
                    className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white font-medium shadow-2xs"
                  />
                  {rosterSearch && (
                    <button
                      type="button"
                      onClick={() => setRosterSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                      title="Clear search"
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
                  <div className="py-10 text-center text-slate-400 text-xs space-y-2">
                    <p>No troops found matching &quot;<strong>{rosterSearch}</strong>&quot; in this group.</p>
                    <button
                      type="button"
                      onClick={() => setRosterSearch("")}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                      <span>Clear Search</span>
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                    {filteredMembers.map((member) => {
                      const badge = getRankBadgeStyle(member.rank);
                      return (
                        <div
                          key={member._id}
                          className="p-3 sm:px-4 sm:py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors text-xs"
                        >
                          {/* Left: Soldier & Rank */}
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold font-mono border shrink-0 ${badge.bg} ${badge.text} ${badge.border}`}
                            >
                              <HighlightMatch text={member.rank} query={rosterSearch} />
                            </span>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 text-xs truncate">
                                <HighlightMatch
                                  text={`${member.firstName} ${member.lastName}`}
                                  query={rosterSearch}
                                />
                              </div>
                              <div className="text-[10px] text-slate-400 font-medium truncate">
                                <HighlightMatch
                                  text={member.unit || ""}
                                  query={rosterSearch}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Right: Mobile Number & Status */}
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="font-mono font-bold text-slate-800 text-xs sm:text-[13px] flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400 hidden sm:inline" />
                              <span>
                                <HighlightMatch
                                  text={formatPhMobileDisplay(member.mobileNumber)}
                                  query={rosterSearch}
                                />
                              </span>
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
                      );
                    })}
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
