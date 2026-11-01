import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { dispatchFcmAlert } from "@/lib/fcm";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

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

    // 1. Fetch active push tokens using lightweight query (avoids reading full personnel profiles)
    const convex = new ConvexHttpClient(convexUrl);
    const activeTroops = await convex.query(api.personnel.getActivePushTokens, {
      targetMobileNumbers: Array.isArray(recipients) && recipients.length > 0 ? recipients : undefined,
    });

    const pushTokens = Array.from(new Set(activeTroops.map((t: any) => t.fcmToken)));

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

    // Background auto-cleanup of dead tokens reported by Firebase
    if (result.invalidTokens && result.invalidTokens.length > 0) {
      convex
        .mutation(api.personnel.pruneInvalidFcmTokens, {
          invalidTokens: result.invalidTokens,
        })
        .catch((err) => console.error("Failed to prune invalid FCM tokens:", err));
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Error in /api/fcm/send:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
