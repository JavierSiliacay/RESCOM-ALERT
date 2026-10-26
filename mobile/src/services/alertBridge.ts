import { NativeModules, Platform } from "react-native";

const { AlertBridge } = NativeModules;

export interface PermissionStatus {
  hasSmsPermission: boolean;
  smsRetrieverActive?: boolean;
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
   * Silences and stops any currently sounding siren alarm
   */
  stopAlarm: async (): Promise<boolean> => {
    if (Platform.OS !== "android" || !AlertBridge) return false;
    try {
      return await AlertBridge.stopAlarm();
    } catch (e) {
      return false;
    }
  },

  /**
   * Checks whether the siren alarm is actively playing
   */
  isAlarmActive: async (): Promise<boolean> => {
    if (Platform.OS !== "android" || !AlertBridge) return false;
    try {
      return await AlertBridge.isAlarmActive();
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

  /**
   * Persists soldier identity on native device storage
   */
  saveSoldierProfile: async (profile: any): Promise<boolean> => {
    if (Platform.OS !== "android" || !AlertBridge) return false;
    try {
      return await AlertBridge.saveSoldierProfile(JSON.stringify(profile));
    } catch (e) {
      console.error("Failed to save soldier profile:", e);
      return false;
    }
  },

  /**
   * Retrieves paired soldier identity from native device storage
   */
  getSoldierProfile: async (): Promise<any | null> => {
    if (Platform.OS !== "android" || !AlertBridge) return null;
    try {
      const raw = await AlertBridge.getSoldierProfile();
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  },

  /**
   * Clears soldier profile (unlinks device)
   */
  clearSoldierProfile: async (): Promise<boolean> => {
    if (Platform.OS !== "android" || !AlertBridge) return false;
    try {
      return await AlertBridge.clearSoldierProfile();
    } catch (e) {
      return false;
    }
  },

  /**
   * Returns the Android hardware identity (ANDROID_ID) used for single-phone binding
   */
  getHardwareDeviceInfo: async (): Promise<{ deviceId: string; manufacturer: string; model: string }> => {
    const empty = { deviceId: "", manufacturer: "", model: "" };
    if (Platform.OS !== "android" || !AlertBridge?.getHardwareDeviceInfo) return empty;
    try {
      return await AlertBridge.getHardwareDeviceInfo();
    } catch (e) {
      return empty;
    }
  },

  /**
   * Retrieves real Firebase Cloud Messaging device registration token
   */
  getFcmToken: async (): Promise<string> => {
    if (Platform.OS !== "android" || !AlertBridge?.getFcmToken) return "";
    try {
      return (await AlertBridge.getFcmToken()) || "";
    } catch (e) {
      return "";
    }
  },


  /**
   * Arms the Layer 2 Zero-Permission Google SMS Retriever
   */
  startSmsRetriever: async (): Promise<boolean> => {
    if (Platform.OS !== "android" || !AlertBridge) return false;
    try {
      return await AlertBridge.startSmsRetriever();
    } catch (e) {
      return false;
    }
  },

  /**
   * Gets the 11-character app hash for SMS Retriever
   */
  getSmsRetrieverHash: async (): Promise<string> => {
    if (Platform.OS !== "android" || !AlertBridge) return "7V8UpW3jxbp";
    try {
      return await AlertBridge.getSmsRetrieverHash();
    } catch (e) {
      return "7V8UpW3jxbp";
    }
  },

  /**
   * Checks if flashlight strobe on alert is enabled
   */
  isFlashlightStrobeEnabled: async (): Promise<boolean> => {
    if (Platform.OS !== "android" || !AlertBridge) return true;
    try {
      return await AlertBridge.isFlashlightStrobeEnabled();
    } catch (e) {
      return true;
    }
  },

  /**
   * Sets flashlight strobe enabled state
   */
  setFlashlightStrobe: async (enabled: boolean): Promise<boolean> => {
    if (Platform.OS !== "android" || !AlertBridge) return false;
    try {
      return await AlertBridge.setFlashlightStrobe(enabled);
    } catch (e) {
      return false;
    }
  },

  /**
   * Gets current alert sound settings
   */
  getAlertSoundSettings: async (): Promise<{ isDefault: boolean; title: string; uri: string }> => {
    if (Platform.OS !== "android" || !AlertBridge) {
      return { isDefault: true, title: "10RCDG Tactical Klaxon (Default)", uri: "" };
    }
    try {
      return await AlertBridge.getAlertSoundSettings();
    } catch (e) {
      return { isDefault: true, title: "10RCDG Tactical Klaxon (Default)", uri: "" };
    }
  },

  /**
   * Resets alert sound back to official default siren
   */
  resetToDefaultAlertSound: async (): Promise<{ isDefault: boolean; title: string; uri: string }> => {
    if (Platform.OS !== "android" || !AlertBridge) {
      return { isDefault: true, title: "10RCDG Tactical Klaxon (Default)", uri: "" };
    }
    try {
      return await AlertBridge.resetToDefaultAlertSound();
    } catch (e) {
      return { isDefault: true, title: "10RCDG Tactical Klaxon (Default)", uri: "" };
    }
  },

  /**
   * Previews alert sound for 3.5 seconds
   */
  previewAlertSound: async (): Promise<boolean> => {
    if (Platform.OS !== "android" || !AlertBridge) return false;
    try {
      return await AlertBridge.previewAlertSound();
    } catch (e) {
      return false;
    }
  },

  /**
   * Opens Android document picker to choose custom .mp3 / .wav
   */
  pickAudioFile: async (): Promise<{ success: boolean; uri?: string; title?: string; isDefault?: boolean; error?: string }> => {
    if (Platform.OS !== "android" || !AlertBridge) {
      return { success: false, error: "Native Android only" };
    }
    try {
      return await AlertBridge.pickAudioFile();
    } catch (e: any) {
      return { success: false, error: e?.message || "File pick failed" };
    }
  },

  /**
   * Checks if ACCESS_FINE_LOCATION or ACCESS_COARSE_LOCATION is granted (v1.2.0)
   */
  checkLocationPermission: async (): Promise<boolean> => {
    if (Platform.OS !== "android" || !AlertBridge?.checkLocationPermission) return false;
    try {
      return await AlertBridge.checkLocationPermission();
    } catch {
      return false;
    }
  },

  /**
   * Retrieves the soldier's current GPS coordinates (v1.2.0)
   */
  getCurrentLocation: async (): Promise<{
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
  } | null> => {
    if (Platform.OS !== "android" || !AlertBridge?.getCurrentLocation) return null;
    try {
      return await AlertBridge.getCurrentLocation();
    } catch {
      return null;
    }
  },

  /**
   * Starts 24/7 background tactical location service with 100m displacement filter (v1.3.0)
   */
  startTacticalTracking: async (emergency: boolean = false): Promise<boolean> => {
    if (Platform.OS !== "android" || !AlertBridge?.startTacticalTracking) return false;
    try {
      return await AlertBridge.startTacticalTracking(emergency);
    } catch (e) {
      console.error("Failed to start tactical tracking:", e);
      return false;
    }
  },

  /**
   * Stops the background tracking service
   */
  stopTacticalTracking: async (): Promise<boolean> => {
    if (Platform.OS !== "android" || !AlertBridge?.stopTacticalTracking) return false;
    try {
      return await AlertBridge.stopTacticalTracking();
    } catch (e) {
      console.error("Failed to stop tactical tracking:", e);
      return false;
    }
  },
};


