import React, { useEffect, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { alertBridgeService, RawAlertItem } from "../services/alertBridge";
import { TacticalAlert } from "../types";
import { colors, radius, shadow } from "../theme";

const levelOf = (msg: string): TacticalAlert["level"] => {
  const m = msg.toUpperCase();
  if (m.includes("RED ALERT")) return "RED";
  if (m.includes("STANDDOWN") || m.includes("STAND DOWN")) return "INFO";
  return "YELLOW";
};

const LEVEL_STYLE = {
  RED: { label: "RED ALERT · REPORT NOW", bg: colors.redSoft, border: colors.redBorder, fg: colors.red, bar: colors.red },
  YELLOW: { label: "ALERT · GET READY", bg: colors.amberSoft, border: colors.amberBorder, fg: colors.amberDark, bar: colors.amber },
  INFO: { label: "STAND DOWN · ALL CLEAR", bg: colors.primarySoft, border: colors.primaryBorder, fg: colors.primary, bar: colors.primary },
};

const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}H`;
};

export const AlertsScreen: React.FC = () => {
  const [alerts, setAlerts] = useState<TacticalAlert[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadAlerts = async () => {
    setRefreshing(true);
    try {
      const history: RawAlertItem[] = await alertBridgeService.getSavedAlertHistory();
      setAlerts(
        (history || []).map((item, i) => ({
          id: `alert-${i}-${item.timestamp}`,
          timestamp: item.timestamp,
          sender: item.sender,
          message: item.message,
          level: levelOf(item.message),
          isAcknowledged: false,
        })),
      );
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleTest = async () => {
    const ok = await alertBridgeService.testSirenAlarm();
    if (!ok) Alert.alert("Siren Test", "Could not start the test siren on this device.");
  };

  const handleAck = (id: string) =>
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, isAcknowledged: true, acknowledgedAt: nowHHMM() } : a)));

  const pending = alerts.filter((a) => !a.isAcknowledged).length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadAlerts} colors={[colors.primary]} />}
    >
      {/* Page heading — same pattern as web pages */}
      <Text style={styles.eyebrow}>10RCDG ORDERS</Text>
      <Text style={styles.h1}>Alerts from Headquarters</Text>
      <Text style={styles.lead}>
        Orders sent by text message appear here. Your phone will ring a siren for Red Alerts, even on Silent.
      </Text>

      {/* Summary row */}
      <View style={styles.statRow}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Waiting for you</Text>
          <Text style={[styles.statValue, pending > 0 && { color: colors.red }]}>{pending}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Total received</Text>
          <Text style={styles.statValue}>{alerts.length}</Text>
        </View>
      </View>

      {/* Siren test card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Check your siren</Text>
        <Text style={styles.cardText}>
          Tap below once to hear what a Red Alert sounds like. Do this after installing so you know it works.
        </Text>
        <TouchableOpacity style={styles.btnAmber} onPress={handleTest} activeOpacity={0.85}>
          <Text style={styles.btnAmberText}>TEST SIREN NOW</Text>
        </TouchableOpacity>
      </View>

      {/* List header */}
      <View style={styles.listHead}>
        <Text style={styles.listTitle}>Received Orders</Text>
        <TouchableOpacity onPress={loadAlerts} hitSlop={10}>
          <Text style={styles.link}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {alerts.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyBadge}>
            <View style={styles.emptyCheck} />
          </View>
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptyText}>
            You're all set. When Headquarters sends an alert, it will show up here automatically.
          </Text>
        </View>
      ) : (
        alerts.map((a) => {
          const s = LEVEL_STYLE[a.level];
          return (
            <View key={a.id} style={[styles.alertCard, { borderColor: a.isAcknowledged ? colors.border : s.border }]}>
              <View style={[styles.alertBar, { backgroundColor: s.bar }]} />
              <View style={styles.alertBody}>
                <View style={styles.alertTop}>
                  <View style={[styles.levelPill, { backgroundColor: s.bg, borderColor: s.border }]}>
                    <Text style={[styles.levelText, { color: s.fg }]}>{s.label}</Text>
                  </View>
                  <Text style={styles.time}>{a.timestamp}</Text>
                </View>
                <Text style={styles.from}>From: {a.sender}</Text>
                <Text style={styles.msg}>{a.message}</Text>

                {a.isAcknowledged ? (
                  <View style={styles.ackDone}>
                    <Text style={styles.ackDoneText}>Received at {a.acknowledgedAt}</Text>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.btnPrimary} onPress={() => handleAck(a.id)} activeOpacity={0.85}>
                    <Text style={styles.btnPrimaryText}>I RECEIVED THIS ORDER</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32 },

  eyebrow: { fontSize: 11, fontWeight: "700", color: colors.primary, letterSpacing: 1 },
  h1: { fontSize: 24, fontWeight: "800", color: colors.text, marginTop: 2 },
  lead: { fontSize: 14, color: colors.textMuted, lineHeight: 20, marginTop: 4, marginBottom: 16 },

  statRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  stat: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 14, ...shadow },
  statLabel: { fontSize: 11, fontWeight: "600", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  statValue: { fontSize: 26, fontWeight: "800", color: colors.text, marginTop: 4 },

  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 16, ...shadow },
  cardTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
  cardText: { fontSize: 13, color: colors.textMuted, lineHeight: 19, marginTop: 4, marginBottom: 14 },

  btnAmber: { backgroundColor: colors.amber, borderRadius: radius.md, paddingVertical: 14, alignItems: "center" },
  btnAmberText: { color: "#0f172a", fontWeight: "800", fontSize: 14, letterSpacing: 0.8 },
  btnPrimary: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 13, alignItems: "center", marginTop: 14 },
  btnPrimaryText: { color: "#fff", fontWeight: "800", fontSize: 13, letterSpacing: 0.8 },

  listHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 22, marginBottom: 10 },
  listTitle: { fontSize: 15, fontWeight: "800", color: colors.text },
  link: { fontSize: 13, fontWeight: "700", color: colors.primaryText },

  empty: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderStyle: "dashed", borderRadius: radius.lg, padding: 24, alignItems: "center" },
  emptyBadge: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primaryBorder, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  emptyCheck: { width: 10, height: 18, borderRightWidth: 3, borderBottomWidth: 3, borderColor: colors.primary, transform: [{ rotate: "45deg" }], marginTop: -4 },
  emptyTitle: { fontSize: 15, fontWeight: "800", color: colors.text },
  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: "center", lineHeight: 19, marginTop: 4 },

  alertCard: { flexDirection: "row", backgroundColor: colors.card, borderWidth: 1, borderRadius: radius.lg, overflow: "hidden", marginBottom: 12, ...shadow },
  alertBar: { width: 5 },
  alertBody: { flex: 1, padding: 14 },
  alertTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  levelPill: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 1 },
  levelText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  time: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
  from: { fontSize: 12, color: colors.textMuted, fontWeight: "600", marginTop: 10 },
  msg: { fontSize: 15, color: colors.text, lineHeight: 22, marginTop: 4 },
  ackDone: { marginTop: 14, alignSelf: "flex-start", backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primaryBorder, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  ackDoneText: { fontSize: 12, fontWeight: "700", color: colors.primary },
});
