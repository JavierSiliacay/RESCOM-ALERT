import React, { useEffect, useState } from "react";
import {
  Alert,
  AppState,
  Image,
  PermissionsAndroid,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { AlertsScreen } from "./src/screens/AlertsScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { colors, radius } from "./src/theme";
import { SoldierHeaderCard } from "./src/components/SoldierHeaderCard";
import { DevicePairingModal } from "./src/components/DevicePairingModal";
import { alertBridgeService } from "./src/services/alertBridge";
import { convexHttpService } from "./src/services/convexHttp";

type TabKey = "ALERTS" | "SETUP";

const TABS: { key: TabKey; label: string }[] = [
  { key: "ALERTS", label: "Alerts" },
  { key: "SETUP", label: "Phone Setup" },
];

function TabGlyph({ tab, active }: { tab: TabKey; active: boolean }) {
  const c = active ? colors.primary : colors.textFaint;
  if (tab === "ALERTS") {
    // bell icon
    return (
      <View style={{ alignItems: "center", height: 20, justifyContent: "flex-end" }}>
        <View style={{ width: 14, height: 13, borderTopLeftRadius: 7, borderTopRightRadius: 7, borderWidth: 2, borderBottomWidth: 0, borderColor: c }} />
        <View style={{ width: 18, height: 2, backgroundColor: c, borderRadius: 1 }} />
        <View style={{ width: 5, height: 3, backgroundColor: c, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, marginTop: 1 }} />
      </View>
    );
  }
  // shield check icon for phone setup / security
  return (
    <View style={{ width: 16, height: 19, borderWidth: 2, borderColor: c, borderTopLeftRadius: 3, borderTopRightRadius: 3, borderBottomLeftRadius: 9, borderBottomRightRadius: 9, alignItems: "center", justifyContent: "center" }}>
      <View style={{ width: 4, height: 7, borderRightWidth: 2, borderBottomWidth: 2, borderColor: c, transform: [{ rotate: "45deg" }], marginTop: -2 }} />
    </View>
  );
}

function Shell(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabKey>("ALERTS");
  const [soldier, setSoldier] = useState<any>(null);
  const [isArmed, setIsArmed] = useState(true);
  const [pairingModalOpen, setPairingModalOpen] = useState(false);

  const refreshProfileAndPerms = async () => {
    try {
      const saved = await alertBridgeService.getSoldierProfile();
      if (saved) {
        setSoldier(saved);

        // Background Cloud Audit: Check if Headquarters administrator unpaired this device
        // Only executes silently if the phone has active internet; never blocks offline alerts
        checkRemotePairingStatus(saved).catch(() => {});
      } else {
        // First install / unlinked: prompt soldier to pair mobile number
        setTimeout(() => setPairingModalOpen(true), 600);
      }
      const perms = await alertBridgeService.checkSystemPermissions();
      setIsArmed(Boolean(perms.isFullyArmed));
    } catch (e) {
      // Background load
    }
  };

  const checkRemotePairingStatus = async (currentSoldier: any) => {
    try {
      const dev = await alertBridgeService.getHardwareDeviceInfo();
      const soldierId = currentSoldier?.id || currentSoldier?._id;
      if (!dev?.deviceId || !soldierId) return;

      const res = await convexHttpService.checkDevicePairing(
        soldierId,
        dev.deviceId
      );

      // If the admin unlinked the phone, cleared appDeviceId, or transferred to another device
      if (!res.isPaired) {
        // 1. Clear local soldier profile immediately
        await alertBridgeService.clearSoldierProfile();
        setSoldier(null);

        // 2. Alert the soldier with official 10RCDG notice based on command action
        if (res.reason === "DELETED_BY_ADMIN" || res.reason === "NOT_FOUND") {
          Alert.alert(
            "Personnel Data Removed",
            "The administrators deleted your data in the web portal and unpaired this device. Please contact your Unit Officer or 10RCDG Headquarters if you believe this was an error.",
            [
              { text: "Dismiss", style: "cancel" },
            ]
          );
        } else if (res.reason === "DEVICE_MISMATCH") {
          Alert.alert(
            "Device Transfer Detected",
            "Your mobile number is paired to a different phone. If you recently changed or upgraded your phone, contact your Unit Officer to re-authorize this device.",
            [
              {
                text: "Pair Phone",
                onPress: () => setPairingModalOpen(true),
              },
              { text: "Dismiss", style: "cancel" },
            ]
          );
        } else {
          Alert.alert(
            "Device Unpaired by Command",
            "The administrator has unpaired this device from 10RCDG RESCOM. To re-link this phone, please pair your mobile number again or contact your Unit Officer.",
            [
              {
                text: "Pair Phone",
                onPress: () => setPairingModalOpen(true),
              },
              { text: "Dismiss", style: "cancel" },
            ]
          );
        }
      } else if (res.soldier) {
        // Live Profile Sync: Check if administrator modified rank, name, group, unit, or mobile on web portal
        const isModified =
          res.soldier.rank !== currentSoldier.rank ||
          res.soldier.firstName !== currentSoldier.firstName ||
          res.soldier.lastName !== currentSoldier.lastName ||
          res.soldier.unit !== currentSoldier.unit ||
          res.soldier.groupName !== currentSoldier.groupName ||
          res.soldier.mobileNumber !== currentSoldier.mobileNumber;

        if (isModified) {
          const updatedProfile = {
            ...currentSoldier,
            ...res.soldier,
          };
          await alertBridgeService.saveSoldierProfile(updatedProfile);
          setSoldier(updatedProfile);
        }
      }
    } catch {
      // Offline / network failure: preserve local profile for emergency sirens
    }
  };

  useEffect(() => {
    refreshProfileAndPerms();

    // Re-verify whenever app returns to foreground from background
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        refreshProfileAndPerms();
      }
    });

    // Periodic live sync every 15 seconds while app is open so unpairing on web portal reacts in near real-time
    const interval = setInterval(async () => {
      const saved = await alertBridgeService.getSoldierProfile();
      if (saved) {
        checkRemotePairingStatus(saved).catch(() => {});
      }
    }, 15000);

    if (Platform.OS === "android") {
      const perms = [
        PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
        PermissionsAndroid.PERMISSIONS.READ_SMS,
      ];
      if (typeof Platform.Version === "number" && Platform.Version >= 33) {
        const postNotif = (PermissionsAndroid.PERMISSIONS as any).POST_NOTIFICATIONS;
        if (postNotif) perms.push(postNotif);
      }
      PermissionsAndroid.requestMultiple(perms).catch(() => {});
    }

    return () => {
      sub.remove();
      clearInterval(interval);
    };
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      {/* Clean Minimalist Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerLeft}>
          <View style={styles.seals}>
            <View style={[styles.seal, { zIndex: 2 }]}>
              <Image source={require("./src/assets/rescom-pa-seal.png")} style={styles.sealImg} />
            </View>
            <View style={[styles.seal, { marginLeft: -10 }]}>
              <Image source={require("./src/assets/rescom-emblem.jpg")} style={styles.sealImg} />
            </View>
          </View>
          <View>
            <Text style={styles.brand}>
              <Text style={{ color: colors.primaryDark }}>RESCOM </Text>
              <Text style={{ color: colors.amber }}>ALERT</Text>
            </Text>
            <Text style={styles.brandSub}>10RCDG • RESERVE COMMAND, PA</Text>
          </View>
        </View>

        <View style={[styles.headerBadge, isArmed ? styles.headerBadgeArmed : styles.headerBadgeStandby]}>
          <View style={[styles.headerDot, { backgroundColor: isArmed ? colors.primaryText : colors.amberDark }]} />
          <Text style={[styles.headerBadgeText, { color: isArmed ? colors.primaryText : colors.amberDark }]}>
            {isArmed ? "ARMED" : "STANDBY"}
          </Text>
        </View>
      </View>

      {/* Tactical Soldier Identity Header */}
      <TouchableOpacity
        activeOpacity={soldier ? 1 : 0.8}
        onPress={() => {
          if (!soldier) setPairingModalOpen(true);
        }}
      >
        <SoldierHeaderCard soldier={soldier} isArmed={isArmed} />
      </TouchableOpacity>

      <View style={{ flex: 1 }}>
        {activeTab === "ALERTS" && <AlertsScreen />}
        {activeTab === "SETUP" && (
          <ProfileScreen
            soldier={soldier}
            onOpenPairing={() => setPairingModalOpen(true)}
            onSoldierUpdated={(s) => setSoldier(s)}
          />
        )}
      </View>

      {/* One-Time Mobile Pairing Modal */}
      <DevicePairingModal
        visible={pairingModalOpen}
        onClose={() => setPairingModalOpen(false)}
        onSuccess={(linkedSoldier) => {
          setSoldier(linkedSoldier);
          refreshProfileAndPerms();
        }}
      />

      {/* Bottom navigation */}
      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {TABS.map((t) => {
          const active = activeTab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={styles.tab}
              onPress={() => setActiveTab(t.key)}
              activeOpacity={0.7}
            >
              <View style={[styles.tabIndicator, active && styles.tabIndicatorOn]} />
              <View style={[styles.tabIconWrap, active && styles.tabIconWrapOn]}>
                <TabGlyph tab={t.key} active={active} />
              </View>
              <Text style={[styles.tabLabel, active && styles.tabLabelOn]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <Shell />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  seals: { flexDirection: "row" },
  seal: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: "hidden",
  },
  sealImg: { width: "100%", height: "100%", resizeMode: "contain" },
  brand: { fontSize: 16, fontWeight: "900", letterSpacing: 0.5 },
  brandSub: { fontSize: 10, color: colors.textMuted, fontWeight: "700", marginTop: 1, letterSpacing: 0.3 },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  headerBadgeArmed: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
  },
  headerBadgeStandby: {
    backgroundColor: colors.amberSoft,
    borderColor: colors.amberBorder,
  },
  headerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  headerBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
  },

  strip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.primarySoft,
    borderBottomWidth: 1,
    borderBottomColor: colors.primaryTint,
  },
  stripDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#10b981", marginRight: 8 },
  stripText: { fontSize: 12, fontWeight: "600", color: colors.primary },
  stripPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: colors.amberTint,
    borderWidth: 1,
    borderColor: colors.amberBorder,
  },
  stripPillText: { fontSize: 9, fontWeight: "800", color: colors.amberDark, letterSpacing: 0.5 },

  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tab: { flex: 1, alignItems: "center", paddingTop: 0 },
  tabIndicator: { height: 3, width: 32, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, backgroundColor: "transparent", marginBottom: 6 },
  tabIndicatorOn: { backgroundColor: colors.primary },
  tabIconWrap: { width: 48, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  tabIconWrapOn: { backgroundColor: colors.primarySoft },
  tabLabel: { fontSize: 12, fontWeight: "600", color: colors.textMuted, marginTop: 3 },
  tabLabelOn: { color: colors.primary, fontWeight: "800" },
});
