import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { convexHttpService, VerifyMobileResult } from "../services/convexHttp";
import { alertBridgeService } from "../services/alertBridge";
import { RankInsignia } from "./RankInsignia";
import { colors, radius } from "../theme";

interface DevicePairingModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (soldier: any) => void;
}

type Notice = { tone: "error" | "warn"; title: string; body: string } | null;

function formatPhMobileInput(value: string): string {
  if (!value) return "";
  const clean = value.replace(/[^\d+]/g, "");

  if (clean.startsWith("+63")) {
    let digits = clean.slice(3).replace(/\D/g, "");
    if (digits.startsWith("0")) digits = digits.slice(1);
    digits = digits.slice(0, 10);
    if (digits.length === 0) return "+63";
    if (digits.length <= 3) return `+63 ${digits}`;
    if (digits.length <= 6) return `+63 ${digits.slice(0, 3)} ${digits.slice(3)}`;
    return `+63 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
  } else if (clean.startsWith("639") || clean.startsWith("6309")) {
    let digits = clean.slice(2).replace(/\D/g, "");
    if (digits.startsWith("0")) digits = digits.slice(1);
    digits = digits.slice(0, 10);
    if (digits.length <= 3) return `+63 ${digits}`;
    if (digits.length <= 6) return `+63 ${digits.slice(0, 3)} ${digits.slice(3)}`;
    return `+63 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
  } else if (clean.startsWith("+")) {
    return clean.slice(0, 16);
  } else if (clean.startsWith("9")) {
    const digits = ("0" + clean).replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`;
  }

  const digits = clean.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`;
}

function getDeviceModel(hw?: { manufacturer: string; model: string }): string {
  const c: any = Platform.constants || {};
  const parts = [hw?.manufacturer || c.Manufacturer, hw?.model || c.Model].filter(Boolean);
  return parts.length ? parts.join(" ") : "Android Device";
}

/** Maps every backend status to an on-screen message (no more silent taps). */
function noticeFor(res: VerifyMobileResult): Notice {
  switch (res.status) {
    case "REGISTERED":
      return res.soldier
        ? null
        : { tone: "error", title: "Something went wrong", body: "Your record could not be loaded. Please try again." };
    case "NOT_FOUND":
      return {
        tone: "error",
        title: "Number not on the roster",
        body: "This number is not in the 10RCDG personnel list. If you just enlisted, contact your unit duty officer.",
      };
    case "PENDING_ENLISTMENT":
      return {
        tone: "warn",
        title: "Enlistment still under review",
        body: "Your enlistment has not been approved yet. You can pair this phone once your unit officer approves it.",
      };
    case "DEVICE_UNBOUND":
      return {
        tone: "warn",
        title: "Phone not enrolled yet",
        body: "This number has no enrolled phone. Enroll through your unit's Enlistment Link or ask your Unit Officer for a Command QR code.",
      };
    case "DEVICE_MISMATCH":
      return {
        tone: "error",
        title: "Number linked to another phone",
        body: res.message || "This number is already bound to a different phone. Coordinate with your Unit Adjutant.",
      };
    case "PORTAL_LOCKED":
      return {
        tone: "warn",
        title: "Pairing temporarily disabled",
        body: res.message || "Headquarters has paused phone pairing. Please try again later.",
      };
    case "INVALID_INPUT":
      return { tone: "error", title: "Invalid number", body: res.message || "Enter an 11-digit mobile number like 0917 123 4567." };
    case "NETWORK_ERROR":
    default:
      return {
        tone: "error",
        title: "Can't reach the server",
        body: res.message || "Check your internet connection and try again.",
      };
  }
}

export const DevicePairingModal: React.FC<DevicePairingModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const [mobileNumber, setMobileNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerifyMobileResult | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    if (!visible) {
      setNotice(null);
      setLoading(false);
    }
  }, [visible]);

  const formatInput = (text: string) => {
    setNotice(null);
    setMobileNumber(formatPhMobileInput(text));
  };

  const handleVerify = async () => {
    const cleanDigits = mobileNumber.replace(/\D/g, "");
    if (cleanDigits.length < 10) {
      setNotice({ tone: "error", title: "Invalid number", body: "Enter an 11-digit mobile number like 0917 123 4567." });
      return;
    }

    setLoading(true);
    setNotice(null);
    setVerificationResult(null);

    const hw = await alertBridgeService.getHardwareDeviceInfo();
    if (!hw.deviceId) {
      setLoading(false);
      setNotice({
        tone: "error",
        title: "Can't identify this phone",
        body: "The app couldn't read this phone's hardware ID. Please install the latest version of RESCOM Alert.",
      });
      return;
    }

    const res = await convexHttpService.verifyMobile(mobileNumber.trim(), hw.deviceId);
    const n = noticeFor(res);
    if (n) setNotice(n);
    else setVerificationResult(res);
    setLoading(false);
  };

  const handleConfirmPairing = async () => {
    if (!verificationResult?.soldier) return;
    const soldier = verificationResult.soldier;

    setLoading(true);
    const hw = await alertBridgeService.getHardwareDeviceInfo();
    const realFcmToken = (await alertBridgeService.getFcmToken()) || `fcm_${Date.now()}`;
    const result = await convexHttpService.linkDevice({
      soldierId: soldier.id,
      fcmToken: realFcmToken,
      deviceModel: getDeviceModel(hw),
      appDeviceId: hw.deviceId,
    });

    if (result === "MISMATCH") {
      setLoading(false);
      setVerificationResult(null);
      setNotice({
        tone: "error",
        title: "Number linked to another phone",
        body: "This number is already paired to another phone. Ask your Unit Officer to unlink the old phone first.",
      });
      return;
    }
    if (result === "FAILED") {
      setLoading(false);
      setVerificationResult(null);
      setNotice({
        tone: "error",
        title: "Can't reach the server",
        body: "Pairing was not completed. Check your internet connection and try again.",
      });
      return;
    }

    // Only persist locally once the server has bound this phone
    await alertBridgeService.saveSoldierProfile(soldier);
    setLoading(false);

    setVerificationResult(null);
    setMobileNumber("");
    onSuccess(soldier);
    onClose();
  };

  const soldier = verificationResult?.soldier;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.seals}>
              <View style={[styles.sealWrap, { zIndex: 2 }]}>
                <Image source={require("../assets/rescom-pa-seal.png")} style={styles.seal} />
              </View>
              <View style={[styles.sealWrap, { marginLeft: -8 }]}>
                <Image source={require("../assets/rescom-emblem.jpg")} style={styles.seal} />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>PHONE SETUP</Text>
              <Text style={styles.headerTitle}>Link this phone</Text>
            </View>
          </View>

          {!soldier ? (
            <>
              <Text style={styles.instructions}>
                Enter the mobile number registered with your unit. We'll check it against the 10RCDG roster.
              </Text>

              <Text style={styles.label}>Mobile number</Text>
              <View style={[styles.inputContainer, notice?.tone === "error" && styles.inputError]}>
                <Text style={styles.inputPrefix}>🇵🇭</Text>
                <TextInput
                  style={styles.input}
                  value={mobileNumber}
                  onChangeText={formatInput}
                  placeholder="0917 123 4567"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="phone-pad"
                  maxLength={17}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleVerify}
                />
              </View>

              {notice && (
                <View style={[styles.notice, notice.tone === "warn" ? styles.noticeWarn : styles.noticeError]}>
                  <Text style={[styles.noticeTitle, { color: notice.tone === "warn" ? colors.amberDark : colors.red }]}>
                    {notice.title}
                  </Text>
                  <Text style={styles.noticeBody}>{notice.body}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.btnDisabled]}
                onPress={handleVerify}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.btnText}>Verify number</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryBtn} onPress={onClose}>
                <Text style={styles.secondaryText}>Skip for now</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.confirmedPill}>
                <Text style={styles.confirmedText}>✓ Identity confirmed</Text>
              </View>

              <View style={styles.previewCard}>
                <View style={styles.previewTop}>
                  <RankInsignia rank={soldier.rank} size={22} showBadgePill />
                  <Text style={styles.previewName}>
                    {soldier.firstName} {soldier.lastName}
                  </Text>
                </View>
                <Text style={styles.previewUnit}>
                  {soldier.groupName} • {soldier.unit || "10RCDG"}
                </Text>
                <Text style={styles.previewNumber}>{soldier.mobileNumber}</Text>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.btnDisabled]}
                onPress={handleConfirmPairing}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.btnText}>Activate siren on this phone</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setVerificationResult(null)}>
                <Text style={styles.secondaryText}>Use a different number</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  seals: { flexDirection: "row" },
  sealWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  seal: { width: "100%", height: "100%", resizeMode: "contain" },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.primaryText,
    letterSpacing: 1.2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    marginTop: 2,
  },
  instructions: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textBody,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  inputError: { borderColor: colors.redBorder, backgroundColor: colors.redSoft },
  inputPrefix: { fontSize: 16, marginRight: 8 },
  input: {
    flex: 1,
    height: 52,
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: 0.5,
  },
  notice: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  noticeError: { backgroundColor: colors.redSoft, borderColor: colors.redBorder },
  noticeWarn: { backgroundColor: colors.amberSoft, borderColor: colors.amberBorder },
  noticeTitle: { fontSize: 13, fontWeight: "800", marginBottom: 2 },
  noticeBody: { fontSize: 13, color: colors.textBody, lineHeight: 18 },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 15, fontWeight: "800", color: "#ffffff" },
  secondaryBtn: { alignItems: "center", paddingVertical: 14 },
  secondaryText: { fontSize: 14, color: colors.textMuted, fontWeight: "600" },
  confirmedPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 10,
  },
  confirmedText: { fontSize: 12, fontWeight: "800", color: colors.primaryText },
  previewCard: {
    backgroundColor: colors.subtle,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  previewTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  previewName: { fontSize: 17, fontWeight: "800", color: colors.text, flex: 1 },
  previewUnit: { fontSize: 13, color: colors.textBody, fontWeight: "600" },
  previewNumber: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
});
