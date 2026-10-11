import React from "react";
import { Zap, Siren } from "lucide-react";

/**
 * Official Google Android Bugdroid Head Icon
 */
export function AndroidIcon({
  className = "w-4 h-4",
  color,
}: {
  className?: string;
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={color || "currentColor"}
      className={className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9992.4482.9992.9993 0 .5511-.4482.9997-.9992.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.4116 13.8533 8.081 12 8.081s-3.5902.3306-5.1368.8687L4.841 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.7402h24c-.3432-4.0813-2.6889-7.5535-6.1185-9.4188"
      />
    </svg>
  );
}

/**
 * Classic Keypad / Feature Phone Vector Icon
 */
export function KeypadPhoneIcon({
  className = "w-4 h-4",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Phone Outer Body */}
      <rect x="6" y="2" width="12" height="20" rx="2.5" />
      {/* Upper Screen */}
      <rect
        x="8.5"
        y="4.5"
        width="7"
        height="5.5"
        rx="0.5"
        fill="currentColor"
        fillOpacity="0.22"
        strokeWidth="1.2"
      />
      {/* Navigation Key bar */}
      <line x1="9" y1="11.5" x2="15" y2="11.5" strokeWidth="1.2" />
      {/* Keypad Grid Buttons */}
      <circle cx="9" cy="14" r="0.75" fill="currentColor" strokeWidth="0" />
      <circle cx="12" cy="14" r="0.75" fill="currentColor" strokeWidth="0" />
      <circle cx="15" cy="14" r="0.75" fill="currentColor" strokeWidth="0" />
      <circle cx="9" cy="16.5" r="0.75" fill="currentColor" strokeWidth="0" />
      <circle cx="12" cy="16.5" r="0.75" fill="currentColor" strokeWidth="0" />
      <circle cx="15" cy="16.5" r="0.75" fill="currentColor" strokeWidth="0" />
      <circle cx="9" cy="19" r="0.75" fill="currentColor" strokeWidth="0" />
      <circle cx="12" cy="19" r="0.75" fill="currentColor" strokeWidth="0" />
      <circle cx="15" cy="19" r="0.75" fill="currentColor" strokeWidth="0" />
    </svg>
  );
}

/**
 * Smart Hybrid Transmission Icon (Keypad Phone + Official Android Bugdroid combined)
 */
export function HybridIcon({
  className = "w-3.5 h-3.5",
  keypadColor,
  androidColor = "#3DDC84",
  showPlus = true,
}: {
  className?: string;
  keypadColor?: string;
  androidColor?: string;
  showPlus?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-0.5 shrink-0 align-middle">
      <KeypadPhoneIcon className={className} />
      {showPlus && (
        <span className="text-[9px] font-black text-amber-500 leading-none select-none px-0.5">
          +
        </span>
      )}
      <AndroidIcon className={className} color={androidColor} />
    </span>
  );
}

/**
 * Force SMS / Red Alert Siren Icon
 */
export function ForceSmsIcon({
  className = "w-4 h-4",
}: {
  className?: string;
}) {
  return <Siren className={className} />;
}
