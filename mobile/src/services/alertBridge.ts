import { NativeModules, Platform } from "react-native";

const { AlertBridge } = NativeModules;

export interface PermissionStatus {
  hasSmsPermission: boolean;
  isBatteryIgnored: boolean;
  canDrawOverlays?: boolean;
  canFullScreen?: boolean;
  isFullyArmed?: boolean;
}

export interface RawAlertItem {
  timestamp: string;
  sender: string;
  message: string;
}

export const alertBridgeService = {
  /**
   * Triggers the full-screen lock-screen alert & siren test
   */
  testSirenAlarm: async (message?: string): Promise<boolean> => {
    if (Platform.OS !== "android" || !AlertBridge) {
      console.warn("AlertBridge is only available on Android native builds.");
      return false;
    }
    try {
      return await AlertBridge.testAlarm(message || "10RCDG EMERGENCY SIREN TEST: Sound, screen wake, and vibration verification.");
    } catch (e) {
      console.error("Failed to trigger siren test:", e);
      return false;
    }
  },

  /**
   * Retrieves alerts intercepted and saved on the local device
   */
  getSavedAlertHistory: async (): Promise<RawAlertItem[]> => {
    if (Platform.OS !== "android" || !AlertBridge) {
      return [];
    }
    try {
      return await AlertBridge.getAlertHistory();
    } catch (e) {
      console.error("Failed to fetch alert history:", e);
      return [];
    }
  },

  /**
   * Clears device alert history
   */
  clearHistory: async (): Promise<boolean> => {
    if (Platform.OS !== "android" || !AlertBridge) return false;
    try {
      return await AlertBridge.clearAlertHistory();
    } catch (e) {
      return false;
    }
  },

  /**
   * Deletes a single alert at index
   */
  deleteAlert: async (index: number): Promise<boolean> => {
    if (Platform.OS !== "android" || !AlertBridge) return false;
    try {
      return await AlertBridge.deleteAlert(index);
    } catch (e) {
      return false;
    }
  },

  /**
   * Directly opens manufacturer / Android battery exemption settings
   */
  requestBatteryExemption: async (): Promise<boolean> => {
    if (Platform.OS !== "android" || !AlertBridge) return false;
    try {
      return await AlertBridge.requestBatteryOptimization();
    } catch (e) {
      return false;
    }
  },

  /**
   * Opens Android overlay / full-screen alarm permission settings
   */
  requestOverlayPermission: async (): Promise<boolean> => {
    if (Platform.OS !== "android" || !AlertBridge) return false;
    try {
      return await AlertBridge.requestOverlayPermission();
    } catch (e) {
      return false;
    }
  },

  /**
   * Checks current permission states
   */
  checkSystemPermissions: async (): Promise<PermissionStatus> => {
    if (Platform.OS !== "android" || !AlertBridge) {
      return { hasSmsPermission: true, isBatteryIgnored: true };
    }
    try {
      return await AlertBridge.checkPermissions();
    } catch (e) {
      return { hasSmsPermission: false, isBatteryIgnored: false };
    }
  },
};
