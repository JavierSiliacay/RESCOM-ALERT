export interface MilitaryCompany {
  code: string;
  name: string;
  shortName: string;
  description: string;
}

export const PRESET_COMPANIES: MilitaryCompany[] = [
  {
    code: "HHC",
    name: "Headquarters & Headquarters Company",
    shortName: "HHC",
    description: "Command element, staff operations, communications, and logistical support",
  },
  {
    code: "Alpha",
    name: "Alpha Company",
    shortName: "Alpha",
    description: "First line tactical defense & mobilization force",
  },
  {
    code: "Bravo",
    name: "Bravo Company",
    shortName: "Bravo",
    description: "Secondary mobilization, perimeter defense & disaster response",
  },
  {
    code: "Charlie",
    name: "Charlie Company",
    shortName: "Charlie",
    description: "Rapid deployment & civil-military operations auxiliary",
  },
  {
    code: "Delta",
    name: "Delta Company",
    shortName: "Delta",
    description: "Special operations support, reconnaissance & auxiliary reserve",
  },
];

export interface CompanyBadgeStyle {
  bg: string;
  text: string;
  border: string;
  label: string;
}

/**
 * Returns clean styling badges for company pill tags
 */
export function getCompanyBadgeStyle(company?: string): CompanyBadgeStyle | null {
  if (!company || !company.trim()) return null;

  const norm = company.toUpperCase().trim();

  if (norm === "HHC" || norm.includes("HEADQUARTERS")) {
    return {
      bg: "bg-slate-100",
      text: "text-slate-800",
      border: "border-slate-300",
      label: "HHC",
    };
  }

  if (norm === "ALPHA" || norm.startsWith("A ") || norm.includes("ALPHA")) {
    return {
      bg: "bg-emerald-50",
      text: "text-emerald-800",
      border: "border-emerald-300",
      label: "Alpha",
    };
  }

  if (norm === "BRAVO" || norm.startsWith("B ") || norm.includes("BRAVO")) {
    return {
      bg: "bg-indigo-50",
      text: "text-indigo-800",
      border: "border-indigo-300",
      label: "Bravo",
    };
  }

  if (norm === "CHARLIE" || norm.startsWith("C ") || norm.includes("CHARLIE")) {
    return {
      bg: "bg-amber-50",
      text: "text-amber-900",
      border: "border-amber-300",
      label: "Charlie",
    };
  }

  if (norm === "DELTA" || norm.startsWith("D ") || norm.includes("DELTA")) {
    return {
      bg: "bg-purple-50",
      text: "text-purple-800",
      border: "border-purple-300",
      label: "Delta",
    };
  }

  // Fallback for custom company name
  return {
    bg: "bg-zinc-100",
    text: "text-zinc-700",
    border: "border-zinc-300",
    label: company,
  };
}

/**
 * Smart formatting helper to inject company into the unit string
 * for backward-compatible display on older mobile APKs (v1.3.0)
 * without needing an immediate APK re-compilation.
 */
export function formatUnitForMobileDisplay(unit?: string, company?: string): string {
  const cleanUnit = (unit || "").trim();
  const cleanCompany = (company || "").trim();

  if (!cleanCompany) return cleanUnit || "10RCDG HQ";
  if (!cleanUnit) return cleanCompany;

  // Avoid duplicate naming if the unit string already mentions the company
  if (cleanUnit.toLowerCase().includes(cleanCompany.toLowerCase())) {
    return cleanUnit;
  }

  // Display format: "Alpha Coy • 1001st CDC" or "HHC • 10RCDG HQ"
  const compLabel =
    cleanCompany.toUpperCase() === "HHC"
      ? "HHC"
      : cleanCompany.toLowerCase().includes("coy") || cleanCompany.toLowerCase().includes("company")
      ? cleanCompany
      : `${cleanCompany} Coy`;

  return `${compLabel} • ${cleanUnit}`;
}

