import { useColorScheme } from "react-native";
import { useApp } from "@/store";
import { dark, light, toneColors, type Palette, type Tone } from "./tokens";

export * from "./tokens";

export function useIsDark() {
  const mode = useApp((s) => s.settings.themeMode);
  const sys = useColorScheme();
  return mode === "dark" || (mode === "system" && sys === "dark");
}

/** Current palette + helpers. */
export function useTheme(): { c: Palette; dark: boolean; tone: (t: Tone | string | undefined) => { fg: string; bg: string } } {
  const isDark = useIsDark();
  const c = isDark ? dark : light;
  return { c, dark: isDark, tone: (t) => toneColors(c, t) };
}
