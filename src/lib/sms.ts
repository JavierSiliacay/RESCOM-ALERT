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
        messageId: data.data?.batchId || `TXB-${Date.now()}`,
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

