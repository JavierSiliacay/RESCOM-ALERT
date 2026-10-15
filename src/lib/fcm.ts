import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getMessaging, Messaging, MulticastMessage } from "firebase-admin/messaging";
import * as fs from "fs";
import * as path from "path";

let cachedApp: App | null = null;
let cachedMessaging: Messaging | null = null;

function getFirebaseAdmin(): { app: App; messaging: Messaging } | null {
  if (cachedApp && cachedMessaging) {
    return { app: cachedApp, messaging: cachedMessaging };
  }

  try {
    const existingApps = getApps();
    if (existingApps.length > 0) {
      cachedApp = existingApps[0];
      cachedMessaging = getMessaging(cachedApp);
      return { app: cachedApp, messaging: cachedMessaging };
    }

    // Try reading credentials from project root service account file or ENV
    const saPath = path.resolve(process.cwd(), "firebase-service-account.json");
    let credentialData: any = null;

    if (fs.existsSync(saPath)) {
      const raw = fs.readFileSync(saPath, "utf-8");
      credentialData = JSON.parse(raw);
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_B64) {
      const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64, "base64").toString("utf-8");
      credentialData = JSON.parse(decoded);
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      credentialData = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    } else if (
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
    ) {
      credentialData = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      };
    }

    if (!credentialData) {
      console.warn("FCM Dispatcher: No Firebase service account credentials found.");
      return null;
    }

    cachedApp = initializeApp({
      credential: cert(credentialData),
    });
    cachedMessaging = getMessaging(cachedApp);

    return { app: cachedApp, messaging: cachedMessaging };
  } catch (err) {
    console.error("FCM Dispatcher initialization error:", err);
    return null;
  }
}

export interface FcmDispatchOptions {
  tokens: string[];
  title: string;
  body: string;
  alertId?: string;
  sender?: string;
  siren?: boolean;
}

export interface FcmDispatchResult {
  success: boolean;
  totalTokens: number;
  successCount: number;
  failureCount: number;
  invalidTokens: string[];
  error?: string;
}

/**
 * Dispatches high-priority Layer 1 push alert to paired soldier Android devices.
 * Uses pure data-payload with android.priority: 'high' to ensure wake locks and
 * siren triggering even in Doze Mode and lock screens.
 */
export async function dispatchFcmAlert(options: FcmDispatchOptions): Promise<FcmDispatchResult> {
  const { tokens, title, body, alertId = `alert_${Date.now()}`, sender = "10RCDG HQ", siren = true } = options;

  // Filter out invalid/empty tokens or mock prefix tokens
  const validTokens = Array.from(new Set(tokens.filter((t) => t && t.length > 20 && !t.startsWith("fcm_prov_"))));

  if (validTokens.length === 0) {
    return {
      success: true,
      totalTokens: 0,
      successCount: 0,
      failureCount: 0,
      invalidTokens: [],
    };
  }

  const fb = getFirebaseAdmin();
  if (!fb) {
    return {
      success: false,
      totalTokens: validTokens.length,
      successCount: 0,
      failureCount: validTokens.length,
      invalidTokens: [],
      error: "Firebase Admin SDK not initialized",
    };
  }

  try {
    const message: MulticastMessage = {
      tokens: validTokens,
      // CRITICAL: We include both data payload (for background native execution & siren)
      // and android notification configuration (for head-up status bar display)
      data: {
        type: "EMERGENCY_MOBILIZATION",
        alertId,
        sender,
        title,
        message: body,
        siren: siren ? "true" : "false",
        timestamp: Date.now().toString(),
      },
      android: {
        priority: "high",
        ttl: 60 * 60 * 24, // 24 hours
        notification: {
          title: `🚨 ${sender}`,
          body,
          channelId: "10RCDG_EMERGENCY_PUSH_CHANNEL",
          priority: "max",
          sound: "default",
          defaultVibrateTimings: true,
          visibility: "public",
        },
      },
    };

    const response = await fb.messaging.sendEachForMulticast(message);

    const invalidTokens: string[] = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const errCode = resp.error?.code;
        if (
          errCode === "messaging/invalid-registration-token" ||
          errCode === "messaging/registration-token-not-registered"
        ) {
          invalidTokens.push(validTokens[idx]);
        }
      }
    });

    return {
      success: response.successCount > 0 || validTokens.length === 0,
      totalTokens: validTokens.length,
      successCount: response.successCount,
      failureCount: response.failureCount,
      invalidTokens,
    };
  } catch (err: any) {
    console.error("Failed to send multicast FCM alert:", err);
    return {
      success: false,
      totalTokens: validTokens.length,
      successCount: 0,
      failureCount: validTokens.length,
      invalidTokens: [],
      error: err?.message || "FCM transmission error",
    };
  }
}
