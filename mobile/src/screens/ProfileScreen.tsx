import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { alertBridgeService, PermissionStatus } from "../services/alertBridge";
import { SoldierProfile } from "../types";

export const ProfileScreen: React.FC = () => {
  const [profile, setProfile] = useState<SoldierProfile>({
    rank: "PVT",
    firstName: "Juan",
    lastName: "Dela Cruz",
    serialNumber: "948123-PA",
    mobileNumber: "0951 781 9847",
    unit: "1001st CDC (Davao del Norte)",
    groupName: "Ready Reserve Battalion",
    readiness: "READY",
  });

  const [permissions, setPermissions] = useState<PermissionStatus>({
    hasSmsPermission: true,
    isBatteryIgnored: false,
  });

  const checkPerms = async () => {
    const res = await alertBridgeService.checkSystemPermissions();
    setPermissions(res);
  };

  useEffect(() => {
    checkPerms();
  }, []);

  const handleRequestBattery = async () => {
    await alertBridgeService.requestBatteryExemption();
    setTimeout(checkPerms, 2000);
  };

  const handleClearHistory = () => {
    Alert.alert(
      "Clear Alert History",
      "Are you sure you want to clear stored local broadcast logs on this device?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            await alertBridgeService.clearHistory();
            Alert.alert("Cleared", "Local broadcast history cleared.");
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Soldier ID Card */}
      <View style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <View style={styles.rankBadge}>
            <Text style={styles.rankBadgeText}>{profile.rank}</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.soldierName}>
              {profile.rank} {profile.firstName} {profile.lastName}
            </Text>
            <Text style={styles.serialText}>AFPSN: {profile.serialNumber}</Text>
          </View>
        </View>

        <View style={styles.infoDivider} />

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Assigned Unit:</Text>
          <Text style={styles.infoValue}>{profile.unit}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Contact Group:</Text>
          <Text style={styles.infoValue}>{profile.groupName}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Mobile Number:</Text>
          <Text style={styles.infoValueHighlight}>{profile.mobileNumber}</Text>
        </View>
      </View>

      {/* Permissions & Emergency Device Health */}
      <View style={styles.settingsCard}>
        <Text style={styles.sectionTitle}>🛡️ DEVICE ALARM HEALTH & PERMISSIONS</Text>
        <Text style={styles.sectionDesc}>
          Ensure all permissions are active so emergency dispatches can wake your screen and sound the siren.
        </Text>

        {/* Permission 1: SMS Broadcast Receiver */}
        <View style={styles.permRow}>
          <View style={styles.permInfo}>
            <Text style={styles.permName}>SMS Broadcast Interceptor</Text>
            <Text style={styles.permDesc}>Catches [10RCDG] emergency signals offline</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              permissions.hasSmsPermission ? styles.statusActive : styles.statusWarning,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                permissions.hasSmsPermission ? styles.statusTextActive : styles.statusTextWarning,
              ]}
            >
              {permissions.hasSmsPermission ? "ACTIVE" : "PERMISSION REQUIRED"}
            </Text>
          </View>
        </View>

        {/* Permission 2: Lock Screen & Alarm Audio */}
        <View style={styles.permRow}>
          <View style={styles.permInfo}>
            <Text style={styles.permName}>Full-Screen Lock Siren</Text>
            <Text style={styles.permDesc}>Wakes display and sounds alarm over Silent</Text>
          </View>
          <View style={[styles.statusBadge, styles.statusActive]}>
            <Text style={[styles.statusText, styles.statusTextActive]}>ACTIVE</Text>
          </View>
        </View>

        {/* Permission 3: Battery Optimization Exemption */}
        <View style={styles.permRow}>
          <View style={styles.permInfo}>
            <Text style={styles.permName}>Infinix / Xiaomi Battery Saver</Text>
            <Text style={styles.permDesc}>Prevents background app sleep</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.statusBadge,
              permissions.isBatteryIgnored ? styles.statusActive : styles.statusAction,
            ]}
            onPress={handleRequestBattery}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.statusText,
                permissions.isBatteryIgnored ? styles.statusTextActive : styles.statusTextAction,
              ]}
            >
              {permissions.isBatteryIgnored ? "OPTIMIZED" : "ENABLE NOW"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Danger Zone / Local Logs */}
      <View style={styles.dangerCard}>
        <TouchableOpacity
          style={styles.clearBtn}
          onPress={handleClearHistory}
          activeOpacity={0.7}
        >
          <Text style={styles.clearBtnText}>🗑️ Clear Local Alert History</Text>
        </TouchableOpacity>
        <Text style={styles.footerNote}>
          10th Regional Community Defense Group (10RCDG) • Reserve Command, Philippine Army
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#090D16",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: "#131B2E",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#1E293B",
    marginBottom: 20,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  rankBadge: {
    backgroundColor: "#047857",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#10B981",
    marginRight: 14,
  },
  rankBadgeText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "monospace",
  },
  headerText: {
    flex: 1,
  },
  soldierName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  serialText: {
    color: "#F59E0B",
    fontSize: 11,
    fontWeight: "bold",
    fontFamily: "monospace",
    marginTop: 2,
  },
  infoDivider: {
    height: 1,
    backgroundColor: "#1E293B",
    marginVertical: 14,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  infoLabel: {
    color: "#64748B",
    fontSize: 12,
  },
  infoValue: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "500",
  },
  infoValueHighlight: {
    color: "#10B981",
    fontSize: 12,
    fontWeight: "bold",
    fontFamily: "monospace",
  },
  settingsCard: {
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#1E293B",
    marginBottom: 20,
  },
  sectionTitle: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  sectionDesc: {
    color: "#64748B",
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 16,
  },
  permRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  permInfo: {
    flex: 1,
    marginRight: 10,
  },
  permName: {
    color: "#F1F5F9",
    fontSize: 12,
    fontWeight: "600",
  },
  permDesc: {
    color: "#64748B",
    fontSize: 10,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: "#064E3B",
  },
  statusWarning: {
    backgroundColor: "#451A03",
  },
  statusAction: {
    backgroundColor: "#B45309",
  },
  statusText: {
    fontSize: 9,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  statusTextActive: {
    color: "#6EE7B7",
  },
  statusTextWarning: {
    color: "#FCD34D",
  },
  statusTextAction: {
    color: "#FFFFFF",
  },
  dangerCard: {
    alignItems: "center",
    paddingVertical: 10,
  },
  clearBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#1E293B",
    marginBottom: 16,
  },
  clearBtnText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "bold",
  },
  footerNote: {
    color: "#475569",
    fontSize: 10,
    textAlign: "center",
    fontFamily: "monospace",
  },
});
