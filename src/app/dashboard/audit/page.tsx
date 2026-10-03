"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuditPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/messaging?tab=audit");
  }, [router]);

  return (
    <div className="p-8 text-center text-xs text-slate-500 font-mono">
      Redirecting to Messaging Audit Logs...
    </div>
  );
}
