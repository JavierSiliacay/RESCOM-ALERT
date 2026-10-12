"use client";

import React from "react";

export interface RankInsigniaProps {
  rank: string;
  size?: number; // default 16
  showBadgePill?: boolean;
  className?: string;
}

/**
 * Official Philippine Army (AFP) Vector Rank Insignia Engine.
 * Implements authentic military heraldry:
 * - Junior Enlisted: Chevrons (PVT: 1, CPL: 2) & Rocker (PFC: 1 + Rocker)
 * - Senior NCO: Chevrons + Rocker arcs (SGT, SSG, TSG, MSG, SMS, CMS, FCMS)
 * - Company Grade Officers: Golden Triangular Pips / Anahaw (2LT: 1, 1LT: 2, CPT: 3)
 * - Field Grade Officers: Golden 8-Ray Philippine Revolutionary Suns (MAJ: 1, LTC: 2, COL: 3)
 * - General Officers: Silver 5-Pointed Stars (BGEN: 1, MGEN: 2, LTGEN: 3, GEN: 4)
 * - Reserve Force / Auxiliary: Shield insignia (RES, CDT, CIV)
 */
export function RankInsignia({
  rank,
  size = 16,
  showBadgePill = false,
  className = "",
}: RankInsigniaProps) {
  const code = (rank || "PVT").toUpperCase().trim();

  // Tier classification
  const isEnlisted = ["PVT", "PFC", "CPL"].includes(code);
  const isNCO = ["SGT", "SSG", "TSG", "MSG", "SMS", "CMS", "FCMS"].includes(code);
  const isCompanyGrade = ["2LT", "1LT", "CPT"].includes(code);
  const isFieldGrade = ["MAJ", "LTC", "COL"].includes(code);
  const isGeneral = ["BGEN", "MGEN", "LTGEN", "GEN"].includes(code);
  const isOfficer = isCompanyGrade || isFieldGrade;

  // Authentic tactical color tokens
  const strokeColor = isGeneral
    ? "#475569" // Silver/Slate for Star
    : isOfficer
    ? "#b45309" // Tactical Gold / Amber (PA Officer Insignia)
    : isNCO
    ? "#1d4ed8" // Tactical Blue (PA NCO Insignia)
    : isEnlisted
    ? "#047857" // Army Emerald / Olive Green
    : "#6b21a8"; // Reserve Purple

  // Render SVG Symbol according to Philippine Army heraldry
  const renderGeometry = () => {
    switch (code) {
      // --- JUNIOR ENLISTED ---
      case "PVT":
        // 1 Chevron pointing up
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={strokeColor}>
            <path
              d="M4 15 L12 8 L20 15"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );

      case "PFC":
        // 1 Chevron pointing up + 1 Rocker arc below
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={strokeColor}>
            <path
              d="M4 12 L12 6 L20 12"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M4.5 17 C7.5 21, 16.5 21, 19.5 17"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
          </svg>
        );

      case "CPL":
        // 2 Chevrons pointing up
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={strokeColor}>
            <path
              d="M4 11 L12 5 L20 11"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M4 17 L12 11 L20 17"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );

      // --- SENIOR NON-COMMISSIONED OFFICERS (NCO) ---
      case "SGT":
        // 3 Chevrons pointing up
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={strokeColor}>
            <path d="M4 9 L12 4 L20 9" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 14 L12 9 L20 14" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 19 L12 14 L20 19" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );

      case "SSG":
        // 3 Chevrons pointing up + 1 Rocker
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={strokeColor}>
            <path d="M4 7 L12 3 L20 7" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 11 L12 7 L20 11" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 15 L12 11 L20 15" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 19 C8 22.5, 16 22.5, 19 19" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        );

      case "TSG":
        // 3 Chevrons + 2 Rockers
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={strokeColor}>
            <path d="M4 6 L12 2.5 L20 6" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 10 L12 6.5 L20 10" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 14 L12 10.5 L20 14" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 17.5 C8 20.5, 16 20.5, 19 17.5" strokeWidth="2" strokeLinecap="round" />
            <path d="M6 20.5 C8.5 23, 15.5 23, 18 20.5" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );

      case "MSG":
      case "SMS":
        // 3 Chevrons + 3 Rockers
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={strokeColor}>
            <path d="M4 5 L12 2 L20 5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 8.5 L12 5.5 L20 8.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 12 L12 9 L20 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 15.5 C8 18, 16 18, 19 15.5" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M5.5 18 C8.5 20.5, 15.5 20.5, 18.5 18" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M6 20.5 C8.5 23, 15.5 23, 18 20.5" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        );

      case "CMS":
      case "FCMS":
        // 3 Chevrons + 1 Center Pip/Diamond + 3 Rockers
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={strokeColor}>
            <path d="M4 5 L12 2 L20 5" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 8.5 L12 5.5 L20 8.5" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            <polygon points="12,10 14,13 12,16 10,13" fill={strokeColor} stroke="none" />
            <path d="M5 17.5 C8 20, 16 20, 19 17.5" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M6 20.5 C8.5 23, 15.5 23, 18 20.5" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        );

      // --- COMPANY GRADE OFFICERS (Triangular Pips / Anahaw) ---
      case "2LT":
        // 1 Golden Triangular Pip
        return (
          <svg viewBox="0 0 24 24" width={size} height={size}>
            <polygon points="12,4 5,19 19,19" fill={strokeColor} />
            <polygon points="12,7 8,17 16,17" fill="#ffffff" fillOpacity="0.25" />
          </svg>
        );

      case "1LT":
        // 2 Golden Triangular Pips side-by-side
        return (
          <svg viewBox="0 0 24 24" width={size} height={size}>
            <polygon points="7,5 2,18 12,18" fill={strokeColor} />
            <polygon points="17,5 12,18 22,18" fill={strokeColor} />
          </svg>
        );

      case "CPT":
        // 3 Golden Triangular Pips (Pyramid Formation)
        return (
          <svg viewBox="0 0 24 24" width={size} height={size}>
            <polygon points="12,2 8,11 16,11" fill={strokeColor} />
            <polygon points="6,12 2,21 10,21" fill={strokeColor} />
            <polygon points="18,12 14,21 22,21" fill={strokeColor} />
          </svg>
        );

      // --- FIELD GRADE OFFICERS (8-Ray Philippine Revolutionary Suns) ---
      case "MAJ":
        // 1 Golden 8-Ray Sun
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill={strokeColor}>
            <circle cx="12" cy="12" r="4.2" stroke={strokeColor} strokeWidth="1" />
            <circle cx="12" cy="12" r="2.2" fill="#ffffff" fillOpacity="0.3" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <line
                key={deg}
                x1="12"
                y1="3"
                x2="12"
                y2="6.5"
                stroke={strokeColor}
                strokeWidth="2"
                strokeLinecap="round"
                transform={`rotate(${deg} 12 12)`}
              />
            ))}
          </svg>
        );

      case "LTC":
        // 2 Golden 8-Ray Suns
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill={strokeColor}>
            {/* Sun 1 Left */}
            <circle cx="7" cy="12" r="2.8" />
            {[0, 90, 180, 270].map((deg) => (
              <line
                key={`s1-${deg}`}
                x1="7"
                y1="5.5"
                x2="7"
                y2="7.5"
                stroke={strokeColor}
                strokeWidth="1.6"
                transform={`rotate(${deg} 7 12)`}
              />
            ))}
            {/* Sun 2 Right */}
            <circle cx="17" cy="12" r="2.8" />
            {[0, 90, 180, 270].map((deg) => (
              <line
                key={`s2-${deg}`}
                x1="17"
                y1="5.5"
                x2="17"
                y2="7.5"
                stroke={strokeColor}
                strokeWidth="1.6"
                transform={`rotate(${deg} 17 12)`}
              />
            ))}
          </svg>
        );

      case "COL":
        // 3 Golden 8-Ray Suns
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill={strokeColor}>
            {/* Sun Top */}
            <circle cx="12" cy="6.5" r="2.5" />
            <line x1="12" y1="2" x2="12" y2="3.5" stroke={strokeColor} strokeWidth="1.4" />
            <line x1="12" y1="9.5" x2="12" y2="11" stroke={strokeColor} strokeWidth="1.4" />
            {/* Sun Bottom-Left */}
            <circle cx="6.5" cy="17" r="2.5" />
            <line x1="6.5" y1="12.5" x2="6.5" y2="14" stroke={strokeColor} strokeWidth="1.4" />
            <line x1="6.5" y1="20" x2="6.5" y2="21.5" stroke={strokeColor} strokeWidth="1.4" />
            {/* Sun Bottom-Right */}
            <circle cx="17.5" cy="17" r="2.5" />
            <line x1="17.5" y1="12.5" x2="17.5" y2="14" stroke={strokeColor} strokeWidth="1.4" />
            <line x1="17.5" y1="20" x2="17.5" y2="21.5" stroke={strokeColor} strokeWidth="1.4" />
          </svg>
        );

      // --- GENERAL OFFICERS (5-Pointed Stars) ---
      case "BGEN":
        // 1 Star
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill={strokeColor}>
            <polygon points="12,2 15,8.8 22.5,9.5 17,14.5 18.5,22 12,18 5.5,22 7,14.5 1.5,9.5 9,8.8" />
          </svg>
        );

      case "MGEN":
        // 2 Stars
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill={strokeColor}>
            <polygon points="7,5 8.8,9.5 13.5,10 10,13.5 11,18.5 7,16 3,18.5 4,13.5 0.5,10 5.2,9.5" />
            <polygon points="17,5 18.8,9.5 23.5,10 20,13.5 21,18.5 17,16 13,18.5 14,13.5 10.5,10 15.2,9.5" />
          </svg>
        );

      case "LTGEN":
      case "GEN":
        // Multi-Star Cluster
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill={strokeColor}>
            <polygon points="12,2 13.5,5.8 17.5,6.2 14.5,9 15.5,13 12,11 8.5,13 9.5,9 6.5,6.2 10.5,5.8" />
            <polygon points="6,11 7.2,14.3 10.5,14.6 8,17 8.8,20.2 6,18.6 3.2,20.2 4,17 1.5,14.6 4.8,14.3" />
            <polygon points="18,11 19.2,14.3 22.5,14.6 20,17 20.8,20.2 18,18.6 15.2,20.2 16,17 13.5,14.6 16.8,14.3" />
          </svg>
        );

      // --- DEFAULT / RESERVISTS / CIVILIAN ---
      default:
        // Tactical Defense Shield
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={strokeColor}>
            <path
              d="M12 3 L5 6 V12 C5 16.5 8 20 12 21 C16 20 19 16.5 19 12 V6 Z"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="12" r="2.5" fill={strokeColor} stroke="none" />
          </svg>
        );
    }
  };

  const badgeContent = (
    <span className={`inline-flex items-center justify-center shrink-0 ${className}`}>
      {renderGeometry()}
    </span>
  );

  if (!showBadgePill) {
    return badgeContent;
  }

  // Tactical badge pill color styles
  const pillStyle = isGeneral
    ? "bg-slate-100 text-slate-800 border-slate-300"
    : isOfficer
    ? "bg-amber-50 text-amber-900 border-amber-300"
    : isNCO
    ? "bg-blue-50 text-blue-900 border-blue-300"
    : isEnlisted
    ? "bg-emerald-50 text-emerald-900 border-emerald-300"
    : "bg-purple-50 text-purple-900 border-purple-300";

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border font-mono font-bold text-[11px] shadow-2xs uppercase tracking-wider ${pillStyle} ${className}`}
    >
      {badgeContent}
      <span>{code}</span>
    </span>
  );
}
