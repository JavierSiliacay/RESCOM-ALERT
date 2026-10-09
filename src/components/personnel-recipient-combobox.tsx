"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Search, UserCheck, Smartphone, X, Plus, Users } from "lucide-react";
import {
  sanitizePhMobileInput,
  formatPhMobileDisplay,
  isSamePhMobileNumber,
  matchesPhMobileSearch,
} from "@/lib/sms";

export interface RecipientChip {
  id?: string;
  name?: string;
  rank?: string;
  unit?: string;
  number: string;
}

interface PersonnelRecipientComboboxProps {
  recipients: RecipientChip[];
  onChange: (recipients: RecipientChip[]) => void;
  personnel: Array<{
    _id: string;
    firstName: string;
    lastName: string;
    rank?: string;
    unit?: string;
    groupName?: string;
    mobileNumber: string;
    status: string;
  }>;
  placeholder?: string;
}

/**
 * Highlight matching query characters with subtle emerald mark.
 * Supports cross-matching 09... and +639... formats with flexible spacing.
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
          const isMatch = tokenPatterns.some((pattern) =>
            new RegExp(`^${pattern}$`, "gi").test(part)
          );
          return isMatch ? (
            <mark
              key={index}
              className="bg-emerald-200 text-emerald-950 font-extrabold px-1 py-0.5 rounded-sm"
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

export function PersonnelRecipientCombobox({
  recipients,
  onChange,
  personnel,
  placeholder = "Type soldier name, rank, or mobile number...",
}: PersonnelRecipientComboboxProps) {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter personnel based on typed query
  const query = inputValue.trim().toLowerCase();
  const cleanQueryDigits = query.replace(/\D/g, "");

  const filteredPersonnel = useMemo(() => {
    if (!query) return [];

    return personnel
      .filter((p) => {
        // Exclude if already selected (handles 09 vs +639)
        const isAlreadyAdded = recipients.some((r) =>
          isSamePhMobileNumber(r.number, p.mobileNumber)
        );
        if (isAlreadyAdded) return false;

        const fullName = `${p.rank || ""} ${p.firstName} ${p.lastName} ${p.lastName}, ${p.firstName}`.toLowerCase();
        const unit = (p.unit || p.groupName || "").toLowerCase();

        const matchName = fullName.includes(query);
        const matchUnit = unit.includes(query);
        const matchPhone = matchesPhMobileSearch(p.mobileNumber, query);

        return matchName || matchUnit || matchPhone;
      })
      .slice(0, 8); // Top 8 suggestions
  }, [personnel, query, recipients]);

  // Determine if typed input looks like an unlisted valid raw phone number
  const looksLikeRawNumber = useMemo(() => {
    if (cleanQueryDigits.length >= 7 && cleanQueryDigits.length <= 13) {
      // If number matches a registered soldier in the roster, don't show "Add Direct Number"
      const matchesRosterSoldier = personnel.some((p) =>
        isSamePhMobileNumber(p.mobileNumber, inputValue)
      );
      if (matchesRosterSoldier) return false;

      // Check if already in recipient list
      const isAlreadyAdded = recipients.some((r) =>
        isSamePhMobileNumber(r.number, inputValue)
      );
      return !isAlreadyAdded;
    }
    return false;
  }, [cleanQueryDigits, inputValue, personnel, recipients]);

  // Total selectable items in dropdown (suggestions + optional raw number action)
  const totalItems = filteredPersonnel.length + (looksLikeRawNumber ? 1 : 0);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query]);

  // Auto-scroll highlighted item into view
  useEffect(() => {
    if (dropdownRef.current && isOpen) {
      const activeEl = dropdownRef.current.querySelector(`[data-index="${highlightedIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  const addSoldier = (soldier: (typeof personnel)[number]) => {
    const chip: RecipientChip = {
      id: soldier._id,
      name: `${soldier.firstName} ${soldier.lastName}`,
      rank: soldier.rank,
      unit: soldier.unit || soldier.groupName,
      number: formatPhMobileDisplay(soldier.mobileNumber),
    };
    onChange([...recipients, chip]);
    setInputValue("");
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const addRawNumber = (raw: string) => {
    const sanitized = sanitizePhMobileInput(raw.trim());
    if (!sanitized) return;

    // Check if this number happens to match a registered soldier (09 vs +639)
    const matched = personnel.find((p) => isSamePhMobileNumber(p.mobileNumber, raw));

    if (matched) {
      addSoldier(matched);
      return;
    }

    const isAlreadyAdded = recipients.some((r) =>
      isSamePhMobileNumber(r.number, raw)
    );
    if (!isAlreadyAdded) {
      onChange([...recipients, { number: sanitized }]);
    }

    setInputValue("");
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const removeRecipient = (indexToRemove: number) => {
    onChange(recipients.filter((_, idx) => idx !== indexToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen && totalItems > 0) {
        setIsOpen(true);
        setHighlightedIndex(0);
      } else if (totalItems > 0) {
        setHighlightedIndex((prev) => (prev + 1) % totalItems);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (totalItems > 0) {
        setHighlightedIndex((prev) => (prev - 1 + totalItems) % totalItems);
      }
    } else if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (isOpen && totalItems > 0) {
        if (highlightedIndex < filteredPersonnel.length) {
          addSoldier(filteredPersonnel[highlightedIndex]);
        } else if (looksLikeRawNumber) {
          addRawNumber(inputValue);
        }
      } else if (inputValue.trim()) {
        addRawNumber(inputValue);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "Backspace" && !inputValue && recipients.length > 0) {
      removeRecipient(recipients.length - 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text");
    if (!pasted) return;

    // If pasted string contains multiple numbers or commas
    const tokens = pasted.split(/[\r\n,;\s]+/).map((t) => t.trim()).filter(Boolean);
    if (tokens.length > 1) {
      e.preventDefault();
      const newRecipients = [...recipients];

      for (const token of tokens) {
        const cleanDigits = token.replace(/\D/g, "");
        if (cleanDigits.length < 7) continue;

        const isAlreadyAdded = newRecipients.some((r) =>
          isSamePhMobileNumber(r.number, token)
        );
        if (isAlreadyAdded) continue;

        const matched = personnel.find((p) => isSamePhMobileNumber(p.mobileNumber, token));
        if (matched) {
          newRecipients.push({
            id: matched._id,
            name: `${matched.firstName} ${matched.lastName}`,
            rank: matched.rank,
            unit: matched.unit || matched.groupName,
            number: formatPhMobileDisplay(matched.mobileNumber),
          });
        } else {
          newRecipients.push({
            number: formatPhMobileDisplay(token),
          });
        }
      }

      onChange(newRecipients);
      setInputValue("");
    }
  };

  return (
    <div ref={containerRef} className="space-y-1.5 relative">
      {/* Header with Counter and Clear All */}
      <div className="flex items-center justify-between text-xs">
        <label className="font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-emerald-700" />
          <span>Select Recipients</span>
        </label>
        <div className="flex items-center gap-2">
          {recipients.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[11px] font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
            >
              Clear All
            </button>
          )}
          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-mono">
            {recipients.length} {recipients.length === 1 ? "Selected" : "Selected"}
          </span>
        </div>
      </div>

      {/* Main Combobox Tag Input Frame */}
      <div
        onClick={() => inputRef.current?.focus()}
        className="p-2 bg-slate-50 border border-slate-200 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/20 rounded-xl transition-all flex flex-wrap items-center gap-1.5 min-h-[46px] cursor-text"
      >
        {recipients.map((item, idx) => (
          <span
            key={`${item.number}-${idx}`}
            className={`inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 text-xs font-medium rounded-full shadow-2xs transition-all ${
              item.name
                ? "bg-emerald-50 text-emerald-950 border border-emerald-300"
                : "bg-slate-200 text-slate-800 border border-slate-300"
            }`}
            title={`${item.rank ? item.rank + " " : ""}${item.name || "Direct Number"} (${item.unit || "Direct"}) · ${item.number}`}
          >
            {item.name ? (
              <>
                {item.rank && (
                  <span className="text-[9px] font-black uppercase font-mono px-1 py-0.5 bg-emerald-200/90 text-emerald-900 rounded">
                    {item.rank}
                  </span>
                )}
                <span className="font-bold text-xs truncate max-w-[130px] sm:max-w-[160px]">
                  {item.name}
                </span>
                <span className="text-[10px] font-mono text-emerald-700/90 hidden sm:inline">
                  · {item.number}
                </span>
              </>
            ) : (
              <>
                <Smartphone className="w-3 h-3 text-slate-500" />
                <span className="font-mono text-xs font-semibold">{item.number}</span>
              </>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeRecipient(idx);
              }}
              className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-slate-300/80 text-slate-500 hover:text-slate-900 cursor-pointer transition-colors"
              title="Remove recipient"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}

        {/* Input */}
        <div className="flex-1 min-w-[190px] flex items-center gap-1.5">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => {
              if (inputValue.trim() && totalItems > 0) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={recipients.length === 0 ? placeholder : "Add another soldier or mobile number..."}
            className="w-full bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none py-1 font-medium"
          />
        </div>
      </div>

      {/* Autocomplete Dropdown Popover */}
      {isOpen && totalItems > 0 && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-40 max-h-64 overflow-y-auto divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header guidance */}
          <div className="p-2 bg-slate-50/90 text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Search className="w-3 h-3 text-slate-400" />
              Roster Matches ({filteredPersonnel.length})
            </span>
            <span className="font-normal font-sans text-slate-400">Use ↑↓ keys and press Enter</span>
          </div>

          {/* Personnel Matches */}
          {filteredPersonnel.map((person, idx) => {
            const isHighlighted = highlightedIndex === idx;
            return (
              <div
                key={person._id}
                data-index={idx}
                onMouseEnter={() => setHighlightedIndex(idx)}
                onClick={() => addSoldier(person)}
                className={`p-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                  isHighlighted ? "bg-emerald-50 text-emerald-950" : "hover:bg-slate-50 text-slate-800"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 font-bold text-xs shadow-2xs font-mono">
                    {person.rank || "SOL"}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate flex items-center gap-1.5">
                      <span>{person.rank}</span>
                      <HighlightMatch
                        text={`${person.firstName} ${person.lastName}`}
                        query={inputValue}
                      />
                    </div>
                    <div className="text-[10px] text-slate-500 truncate mt-0.5">
                      {person.unit || person.groupName || "10RCDG Personnel"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                    <HighlightMatch
                      text={formatPhMobileDisplay(person.mobileNumber)}
                      query={inputValue}
                    />
                  </span>
                  <span className={`p-1 rounded-lg text-xs font-bold flex items-center gap-0.5 ${
                    isHighlighted ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-800"
                  }`}>
                    <Plus className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}

          {/* Option to Add Raw Unlisted Mobile Number */}
          {looksLikeRawNumber && (
            <div
              data-index={filteredPersonnel.length}
              onMouseEnter={() => setHighlightedIndex(filteredPersonnel.length)}
              onClick={() => addRawNumber(inputValue)}
              className={`p-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors border-t border-slate-200 bg-amber-50/50 ${
                highlightedIndex === filteredPersonnel.length
                  ? "bg-amber-100/70 text-amber-950"
                  : "hover:bg-amber-50 text-slate-800"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <Smartphone className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    Add Direct Number (Not in Roster)
                  </div>
                  <div className="text-[10px] text-slate-500">
                    External phone number transmission
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-mono font-bold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded-md border border-amber-300">
                  {formatPhMobileDisplay(inputValue)}
                </span>
                <span className="px-2 py-1 rounded-lg text-[10px] font-extrabold uppercase bg-amber-600 text-white">
                  Add +
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-[11px] text-slate-400">
        Type soldier names, ranks (e.g. "CPT", "Javier"), or mobile numbers. Press Enter or click to select.
      </p>
    </div>
  );
}
