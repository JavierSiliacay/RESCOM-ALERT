const CONVEX_URL = "https://dazzling-whale-200.convex.cloud";

export interface VerifyMobileResult {
  status: "REGISTERED" | "PENDING_ENLISTMENT" | "NOT_FOUND" | "INVALID_INPUT";
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

/**
 * Lightweight, zero-dependency Convex HTTP client for React Native mobile builds.
 * Communicates directly with cloud database without external SDK overhead.
 */
export const convexHttpService = {
  /**
   * Queries Convex to verify if a mobile number is registered in personnel or enlistment
   */
  verifyMobile: async (mobileNumber: string): Promise<VerifyMobileResult> => {
    try {
      const response = await fetch(`${CONVEX_URL}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "personnel:verifyMobile",
          args: { mobileNumber },
          format: "json",
        }),
      });

      if (!response.ok) {
        throw new Error(`Convex query failed with HTTP status ${response.status}`);
      }

      const json = await response.json();
      return json.value as VerifyMobileResult;
    } catch (err) {
      console.error("Convex verifyMobile error:", err);
      return {
        status: "NOT_FOUND",
        message: "Failed to connect to 10RCDG cloud network.",
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
  }: {
    soldierId: string;
    fcmToken: string;
    deviceModel?: string;
  }): Promise<boolean> => {
    try {
      const response = await fetch(`${CONVEX_URL}/api/mutation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "personnel:linkDevice",
          args: { soldierId, fcmToken, deviceModel },
          format: "json",
        }),
      });

      return response.ok;
    } catch (err) {
      console.error("Convex linkDevice error:", err);
      return false;
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
