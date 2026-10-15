import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { dispatchFcmAlert } from "@/lib/fcm";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { token, title, body: alertBody, soldierName } = body;

    if (!token || typeof token !== "string" || token.length < 20) {
      return NextResponse.json({ error: "Valid FCM device token is required" }, { status: 400 });
    }

    const result = await dispatchFcmAlert({
      tokens: [token],
      title: title || "🚨 10RCDG PUSH SIREN TEST",
      body: alertBody || `Tactical siren & lock-screen alert test for ${soldierName || "Soldier"}. Sound and vibration verified.`,
      sender: "10RCDG HQ Push Test",
      siren: true,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}
