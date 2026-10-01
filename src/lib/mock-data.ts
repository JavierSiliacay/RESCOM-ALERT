export interface Personnel {
  id: string;
  firstName: string;
  lastName: string;
  rank: string;
  mobileNumber: string;
  groupId: string;
  groupName: string;
  unit: string;
  status: "ACTIVE" | "INACTIVE";
  email?: string;
  createdAt: string;
}

export interface ContactGroup {
  id: string;
  name: string;
  description: string;
  color: string;
  memberCount: number;
  unit: string;
}

export interface BroadcastMessage {
  id: string;
  title: string;
  content: string;
  senderName: string;
  targetGroupNames: string[];
  totalRecipients: number;
  deliveredCount: number;
  failedCount: number;
  status: "DELIVERED" | "SENDING" | "FAILED";
  sentAt: string;
}

export interface AuditLogItem {
  id: string;
  userName: string;
  userRole: string;
  action: string;
  category: "AUTH" | "BROADCAST" | "PERSONNEL" | "SECURITY";
  details: string;
  ipAddress: string;
  timestamp: string;
}

export const INITIAL_GROUPS: ContactGroup[] = [
  {
    id: "grp-1",
    name: "Command & Staff Officers",
    description: "Executive leadership, S-Staff, and Battalion Commanders",
    color: "#b45309", // Amber Gold
    memberCount: 12,
    unit: "10RCDG HQ",
  },
  {
    id: "grp-2",
    name: "Quick Response Force (QRF)",
    description: "Emergency mobilization and disaster response unit",
    color: "#dc2626", // Red Alert
    memberCount: 28,
    unit: "Task Force Davao",
  },
  {
    id: "grp-3",
    name: "1001st Ready Reserve Battalion",
    description: "Davao City Ready Reserve Officers & Enlisted Personnel",
    color: "#15803d", // Military Green
    memberCount: 64,
    unit: "1001st RRIBn",
  },
  {
    id: "grp-4",
    name: "Medical & Rescue Contingent",
    description: "First aid, triage, and civil defense rescue personnel",
    color: "#2563eb", // Blue
    memberCount: 18,
    unit: "10RCDG Medical",
  },
];

export const INITIAL_PERSONNEL: Personnel[] = [
  {
    id: "per-1",
    firstName: "Javier",
    lastName: "Siliacay",
    rank: "COL",
    mobileNumber: "+639171234567",
    groupId: "grp-1",
    groupName: "Command & Staff Officers",
    unit: "10RCDG HQ",
    status: "ACTIVE",
    email: "siliacay.javier@gmail.com",
    createdAt: "2026-09-15",
  },
  {
    id: "per-2",
    firstName: "Reynaldo",
    lastName: "Salaguste",
    rank: "LTC",
    mobileNumber: "+639182345678",
    groupId: "grp-1",
    groupName: "Command & Staff Officers",
    unit: "10RCDG HQ",
    status: "ACTIVE",
    email: "salagustereynald48@gmail.com",
    createdAt: "2026-09-16",
  },
  {
    id: "per-3",
    firstName: "Alfred",
    lastName: "Agbong",
    rank: "MAJ",
    mobileNumber: "+639203456789",
    groupId: "grp-2",
    groupName: "Quick Response Force (QRF)",
    unit: "Task Force Davao",
    status: "ACTIVE",
    email: "alfredagbong2@gmail.com",
    createdAt: "2026-09-18",
  },
  {
    id: "per-4",
    firstName: "Novie Mae",
    lastName: "Labita",
    rank: "CPT",
    mobileNumber: "+639274567890",
    groupId: "grp-4",
    groupName: "Medical & Rescue Contingent",
    unit: "10RCDG Medical",
    status: "ACTIVE",
    email: "labitanoviemae@gmail.com",
    createdAt: "2026-09-20",
  },
  {
    id: "per-5",
    firstName: "Mark Anthony",
    lastName: "Dela Cruz",
    rank: "SSG",
    mobileNumber: "+639456789012",
    groupId: "grp-2",
    groupName: "Quick Response Force (QRF)",
    unit: "Task Force Davao",
    status: "ACTIVE",
    createdAt: "2026-09-22",
  },
  {
    id: "per-6",
    firstName: "Rodrigo",
    lastName: "Manalo",
    rank: "SGT",
    mobileNumber: "+639198765432",
    groupId: "grp-3",
    groupName: "1001st Ready Reserve Battalion",
    unit: "1001st RRIBn",
    status: "ACTIVE",
    createdAt: "2026-09-24",
  },
  {
    id: "per-7",
    firstName: "Eduardo",
    lastName: "Santos",
    rank: "CPL",
    mobileNumber: "+639287654321",
    groupId: "grp-3",
    groupName: "1001st Ready Reserve Battalion",
    unit: "1001st RRIBn",
    status: "ACTIVE",
    createdAt: "2026-09-25",
  },
  {
    id: "per-8",
    firstName: "Kristine",
    lastName: "Villanueva",
    rank: "1LT",
    mobileNumber: "+639356781234",
    groupId: "grp-4",
    groupName: "Medical & Rescue Contingent",
    unit: "10RCDG Medical",
    status: "ACTIVE",
    createdAt: "2026-09-28",
  },
];

