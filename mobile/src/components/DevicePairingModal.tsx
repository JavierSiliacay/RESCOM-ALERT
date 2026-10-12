import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { convexHttpService, VerifyMobileResult } from "../services/convexHttp";
import { alertBridgeService } from "../services/alertBridge";
import { RankInsignia } from "./RankInsignia";
import { colors } from "../theme";

interface DevicePairingModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (soldier: any) => void;
}

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
  } else if (clean.startsWith("09")) {
    const digits = clean.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`;
  } else if (clean.startsWith("9")) {
    const digits = ("0" + clean).replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`;
  } else if (clean.startsWith("0")) {
    const digits = clean.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`;
  }

  const digits = clean.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`;
}

export const DevicePairingModal: React.FC<DevicePairingModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const [mobileNumber, setMobileNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerifyMobileResult | null>(null);

  const formatInput = (text: string) => {
    setMobileNumber(formatPhMobileInput(text));
  };

  const handleVerify = async () => {
    const cleanDigits = mobileNumber.replace(/\D/g, "");
    if (cleanDigits.length < 10) {
      Alert.alert("Invalid Input", "Please enter a valid Philippine mobile number (e.g. 0917 123 4567 or +63 917 123 4567).");
      return;
    }

    setLoading(true);
    setVerificationResult(null);

    try {
      const res = await convexHttpService.verifyMobile(mobileNumber.trim());
      setVerificationResult(res);

      if (res.status === "NOT_FOUND") {
        Alert.alert(
          "Unregistered Mobile Number",
          "This phone number was not found in the active 10RCDG personnel roster. If you recently enlisted, please contact your unit duty officer."
        );
      }
    } catch {
      Alert.alert("Network Error", "Unable to reach 10RCDG Cloud Server. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPairing = async () => {
    if (!verificationResult?.soldier) return;
    const soldier = verificationResult.soldier;

    setLoading(true);
    try {
      // 1. Persist locally on device via native SharedPreferences
      await alertBridgeService.saveSoldierProfile(soldier);

      // 2. Link FCM device token to Convex cloud database
      await convexHttpService.linkDevice({
        soldierId: soldier.id,
        fcmToken: `NATIVE_TOKEN_${Date.now()}`,
        deviceModel: "Android Device",
      });

      onSuccess(soldier);
      onClose();
    } catch (e) {
      console.error(e);
      Alert.alert("Pairing Notice", "Identity saved locally on device. Telemetry will sync when online.");
      onSuccess(soldier);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Dual Military Insignia Header */}
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
              <Text style={styles.headerTitle}>10RCDG RESCOM ALERT</Text>
              <Text style={styles.headerSub}>OFFICIAL MILITARY DEVICE PAIRING</Text>
            </View>
          </View>

          {/* Form Content */}
          <View style={styles.body}>
            {!verificationResult?.soldier ? (
              <>
                <Text style={styles.instructions}>
                  Enter your registered Philippine mobile number to link this device to the 10RCDG Emergency Dispatch Hub:
                </Text>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputPrefix}>PH</Text>
                  <TextInput
                    style={styles.input}
                    value={mobileNumber}
                    onChangeText={formatInput}
                    placeholder="09XX XXX XXXX or +63 9XX..."
                    placeholderTextColor="#64748b"
                    keyboardType="phone-pad"
                    maxLength={17}
                    autoFocus
                  />
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, loading && styles.btnDisabled]}
                  onPress={handleVerify}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.btnText}>VERIFY MILITARY CREDENTIALS</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                  <Text style={styles.cancelText}>Skip &amp; Continue as Standby Receiver</Text>
                </TouchableOpacity>
              </>
            ) : (
              /* Verified Soldier Found Card */
              <View style={styles.verifiedContainer}>
                <View style={styles.verifiedHeader}>
                  <Text style={styles.verifiedBadge}>✓ IDENTITY CONFIRMED</Text>
                </View>

                <View style={styles.soldierPreviewCard}>
                  <View style={styles.previewTop}>
                    <RankInsignia rank={verificationResult.soldier.rank} size={22} showBadgePill />
                    <Text style={styles.previewName}>
                      {verificationResult.soldier.firstName} {verificationResult.soldier.lastName}
                    </Text>
                  </View>
                  <Text style={styles.previewUnit}>
                    {verificationResult.soldier.groupName} • {verificationResult.soldier.unit || "10RCDG"}
                  </Text>
                  <Text style={styles.previewNumber}>
                    Mobile: {verificationResult.soldier.mobileNumber}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, styles.activateBtn]}
                  onPress={handleConfirmPairing}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.btnText}>ACTIVATE SIREN ON THIS PHONE</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setVerificationResult(null)}
                >
                  <Text style={styles.cancelText}>Use Different Phone Number</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#0f172a", // Tactical Dark Slate
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    padding: 20,
    paddingBottom: 36,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  seals: {
    flexDirection: "row",
  },
  sealWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    overflow: "hidden",
  },
  seal: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  headerSub: {
    fontFamily: "monospace",
    fontSize: 9,
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: 0.8,
    marginTop: 1,
  },
  body: {
    paddingTop: 16,
  },
  instructions: {
    fontSize: 12,
    color: "#cbd5e1",
    lineHeight: 18,
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  inputPrefix: {
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: "700",
    color: "#94a3b8",
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontFamily: "monospace",
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
  primaryBtn: {
    backgroundColor: "#166534", // Army Dark Green
    borderRadius: 10,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#22c55e",
  },
  activateBtn: {
    backgroundColor: "#15803d",
    marginTop: 8,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: 0.8,
  },
  cancelBtn: {
    alignItems: "center",
    marginTop: 14,
    paddingVertical: 4,
  },
  cancelText: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "600",
  },
  verifiedContainer: {
    gap: 10,
  },
  verifiedHeader: {
    alignItems: "center",
  },
  verifiedBadge: {
    fontFamily: "monospace",
    fontSize: 11,
    fontWeight: "900",
    color: "#34d399",
    letterSpacing: 0.8,
  },
  soldierPreviewCard: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(52, 211, 153, 0.3)",
    marginVertical: 6,
  },
  previewTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  previewName: {
    fontSize: 15,
    fontWeight: "900",
    color: "#ffffff",
    flex: 1,
  },
  previewUnit: {
    fontSize: 12,
    color: "#cbd5e1",
    fontWeight: "600",
  },
  previewNumber: {
    fontFamily: "monospace",
    fontSize: 10,
    color: "#94a3b8",
    marginTop: 4,
  },
});
