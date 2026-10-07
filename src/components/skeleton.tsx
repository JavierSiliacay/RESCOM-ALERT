import React from "react";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

/**
 * Tactical Pulse Skeleton Loader
 * Clean animated shimmer matching RESCOM ALERT's light government theme.
 */
export function Skeleton({ className = "", ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-slate-200/80 ${className}`}
      {...props}
    />
  );
}

/**
 * Metric/Stat Card Skeleton (e.g. Total Registered, Active Broadcast Numbers)
 */
export function StatCardSkeleton() {
  return (
    <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-7 w-16" />
      </div>
      <Skeleton className="w-10 h-10 rounded-xl" />
    </div>
  );
}

/**
 * Tactical Table Rows Skeleton (e.g. Personnel Roster, Outbox, Audit Logs)
 */
export function TableSkeleton({
  rows = 5,
  cols = 6,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="w-full divide-y divide-slate-100">
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div
          key={rIdx}
          className="flex items-center gap-4 py-4 px-4 sm:px-6 animate-pulse"
        >
          {/* Col 1: Name & Rank / Avatar */}
          <div className="flex items-center gap-3 min-w-[180px] flex-1">
            <Skeleton className="w-11 h-6 rounded-md shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-2.5 w-1/2" />
            </div>
          </div>

          {/* Col 2: Phone */}
          {cols >= 2 && <Skeleton className="h-3.5 w-28 hidden sm:block" />}

          {/* Col 3: Unit */}
          {cols >= 3 && <Skeleton className="h-3.5 w-24 hidden md:block" />}

          {/* Col 4: Group Badge */}
          {cols >= 4 && <Skeleton className="h-5 w-20 rounded-full hidden lg:block" />}

          {/* Col 5: Status Pill */}
          {cols >= 5 && <Skeleton className="h-6 w-16 rounded-full" />}

          {/* Col 6: Action Buttons */}
          {cols >= 6 && (
            <div className="flex items-center gap-2 justify-end">
              <Skeleton className="w-7 h-7 rounded-lg" />
              <Skeleton className="w-7 h-7 rounded-lg" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Enlistment Campaign Card Skeleton
 */
export function CampaignCardSkeleton() {
  return (
    <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
        <Skeleton className="h-8 flex-1 rounded-lg" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Group Card Skeleton
 */
export function GroupCardSkeleton() {
  return (
    <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="w-8 h-8 rounded-lg" />
      </div>
      <Skeleton className="h-3 w-5/6" />
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
    </div>
  );
}
