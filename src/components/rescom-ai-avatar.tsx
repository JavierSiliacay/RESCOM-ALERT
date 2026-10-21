"use client";

import React from "react";
import Image from "next/image";

interface RescomAiAvatarProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  variant?: "mascot" | "seal";
  shape?: "circle" | "rounded";
}

const SIZES = {
  xs: { px: 28, class: "w-7 h-7" },
  sm: { px: 36, class: "w-9 h-9" },
  md: { px: 44, class: "w-11 h-11" },
  lg: { px: 56, class: "w-14 h-14" },
  xl: { px: 68, class: "w-[68px] h-[68px]" },
  "2xl": { px: 96, class: "w-24 h-24" },
};

export const RESCOM_AI_CONFIG = {
  name: "RESCOM AI",
  badgeTitle: "BASIC ROTC & MILITARY GUIDE",
  roleDescription: "10RCDG Military Science Intelligence Reference",
  mascotSrc: "/rescom-ai-mascot.jpg",
  sealSrc: "/rescom-ai-seal.jpg",
};

export function RescomAiAvatar({
  size = "md",
  className = "",
  variant = "mascot",
  shape = "circle",
}: RescomAiAvatarProps) {
  const s = SIZES[size] || SIZES.md;
  const src = variant === "mascot" ? RESCOM_AI_CONFIG.mascotSrc : RESCOM_AI_CONFIG.sealSrc;
  const shapeClass = shape === "circle" ? "rounded-full" : "rounded-xl";

  return (
    <div
      className={`relative ${s.class} ${shapeClass} overflow-hidden border-2 border-emerald-600/30 bg-white shadow-xs shrink-0 ring-1 ring-emerald-500/20 ${className}`}
    >
      <Image
        src={src}
        alt={RESCOM_AI_CONFIG.name}
        fill
        sizes={`${s.px}px`}
        className="object-cover"
        priority={size === "lg" || size === "xl" || size === "2xl"}
      />
    </div>
  );
}
