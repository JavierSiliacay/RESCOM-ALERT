"use client";

import { useState, useEffect, useRef } from "react";
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
  UserX,
  Link2,
  Share2,
  QrCode,
  KeyRound,
  Clock,
  Sparkles,
  AlertTriangle,
  ChevronRight,
  Send,
  UserPlus,
  RefreshCw,
  Check,
  Smartphone,
  Download,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import {
  sanitizePhMobileInput,
  isValidPhMobileNumber,
  formatPhMobileDisplay,
  matchesPhMobileSearch,
} from "@/lib/sms";
import {
  RANK_GROUPS,
  getRankFullName,
  getRankBadgeStyle,
} from "@/lib/military-ranks";
import { RankSearchSelect } from "@/components/rank-search-select";
import { EnlistmentShareModal } from "@/components/enlistment-share-modal";
import {
  Skeleton,
  StatCardSkeleton,
  TableSkeleton,
  CampaignCardSkeleton,
} from "@/components/skeleton";
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

// Duration preview helper for campaign generator
function getDurationPreview(inputStr: string): {
  type: "empty" | "indefinite" | "valid" | "unrecognized";
  normalizedLabel?: string;
  expiryDateFormatted?: string;
} {
  let d = inputStr.toLowerCase().trim();
  if (!d) return { type: "empty" };

  const wordToNum: Record<string, string> = {
    "a ": "1 ",
    "an ": "1 ",
    "one": "1",
    "two": "2",
    "three": "3",
    "four": "4",
    "five": "5",
    "six": "6",
    "seven": "7",
    "eight": "8",
    "nine": "9",
    "ten": "10",
    "twelve": "12",
    "fourteen": "14",
    "twenty": "20",
    "thirty": "30",
    "sixty": "60",
    "ninety": "90",
  };
  for (const [w, n] of Object.entries(wordToNum)) {
    d = d.replace(new RegExp(`\\b${w}\\b`, "g"), n);
  }

  let ms = 0;
  let normalizedLabel = "";

  if (d === "tomorrow") {
    ms = 24 * 60 * 60 * 1000;
    normalizedLabel = "1 Day (Tomorrow)";
  } else if (d === "next week") {
    ms = 7 * 24 * 60 * 60 * 1000;
    normalizedLabel = "1 Week (7 Days)";
  } else if (d === "next month") {
    ms = 30 * 24 * 60 * 60 * 1000;
    normalizedLabel = "1 Month (30 Days)";
  } else {
    const matchMinutes = d.match(/(\d+)\s*(minute|min|m\b)/);
    const matchHours = d.match(/(\d+)\s*(hour|hr|h\b)/);
    const matchWeeks = d.match(/(\d+)\s*(week|wk|w\b)/);
    const matchMonths = d.match(/(\d+)\s*(month|mo\b)/);
    const matchDays = d.match(/(\d+)\s*(day|d\b)?/);

    if (matchMinutes) {
      const val = parseInt(matchMinutes[1], 10);
      ms = val * 60 * 1000;
      normalizedLabel = `${val} Minute${val > 1 ? "s" : ""}`;
    } else if (matchHours) {
      const val = parseInt(matchHours[1], 10);
      ms = val * 60 * 60 * 1000;
      normalizedLabel = `${val} Hour${val > 1 ? "s" : ""}`;
    } else if (matchWeeks) {
      const val = parseInt(matchWeeks[1], 10);
      ms = val * 7 * 24 * 60 * 60 * 1000;
      normalizedLabel = `${val} Week${val > 1 ? "s" : ""}`;
    } else if (matchMonths) {
      const val = parseInt(matchMonths[1], 10);
      ms = val * 30 * 24 * 60 * 60 * 1000;
      normalizedLabel = `${val} Month${val > 1 ? "s" : ""}`;
    } else if (matchDays && matchDays[1]) {
      const val = parseInt(matchDays[1], 10);
      ms = val * 24 * 60 * 60 * 1000;
      normalizedLabel = `${val} Day${val > 1 ? "s" : ""}`;
    }
  }

  if (ms > 0) {
    const targetDate = new Date(Date.now() + ms);
    return {
      type: "valid",
      normalizedLabel,
      expiryDateFormatted: targetDate.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
    };
  }

  return { type: "unrecognized" };
}

