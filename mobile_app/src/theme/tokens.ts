/* Design tokens — ported from autobiz_v2/assets/css/app.css (teal brand). */

export type Tone = "primary" | "success" | "warning" | "danger" | "violet" | "pink" | "cyan" | "orange" | "neutral";

export const light = {
  primary: "#299d91",
  primary300: "#5fb6ad",
  primary600: "#23877d",
  primary700: "#1c6b63",
  primarySoft: "#eaf5f4",
  onPrimary: "#ffffff",
  success: "#12b886",
  successSoft: "#e6f8f2",
  warning: "#f59f00",
  warningText: "#d48806",
  warningSoft: "#fff6e0",
  danger: "#f03e3e",
  dangerSoft: "#ffeded",
  violet: "#7048e8",
  violetSoft: "#f1edff",
  pink: "#e64980",
  pinkSoft: "#ffeef4",
  cyan: "#1098ad",
  cyanSoft: "#e5f7fa",
  orange: "#fd7e14",
  orangeSoft: "#fff1e6",
  bg: "#f4f5f7",
  surface: "#ffffff",
  surface2: "#f6f7f9",
  border: "#e8e8e8",
  text: "#191919",
  muted: "#7a7a7a",
  panel: "#191919",
  backdrop: "rgba(10,12,16,0.45)",
  chartMuted: "#e8e8e8",
};

export type Palette = typeof light;

export const dark: Palette = {
  ...light,
  primary: "#4fb3a9",
  primary300: "#7cc7bf",
  primary600: "#6fc2ba",
  primary700: "#2f8f85",
  primarySoft: "rgba(79,179,169,0.14)",
  successSoft: "rgba(18,184,134,0.14)",
  warningSoft: "rgba(245,159,0,0.14)",
  warningText: "#f5b13d",
  dangerSoft: "rgba(240,62,62,0.14)",
  violetSoft: "rgba(112,72,232,0.18)",
  pinkSoft: "rgba(230,73,128,0.16)",
  cyanSoft: "rgba(16,152,173,0.16)",
  orangeSoft: "rgba(253,126,20,0.16)",
  bg: "#121212",
  surface: "#1c1c1e",
  surface2: "#242427",
  border: "#2e2e32",
  text: "#ececec",
  muted: "#9a9a9a",
  panel: "#0b0b0c",
  backdrop: "rgba(0,0,0,0.6)",
  chartMuted: "#3a3a3e",
};

export const radius = { xs: 8, sm: 10, md: 12, lg: 16, xl: 20, xxl: 28, pill: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };

export const font = {
  regular: "PlusJakartaSans_400Regular",
  medium: "PlusJakartaSans_500Medium",
  semibold: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
  extrabold: "PlusJakartaSans_800ExtraBold",
};

/** Foreground + soft background for a tone. */
export function toneColors(c: Palette, tone: Tone | string | undefined): { fg: string; bg: string } {
  switch (tone) {
    case "success": return { fg: c.success, bg: c.successSoft };
    case "warning": return { fg: c.warningText, bg: c.warningSoft };
    case "danger": return { fg: c.danger, bg: c.dangerSoft };
    case "violet": return { fg: c.violet, bg: c.violetSoft };
    case "pink": return { fg: c.pink, bg: c.pinkSoft };
    case "cyan": return { fg: c.cyan, bg: c.cyanSoft };
    case "orange": return { fg: c.orange, bg: c.orangeSoft };
    case "neutral": return { fg: c.muted, bg: c.surface2 };
    default: return { fg: c.primary, bg: c.primarySoft };
  }
}

/** Solid gradient pairs used for hero tiles / art. */
export const toneGradient: Record<string, [string, string]> = {
  primary: ["#3fb5a8", "#1c6b63"],
  success: ["#20c997", "#087f5b"],
  warning: ["#fcc419", "#e8590c"],
  danger: ["#ff6b6b", "#c92a2a"],
  violet: ["#9775fa", "#5f3dc4"],
  pink: ["#f06595", "#a61e4d"],
  cyan: ["#3bc9db", "#0b7285"],
  orange: ["#ffa94d", "#d9480f"],
  neutral: ["#868e96", "#343a40"],
};

export function shadow(level: 1 | 2 | 3 = 1, isDark = false) {
  if (isDark) return { shadowColor: "#000", shadowOpacity: 0, shadowRadius: 0, shadowOffset: { width: 0, height: 0 }, elevation: 0 };
  const m = { 1: [0.06, 10, 4, 2], 2: [0.1, 18, 8, 5], 3: [0.18, 28, 14, 10] }[level];
  return { shadowColor: "#191919", shadowOpacity: m[0], shadowRadius: m[1], shadowOffset: { width: 0, height: m[2] }, elevation: m[3] };
}
