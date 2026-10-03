export interface PresenceInfo {
  isOnline: boolean;
  label: string;
  status: "online" | "recent" | "offline";
  dotColor: string;
  badgeBg: string;
  textColor: string;
  borderColor: string;
}

export function getPresenceStatus(lastSeenAt?: number): PresenceInfo {
  if (!lastSeenAt) {
    return {
      isOnline: false,
      label: "Never logged in",
      status: "offline",
      dotColor: "bg-slate-400",
      badgeBg: "bg-slate-50",
      textColor: "text-slate-500",
      borderColor: "border-slate-200",
    };
  }

  const now = Date.now();
  const diffMs = now - lastSeenAt;

  // Online if heartbeat within the last 2.5 minutes (150,000 ms)
  if (diffMs <= 150_000) {
    return {
      isOnline: true,
      label: "Online Now",
      status: "online",
      dotColor: "bg-emerald-500 animate-pulse",
      badgeBg: "bg-emerald-50",
      textColor: "text-emerald-800 font-bold",
      borderColor: "border-emerald-200 shadow-xs",
    };
  }

  // Active within the last hour (e.g. Active 5m ago)
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 60) {
    return {
      isOnline: false,
      label: `Active ${diffMins}m ago`,
      status: "recent",
      dotColor: "bg-rose-500",
      badgeBg: "bg-rose-50",
      textColor: "text-rose-700 font-semibold",
      borderColor: "border-rose-200",
    };
  }

  // Active within 24 hours (e.g. Active 3h ago)
  const diffHours = Math.floor(diffMs / 3_600_000);
  if (diffHours < 24) {
    return {
      isOnline: false,
      label: `Active ${diffHours}h ago`,
      status: "recent",
      dotColor: "bg-rose-500",
      badgeBg: "bg-rose-50",
      textColor: "text-rose-700 font-semibold",
      borderColor: "border-rose-200",
    };
  }

  // Active 1+ days ago
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 1) {
    return {
      isOnline: false,
      label: "Active Yesterday",
      status: "offline",
      dotColor: "bg-slate-400",
      badgeBg: "bg-slate-50",
      textColor: "text-slate-600",
      borderColor: "border-slate-200",
    };
  }

  return {
    isOnline: false,
    label: `Active ${diffDays}d ago`,
    status: "offline",
    dotColor: "bg-slate-400",
    badgeBg: "bg-slate-50",
    textColor: "text-slate-600",
    borderColor: "border-slate-200",
  };
}
