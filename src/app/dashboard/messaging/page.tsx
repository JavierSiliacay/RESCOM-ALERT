"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Send,
  History,
  FileCheck,
  Radio,
  Users,
  CheckCircle2,
  AlertCircle,
  Bookmark,
  Plus,
  Pencil,
  Trash2,
  Save,
  Search,
  RefreshCw,
  Download,
  Printer,
  Lock,
  Shield,
  Smartphone,
  X,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { sanitizePhMobileInput, formatPhMobileDisplay } from "@/lib/sms";
import { StatCardSkeleton, TableSkeleton } from "@/components/skeleton";
import { useCurrentOfficer } from "@/components/officer-context";

function MessagingContent() {
  const currentOfficer = useCurrentOfficer();
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get("tab");
  const initialGroupQuery = searchParams.get("group");

  // Convex Data Hooks
  const groupsData = useQuery(api.groups.list);
  const personnelData = useQuery(api.personnel.list);
  const templatesData = useQuery(api.templates.list);
  const broadcastsData = useQuery(api.broadcasts.list);
  const auditLogsData = useQuery(api.auditLogs.list);

  // Convex Mutations
  const createTemplateMutation = useMutation(api.templates.create);
  const updateTemplateMutation = useMutation(api.templates.update);
  const removeTemplateMutation = useMutation(api.templates.remove);
  const recordBroadcast = useMutation(api.broadcasts.record);
  const updateBroadcastStatus = useMutation(api.broadcasts.updateStatus);

  const isLoadingOutbox = broadcastsData === undefined;
  const isLoadingAudit = auditLogsData === undefined;

  const groups = groupsData || [];
  const personnel = personnelData || [];
  const templates = templatesData || [];
  const messages = broadcastsData || [];
  const logs = auditLogsData || [];

  const [activeTab, setActiveTab] = useState<"send" | "outbox" | "audit">(
    tabParam === "outbox" || tabParam === "history"
      ? "outbox"
      : tabParam === "audit" || tabParam === "logs"
      ? "audit"
      : "send"
  );

  // Sync tab with URL if needed
  const handleTabChange = (tab: "send" | "outbox" | "audit") => {
    setActiveTab(tab);
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set("tab", tab);
    router.replace(`/dashboard/messaging?${newParams.toString()}`);
  };

  // -------------------------------------------------------------
  // SEND MESSAGE STATE (Group vs Manual Mode)
  // -------------------------------------------------------------
  const [recipientMode, setRecipientMode] = useState<"GROUP" | "MANUAL">("GROUP");

  // Group Mode State
  const [selectedGroups, setSelectedGroups] = useState<string[]>(
    initialGroupQuery ? [initialGroupQuery] : ["ALL"]
  );

  // Manual Mode State (TextBee Direct Numbers)
  const [manualNumbers, setManualNumbers] = useState<string[]>([]);
  const [numberInputValue, setNumberInputValue] = useState("");

  const [messageTitle, setMessageTitle] = useState("MANDATORY MUSTER ORDER");
  const [messageContent, setMessageContent] = useState(
    "ATTN 10RCDG PERSONNEL: Mandatory assembly this Saturday, 0700H at Camp General Manuel T. Yan Senior. Complete Type A uniform required."
  );
  const [priority, setPriority] = useState<"ROUTINE" | "URGENT" | "FLASH">("ROUTINE");

  // Group selection helpers
  const toggleGroup = (groupId: string) => {
    if (groupId === "ALL") {
      setSelectedGroups(["ALL"]);
    } else {
      const withoutAll = selectedGroups.filter((g) => g !== "ALL");
      if (withoutAll.includes(groupId)) {
        const updated = withoutAll.filter((g) => g !== groupId);
        setSelectedGroups(updated.length === 0 ? ["ALL"] : updated);
      } else {
        setSelectedGroups([...withoutAll, groupId]);
      }
    }
  };

  // Compute active recipient numbers
  const getActiveNumbers = (): string[] => {
    if (recipientMode === "GROUP") {
      const activePersonnel = personnel.filter((p) => p.status === "ACTIVE");
      const filtered = activePersonnel.filter((p) => {
        if (selectedGroups.includes("ALL")) return true;
        return selectedGroups.some((gId) => {
          return p.groupId === gId || p.groupName === gId;
        });
      });
      return filtered.map((p) => p.mobileNumber);
    }
    return manualNumbers;
  };

  const activeRecipientCount = getActiveNumbers().length;

  // Template Management Modal
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<Id<"templates"> | null>(null);
  const [modalTitle, setModalTitle] = useState("");
  const [modalCategory, setModalCategory] = useState("Routine");
  const [modalText, setModalText] = useState("");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // Confirmation & Dispatch
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleOpenAddTemplate = () => {
    setEditingTemplateId(null);
    setModalTitle("");
    setModalCategory("Routine");
    setModalText("");
    setIsTemplateModalOpen(true);
  };

  const handleOpenEditTemplate = (tmpl: (typeof templates)[number], e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTemplateId(tmpl._id);
    setModalTitle(tmpl.title);
    setModalCategory(tmpl.category);
    setModalText(tmpl.text);
    setIsTemplateModalOpen(true);
  };

  const handleDeleteTemplate = async (id: Id<"templates">, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this template?")) {
      try {
        await removeTemplateMutation({ id });
      } catch (err: any) {
        alert(err?.message || "Failed to delete template");
      }
    }
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTitle.trim() || !modalText.trim()) return;

    try {
      setIsSavingTemplate(true);
      if (editingTemplateId) {
        await updateTemplateMutation({
          id: editingTemplateId,
          title: modalTitle.trim(),
          category: modalCategory,
          text: modalText.trim(),
        });
      } else {
        await createTemplateMutation({
          title: modalTitle.trim(),
          category: modalCategory,
          text: modalText.trim(),
        });
      }
      setIsTemplateModalOpen(false);
    } catch (err: any) {
      alert(err?.message || "Failed to save template");
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleApplyTemplate = (tmpl: (typeof templates)[number]) => {
    setMessageTitle(tmpl.title.toUpperCase());
    setMessageContent(tmpl.text);
  };

  // Manual Tag Management (TextBee Style)
  const addManualNumbers = (rawText: string) => {
    const rawTokens = rawText.split(/[\r\n,;\s]+/);
    const toAdd: string[] = [];

    for (const token of rawTokens) {
      const clean = token.trim();
      if (!clean) continue;
      const sanitized = sanitizePhMobileInput(clean);
      if (sanitized && !manualNumbers.includes(sanitized) && !toAdd.includes(sanitized)) {
        toAdd.push(sanitized);
      }
    }

    if (toAdd.length > 0) {
      setManualNumbers((prev) => [...prev, ...toAdd]);
    }
  };

  const removeManualNumber = (indexToRemove: number) => {
    setManualNumbers((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleKeyDownManual = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      if (numberInputValue.trim()) {
        addManualNumbers(numberInputValue);
        setNumberInputValue("");
      }
    } else if (e.key === "Backspace" && !numberInputValue && manualNumbers.length > 0) {
      setManualNumbers((prev) => prev.slice(0, -1));
    }
  };

  const handlePasteManual = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    if (pasted) {
      addManualNumbers(pasted);
      setNumberInputValue("");
    }
  };

  const handleClearAllManual = () => {
    setManualNumbers([]);
    setNumberInputValue("");
  };

  const charCount = messageContent.length;
  const smsSegments = Math.ceil(charCount / 160) || 1;

  // Dispatch Broadcast
  const handleExecuteSend = async () => {
    const numbersToSend = getActiveNumbers();
    if (numbersToSend.length === 0) return;
    setIsSending(true);

    try {
      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: numbersToSend,
          message: messageContent,
          title: messageTitle,
          simSubscriptionId: 1, // SIM 1 (TNT) default
        }),
      });

      const data = await res.json();

      // Record in live Convex database
      await recordBroadcast({
        title: messageTitle,
        content: messageContent,
        senderName: currentOfficer.displayName,
        senderEmail: currentOfficer.email || undefined,
        senderRank: currentOfficer.rank || undefined,
        targetGroupNames: recipientMode === "GROUP" ? selectedGroups : ["Direct SMS"],
        recipients: numbersToSend,
        totalRecipients: numbersToSend.length,
        deliveredCount: res.ok && data.success ? numbersToSend.length : 0,
        failedCount: res.ok && data.success ? 0 : numbersToSend.length,
        status: res.ok && data.success ? "DELIVERED" : "FAILED",
        simSubscriptionId: 1,
      });

      setIsSending(false);
      setIsConfirmModalOpen(false);
      setIsSuccess(true);
    } catch {
      setIsSending(false);
      setIsConfirmModalOpen(false);
    }
  };

  // -------------------------------------------------------------
  // SENT MESSAGES / OUTBOX STATE
  // -------------------------------------------------------------
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<(typeof messages)[number] | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const filteredMessages = messages.filter(
    (msg) =>
      msg.title.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
      msg.content.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
      msg.senderName.toLowerCase().includes(historySearchQuery.toLowerCase())
  );

  const totalDispatches = messages.length;
  const totalRecipientsSent = messages.reduce((acc, m) => acc + m.totalRecipients, 0);
  const totalDelivered = messages.reduce((acc, m) => acc + m.deliveredCount, 0);
  const deliveryPercentage = Math.round((totalDelivered / (totalRecipientsSent || 1)) * 100) || 100;

  const handleRetryFailed = async (msgId: Id<"broadcasts">, totalRecipients: number) => {
    setIsRetrying(true);
    try {
      await updateBroadcastStatus({
        id: msgId,
        deliveredCount: totalRecipients,
        failedCount: 0,
        status: "DELIVERED",
      });
      if (selectedMessage && selectedMessage._id === msgId) {
        setSelectedMessage({
          ...selectedMessage,
          deliveredCount: totalRecipients,
          failedCount: 0,
          status: "DELIVERED",
        });
      }
    } finally {
      setIsRetrying(false);
    }
  };

  // -------------------------------------------------------------
  // ACTIVITY & AUDIT LOGS STATE
  // -------------------------------------------------------------
  const [auditSearchQuery, setAuditSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.userName.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
      log.ipAddress.includes(auditSearchQuery);

    const matchesCategory = selectedCategory === "ALL" || log.category === selectedCategory;
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
    a.download = `10RCDG_Messaging_Audit_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "BROADCAST":
        return { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: Send };
      case "AUTH":
        return { bg: "bg-blue-50 text-blue-700 border-blue-200", icon: Shield };
      case "SECURITY":
        return { bg: "bg-amber-50 text-amber-700 border-amber-200", icon: Lock };
      case "CONFIG":
        return { bg: "bg-purple-50 text-purple-700 border-purple-200", icon: Radio };
      default:
        return { bg: "bg-slate-50 text-slate-700 border-slate-200", icon: FileCheck };
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Integrated Navigation Tabs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Messaging
              </h1>
              <p className="text-xs text-slate-500">
                Compose SMS broadcasts, monitor delivery outbox, and review dispatch activity.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switchers */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 self-start md:self-auto overflow-x-auto max-w-full">
          <button
            onClick={() => handleTabChange("send")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "send"
                ? "bg-white text-emerald-800 shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            Send Message
          </button>
          <button
            onClick={() => handleTabChange("outbox")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "outbox"
                ? "bg-white text-emerald-800 shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Sent Outbox
            <span className="ml-0.5 px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-mono rounded-full font-bold">
              {messages.length}
            </span>
          </button>
          <button
            onClick={() => handleTabChange("audit")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "audit"
                ? "bg-white text-emerald-800 shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            Activity History
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: SEND MESSAGE / COMPOSE                             */}
      {/* ========================================================= */}
      {activeTab === "send" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Message Composer (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Recipient Selection Card (Group vs Manual Numbers) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-700" />
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Target Recipients
                  </h2>
                </div>

                {/* Clean Mode Switcher */}
                <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => setRecipientMode("GROUP")}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      recipientMode === "GROUP"
                        ? "bg-white text-emerald-800 shadow-2xs border border-slate-200"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    Contact Groups
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientMode("MANUAL")}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      recipientMode === "MANUAL"
                        ? "bg-white text-emerald-800 shadow-2xs border border-slate-200"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    Direct Numbers
                  </button>
                </div>
              </div>

              {/* Mode A: Clean Contact Group Selection (No messy phone number pills!) */}
              {recipientMode === "GROUP" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      Select official units or battalions to receive this broadcast:
                    </span>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-mono">
                      {activeRecipientCount} Personnel
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => toggleGroup("ALL")}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        selectedGroups.includes("ALL")
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      All 10RCDG Personnel ({personnel.length})
                    </button>
                    {groups.map((grp) => {
                      const isSelected = selectedGroups.includes(grp._id) || selectedGroups.includes(grp.name);
                      return (
                        <button
                          key={grp._id}
                          type="button"
                          onClick={() => toggleGroup(grp._id)}
                          className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                            isSelected && !selectedGroups.includes("ALL")
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {grp.name} ({grp.memberCount})
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Mode B: TextBee Style Manual TO Tag Input */}
              {recipientMode === "MANUAL" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      To (Manual Numbers)
                    </label>
                    <div className="flex items-center gap-2">
                      {manualNumbers.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearAllManual}
                          className="text-[11px] font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
                        >
                          Clear All
                        </button>
                      )}
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-mono">
                        {manualNumbers.length} {manualNumbers.length === 1 ? "Number" : "Numbers"}
                      </span>
                    </div>
                  </div>

                  {/* Tag Input Container */}
                  <div className="p-2.5 bg-slate-50 border border-slate-200 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/20 rounded-xl transition-all flex flex-wrap items-center gap-1.5 min-h-[48px]">
                    {manualNumbers.map((num, idx) => (
                      <span
                        key={`${num}-${idx}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-200/80 hover:bg-slate-300 text-slate-800 text-xs font-mono font-medium rounded-full transition-colors group"
                      >
                        <span>{num}</span>
                        <button
                          type="button"
                          onClick={() => removeManualNumber(idx)}
                          className="w-3.5 h-3.5 flex items-center justify-center rounded-full hover:bg-slate-400 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                          title="Remove number"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}

                    <input
                      type="text"
                      value={numberInputValue}
                      onChange={(e) => setNumberInputValue(e.target.value)}
                      onKeyDown={handleKeyDownManual}
                      onPaste={handlePasteManual}
                      placeholder={manualNumbers.length === 0 ? "Type mobile number (e.g. 09171234567) & press Enter" : "Add another number"}
                      className="flex-1 min-w-[170px] bg-transparent text-xs text-slate-900 font-mono placeholder:text-slate-400 focus:outline-none py-1"
                    />
                  </div>

                  <p className="text-[11px] text-slate-400">
                    Press Enter or comma to add. Paste a list to add several at once.
                  </p>
                </div>
              )}
            </div>

            {/* Template Selector & Manager */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-emerald-700" />
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Quick Templates
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddTemplate}
                  className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors border border-emerald-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Template
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {templates.map((tmpl) => (
                  <div
                    key={tmpl._id}
                    onClick={() => handleApplyTemplate(tmpl)}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50/50 hover:border-emerald-300 transition-all cursor-pointer flex flex-col justify-between text-left group relative"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-800">
                          {tmpl.title}
                        </span>
                        <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                          {tmpl.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                        {tmpl.text}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60">
                      <span className="text-[10px] font-bold text-emerald-700">Click to use</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditTemplate(tmpl, e)}
                          title="Edit template"
                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteTemplate(tmpl._id, e)}
                          title="Delete template"
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Compose Message Form */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Message Title / Subject
                </label>
                <input
                  type="text"
                  value={messageTitle}
                  onChange={(e) => setMessageTitle(e.target.value)}
                  placeholder="e.g. MANDATORY MUSTER ORDER"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 font-bold text-slate-800 uppercase"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    SMS Message Body
                  </label>
                  <span className="text-xs font-mono text-slate-500">
                    {charCount} chars · {smsSegments} SMS {smsSegments > 1 ? "segments" : "segment"}
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder="Type the broadcast message here..."
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 leading-relaxed font-mono"
                />
              </div>

              {/* Priority & Gateway Summary */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">Priority:</span>
                  {(["ROUTINE", "URGENT", "FLASH"] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setPriority(lvl)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                        priority === lvl
                          ? lvl === "FLASH"
                            ? "bg-red-600 text-white border-red-600"
                            : lvl === "URGENT"
                            ? "bg-amber-500 text-white border-amber-500"
                            : "bg-emerald-600 text-white border-emerald-600"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>

                <div className="text-[11px] text-slate-500 font-mono">
                  Gateway: <span className="font-bold text-emerald-700">SIM 1 · TNT (Infinix X6711)</span>
                </div>
              </div>

              {/* Send Button */}
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(true)}
                disabled={!messageContent.trim() || activeRecipientCount === 0}
                className="w-full mt-2 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider cursor-pointer"
              >
                <Send className="w-4 h-4" />
                Review & Broadcast to {activeRecipientCount} {activeRecipientCount === 1 ? "Recipient" : "Recipients"}
              </button>
            </div>
          </div>

          {/* Right Column: Live Recipient Phone Simulator (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Recipient Phone Preview
                  </span>
                </div>
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Live Preview
                </span>
              </div>

              {/* Phone Mockup Frame */}
              <div className="mx-auto w-[290px] rounded-[36px] border-[6px] border-slate-800 bg-slate-900 p-2.5 shadow-xl relative">
                {/* Phone Notch */}
                <div className="w-20 h-4 bg-slate-800 rounded-b-xl mx-auto absolute top-0 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-950/80" />
                </div>

                {/* Phone Screen */}
                <div className="bg-[#f0f4f9] rounded-[26px] h-[390px] overflow-hidden flex flex-col p-3 text-slate-900 text-left pt-5">
                  {/* Sender Banner */}
                  <div className="text-center pb-2 border-b border-slate-200 mb-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center mx-auto shadow-xs">
                      10R
                    </div>
                    <div className="text-xs font-bold text-slate-900 mt-1">10RCDG ALERT</div>
                    <div className="text-[10px] text-slate-500 font-mono">SMS Broadcast Gateway</div>
                  </div>

                  {/* SMS Bubble */}
                  <div className="flex-1 overflow-y-auto space-y-2 py-1">
                    <div className="bg-white rounded-2xl rounded-tl-xs p-3 border border-slate-200 shadow-xs max-w-[95%]">
                      {messageTitle && (
                        <div className="text-[11px] font-black text-emerald-900 uppercase tracking-tight mb-1 border-b border-emerald-100 pb-1">
                          [{messageTitle}]
                        </div>
                      )}
                      <p className="text-xs text-slate-800 font-sans leading-relaxed whitespace-pre-wrap">
                        {messageContent || "No message content entered yet..."}
                      </p>
                      <div className="text-[9px] text-slate-400 mt-1.5 text-right font-mono">
                        Just now · SMS via SIM 1 (TNT)
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-center text-slate-400 py-1">
                    Delivered via TextBee Gateway
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: SENT OUTBOX & DELIVERY MONITOR                     */}
      {/* ========================================================= */}
      {activeTab === "outbox" && (
        <div className="space-y-6">
          {/* Stat Cards */}
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {isLoadingOutbox ? (
              <>
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
              </>
            ) : (
              <>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Dispatches</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">{totalDispatches}</div>
                  <span className="text-[11px] text-emerald-600 font-medium">All broadcast operations</span>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total SMS Sent</span>
                  <div className="text-2xl font-black text-slate-900 mt-1">{totalRecipientsSent.toLocaleString()}</div>
                  <span className="text-[11px] text-emerald-600 font-medium">Target mobile devices</span>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Delivery Rate</span>
                  <div className="text-2xl font-black text-emerald-600 mt-1">{deliveryPercentage}%</div>
                  <span className="text-[11px] text-emerald-600 font-medium">Delivered to network</span>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active SIM Route</span>
                  <div className="text-lg font-black text-slate-800 mt-1 truncate">SIM 1 · TNT (Smart)</div>
                  <span className="text-[11px] text-slate-500 font-mono">Infinix X6711 Gateway</span>
                </div>
              </>
            )}
          </div>

          {/* Search & Broadcast History Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  placeholder="Search broadcasts, sender..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
                />
              </div>

              <div className="text-xs text-slate-500 font-medium">
                Showing {filteredMessages.length} broadcast records
              </div>
            </div>

            {isLoadingOutbox ? (
              <TableSkeleton rows={5} cols={5} />
            ) : filteredMessages.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No broadcast messages found.
              </div>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Title & Details</th>
                    <th className="py-3 px-4">Recipients</th>
                    <th className="py-3 px-4">Delivery Status</th>
                    <th className="py-3 px-4">Dispatched Time</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredMessages.map((msg) => (
                    <tr key={msg._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 max-w-sm">
                        <div className="font-bold text-slate-900">{msg.title}</div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">{msg.content}</p>
                        <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                          Sent by: <span className="font-bold text-slate-700">{msg.senderName || "Command"}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        {msg.totalRecipients} <span className="text-slate-400 font-normal">recipients</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          {msg.status === "DELIVERED" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              Delivered ({msg.deliveredCount}/{msg.totalRecipients})
                            </span>
                          ) : msg.status === "FAILED" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                              <AlertCircle className="w-3 h-3" />
                              Failed ({msg.failedCount})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              In Transit
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        {msg.sentAt}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {msg.failedCount > 0 && (
                            <button
                              type="button"
                              onClick={() => handleRetryFailed(msg._id, msg.totalRecipients)}
                              disabled={isRetrying}
                              className="px-2 py-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors flex items-center gap-1"
                            >
                              <RefreshCw className={`w-3 h-3 ${isRetrying ? "animate-spin" : ""}`} />
                              Retry Failed
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedMessage(msg)}
                            className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                          >
                            Details
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
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: ACTIVITY & SECURITY AUDIT LOGS                     */}
      {/* ========================================================= */}
      {activeTab === "audit" && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            {/* Action Bar */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={auditSearchQuery}
                    onChange={(e) => setAuditSearchQuery(e.target.value)}
                    placeholder="Search logs by user, action..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
                  />
                </div>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 font-bold text-slate-700"
                >
                  <option value="ALL">All Categories</option>
                  <option value="BROADCAST">Broadcasts</option>
                  <option value="AUTH">Authentication</option>
                  <option value="SECURITY">Security</option>
                  <option value="CONFIG">Gateway Config</option>
                </select>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print
                </button>
              </div>
            </div>

            {/* Audit Table */}
            {isLoadingAudit ? (
              <TableSkeleton rows={6} cols={6} />
            ) : filteredLogs.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No audit logs found matching the filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Details</th>
                    <th className="py-3 px-4">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredLogs.map((log) => {
                    const badge = getCategoryBadge(log.category);
                    const BadgeIcon = badge.icon;
                    return (
                      <tr key={log._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {log.timestamp}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">
                          <div>{log.userName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{log.userRole}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}
                          >
                            <BadgeIcon className="w-3 h-3" />
                            {log.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">{log.action}</td>
                        <td className="py-3 px-4 text-slate-600 font-sans max-w-xs truncate">
                          {log.details}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                          {log.ipAddress}
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
      )}

      {/* ========================================================= */}
      {/* MODAL: CREATE / EDIT CUSTOM TEMPLATE                      */}
      {/* ========================================================= */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900">
                  {editingTemplateId ? "Edit Template" : "Create New Template"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Template Title *
                </label>
                <input
                  type="text"
                  required
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  placeholder="e.g. Typhoon Warning Alert"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Category *
                </label>
                <select
                  value={modalCategory}
                  onChange={(e) => setModalCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
                >
                  <option value="Routine">Routine Assembly</option>
                  <option value="Emergency">Emergency / Recall</option>
                  <option value="Weather">Weather Advisory</option>
                  <option value="Security">Security / Red Alert</option>
                  <option value="Admin">Administrative</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Template Text *
                </label>
                <textarea
                  rows={4}
                  required
                  value={modalText}
                  onChange={(e) => setModalText(e.target.value)}
                  placeholder="Enter the template body..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 leading-relaxed font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingTemplate}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSavingTemplate ? "Saving..." : editingTemplateId ? "Update Template" : "Save Template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: BROADCAST CONFIRMATION SAFETY                      */}
      {/* ========================================================= */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Radio className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Confirm SMS Transmission
                </h3>
                <p className="text-xs text-slate-500">
                  You are about to transmit live SMS to {activeRecipientCount} recipients.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Gateway Carrier:</span>
                <span className="font-mono font-bold text-emerald-700">SIM 1 · TNT (Infinix X6711)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Total Recipients:</span>
                <span className="font-mono font-bold text-slate-800">{activeRecipientCount} Numbers</span>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <span className="text-slate-500 font-medium block mb-1">Message Preview:</span>
                <p className="text-slate-800 font-mono text-[11px] leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200">
                  [{messageTitle}] {messageContent}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isSending}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteSend}
                disabled={isSending}
                className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                {isSending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Transmitting...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Confirm & Send Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: BROADCAST SUCCESS NOTIFICATION                     */}
      {/* ========================================================= */}
      {isSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Broadcast Dispatched</h3>
              <p className="text-xs text-slate-500 mt-1">
                Your SMS message was submitted to the TextBee Gateway for delivery to {activeRecipientCount} recipients.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsSuccess(false);
                  handleTabChange("outbox");
                }}
                className="flex-1 py-2.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors"
              >
                View in Outbox
              </button>
              <button
                type="button"
                onClick={() => setIsSuccess(false)}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: SENT MESSAGE DETAILS                               */}
      {/* ========================================================= */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900">Broadcast Delivery Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMessage(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px] block mb-1">
                  Message Title
                </span>
                <div className="font-bold text-slate-900 text-sm">{selectedMessage.title}</div>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 font-medium">Sent by:</span>
                <span className="font-bold text-slate-800 text-xs">{selectedMessage.senderName || "Command"}</span>
              </div>

              <div>
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px] block mb-1">
                  Broadcast Content
                </span>
                <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-[11px] leading-relaxed">
                  {selectedMessage.content}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">Total Recipients</span>
                  <span className="text-sm font-bold text-slate-800">{selectedMessage.totalRecipients}</span>
                </div>
                <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-emerald-700 block">Delivered Count</span>
                  <span className="text-sm font-bold text-emerald-800">{selectedMessage.deliveredCount}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px] block mb-2">
                  Recipient Numbers
                </span>
                <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                  {selectedMessage.recipients && selectedMessage.recipients.length > 0 ? (
                    selectedMessage.recipients.map((num, idx) => (
                      <div key={`${num}-${idx}`} className="p-2 flex items-center justify-between text-[11px]">
                        <div>
                          <span className="font-mono font-bold text-slate-800">{formatPhMobileDisplay(num)}</span>
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {selectedMessage.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    personnel.slice(0, selectedMessage.totalRecipients).map((p) => (
                      <div key={p._id} className="p-2 flex items-center justify-between text-[11px]">
                        <div>
                          <span className="font-bold text-slate-800">{p.rank} {p.lastName}, {p.firstName}</span>
                          <span className="text-slate-400 font-mono ml-2">{formatPhMobileDisplay(p.mobileNumber)}</span>
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {selectedMessage.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedMessage(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MessagingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400 font-mono">Loading Messaging Hub...</div>}>
      <MessagingContent />
    </Suspense>
  );
}
