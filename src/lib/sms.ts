export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  totalRecipients: number;
  successfulRecipients: string[];
  failedRecipients: string[];
  error?: string;
  mode: "LIVE" | "SIMULATION";
}

export interface SmsGatewayConfig {
  apiKey: string;
  deviceId: string;
  senderPrefix: string;
  status: "ONLINE" | "STANDBY" | "OFFLINE";
  phoneModel: string;
  batteryLevel: number;
  simCarrier: string;
  simSubscriptionId: number;
}

export const DEFAULT_GATEWAY_CONFIG: SmsGatewayConfig = {
  apiKey: process.env.NEXT_PUBLIC_TEXTBEE_API_KEY || "",
  deviceId: process.env.NEXT_PUBLIC_TEXTBEE_DEVICE_ID || "",
  senderPrefix: "[10RCDG ALERT]",
  status: "ONLINE",
  phoneModel: "Infinix X6711 (10RCDG Primary Gateway)",
  batteryLevel: 86,
  simCarrier: "SIM 1 (TNT) / SIM 2 (TM)",
  simSubscriptionId: Number(process.env.NEXT_PUBLIC_TEXTBEE_SIM_ID || "1"),
};

/**
 * Formats a Philippine mobile number with readable spacing:
 * - 09978379342 -> 0997 837 9342 (4-3-4)
 * - +639759071669 -> +63 975 907 1669 (+63 3-3-4)
 */
