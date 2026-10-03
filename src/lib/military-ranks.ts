export interface MilitaryRank {
  code: string;
  name: string;
  category: "Commissioned Officers" | "Senior Non-Commissioned Officers (NCO)" | "Junior Enlisted Personnel" | "Reservists & Civilian";
}

export interface RankGroup {
  groupName: string;
  ranks: MilitaryRank[];
}

export const RANK_GROUPS: RankGroup[] = [
  {
    groupName: "Commissioned Officers (CO)",
    ranks: [
      { code: "BGEN", name: "Brigadier General (1-Star)", category: "Commissioned Officers" },
      { code: "COL", name: "Colonel", category: "Commissioned Officers" },
      { code: "LTC", name: "Lieutenant Colonel", category: "Commissioned Officers" },
      { code: "MAJ", name: "Major", category: "Commissioned Officers" },
      { code: "CPT", name: "Captain", category: "Commissioned Officers" },
      { code: "1LT", name: "First Lieutenant", category: "Commissioned Officers" },
      { code: "2LT", name: "Second Lieutenant", category: "Commissioned Officers" },
    ],
  },
  {
    groupName: "Senior Non-Commissioned Officers (Senior NCO)",
    ranks: [
      { code: "FCMS", name: "First Chief Master Sergeant", category: "Senior Non-Commissioned Officers (NCO)" },
      { code: "CMS", name: "Chief Master Sergeant", category: "Senior Non-Commissioned Officers (NCO)" },
      { code: "SMS", name: "Senior Master Sergeant", category: "Senior Non-Commissioned Officers (NCO)" },
      { code: "MSG", name: "Master Sergeant", category: "Senior Non-Commissioned Officers (NCO)" },
      { code: "TSG", name: "Technical Sergeant", category: "Senior Non-Commissioned Officers (NCO)" },
      { code: "SSG", name: "Staff Sergeant", category: "Senior Non-Commissioned Officers (NCO)" },
      { code: "SGT", name: "Sergeant", category: "Senior Non-Commissioned Officers (NCO)" },
    ],
  },
  {
    groupName: "Junior Enlisted Personnel (EP)",
    ranks: [
      { code: "CPL", name: "Corporal", category: "Junior Enlisted Personnel" },
      { code: "PFC", name: "Private First Class", category: "Junior Enlisted Personnel" },
      { code: "PVT", name: "Private", category: "Junior Enlisted Personnel" },
    ],
  },
  {
    groupName: "Reserve Force & Auxiliaries",
    ranks: [
      { code: "RES", name: "Ready Reservist", category: "Reservists & Civilian" },
      { code: "CDT", name: "ROTC / Officer Cadet", category: "Reservists & Civilian" },
      { code: "CIV", name: "Civilian Staff / Support", category: "Reservists & Civilian" },
    ],
  },
];

export const ALL_MILITARY_RANKS: MilitaryRank[] = RANK_GROUPS.flatMap((g) => g.ranks);

export const RANK_MAP: Record<string, MilitaryRank> = Object.fromEntries(
  ALL_MILITARY_RANKS.map((r) => [r.code, r])
);

/**
 * Returns the full title for a given military rank code (e.g., "LTC" -> "Lieutenant Colonel")
 */
export function getRankFullName(code: string): string {
  return RANK_MAP[code]?.name || code;
}

/**
 * Formats a rank for badge or card display (e.g., "LTC (Lieutenant Colonel)")
 */
export function formatRankDisplay(code: string): string {
  const full = RANK_MAP[code]?.name;
  return full ? `${code} · ${full}` : code;
}

/**
 * Returns military rank badge styling classes
 */
export function getRankBadgeStyle(code: string): { bg: string; text: string; border: string } {
  const rank = RANK_MAP[code];
  if (!rank) {
    return { bg: "bg-slate-100", text: "text-slate-800", border: "border-slate-200" };
  }

  switch (rank.category) {
    case "Commissioned Officers":
      return { bg: "bg-amber-50", text: "text-amber-900", border: "border-amber-300" };
    case "Senior Non-Commissioned Officers (NCO)":
      return { bg: "bg-blue-50", text: "text-blue-900", border: "border-blue-300" };
    case "Junior Enlisted Personnel":
      return { bg: "bg-emerald-50", text: "text-emerald-900", border: "border-emerald-300" };
    case "Reservists & Civilian":
      return { bg: "bg-purple-50", text: "text-purple-900", border: "border-purple-300" };
    default:
      return { bg: "bg-slate-100", text: "text-slate-800", border: "border-slate-200" };
  }
}
