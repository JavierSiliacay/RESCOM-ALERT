import Link from "next/link";
import { auth } from "@/auth";
import { ShieldAlert, ArrowLeft, Lock, Terminal } from "lucide-react";
import { SettingsClient } from "./settings-client";

export default async function GatewaySettingsPage() {
  const session = await auth();
  const userEmail = session?.user?.email?.toLowerCase().trim() || "";
  const developerEmail = (
    process.env.DEVELOPER_EMAIL ||
    process.env.COMMANDER_EMAIL ||
    "siliacay.javier@gmail.com"
  )
    .toLowerCase()
    .trim();

  const isDeveloper = userEmail === developerEmail;

  // If not the developer, display the restricted access message
  if (!isDeveloper) {
    return (
      <div className="p-4 sm:p-8 max-w-xl mx-auto min-h-[75vh] flex flex-col items-center justify-center text-center space-y-5 animate-in fade-in duration-200">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center shadow-xs">
          <Lock className="w-8 h-8 text-amber-700" />
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-mono font-bold text-slate-700">
          <Terminal className="w-3.5 h-3.5 text-slate-500" />
          <span>SECURITY LEVEL: RESTRICTED</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Developer Access Required
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed font-medium">
            Only the system developer can access this area.
          </p>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            This console contains critical SMS hardware credentials, API tokens, and cellular gateway bindings reserved for system maintenance.
          </p>
        </div>

        <div className="pt-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  // Developer is authenticated -> render the full Gateway Settings console
  return <SettingsClient />;
}