export function formatPhMobileDisplay(value: string): string {
  if (!value) return "";
  const clean = value.replace(/[^\d+]/g, "");

  if (clean.startsWith("+63")) {
    const digits = clean.slice(3).replace(/\D/g, "").slice(0, 10);
    if (digits.length === 0) return "+63 ";
    if (digits.length <= 3) return `+63 ${digits}`;
    if (digits.length <= 6) return `+63 ${digits.slice(0, 3)} ${digits.slice(3)}`;
    return `+63 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
  } else if (clean.startsWith("639")) {
    const digits = clean.slice(2).replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 3) return `+63 ${digits}`;
    if (digits.length <= 6) return `+63 ${digits.slice(0, 3)} ${digits.slice(3)}`;
    return `+63 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
  } else if (clean.startsWith("09")) {
    const digits = clean.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`;
  } else if (clean.startsWith("+")) {
    return clean.slice(0, 17);
  } else if (clean.startsWith("9")) {
    const digits = ("0" + clean).replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`;
  }

  // Fallback for general typing
  const digits = clean.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`;
}

/**
 * Sanitizes user typing in mobile input fields and automatically formats with spaces
 */
export function sanitizePhMobileInput(value: string): string {
  return formatPhMobileDisplay(value);
}

/**
 * Strips all spaces, dashes, and parentheses to get the raw unspaced digits
 */
export function stripPhoneFormatting(value: string): string {
  return value.replace(/[^\d+]/g, "");
}

/**
 * Validates and converts any standard Philippine mobile number to canonical +639XXXXXXXXX
 */
export function formatPhMobileNumber(raw: string): string | null {
  const clean = raw.replace(/[^\d+]/g, "");
  
  // +639XXXXXXXXX (13 chars)
  if (/^\+639\d{9}$/.test(clean)) {
    return clean;
  }
  // 639XXXXXXXXX (12 digits)
  if (/^639\d{9}$/.test(clean)) {
    return "+" + clean;
  }
  // 09XXXXXXXXX (11 digits)
  if (/^09\d{9}$/.test(clean)) {
    return "+63" + clean.substring(1);
  }
  // 9XXXXXXXXX (10 digits)
  if (/^9\d{9}$/.test(clean)) {
    return "+63" + clean;
  }
  
  return null;
}

/**
 * Checks if a string is a valid Philippine mobile number
 */
export function isValidPhMobileNumber(raw: string): boolean {
  return formatPhMobileNumber(raw) !== null;
}

/**
 * Extracts core Philippine mobile digits starting from the leading 9 (e.g. 9978379342).
 * Works across:
 * - "+639978379342" -> "9978379342"
 * - "639978379342"  -> "9978379342"
 * - "09978379342"   -> "9978379342"
 * - "9978379342"    -> "9978379342"
 * - "0997"          -> "997"
 */
export function getPhCoreDigits(str: string): string {
  const d = str.replace(/\D/g, "");
  if (d.startsWith("639")) return d.slice(2);
  if (d.startsWith("09")) return d.slice(1);
  if (d.startsWith("9")) return d;
  return d;
}

/**
 * Returns standard 11-digit local format digits ("09XXXXXXXXX") for any Philippine mobile string
 */
export function getPhLocalDigits(str: string): string {
  const core = getPhCoreDigits(str);
  if (core.startsWith("9") && core.length >= 2) {
    return "0" + core;
  }
  const d = str.replace(/\D/g, "");
  return d.startsWith("63") ? "0" + d.slice(2) : d;
}

/**
 * Returns standard 12-digit international format digits ("639XXXXXXXXX") for any Philippine mobile string
 */
export function getPhIntlDigits(str: string): string {
  const core = getPhCoreDigits(str);
  if (core.startsWith("9") && core.length >= 2) {
    return "63" + core;
  }
  const d = str.replace(/\D/g, "");
  return d.startsWith("0") ? "63" + d.slice(1) : d;
}

/**
 * Checks whether two phone number representations belong to the same Philippine mobile line.
 * Accounts for 09... vs +639... vs unformatted/spaced numbers.
 */
export function isSamePhMobileNumber(phoneA?: string | null, phoneB?: string | null): boolean {
  if (!phoneA || !phoneB) return false;
  const cleanA = phoneA.replace(/\D/g, "");
  const cleanB = phoneB.replace(/\D/g, "");
  if (cleanA && cleanA === cleanB) return true;

  const coreA = getPhCoreDigits(phoneA);
  const coreB = getPhCoreDigits(phoneB);
  if (coreA && coreB && coreA === coreB && coreA.length >= 7) {
    return true;
  }

  const normA = formatPhMobileNumber(phoneA);
  const normB = formatPhMobileNumber(phoneB);
  if (normA && normB && normA === normB) {
    return true;
  }

  return false;
}

/**
 * Checks if a search query (e.g. "09978379342", "0997", "9978", "8379342") matches a stored phone number (e.g. "+639978379342").
 * Handles equivalent local (09...), international (+639...), national core (9...), and partial digit queries.
 */
export function matchesPhMobileSearch(storedPhone: string, searchQuery: string): boolean {
  if (!storedPhone || !searchQuery) return false;
  const qTrim = searchQuery.trim();
  if (!qTrim) return false;

  const rawStored = storedPhone.toLowerCase();
  const cleanStored = storedPhone.replace(/[\s\-_+()]/g, "");
  const qClean = qTrim.replace(/[\s\-_+()]/g, "").toLowerCase();

  // 1. Direct substring on raw or stripped text
  if (rawStored.includes(qTrim.toLowerCase()) || cleanStored.includes(qClean)) {
    return true;
  }

  // 2. Digit-based cross-matching for 09... vs +639... vs 9...
  const qDigits = qTrim.replace(/\D/g, "");
  if (qDigits.length === 0) return false;

  const storedDigits = storedPhone.replace(/\D/g, "");
  const storedLocal = getPhLocalDigits(storedPhone);
  const storedIntl = getPhIntlDigits(storedPhone);
  const storedCore = getPhCoreDigits(storedPhone);

  const queryLocal = getPhLocalDigits(qTrim);
  const queryIntl = getPhIntlDigits(qTrim);
  const queryCore = getPhCoreDigits(qTrim);

  // Direct digits match (e.g. last digits "8379342")
  if (storedDigits.includes(qDigits)) return true;

  // Local digits match (e.g. stored "+63997...", user types "0997" or "09978379342")
  if (storedLocal.includes(qDigits) || storedLocal.includes(queryLocal)) return true;

  // Intl digits match (e.g. stored "0997...", user types "+63997" or "639978379342")
  if (storedIntl.includes(qDigits) || storedIntl.includes(queryIntl)) return true;

  // Core national digits match (e.g. user typed at least 2 digits matching stored core)
  if (queryCore.length >= 2 && storedCore.includes(queryCore)) return true;

  return false;
}


/**
 * Dispatches an SMS message using the TextBee API gateway or simulation fallback.
 */
export async function dispatchSms({
  recipients,
  message,
  apiKey,
  deviceId,
  simSubscriptionId,
}: {
  recipients: string[];
  message: string;
  apiKey?: string;
  deviceId?: string;
  simSubscriptionId?: number | string;
}): Promise<SmsSendResult> {
  const activeApiKey = apiKey || process.env.TEXTBEE_API_KEY || process.env.NEXT_PUBLIC_TEXTBEE_API_KEY;
  const activeDeviceId = deviceId || process.env.TEXTBEE_DEVICE_ID || process.env.NEXT_PUBLIC_TEXTBEE_DEVICE_ID;
  const activeSimId =
    simSubscriptionId !== undefined
      ? Number(simSubscriptionId)
      : process.env.TEXTBEE_SIM_SUBSCRIPTION_ID
      ? Number(process.env.TEXTBEE_SIM_SUBSCRIPTION_ID)
      : 1;

  // Format and validate Philippine mobile numbers
  const formattedRecipients = recipients.map((num) => {
    const formatted = formatPhMobileNumber(num);
    return formatted || num.trim();
  });

  // If live credentials are provided, call TextBee API
  if (activeApiKey && activeDeviceId) {
    try {
      const payload: Record<string, unknown> = {
        recipients: formattedRecipients,
        message: message,
      };

      if (activeSimId) {
        payload.simSubscriptionId = activeSimId;
      }

      const response = await fetch(
        `https://api.textbee.dev/api/v1/gateway/devices/${activeDeviceId}/send-sms`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": activeApiKey,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          totalRecipients: formattedRecipients.length,
          successfulRecipients: [],
          failedRecipients: formattedRecipients,
          error: data.message || "Failed to dispatch SMS via TextBee Gateway.",
          mode: "LIVE",
        };
      }

      return {
        success: true,
        messageId: data.data?.smsBatchId || data.data?.batchId || data.data?._id || `TXB-${Date.now()}`,
        totalRecipients: formattedRecipients.length,
        successfulRecipients: formattedRecipients,
        failedRecipients: [],
        mode: "LIVE",
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Network error during SMS gateway transmission";
      return {
        success: false,
        totalRecipients: formattedRecipients.length,
        successfulRecipients: [],
        failedRecipients: formattedRecipients,
        error: errorMessage,
        mode: "LIVE",
      };
    }
  }

  // Simulation Fallback
  return {
    success: true,
    messageId: `SIM-${Date.now()}`,
    totalRecipients: formattedRecipients.length,
    successfulRecipients: formattedRecipients,
    failedRecipients: [],
    mode: "SIMULATION",
  };
}