export const INITIAL_BROADCASTS: BroadcastMessage[] = [
  {
    id: "msg-1",
    title: "MANDATORY FORMATION & MUSTER ASSEMBLY",
    content: "ATTN ALL 10RCDG PERSONNEL: Mandatory assembly this Saturday, 0700H at Camp General Manuel T. Yan Senior. Complete Type A uniform. Attendance is strictly required. By order of Group Commander.",
    senderName: "Col. Javier Siliacay",
    targetGroupNames: ["Command & Staff Officers", "1001st Ready Reserve Battalion"],
    totalRecipients: 76,
    deliveredCount: 76,
    failedCount: 0,
    status: "DELIVERED",
    sentAt: "2026-09-30 08:30 AM",
  },
  {
    id: "msg-2",
    title: "RED ALERT STATUS — TYPHOON PREPAREDNESS",
    content: "10RCDG RED ALERT: Tropical Depression approaching Davao Region. All QRF & Medical Contingent personnel must report status immediately and prepare standby equipment.",
    senderName: "Col. Javier Siliacay",
    targetGroupNames: ["Quick Response Force (QRF)", "Medical & Rescue Contingent"],
    totalRecipients: 46,
    deliveredCount: 45,
    failedCount: 1,
    status: "DELIVERED",
    sentAt: "2026-09-28 02:15 PM",
  },
  {
    id: "msg-3",
    title: "CIVIL DEFENSE DRILL COORDINATION",
    content: "Notice to Staff Officers: Coordination briefing for earthquake simulation exercise scheduled on Tuesday, 1400H at Conference Hall.",
    senderName: "Lt. Col. Reynaldo Salaguste",
    targetGroupNames: ["Command & Staff Officers"],
    totalRecipients: 12,
    deliveredCount: 12,
    failedCount: 0,
    status: "DELIVERED",
    sentAt: "2026-09-25 10:00 AM",
  },
];

export const INITIAL_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: "aud-1",
    userName: "Javier Siliacay",
    userRole: "COMMANDER",
    action: "Dispatched Mass Alert",
    category: "BROADCAST",
    details: "Sent 'MANDATORY FORMATION' to 76 personnel across 2 groups",
    ipAddress: "124.106.142.18",
    timestamp: "2026-09-30 08:30:12",
  },
  {
    id: "aud-2",
    userName: "Javier Siliacay",
    userRole: "COMMANDER",
    action: "User Authentication",
    category: "AUTH",
    details: "Google OAuth 2.0 Sign-in (Session initialized)",
    ipAddress: "124.106.142.18",
    timestamp: "2026-09-30 08:15:00",
  },
  {
    id: "aud-3",
    userName: "Reynaldo Salaguste",
    userRole: "ADMIN",
    action: "Added Personnel Record",
    category: "PERSONNEL",
    details: "Registered 1LT Kristine Villanueva to Medical & Rescue Contingent",
    ipAddress: "112.198.74.52",
    timestamp: "2026-09-28 16:45:20",
  },
  {
    id: "aud-4",
    userName: "Javier Siliacay",
    userRole: "COMMANDER",
    action: "Dispatched Emergency Alert",
    category: "BROADCAST",
    details: "Sent 'RED ALERT STATUS' to 46 personnel",
    ipAddress: "124.106.142.18",
    timestamp: "2026-09-28 14:15:03",
  },
  {
    id: "aud-5",
    userName: "Alfred Agbong",
    userRole: "OPERATOR",
    action: "User Authentication",
    category: "AUTH",
    details: "Google OAuth 2.0 Sign-in (Mobile Device)",
    ipAddress: "175.176.88.90",
    timestamp: "2026-09-28 14:02:11",
  },
];

export const PRESET_TEMPLATES = [
  {
    id: "tpl-1",
    title: "Mandatory Assembly / Muster",
    category: "Routine",
    text: "ATTN 10RCDG PERSONNEL: Mandatory Muster Formation scheduled on [DATE], [TIME] at Camp General Manuel T. Yan Senior. Prescribed uniform: [UNIFORM]. Strict compliance required.",
  },
  {
    id: "tpl-2",
    title: "Red Alert Emergency Mobilization",
    category: "Emergency",
    text: "RED ALERT RECALL: All 10RCDG reservists and active duty personnel must report to designated battalion stations within 2 hours. Acknowledge receipt of this SMS immediately.",
  },
  {
    id: "tpl-3",
    title: "Severe Weather / Disaster Advisory",
    category: "Weather",
    text: "WEATHER ADVISORY: Signal No. [X] raised in Davao Region. 10RCDG QRF and Disaster Response Units are placed on standby. Monitor communication channels for deployment orders.",
  },
  {
    id: "tpl-4",
    title: "Training & Seminar Announcement",
    category: "Training",
    text: "NOTICE: Annual In-Service Training & Marksmanship exercise will commence on [DATE]. Check your battalion Viber/Group for roster requirements.",
  },
];
