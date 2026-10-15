import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { dispatchFcmAlert } from "@/lib/fcm";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "https://dazzling-whale-200.convex.cloud";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { recipients, message, title, sender } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    // 1. Fetch live troops from Convex to obtain their current active FCM tokens
    const convex = new ConvexHttpClient(convexUrl);
    const allTroops = await convex.query(api.personnel.list);

    let pushTokens: string[] = [];

    if (Array.isArray(recipients) && recipients.length > 0) {
      const cleanSet = new Set(recipients.map((r: string) => r.replace(/\D/g, "").slice(-10)));
      allTroops.forEach((t: any) => {
        const digits = (t.mobileNumber || "").replace(/\D/g, "").slice(-10);
        if (cleanSet.has(digits) && t.fcmToken) {
          pushTokens.push(t.fcmToken);
        }
      });
    } else {
      // Broadcast to all troops with active tokens
      allTroops.forEach((t: any) => {
        if (t.fcmToken) {
          pushTokens.push(t.fcmToken);
        }
      });
    }

    // Deduplicate
    pushTokens = Array.from(new Set(pushTokens));

    if (pushTokens.length === 0) {
      return NextResponse.json({
        success: true,
        totalTokens: 0,
        successCount: 0,
        failureCount: 0,
        message: "No registered Android app devices found for these recipients.",
      });
    }

    const result = await dispatchFcmAlert({
      tokens: pushTokens,
      title: title ? `10RCDG: ${title}` : "🚨 10RCDG EMERGENCY ALERT",
      body: message.trim(),
      sender: sender || "10RCDG Tactical HQ",
      siren: true,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Error in /api/fcm/send:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
