"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function SendRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const group = searchParams.get("group");
    if (group) {
      router.replace(`/dashboard/messaging?tab=send&group=${encodeURIComponent(group)}`);
    } else {
      router.replace("/dashboard/messaging?tab=send");
    }
  }, [router, searchParams]);

  return (
    <div className="p-8 text-center text-xs text-slate-500 font-mono">
      Redirecting to Messaging Hub...
    </div>
  );
}

export default function SendPageRedirect() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500 font-mono">Redirecting...</div>}>
      <SendRedirectContent />
    </Suspense>
  );
}
