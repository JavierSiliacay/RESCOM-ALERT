"use client";

import { useState, useEffect, useRef, useMemo } from "react";
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
  Copy,
  Smartphone,
  Download,
  ArrowRight,
  Lock,
  ShieldAlert,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
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
import { AndroidIcon, KeypadPhoneIcon } from "@/components/device-icons";
import { TablePagination } from "@/components/table-pagination";

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
  const { isViewer, guardAction, isGlobalAdmin, isScopedAdmin, isGroupAuthorized } = currentOfficer;
  const personnel = useQuery(api.personnel.list);
  const groups = useQuery(api.groups.list);
  const campaigns = useQuery(api.enlistment.listCampaigns);
  const submissions = useQuery(api.enlistment.listSubmissions, {});

  const createPersonnel = useMutation(api.personnel.create);
  const updatePersonnel = useMutation(api.personnel.update);
  const setDeviceType = useMutation(api.personnel.setDeviceType);
  const batchSetDeviceType = useMutation(api.personnel.batchSetDeviceType);
  const togglePersonnelStatus = useMutation(api.personnel.toggleStatus);
  const removePersonnel = useMutation(api.personnel.remove);

  // Device Pairing Mutations
  const linkDevice = useMutation(api.personnel.linkDevice);
  const unlinkDevice = useMutation(api.personnel.unlinkDevice);
  const batchLinkDevices = useMutation(api.personnel.batchLinkDevices);
  const batchUnlinkDevices = useMutation(api.personnel.batchUnlinkDevices);

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
  const [selectedDevice, setSelectedDevice] = useState<"ALL" | "PAIRED" | "UNPAIRED" | "ANDROID" | "KEYPAD">("ALL");

  // Selected Personnel for Batch Actions
  const [selectedPersonnelIds, setSelectedPersonnelIds] = useState<Id<"personnel">[]>([]);
  const [isBatchUpdatingDevice, setIsBatchUpdatingDevice] = useState(false);

  // Single Device Pairing Modal State
  const [devicePairingTarget, setDevicePairingTarget] = useState<(typeof rawPersonnelList)[number] | null>(null);
  const [customDeviceModel, setCustomDeviceModel] = useState("Samsung Galaxy A54");
  const [customFcmToken, setCustomFcmToken] = useState("");
  const [isPairingDevice, setIsPairingDevice] = useState(false);
  const [activePairingTab, setActivePairingTab] = useState<"DIRECT" | "QR">("DIRECT");
  const [copiedPairLink, setCopiedPairLink] = useState(false);

  // Batch Device Pairing Modal State
  const [isBatchPairModalOpen, setIsBatchPairModalOpen] = useState(false);
  const [batchDeviceModel, setBatchDeviceModel] = useState("Android Device (Bulk Provisioned)");
  const [isBatchPairing, setIsBatchPairing] = useState(false);

  // Manual Add/Edit Personnel Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"personnel"> | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Status Toggle Confirmation Modal State
  const [statusConfirmTarget, setStatusConfirmTarget] = useState<(typeof rawPersonnelList)[number] | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  // Device Capability Confirmation Modal State (Prevents misclick / accidental tagging)
  const [deviceConfirmTarget, setDeviceConfirmTarget] = useState<{
    mode: "BATCH" | "SINGLE";
    targetDevice: "ANDROID" | "KEYPAD";
    person?: (typeof rawPersonnelList)[number];
    ids?: Id<"personnel">[];
    count: number;
  } | null>(null);
  const [isUpdatingDevice, setIsUpdatingDevice] = useState(false);

  // Device Unpair Confirmation Modal State (Prevents accidental unlinking)
  const [unlinkConfirmTarget, setUnlinkConfirmTarget] = useState<{
    soldier: (typeof rawPersonnelList)[number];
    reason: string;
  } | null>(null);
  const [batchUnlinkConfirmOpen, setBatchUnlinkConfirmOpen] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    rank: "PVT",
    mobileNumber: "09",
    groupId: "",
    unit: "10RCDG HQ",
    email: "",
    deviceType: "ANDROID" as "ANDROID" | "KEYPAD" | "IOS",
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

  const rawPersonnelList = personnel || [];
  const rawGroupsList = groups || [];
  const rawCampaignsList = campaigns || [];
  const submissionsList = submissions || [];

  const personnelList = useMemo(() => {
    if (isGlobalAdmin) return rawPersonnelList;
    return rawPersonnelList.filter((p) => isGroupAuthorized(p.groupName));
  }, [rawPersonnelList, isGlobalAdmin, isGroupAuthorized]);

  const groupsList = useMemo(() => {
    if (isGlobalAdmin) return rawGroupsList;
    return rawGroupsList.filter((g) => isGroupAuthorized(g.name));
  }, [rawGroupsList, isGlobalAdmin, isGroupAuthorized]);

  const campaignsList = useMemo(() => {
    if (isGlobalAdmin) return rawCampaignsList;
    return rawCampaignsList.filter((c) => isGroupAuthorized(c.groupName));
  }, [rawCampaignsList, isGlobalAdmin, isGroupAuthorized]);

  // Campaign Protection, Deletion, and Close Early Modals
  const [campaignProtectionTarget, setCampaignProtectionTarget] = useState<(typeof rawCampaignsList)[number] | null>(null);
  const [campaignDeleteTarget, setCampaignDeleteTarget] = useState<(typeof rawCampaignsList)[number] | null>(null);
  const [campaignCloseEarlyTarget, setCampaignCloseEarlyTarget] = useState<(typeof rawCampaignsList)[number] | null>(null);
  const [isDeletingCampaign, setIsDeletingCampaign] = useState(false);
  const [isClosingCampaign, setIsClosingCampaign] = useState(false);
  const [campaignActionError, setCampaignActionError] = useState<string | null>(null);

  const pendingSubmissions = submissionsList.filter((s) => s.status === "PENDING");

  const androidCount = useMemo(() => {
    return personnelList.filter((p) => ((p as any).deviceType || "ANDROID") === "ANDROID").length;
  }, [personnelList]);

  const keypadCount = useMemo(() => {
    return personnelList.filter((p) => (p as any).deviceType === "KEYPAD").length;
  }, [personnelList]);

  const pairedAppCount = useMemo(() => {
    return personnelList.filter((p) => Boolean((p as any).fcmToken)).length;
  }, [personnelList]);

  const unpairedCount = useMemo(() => {
    return personnelList.length - pairedAppCount;
  }, [personnelList, pairedAppCount]);

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
    const isPaired = Boolean((person as any).fcmToken);
    const personDevice = (person as any).deviceType || "ANDROID";
    let matchesDevice = true;
    if (selectedDevice === "PAIRED") {
      matchesDevice = isPaired;
    } else if (selectedDevice === "UNPAIRED") {
      matchesDevice = !isPaired;
    } else if (selectedDevice === "ANDROID") {
      matchesDevice = personDevice === "ANDROID";
    } else if (selectedDevice === "KEYPAD") {
      matchesDevice = personDevice === "KEYPAD";
    }
    if (!matchesDevice) return false;

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

  // Personnel Table Pagination State
  const [personnelPage, setPersonnelPage] = useState(1);
  const [personnelPageSize, setPersonnelPageSize] = useState(25);

  // Auto-reset personnel page when filters change
  useEffect(() => {
    setPersonnelPage(1);
  }, [searchQuery, selectedGroup, selectedStatus, selectedDevice]);

  // Paginated Personnel Slice
  const paginatedPersonnel = useMemo(() => {
    const start = (personnelPage - 1) * personnelPageSize;
    return filteredPersonnel.slice(start, start + personnelPageSize);
  }, [filteredPersonnel, personnelPage, personnelPageSize]);

  // Submissions Queue Filter & Pagination State
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");
  const [submissionsPage, setSubmissionsPage] = useState(1);
  const [submissionsPageSize, setSubmissionsPageSize] = useState(20);

  // Filtered Submissions List
  const filteredSubmissions = useMemo(() => {
    if (submissionStatusFilter === "ALL") return submissionsList;
    return submissionsList.filter((s) => s.status === submissionStatusFilter);
  }, [submissionsList, submissionStatusFilter]);

  // Auto-reset submissions page when filter changes
  useEffect(() => {
    setSubmissionsPage(1);
  }, [submissionStatusFilter]);

  // Paginated Submissions Slice
  const paginatedSubmissions = useMemo(() => {
    const start = (submissionsPage - 1) * submissionsPageSize;
    return filteredSubmissions.slice(start, start + submissionsPageSize);
  }, [filteredSubmissions, submissionsPage, submissionsPageSize]);

  const pendingOnPage = useMemo(() => {
    return paginatedSubmissions.filter((s) => s.status === "PENDING");
  }, [paginatedSubmissions]);

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
        deviceType: "ANDROID",
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
        deviceType: (person as any).deviceType || "ANDROID",
      });
      setIsAddModalOpen(true);
    });
  };

  const handleInitiateToggleDevice = (person: (typeof personnelList)[number]) => {
    guardAction("toggle personnel device type", () => {
      const current = (person as any).deviceType || "ANDROID";
      const next = current === "ANDROID" ? "KEYPAD" : "ANDROID";
      setDeviceConfirmTarget({
        mode: "SINGLE",
        targetDevice: next,
        person,
        count: 1,
      });
    });
  };

  const handleInitiateBatchSetDevice = (type: "ANDROID" | "KEYPAD") => {
    if (selectedPersonnelIds.length === 0) return;
    guardAction(`set ${selectedPersonnelIds.length} soldiers to ${type}`, () => {
      setDeviceConfirmTarget({
        mode: "BATCH",
        targetDevice: type,
        ids: [...selectedPersonnelIds],
        count: selectedPersonnelIds.length,
      });
    });
  };

  const handleConfirmDeviceChange = async () => {
    if (!deviceConfirmTarget) return;
    setIsUpdatingDevice(true);
    try {
      if (deviceConfirmTarget.mode === "SINGLE" && deviceConfirmTarget.person) {
        await setDeviceType({
          id: deviceConfirmTarget.person._id,
          deviceType: deviceConfirmTarget.targetDevice,
          officerEmail: currentOfficer.email,
        });
      } else if (deviceConfirmTarget.mode === "BATCH" && deviceConfirmTarget.ids) {
        await batchSetDeviceType({
          ids: deviceConfirmTarget.ids,
          deviceType: deviceConfirmTarget.targetDevice,
          officerEmail: currentOfficer.email,
        });
        setSelectedPersonnelIds([]);
      }
      setDeviceConfirmTarget(null);
    } catch (err: any) {
      alert(err?.message || "Failed to update device capability");
    } finally {
      setIsUpdatingDevice(false);
    }
  };

  // Single Device Pairing Handlers
  const handleOpenPairModal = (person: (typeof rawPersonnelList)[number]) => {
    guardAction("manage device pairing", () => {
      setDevicePairingTarget(person);
      setCustomDeviceModel(person.deviceModel || "Samsung Galaxy A54");
      setCustomFcmToken(person.fcmToken || "");
      setActivePairingTab("DIRECT");
      setCopiedPairLink(false);
    });
  };

  const handleConfirmPairDevice = async () => {
    if (!devicePairingTarget) return;
    if (isViewer) {
      guardAction("pair soldier device");
      return;
    }
    setIsPairingDevice(true);
    try {
      await linkDevice({
        soldierId: devicePairingTarget._id,
        deviceModel: customDeviceModel.trim() || "Android Device",
        fcmToken: customFcmToken.trim() || undefined,
        officerEmail: currentOfficer.email,
      });
      setDevicePairingTarget(null);
    } catch (err: any) {
      alert(err?.message || "Failed to pair device");
    } finally {
      setIsPairingDevice(false);
    }
  };

  const handleSingleUnlinkDevice = (
    soldierId: Id<"personnel">,
    reason: string = "Phone Damaged / Replacement Transfer"
  ) => {
    if (isViewer) {
      guardAction("unlink soldier device");
      return;
    }
    const target = devicePairingTarget || rawPersonnelList.find((p) => p._id === soldierId);
    if (!target) return;
    setUnlinkConfirmTarget({
      soldier: target,
      reason,
    });
  };

  const handleConfirmExecuteUnlink = async () => {
    if (!unlinkConfirmTarget) return;
    const { soldier, reason } = unlinkConfirmTarget;
    const soldierName = `${soldier.rank} ${soldier.firstName} ${soldier.lastName}`;
    const currentPhone =
      (soldier as any)?.deviceModel ||
      (soldier as any)?.lastDownloadedDeviceModel ||
      "Authorized Android Device";

    setIsPairingDevice(true);
    try {
      await unlinkDevice({
        soldierId: soldier._id,
        reason,
        officerName: currentOfficer.name,
        officerEmail: currentOfficer.email,
      });
      setUnlinkConfirmTarget(null);
      setDevicePairingTarget(null);
      alert(
        `Device unlinked successfully.\n\nOld device (${currentPhone}) revoked.\nTo link their replacement phone, have ${soldierName} scan their authorized Command QR Code.`
      );
    } catch (err: any) {
      alert(err?.message || "Failed to unlink device");
    } finally {
      setIsPairingDevice(false);
    }
  };

  // Batch Device Pairing Handlers
  const handleInitiateBatchPair = () => {
    if (selectedPersonnelIds.length === 0) return;
    guardAction(`batch pair ${selectedPersonnelIds.length} devices`, () => {
      setBatchDeviceModel("Android Device (Bulk Provisioned)");
      setIsBatchPairModalOpen(true);
    });
  };

  const handleConfirmBatchPair = async () => {
    if (selectedPersonnelIds.length === 0) return;
    setIsBatchPairing(true);
    try {
      const res = await batchLinkDevices({
        soldierIds: selectedPersonnelIds,
        deviceModel: batchDeviceModel.trim() || "Android Device (Provisioned)",
        officerEmail: currentOfficer.email,
      });
      setIsBatchPairModalOpen(false);
      setSelectedPersonnelIds([]);
      alert(`Successfully paired RESCOM Alert App for ${res.count} soldiers!`);
    } catch (err: any) {
      alert(err?.message || "Failed to batch pair devices");
    } finally {
      setIsBatchPairing(false);
    }
  };

  const handleInitiateBatchUnlink = () => {
    if (selectedPersonnelIds.length === 0) return;
    guardAction(`batch unlink ${selectedPersonnelIds.length} devices`, () => {
      setBatchUnlinkConfirmOpen(true);
    });
  };

  const handleConfirmBatchUnlink = async () => {
    if (selectedPersonnelIds.length === 0) return;
    setIsBatchPairing(true);
    try {
      const res = await batchUnlinkDevices({
        soldierIds: selectedPersonnelIds,
        officerEmail: currentOfficer.email,
      });
      setBatchUnlinkConfirmOpen(false);
      setSelectedPersonnelIds([]);
      alert(`Unlinked devices for ${res.count} soldiers.`);
    } catch (err: any) {
      alert(err?.message || "Failed to batch unlink devices");
    } finally {
      setIsBatchPairing(false);
    }
  };

  const handleSelectAllPersonnel = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const pageIds = paginatedPersonnel.map((p) => p._id);
      const combined = Array.from(new Set([...selectedPersonnelIds, ...pageIds]));
      setSelectedPersonnelIds(combined);
    } else {
      const pageIds = new Set(paginatedPersonnel.map((p) => p._id));
      setSelectedPersonnelIds(selectedPersonnelIds.filter((id) => !pageIds.has(id)));
    }
  };

  const handleSelectAllFilteredPersonnel = () => {
    setSelectedPersonnelIds(filteredPersonnel.map((p) => p._id));
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
          deviceType: formData.deviceType,
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
          deviceType: formData.deviceType,
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

  const handleConfirmCloseCampaign = async (
    camp: (typeof rawCampaignsList)[number],
    thenUnlockDelete: boolean = false
  ) => {
    setIsClosingCampaign(true);
    setCampaignActionError(null);
    try {
      await closeCampaign({
        campaignId: camp._id,
        officerEmail: currentOfficer.email,
      });
      setCampaignCloseEarlyTarget(null);
      if (thenUnlockDelete) {
        setCampaignProtectionTarget(null);
        setCampaignDeleteTarget({
          ...camp,
          isExpired: true,
          status: "CLOSED",
        });
      }
    } catch (err: any) {
      setCampaignActionError(err?.message || "Failed to close campaign early");
    } finally {
      setIsClosingCampaign(false);
    }
  };

  const handleConfirmRemoveCampaign = async () => {
    if (!campaignDeleteTarget) return;
    setIsDeletingCampaign(true);
    setCampaignActionError(null);
    try {
      await removeCampaign({
        campaignId: campaignDeleteTarget._id,
        officerEmail: currentOfficer.email,
      });
      setCampaignDeleteTarget(null);
    } catch (err: any) {
      setCampaignActionError(err?.message || "Failed to delete campaign");
    } finally {
      setIsDeletingCampaign(false);
    }
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
                    <div className="flex items-center gap-1.5 mt-1.5 text-[10px] font-mono font-bold">
                      <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        <AndroidIcon className="w-2.5 h-2.5 text-[#3DDC84]" />
                        <span>{androidCount}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        <KeypadPhoneIcon className="w-2.5 h-2.5 text-slate-500" />
                        <span>{keypadCount}</span>
                      </span>
                    </div>
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

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto pb-1 md:pb-0">
              {/* Device Summary Ratio Badges */}
              <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px] shadow-2xs">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                  {pairedAppCount} Paired App ({Math.round((pairedAppCount / (personnelList.length || 1)) * 100)}%)
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[11px] shadow-2xs">
                  <Link2 className="w-3.5 h-3.5 text-amber-600" />
                  {unpairedCount} Unpaired
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 font-bold text-[11px] shadow-2xs">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  {keypadCount} Keypad
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 shrink-0">
                <Filter className="w-3.5 h-3.5" />
                <span>Filter:</span>
              </div>

              <select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-600 cursor-pointer"
              >
                <option value="ALL">All Devices ({personnelList.length})</option>
                <option value="PAIRED">Paired App ({pairedAppCount})</option>
                <option value="UNPAIRED">Unpaired ({unpairedCount})</option>
                <option value="ANDROID">Android ({androidCount})</option>
                <option value="KEYPAD">Keypad ({keypadCount})</option>
              </select>

              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-600 cursor-pointer"
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
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-600 cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active Only</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          {/* Floating / Sticky Batch Action Bar */}
          {selectedPersonnelIds.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold text-xs text-emerald-950">
                  {selectedPersonnelIds.length} Soldier{selectedPersonnelIds.length > 1 ? "s" : ""} Selected
                </span>
                <span className="text-[11px] text-emerald-700/80 font-medium">
                  • Rapid device pairing & tagging:
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleInitiateBatchPair}
                  disabled={isBatchPairing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition-colors cursor-pointer shadow-2xs"
                  title="Bulk provision RESCOM Alert App pairing for all selected soldiers"
                >
                  <Smartphone className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
                  <span>Batch Pair App ({selectedPersonnelIds.length})</span>
                </button>
                <button
                  type="button"
                  onClick={handleInitiateBatchUnlink}
                  disabled={isBatchPairing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-700 hover:bg-rose-800 text-white transition-colors cursor-pointer shadow-2xs"
                  title="Unlink devices for selected soldiers"
                >
                  <UserX className="w-3.5 h-3.5 text-rose-200 shrink-0" />
                  <span>Unlink ({selectedPersonnelIds.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleInitiateBatchSetDevice("ANDROID")}
                  disabled={isUpdatingDevice}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white transition-colors cursor-pointer shadow-2xs"
                >
                  <AndroidIcon className="w-3.5 h-3.5 text-white shrink-0" />
                  <span>Tag Android ({selectedPersonnelIds.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleInitiateBatchSetDevice("KEYPAD")}
                  disabled={isUpdatingDevice}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-600 hover:bg-slate-700 text-white transition-colors cursor-pointer shadow-2xs"
                >
                  <KeypadPhoneIcon className="w-3.5 h-3.5 text-slate-200 shrink-0" />
                  <span>Tag Keypad ({selectedPersonnelIds.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPersonnelIds([])}
                  className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  Deselect All
                </button>
              </div>
            </div>
          )}

          {/* Personnel Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {isLoadingPersonnel ? (
              <TableSkeleton rows={8} cols={7} />
            ) : filteredPersonnel.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-semibold text-slate-700">No personnel found</p>
                <p className="text-xs text-slate-400 mt-1">Try changing your search query or generate an enlistment link to onboard troops.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {selectedPersonnelIds.length > 0 && filteredPersonnel.length > paginatedPersonnel.length && (
                  <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 text-emerald-950 font-medium">
                    <span>
                      <strong className="font-bold text-emerald-900">{selectedPersonnelIds.length}</strong> troop{selectedPersonnelIds.length > 1 ? "s" : ""} selected.
                    </span>
                    {selectedPersonnelIds.length < filteredPersonnel.length ? (
                      <button
                        type="button"
                        onClick={handleSelectAllFilteredPersonnel}
                        className="font-bold underline text-emerald-800 hover:text-emerald-950 cursor-pointer"
                      >
                        Select all {filteredPersonnel.length} matching troops across all pages
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedPersonnelIds([])}
                        className="font-bold underline text-emerald-800 hover:text-emerald-950 cursor-pointer"
                      >
                        Clear selection
                      </button>
                    )}
                  </div>
                )}
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-3 sm:px-4 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={
                            paginatedPersonnel.length > 0 &&
                            paginatedPersonnel.every((p) => selectedPersonnelIds.includes(p._id))
                          }
                          onChange={handleSelectAllPersonnel}
                          className="rounded text-emerald-700 focus:ring-emerald-600 cursor-pointer"
                          title="Select all troops on this page"
                        />
                      </th>
                      <th className="py-3.5 px-3 sm:px-4">Name & Rank</th>
                      <th className="py-3.5 px-3">Mobile Number</th>
                      <th className="py-3.5 px-3">Device / App Status</th>
                      <th className="py-3.5 px-3">Unit / CDC</th>
                      <th className="py-3.5 px-3">Group</th>
                      <th className="py-3.5 px-3">Status</th>
                      <th className="py-3.5 px-3 text-right pr-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {paginatedPersonnel.map((person) => {
                      const badge = getRankBadgeStyle(person.rank);
                      const isAndroid = ((person as any).deviceType || "ANDROID") === "ANDROID";
                      const isSelected = selectedPersonnelIds.includes(person._id);
                      return (
                      <tr key={person._id} className={`hover:bg-slate-50/80 transition-colors ${isSelected ? "bg-emerald-50/40" : ""}`}>
                        <td className="py-3.5 px-3 sm:px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPersonnelIds([...selectedPersonnelIds, person._id]);
                              } else {
                                setSelectedPersonnelIds(selectedPersonnelIds.filter((id) => id !== person._id));
                              }
                            }}
                            className="rounded text-emerald-700 focus:ring-emerald-600 cursor-pointer"
                          />
                        </td>
                        <td className="py-3.5 px-3 sm:px-4 font-bold text-slate-900">
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

                        <td className="py-3.5 px-3 font-mono font-bold text-slate-800">
                          <HighlightMatch text={formatPhMobileDisplay(person.mobileNumber)} query={searchQuery} />
                        </td>

                        {/* Device & App Pairing Status */}
                        <td className="py-3.5 px-3">
                          {(person as any).fcmToken ? (
                            <button
                              type="button"
                              onClick={() => handleOpenPairModal(person)}
                              title={`Device Paired: ${(person as any).deviceModel || "Android Device"}\nInstalled: ${(person as any).appInstalledAt ? new Date((person as any).appInstalledAt).toLocaleDateString() : "Active"}\nClick to manage, transfer, or unlink.`}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-300 hover:bg-emerald-100 transition-all cursor-pointer shadow-2xs group"
                            >
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                              <Smartphone className="w-3 h-3 text-emerald-700 shrink-0" />
                              <span className="max-w-[100px] truncate">{(person as any).deviceModel || "Paired App"}</span>
                            </button>
                          ) : (person as any).previousDeviceModel ? (
                            <button
                              type="button"
                              onClick={() => handleOpenPairModal(person)}
                              title={`Device Unlinked / Transfer Pending\nPrevious Phone: ${(person as any).previousDeviceModel}\nClick to pair replacement phone.`}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 transition-all cursor-pointer shadow-2xs"
                            >
                              <RefreshCw className="w-3 h-3 text-amber-600 shrink-0" />
                              <span className="max-w-[100px] truncate">Transfer ({(person as any).previousDeviceModel})</span>
                            </button>
                          ) : isAndroid ? (
                            <button
                              type="button"
                              onClick={() => handleOpenPairModal(person)}
                              title="Android phone not yet paired. Click to pair now."
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 transition-all cursor-pointer shadow-2xs"
                            >
                              <Link2 className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>Pair App</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleInitiateToggleDevice(person)}
                              title="Keypad device (Cellular SMS Only). Click to change to Android."
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 transition-all cursor-pointer"
                            >
                              <KeypadPhoneIcon className="w-3 h-3 text-slate-500 shrink-0" />
                              <span>Keypad</span>
                            </button>
                          )}
                        </td>

                        <td className="py-3.5 px-3 font-medium text-slate-600">
                          <HighlightMatch text={person.unit} query={searchQuery} />
                        </td>

                        <td className="py-3.5 px-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {person.groupName}
                          </span>
                        </td>

                        <td className="py-3.5 px-3">
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
                              onClick={() => handleOpenPairModal(person)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                (person as any).fcmToken
                                  ? "hover:bg-emerald-100 text-emerald-700 bg-emerald-50 border border-emerald-200"
                                  : "hover:bg-amber-100 text-amber-700 bg-amber-50 border border-amber-200"
                              }`}
                              title={(person as any).fcmToken ? `Manage Device: ${(person as any).deviceModel || "Paired"}` : "Quick Pair RESCOM App"}
                            >
                              <Smartphone className="w-3.5 h-3.5" />
                            </button>
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
            <TablePagination
              currentPage={personnelPage}
              totalItems={filteredPersonnel.length}
              pageSize={personnelPageSize}
              pageSizeOptions={[15, 25, 50, 100]}
              onPageChange={setPersonnelPage}
              onPageSizeChange={setPersonnelPageSize}
              itemName="troops"
            />
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

                      <div className="flex items-center gap-1.5">
                        {!camp.isExpired && (
                          <button
                            type="button"
                            onClick={() =>
                              guardAction("close enlistment campaign early", () => {
                                setCampaignActionError(null);
                                setCampaignCloseEarlyTarget(camp);
                              })
                            }
                            className="px-2.5 py-1.5 hover:bg-amber-50 text-slate-500 hover:text-amber-800 font-bold text-[11px] rounded-xl transition-colors cursor-pointer"
                          >
                            Close Early
                          </button>
                        )}
                        {!camp.isExpired ? (
                          <button
                            type="button"
                            onClick={() =>
                              guardAction("delete enlistment campaign", () => {
                                setCampaignActionError(null);
                                setCampaignProtectionTarget(camp);
                              })
                            }
                            className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 hover:text-amber-900 border border-amber-200/80 rounded-lg transition-colors cursor-pointer flex items-center justify-center shadow-2xs"
                            title="Protected: Link is LIVE. Deletion is locked."
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              guardAction("delete enlistment campaign", () => {
                                setCampaignActionError(null);
                                setCampaignDeleteTarget(camp);
                              })
                            }
                            className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                            title="Permanently Delete Campaign"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
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

            {/* Filter Tabs for Submissions */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-fit">
              <button
                type="button"
                onClick={() => setSubmissionStatusFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  submissionStatusFilter === "ALL"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                All ({submissionsList.length})
              </button>
              <button
                type="button"
                onClick={() => setSubmissionStatusFilter("PENDING")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  submissionStatusFilter === "PENDING"
                    ? "bg-white text-amber-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Pending ({pendingSubmissions.length})
              </button>
              <button
                type="button"
                onClick={() => setSubmissionStatusFilter("APPROVED")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  submissionStatusFilter === "APPROVED"
                    ? "bg-white text-emerald-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Approved ({submissionsList.filter((s) => s.status === "APPROVED").length})
              </button>
              <button
                type="button"
                onClick={() => setSubmissionStatusFilter("REJECTED")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  submissionStatusFilter === "REJECTED"
                    ? "bg-white text-rose-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Rejected ({submissionsList.filter((s) => s.status === "REJECTED").length})
              </button>
            </div>

            {/* Submissions Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              {isLoadingSubmissions ? (
                <TableSkeleton rows={4} cols={5} />
              ) : filteredSubmissions.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <UserPlus className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-bold text-slate-700">No Submissions Found</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {submissionStatusFilter !== "ALL"
                      ? `No ${submissionStatusFilter.toLowerCase()} submissions in this category.`
                      : "Share your enlistment links in unit Viber / Messenger groups to start gathering numbers."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  {selectedSubmissionIds.length > 0 && pendingSubmissions.length > pendingOnPage.length && (
                    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 text-amber-950 font-medium">
                      <span>
                        <strong className="font-bold text-amber-900">{selectedSubmissionIds.length}</strong> submission{selectedSubmissionIds.length > 1 ? "s" : ""} selected on this page.
                      </span>
                      {selectedSubmissionIds.length < pendingSubmissions.length ? (
                        <button
                          type="button"
                          onClick={() => setSelectedSubmissionIds(pendingSubmissions.map((s) => s._id))}
                          className="font-bold underline text-amber-800 hover:text-amber-950 cursor-pointer"
                        >
                          Select all {pendingSubmissions.length} pending submissions across all pages
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSelectedSubmissionIds([])}
                          className="font-bold underline text-amber-800 hover:text-amber-950 cursor-pointer"
                        >
                          Clear selection
                        </button>
                      )}
                    </div>
                  )}
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={
                              pendingOnPage.length > 0 &&
                              pendingOnPage.every((s) => selectedSubmissionIds.includes(s._id))
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                const pagePendingIds = pendingOnPage.map((s) => s._id);
                                setSelectedSubmissionIds(Array.from(new Set([...selectedSubmissionIds, ...pagePendingIds])));
                              } else {
                                const pagePendingIds = new Set(pendingOnPage.map((s) => s._id));
                                setSelectedSubmissionIds(selectedSubmissionIds.filter((id) => !pagePendingIds.has(id)));
                              }
                            }}
                            className="rounded text-emerald-700 focus:ring-emerald-600 cursor-pointer"
                            title="Select all pending on this page"
                          />
                        </th>
                        <th className="py-3 px-4">Soldier & Rank</th>
                        <th className="py-3 px-4">Mobile Number</th>
                        <th className="py-3 px-4">Device</th>
                        <th className="py-3 px-4">Assigned Unit</th>
                        <th className="py-3 px-4">Batch Code</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right pr-6">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                      {paginatedSubmissions.map((sub) => {
                        const isSelected = selectedSubmissionIds.includes(sub._id);
                        const isAndroid = (sub.deviceType || "ANDROID") === "ANDROID";
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

                            <td className="py-3 px-4">
                              <div className="space-y-1">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                                    isAndroid
                                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                      : "bg-slate-100 text-slate-700 border-slate-300"
                                  }`}
                                >
                                  {isAndroid ? (
                                    <>
                                      <AndroidIcon className="w-3 h-3 text-[#3DDC84] shrink-0" />
                                      <span>Android</span>
                                    </>
                                  ) : (
                                    <>
                                      <KeypadPhoneIcon className="w-3 h-3 text-slate-500 shrink-0" />
                                      <span>Keypad</span>
                                    </>
                                  )}
                                </span>
                                {(sub as any).deviceModel && (
                                  <div
                                    className="text-[10px] font-mono text-slate-600 flex items-center gap-1 font-medium truncate max-w-[150px]"
                                    title={(sub as any).deviceModel}
                                  >
                                    <Lock className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                    <span className="truncate">{(sub as any).deviceModel}</span>
                                  </div>
                                )}
                              </div>
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
              <TablePagination
                currentPage={submissionsPage}
                totalItems={filteredSubmissions.length}
                pageSize={submissionsPageSize}
                pageSizeOptions={[10, 20, 50, 100]}
                onPageChange={setSubmissionsPage}
                onPageSizeChange={setSubmissionsPageSize}
                itemName="submissions"
              />
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
                  <option value="">
                    {isScopedAdmin ? "Select an Assigned Group..." : "All 10RCDG Personnel (General Roster)"}
                  </option>
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
                    <option value="">
                      {isScopedAdmin ? "Select an Assigned Group..." : "All 10RCDG Personnel (General Roster)"}
                    </option>
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

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Primary Device Capability *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2.5 transition-all ${
                      formData.deviceType === "ANDROID"
                        ? "bg-emerald-50/80 border-emerald-600 ring-1 ring-emerald-600 font-bold text-emerald-950 shadow-2xs"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <input
                      type="radio"
                      name="deviceType"
                      value="ANDROID"
                      checked={formData.deviceType === "ANDROID"}
                      onChange={() => setFormData({ ...formData, deviceType: "ANDROID" })}
                      className="text-emerald-700 focus:ring-emerald-600"
                    />
                    <div className="flex items-center gap-1.5">
                      <AndroidIcon className="w-3.5 h-3.5 text-[#3DDC84] shrink-0" />
                      <span>Android (Push Capable)</span>
                    </div>
                  </label>

                  <label
                    className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2.5 transition-all ${
                      formData.deviceType === "KEYPAD"
                        ? "bg-slate-100 border-slate-600 ring-1 ring-slate-600 font-bold text-slate-900 shadow-2xs"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <input
                      type="radio"
                      name="deviceType"
                      value="KEYPAD"
                      checked={formData.deviceType === "KEYPAD"}
                      onChange={() => setFormData({ ...formData, deviceType: "KEYPAD" })}
                      className="text-slate-700 focus:ring-slate-600"
                    />
                    <div className="flex items-center gap-1.5">
                      <KeypadPhoneIcon className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      <span>Keypad (SMS Only)</span>
                    </div>
                  </label>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Android devices receive free in-app alerts; keypad phones will be sent cellular SMS.
                </p>
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

      {/* Device Capability Confirmation Modal (Protects against misclicks / accidents) */}
      {deviceConfirmTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                    deviceConfirmTarget.targetDevice === "ANDROID"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200 shadow-2xs"
                      : "bg-slate-100 text-slate-800 border-slate-200 shadow-2xs"
                  }`}
                >
                  {deviceConfirmTarget.targetDevice === "ANDROID" ? (
                    <AndroidIcon className="w-5 h-5 text-[#3DDC84]" />
                  ) : (
                    <KeypadPhoneIcon className="w-5 h-5 text-slate-700" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {deviceConfirmTarget.mode === "BATCH"
                      ? `Confirm Set as ${deviceConfirmTarget.targetDevice === "ANDROID" ? "Android" : "Keypad"}?`
                      : `Switch to ${deviceConfirmTarget.targetDevice === "ANDROID" ? "Android Smartphone" : "Basic Keypad Phone"}?`}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {deviceConfirmTarget.targetDevice === "ANDROID"
                      ? "Enables free in-app alert sirens (₱0 SMS cost)"
                      : "Routes alerts through cellular SMS gateway"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeviceConfirmTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 text-xs">
              {/* Summary Card */}
              {deviceConfirmTarget.mode === "SINGLE" && deviceConfirmTarget.person ? (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold font-mono border ${getRankBadgeStyle(
                          deviceConfirmTarget.person.rank
                        )}`}
                      >
                        {deviceConfirmTarget.person.rank}
                      </span>
                      <span className="font-bold text-slate-900 text-sm">
                        {deviceConfirmTarget.person.firstName} {deviceConfirmTarget.person.lastName}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">
                      {formatPhMobileDisplay(deviceConfirmTarget.person.mobileNumber)}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Device Capability:</span>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                        {((deviceConfirmTarget.person as any).deviceType || "ANDROID") === "ANDROID" ? (
                          <>
                            <AndroidIcon className="w-2.5 h-2.5 text-[#3DDC84]" />
                            <span>Android</span>
                          </>
                        ) : (
                          <>
                            <KeypadPhoneIcon className="w-2.5 h-2.5 text-slate-600" />
                            <span>Keypad</span>
                          </>
                        )}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                          deviceConfirmTarget.targetDevice === "ANDROID"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                            : "bg-slate-100 text-slate-800 border-slate-300"
                        }`}
                      >
                        {deviceConfirmTarget.targetDevice === "ANDROID" ? (
                          <>
                            <AndroidIcon className="w-2.5 h-2.5 text-[#3DDC84]" />
                            <span>Android (New)</span>
                          </>
                        ) : (
                          <>
                            <KeypadPhoneIcon className="w-2.5 h-2.5 text-slate-600" />
                            <span>Keypad (New)</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Affected Troops:</span>
                    <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {deviceConfirmTarget.count} Soldier{deviceConfirmTarget.count > 1 ? "s" : ""} Selected
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">New Tag:</span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                        deviceConfirmTarget.targetDevice === "ANDROID"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                          : "bg-slate-100 text-slate-800 border-slate-300"
                      }`}
                    >
                      {deviceConfirmTarget.targetDevice === "ANDROID" ? (
                        <>
                          <AndroidIcon className="w-3 h-3 text-[#3DDC84]" />
                          <span>Android Smartphone</span>
                        </>
                      ) : (
                        <>
                          <KeypadPhoneIcon className="w-3 h-3 text-slate-600" />
                          <span>Basic Keypad Phone</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Operational Guidance Notice */}
              {deviceConfirmTarget.targetDevice === "ANDROID" ? (
                <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5 text-xs text-emerald-950">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>Cost Optimization Routing (Free ₱0 Push)</span>
                  </div>
                  <p className="text-[11px] text-emerald-900 leading-relaxed font-semibold">
                    Are you sure you want to mark {deviceConfirmTarget.count > 1 ? `these ${deviceConfirmTarget.count} soldiers` : "this soldier"} as Android?
                  </p>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    During Smart Hybrid broadcasts, RESCOM ALERT will automatically transmit in-app siren alerts to their companion app for free (saving cellular SMS credits).
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-950 space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5 text-xs text-amber-950">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Cellular SMS Gateway Routing</span>
                  </div>
                  <p className="text-[11px] text-amber-900 leading-relaxed font-semibold">
                    Are you sure you want to mark {deviceConfirmTarget.count > 1 ? `these ${deviceConfirmTarget.count} soldiers` : "this soldier"} as Keypad?
                  </p>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    During Smart Hybrid broadcasts, RESCOM ALERT will send SMS through the GSM hardware gateway (TextBee SIM). In-app push notifications will be bypassed for {deviceConfirmTarget.count > 1 ? "these troops" : "this troop"}.
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isUpdatingDevice}
                onClick={() => setDeviceConfirmTarget(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUpdatingDevice}
                onClick={handleConfirmDeviceChange}
                className={`px-4.5 py-2 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                  deviceConfirmTarget.targetDevice === "ANDROID"
                    ? "bg-emerald-700 hover:bg-emerald-600"
                    : "bg-slate-800 hover:bg-slate-700"
                }`}
              >
                {isUpdatingDevice ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : deviceConfirmTarget.targetDevice === "ANDROID" ? (
                  <>
                    <AndroidIcon className="w-3.5 h-3.5 text-white" />
                    <span>Confirm Set as Android</span>
                  </>
                ) : (
                  <>
                    <KeypadPhoneIcon className="w-3.5 h-3.5 text-white" />
                    <span>Confirm Set as Keypad</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Device Hardware Unpair Confirmation Modal */}
      {unlinkConfirmTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border bg-rose-50 text-rose-700 border-rose-200">
                  <Smartphone className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Unpair Device?</h3>
                  <p className="text-xs text-slate-500">Disconnects phone from emergency sirens</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUnlinkConfirmTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">
                    {unlinkConfirmTarget.soldier.rank} {unlinkConfirmTarget.soldier.firstName} {unlinkConfirmTarget.soldier.lastName}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {formatPhMobileDisplay(unlinkConfirmTarget.soldier.mobileNumber)}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 flex items-center justify-between pt-1 border-t border-slate-200/60 font-mono">
                  <span>Current Device:</span>
                  <span className="font-semibold text-slate-800">
                    {(unlinkConfirmTarget.soldier as any).deviceModel ||
                      (unlinkConfirmTarget.soldier as any).lastDownloadedDeviceModel ||
                      "Android Device"}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                This phone will stop sounding mobilization sirens. To pair a replacement device later, scan the soldier&apos;s <strong>Command QR Code</strong>.
              </p>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isPairingDevice}
                onClick={() => setUnlinkConfirmTarget(null)}
                className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-200/70 border border-slate-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPairingDevice}
                onClick={handleConfirmExecuteUnlink}
                className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isPairingDevice ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Unpairing...</span>
                  </>
                ) : (
                  <span>Unpair Device</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Device Unpair Confirmation Modal */}
      {batchUnlinkConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border bg-rose-50 text-rose-700 border-rose-200">
                  <Smartphone className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Unpair {selectedPersonnelIds.length} Devices?
                  </h3>
                  <p className="text-xs text-slate-500">Bulk device disconnection</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBatchUnlinkConfirmOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 text-xs text-slate-600 leading-relaxed space-y-2">
              <p>
                Emergency push sirens will be revoked for{" "}
                <strong className="text-slate-900">{selectedPersonnelIds.length} selected troops</strong>.
              </p>
              <p className="text-slate-500 text-[11px]">
                Replacement phones can be paired individually using their Command QR codes.
              </p>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isBatchPairing}
                onClick={() => setBatchUnlinkConfirmOpen(false)}
                className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-200/70 border border-slate-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isBatchPairing}
                onClick={handleConfirmBatchUnlink}
                className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isBatchPairing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Unpairing...</span>
                  </>
                ) : (
                  <span>Unpair ({selectedPersonnelIds.length})</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Campaign Protection Notice Modal */}
      {campaignProtectionTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-amber-200 overflow-hidden transform animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-50 via-amber-50/70 to-orange-50/40 border-b border-amber-200/80 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center shrink-0 shadow-xs">
                  <Lock className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                    Enlistment Link is Active
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span>
                      DELETION PROTECTED
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCampaignProtectionTarget(null);
                  setCampaignActionError(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-amber-100/60 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              {/* Campaign snapshot */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white text-slate-700 border border-slate-200">
                    {campaignProtectionTarget.targetUnit}
                  </span>
                  <span className="font-mono text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Passcode: {campaignProtectionTarget.passcode}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900">
                  {campaignProtectionTarget.title}
                </h4>
                <div className="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-slate-200/80">
                  <span>Group: <strong className="text-slate-800">{campaignProtectionTarget.groupName}</strong></span>
                  <span>Submissions: <strong className="text-emerald-700">{campaignProtectionTarget.totalSubmissions} ({campaignProtectionTarget.pendingCount} pending)</strong></span>
                </div>
              </div>

              {/* Warning Notice Box */}
              <div className="p-3.5 bg-amber-50/80 border border-amber-300/80 rounded-xl space-y-2">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="space-y-1.5 text-xs text-amber-950">
                    <p className="font-bold leading-snug">
                      This public enlistment link is currently LIVE and accepting submissions.
                    </p>
                    <p className="text-[11px] text-amber-900/90 leading-relaxed">
                      To prevent accidental deletion, loss of applicant records, and dead links for soldiers scanning the QR code, <strong>active campaigns cannot be deleted directly</strong>.
                    </p>
                    <p className="text-[11px] text-amber-900/90 leading-relaxed">
                      You can only delete this campaign if you <strong>close it early</strong> or wait for its duration window to conclude.
                    </p>
                  </div>
                </div>
              </div>

              {campaignActionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
                  {campaignActionError}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5">
              <button
                type="button"
                disabled={isClosingCampaign}
                onClick={() => {
                  setCampaignProtectionTarget(null);
                  setCampaignActionError(null);
                }}
                className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer text-center"
              >
                Keep Link Live
              </button>
              <button
                type="button"
                disabled={isClosingCampaign}
                onClick={() => handleConfirmCloseCampaign(campaignProtectionTarget, true)}
                className="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isClosingCampaign ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Closing Window...</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Close Early & Unlock Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Deletion Confirmation Modal */}
      {campaignDeleteTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-rose-200 overflow-hidden transform animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-rose-50 via-rose-50/70 to-red-50/40 border-b border-rose-200/80 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-300 text-rose-700 flex items-center justify-center shrink-0 shadow-xs">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                    Permanently Delete Campaign?
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-100 text-rose-900 border border-rose-300">
                      IRREVERSIBLE PURGE
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCampaignDeleteTarget(null);
                  setCampaignActionError(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-rose-100/60 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              <div className="p-3.5 bg-rose-50/80 border border-rose-200 rounded-xl space-y-2">
                <p className="text-xs font-bold text-rose-950">
                  Are you sure you want to permanently delete this enlistment campaign?
                </p>
                <p className="text-[11px] text-rose-900/90 leading-relaxed">
                  This will permanently erase <strong>{campaignDeleteTarget.title}</strong>, its QR enlistment portal, and all <strong>{campaignDeleteTarget.totalSubmissions} associated applicant submissions</strong> from the database. This action cannot be reversed.
                </p>
              </div>

              {/* Target info */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Unit / Group:</span>
                  <span className="font-semibold text-slate-800">{campaignDeleteTarget.targetUnit} &middot; {campaignDeleteTarget.groupName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Security Passcode:</span>
                  <span className="font-mono font-semibold text-slate-800">{campaignDeleteTarget.passcode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="font-semibold text-slate-600">Closed / Concluded</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 text-rose-700 font-bold">
                  <span>Submissions to be purged:</span>
                  <span>{campaignDeleteTarget.totalSubmissions} records</span>
                </div>
              </div>

              {campaignActionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
                  {campaignActionError}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeletingCampaign}
                onClick={() => {
                  setCampaignDeleteTarget(null);
                  setCampaignActionError(null);
                }}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingCampaign}
                onClick={handleConfirmRemoveCampaign}
                className="px-4.5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeletingCampaign ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Permanent Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Early Confirmation Modal */}
      {campaignCloseEarlyTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-amber-200 overflow-hidden transform animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-50 to-orange-50/40 border-b border-amber-200/80 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center shrink-0 shadow-xs">
                  <Clock className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                    Close Enlistment Window Early?
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      IMMEDIATE DEACTIVATION
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCampaignCloseEarlyTarget(null);
                  setCampaignActionError(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-amber-100/60 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-3">
              <p className="text-xs font-bold text-slate-900">
                Are you sure you want to close &ldquo;{campaignCloseEarlyTarget.title}&rdquo; ahead of schedule?
              </p>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                The public enlistment link will immediately stop accepting new soldier registrations. Existing submissions ({campaignCloseEarlyTarget.totalSubmissions} records) will remain safely in your queue for review and approval.
              </p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Unit:</span>
                  <span className="font-semibold text-slate-800">{campaignCloseEarlyTarget.targetUnit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Target Group:</span>
                  <span className="font-semibold text-slate-800">{campaignCloseEarlyTarget.groupName}</span>
                </div>
              </div>

              {campaignActionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
                  {campaignActionError}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isClosingCampaign}
                onClick={() => {
                  setCampaignCloseEarlyTarget(null);
                  setCampaignActionError(null);
                }}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Keep Window Open
              </button>
              <button
                type="button"
                disabled={isClosingCampaign}
                onClick={() => handleConfirmCloseCampaign(campaignCloseEarlyTarget, false)}
                className="px-4.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isClosingCampaign ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Closing...</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Close Window Early</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SINGLE SOLDIER DEVICE PAIRING MODAL */}
      {/* ========================================================= */}
      {devicePairingTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-emerald-950 text-white flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold tracking-tight">
                    Soldier Device Pairing
                  </h3>
                  <p className="text-[11px] text-emerald-300/80 font-mono">
                    10RCDG RESCOM APP TELEMETRY & PUSH PROVISIONING
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDevicePairingTarget(null)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Soldier Identity Banner */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold font-mono border ${getRankBadgeStyle(devicePairingTarget.rank).bg} ${getRankBadgeStyle(devicePairingTarget.rank).text} ${getRankBadgeStyle(devicePairingTarget.rank).border}`}>
                    {devicePairingTarget.rank}
                  </span>
                  <span className="font-extrabold text-sm text-slate-900 truncate">
                    {devicePairingTarget.firstName} {devicePairingTarget.lastName}
                  </span>
                </div>
                <div className="text-xs font-mono font-bold text-slate-700 mt-1 flex items-center gap-2">
                  <span>{formatPhMobileDisplay(devicePairingTarget.mobileNumber)}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-500 font-sans font-medium text-[11px]">{devicePairingTarget.groupName}</span>
                </div>
              </div>

              {(devicePairingTarget as any).fcmToken ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                  <span>PAIRED</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-300 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>UNPAIRED</span>
                </span>
              )}
            </div>

            {/* Tab switch: Direct Provision vs QR Code */}
            <div className="px-5 pt-3 flex items-center gap-2 border-b border-slate-100 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActivePairingTab("DIRECT")}
                className={`pb-2.5 px-1 border-b-2 transition-all cursor-pointer ${
                  activePairingTab === "DIRECT"
                    ? "border-emerald-600 text-emerald-800"
                    : "border-transparent text-slate-400 hover:text-slate-700"
                }`}
              >
                1-Click Direct Pair
              </button>
              <button
                type="button"
                onClick={() => setActivePairingTab("QR")}
                className={`pb-2.5 px-1 border-b-2 transition-all cursor-pointer ${
                  activePairingTab === "QR"
                    ? "border-emerald-600 text-emerald-800"
                    : "border-transparent text-slate-400 hover:text-slate-700"
                }`}
              >
                Soldier Self-Pair QR & Link
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {activePairingTab === "DIRECT" ? (
                <div className="space-y-4">
                  {/* Preset chips */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Select Device Model Preset
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        "Samsung Galaxy A54",
                        "Infinix X6711",
                        "Xiaomi Redmi Note 12",
                        "Realme C55",
                        "Tecno Spark 20",
                        "Android Phone",
                      ].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setCustomDeviceModel(preset)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                            customDeviceModel === preset
                              ? "bg-emerald-50 border-emerald-400 text-emerald-900 font-bold shadow-2xs"
                              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Hardware Model Name
                    </label>
                    <input
                      type="text"
                      value={customDeviceModel}
                      onChange={(e) => setCustomDeviceModel(e.target.value)}
                      placeholder="e.g. Samsung Galaxy A54 5G"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        FCM Push Token (Optional)
                      </label>
                      <span className="text-[10px] text-slate-400">Auto-generated if blank</span>
                    </div>
                    <input
                      type="text"
                      value={customFcmToken}
                      onChange={(e) => setCustomFcmToken(e.target.value)}
                      placeholder="Leave blank to auto-generate ready-to-test push token"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
                    />
                  </div>

                  {((devicePairingTarget as any).appInstalledAt || (devicePairingTarget as any).lastDownloadedDeviceModel) && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1.5 font-mono">
                      {(devicePairingTarget as any).lastDownloadedDeviceModel && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Download Device:</span>
                          <span className="font-semibold text-slate-800">
                            {(devicePairingTarget as any).lastDownloadedDeviceModel}
                          </span>
                        </div>
                      )}
                      {(devicePairingTarget as any).previousDeviceModel && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Previous Device:</span>
                          <span className="font-semibold text-amber-700">
                            {(devicePairingTarget as any).previousDeviceModel}
                          </span>
                        </div>
                      )}
                      {(devicePairingTarget as any).lastDownloadedAt && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Last Download:</span>
                          <span className="font-semibold text-slate-700">
                            {new Date((devicePairingTarget as any).lastDownloadedAt).toLocaleString("en-US", { timeZone: "Asia/Manila" })}
                          </span>
                        </div>
                      )}
                      {(devicePairingTarget as any).appInstalledAt && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Pairing Date:</span>
                          <span className="font-semibold text-slate-700">
                            {new Date((devicePairingTarget as any).appInstalledAt).toLocaleString("en-US", { timeZone: "Asia/Manila" })}
                          </span>
                        </div>
                      )}
                      {(devicePairingTarget as any).lastActiveAt && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Last Telemetry Ping:</span>
                          <span className="font-semibold text-emerald-700">
                            {new Date((devicePairingTarget as any).lastActiveAt).toLocaleString("en-US", { timeZone: "Asia/Manila" })}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {(devicePairingTarget as any).fcmToken && (
                    <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/90 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                        <Smartphone className="w-4 h-4 text-amber-700 shrink-0" />
                        <span>Phone Replacement / Damaged Device</span>
                      </div>
                      <p className="text-[11px] text-amber-800 leading-relaxed">
                        If the soldier reported a damaged phone or changed device, unpair it now. This immediately revokes the old phone&apos;s alert token and clears the hardware lock. Once unpaired, have the soldier scan their authorized <strong>Command QR Code</strong> on their new phone to securely link the replacement device.
                      </p>
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        <button
                          type="button"
                          disabled={isPairingDevice}
                          onClick={() => handleSingleUnlinkDevice(devicePairingTarget._id, "Phone Damaged / Broken")}
                          className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-rose-50 border border-rose-300 text-rose-800 text-[11px] font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                        >
                          <span>💥 Broken / Damaged Phone</span>
                        </button>
                        <button
                          type="button"
                          disabled={isPairingDevice}
                          onClick={() => handleSingleUnlinkDevice(devicePairingTarget._id, "Phone Replaced / Upgraded")}
                          className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 text-[11px] font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                        >
                          <span>🔄 New / Upgraded Phone</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4 text-center">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-3">
                    {(() => {
                      const cleanPhone = devicePairingTarget.mobileNumber.replace(/\D/g, "");
                      const authorizedQrUrl =
                        (typeof window !== "undefined" ? window.location.origin : "https://rescom-alert.com") +
                        `/download?verify=${encodeURIComponent(cleanPhone)}&soldierId=${devicePairingTarget._id}&auth=command_qr`;

                      return (
                        <>
                          <QRCodeSVG
                            value={authorizedQrUrl}
                            size={160}
                            level="H"
                            className="rounded-xl bg-white p-2 border border-slate-200 shadow-xs"
                          />
                          <div className="space-y-1 max-w-xs text-center">
                            <p className="text-xs font-bold text-slate-800">
                              Scan with camera on soldier&apos;s phone
                            </p>
                            <p className="text-[11px] text-slate-500 leading-relaxed">
                              Pre-verified link automatically identifies <strong>{devicePairingTarget.rank} {devicePairingTarget.firstName} {devicePairingTarget.lastName}</strong> and bypasses public portal lockouts. Hardware device is detected and bound upon download.
                            </p>
                          </div>

                          <div className="flex items-center gap-2 w-full pt-1">
                            <input
                              type="text"
                              readOnly
                              value={authorizedQrUrl}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-600 truncate"
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                await navigator.clipboard.writeText(authorizedQrUrl);
                                setCopiedPairLink(true);
                                setTimeout(() => setCopiedPairLink(false), 2000);
                              }}
                              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
                            >
                              {copiedPairLink ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <div>
                {(devicePairingTarget as any).fcmToken && activePairingTab === "DIRECT" ? (
                  <button
                    type="button"
                    disabled={isPairingDevice}
                    onClick={() => handleSingleUnlinkDevice(devicePairingTarget._id)}
                    className="px-3 py-2 text-rose-700 hover:text-rose-800 hover:bg-rose-50 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Unlink Device
                  </button>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDevicePairingTarget(null)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Close
                </button>
                {activePairingTab === "DIRECT" && (
                  <button
                    type="button"
                    disabled={isPairingDevice}
                    onClick={handleConfirmPairDevice}
                    className="px-4.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isPairingDevice ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Pairing...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>{(devicePairingTarget as any).fcmToken ? "Update Device" : "Pair Device Now"}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* BATCH DEVICE PAIRING MODAL */}
      {/* ========================================================= */}
      {isBatchPairModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-800 to-slate-900 text-white flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 text-white flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold tracking-tight">
                    Batch Pair RESCOM App
                  </h3>
                  <p className="text-[11px] text-emerald-200/80 font-mono">
                    RAPID PROVISIONING FOR {selectedPersonnelIds.length} SOLDIERS
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchPairModalOpen(false)}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                <p className="text-xs font-bold text-emerald-950">
                  Ready for upcoming Mobilization Push Alerts
                </p>
                <p className="text-[11px] text-emerald-900 leading-relaxed">
                  You are about to pair <strong>{selectedPersonnelIds.length} selected troops</strong>. This marks their profiles as Android App Push Capable (₱0 broadcast channel) and provisions their readiness tokens in the 10RCDG cloud.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Assigned Hardware Model Tag
                </label>
                <input
                  type="text"
                  value={batchDeviceModel}
                  onChange={(e) => setBatchDeviceModel(e.target.value)}
                  placeholder="e.g. Android Device (Bulk Provisioned)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
                />
              </div>

              {/* Quick Preview of Troops */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Troops to be Paired ({selectedPersonnelIds.length})
                </label>
                <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl p-2 bg-slate-50 text-xs">
                  {personnelList
                    .filter((p) => selectedPersonnelIds.includes(p._id))
                    .map((p) => (
                      <div key={p._id} className="py-1 flex items-center justify-between">
                        <span className="font-bold text-slate-800">
                          {p.rank} {p.firstName} {p.lastName}
                        </span>
                        <span className="font-mono text-slate-500 text-[11px]">
                          {formatPhMobileDisplay(p.mobileNumber)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isBatchPairing}
                onClick={() => setIsBatchPairModalOpen(false)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isBatchPairing}
                onClick={handleConfirmBatchPair}
                className="px-4.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isBatchPairing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Pairing {selectedPersonnelIds.length}...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirm & Pair ({selectedPersonnelIds.length})</span>
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