function CampaignLiveTimer({
  expiresAt,
  isExpired,
  duration,
}: {
  expiresAt: number;
  isExpired: boolean;
  duration: string;
}) {
  const [timeLeftStr, setTimeLeftStr] = useState<string>("");
  const [expired, setExpired] = useState<boolean>(isExpired);

  useEffect(() => {
    const update = () => {
      const diff = expiresAt - Date.now();
      if (diff <= 0 || isExpired) {
        setTimeLeftStr("Closed / Concluded");
        setExpired(true);
        return;
      }
      setExpired(false);
      const totalSec = Math.floor(diff / 1000);
      const days = Math.floor(totalSec / 86400);
      const hours = Math.floor((totalSec % 86400) / 3600);
      const mins = Math.floor((totalSec % 3600) / 60);
      const secs = totalSec % 60;

      if (days > 0) {
        setTimeLeftStr(`${days}d ${hours}h ${mins}m left`);
      } else if (hours > 0) {
        setTimeLeftStr(`${hours}h ${mins}m ${secs}s left`);
      } else {
        setTimeLeftStr(`${mins}m ${secs}s left`);
      }
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [expiresAt, isExpired]);

  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500 flex items-center gap-1 font-mono text-[10px]">
        <Clock className="w-3 h-3 text-amber-600" />
        Time Remaining:
      </span>
      <span
        className={`font-mono text-[11px] font-bold ${
          expired ? "text-slate-400" : "text-amber-800 animate-pulse"
        }`}
      >
        {timeLeftStr || duration}
      </span>
    </div>
  );
}

export default function PersonnelPage() {
  const currentOfficer = useCurrentOfficer();
  const { isViewer, guardAction } = currentOfficer;
  const personnel = useQuery(api.personnel.list);
  const groups = useQuery(api.groups.list);
  const campaigns = useQuery(api.enlistment.listCampaigns);
  const submissions = useQuery(api.enlistment.listSubmissions, {});

  const createPersonnel = useMutation(api.personnel.create);
  const updatePersonnel = useMutation(api.personnel.update);
  const togglePersonnelStatus = useMutation(api.personnel.toggleStatus);
  const removePersonnel = useMutation(api.personnel.remove);

  // Enlistment Mutations
  const createCampaign = useMutation(api.enlistment.createCampaign);
  const approveSubmission = useMutation(api.enlistment.approveSubmission);
  const bulkApproveSubmissions = useMutation(api.enlistment.bulkApproveSubmissions);
  const rejectSubmission = useMutation(api.enlistment.rejectSubmission);
  const closeCampaign = useMutation(api.enlistment.closeCampaign);
  const removeCampaign = useMutation(api.enlistment.removeCampaign);

  // View Mode: 'ROSTER' | 'ENLISTMENT'
  const [activeTab, setActiveTab] = useState<"ROSTER" | "ENLISTMENT">("ROSTER");

  // Roster Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  // Manual Add/Edit Personnel Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"personnel"> | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Status Toggle Confirmation Modal State
  const [statusConfirmTarget, setStatusConfirmTarget] = useState<(typeof personnelList)[number] | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    rank: "PVT",
    mobileNumber: "09",
    groupId: "",
    unit: "10RCDG HQ",
    email: "",
  });

  // Campaign Generator Modal State
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [campaignFormData, setCampaignFormData] = useState({
    title: "",
    instructions: "",
    passcode: "10RCDG-RESCOM",
    targetUnit: "1001st CDC",
    groupId: "",
    groupName: "Ready Reserve",
    durationPreset: "24 Hours",
    customDuration: "",
  });

  // Share Modal State
  const [shareModalData, setShareModalData] = useState<{
    title: string;
    campaignCode: string;
    passcode: string;
    targetUnit: string;
    duration: string;
    expiresAt: number;
  } | null>(null);

  // Selected Pending Submissions for Bulk Approval
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState<Id<"enlistmentSubmissions">[]>([]);
  const [isBulkApproving, setIsBulkApproving] = useState(false);

  const isLoadingPersonnel = personnel === undefined;
  const isLoadingGroups = groups === undefined;
  const isLoadingCampaigns = campaigns === undefined;
  const isLoadingSubmissions = submissions === undefined;

  const personnelList = personnel || [];
  const groupsList = groups || [];
  const campaignsList = campaigns || [];
  const submissionsList = submissions || [];

  const pendingSubmissions = submissionsList.filter((s) => s.status === "PENDING");

  // Search Bar Dropdown & Autocomplete State
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close search dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const trimmedQuery = searchQuery.trim().toLowerCase();

  // Filtered Personnel List (space-insensitive and case-insensitive for numbers and names)
  const filteredPersonnel = personnelList.filter((person) => {
    if (!trimmedQuery) {
      const matchesGroup = selectedGroup === "ALL" || person.groupId === selectedGroup || person.groupName === selectedGroup;
      const matchesStatus = selectedStatus === "ALL" || person.status === selectedStatus;
      return matchesGroup && matchesStatus;
    }

    // 1. Mobile number normalization (strips all spaces, dashes, +, (), etc.)
    const qDigits = trimmedQuery.replace(/\D/g, "");
    const qClean = trimmedQuery.replace(/[\s\-_+()]/g, "");

    const rawMobile = (person.mobileNumber || "").toLowerCase();
    const cleanMobile = rawMobile.replace(/[\s\-_+()]/g, "");
    const mobileDigits = rawMobile.replace(/\D/g, "");

    const formattedMobile = formatPhMobileDisplay(person.mobileNumber).toLowerCase();
    const formattedDigits = formattedMobile.replace(/\D/g, "");

    // Cross-match local (09...) and international (639...) formats & core national digits
    const getPhCoreDigits = (str: string) => {
      const d = str.replace(/\D/g, "");
      if (d.startsWith("639")) return d.slice(2);
      if (d.startsWith("09")) return d.slice(1);
      return d;
    };

    const storedCore = getPhCoreDigits(mobileDigits);
    const queryCore = getPhCoreDigits(qDigits);

    const localMobileDigits = mobileDigits.startsWith("63")
      ? "0" + mobileDigits.slice(2)
      : mobileDigits;
    const intlMobileDigits = mobileDigits.startsWith("0")
      ? "63" + mobileDigits.slice(1)
      : mobileDigits;

    const matchesMobile =
      matchesPhMobileSearch(person.mobileNumber, trimmedQuery) ||
      rawMobile.includes(trimmedQuery) ||
      cleanMobile.includes(qClean) ||
      formattedMobile.includes(trimmedQuery) ||
      (qDigits.length > 0 && (
        mobileDigits.includes(qDigits) ||
        formattedDigits.includes(qDigits) ||
        localMobileDigits.includes(qDigits) ||
        intlMobileDigits.includes(qDigits) ||
        (queryCore.length >= 2 && storedCore.includes(queryCore))
      ));

    // 2. Name, Rank, Unit & Group (space-insensitive and multi-word token matching)
    const fullName = `${person.firstName} ${person.lastName}`.toLowerCase();
    const cleanFullName = fullName.replace(/[\s\-_]/g, "");

    const rankFullName = getRankFullName(person.rank).toLowerCase();
    const rankCode = person.rank.toLowerCase();

    const unit = (person.unit || "").toLowerCase();
    const cleanUnit = unit.replace(/[\s\-_]/g, "");

    const groupName = (person.groupName || "").toLowerCase();

    // Multi-word tokens: "cruz juan" or "juan bgen" matches "BGEN Juan Dela Cruz"
    const words = trimmedQuery.split(/\s+/).filter(Boolean);
    const matchesAllTokens = words.length > 0 && words.every((w) => {
      const wClean = w.replace(/[\s\-_+()]/g, "");
      const wDigits = w.replace(/\D/g, "");
      const wCore = getPhCoreDigits(wDigits);
      return (
        fullName.includes(w) ||
        cleanFullName.includes(wClean) ||
        rankCode.includes(w) ||
        rankFullName.includes(w) ||
        unit.includes(w) ||
        groupName.includes(w) ||
        cleanMobile.includes(wClean) ||
        matchesPhMobileSearch(person.mobileNumber, w) ||
        (wDigits.length > 0 && (
          mobileDigits.includes(wDigits) ||
          localMobileDigits.includes(wDigits) ||
          intlMobileDigits.includes(wDigits) ||
          (wCore.length >= 2 && storedCore.includes(wCore))
        ))
      );
    });

    const matchesName =
      fullName.includes(trimmedQuery) ||
      cleanFullName.includes(qClean) ||
      matchesAllTokens;

    const matchesRank =
      rankCode.includes(trimmedQuery) ||
      rankFullName.includes(trimmedQuery) ||
      rankFullName.replace(/[\s\-_]/g, "").includes(qClean);

    const matchesUnit =
      unit.includes(trimmedQuery) ||
      cleanUnit.includes(qClean);

    const matchesGroupText = groupName.includes(trimmedQuery);

    const matchesSearch =
      matchesMobile ||
      matchesName ||
      matchesRank ||
      matchesUnit ||
      matchesGroupText;

    const matchesGroup = selectedGroup === "ALL" || person.groupId === selectedGroup || person.groupName === selectedGroup;
    const matchesStatus = selectedStatus === "ALL" || person.status === selectedStatus;

    return matchesSearch && matchesGroup && matchesStatus;
  });

  const totalMatches = filteredPersonnel.length;
  const showSearchDropdown = isSearchFocused && trimmedQuery.length > 0;

  const handleOpenAddModal = () => {
    guardAction("add new personnel member", () => {
      setEditingId(null);
      setPhoneError(null);
      setFormData({
        firstName: "",
        lastName: "",
        rank: "PVT",
        mobileNumber: "09",
        groupId: groupsList[0]?._id || "",
        unit: "10RCDG HQ",
        email: "",
      });
      setIsAddModalOpen(true);
    });
  };

  const handleOpenEditModal = (person: (typeof personnelList)[number]) => {
    guardAction("edit personnel record", () => {
      setEditingId(person._id);
      setPhoneError(null);
      const matchedGroup = groupsList.find(
        (g) => g._id === person.groupId || g.name === person.groupName
      );

      setFormData({
        firstName: person.firstName || "",
        lastName: person.lastName || "",
        rank: person.rank || "PVT",
        mobileNumber: person.mobileNumber || "09",
        groupId: matchedGroup ? matchedGroup._id : (person.groupId || groupsList[0]?._id || ""),
        unit: person.unit || "10RCDG HQ",
        email: person.email || "",
      });
      setIsAddModalOpen(true);
    });
  };

  const handleSavePersonnel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewer) {
      guardAction("save personnel record");
      return;
    }

    const cleanMobile = formData.mobileNumber.trim();
    if (!isValidPhMobileNumber(cleanMobile)) {
      setPhoneError("Please enter a valid Philippine mobile number (e.g., 09171234567 or +639171234567).");
      return;
    }
    setPhoneError(null);

    setIsSaving(true);
    try {
      const selectedGrp = groupsList.find((g) => g._id === formData.groupId);
      const groupName = selectedGrp ? selectedGrp.name : "Ready Reserve";

      if (editingId) {
        await updatePersonnel({
          id: editingId,
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          rank: formData.rank,
          mobileNumber: cleanMobile,
          groupId: formData.groupId || undefined,
          groupName,
          unit: formData.unit.trim(),
          email: formData.email.trim() || undefined,
          updatedBy: currentOfficer.displayName,
          updatedByEmail: currentOfficer.email,
        });
      } else {
        await createPersonnel({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          rank: formData.rank,
          mobileNumber: cleanMobile,
          groupId: formData.groupId || undefined,
          groupName,
          unit: formData.unit.trim(),
          email: formData.email.trim() || undefined,
          createdBy: currentOfficer.displayName,
          createdByEmail: currentOfficer.email,
        });
      }
      setIsAddModalOpen(false);
    } catch (err: any) {
      alert(err?.message || "Failed to save personnel record");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: Id<"personnel">) => {
    guardAction("remove personnel from active roster", async () => {
      if (confirm("Are you sure you want to remove this personnel from the active roster?")) {
        try {
          await removePersonnel({
            id,
            officerEmail: currentOfficer.email,
          });
        } catch (err: any) {
          alert(err?.message || "Failed to remove personnel");
        }
      }
    });
  };

  const handleInitiateToggleStatus = (person: (typeof personnelList)[number]) => {
    guardAction("toggle personnel active status", () => {
      setStatusConfirmTarget(person);
    });
  };

  const handleConfirmToggleStatus = async () => {
    if (!statusConfirmTarget) return;
    if (isViewer) {
      guardAction("toggle personnel active status");
      return;
    }

    setIsTogglingStatus(true);
    try {
      await togglePersonnelStatus({
        id: statusConfirmTarget._id,
        updatedBy: currentOfficer.displayName,
        updatedByEmail: currentOfficer.email,
      });
      setStatusConfirmTarget(null);
    } catch (err: any) {
      alert(err?.message || "Failed to update member status");
    } finally {
      setIsTogglingStatus(false);
    }
  };

  // Generate Random Tactical Passcode
  const handleGenerateRandomPasscode = () => {
    const num = Math.floor(1000 + Math.random() * 9000);
    setCampaignFormData((prev) => ({ ...prev, passcode: `10RCDG-${num}` }));
  };

  // Handle Campaign Creation
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewer) {
      guardAction("create enlistment campaign");
      return;
    }

    if (!campaignFormData.title.trim()) {
      alert("Please enter a custom campaign title.");
      return;
    }

    let durationStr = campaignFormData.durationPreset;
    if (campaignFormData.durationPreset.startsWith("Custom")) {
      const customVal = campaignFormData.customDuration.trim();
      if (!customVal) {
        alert("Please enter a custom duration (e.g., 5 mins, 2 hours, 45 days).");
        return;
      }
      durationStr = customVal;
    }

    setIsCreatingCampaign(true);
    try {
      const selectedGrp = groupsList.find((g) => g._id === campaignFormData.groupId);
      const groupName = selectedGrp ? selectedGrp.name : campaignFormData.groupName;

      const res = await createCampaign({
        title: campaignFormData.title.trim(),
        instructions: campaignFormData.instructions.trim() || undefined,
        passcode: campaignFormData.passcode.trim().toUpperCase(),
        targetUnit: groupName,
        groupId: campaignFormData.groupId || undefined,
        groupName,
        durationStr,
        createdBy: currentOfficer.displayName,
        createdByEmail: currentOfficer.email,
      });

      setIsCampaignModalOpen(false);
      // Open share modal
      setShareModalData({
        title: campaignFormData.title.trim(),
        campaignCode: res.campaignCode,
        passcode: campaignFormData.passcode.trim().toUpperCase(),
        targetUnit: groupName,
        duration: durationStr,
        expiresAt: res.expiresAt,
      });
      setActiveTab("ENLISTMENT");
    } catch (err: any) {
      alert(err?.message || "Failed to create enlistment campaign");
    } finally {
      setIsCreatingCampaign(false);
    }
  };

  // Handle Bulk Approval
  const handleBulkApprove = async () => {
    guardAction("bulk approve enlistment submissions", async () => {
      const idsToApprove =
        selectedSubmissionIds.length > 0
          ? selectedSubmissionIds
          : pendingSubmissions.map((s) => s._id);

      if (idsToApprove.length === 0) return;

      if (confirm(`Approve and add ${idsToApprove.length} soldier(s) to the active 10RCDG messaging directory?`)) {
        setIsBulkApproving(true);
        try {
          await bulkApproveSubmissions({
            submissionIds: idsToApprove,
            reviewerEmail: currentOfficer.email || "command@10rcdg.mil.ph",
            reviewerName: currentOfficer.displayName,
          });
          setSelectedSubmissionIds([]);
        } catch (err: any) {
          alert(err?.message || "Failed to approve submissions");
        } finally {
          setIsBulkApproving(false);
        }
      }
    });
  };

  const handleSingleApprove = async (id: Id<"enlistmentSubmissions">) => {
    guardAction("approve enlistment submission", async () => {
      try {
        await approveSubmission({
          submissionId: id,
          reviewerEmail: currentOfficer.email || "command@10rcdg.mil.ph",
          reviewerName: currentOfficer.displayName,
        });
      } catch (err: any) {
        alert(err?.message || "Failed to approve submission");
      }
    });
  };

  const handleSingleReject = async (id: Id<"enlistmentSubmissions">) => {
    guardAction("reject enlistment submission", async () => {
      if (confirm("Reject this enlistment submission?")) {
        try {
          await rejectSubmission({
            submissionId: id,
            reviewerEmail: currentOfficer.email || "command@10rcdg.mil.ph",
            reviewerName: currentOfficer.displayName,
          });
        } catch (err: any) {
          alert(err?.message || "Failed to reject submission");
        }
      }
    });
  };

  const handleCloseCampaign = async (id: Id<"enlistmentCampaigns">) => {
    guardAction("close enlistment campaign early", async () => {
      if (confirm("Close this enlistment campaign window early? The public link will immediately stop accepting new registrations.")) {
        try {
          await closeCampaign({
            campaignId: id,
            officerEmail: currentOfficer.email,
          });
        } catch (err: any) {
          alert(err?.message || "Failed to close campaign");
        }
      }
    });
  };

  const handleRemoveCampaign = async (id: Id<"enlistmentCampaigns">) => {
    guardAction("delete enlistment campaign", async () => {
      if (confirm("Permanently delete this enlistment campaign and all associated submissions?")) {
        try {
          await removeCampaign({
            campaignId: id,
            officerEmail: currentOfficer.email,
          });
        } catch (err: any) {
          alert(err?.message || "Failed to delete campaign");
        }
      }
    });
  };

  const activeCount = personnelList.filter((p) => p.status === "ACTIVE").length;

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 uppercase mb-1">
            <Shield className="w-4 h-4 text-emerald-600" />
            10RCDG Personnel Management
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Members & Enlistments
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Manage active troop directories, contact groups, and time-limited enlistment portals.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">

          <button
            onClick={() => {
              guardAction("generate enlistment link", () => {
                setCampaignFormData({
                  title: "1001st CDC Mobilization Roster",
                  instructions: "Please submit your active mobile number for official mobilization alerts.",
                  passcode: "10RCDG-RESCOM",
                  targetUnit: "1001st CDC",
                  groupId: groupsList[0]?._id || "",
                  groupName: groupsList[0]?.name || "Ready Reserve",
                  durationPreset: "24 Hours",
                  customDuration: "",
                });
                setIsCampaignModalOpen(true);
              });
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 rounded-xl text-xs font-extrabold transition-all shadow-md active:scale-95 cursor-pointer uppercase tracking-wider"
          >
            <Link2 className="w-4 h-4" />
            <span>Generate Enlistment Link</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer uppercase tracking-wider"
          >
            <Plus className="w-4 h-4" />
            <span>Add Single Member</span>
          </button>
        </div>
      </div>

      {/* Viewer Clearance Alert Banner */}
      {isViewer && (
        <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-950 flex items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Viewer Clearance Mode:</strong> You are viewing this roster with read-only privileges. Commands to add, edit, or delete personnel records require Administrative clearance.
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-amber-100 border border-amber-300 font-mono text-[10px] font-bold shrink-0 text-amber-900">
            READ-ONLY
          </span>
        </div>
      )}

      {/* View Tabs Switcher */}
      <div className="flex items-center gap-2 p-1 bg-slate-100/90 rounded-2xl max-w-fit border border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("ROSTER")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "ROSTER"
              ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Users className="w-4 h-4 text-emerald-700" />
          <span>Active Roster Directory</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 font-mono text-[10px]">
            {personnelList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ENLISTMENT")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "ENLISTMENT"
              ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Link2 className="w-4 h-4 text-amber-600" />
          <span>Enlistment Portals & Approvals</span>
          {pendingSubmissions.length > 0 ? (
            <span className="ml-1 px-2 py-0.2 rounded-full bg-amber-500 text-slate-950 font-mono text-[10px] font-extrabold animate-pulse">
              {pendingSubmissions.length} Pending
            </span>
          ) : (
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-500 font-mono text-[10px]">
              {campaignsList.length} Links
            </span>
          )}
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: ACTIVE PERSONNEL DIRECTORY */}
      {/* ========================================================= */}
      {activeTab === "ROSTER" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {isLoadingPersonnel ? (
              <>
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
              </>
            ) : (
              <>
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
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Broadcast Numbers</p>
                    <p className="text-2xl font-extrabold text-emerald-700 mt-1">{activeCount}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
                    <UserCheck className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Groups</p>
                    <p className="text-2xl font-extrabold text-amber-700 mt-1">{groupsList.length}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700">
                    <Shield className="w-5 h-5" />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Search & Filter Bar */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div ref={searchContainerRef} className="relative w-full md:w-96">
              <div className="relative">
                <Search
                  className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${
                    isSearchFocused ? "text-emerald-600" : "text-slate-400"
                  }`}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => setIsSearchFocused(true)}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, rank, unit, or mobile..."
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all font-medium"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setIsSearchFocused(false);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 rounded-full hover:bg-slate-200 transition-colors cursor-pointer"
                    title="Clear Search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>  

              {/* Floating Instant Match Dropdown */}
              {showSearchDropdown && (
                <div className="absolute z-50 left-0 top-full mt-2 w-full sm:w-[460px] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                  {/* Dropdown Header Bar */}
                  <div className="flex items-center justify-between px-3.5 py-2 bg-slate-50/90 border-b border-slate-100 text-[11px]">
                    <span className="font-semibold text-slate-500 flex items-center gap-1.5">
                      Instant String Match
                    </span>
                    <span className="font-bold text-slate-700 font-mono text-[10px] bg-white px-2 py-0.5 rounded-full border border-slate-200">
                      {totalMatches} {totalMatches === 1 ? "match" : "matches"}
                    </span>
                  </div>

                  <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 p-2 space-y-2">
                    {/* Matching Stored Roster Personnel */}
                    {filteredPersonnel.length > 0 ? (
                      <div>
                        <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 bg-slate-50/80 rounded-md mb-1.5 flex items-center justify-between">
                          <span>STORED MEMBERS ({filteredPersonnel.length})</span>
                          <span className="text-[9px] font-normal normal-case text-slate-500">Tap to filter</span>
                        </div>
                        <div className="space-y-1">
                          {filteredPersonnel.slice(0, 8).map((person) => {
                            const badge = getRankBadgeStyle(person.rank);
                            return (
                              <button
                                key={person._id}
                                type="button"
                                onClick={() => {
                                  setSearchQuery(`${person.firstName} ${person.lastName}`);
                                  setIsSearchFocused(false);
                                }}
                                className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-emerald-50/50 hover:border-emerald-200 border border-transparent transition-all text-left cursor-pointer group"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold border font-mono shrink-0 ${badge.bg} ${badge.text} ${badge.border}`}
                                  >
                                    <HighlightMatch text={person.rank} query={searchQuery} />
                                  </span>
                                  <div className="truncate">
                                    <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-950 truncate">
                                      <HighlightMatch
                                        text={`${person.firstName} ${person.lastName}`}
                                        query={searchQuery}
                                      />
                                    </div>
                                    <div className="text-[10px] text-slate-500 truncate flex items-center gap-1.5">
                                      <span>
                                        <HighlightMatch
                                          text={formatPhMobileDisplay(person.mobileNumber)}
                                          query={searchQuery}
                                        />
                                      </span>
                                      <span>•</span>
                                      <span>
                                        <HighlightMatch text={person.unit} query={searchQuery} />
                                      </span>
                                      <span>•</span>
                                      <span className="text-slate-400">
                                        {(person as any).updatedBy
                                          ? `Last edited by: ${(person as any).updatedBy}`
                                          : `Added by: ${(person as any).createdBy || "Command"}`}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                                    {person.groupName}
                                  </span>
                                  <span
                                    className={`w-2 h-2 rounded-full ${
                                      person.status === "ACTIVE" ? "bg-emerald-500" : "bg-slate-300"
                                    }`}
                                    title={person.status}
                                  />
                                </div>
                              </button>
                            );
                          })}
                          {filteredPersonnel.length > 8 && (
                            <div className="text-center py-1 text-[10px] text-slate-400 font-semibold">
                              +{filteredPersonnel.length - 8} more matching members in table below
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="py-8 text-center text-xs text-slate-400">
                        <p>No registered members found matching</p>
                        <p className="font-bold text-slate-700 mt-1">"{searchQuery}"</p>
                        <p className="text-[11px] text-slate-400 mt-2">
                          Try searching by member name, mobile number, unit, or assigned group.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

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
                {groupsList.map((g) => (
                  <option key={g._id} value={g._id}>
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

          {/* Personnel Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {isLoadingPersonnel ? (
              <TableSkeleton rows={8} cols={6} />
            ) : filteredPersonnel.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-semibold text-slate-700">No personnel found</p>
                <p className="text-xs text-slate-400 mt-1">Try changing your search query or generate an enlistment link to onboard troops.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4 sm:px-6">Name & Rank</th>
                      <th className="py-3.5 px-4">Mobile Number</th>
                      <th className="py-3.5 px-4">Unit / CDC</th>
                      <th className="py-3.5 px-4">Group</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right pr-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {filteredPersonnel.map((person) => {
                      const badge = getRankBadgeStyle(person.rank);
                      return (
                      <tr key={person._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 sm:px-6 font-bold text-slate-900">
                          <div className="flex items-center gap-2.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold font-mono border ${badge.bg} ${badge.text} ${badge.border}`}>
                              <HighlightMatch text={person.rank} query={searchQuery} />
                            </span>
                            <div>
                              <span>
                                <HighlightMatch text={`${person.firstName} ${person.lastName}`} query={searchQuery} />
                              </span>
                              <span className="block text-[10px] font-normal text-slate-400 font-mono">
                                <HighlightMatch text={getRankFullName(person.rank)} query={searchQuery} />
                              </span>
                              {(person as any).updatedBy ? (
                                <span className="block text-[10px] text-slate-500 font-medium mt-0.5">
                                  Last edited by: <strong className="text-slate-700 font-semibold">{(person as any).updatedBy}</strong>
                                  {(person as any).updatedAt ? <span className="text-slate-400 font-mono font-normal"> · {(person as any).updatedAt}</span> : null}
                                </span>
                              ) : (person as any).createdBy ? (
                                <span className="block text-[10px] text-slate-500 font-medium mt-0.5">
                                  Added by: <strong className="text-slate-700 font-semibold">{(person as any).createdBy}</strong>
                                </span>
                              ) : (
                                <span className="block text-[10px] text-slate-400 mt-0.5">
                                  Added by: <span className="text-slate-500 font-medium">Command</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                          <HighlightMatch text={formatPhMobileDisplay(person.mobileNumber)} query={searchQuery} />
                        </td>

                        <td className="py-3.5 px-4 font-medium text-slate-600">
                          <HighlightMatch text={person.unit} query={searchQuery} />
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {person.groupName}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => handleInitiateToggleStatus(person)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                              person.status === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                                : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                            }`}
                            title={`Click to change status to ${person.status === "ACTIVE" ? "Inactive" : "Active"}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${person.status === "ACTIVE" ? "bg-emerald-600" : "bg-slate-400"}`} />
                            {person.status}
                          </button>
                        </td>

                        <td className="py-3.5 px-4 text-right pr-6">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditModal(person)}
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                              title="Edit Member"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(person._id)}
                              className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Delete Member"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
      {/* TAB 2: ENLISTMENT PORTALS & APPROVAL QUEUE */}
      {/* ========================================================= */}
      {activeTab === "ENLISTMENT" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Active Campaigns Row */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-amber-600" />
                <span>Active Enlistment Campaigns</span>
              </h3>
              <span className="text-xs text-slate-500 font-mono">
                {campaignsList.length} Total Campaigns Created
              </span>
            </div>

            {isLoadingCampaigns ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <CampaignCardSkeleton />
                <CampaignCardSkeleton />
                <CampaignCardSkeleton />
              </div>
            ) : campaignsList.length === 0 ? (
              <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center space-y-2">
                <Link2 className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-bold text-slate-700">No Enlistment Links Active</p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Click "Generate Enlistment Link" to create a time-limited, passcode-protected portal for troop registration.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {campaignsList.map((camp) => (
                  <div
                    key={camp._id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                      camp.isExpired
                        ? "bg-slate-50/80 border-slate-200 opacity-75"
                        : "bg-white border-amber-200/80 shadow-xs hover:border-amber-400"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {camp.targetUnit}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900 mt-1 line-clamp-1">
                            {camp.title}
                          </h4>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase font-mono ${
                            camp.isExpired
                              ? "bg-slate-200 text-slate-600"
                              : "bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse"
                          }`}
                        >
                          {camp.isExpired ? "Closed" : "Live"}
                        </span>
                      </div>

                      {/* Passcode & Live Expiry Info */}
                      <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 flex items-center gap-1 font-mono text-[10px]">
                            <KeyRound className="w-3 h-3 text-amber-600" />
                            Passcode:
                          </span>
                          <span className="font-mono font-bold text-slate-900">{camp.passcode}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 flex items-center gap-1 font-mono text-[10px]">
                            <Clock className="w-3 h-3 text-slate-500" />
                            Window Config:
                          </span>
                          <span className="font-mono text-slate-700">{camp.duration}</span>
                        </div>
                        <CampaignLiveTimer
                          expiresAt={camp.expiresAt}
                          isExpired={camp.isExpired}
                          duration={camp.duration}
                        />
                        <div className="flex items-center justify-between pt-0.5 border-t border-slate-200/60">
                          <span className="text-slate-500 text-[10px]">Submissions:</span>
                          <span className="font-bold text-emerald-700">
                            {camp.totalSubmissions} ({camp.pendingCount} pending)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() =>
                          setShareModalData({
                            title: camp.title,
                            campaignCode: camp.campaignCode,
                            passcode: camp.passcode,
                            targetUnit: camp.targetUnit,
                            duration: camp.duration,
                            expiresAt: camp.expiresAt,
                          })
                        }
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-950 font-bold text-xs rounded-xl border border-amber-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5 text-amber-700" />
                        <span>Share / QR</span>
                      </button>

                      <div className="flex items-center gap-1">
                        {!camp.isExpired && (
                          <button
                            type="button"
                            onClick={() => handleCloseCampaign(camp._id)}
                            className="px-2.5 py-1.5 hover:bg-amber-50 text-slate-500 hover:text-amber-800 font-bold text-[11px] rounded-xl transition-colors cursor-pointer"
                          >
                            Close Early
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveCampaign(camp._id)}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                          title="Delete Campaign"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Submissions Queue */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-emerald-700" />
                  <span>Enlistment Submissions Queue</span>
                  {pendingSubmissions.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-mono font-bold">
                      {pendingSubmissions.length} Awaiting Clearance
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review registrants and promote them to the active SMS broadcast directory.
                </p>
              </div>

              {pendingSubmissions.length > 0 && (
                <button
                  type="button"
                  onClick={handleBulkApprove}
                  disabled={isBulkApproving}
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isBulkApproving
                      ? "Approving..."
                      : selectedSubmissionIds.length > 0
                      ? `Approve Selected (${selectedSubmissionIds.length})`
                      : `Bulk Approve All (${pendingSubmissions.length})`}
                  </span>
                </button>
              )}
            </div>

            {/* Submissions Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              {isLoadingSubmissions ? (
                <TableSkeleton rows={4} cols={5} />
              ) : submissionsList.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <UserPlus className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-bold text-slate-700">No Enlistment Submissions Yet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Share your enlistment links in unit Viber / Messenger groups to start gathering numbers.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={
                              pendingSubmissions.length > 0 &&
                              selectedSubmissionIds.length === pendingSubmissions.length
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSubmissionIds(pendingSubmissions.map((s) => s._id));
                              } else {
                                setSelectedSubmissionIds([]);
                              }
                            }}
                            className="rounded text-emerald-700 focus:ring-emerald-600 cursor-pointer"
                          />
                        </th>
                        <th className="py-3 px-4">Soldier & Rank</th>
                        <th className="py-3 px-4">Mobile Number</th>
                        <th className="py-3 px-4">Assigned Unit</th>
                        <th className="py-3 px-4">Batch Code</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right pr-6">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                      {submissionsList.map((sub) => {
                        const isSelected = selectedSubmissionIds.includes(sub._id);
                        return (
                          <tr
                            key={sub._id}
                            className={`transition-colors ${
                              sub.status === "PENDING"
                                ? "bg-white hover:bg-amber-50/50"
                                : "bg-slate-50/40 opacity-75"
                            }`}
                          >
                            <td className="py-3 px-4 text-center">
                              {sub.status === "PENDING" && (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedSubmissionIds((prev) => [...prev, sub._id]);
                                    } else {
                                      setSelectedSubmissionIds((prev) =>
                                        prev.filter((id) => id !== sub._id)
                                      );
                                    }
                                  }}
                                  className="rounded text-emerald-700 focus:ring-emerald-600 cursor-pointer"
                                />
                              )}
                            </td>

                            <td className="py-3 px-4 font-bold text-slate-900">
                              <div className="flex items-center gap-2">
                                <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold font-mono border ${getRankBadgeStyle(sub.rank)}`}>
                                  {sub.rank}
                                </span>
                                <span>{sub.firstName} {sub.lastName}</span>
                              </div>
                            </td>

                            <td className="py-3 px-4 font-mono font-bold text-slate-800">
                              {formatPhMobileDisplay(sub.mobileNumber)}
                            </td>

                            <td className="py-3 px-4 font-medium text-slate-600">
                              {sub.unit}
                            </td>

                            <td className="py-3 px-4 font-mono text-[11px] text-amber-700">
                              {sub.campaignCode}
                            </td>

                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase font-mono ${
                                  sub.status === "APPROVED"
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                    : sub.status === "REJECTED"
                                    ? "bg-red-100 text-red-800 border border-red-300"
                                    : "bg-amber-100 text-amber-900 border border-amber-300 font-bold"
                                }`}
                              >
                                {sub.status}
                              </span>
                              {sub.status === "APPROVED" && sub.reviewedBy && (
                                <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                                  Approved by: <strong className="text-slate-700 font-semibold">{sub.reviewedBy}</strong>
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-4 text-right pr-6">
                              {sub.status === "PENDING" ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleSingleApprove(sub._id)}
                                    className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                                    title="Approve and Add to Personnel"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSingleReject(sub._id)}
                                    className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                                    title="Reject Submission"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-mono">Processed</span>
                              )}
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
        </div>
      )}

      {/* ========================================================= */}
      {/* CAMPAIGN GENERATOR MODAL */}
      {/* ========================================================= */}
      {isCampaignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[92dvh]">
            <div className="p-4 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                  <Link2 className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Generate Enlistment Link & QR
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Create a customized time-limited self-registration portal.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCampaignModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs text-slate-700">
              {/* Custom Campaign Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Custom Campaign Title <span className="text-amber-700">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1001st CDC Annual Mobilization Roster"
                  value={campaignFormData.title}
                  onChange={(e) =>
                    setCampaignFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white font-medium shadow-2xs"
                />
              </div>

              {/* Custom Guidance Instructions */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Instructions for Soldiers (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Please submit your active WhatsApp/SMS number for mandatory mobilization alerts."
                  value={campaignFormData.instructions}
                  onChange={(e) =>
                    setCampaignFormData((prev) => ({ ...prev, instructions: e.target.value }))
                  }
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white font-medium resize-none shadow-2xs"
                />
              </div>

              {/* Assign to SMS Group */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Assign to SMS Group
                </label>
                <select
                  value={campaignFormData.groupId}
                  onChange={(e) => {
                    const selectedVal = e.target.value;
                    const grp = groupsList.find((g) => g._id === selectedVal);
                    setCampaignFormData((prev) => ({
                      ...prev,
                      groupId: selectedVal,
                      groupName: grp ? grp.name : "All 10RCDG Personnel",
                    }));
                  }}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white font-medium cursor-pointer shadow-2xs"
                >
                  <option value="">All 10RCDG Personnel (General Roster)</option>
                  {groupsList.map((g) => (
                    <option key={g._id} value={g._id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Unit Security Passcode */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Unit Security Passcode <span className="text-amber-700">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateRandomPasscode}
                    className="text-[11px] font-bold text-amber-800 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Generate Random Key</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. 10RCDG-RESCOM"
                    value={campaignFormData.passcode}
                    onChange={(e) =>
                      setCampaignFormData((prev) => ({
                        ...prev,
                        passcode: e.target.value.toUpperCase(),
                      }))
                    }
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold tracking-wider text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white shadow-2xs"
                  />
                  <KeyRound className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Soldiers must input this exact key on their mobile phone to unlock the registration form.
                </p>
              </div>

              {/* Duration Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Registration Window Duration
                </label>
                <select
                  value={campaignFormData.durationPreset}
                  onChange={(e) =>
                    setCampaignFormData((prev) => ({ ...prev, durationPreset: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white font-medium cursor-pointer"
                >
                  <option value="1 Hour">1 Hour</option>
                  <option value="6 Hours">6 Hours</option>
                  <option value="12 Hours">12 Hours</option>
                  <option value="24 Hours">24 Hours (1 Day)</option>
                  <option value="3 Days">3 Days</option>
                  <option value="7 Days">7 Days (1 Week)</option>
                  <option value="14 Days">14 Days</option>
                  <option value="30 Days">30 Days</option>
                  <option value="Custom Duration">Custom Duration (Specify Below)</option>
                </select>

                {campaignFormData.durationPreset === "Custom Duration" && (() => {
                  const preview = getDurationPreview(campaignFormData.customDuration);
                  return (
                    <div className="mt-2.5 space-y-2.5 animate-in fade-in duration-150">
                      <input
                        type="text"
                        required
                        placeholder="e.g. 1 Hour, 30 Minutes, 45 Days, 3 Months, 2w..."
                        value={campaignFormData.customDuration}
                        onChange={(e) =>
                          setCampaignFormData((prev) => ({
                            ...prev,
                            customDuration: e.target.value,
                          }))
                        }
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white font-medium shadow-2xs"
                      />
                      {/* Quick duration preset suggestion chips */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mr-1">Quick Select:</span>
                        {["1 Hour", "2 Hours", "12 Hours", "45 Days", "60 Days", "3 Months"].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() =>
                              setCampaignFormData((prev) => ({
                                ...prev,
                                customDuration: preset,
                              }))
                            }
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                              campaignFormData.customDuration === preset
                                ? "bg-amber-100 text-amber-950 border-amber-300 ring-1 ring-amber-300"
                                : "bg-slate-100/80 hover:bg-slate-200 text-slate-700 border-slate-200"
                            }`}
                          >
                            +{preset}
                          </button>
                        ))}
                      </div>

                      {/* Live Smart Auto-Correction & Expiry Preview */}
                      {preview.type === "valid" && (
                        <div className="p-2.5 rounded-xl bg-emerald-50/90 border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2 animate-in fade-in duration-150 shadow-2xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <div className="font-bold flex items-center gap-1.5 flex-wrap text-emerald-900">
                              <span>Window closes in:</span>
                              <span className="px-1.5 py-0.2 bg-emerald-200/80 text-emerald-950 rounded text-[10px] font-mono font-extrabold">
                                {preview.normalizedLabel}
                              </span>
                            </div>
                            <div className="text-[10.5px] text-emerald-700 font-mono mt-0.5">
                              Exact Auto-Close: {preview.expiryDateFormatted}
                            </div>
                          </div>
                        </div>
                      )}

                      {preview.type === "unrecognized" && campaignFormData.customDuration.trim().length > 0 && (
                        <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-300 text-xs text-amber-950 flex items-start gap-2 animate-in fade-in duration-150">
                          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                          <div className="text-[11px] leading-relaxed">
                            <span className="font-bold text-amber-900">Custom Text Format:</span> Will default to 24 Hours. For custom duration, pick a quick select chip above or type e.g. <code className="bg-amber-200/60 px-1 py-0.5 rounded font-mono font-bold text-[10px]">2 Weeks</code>, <code className="bg-amber-200/60 px-1 py-0.5 rounded font-mono font-bold text-[10px]">45 Days</code>, or <code className="bg-amber-200/60 px-1 py-0.5 rounded font-mono font-bold text-[10px]">1 Hour</code>.
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="p-3 sm:px-6 sm:py-3.5 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-2.5 mt-4">
                <button
                  type="button"
                  onClick={() => setIsCampaignModalOpen(false)}
                  disabled={isCreatingCampaign}
                  className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingCampaign}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Link2 className="w-4 h-4" />
                  <span>{isCreatingCampaign ? "Generating..." : "Create Link & QR"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Single Add/Edit Member Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold">
                  {editingId ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    {editingId ? "Edit Personnel Record" : "Add Single Personnel"}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {editingId ? "Update soldier info" : "Register a single officer or enlisted troop"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePersonnel} className="p-4 sm:p-6 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Military Rank *
                </label>
                <RankSearchSelect
                  value={formData.rank}
                  onChange={(val) => setFormData({ ...formData, rank: val })}
                  required
                />
              </div>

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
                    placeholder="e.g. Juan"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600 focus:bg-white"
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
                    placeholder="e.g. Dela Cruz"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.mobileNumber}
                  onChange={(e) => {
                    const val = sanitizePhMobileInput(e.target.value);
                    setFormData({ ...formData, mobileNumber: val });
                    if (phoneError) setPhoneError(null);
                  }}
                  placeholder="09171234567"
                  className={`w-full px-3 py-2 font-mono bg-slate-50 border rounded-xl text-xs focus:outline-none focus:bg-white ${
                    phoneError ? "border-red-500" : "border-slate-200 focus:border-emerald-600"
                  }`}
                />
                {phoneError && <p className="text-[11px] text-red-600 mt-1">{phoneError}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Assigned Group *
                  </label>
                  <select
                    value={formData.groupId}
                    onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600"
                  >
                    <option value="">All 10RCDG Personnel (General Roster)</option>
                    {groupsList.map((g) => (
                      <option key={g._id} value={g._id}>
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
                    placeholder="e.g. 1001st CDC"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-700 disabled:bg-slate-400 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  {isSaving ? "Saving..." : editingId ? "Save Changes" : "Register Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Toggle Confirmation Modal */}
      {statusConfirmTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                    statusConfirmTarget.status === "ACTIVE"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}
                >
                  {statusConfirmTarget.status === "ACTIVE" ? (
                    <UserX className="w-5 h-5" />
                  ) : (
                    <UserCheck className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {statusConfirmTarget.status === "ACTIVE"
                      ? "Set Member to Inactive?"
                      : "Reactivate Member to Active?"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {statusConfirmTarget.status === "ACTIVE"
                      ? "Exclude troop from SMS broadcasts"
                      : "Restore troop to emergency broadcasts"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStatusConfirmTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 text-xs">
              {/* Member Card Summary */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold font-mono border ${getRankBadgeStyle(
                        statusConfirmTarget.rank
                      )}`}
                    >
                      {statusConfirmTarget.rank}
                    </span>
                    <span className="font-bold text-slate-900 text-sm">
                      {statusConfirmTarget.firstName} {statusConfirmTarget.lastName}
                    </span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      statusConfirmTarget.status === "ACTIVE"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        statusConfirmTarget.status === "ACTIVE"
                          ? "bg-emerald-600"
                          : "bg-slate-400"
                      }`}
                    />
                    Current: {statusConfirmTarget.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-slate-200/80 font-mono">
                  <div>
                    <span className="text-slate-400 text-[10px] block font-sans">Mobile:</span>
                    <span className="font-bold text-slate-800">
                      {formatPhMobileDisplay(statusConfirmTarget.mobileNumber)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-sans">Unit / Station:</span>
                    <span className="font-medium text-slate-700 truncate block">
                      {statusConfirmTarget.unit}
                    </span>
                  </div>
                </div>
              </div>

              {/* Warning / Explanation Notice */}
              {statusConfirmTarget.status === "ACTIVE" ? (
                <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5 text-xs text-amber-950">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Emergency Alert Exclusion Notice</span>
                  </div>
                  <p className="text-[11px] text-amber-900 leading-relaxed font-semibold">
                    Are you sure you want to set this member to Inactive?
                  </p>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    This troop will be immediately excluded from incoming unit SMS broadcasts, red alerts, and mobilization orders. Their record remains saved on file and can be reactivated anytime.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-900 space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5 text-xs text-emerald-950">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>Restore Emergency Broadcasts</span>
                  </div>
                  <p className="text-[11px] text-emerald-900 leading-relaxed font-semibold">
                    Are you sure you want to restore this member to Active?
                  </p>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    This member will immediately start receiving all unit SMS alerts and mobilization broadcasts for <strong>{statusConfirmTarget.groupName}</strong>.
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isTogglingStatus}
                onClick={() => setStatusConfirmTarget(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                {statusConfirmTarget.status === "ACTIVE" ? "Keep Active" : "Cancel"}
              </button>
              <button
                type="button"
                disabled={isTogglingStatus}
                onClick={handleConfirmToggleStatus}
                className={`px-4 py-2 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                  statusConfirmTarget.status === "ACTIVE"
                    ? "bg-amber-700 hover:bg-amber-600 active:scale-95"
                    : "bg-emerald-800 hover:bg-emerald-700 active:scale-95"
                }`}
              >
                {isTogglingStatus ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : statusConfirmTarget.status === "ACTIVE" ? (
                  <>
                    <UserX className="w-3.5 h-3.5" />
                    <span>Set to Inactive</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Reactivate Member</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share / QR Code Modal */}
      <EnlistmentShareModal
        isOpen={!!shareModalData}
        onClose={() => setShareModalData(null)}
        campaign={shareModalData}
      />
    </div>
  );
}
