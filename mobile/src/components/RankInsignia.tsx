import React from "react";
import { StyleSheet, View, Text } from "react-native";

export interface RankInsigniaProps {
  rank: string;
  size?: number; // default: 24
  showBadgePill?: boolean;
}

/**
 * Geometric Vector Insignia Engine for Philippine Army Ranks.
 * Renders pure vector geometry (chevrons, rockers, pips, sunbursts, stars)
 * with zero emoji reliance and 100% resolution independence.
 */
export const RankInsignia: React.FC<RankInsigniaProps> = ({
  rank,
  size = 24,
  showBadgePill = false,
}) => {
  const normalized = (rank || "PVT").toUpperCase().trim();

  // Tier Colors
  const isEnlisted = ["PVT", "PFC", "CPL"].includes(normalized);
  const isNCO = ["SGT", "SSG", "TSG", "MSG", "SMS", "CMS", "FCMS"].includes(normalized);
  const isOfficer = ["2LT", "1LT", "CPT", "MAJ", "LTC", "COL"].includes(normalized);
  const isGeneral = ["BGEN", "MGEN", "LTGEN", "GEN"].includes(normalized);

  const primaryColor = isGeneral
    ? "#f8fafc" // Silver star
    : isOfficer
    ? "#f59e0b" // Tactical Gold / Amber
    : isNCO
    ? "#60a5fa" // Tactical Steel Blue
    : isEnlisted
    ? "#34d399" // Army Emerald / Olive
    : "#a78bfa"; // Reserve purple

  // Chevron rendering helper (sharp V-shape)
  const renderChevron = (offset = 0) => (
    <View
      key={`chv-${offset}`}
      style={[
        styles.chevron,
        {
          borderColor: primaryColor,
          width: size * 0.7,
          height: size * 0.35,
          marginTop: offset,
        },
      ]}
    />
  );

  // Rocker arc rendering helper (curved rocker below chevrons)
  const renderRocker = (offset = 0) => (
    <View
      key={`rck-${offset}`}
      style={[
        styles.rocker,
        {
          borderColor: primaryColor,
          width: size * 0.75,
          height: size * 0.22,
          marginTop: offset,
        },
      ]}
    />
  );

  // Officer triangular pip helper
  const renderPip = () => (
    <View
      style={[
        styles.pip,
        {
          borderBottomColor: primaryColor,
          borderLeftWidth: size * 0.18,
          borderRightWidth: size * 0.18,
          borderBottomWidth: size * 0.32,
        },
      ]}
    />
  );

  // 8-Ray Philippine Army Sun helper
  const renderSun = () => (
    <View style={[styles.sunContainer, { width: size * 0.8, height: size * 0.8 }]}>
      <View style={[styles.sunRay, { backgroundColor: primaryColor, width: size * 0.8, height: size * 0.18 }]} />
      <View style={[styles.sunRay, { backgroundColor: primaryColor, width: size * 0.18, height: size * 0.8 }]} />
      <View style={[styles.sunRay, { backgroundColor: primaryColor, width: size * 0.8, height: size * 0.18, transform: [{ rotate: "45deg" }] }]} />
      <View style={[styles.sunRay, { backgroundColor: primaryColor, width: size * 0.8, height: size * 0.18, transform: [{ rotate: "-45deg" }] }]} />
      <View style={[styles.sunCore, { backgroundColor: "#1e293b", borderColor: primaryColor, width: size * 0.45, height: size * 0.45 }]} />
    </View>
  );

  // 5-Point General Command Star helper
  const renderStar = () => (
    <View style={[styles.starContainer, { width: size * 0.8, height: size * 0.8 }]}>
      <View style={[styles.starTriangle, { borderBottomColor: primaryColor, borderLeftWidth: size * 0.22, borderRightWidth: size * 0.22, borderBottomWidth: size * 0.4 }]} />
      <View style={[styles.starTriangle, { borderBottomColor: primaryColor, borderLeftWidth: size * 0.22, borderRightWidth: size * 0.22, borderBottomWidth: size * 0.4, transform: [{ rotate: "72deg" }] }]} />
      <View style={[styles.starTriangle, { borderBottomColor: primaryColor, borderLeftWidth: size * 0.22, borderRightWidth: size * 0.22, borderBottomWidth: size * 0.4, transform: [{ rotate: "144deg" }] }]} />
      <View style={[styles.starTriangle, { borderBottomColor: primaryColor, borderLeftWidth: size * 0.22, borderRightWidth: size * 0.22, borderBottomWidth: size * 0.4, transform: [{ rotate: "216deg" }] }]} />
      <View style={[styles.starTriangle, { borderBottomColor: primaryColor, borderLeftWidth: size * 0.22, borderRightWidth: size * 0.22, borderBottomWidth: size * 0.4, transform: [{ rotate: "288deg" }] }]} />
    </View>
  );

  // Tactical Defense Shield helper (Reservist / Support)
  const renderShield = () => (
    <View style={[styles.shield, { borderColor: primaryColor, width: size * 0.65, height: size * 0.75 }]}>
      <View style={[styles.shieldInner, { backgroundColor: primaryColor }]} />
    </View>
  );

  // Insignia Geometry Dispatcher
  const renderInsigniaGeometry = () => {
    switch (normalized) {
      // Junior Enlisted
      case "PVT":
        return <View style={styles.centerCol}>{renderChevron()}</View>;
      case "PFC":
        return (
          <View style={styles.centerCol}>
            {renderChevron()}
            {renderRocker(2)}
          </View>
        );
      case "CPL":
        return (
          <View style={styles.centerCol}>
            {renderChevron()}
            {renderChevron(-3)}
          </View>
        );

      // Senior NCO
      case "SGT":
        return (
          <View style={styles.centerCol}>
            {renderChevron()}
            {renderChevron(-3)}
            {renderChevron(-3)}
          </View>
        );
      case "SSG":
        return (
          <View style={styles.centerCol}>
            {renderChevron()}
            {renderChevron(-3)}
            {renderChevron(-3)}
            {renderRocker(2)}
          </View>
        );
      case "TSG":
        return (
          <View style={styles.centerCol}>
            {renderChevron()}
            {renderChevron(-3)}
            {renderChevron(-3)}
            {renderRocker(2)}
            {renderRocker(-2)}
          </View>
        );
      case "MSG":
      case "SMS":
        return (
          <View style={styles.centerCol}>
            {renderChevron()}
            {renderChevron(-3)}
            {renderChevron(-3)}
            {renderRocker(2)}
            {renderRocker(-2)}
            {renderRocker(-2)}
          </View>
        );
      case "CMS":
      case "FCMS":
        return (
          <View style={styles.centerCol}>
            {renderChevron()}
            {renderChevron(-3)}
            {renderChevron(-3)}
            <View style={[styles.pip, { borderBottomColor: primaryColor, borderLeftWidth: 3, borderRightWidth: 3, borderBottomWidth: 5, marginVertical: 1 }]} />
            {renderRocker(1)}
            {renderRocker(-2)}
          </View>
        );

      // Company Grade Officers
      case "2LT":
        return <View style={styles.centerRow}>{renderPip()}</View>;
      case "1LT":
        return (
          <View style={styles.centerRow}>
            {renderPip()}
            <View style={{ width: 3 }} />
            {renderPip()}
          </View>
        );
      case "CPT":
        return (
          <View style={styles.centerRow}>
            {renderPip()}
            <View style={{ width: 2 }} />
            {renderPip()}
            <View style={{ width: 2 }} />
            {renderPip()}
          </View>
        );

      // Field Grade Officers (Suns)
      case "MAJ":
        return <View style={styles.centerRow}>{renderSun()}</View>;
      case "LTC":
        return (
          <View style={styles.centerRow}>
            {renderSun()}
            <View style={{ width: 2 }} />
            {renderSun()}
          </View>
        );
      case "COL":
        return (
          <View style={styles.centerRow}>
            {renderSun()}
            <View style={{ width: 2 }} />
            {renderSun()}
            <View style={{ width: 2 }} />
            {renderSun()}
          </View>
        );

      // General Officers
      case "BGEN":
      case "MGEN":
      case "LTGEN":
      case "GEN":
        return <View style={styles.centerRow}>{renderStar()}</View>;

      // Default Reservist / Cadets
      default:
        return <View style={styles.centerCol}>{renderShield()}</View>;
    }
  };

  const badgeContent = (
    <View style={[styles.insigniaWrap, { width: size, height: size }]}>
      {renderInsigniaGeometry()}
    </View>
  );

  if (!showBadgePill) {
    return badgeContent;
  }

  return (
    <View
      style={[
        styles.badgePill,
        {
          borderColor: isOfficer ? "rgba(245, 158, 11, 0.4)" : isNCO ? "rgba(96, 165, 250, 0.4)" : "rgba(52, 211, 153, 0.4)",
          backgroundColor: isOfficer ? "rgba(245, 158, 11, 0.12)" : isNCO ? "rgba(96, 165, 250, 0.12)" : "rgba(52, 211, 153, 0.12)",
        },
      ]}
    >
      {badgeContent}
      <Text style={[styles.badgeText, { color: primaryColor }]}>{normalized}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  centerCol: {
    alignItems: "center",
    justifyContent: "center",
  },
  centerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  insigniaWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontFamily: "monospace",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  // Single Chevron: Two angular legs meeting in a V pointing up
  chevron: {
    borderLeftWidth: 2.2,
    borderTopWidth: 2.2,
    transform: [{ rotate: "45deg" }],
  },
  // Rocker: Curved arc pointing upwards underneath
  rocker: {
    borderBottomWidth: 2.2,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  // Officer Pip: Equilateral Triangle
  pip: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
  },
  // Sunburst
  sunContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  sunRay: {
    position: "absolute",
    borderRadius: 1,
  },
  sunCore: {
    borderRadius: 99,
    borderWidth: 1.5,
    zIndex: 2,
  },
  // Star Container
  starContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  starTriangle: {
    position: "absolute",
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
  },
  // Tactical Defense Shield
  shield: {
    borderWidth: 1.8,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  shieldInner: {
    width: 4,
    height: 6,
    borderRadius: 1,
  },
});
