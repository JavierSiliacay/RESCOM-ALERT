import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { RankInsignia } from "./RankInsignia";
import { colors, radius, shadow } from "../theme";

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

export const SoldierHeaderCard: React.FC<SoldierHeaderCardProps> = ({
  soldier,
  isArmed = true,
}) => {
  if (!soldier) {
    return (
      <View style={styles.card}>
        <View style={styles.unlinkedHeader}>
          <View style={styles.statusBadgeStandby}>
            <View style={styles.dotStandby} />
            <Text style={styles.statusTextStandby}>STANDBY // UNPAIRED</Text>
          </View>
          <Text style={styles.actionHint}>TAP TO PAIR</Text>
        </View>

        <Text style={styles.unlinkedTitle}>No Military Phone Linked</Text>
        <Text style={styles.unlinkedSub}>
          Tap to connect your Philippine mobile number to receive emergency siren broadcasts.
        </Text>
      </View>
    );
  }

  const fullName = `${soldier.firstName} ${soldier.lastName}`.trim();
  const unitLine = [soldier.groupName, soldier.unit].filter(Boolean).join(" • ");

  return (
    <View style={styles.card}>
      {/* Top Status & Armed Telemetry */}
      <View style={styles.topRow}>
        <View style={isArmed ? styles.statusBadgeArmed : styles.statusBadgeStandby}>
          <View style={isArmed ? styles.dotArmed : styles.dotStandby} />
          <Text style={isArmed ? styles.statusTextArmed : styles.statusTextStandby}>
            {isArmed ? "SIREN ACTIVE & ARMED" : "PERMISSIONS NEEDED"}
          </Text>
        </View>

        <View style={styles.liveTag}>
          <Text style={styles.liveTagText}>10RCDG READY</Text>
        </View>
      </View>

      {/* Soldier Identity Block */}
      <View style={styles.profileRow}>
        <View style={styles.avatarWrap}>
          <RankInsignia rank={soldier.rank} size={22} showBadgePill={false} />
        </View>

        <View style={styles.profileTextWrap}>
          <View style={styles.nameHeaderRow}>
            <View style={styles.rankPill}>
              <Text style={styles.rankPillText}>{soldier.rank || "PVT"}</Text>
            </View>
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
      </View>

      {/* Clean Telemetry Footer */}
      <View style={styles.telemetryFooter}>
        <View style={styles.footerItem}>
          <Text style={styles.footerLabel}>Mobile:</Text>
          <Text style={styles.footerValue}>{soldier.mobileNumber}</Text>
        </View>
        <View style={styles.footerDivider} />
        <View style={styles.footerItem}>
          <Text style={styles.footerLabel}>Siren Channel:</Text>
          <Text style={styles.footerValue}>SMS & Retriever</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    ...shadow,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  statusBadgeArmed: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  dotArmed: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primaryText,
  },
  statusTextArmed: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.primaryText,
    letterSpacing: 0.5,
  },
  statusBadgeStandby: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.amberSoft,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.amberBorder,
  },
  dotStandby: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.amberDark,
  },
  statusTextStandby: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.amberDark,
    letterSpacing: 0.5,
  },
  liveTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.subtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  liveTagText: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.6,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  profileTextWrap: {
    flex: 1,
  },
  nameHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rankPill: {
    backgroundColor: colors.subtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  rankPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.textBody,
  },
  soldierName: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
    flex: 1,
  },
  unitText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textMuted,
    marginTop: 2,
  },
  telemetryFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  footerItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  footerLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  footerValue: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textBody,
  },
  footerDivider: {
    width: 1,
    height: 12,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },
  unlinkedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  actionHint: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.primaryText,
    letterSpacing: 0.5,
  },
  unlinkedTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 2,
  },
  unlinkedSub: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
  },
});
