import React, { useEffect, useState } from "react";
import {
  Alert,
  AppState,
  Linking,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { alertBridgeService, PermissionStatus } from "../services/alertBridge";
import { colors, radius, shadow } from "../theme";

export const ProfileScreen: React.FC = () => {
  const [perms, setPerms] = useState<PermissionStatus>({ hasSmsPermission: false, isBatteryIgnored: false });

  const refresh = async () => setPerms(await alertBridgeService.checkSystemPermissions());

  useEffect(() => {
    refresh();
    // Re-check when the soldier comes back from Android settings
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") {
        refresh();
        setTimeout(refresh, 500);
      }
    });
    return () => sub.remove();
  }, []);

  const handleRequestSms = async () => {
    if (Platform.OS !== "android") return;
    try {
      const permsToAsk = [
        PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
        PermissionsAndroid.PERMISSIONS.READ_SMS,
      ];
      if (typeof Platform.Version === "number" && Platform.Version >= 33) {
        const postNotif = (PermissionsAndroid.PERMISSIONS as any).POST_NOTIFICATIONS;
        if (postNotif) permsToAsk.push(postNotif);
      }
      const results = await PermissionsAndroid.requestMultiple(permsToAsk);
      const granted =
        results[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS] ===
        PermissionsAndroid.RESULTS.GRANTED;
      if (!granted) {
        Alert.alert(
          "Permission Required",
          "Android blocked SMS access. Please tap 'Settings' -> 'Permissions' -> enable SMS so the siren can trigger offline.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ]
        );
      }
      refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const isOverlayOk =
    typeof Platform.Version === "number" && Platform.Version >= 34
      ? perms.canFullScreen !== false
      : perms.canDrawOverlays !== false || perms.canFullScreen !== false;
  const allGood = perms.hasSmsPermission && perms.isBatteryIgnored && isOverlayOk;
  const steps = [
    {
      key: "sms",
      title: "Read text messages",
      desc: "Lets the app see alerts from Headquarters.",
      ok: perms.hasSmsPermission,
      action: handleRequestSms,
      actionLabel: "ALLOW",
    },
    {
      key: "battery",
      title: "Keep running in background",
      desc: "Stops your phone from putting the siren to sleep.",
      ok: perms.isBatteryIgnored,
      action: () => alertBridgeService.requestBatteryExemption(),
      actionLabel: "FIX NOW",
    },
    {
      key: "overlay",
      title: "Full-screen alarm takeover",
      desc: "Allows the siren to pop up over the lock screen like an alarm clock.",
      ok: isOverlayOk,
      action: () => alertBridgeService.requestOverlayPermission(),
      actionLabel: "ENABLE",
    },
  ];

  const handleClear = () =>
    Alert.alert("Clear saved alerts?", "This removes old alerts from this phone only.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: () => alertBridgeService.clearHistory() },
    ]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>PHONE SETUP</Text>
      <Text style={styles.h1}>Is my phone ready?</Text>
      <Text style={styles.lead}>Both items below must be green so the siren can wake you up.</Text>

      {/* Overall status banner */}
      <View style={[styles.banner, allGood ? styles.bannerOk : styles.bannerWarn]}>
        <View style={[styles.bannerDot, { backgroundColor: allGood ? "#10b981" : "#f59e0b" }]} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.bannerTitle, { color: allGood ? colors.primary : colors.amberDark }]}>
            {allGood ? "All set — your phone will ring for alerts" : "Action needed"}
          </Text>
          {!allGood && <Text style={styles.bannerText}>Fix the item marked below.</Text>}
        </View>
      </View>

      {/* Setup checks */}
      <View style={styles.card}>
        {steps.map((s, i) => (
          <View key={s.key} style={[styles.step, i === steps.length - 1 && { borderBottomWidth: 0 }]}>
            <View style={[styles.stepIcon, s.ok ? styles.stepIconOk : styles.stepIconBad]}>
              {s.ok ? <View style={styles.tick} /> : <Text style={styles.bang}>!</Text>}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>{s.title}</Text>
              <Text style={styles.stepDesc}>{s.desc}</Text>
            </View>
            {s.ok ? (
              <Text style={styles.okText}>ON</Text>
            ) : s.action ? (
              <TouchableOpacity style={styles.fixBtn} onPress={s.action} activeOpacity={0.85}>
                <Text style={styles.fixText}>{s.actionLabel}</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.offText}>OFF</Text>
            )}
          </View>
        ))}
      </View>

      {/* Help */}
      <View style={[styles.card, { marginTop: 14 }]}>
        <Text style={styles.cardTitle}>Need help?</Text>
        <Text style={styles.help}>
          If the siren does not ring during a test, contact your CDC Adjutant or 10RCDG S3 Operations.
        </Text>
      </View>

      <TouchableOpacity style={styles.clearBtn} onPress={handleClear} activeOpacity={0.8}>
        <Text style={styles.clearText}>Clear saved alerts on this phone</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>RESCOM ALERT · Version 1.0 · 10RCDG RESCOM, PA</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  eyebrow: { fontSize: 11, fontWeight: "700", color: colors.primary, letterSpacing: 1 },
  h1: { fontSize: 24, fontWeight: "800", color: colors.text, marginTop: 2 },
  lead: { fontSize: 14, color: colors.textMuted, lineHeight: 20, marginTop: 4, marginBottom: 16 },

  banner: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: radius.lg, borderWidth: 1, marginBottom: 12 },
  bannerOk: { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder },
  bannerWarn: { backgroundColor: colors.amberSoft, borderColor: colors.amberBorder },
  bannerDot: { width: 10, height: 10, borderRadius: 5 },
  bannerTitle: { fontSize: 14, fontWeight: "800" },
  bannerText: { fontSize: 12, color: colors.amberDark, marginTop: 2 },

  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: 16, paddingVertical: 4, ...shadow },
  cardTitle: { fontSize: 15, fontWeight: "800", color: colors.text, marginTop: 12 },
  help: { fontSize: 13, color: colors.textMuted, lineHeight: 19, marginTop: 4, marginBottom: 14 },

  step: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  stepIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  stepIconOk: { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder },
  stepIconBad: { backgroundColor: colors.amberSoft, borderColor: colors.amberBorder },
  tick: { width: 6, height: 12, borderRightWidth: 2.5, borderBottomWidth: 2.5, borderColor: colors.primary, transform: [{ rotate: "45deg" }], marginTop: -3 },
  bang: { fontSize: 16, fontWeight: "900", color: colors.amberDark },
  stepTitle: { fontSize: 15, fontWeight: "800", color: colors.text },
  stepDesc: { fontSize: 13, color: colors.textMuted, marginTop: 2, lineHeight: 18 },
  okText: { fontSize: 12, fontWeight: "800", color: colors.primary },
  offText: { fontSize: 12, fontWeight: "800", color: colors.amberDark },
  fixBtn: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 8 },
  fixText: { color: "#fff", fontSize: 12, fontWeight: "800", letterSpacing: 0.5 },

  clearBtn: { marginTop: 18, paddingVertical: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.redBorder, backgroundColor: colors.card, alignItems: "center" },
  clearText: { color: colors.red, fontWeight: "700", fontSize: 14 },
  footer: { textAlign: "center", fontSize: 11, color: colors.textFaint, marginTop: 20 },
});
