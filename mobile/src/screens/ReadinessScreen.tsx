import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { ReadinessState } from "../types";

export const ReadinessScreen: React.FC = () => {
  const [status, setStatus] = useState<ReadinessState>("READY");
  const [checklist, setChecklist] = useState([
    { id: "bda", label: "Battle Dress Attire (BDA Uniform)", checked: true },
    { id: "boots", label: "Combat Boots & Military Belt", checked: true },
    { id: "id", label: "AFP Military ID / Reservist Card", checked: true },
    { id: "aid", label: "First Aid Kit & Personal Meds", checked: false },
    { id: "light", label: "Tactical Flashlight & Headlamp", checked: true },
    { id: "power", label: "Fully Charged Powerbank & Radio", checked: false },
  ]);

  const toggleItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const handleStatusChange = (newStatus: ReadinessState) => {
    setStatus(newStatus);
    const label =
      newStatus === "READY"
        ? "Active Standby / Ready for Immediate Deployment"
        : newStatus === "STANDBY"
        ? "Civilian Work / Remote Standby"
        : "Unavailable / On Leave";
    Alert.alert("Duty Status Updated", `Your unit status is now: ${label}`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Active Duty Status Card */}
      <View style={styles.statusCard}>
        <Text style={styles.sectionTag}>🛡️ MOBILIZATION READINESS</Text>
        <Text style={styles.statusTitle}>Current Deployment Status</Text>
        <Text style={styles.statusDesc}>
          Keep your availability updated so 10RCDG S3 Command knows your deployment readiness in an emergency.
        </Text>

        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[
              styles.statusOption,
              status === "READY" && styles.statusOptionReady,
            ]}
            onPress={() => handleStatusChange("READY")}
            activeOpacity={0.8}
          >
            <Text style={styles.statusEmoji}>🟢</Text>
            <Text
              style={[
                styles.statusOptionText,
                status === "READY" && styles.statusOptionTextActive,
              ]}
            >
              READY
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statusOption,
              status === "STANDBY" && styles.statusOptionStandby,
            ]}
            onPress={() => handleStatusChange("STANDBY")}
            activeOpacity={0.8}
          >
            <Text style={styles.statusEmoji}>🟡</Text>
            <Text
              style={[
                styles.statusOptionText,
                status === "STANDBY" && styles.statusOptionTextActive,
              ]}
            >
              STANDBY
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statusOption,
              status === "UNAVAILABLE" && styles.statusOptionOff,
            ]}
            onPress={() => handleStatusChange("UNAVAILABLE")}
            activeOpacity={0.8}
          >
            <Text style={styles.statusEmoji}>🔴</Text>
            <Text
              style={[
                styles.statusOptionText,
                status === "UNAVAILABLE" && styles.statusOptionTextActive,
              ]}
            >
              ON LEAVE
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Emergency Gear Checklist */}
      <View style={styles.checklistCard}>
        <View style={styles.checklistHeader}>
          <Text style={styles.checklistTitle}>🪖 RAPID MUSTER GEAR CHECKLIST</Text>
          <Text style={styles.checklistCount}>
            {checklist.filter((c) => c.checked).length} / {checklist.length} READY
          </Text>
        </View>

        {checklist.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.checkItem}
            onPress={() => toggleItem(item.id)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.checkbox,
                item.checked ? styles.checkboxChecked : styles.checkboxUnchecked,
              ]}
            >
              {item.checked && <Text style={styles.checkMark}>✓</Text>}
            </View>
            <Text
              style={[
                styles.checkLabel,
                item.checked && styles.checkLabelActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
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
  statusCard: {
    backgroundColor: "#131B2E",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#1E293B",
    marginBottom: 20,
  },
  sectionTag: {
    color: "#F59E0B",
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 1,
    marginBottom: 8,
  },
  statusTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statusDesc: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: "row",
    gap: 8,
  },
  statusOption: {
    flex: 1,
    backgroundColor: "#0F172A",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  statusOptionReady: {
    backgroundColor: "#064E3B",
    borderColor: "#10B981",
  },
  statusOptionStandby: {
    backgroundColor: "#451A03",
    borderColor: "#F59E0B",
  },
  statusOptionOff: {
    backgroundColor: "#450A0A",
    borderColor: "#EF4444",
  },
  statusEmoji: {
    fontSize: 14,
    marginBottom: 4,
  },
  statusOptionText: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  statusOptionTextActive: {
    color: "#FFFFFF",
  },
  checklistCard: {
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  checklistHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  checklistTitle: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  checklistCount: {
    color: "#10B981",
    fontSize: 11,
    fontWeight: "bold",
    fontFamily: "monospace",
  },
  checkItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: "#059669",
    borderColor: "#10B981",
  },
  checkboxUnchecked: {
    borderColor: "#475569",
    backgroundColor: "#0F172A",
  },
  checkMark: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  checkLabel: {
    color: "#94A3B8",
    fontSize: 13,
    flex: 1,
  },
  checkLabelActive: {
    color: "#F1F5F9",
    fontWeight: "500",
  },
});
