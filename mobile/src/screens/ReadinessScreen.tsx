import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ReadinessState } from "../types";
import { colors, radius, shadow } from "../theme";

const OPTIONS: { key: ReadinessState; title: string; desc: string; dot: string; bg: string; border: string; fg: string }[] = [
  { key: "READY", title: "Ready to Report", desc: "I can respond right away if called.", dot: "#10b981", bg: colors.primarySoft, border: colors.primary, fg: colors.primary },
  { key: "STANDBY", title: "On Standby", desc: "At work or busy, but reachable.", dot: "#f59e0b", bg: colors.amberSoft, border: colors.amber, fg: colors.amberDark },
  { key: "UNAVAILABLE", title: "Not Available", desc: "On leave, sick, or out of area.", dot: "#ef4444", bg: colors.redSoft, border: colors.red, fg: colors.red },
];

const GEAR = [
  { id: "uniform", label: "Uniform (BDA)" },
  { id: "boots", label: "Combat boots & belt" },
  { id: "id", label: "Military ID / Reservist card" },
  { id: "aid", label: "First aid kit & medicines" },
  { id: "light", label: "Flashlight" },
  { id: "power", label: "Charged powerbank" },
];

export const ReadinessScreen: React.FC = () => {
  const [status, setStatus] = useState<ReadinessState>("READY");
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const done = GEAR.filter((g) => checked[g.id]).length;
  const pct = Math.round((done / GEAR.length) * 100);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>MY READINESS</Text>
      <Text style={styles.h1}>Am I ready?</Text>
      <Text style={styles.lead}>Pick your current status and check your gear so you're ready when called.</Text>

      {/* Status */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>My current status</Text>
        <View style={{ gap: 10, marginTop: 12 }}>
          {OPTIONS.map((o) => {
            const on = status === o.key;
            return (
              <TouchableOpacity
                key={o.key}
                onPress={() => setStatus(o.key)}
                activeOpacity={0.8}
                style={[styles.option, on && { backgroundColor: o.bg, borderColor: o.border, borderWidth: 2 }]}
              >
                <View style={[styles.radio, on && { borderColor: o.border }]}>
                  {on && <View style={[styles.radioDot, { backgroundColor: o.border }]} />}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <View style={[styles.dot, { backgroundColor: o.dot }]} />
                    <Text style={[styles.optTitle, on && { color: o.fg }]}>{o.title}</Text>
                  </View>
                  <Text style={styles.optDesc}>{o.desc}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Gear */}
      <View style={[styles.card, { marginTop: 14 }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={styles.cardTitle}>My go-bag checklist</Text>
          <Text style={[styles.count, done === GEAR.length && { color: colors.primary }]}>
            {done}/{GEAR.length}
          </Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.hint}>
          {done === GEAR.length ? "All gear ready. Good job!" : "Tap each item once you have it packed."}
        </Text>

        {GEAR.map((g, i) => {
          const on = !!checked[g.id];
          return (
            <TouchableOpacity
              key={g.id}
              activeOpacity={0.7}
              onPress={() => setChecked((p) => ({ ...p, [g.id]: !p[g.id] }))}
              style={[styles.row, i === GEAR.length - 1 && { borderBottomWidth: 0 }]}
            >
              <View style={[styles.box, on && styles.boxOn]}>{on && <View style={styles.tick} />}</View>
              <Text style={[styles.rowText, on && styles.rowTextOn]}>{g.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  eyebrow: { fontSize: 11, fontWeight: "700", color: colors.primary, letterSpacing: 1 },
  h1: { fontSize: 24, fontWeight: "800", color: colors.text, marginTop: 2 },
  lead: { fontSize: 14, color: colors.textMuted, lineHeight: 20, marginTop: 4, marginBottom: 16 },

  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 16, ...shadow },
  cardTitle: { fontSize: 16, fontWeight: "800", color: colors.text },

  option: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.subtle },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.textFaint, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  optTitle: { fontSize: 15, fontWeight: "800", color: colors.text },
  optDesc: { fontSize: 13, color: colors.textMuted, marginTop: 2 },

  count: { fontSize: 14, fontWeight: "800", color: colors.textMuted },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.borderSoft, marginTop: 12, overflow: "hidden" },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.primary },
  hint: { fontSize: 12, color: colors.textMuted, marginTop: 8, marginBottom: 4 },

  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.textFaint, alignItems: "center", justifyContent: "center" },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tick: { width: 6, height: 11, borderRightWidth: 2.5, borderBottomWidth: 2.5, borderColor: "#fff", transform: [{ rotate: "45deg" }], marginTop: -3 },
  rowText: { fontSize: 15, color: colors.textBody, fontWeight: "600" },
  rowTextOn: { color: colors.textMuted, textDecorationLine: "line-through" },
});
