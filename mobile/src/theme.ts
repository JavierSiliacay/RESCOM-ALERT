// Design tokens mirrored 1:1 from the RESCOM web dashboard (Tailwind palette)
export const colors = {
  bg: "#f8fafc", // page background
  card: "#ffffff",
  border: "#e2e8f0", // slate-200
  borderSoft: "#f1f5f9", // slate-100
  subtle: "#f8fafc", // slate-50

  text: "#0f172a", // slate-900
  textBody: "#334155", // slate-700
  textMuted: "#64748b", // slate-500
  textFaint: "#94a3b8", // slate-400

  primary: "#065f46", // emerald-800 (main buttons, active nav)
  primaryDark: "#022c22", // emerald-950
  primaryText: "#047857", // emerald-700
  primarySoft: "#ecfdf5", // emerald-50
  primaryTint: "#d1fae5", // emerald-100
  primaryBorder: "#a7f3d0", // emerald-200

  amber: "#d97706", // amber-600
  amberDark: "#92400e", // amber-800
  amberSoft: "#fffbeb", // amber-50
  amberTint: "#fef3c7", // amber-100
  amberBorder: "#fcd34d", // amber-300

  red: "#b91c1c", // red-700
  redDark: "#7f1d1d", // red-900
  redSoft: "#fef2f2", // red-50
  redBorder: "#fecaca", // red-200
};

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };

export const shadow = {
  shadowColor: "#0f172a",
  shadowOpacity: 0.06,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
};
