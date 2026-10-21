import React, { useEffect, useState } from "react";
import {
  Alert,
  AppState,
  Linking,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { alertBridgeService, PermissionStatus } from "../services/alertBridge";
import { colors, radius, shadow } from "../theme";
import { RankInsignia } from "../components/RankInsignia";

interface ProfileScreenProps {
  soldier?: any;
  onOpenPairing?: () => void;
  onSoldierUpdated?: (s: any) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  soldier,
  onOpenPairing,
}) => {
  const [perms, setPerms] = useState<PermissionStatus>({
    hasSmsPermission: false,
    isBatteryIgnored: false,
    canFullScreen: false,
    canDrawOverlays: false,
  });

  const [strobeEnabled, setStrobeEnabled] = useState(true);
  const [soundSettings, setSoundSettings] = useState({
    isDefault: true,
    title: "10RCDG Tactical Klaxon (Default)",
    uri: "",
  });
  const [isPreviewing, setIsPreviewing] = useState(false);

  const refresh = async () => {
    const currentPerms = await alertBridgeService.checkSystemPermissions();
    setPerms(currentPerms);
    const strobe = await alertBridgeService.isFlashlightStrobeEnabled();
    setStrobeEnabled(strobe);
    const sound = await alertBridgeService.getAlertSoundSettings();
    setSoundSettings(sound);
  };

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") {
        refresh();
        setTimeout(refresh, 500);
      }
    });
    return () => sub.remove();
  }, []);

  const handleToggleStrobe = async (val: boolean) => {
    setStrobeEnabled(val);
    await alertBridgeService.setFlashlightStrobe(val);
  };

  const handlePickSound = async () => {
    const res = await alertBridgeService.pickAudioFile();
    if (res.success && res.title) {
      setSoundSettings({
        isDefault: false,
        title: res.title,
        uri: res.uri || "",
      });
      Alert.alert(
        "Alert Tone Set",
        `Selected: ${res.title}\n\nTap "Play Sample" to test volume on your device.`
      );
    }
  };

  const handleResetSound = async () => {
    const res = await alertBridgeService.resetToDefaultAlertSound();
    setSoundSettings(res);
  };

  const handlePreviewSound = async () => {
    if (isPreviewing) return;
    setIsPreviewing(true);
    await alertBridgeService.previewAlertSound();
    setTimeout(() => setIsPreviewing(false), 3600);
  };

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
          "SMS Permission Required",
          "Android blocked SMS access.\n\nNote for Android 13–15:\nIn App Info, tap the 3 dots (⋮) in the top-right corner → tap 'Allow restricted settings' → then tap 'Permissions' and enable SMS.",
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
      ? Boolean(perms.canDrawOverlays && perms.canFullScreen)
      : Boolean(perms.canDrawOverlays);
  const isSmsOk = perms.hasSmsPermission || perms.smsRetrieverActive !== false;
  const allGood = isSmsOk && perms.isBatteryIgnored && isOverlayOk;
  const steps = [
    {
      key: "sms",
      title: perms.hasSmsPermission ? "Emergency SMS (Dual-Layer)" : "Emergency SMS (Google Retriever)",
      desc: perms.hasSmsPermission
        ? "Dual-Layer Active: Classic SMS Receiver + Google SMS Retriever."
        : "Layer 2 Active: Google Retriever intercepts alerts offline with 0 permissions needed.",
      ok: true,
      action: !perms.hasSmsPermission ? handleRequestSms : undefined,
      actionLabel: !perms.hasSmsPermission ? "ALLOW L1" : undefined,
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
      title: "Display over apps & lock screen",
      desc: "Allows the siren to pop up over your screen even while scrolling other apps.",
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
      <Text style={styles.h1}>Tactical Readiness</Text>
      <Text style={styles.lead}>Ensure all background permissions and emergency siren hardware are green.</Text>

      {!soldier && (
        <TouchableOpacity
          style={styles.pairDeviceBanner}
          onPress={onOpenPairing}
          activeOpacity={0.8}
        >
          <View style={styles.pairIconWrap}>
            <Text style={styles.pairPlus}>+</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.pairTitle}>Pair Your Military Mobile Number</Text>
            <Text style={styles.pairSub}>
              Link your device to 10RCDG to activate personalized push alerts.
            </Text>
          </View>
        </TouchableOpacity>
      )}

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

      {/* 2. Setup checks */}
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

      {/* 3. Alarm Tone & Visual Strobe Preferences */}
      <View style={[styles.card, { marginTop: 14, paddingVertical: 14 }]}>
        <Text style={styles.cardTitle}>Alarm Tone &amp; Hardware Strobe</Text>
        <Text style={styles.sectionSubtitle}>
          Configure emergency alert sound and camera flashlight for field operations.
        </Text>

        {/* Flashlight Strobe Row */}
        <View style={styles.prefRow}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.prefTitle}>Flashlight Strobe on Alert</Text>
            <Text style={styles.prefDesc}>
              Rapid rear camera LED flash for dark quarters or noisy storms.
            </Text>
          </View>
          <Switch
            value={strobeEnabled}
            onValueChange={handleToggleStrobe}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#ffffff"
          />
        </View>

        {/* Siren Sound Tone Row */}
        <View style={[styles.prefRow, { borderTopWidth: 1, borderTopColor: colors.borderSoft, paddingTop: 14 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.prefTitle}>Alert Siren Tone</Text>
            <View style={styles.toneStatusRow}>
              <View style={[styles.toneDot, { backgroundColor: soundSettings.isDefault ? colors.primary : colors.amber }]} />
              <Text style={styles.toneName} numberOfLines={1}>
                {soundSettings.title}
              </Text>
            </View>

            {/* Tactical Actions: Play Sample, Choose File, Reset */}
            <View style={styles.toneActionsRow}>
              <TouchableOpacity
                style={[styles.toneBtn, isPreviewing && styles.toneBtnActive]}
                onPress={handlePreviewSound}
                activeOpacity={0.8}
              >
                <Text style={[styles.toneBtnText, isPreviewing && styles.toneBtnTextActive]}>
                  {isPreviewing
                    ? "PLAYING..."
                    : soundSettings.isDefault
                      ? "▶ PLAY SAMPLE"
                      : "▶ PLAY YOUR OWN ALERT TONE"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toneBtn}
                onPress={handlePickSound}
                activeOpacity={0.8}
              >
                <Text style={styles.toneBtnText}>CHOOSE .MP3 / .WAV</Text>
              </TouchableOpacity>

              {!soundSettings.isDefault && (
                <TouchableOpacity
                  style={[styles.toneBtn, styles.toneBtnReset]}
                  onPress={handleResetSound}
                  activeOpacity={0.8}
                >
                  <Text style={styles.toneBtnResetText}>RESET TO DEFAULT</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* 4. Hardware Authorization Notice (Admin-only security lock) */}
      <View style={[styles.card, styles.authNoticeCard]}>
        <View style={styles.authNoticeHeader}>
          <Text style={styles.authNoticeLock}>🔒</Text>
          <Text style={styles.authNoticeTitle}>Hardware Device Authorization</Text>
        </View>
        <Text style={styles.authNoticeText}>
          This phone is enrolled in the 10RCDG emergency mobilization grid. If you replace or upgrade your phone, coordinate with your Unit Administrator to re-pair access via Command QR Code.
        </Text>
      </View>

      {/* 5. Help & Troubleshooting */}
      <View style={[styles.card, styles.helpCard]}>
        <Text style={styles.cardTitle}>Need Help or Siren Not Ringing?</Text>

        <View style={styles.helpSection}>
          <Text style={styles.helpSubtitle}>1. Common Phone Fixes</Text>
          <Text style={styles.helpBullet}>
            • Ensure <Text style={styles.helpBold}>Alarm volume</Text> is turned up (sirens use Alarm volume, not media volume).
          </Text>
          <Text style={styles.helpBullet}>
            • For Xiaomi / Oppo / Vivo: enable <Text style={styles.helpBold}>"Autostart"</Text> in phone settings so the siren wakes up in background.
          </Text>
          <Text style={styles.helpBullet}>
            • <Text style={styles.helpBold}>Android 15 & 16 Zero-Permission:</Text> Layer 2 Google SMS Retriever is active. Sirens will sound offline even if Android greys out classic SMS permissions.
          </Text>
        </View>

        <View style={styles.helpSection}>
          <Text style={styles.helpSubtitle}>2. Changed Your SIM / Phone Number?</Text>
          <Text style={styles.helpText}>
            Alerts are tied to your registered roster mobile number in the portal. Notify the in-charge portal administrator immediately to update your record.
          </Text>
        </View>

        <View style={styles.helpSection}>
          <Text style={styles.helpSubtitle}>3. Technical Support &amp; Inquiries</Text>
          <Text style={styles.helpText}>
            Contact the in-charge personnel of the portal, your system administrator, or message the official 10RCDG unit page:
          </Text>

          <TouchableOpacity
            style={styles.fbBtn}
            onPress={() => Linking.openURL("https://www.facebook.com/profile.php?id=61586365277137")}
            activeOpacity={0.85}
          >
            <View style={styles.fbBadge}>
              <Text style={styles.fbBadgeText}>f</Text>
            </View>
            <Text style={styles.fbBtnText}>10RCDG RESCOM Facebook Page</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.clearBtn} onPress={handleClear} activeOpacity={0.8}>
        <Text style={styles.clearText}>Clear saved alerts on this phone</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>RESCOM ALERT · Version 1.1.0 · 10RCDG RESCOM, PA</Text>
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
  cardTitle: { fontSize: 15, fontWeight: "800", color: colors.text, marginTop: 4 },
  sectionSubtitle: { fontSize: 12, color: colors.textMuted, lineHeight: 18, marginTop: 2, marginBottom: 12 },

  prefRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10 },
  prefTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  prefDesc: { fontSize: 12, color: colors.textMuted, marginTop: 2, lineHeight: 17 },

  toneStatusRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6, backgroundColor: colors.subtle, padding: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderSoft },
  toneDot: { width: 8, height: 8, borderRadius: 4 },
  toneName: { fontSize: 13, fontWeight: "700", color: colors.text, flex: 1 },

  toneActionsRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" },
  toneBtn: { backgroundColor: colors.subtle, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 8 },
  toneBtnActive: { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder },
  toneBtnText: { fontSize: 11, fontWeight: "800", color: colors.primaryText, letterSpacing: 0.3 },
  toneBtnTextActive: { color: colors.primary },
  toneBtnReset: { backgroundColor: "#fef2f2", borderColor: "#fecaca" },
  toneBtnResetText: { fontSize: 11, fontWeight: "800", color: "#b91c1c", letterSpacing: 0.3 },

  authNoticeCard: { marginTop: 14, paddingVertical: 14, backgroundColor: "#f8fafc", borderColor: "#cbd5e1" },
  authNoticeHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  authNoticeLock: { fontSize: 14 },
  authNoticeTitle: { fontSize: 13, fontWeight: "800", color: colors.text },
  authNoticeText: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },

  helpCard: { marginTop: 14, paddingVertical: 14 },
  helpSection: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.borderSoft },
  helpSubtitle: { fontSize: 13, fontWeight: "800", color: colors.primary, marginBottom: 4 },
  helpBullet: { fontSize: 12, color: colors.textMuted, lineHeight: 18, marginTop: 3 },
  helpBold: { fontWeight: "700", color: colors.text },
  helpText: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  fbBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 10, backgroundColor: "#1877F2", borderRadius: radius.md, paddingVertical: 11, paddingHorizontal: 14 },
  fbBadge: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  fbBadgeText: { color: "#1877F2", fontWeight: "900", fontSize: 14, marginTop: -2 },
  fbBtnText: { color: "#fff", fontSize: 13, fontWeight: "800", letterSpacing: 0.3 },

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

  soldierCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 14, marginBottom: 12, ...shadow },
  soldierCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  soldierCardName: { fontSize: 16, fontWeight: "800", color: colors.text },
  soldierCardUnit: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  soldierCardTelemetry: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.borderSoft },
  soldierCardPhone: { fontSize: 12, fontFamily: Platform.OS === "android" ? "monospace" : "Menlo", color: colors.textMuted, fontWeight: "600" },
  boundBadge: { backgroundColor: colors.primarySoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: colors.primaryBorder },
  boundBadgeText: { fontSize: 10, fontWeight: "800", color: colors.primary, letterSpacing: 0.5 },

  pairDeviceBanner: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.primary, borderStyle: "dashed", borderRadius: radius.lg, marginBottom: 12 },
  pairIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  pairPlus: { fontSize: 20, fontWeight: "900", color: colors.primary },
  pairTitle: { fontSize: 14, fontWeight: "800", color: colors.text },
  pairSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  clearBtn: { marginTop: 18, paddingVertical: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.redBorder, backgroundColor: colors.card, alignItems: "center" },
  clearText: { color: colors.red, fontWeight: "700", fontSize: 14 },
  footer: { textAlign: "center", fontSize: 11, color: colors.textFaint, marginTop: 20 },
});
