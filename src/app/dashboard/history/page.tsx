"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HistoryPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/messaging?tab=outbox");
  }, [router]);

  return (
    <div className="p-8 text-center text-xs text-slate-500 font-mono">
      Redirecting to Messaging Outbox...
    </div>
  );
}
