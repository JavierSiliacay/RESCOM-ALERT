"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Send,
  History,
  FileCheck,
  Shield,
  Menu,
  X,
  LogOut,
  Crown,
  Settings,
  AlertTriangle,
  Loader2,
  UserCheck,
  Code2,
  Smartphone,
} from "lucide-react";

export function DashboardNav({
  userEmail,
  userName,
  userImage,
  userRole,
  userRank,
  children,
}: {
  userEmail: string;
  userName: string;
  userImage?: string;
  userRole?: string;
  userRank?: string;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const pathname = usePathname();

  const isDeveloper =
    userRole === "DEVELOPER" ||
    (userEmail && userEmail.toLowerCase().trim() === "siliacay.javier@gmail.com");

  const navItems = [
    { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { label: "Members & Contacts", href: "/dashboard/personnel", icon: Users },
    { label: "Contact Groups", href: "/dashboard/groups", icon: FolderKanban },
    { label: "Messaging", href: "/dashboard/messaging", icon: Send },
    { label: "Authorized Personnel", href: "/dashboard/access", icon: UserCheck },
    { label: "10RCDG RESCOM APP", href: "/dashboard/app", icon: Smartphone },
    ...(isDeveloper
      ? [{ label: "Gateway Settings", href: "/dashboard/settings", icon: Settings }]
      : []),
  ];

  // Reactive access verification: Real-time eviction if access is revoked or suspended
  const liveAuth = useQuery(api.access.checkByEmail, { email: userEmail || "" });

  useEffect(() => {
    if (!userEmail) return;
    const cleanEmail = userEmail.toLowerCase().trim();
    if (cleanEmail === "siliacay.javier@gmail.com") return;

    if (liveAuth !== undefined) {
      if (
        !liveAuth.isAuthorized ||
        liveAuth.user?.status === "SUSPENDED" ||
        liveAuth.user?.status === "REJECTED"
      ) {
        // Immediate real-time force sign-out with appropriate error message
        if (liveAuth.user?.status === "SUSPENDED") {
          const reason = encodeURIComponent(liveAuth.user?.suspendedReason || "Administrative Review");
          const duration = encodeURIComponent(liveAuth.user?.suspendedDuration || "Indefinite");
          const until = encodeURIComponent(String(liveAuth.user?.suspendedUntil || ""));
          signOut({ callbackUrl: `/sign-in?error=AccountSuspended&reason=${reason}&duration=${duration}&until=${until}` });
        } else {
          signOut({ callbackUrl: "/sign-in?error=AccessRevoked" });
        }
      }
    }
  }, [liveAuth, userEmail]);

  const sendHeartbeat = useMutation(api.access.heartbeat);

  // Live Presence Heartbeat (Every 45s & on Focus/Page Navigation)
  useEffect(() => {
    if (!userEmail) return;

    const ping = () => {
      sendHeartbeat({
        email: userEmail,
        name: userName,
        rank: userRank,
        role: userRole as any,
      }).catch(() => {});
    };

    ping();
    const interval = setInterval(ping, 45_000);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        ping();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", ping);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", ping);
    };
  }, [userEmail, userName, userRank, userRole, sendHeartbeat]);

  // 15-Minute Inactivity Auto-Logout Security Guard
  useEffect(() => {
    const INACTIVITY_LIMIT_MS = 15 * 60 * 1000; // 15 minutes
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        signOut({ callbackUrl: "/sign-in" });
      }, INACTIVITY_LIMIT_MS);
    };

    // User activity trigger events
    const activityEvents = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];
    activityEvents.forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    // Start initial timer
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, []);

  const handleConfirmSignOut = async () => {
    setIsSigningOut(true);
    await signOut({ callbackUrl: "/sign-in" });
  };

  return (
    <div className="flex flex-col lg:flex-row h-dvh w-full overflow-hidden bg-[#f8fafc] text-slate-900">
      {/* Mobile Top App Bar */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 z-30 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center -space-x-2 shrink-0">
            <div className="relative w-8 h-8 rounded-full overflow-hidden border border-amber-500/80 ring-2 ring-emerald-100 shadow-xs bg-white z-10 flex items-center justify-center">
              <Image
                src="/rescom-pa-seal.png"
                alt="RESCOM PA"
                fill
                sizes="32px"
                className="object-cover scale-105"
              />
            </div>
            <div className="relative w-8 h-8 rounded-full overflow-hidden border border-amber-500/80 ring-2 ring-emerald-100 shadow-xs bg-white flex items-center justify-center">
              <Image
                src="/rescom-emblem.jpg"
                alt="10RCDG"
                fill
                sizes="32px"
                className="object-cover scale-105"
              />
            </div>
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-slate-900 tracking-tight leading-none">
              <span className="text-emerald-950">RESCOM </span>
              <span className="text-amber-600">ALERT</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">10RCDG RESCOM, PA</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSignOutModal(true)}
            title="Sign Out"
            className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle Menu"
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 transition-opacity"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 lg:w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 shadow-xl lg:shadow-xs transform lg:transform-none lg:static transition-transform duration-200 ease-in-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Desktop Sidebar Header */}
        <div className="p-4 border-b border-slate-200 hidden lg:block">
          <div className="flex items-center gap-3">
            <div className="flex items-center -space-x-2 shrink-0">
              <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-amber-500/80 ring-2 ring-emerald-100 shadow-sm bg-white z-10 flex items-center justify-center">
                <Image
                  src="/rescom-pa-seal.png"
                  alt="RESCOM PA"
                  fill
                  sizes="36px"
                  className="object-cover scale-105"
                />
              </div>
              <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-amber-500/80 ring-2 ring-emerald-100 shadow-sm bg-white flex items-center justify-center">
                <Image
                  src="/rescom-emblem.jpg"
                  alt="10RCDG"
                  fill
                  sizes="36px"
                  className="object-cover scale-105"
                />
              </div>
            </div>
            <div>
              <h2 className="text-sm font-extrabold tracking-wider text-slate-900">
                <span className="text-emerald-950">RESCOM </span>
                <span className="text-amber-600">ALERT</span>
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                10RCDG RESCOM, PA
              </p>
            </div>
          </div>
        </div>

        {/* Mobile Sidebar Close Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between lg:hidden">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center -space-x-2 shrink-0">
              <div className="relative w-8 h-8 rounded-full overflow-hidden border border-amber-500/80 ring-2 ring-emerald-100 shadow-xs bg-white z-10 flex items-center justify-center">
                <Image
                  src="/rescom-pa-seal.png"
                  alt="RESCOM PA"
                  fill
                  sizes="32px"
                  className="object-cover scale-105"
                />
              </div>
              <div className="relative w-8 h-8 rounded-full overflow-hidden border border-amber-500/80 ring-2 ring-emerald-100 shadow-xs bg-white flex items-center justify-center">
                <Image
                  src="/rescom-emblem.jpg"
                  alt="10RCDG"
                  fill
                  sizes="32px"
                  className="object-cover scale-105"
                />
              </div>
            </div>
            <span className="text-sm font-bold text-slate-900">RESCOM ALERT</span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status indicator badge */}
        <div className="px-4 py-2 bg-emerald-50/80 border-b border-emerald-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span className="text-xs font-medium text-emerald-800">
              Connected as
            </span>
          </div>
          {userRole === "DEVELOPER" ? (
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-950 bg-purple-100 px-2 py-0.5 rounded border border-purple-300 shadow-2xs font-mono flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-purple-700 shrink-0" />
              <span>DEVELOPER</span>
            </span>
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-300 shadow-2xs font-mono">
              {userRole || "COMMANDER"}
            </span>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href === "/dashboard/messaging" &&
                (pathname?.startsWith("/dashboard/messaging") ||
                  pathname === "/dashboard/send" ||
                  pathname === "/dashboard/history" ||
                  pathname === "/dashboard/audit"));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? "bg-emerald-800 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? "text-emerald-200" : "text-slate-500"
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer — User Info & Sign Out */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-3">
            {/* User Avatar */}
            {userImage ? (
              <div className="relative w-9 h-9 rounded-full overflow-hidden border border-slate-300 shrink-0">
                <Image
                  src={userImage}
                  alt={userName}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-full bg-emerald-800 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                {userName.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {userName}
                </p>
                {userRole === "COMMANDER" && (
                  <Crown className="w-3 h-3 text-amber-600 shrink-0" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                {userRank || "Personnel Officer"}
              </p>
            </div>

            <button
              onClick={() => setShowSignOutModal(true)}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-[#f8fafc]">
        {children}
      </main>

      {/* Sign-Out Confirmation Modal */}
      {showSignOutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Top Header */}
            <div className="p-5 border-b border-slate-100 flex items-center gap-3.5 bg-slate-50/50">
              <div className="w-10 h-10 rounded-xl bg-amber-100/80 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200">
                <AlertTriangle className="w-5 h-5 text-amber-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  Confirm Sign Out
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  End your current authorized session
                </p>
              </div>
              <button
                onClick={() => !isSigningOut && setShowSignOutModal(false)}
                disabled={isSigningOut}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Personnel Identity Card */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                {userImage ? (
                  <div className="relative w-10 h-10 rounded-full overflow-hidden border border-slate-300 shrink-0">
                    <Image
                      src={userImage}
                      alt={userName}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-emerald-800 text-white font-bold text-sm flex items-center justify-center shrink-0">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {userName}
                    </p>
                    {userRole === "COMMANDER" && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                        COMMANDER
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">
                    {userEmail}
                  </p>
                </div>
              </div>

              {/* Security Advisory */}
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-900 leading-relaxed">
                  Signing out terminates your broadcast access and locks this console until your next Google authentication.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowSignOutModal(false)}
                disabled={isSigningOut}
                className="px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Remain on Duty
              </button>

              <button
                type="button"
                onClick={handleConfirmSignOut}
                disabled={isSigningOut}
                className="px-4 py-2.5 bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center gap-2"
              >
                {isSigningOut ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing Out...
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4" />
                    Confirm Sign Out
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
