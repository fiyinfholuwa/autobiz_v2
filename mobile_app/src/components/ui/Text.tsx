import React from "react";
import { Text as RNText, type TextProps, type TextStyle } from "react-native";
import { font, useTheme } from "@/theme";

export type TextVariant = "display" | "h1" | "h2" | "h3" | "title" | "body" | "sm" | "xs" | "label";
type Weight = "regular" | "medium" | "semibold" | "bold" | "extrabold";

const V: Record<TextVariant, { size: number; lh: number; weight: Weight; ls?: number }> = {
  display: { size: 32, lh: 38, weight: "extrabold", ls: -0.8 },
  h1: { size: 26, lh: 32, weight: "extrabold", ls: -0.6 },
  h2: { size: 21, lh: 27, weight: "bold", ls: -0.4 },
  h3: { size: 17, lh: 23, weight: "bold", ls: -0.2 },
  title: { size: 15, lh: 21, weight: "semibold" },
  body: { size: 15, lh: 22, weight: "regular" },
  sm: { size: 13, lh: 18, weight: "regular" },
  xs: { size: 12, lh: 16, weight: "regular" },
  label: { size: 11, lh: 14, weight: "semibold", ls: 0.7 },
};

export type AppTextProps = TextProps & {
  variant?: TextVariant;
  weight?: Weight;
  color?: string;
  muted?: boolean;
  center?: boolean;
  tabular?: boolean;
  strike?: boolean;
  size?: number;
};

export function Text({ variant = "body", weight, color, muted, center, tabular, strike, size, style, children, ...rest }: AppTextProps) {
  const { c } = useTheme();
  const v = V[variant];
  const s: TextStyle = {
    fontFamily: font[weight || v.weight],
    fontSize: size ?? v.size,
    lineHeight: size ? Math.round(size * 1.3) : v.lh,
    letterSpacing: v.ls,
    color: color || (muted ? c.muted : c.text),
    textAlign: center ? "center" : undefined,
    fontVariant: tabular ? ["tabular-nums"] : undefined,
    textDecorationLine: strike ? "line-through" : undefined,
    textTransform: variant === "label" ? "uppercase" : undefined,
  };
  return (
    <RNText style={[s, style]} {...rest}>
      {children}
    </RNText>
  );
}

/** Renders "**bold**" segments inside a string (used by toasts/receipts ported from HTML). */
export function RichText({ text, ...props }: AppTextProps & { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <Text {...props}>
      {parts.map((p, i) =>
        p.startsWith("**") ? (
          <Text key={i} {...props} weight="bold">{p.slice(2, -2)}</Text>
        ) : (
          p
        )
      )}
    </Text>
  );
}
