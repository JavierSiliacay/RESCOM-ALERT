"use client";

import { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Check, X } from "lucide-react";
import {
  RANK_GROUPS,
  ALL_MILITARY_RANKS,
  getRankBadgeStyle,
  MilitaryRank,
} from "@/lib/military-ranks";

interface RankSearchSelectProps {
  value: string;
  onChange: (rankCode: string) => void;
  className?: string;
  required?: boolean;
}

/**
 * Highlight matching words/characters with a light-green badge
 */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  const trimmed = query.trim();
  if (!trimmed) {
    return <span>{text}</span>;
  }

  // Escape regex special characters
  const escapedQuery = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escapedQuery})`, "gi");
  const parts = text.split(regex);

  return (
    <span>
      {parts.map((part, index) =>
        part.toLowerCase() === trimmed.toLowerCase() ? (
          <mark
            key={index}
            className="bg-emerald-200 text-emerald-950 font-extrabold px-1 py-0.5 rounded-sm shadow-2xs"
          >
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </span>
  );
}

export function RankSearchSelect({
  value,
  onChange,
  className = "",
}: RankSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedRank = ALL_MILITARY_RANKS.find((r) => r.code === value) || {
    code: value,
    name: value,
    category: "Junior Enlisted Personnel" as const,
  };

  const badge = getRankBadgeStyle(selectedRank.code);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter ranks based on string matching (matches code OR full title)
  const query = searchQuery.toLowerCase().trim();

  const filteredGroups = RANK_GROUPS.map((group) => {
    const matchedRanks = group.ranks.filter((r) => {
      if (!query) return true;
      const codeMatch = r.code.toLowerCase().includes(query);
      const nameMatch = r.name.toLowerCase().includes(query);
      return codeMatch || nameMatch;
    });
    return {
      ...group,
      ranks: matchedRanks,
    };
  }).filter((group) => group.ranks.length > 0);

  const totalMatches = filteredGroups.reduce((acc, g) => acc + g.ranks.length, 0);

  const handleSelect = (rank: MilitaryRank) => {
    onChange(rank.code);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleOpen = () => {
    setIsOpen(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleOpen}
        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-emerald-600 rounded-xl text-left flex items-center justify-between gap-2 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white cursor-pointer group"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold border font-mono shrink-0 ${badge.bg} ${badge.text} ${badge.border}`}
          >
            {selectedRank.code}
          </span>
          <span className="text-xs font-semibold text-slate-900 truncate">
            {selectedRank.name}
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Searchable Dropdown Modal */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 min-w-[280px]">
          {/* Search Input Bar */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/80">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type rank (e.g., PVT, Captain, SGT)..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600 font-medium placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 px-1">
              <span>Instant String Match</span>
              <span>
                {totalMatches} {totalMatches === 1 ? "match" : "matches"}
              </span>
            </div>
          </div>

          {/* Grouped Rank Options List */}
          <div className="max-h-60 overflow-y-auto p-1.5 divide-y divide-slate-100">
            {filteredGroups.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No military rank matching <span className="font-bold text-slate-600">"{searchQuery}"</span>
              </div>
            ) : (
              filteredGroups.map((group) => (
                <div key={group.groupName} className="py-1.5 first:pt-0 last:pb-0">
                  <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 bg-slate-50/70 rounded-md mb-1">
                    {group.groupName}
                  </div>
                  <div className="space-y-0.5">
                    {group.ranks.map((r) => {
                      const isSelected = r.code === value;
                      const rBadge = getRankBadgeStyle(r.code);
                      return (
                        <button
                          key={r.code}
                          type="button"
                          onClick={() => handleSelect(r)}
                          className={`w-full px-2.5 py-1.5 rounded-lg text-left flex items-center justify-between gap-2 transition-colors cursor-pointer text-xs ${
                            isSelected
                              ? "bg-emerald-50 text-emerald-900 font-bold"
                              : "hover:bg-slate-100 text-slate-800"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold border font-mono shrink-0 ${rBadge.bg} ${rBadge.text} ${rBadge.border}`}
                            >
                              <HighlightMatch text={r.code} query={searchQuery} />
                            </span>
                            <span className="truncate">
                              <HighlightMatch text={r.name} query={searchQuery} />
                            </span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
