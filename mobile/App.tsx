import React, { useEffect, useState } from "react";
import {
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
import { colors } from "./src/theme";

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

  useEffect(() => {
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
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      {/* Header — same lockup as the web sidebar */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.seals}>
          <View style={[styles.seal, { zIndex: 2 }]}>
            <Image source={require("./src/assets/rescom-pa-seal.png")} style={styles.sealImg} />
          </View>
          <View style={[styles.seal, { marginLeft: -8 }]}>
            <Image source={require("./src/assets/rescom-emblem.jpg")} style={styles.sealImg} />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.brand}>
            <Text style={{ color: colors.primaryDark }}>RESCOM </Text>
            <Text style={{ color: colors.amber }}>ALERT</Text>
          </Text>
          <Text style={styles.brandSub}>10RCDG RESCOM, PA</Text>
        </View>
      </View>

      {/* Status strip — same as web "Connected as" bar */}
      <View style={styles.strip}>
        <View style={styles.stripDot} />
        <Text style={styles.stripText}>Siren protection is ON</Text>
        <View style={{ flex: 1 }} />
        <View style={styles.stripPill}>
          <Text style={styles.stripPillText}>NO INTERNET NEEDED</Text>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        {activeTab === "ALERTS" && <AlertsScreen />}
        {activeTab === "SETUP" && <ProfileScreen />}
      </View>

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
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  seals: { flexDirection: "row" },
  seal: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: "#f59e0b",
    backgroundColor: colors.card,
    overflow: "hidden",
  },
  sealImg: { width: "100%", height: "100%" },
  brand: { fontSize: 17, fontWeight: "800", letterSpacing: 0.6 },
  brandSub: { fontSize: 11, color: colors.textMuted, fontWeight: "500", marginTop: 1 },

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
