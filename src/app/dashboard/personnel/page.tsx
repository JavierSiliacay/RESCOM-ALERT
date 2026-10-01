"use client";

import { useState } from "react";
import {
  Users,
  Search,
  Filter,
  Plus,
  Phone,
  Shield,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  X,
  UserCheck,
} from "lucide-react";
import { INITIAL_PERSONNEL, INITIAL_GROUPS, Personnel } from "@/lib/mock-data";

const MILITARY_RANKS = [
  "BGEN", "COL", "LTC", "MAJ", "CPT", "1LT", "2LT",
  "CMS", "SMS", "MSG", "TSG", "SSG", "SGT", "CPL", "PFC", "PVT", "Reservist"
];

export default function PersonnelPage() {
  const [personnelList, setPersonnelList] = useState<Personnel[]>(INITIAL_PERSONNEL);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  
  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    rank: "PVT",
    mobileNumber: "",
    groupId: INITIAL_GROUPS[0].id,
    unit: "10RCDG HQ",
    email: "",
  });

  // Filtered List
  const filteredPersonnel = personnelList.filter((person) => {
    const matchesSearch =
      `${person.firstName} ${person.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.mobileNumber.includes(searchQuery) ||
      person.rank.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.unit.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesGroup = selectedGroup === "ALL" || person.groupId === selectedGroup;
    const matchesStatus = selectedStatus === "ALL" || person.status === selectedStatus;

    return matchesSearch && matchesGroup && matchesStatus;
  });

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData({
      firstName: "",
      lastName: "",
      rank: "PVT",
      mobileNumber: "+639",
      groupId: INITIAL_GROUPS[0].id,
      unit: "10RCDG HQ",
      email: "",
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (person: Personnel) => {
    setEditingId(person.id);
    setFormData({
      firstName: person.firstName,
      lastName: person.lastName,
      rank: person.rank,
      mobileNumber: person.mobileNumber,
      groupId: person.groupId,
      unit: person.unit,
      email: person.email || "",
    });
    setIsAddModalOpen(true);
  };

  const handleSavePersonnel = (e: React.FormEvent) => {
    e.preventDefault();
    const group = INITIAL_GROUPS.find((g) => g.id === formData.groupId);
    const groupName = group ? group.name : "General Roster";

    if (editingId) {
      // Edit existing
      setPersonnelList((prev) =>
        prev.map((p) =>
          p.id === editingId
            ? {
                ...p,
                firstName: formData.firstName,
                lastName: formData.lastName,
                rank: formData.rank,
                mobileNumber: formData.mobileNumber,
                groupId: formData.groupId,
                groupName,
                unit: formData.unit,
                email: formData.email,
              }
            : p
        )
      );
    } else {
      // Add new
      const newPerson: Personnel = {
        id: `per-${Date.now()}`,
        firstName: formData.firstName,
        lastName: formData.lastName,
        rank: formData.rank,
        mobileNumber: formData.mobileNumber,
        groupId: formData.groupId,
        groupName,
        unit: formData.unit,
        status: "ACTIVE",
        email: formData.email,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setPersonnelList([newPerson, ...personnelList]);
    }
    setIsAddModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to remove this personnel from the active roster?")) {
      setPersonnelList((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const handleToggleStatus = (id: string) => {
    setPersonnelList((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, status: p.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" } : p
      )
    );
  };

  const activeCount = personnelList.filter((p) => p.status === "ACTIVE").length;

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 uppercase mb-1">
            <Shield className="w-4 h-4 text-emerald-600" />
            10RCDG Personnel Directory
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Members & Contacts
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Manage authorized officers, enlisted soldiers, and reservist phone rosters.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer uppercase tracking-wider"
          >
            <Plus className="w-4 h-4" />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Registered</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{personnelList.length}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Numbers</p>
            <p className="text-2xl font-extrabold text-emerald-700 mt-1">{activeCount}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Groups</p>
            <p className="text-2xl font-extrabold text-amber-700 mt-1">{INITIAL_GROUPS.length}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700">
            <Shield className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, rank, or mobile..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-600"
          >
            <option value="ALL">All Groups</option>
            {INITIAL_GROUPS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-600"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Personnel Table / Card Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredPersonnel.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold text-slate-700">No personnel found</p>
            <p className="text-xs text-slate-400 mt-1">Try changing your search query or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">Name & Rank</th>
                  <th className="py-3.5 px-4">Mobile Number</th>
                  <th className="py-3.5 px-4">Unit / Group</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right sm:pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {filteredPersonnel.map((person) => (
                  <tr key={person.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Name & Rank */}
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-extrabold text-[11px] border border-amber-300">
                          {person.rank}
                        </span>
                        <div>
                          <p className="font-bold text-slate-900">
                            {person.firstName} {person.lastName}
                          </p>
                          {person.email && (
                            <p className="text-[11px] text-slate-400">{person.email}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Mobile Number */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-700">
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{person.mobileNumber}</span>
                      </div>
                    </td>

                    {/* Unit / Group */}
                    <td className="py-3.5 px-4">
                      <p className="font-medium text-slate-800">{person.groupName}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{person.unit}</p>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleStatus(person.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-all ${
                          person.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                        }`}
                      >
                        {person.status === "ACTIVE" ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-slate-400" />
                            <span>Inactive</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right sm:pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEditModal(person)}
                          title="Edit Member"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(person.id)}
                          title="Delete"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Personnel Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">
                  {editingId ? "Edit Personnel Record" : "Add New Personnel"}
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSavePersonnel} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="e.g. Rodrigo"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="e.g. Manalo"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Military Rank *
                  </label>
                  <select
                    value={formData.rank}
                    onChange={(e) => setFormData({ ...formData, rank: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-600"
                  >
                    {MILITARY_RANKS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Mobile Number (SMS) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.mobileNumber}
                    onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                    placeholder="+639171234567"
                    className="w-full px-3 py-2 font-mono bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Assigned Group *
                  </label>
                  <select
                    value={formData.groupId}
                    onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-600"
                  >
                    {INITIAL_GROUPS.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Unit / Station
                  </label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="e.g. 1001st RRIBn"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="soldier@email.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>

              {/* Modal Buttons */}
              <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold tracking-wider uppercase transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  {editingId ? "Save Changes" : "Register Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
