import React, { useState } from "react";
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AlertsScreen } from "./src/screens/AlertsScreen";
import { ReadinessScreen } from "./src/screens/ReadinessScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";

type TabKey = "ALERTS" | "READINESS" | "PROFILE";

function App(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabKey>("ALERTS");

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#090D16" />

      {/* Official 10RCDG Tactical App Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>10RCDG</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>RESCOM ALERT</Text>
            <Text style={styles.headerSubtitle}>// Tactical Response Network</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.securePill}>
            <Text style={styles.secureDot}>●</Text>
            <Text style={styles.secureText}>OFFLINE READY</Text>
          </View>
        </View>
      </View>

      {/* Active Tab Screen Content */}
      <View style={styles.screenContainer}>
        {activeTab === "ALERTS" && <AlertsScreen />}
        {activeTab === "READINESS" && <ReadinessScreen />}
        {activeTab === "PROFILE" && <ProfileScreen />}
      </View>

      {/* Tactical 3-Tab Bottom Navigation Bar */}
      <View style={styles.bottomBar}>
        {/* Tab 1: ALERTS */}
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "ALERTS" && styles.tabButtonActive]}
          onPress={() => setActiveTab("ALERTS")}
          activeOpacity={0.8}
        >
          <Text style={styles.tabIcon}>🚨</Text>
          <Text
            style={[
              styles.tabLabel,
              activeTab === "ALERTS" && styles.tabLabelActive,
            ]}
          >
            ALERTS
          </Text>
        </TouchableOpacity>

        {/* Tab 2: READINESS */}
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "READINESS" && styles.tabButtonActive,
          ]}
          onPress={() => setActiveTab("READINESS")}
          activeOpacity={0.8}
        >
          <Text style={styles.tabIcon}>🛡️</Text>
          <Text
            style={[
              styles.tabLabel,
              activeTab === "READINESS" && styles.tabLabelActive,
            ]}
          >
            READINESS
          </Text>
        </TouchableOpacity>

        {/* Tab 3: PROFILE */}
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "PROFILE" && styles.tabButtonActive]}
          onPress={() => setActiveTab("PROFILE")}
          activeOpacity={0.8}
        >
          <Text style={styles.tabIcon}>👤</Text>
          <Text
            style={[
              styles.tabLabel,
              activeTab === "PROFILE" && styles.tabLabelActive,
            ]}
          >
            PROFILE
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#090D16",
  },
  header: {
    height: 60,
    backgroundColor: "#0D1322",
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerBadge: {
    backgroundColor: "#047857",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#10B981",
    marginRight: 10,
  },
  headerBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
    fontFamily: "monospace",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: "#94A3B8",
    fontSize: 9,
    fontFamily: "monospace",
  },
  headerRight: {
    alignItems: "flex-end",
  },
  securePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F291E",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#059669",
  },
  secureDot: {
    color: "#10B981",
    fontSize: 8,
    marginRight: 4,
  },
  secureText: {
    color: "#6EE7B7",
    fontSize: 9,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  screenContainer: {
    flex: 1,
  },
  bottomBar: {
    height: 64,
    backgroundColor: "#0D1322",
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: "#17233D",
  },
  tabIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  tabLabel: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  tabLabelActive: {
    color: "#F59E0B",
  },
});

export default App;
