/* AutoBiz brand mark — teal squircle, white "A", gold coin crossbar. Same artwork as assets/icon.png. */
import React from "react";
import { View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import { useTheme } from "@/theme";
import { Text } from "./ui/Text";

export function LogoMark({ size = 48, mono }: { size?: number; mono?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024">
      <Defs>
        <LinearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#3fbfb1" />
          <Stop offset="0.55" stopColor="#299d91" />
          <Stop offset="1" stopColor="#1a6159" />
        </LinearGradient>
        <RadialGradient id="ls" cx="0.25" cy="0.15" r="0.9">
          <Stop offset="0" stopColor="#ffffff" stopOpacity="0.22" />
          <Stop offset="0.6" stopColor="#ffffff" stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id="lc" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#ffe066" />
          <Stop offset="1" stopColor="#f59f00" />
        </LinearGradient>
      </Defs>
      {!mono ? (
        <>
          <Rect width="1024" height="1024" rx="230" fill="url(#lg)" />
          <Rect width="1024" height="1024" rx="230" fill="url(#ls)" />
        </>
      ) : null}
      <Path d="M300 770 L512 262 L724 770" transform="translate(112.6 112.6) scale(0.78)" fill="none" stroke="#fff" strokeWidth={132} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={512 * 0.78 + 112.6} cy={648 * 0.78 + 112.6} r={92 * 0.78} fill={mono ? "#fff" : "url(#lc)"} stroke={mono ? undefined : "#1f7a70"} strokeWidth={16 * 0.78} />
    </Svg>
  );
}

/** Mark + "AutoBiz" wordmark. `light` for use on dark/gradient backgrounds. */
export function Logo({ size = 36, light, hideText }: { size?: number; light?: boolean; hideText?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: size * 0.28 }}>
      <LogoMark size={size} />
      {!hideText ? (
        <Text weight="extrabold" size={size * 0.62} style={{ letterSpacing: -0.5 }} color={light ? "#fff" : c.text}>
          Auto<Text weight="extrabold" size={size * 0.62} color={light ? "#a9f5dc" : c.primary}>Biz</Text>
        </Text>
      ) : null}
    </View>
  );
}
