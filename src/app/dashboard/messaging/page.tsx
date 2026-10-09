"use client";

import { useState, useEffect, Suspense } from "react";
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
  Copy,
  Check,
  CheckCheck,
  ChevronRight,
  ArrowRight,
  Info,
  Phone,
  UserCheck,
  Cpu,
  ExternalLink,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import {
  sanitizePhMobileInput,
  formatPhMobileDisplay,
  formatBroadcastTitle,
  getPhCoreDigits,
  matchesPhMobileSearch,
} from "@/lib/sms";
import { StatCardSkeleton, TableSkeleton } from "@/components/skeleton";
import { useCurrentOfficer } from "@/components/officer-context";
import { PersonnelRecipientCombobox, RecipientChip } from "@/components/personnel-recipient-combobox";

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
          coreDigits = digitsOnly.slice(2);
        } else if (digitsOnly.startsWith("09") && digitsOnly.length >= 3) {
          coreDigits = digitsOnly.slice(1);
        } else if (digitsOnly.startsWith("9") && digitsOnly.length >= 3) {
          coreDigits = digitsOnly;
        }

        if (coreDigits) {
          const corePattern = coreDigits
            .split("")
            .map((d) => d.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
            .join("[\\s\\-_]*");
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
          const isMatch = tokenPatterns.some((pattern) =>
            new RegExp(`^${pattern}$`, "gi").test(part)
          );
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

function MessagingContent() {
  const currentOfficer = useCurrentOfficer();
  const { isViewer, guardAction } = currentOfficer;
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
  const updateBatchDetails = useMutation(api.broadcasts.updateBatchDetails);

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

  // Personnel / Direct Mode State
  const [manualRecipients, setManualRecipients] = useState<RecipientChip[]>([]);

  const [selectedTemplateTitle, setSelectedTemplateTitle] = useState<string | null>(null);
  const [messageTitle, setMessageTitle] = useState("");
  const [messageContent, setMessageContent] = useState("");
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
    return manualRecipients.map((r) => r.number);
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
    guardAction("create broadcast template", () => {
      setEditingTemplateId(null);
      setModalTitle("");
      setModalCategory("Routine");
      setModalText("");
      setIsTemplateModalOpen(true);
    });
  };

  const handleOpenEditTemplate = (tmpl: (typeof templates)[number], e: React.MouseEvent) => {
    e.stopPropagation();
    guardAction("edit broadcast template", () => {
      setEditingTemplateId(tmpl._id);
      setModalTitle(tmpl.title);
      setModalCategory(tmpl.category);
      setModalText(tmpl.text);
      setIsTemplateModalOpen(true);
    });
  };

  const handleDeleteTemplate = async (id: Id<"templates">, e: React.MouseEvent) => {
    e.stopPropagation();
    guardAction("delete broadcast template", async () => {
      if (confirm("Are you sure you want to delete this template?")) {
        try {
          await removeTemplateMutation({ id, officerEmail: currentOfficer.email });
        } catch (err: any) {
          alert(err?.message || "Failed to delete template");
        }
      }
    });
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewer) {
      guardAction("save broadcast template");
      return;
    }
    if (!modalTitle.trim() || !modalText.trim()) return;

    try {
      setIsSavingTemplate(true);
      if (editingTemplateId) {
        await updateTemplateMutation({
          id: editingTemplateId,
          title: modalTitle.trim(),
          category: modalCategory,
          text: modalText.trim(),
          officerEmail: currentOfficer.email,
        });
      } else {
        await createTemplateMutation({
          title: modalTitle.trim(),
          category: modalCategory,
          text: modalText.trim(),
          officerEmail: currentOfficer.email,
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
    setSelectedTemplateTitle(tmpl.title);
    setMessageTitle(tmpl.title.toUpperCase());
    setMessageContent(tmpl.text);
  };

  const charCount = messageContent.length;
  const smsSegments = Math.ceil(charCount / 160) || 1;

  // Dispatch Broadcast
  const handleExecuteSend = async () => {
    if (isViewer) {
      guardAction("transmit mass SMS broadcast");
      return;
    }
    const numbersToSend = getActiveNumbers();
    if (numbersToSend.length === 0) return;

    const finalBroadcastTitle = (selectedTemplateTitle && selectedTemplateTitle.trim())
      ? selectedTemplateTitle.trim()
      : (messageTitle.trim() && messageTitle.trim().toUpperCase() !== "10RCDG ALERT")
      ? messageTitle.trim()
      : "NO SMS TEMPLATE";

    setIsSending(true);

    try {
      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: numbersToSend,
          message: messageContent,
          title: finalBroadcastTitle,
          simSubscriptionId: 1, // SIM 1 (TNT) default
        }),
      });

      const data = await res.json();
      const isOk = res.ok && data.success;

      if (isOk) {
        setIsSuccess(true);
        setSelectedTemplateTitle(null);
        setMessageTitle("");
        setMessageContent("");
        if (recipientMode === "MANUAL") {
          setManualRecipients([]);
        }
      }

      // Record in live Convex database
      try {
        await recordBroadcast({
          title: finalBroadcastTitle,
          content: messageContent,
          senderName: currentOfficer.displayName || "Duty Officer",
          senderEmail: currentOfficer.email || undefined,
          senderRank: currentOfficer.rank || undefined,
          targetGroupNames: recipientMode === "GROUP" ? selectedGroups : ["Direct SMS"],
          recipients: numbersToSend,
          totalRecipients: numbersToSend.length,
          deliveredCount: isOk ? numbersToSend.length : 0,
          failedCount: isOk ? 0 : numbersToSend.length,
          status: isOk ? "DELIVERED" : "FAILED",
          simSubscriptionId: 1,
          gatewayBatchId: data.messageId || data.smsBatchId || undefined,
          recipientStatuses: numbersToSend.map((num) => ({
            number: num,
            status: isOk ? "sent" : "failed",
            sentAt: new Date().toLocaleTimeString("en-US", { timeZone: "Asia/Manila" }),
          })),
        });
      } catch (dbErr) {
        console.error("Warning: Failed to save broadcast history to Convex database:", dbErr);
      }

      setIsSending(false);
      setIsConfirmModalOpen(false);
    } catch (err: unknown) {
      console.error("Error dispatching SMS broadcast:", err);
      setIsSending(false);
      setIsConfirmModalOpen(false);
    }
  };

  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<(typeof messages)[number] | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  // Read / Reviewed state for Outbox Broadcasts (persisted per device)
  const [reviewedBroadcastIds, setReviewedBroadcastIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem("rescom_reviewed_broadcasts");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setReviewedBroadcastIds(new Set(parsed));
        }
      }
    } catch {}
  }, []);

  const markBroadcastAsRead = (id: string) => {
    setReviewedBroadcastIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem("rescom_reviewed_broadcasts", JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  const markAllAsRead = () => {
    setReviewedBroadcastIds((prev) => {
      const next = new Set(prev);
      messages.forEach((m) => next.add(m._id));
      try {
        localStorage.setItem("rescom_reviewed_broadcasts", JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  const isBroadcastUnread = (msg: (typeof messages)[number]) => {
    if (reviewedBroadcastIds.has(msg._id)) return false;
    const timeMs = msg._creationTime || 0;
    const hoursAgo = (Date.now() - timeMs) / (1000 * 60 * 60);
    return hoursAgo < 4;
  };

  const handleOpenMessageDetails = (msg: (typeof messages)[number]) => {
    markBroadcastAsRead(msg._id);
    setSelectedMessage(msg);
  };

  const filteredMessages = messages.filter((msg) => {
    const { title: displayTitle } = formatBroadcastTitle(msg.title);
    const q = historySearchQuery.toLowerCase();
    const matchesRecipient =
      historySearchQuery.trim() !== "" &&
      msg.recipients?.some((rec) => matchesPhMobileSearch(rec, historySearchQuery));

    return (
      displayTitle.toLowerCase().includes(q) ||
      msg.content.toLowerCase().includes(q) ||
      msg.senderName.toLowerCase().includes(q) ||
      matchesRecipient
    );
  });

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

  // Modal details and verification state
  const [modalRecipientSearch, setModalRecipientSearch] = useState("");
  const [isSyncingGateway, setIsSyncingGateway] = useState(false);
  const [gatewaySyncFeedback, setGatewaySyncFeedback] = useState<string | null>(null);
  const [copiedMessage, setCopiedMessage] = useState(false);

  // Match recipient phone number to soldier in personnel roster
  const getSoldierForNumber = (phoneStr: string) => {
    const rawClean = phoneStr.replace(/\D/g, "");
    if (!rawClean) return null;
    return personnel.find((p) => {
      const pClean = (p.mobileNumber || "").replace(/\D/g, "");
      if (!pClean) return false;
      return (
        pClean === rawClean ||
        (pClean.length >= 10 && rawClean.endsWith(pClean.slice(-10))) ||
        (rawClean.length >= 10 && pClean.endsWith(rawClean.slice(-10)))
      );
    });
  };

  // Copy message text
  const handleCopyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  // Live Gateway Verification against TextBee device API
  const handleVerifyGatewayStatus = async (batchId?: string) => {
    if (!batchId) {
      setGatewaySyncFeedback("No Gateway Batch ID found for this older broadcast.");
      setTimeout(() => setGatewaySyncFeedback(null), 4000);
      return;
    }
    setIsSyncingGateway(true);
    setGatewaySyncFeedback(null);
    try {
      const res = await fetch(`/api/sms/status?batchId=${encodeURIComponent(batchId)}`);
      const data = await res.json();
      if (res.ok && data.success) {
        const formattedStatuses = (data.messages || []).map((m: any) => ({
          number: m.recipient,
          status: m.status,
          sentAt: m.sentAt,
          error: m.errorMessage,
        }));

        if (selectedMessage) {
          const finalSent = data.sentCount ?? data.messages?.length ?? selectedMessage.totalRecipients;
          const finalFailed = data.failedCount ?? 0;
          const finalDelivered = data.deliveredCount ?? 0;

          await updateBatchDetails({
            id: selectedMessage._id,
            deliveredCount: finalDelivered > 0 ? finalDelivered : finalSent,
            failedCount: finalFailed,
            status: finalFailed > 0 && finalSent === 0 ? "FAILED" : "DELIVERED",
            gatewayBatchId: batchId,
            recipientStatuses: formattedStatuses.length > 0 ? formattedStatuses : undefined,
          });

          setSelectedMessage({
            ...selectedMessage,
            deliveredCount: finalDelivered > 0 ? finalDelivered : finalSent,
            failedCount: finalFailed,
            status: finalFailed > 0 && finalSent === 0 ? "FAILED" : "DELIVERED",
            recipientStatuses: formattedStatuses.length > 0 ? formattedStatuses : selectedMessage.recipientStatuses,
          });
        }
        setGatewaySyncFeedback(`Verified with 10RCDG Gateway: ${data.sentCount || data.total} sent, ${data.failedCount || 0} failed.`);
      } else {
        setGatewaySyncFeedback(data.error || "Unable to reach Gateway status.");
      }
    } catch {
      setGatewaySyncFeedback("Network error connecting to Gateway API.");
    } finally {
      setIsSyncingGateway(false);
      setTimeout(() => setGatewaySyncFeedback(null), 6000);
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

      {/* Viewer Clearance Alert Banner */}
      {isViewer && (
        <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-950 flex items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Viewer Clearance Mode:</strong> You are viewing messaging dispatches with read-only privileges. Transmitting broadcasts or modifying templates requires Administrative clearance.
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-amber-100 border border-amber-300 font-mono text-[10px] font-bold shrink-0 text-amber-900">
            READ-ONLY
          </span>
        </div>
      )}

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
                    <UserCheck className="w-3.5 h-3.5" />
                    Direct Personnel
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

              {/* Mode B: Autocomplete Personnel Combobox + Direct Numbers */}
              {recipientMode === "MANUAL" && (
                <PersonnelRecipientCombobox
                  recipients={manualRecipients}
                  onChange={setManualRecipients}
                  personnel={personnel}
                />
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
                onClick={() =>
                  guardAction("review and broadcast message", () => setIsConfirmModalOpen(true))
                }
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
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Carrier Success Rate</span>
                  <div className="text-2xl font-black text-emerald-600 mt-1">{deliveryPercentage}%</div>
                  <span className="text-[11px] text-emerald-600 font-medium">Gateway network confirmed</span>
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

              <div className="flex items-center gap-2.5">
                {(() => {
                  const unreadCount = messages.filter(isBroadcastUnread).length;
                  if (unreadCount === 0) return null;
                  return (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg shadow-2xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        {unreadCount} New {unreadCount === 1 ? "Dispatch" : "Dispatches"}
                      </span>
                      <button
                        type="button"
                        onClick={markAllAsRead}
                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-950 hover:underline cursor-pointer"
                      >
                        Mark all read
                      </button>
                      <span className="text-slate-300">·</span>
                    </div>
                  );
                })()}
                <div className="text-xs text-slate-500 font-medium">
                  Showing {filteredMessages.length} broadcast records
                </div>
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
                  {filteredMessages.map((msg) => {
                    const isUnread = isBroadcastUnread(msg);
                    return (
                    <tr
                      key={msg._id}
                      onClick={() => handleOpenMessageDetails(msg)}
                      className={`cursor-pointer transition-colors group border-l-4 ${
                        isUnread
                          ? "bg-emerald-50/70 border-l-emerald-600 hover:bg-emerald-100/70"
                          : "hover:bg-slate-50/80 border-l-transparent"
                      }`}
                      title="Click to view full dispatch & recipient delivery details"
                    >
                      <td className="py-3.5 px-4 max-w-sm">
                        {(() => {
                          const { title: displayTitle, isTemplate } = formatBroadcastTitle(msg.title);
                          return (
                            <div className="font-bold flex items-center gap-1.5 flex-wrap">
                              {isUnread && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase font-mono bg-emerald-700 text-white shadow-2xs shrink-0 tracking-wider">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                                  NEW
                                </span>
                              )}
                              {isTemplate ? (
                                <span className="text-slate-900 group-hover:text-emerald-900 transition-colors flex items-center gap-1.5 text-xs font-extrabold">
                                  <Bookmark className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                                  <span>{displayTitle}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase font-mono bg-slate-100 text-slate-500 border border-slate-200">
                                  NO SMS TEMPLATE
                                </span>
                              )}
                            </div>
                          );
                        })()}
                        <p className="text-[11px] text-slate-500 truncate mt-1">{msg.content}</p>
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
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenMessageDetails(msg);
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 transition-all cursor-pointer shadow-2xs group/btn"
                              title="Click to view recipient delivery breakdown"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 group-hover/btn:scale-110 transition-transform" />
                              <span>Delivered ({msg.deliveredCount}/{msg.totalRecipients})</span>
                              <ChevronRight className="w-3 h-3 text-emerald-500 opacity-60 group-hover/btn:opacity-100 group-hover/btn:translate-x-0.5 transition-all" />
                            </button>
                          ) : msg.status === "FAILED" ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenMessageDetails(msg);
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-all cursor-pointer shadow-2xs"
                              title="Click to view failure details"
                            >
                              <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                              <span>Failed ({msg.failedCount}/{msg.totalRecipients})</span>
                              <ChevronRight className="w-3 h-3 text-red-400" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenMessageDetails(msg);
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-all cursor-pointer shadow-2xs"
                              title="Click to view transmission progress"
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                              <span>In Transit ({msg.deliveredCount}/{msg.totalRecipients})</span>
                              <ChevronRight className="w-3 h-3 text-amber-400" />
                            </button>
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
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRetryFailed(msg._id, msg.totalRecipients);
                              }}
                              disabled={isRetrying}
                              className="px-2 py-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <RefreshCw className={`w-3 h-3 ${isRetrying ? "animate-spin" : ""}`} />
                              Retry Failed
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenMessageDetails(msg);
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                          >
                            Details
                          </button>
                        </div>
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
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4 animate-in zoom-in-95 duration-200">
            {/* Animated Ripple Beacon */}
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto relative shadow-xs">
              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-35" />
              <CheckCheck className="w-8 h-8 text-emerald-700 relative z-10" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-mono font-extrabold text-emerald-800 uppercase tracking-wider mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Network Transmission Confirmed
              </div>
              <h3 className="text-lg font-black text-slate-900">Broadcast Dispatched</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Your SMS alert has been transmitted to the carrier network. It is now flagged as fresh in the Outbox.
              </p>
            </div>

            <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/80 text-left text-xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-[11px]">
                <span>Status:</span>
                <span className="font-extrabold text-emerald-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Highlighted Green in Outbox
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500 text-[11px]">
                <span>Route:</span>
                <span className="font-bold text-slate-800 font-mono">SIM 1 · TNT (Infinix X6711)</span>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsSuccess(false)}
                className="flex-1 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSuccess(false);
                  handleTabChange("outbox");
                }}
                className="flex-1 py-2.5 text-xs font-extrabold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer group hover:translate-x-0.5"
              >
                <span>View the Sent SMS</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: BROADCAST TRANSMISSION & RECIPIENT DELIVERY AUDIT  */}
      {/* ========================================================= */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-5xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                      Broadcast Delivery Details
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {selectedMessage.status === "DELIVERED"
                        ? "SENT TO NETWORK"
                        : selectedMessage.status === "FAILED"
                        ? "FAILED"
                        : "IN TRANSIT"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    10RCDG GSM Gateway report and recipient delivery verification.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedMessage(null);
                  setModalRecipientSearch("");
                  setGatewaySyncFeedback(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 2-Column Command Dossier Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              
              {/* LEFT COLUMN: Mission Dispatch Slip & Gateway Hardware Info */}
              <div className="lg:col-span-5 space-y-3.5">
                <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 space-y-3.5 shadow-2xs">
                  {/* Mission Metadata */}
                  <div className="space-y-1.5 pb-3 border-b border-slate-200/80 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-medium">Dispatched by:</span>
                      <span className="font-bold text-slate-900">
                        {(() => {
                          const rank = selectedMessage.senderRank || "";
                          const name = selectedMessage.senderName || "Command Officer";
                          if (rank && name.toLowerCase().startsWith(rank.toLowerCase())) {
                            return name;
                          }
                          return rank ? `${rank} ${name}` : name;
                        })()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-medium">Target Unit:</span>
                      <span className="font-bold text-slate-800">
                        {selectedMessage.targetGroupNames?.join(", ") || "Direct SMS"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-medium">Timestamp:</span>
                      <span className="font-mono text-slate-700 text-[11px]">
                        {selectedMessage.sentAt}
                      </span>
                    </div>
                  </div>

                  {/* Message Body Card (Clean Military Dispatch Paper) */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2 border-l-4 border-l-emerald-600">
                    <div className="flex items-center justify-between">
                      {(() => {
                        const { title: displayTitle, isTemplate } = formatBroadcastTitle(selectedMessage.title);
                        return isTemplate ? (
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Bookmark className="w-3.5 h-3.5 text-emerald-700" />
                            {displayTitle}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase font-mono bg-slate-100 text-slate-500 border border-slate-200">
                            NO SMS TEMPLATE
                          </span>
                        );
                      })()}
                      <button
                        type="button"
                        onClick={() => handleCopyMessage(selectedMessage.content)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-lg text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer active:scale-95"
                      >
                        {copiedMessage ? <Check className="w-3 h-3 text-emerald-700" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedMessage ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                    <p className="text-xs text-slate-800 font-medium leading-relaxed whitespace-pre-wrap select-all max-h-48 overflow-y-auto">
                      {selectedMessage.content}
                    </p>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-400 font-mono">
                      <span>{selectedMessage.content.length} characters</span>
                      <span>{Math.ceil(selectedMessage.content.length / 160) || 1} SMS segment(s)</span>
                    </div>
                  </div>

                  {/* Sleek Gateway Hardware Card */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-slate-700 text-[11px]">
                        <Smartphone className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span>
                          <strong className="text-slate-900">Infinix X6711</strong> • <span className="font-mono text-slate-600">SIM {selectedMessage.simSubscriptionId || 1} (TNT Smart)</span>
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleVerifyGatewayStatus(selectedMessage.gatewayBatchId)}
                      disabled={isSyncingGateway}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncingGateway ? "animate-spin" : ""}`} />
                      <span>{isSyncingGateway ? "Verifying Radio Status..." : "Verify with Gateway"}</span>
                    </button>

                    {gatewaySyncFeedback && (
                      <div className="text-[11px] font-bold text-emerald-900 bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-xl animate-in fade-in">
                        {gatewaySyncFeedback}
                      </div>
                    )}
                  </div>

                  {/* Telecom Protocol Footnote */}
                  <div className="flex items-start gap-1.5 text-[11px] text-slate-500 pt-1">
                    <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>
                      Radio transmission confirmed by 10RCDG Gateway phone to Smart/TNT cellular network towers.
                    </span>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Itemized Recipient Soldier Roster */}
              {(() => {
                const recipientsList = selectedMessage.recipients && selectedMessage.recipients.length > 0
                  ? selectedMessage.recipients
                  : [];

                const trimmedQ = modalRecipientSearch.trim().toLowerCase();
                const qClean = trimmedQ.replace(/[\s\-_+()]/g, "");
                const qDigits = trimmedQ.replace(/\D/g, "");
                const qCore = getPhCoreDigits(qDigits);
                const searchWords = trimmedQ.split(/\s+/).filter(Boolean);

                const filteredList = recipientsList.filter((num) => {
                  if (!trimmedQ) return true;
                  const soldier = getSoldierForNumber(num);
                  const rawNum = num.toLowerCase();
                  const formattedNum = formatPhMobileDisplay(num).toLowerCase();
                  const cleanNum = num.replace(/[\s\-_+()]/g, "");
                  const numDigits = num.replace(/\D/g, "");
                  const numCore = getPhCoreDigits(numDigits);

                  // Match phone number variations
                  const matchesMobile =
                    rawNum.includes(trimmedQ) ||
                    cleanNum.includes(qClean) ||
                    formattedNum.includes(trimmedQ) ||
                    (qDigits.length > 0 && (
                      numDigits.includes(qDigits) ||
                      (qCore.length >= 2 && numCore.includes(qCore))
                    ));

                  if (!soldier) {
                    return (
                      matchesMobile ||
                      "direct contact".includes(trimmedQ) ||
                      "unassigned".includes(trimmedQ)
                    );
                  }

                  const fullName = `${soldier.firstName} ${soldier.lastName}`.toLowerCase();
                  const cleanFullName = fullName.replace(/[\s\-_]/g, "");
                  const rankCode = (soldier.rank || "").toLowerCase();
                  const unit = (soldier.unit || "").toLowerCase();
                  const groupName = (soldier.groupName || "").toLowerCase();

                  // Multi-token: each space-separated word matches at least one field
                  const matchesAllTokens =
                    searchWords.length > 0 &&
                    searchWords.every((w) => {
                      const wClean = w.replace(/[\s\-_+()]/g, "");
                      const wDigits = w.replace(/\D/g, "");
                      const wCore = getPhCoreDigits(wDigits);

                      return (
                        fullName.includes(w) ||
                        cleanFullName.includes(wClean) ||
                        rankCode.includes(w) ||
                        unit.includes(w) ||
                        groupName.includes(w) ||
                        rawNum.includes(w) ||
                        cleanNum.includes(wClean) ||
                        (wDigits.length > 0 && (
                          numDigits.includes(wDigits) ||
                          (wCore.length >= 2 && numCore.includes(wCore))
                        ))
                      );
                    });

                  return (
                    matchesMobile ||
                    fullName.includes(trimmedQ) ||
                    cleanFullName.includes(qClean) ||
                    rankCode.includes(trimmedQ) ||
                    unit.includes(trimmedQ) ||
                    groupName.includes(trimmedQ) ||
                    matchesAllTokens
                  );
                });

                return (
                  <div className="lg:col-span-7 flex flex-col space-y-2.5">
                    {/* Roster Header with live stats and search */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/80 p-3 rounded-2xl border border-slate-200">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-emerald-700" />
                          Soldiers ({recipientsList.length})
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          ✓ {selectedMessage.deliveredCount} Sent ({Math.round((selectedMessage.deliveredCount / (selectedMessage.totalRecipients || 1)) * 100)}%)
                        </span>
                        {selectedMessage.failedCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                            ✕ {selectedMessage.failedCount} Failed
                          </span>
                        )}
                        {modalRecipientSearch.trim() && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                            {filteredList.length} of {recipientsList.length} matched
                          </span>
                        )}
                      </div>

                      {/* Search in recipients */}
                      <div className="relative w-full sm:w-64">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={modalRecipientSearch}
                          onChange={(e) => setModalRecipientSearch(e.target.value)}
                          placeholder="Search name, rank, group, or mobile..."
                          className="w-full pl-8 pr-8 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 font-medium placeholder:text-slate-400"
                        />
                        {modalRecipientSearch && (
                          <button
                            type="button"
                            onClick={() => setModalRecipientSearch("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700 rounded-md transition-colors cursor-pointer"
                            title="Clear search query"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Recipient Roster List */}
                    <div className="h-[380px] overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl bg-white shadow-2xs">
                      {filteredList.length === 0 ? (
                        <div className="p-8 text-center space-y-2">
                          <Users className="w-7 h-7 mx-auto text-slate-300" />
                          <p className="text-xs text-slate-500 font-medium">
                            No recipient records match "{modalRecipientSearch}".
                          </p>
                          <button
                            type="button"
                            onClick={() => setModalRecipientSearch("")}
                            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                          >
                            Clear search query
                          </button>
                        </div>
                      ) : (
                        filteredList.map((num, idx) => {
                          const soldier = getSoldierForNumber(num);
                          const perRecipientStatus = selectedMessage.recipientStatuses?.find(
                            (s) => s.number === num || s.number.endsWith(num.replace(/\D/g, "").slice(-10))
                          );

                          const statusStr = (perRecipientStatus?.status || selectedMessage.status || "DELIVERED").toUpperCase();
                          const isSuccess = statusStr === "SENT" || statusStr === "DELIVERED";
                          const isFailed = statusStr === "FAILED";

                          return (
                            <div
                              key={`${num}-${idx}`}
                              className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <span
                                  className={`px-2 py-1 rounded-lg text-xs font-mono font-bold tracking-wider shrink-0 ${
                                    soldier
                                      ? "bg-emerald-100/70 text-emerald-900 border border-emerald-300"
                                      : "bg-slate-100 text-slate-700 border border-slate-200"
                                  }`}
                                >
                                  <HighlightMatch text={soldier ? soldier.rank : "SMS"} query={modalRecipientSearch} />
                                </span>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-extrabold text-slate-900 text-xs">
                                      {soldier ? (
                                        <>
                                          <HighlightMatch text={soldier.rank} query={modalRecipientSearch} />{" "}
                                          <HighlightMatch
                                            text={`${soldier.lastName}, ${soldier.firstName}`}
                                            query={modalRecipientSearch}
                                          />
                                        </>
                                      ) : (
                                        <HighlightMatch text="Direct Contact" query={modalRecipientSearch} />
                                      )}
                                    </span>
                                    {soldier?.unit && (
                                      <span className="text-[11px] text-slate-500 font-medium">
                                        (<HighlightMatch text={soldier.unit} query={modalRecipientSearch} />)
                                      </span>
                                    )}
                                  </div>

                                  {/* Contact Group Badge & Formatted Phone Number */}
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                                      <Users className="w-2.5 h-2.5 text-slate-400" />
                                      <HighlightMatch
                                        text={soldier?.groupName || "Direct Contact"}
                                        query={modalRecipientSearch}
                                      />
                                    </span>
                                    <span className="font-mono text-xs text-slate-600 font-medium">
                                      <HighlightMatch
                                        text={formatPhMobileDisplay(num)}
                                        query={modalRecipientSearch}
                                      />
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="shrink-0">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                                    isSuccess
                                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                      : isFailed
                                      ? "bg-red-50 text-red-700 border-red-200"
                                      : "bg-amber-50 text-amber-700 border-amber-200"
                                  }`}
                                >
                                  {isSuccess ? (
                                    <>
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Sent to Network</span>
                                    </>
                                  ) : isFailed ? (
                                    <>
                                      <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                                      <span>Failed</span>
                                    </>
                                  ) : (
                                    <>
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                                      <span>In Transit</span>
                                    </>
                                  )}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-[11px] text-slate-500 font-mono">
                10RCDG RESCOM-ALERT • Official Command Telemetry
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedMessage(null);
                  setModalRecipientSearch("");
                  setGatewaySyncFeedback(null);
                }}
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
