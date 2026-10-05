import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { alertBridgeService, RawAlertItem } from "../services/alertBridge";
import { TacticalAlert } from "../types";

export const AlertsScreen: React.FC = () => {
  const [alerts, setAlerts] = useState<TacticalAlert[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadAlerts = async () => {
    setRefreshing(true);
    try {
      const history: RawAlertItem[] = await alertBridgeService.getSavedAlertHistory();
      if (history && history.length > 0) {
        const formatted: TacticalAlert[] = history.map((item, index) => ({
          id: `alert-${index}-${item.timestamp}`,
          timestamp: item.timestamp,
          sender: item.sender,
          message: item.message,
          level: item.message.toUpperCase().includes("RED") ? "RED" : "YELLOW",
          isAcknowledged: false,
        }));
        setAlerts(formatted);
      } else {
        // Fallback demo/initial alert if fresh install
        setAlerts([
          {
            id: "default-drill-1",
            timestamp: "Today • 08:00H",
            sender: "10RCDG S3 Command",
            message:
              "[10RCDG ALERT] Standard Muster Drill check. Please verify your communication readiness and equipment status.",
            level: "YELLOW",
            isAcknowledged: true,
            acknowledgedAt: "08:04H",
          },
        ]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleTestAlarm = async () => {
    const success = await alertBridgeService.testSirenAlarm();
    if (!success) {
      Alert.alert(
        "Siren Test",
        "Test siren triggered. If you are on an emulator, audio tone will output via system sound."
      );
    }
  };

  const handleAcknowledge = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              isAcknowledged: true,
              acknowledgedAt: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
            }
          : a
      )
    );
    Alert.alert("Muster Acknowledged", "Your readiness response has been logged.");
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={loadAlerts} tintColor="#F59E0B" />
      }
    >
      {/* Top Banner */}
      <View style={styles.topCard}>
        <View style={styles.topCardHeader}>
          <Text style={styles.topCardTag}>🚨 DISPATCH MONITOR</Text>
          <View style={styles.liveDot} />
        </View>
        <Text style={styles.topCardTitle}>Active 10RCDG Orders</Text>
        <Text style={styles.topCardSubtitle}>
          Real-time mobilization dispatches, emergency muster alerts, and unit directives.
        </Text>

        <TouchableOpacity style={styles.testButton} onPress={handleTestAlarm} activeOpacity={0.8}>
          <Text style={styles.testButtonText}>🔊 TEST EMERGENCY SIREN & ALARM</Text>
        </TouchableOpacity>
      </View>

      {/* Alert Cards Feed */}
      <View style={styles.feedHeader}>
        <Text style={styles.feedTitle}>RECENT DISPATCHES ({alerts.length})</Text>
        <TouchableOpacity onPress={loadAlerts}>
          <Text style={styles.refreshText}>REFRESH</Text>
        </TouchableOpacity>
      </View>

      {alerts.map((alert) => {
        const isRed = alert.level === "RED";
        return (
          <View
            key={alert.id}
            style={[
              styles.alertCard,
              isRed ? styles.alertCardRed : styles.alertCardYellow,
            ]}
          >
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.badge,
                  isRed ? styles.badgeRed : styles.badgeYellow,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    isRed ? styles.badgeTextRed : styles.badgeTextYellow,
                  ]}
                >
                  {isRed ? "CRITICAL ALERT" : "ROUTINE DIRECTIVE"}
                </Text>
              </View>
              <Text style={styles.timestamp}>{alert.timestamp}</Text>
            </View>

            <Text style={styles.senderText}>From: {alert.sender}</Text>
            <Text style={styles.messageBody}>{alert.message}</Text>

            <View style={styles.cardFooter}>
              {alert.isAcknowledged ? (
                <View style={styles.ackBadge}>
                  <Text style={styles.ackBadgeText}>
                    ✓ ACKNOWLEDGED {alert.acknowledgedAt ? `(${alert.acknowledgedAt})` : ""}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.ackButton}
                  onPress={() => handleAcknowledge(alert.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.ackButtonText}>🛡️ ACKNOWLEDGE MUSTER</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}
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
  topCard: {
    backgroundColor: "#131B2E",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#1E293B",
    marginBottom: 20,
  },
  topCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  topCardTag: {
    color: "#F59E0B",
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  topCardTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  topCardSubtitle: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  testButton: {
    backgroundColor: "#B45309",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  testButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  feedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  feedTitle: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  refreshText: {
    color: "#F59E0B",
    fontSize: 11,
    fontWeight: "bold",
  },
  alertCard: {
    backgroundColor: "#111827",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
  },
  alertCardRed: {
    borderColor: "#DC2626",
    backgroundColor: "#161016",
  },
  alertCardYellow: {
    borderColor: "#F59E0B",
    backgroundColor: "#171410",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeRed: {
    backgroundColor: "#450A0A",
    borderColor: "#DC2626",
  },
  badgeYellow: {
    backgroundColor: "#451A03",
    borderColor: "#D97706",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  badgeTextRed: {
    color: "#FCA5A5",
  },
  badgeTextYellow: {
    color: "#FCD34D",
  },
  timestamp: {
    color: "#94A3B8",
    fontSize: 11,
    fontFamily: "monospace",
  },
  senderText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 6,
  },
  messageBody: {
    color: "#F8FAFC",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    marginBottom: 14,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
    paddingTop: 12,
  },
  ackButton: {
    backgroundColor: "#059669",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  ackButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  ackBadge: {
    backgroundColor: "#064E3B",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  ackBadgeText: {
    color: "#6EE7B7",
    fontSize: 11,
    fontWeight: "bold",
  },
});
