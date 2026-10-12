import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { RankInsignia } from "./RankInsignia";
import { colors } from "../theme";

export interface SoldierHeaderCardProps {
  soldier: {
    firstName: string;
    lastName: string;
    rank: string;
    unit?: string;
    groupName?: string;
    mobileNumber: string;
  } | null;
  isArmed?: boolean;
}

/**
 * Mil-Spec Tactical Soldier Identity Header
 * Displays official Philippine Army rank insignia, soldier identity,
 * unit group affiliation, and real-time operational siren status.
 */
export const SoldierHeaderCard: React.FC<SoldierHeaderCardProps> = ({
  soldier,
  isArmed = true,
}) => {
  if (!soldier) {
    return (
      <View style={styles.card}>
        <View style={styles.statusBar}>
          <View style={[styles.dot, { backgroundColor: colors.amber }]} />
          <Text style={[styles.statusText, { color: colors.amber }]}>
            DEVICE UNLINKED // STANDBY
          </Text>
        </View>
        <Text style={styles.unlinkedTitle}>10RCDG RESCOM ALERT RECEIVER</Text>
        <Text style={styles.unlinkedSub}>
          Tap &quot;Phone Setup&quot; below to pair your registered military mobile number.
        </Text>
      </View>
    );
  }

  const fullName = `${soldier.firstName} ${soldier.lastName}`.toUpperCase().trim();
  const unitLine = [soldier.groupName, soldier.unit].filter(Boolean).join(" • ");

  return (
    <View style={styles.card}>
      {/* Top Telemetry & Siren Status Row */}
      <View style={styles.statusBar}>
        <View style={styles.statusLeft}>
          <View style={[styles.dot, isArmed ? styles.dotArmed : styles.dotStandby]} />
          <Text style={[styles.statusText, isArmed ? styles.textArmed : styles.textStandby]}>
            {isArmed ? "ARMED & READY // SIREN ACTIVE" : "STANDBY // PERMISSION REQUIRED"}
          </Text>
        </View>
        <Text style={styles.telemetryTag}>10RCDG PA</Text>
      </View>

      {/* Greeting & Identity Section */}
      <View style={styles.identitySection}>
        <Text style={styles.greetingText}>Welcome Back!</Text>

        <View style={styles.nameRow}>
          <RankInsignia rank={soldier.rank} size={18} showBadgePill={true} />
          <Text style={styles.soldierName} numberOfLines={1}>
            {fullName}
          </Text>
        </View>

        {unitLine ? (
          <Text style={styles.unitText} numberOfLines={1}>
            {unitLine}
          </Text>
        ) : null}
      </View>

      {/* Monospaced Hardware & Radio Telemetry Strip */}
      <View style={styles.telemetryStrip}>
        <View style={styles.telemetryItem}>
          <Text style={styles.telemetryLabel}>REG NUMBER:</Text>
          <Text style={styles.telemetryValue}>{soldier.mobileNumber}</Text>
        </View>
        <View style={styles.telemetryDivider} />
        <View style={styles.telemetryItem}>
          <Text style={styles.telemetryLabel}>CHANNELS:</Text>
          <Text style={styles.telemetryValue}>PUSH & SMS</Text>
        </View>
        <View style={styles.telemetryDivider} />
        <View style={styles.telemetryItem}>
          <Text style={styles.telemetryLabel}>LINK:</Text>
          <Text style={[styles.telemetryValue, { color: "#10b981" }]}>
            VERIFIED
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#0f172a", // Tactical Dark Slate
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  statusLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotArmed: {
    backgroundColor: "#10b981", // Emerald
  },
  dotStandby: {
    backgroundColor: "#f59e0b", // Amber
  },
  statusText: {
    fontFamily: "monospace",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  textArmed: {
    color: "#34d399",
  },
  textStandby: {
    color: "#fbbf24",
  },
  telemetryTag: {
    fontFamily: "monospace",
    fontSize: 9,
    fontWeight: "700",
    color: "#64748b",
    letterSpacing: 0.5,
  },
  identitySection: {
    paddingVertical: 10,
  },
  greetingText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94a3b8",
    marginBottom: 3,
    letterSpacing: 0.3,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "nowrap",
  },
  soldierName: {
    fontSize: 16,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: 0.4,
    flex: 1,
  },
  unitText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#cbd5e1",
    marginTop: 4,
  },
  telemetryStrip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)",
  },
  telemetryItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  telemetryLabel: {
    fontFamily: "monospace",
    fontSize: 8,
    fontWeight: "700",
    color: "#64748b",
  },
  telemetryValue: {
    fontFamily: "monospace",
    fontSize: 9,
    fontWeight: "800",
    color: "#e2e8f0",
  },
  telemetryDivider: {
    width: 1,
    height: 10,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginHorizontal: 4,
  },
  unlinkedTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#ffffff",
    marginTop: 8,
  },
  unlinkedSub: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 2,
    lineHeight: 16,
  },
});
