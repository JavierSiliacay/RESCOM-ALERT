const CONVEX_URL = "https://dazzling-whale-200.convex.cloud";

export interface VerifyMobileResult {
  status:
    | "REGISTERED"
    | "PENDING_ENLISTMENT"
    | "NOT_FOUND"
    | "INVALID_INPUT"
    | "PORTAL_LOCKED"
    | "DEVICE_MISMATCH"
    | "DEVICE_UNBOUND"
    | "DEVICE_UNPAIRED_BY_ADMIN"
    | "NETWORK_ERROR";
  soldier?: {
    id: string;
    firstName: string;
    lastName: string;
    rank: string;
    unit?: string;
    groupName: string;
    mobileNumber: string;
    deviceType?: string;
    fcmToken?: string;
    deviceModel?: string;
  };
  submission?: {
    id: string;
    firstName: string;
    lastName: string;
    rank: string;
    groupName: string;
    mobileNumber: string;
    submissionStatus: string;
  };
  message?: string;
}

export interface PairingStatusResult {
  isPaired: boolean;
  reason?: "UNPAIRED_BY_ADMIN" | "DEVICE_MISMATCH" | "NOT_FOUND" | "NETWORK_ERROR";
}

/**
 * Lightweight, zero-dependency Convex HTTP client for React Native mobile builds.
 * Communicates directly with cloud database without external SDK overhead.
 */
export const convexHttpService = {
  /**
   * Queries Convex to check if this physical device is still actively bound to the soldier profile
   */
  checkDevicePairing: async (soldierId: string, appDeviceId: string): Promise<PairingStatusResult> => {
    try {
      const response = await fetch(`${CONVEX_URL}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "personnel:checkDevicePairing",
          args: { soldierId, appDeviceId },
          format: "json",
        }),
      });

      if (!response.ok) return { isPaired: true }; // Don't unpair on network glitch
      const json = await response.json();
      if (json?.status === "error" || !json?.value) return { isPaired: true };
      return json.value as PairingStatusResult;
    } catch {
      return { isPaired: true }; // Offline tolerance
    }
  },

  /**
   * Queries Convex to verify if a mobile number is registered in personnel or enlistment
   */
  verifyMobile: async (mobileNumber: string, appDeviceId: string): Promise<VerifyMobileResult> => {
    try {
      const response = await fetch(`${CONVEX_URL}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "personnel:verifyMobile",
          args: { mobileNumber, isNativeApp: true, appDeviceId },
          format: "json",
        }),
      });

      if (!response.ok) {
        throw new Error(`Convex query failed with HTTP status ${response.status}`);
      }

      const json = await response.json();
      // Convex returns HTTP 200 with { status: "error" } when the function throws
      if (json?.status === "error" || !json?.value) {
        throw new Error(json?.errorMessage || "Empty response from Convex");
      }
      return json.value as VerifyMobileResult;
    } catch (err) {
      console.error("Convex verifyMobile error:", err);
      return {
        status: "NETWORK_ERROR",
        message: "Unable to reach the 10RCDG server. Check your internet connection and try again.",
      };
    }
  },

  /**
   * Links the soldier's Android device token and hardware model to their profile
   */
  linkDevice: async ({
    soldierId,
    fcmToken,
    deviceModel,
    appDeviceId,
  }: {
    soldierId: string;
    fcmToken: string;
    deviceModel?: string;
    appDeviceId?: string;
  }): Promise<"OK" | "MISMATCH" | "FAILED"> => {
    try {
      const response = await fetch(`${CONVEX_URL}/api/mutation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "personnel:linkDevice",
          args: { soldierId, fcmToken, deviceModel, appDeviceId },
          format: "json",
        }),
      });

      if (!response.ok) return "FAILED";
      const json = await response.json().catch(() => null);
      if (!json || json.status === "error") return "FAILED";
      if (json.value?.success === false && json.value?.error === "DEVICE_MISMATCH") return "MISMATCH";
      return "OK";
    } catch (err) {
      console.error("Convex linkDevice error:", err);
      return "FAILED";
    }
  },

  /**
   * Unlinks device from profile
   */
  unlinkDevice: async (soldierId: string): Promise<boolean> => {
    try {
      const response = await fetch(`${CONVEX_URL}/api/mutation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "personnel:unlinkDevice",
          args: { soldierId },
          format: "json",
        }),
      });

      return response.ok;
    } catch (err) {
      console.error("Convex unlinkDevice error:", err);
      return false;
    }
  },
};