export interface GatewayMessageItem {
  _id?: string;
  recipient: string;
  status: "pending" | "dispatched" | "sent" | "delivered" | "failed" | string;
  requestedAt?: string;
  sentAt?: string;
  dispatchedAt?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface GatewayBatchStatusResult {
  success: boolean;
  batchId: string;
  status?: string;
  total?: number;
  sentCount?: number;
  deliveredCount?: number;
  failedCount?: number;
  pendingCount?: number;
  completedAt?: string;
  messages: GatewayMessageItem[];
  error?: string;
}

/**
 * Fetches real-time SMS batch delivery telemetry directly from the TextBee Android gateway.
 */
export async function fetchGatewayBatchStatus({
  batchId,
  apiKey,
  deviceId,
}: {
  batchId: string;
  apiKey?: string;
  deviceId?: string;
}): Promise<GatewayBatchStatusResult> {
  const activeApiKey = apiKey || process.env.TEXTBEE_API_KEY || process.env.NEXT_PUBLIC_TEXTBEE_API_KEY;
  const activeDeviceId = deviceId || process.env.TEXTBEE_DEVICE_ID || process.env.NEXT_PUBLIC_TEXTBEE_DEVICE_ID;

  if (!activeApiKey || !activeDeviceId || !batchId) {
    return {
      success: false,
      batchId,
      messages: [],
      error: "Missing TextBee API credentials or batch ID.",
    };
  }

  try {
    const response = await fetch(
      `https://api.textbee.dev/api/v1/gateway/devices/${activeDeviceId}/sms-batch/${batchId}`,
      {
        method: "GET",
        headers: {
          "x-api-key": activeApiKey,
        },
        cache: "no-store",
      }
    );

    const result = await response.json();
    if (!response.ok || !result.data) {
      return {
        success: false,
        batchId,
        messages: [],
        error: result.message || "Failed to fetch batch details from TextBee gateway.",
      };
    }

    const batch = result.data.batch || {};
    const messages: GatewayMessageItem[] = (result.data.messages || []).map((m: any) => ({
      _id: m._id,
      recipient: m.recipient,
      status: m.status,
      requestedAt: m.requestedAt,
      sentAt: m.sentAt,
      dispatchedAt: m.dispatchedAt,
      errorCode: m.errorCode,
      errorMessage: m.errorMessage,
    }));

    return {
      success: true,
      batchId,
      status: batch.status || "completed",
      total: batch.recipientCount ?? messages.length,
      sentCount: batch.sentCount ?? messages.filter((m) => m.status === "sent" || m.status === "delivered").length,
      deliveredCount: batch.deliveredCount ?? messages.filter((m) => m.status === "delivered").length,
      failedCount: batch.failureCount ?? messages.filter((m) => m.status === "failed").length,
      pendingCount: batch.pendingCount ?? messages.filter((m) => m.status === "pending" || m.status === "dispatched").length,
      completedAt: batch.completedAt,
      messages,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Error connecting to TextBee gateway";
    return {
      success: false,
      batchId,
      messages: [],
      error: errorMessage,
    };
  }
}

/**
 * Normalizes broadcast title for Outbox display and records:
 * If no template was selected or title was default placeholder "10RCDG ALERT",
 * returns "NO SMS TEMPLATE".
 */
export function formatBroadcastTitle(title?: string): { title: string; isTemplate: boolean } {
  const trimmed = (title || "").trim();
  if (
    !trimmed ||
    trimmed.toUpperCase() === "10RCDG ALERT" ||
    trimmed.toUpperCase() === "NO SMS TEMPLATE" ||
    trimmed.toUpperCase() === "[10RCDG ALERT]"
  ) {
    return { title: "NO SMS TEMPLATE", isTemplate: false };
  }
  return { title: trimmed, isTemplate: true };
}

