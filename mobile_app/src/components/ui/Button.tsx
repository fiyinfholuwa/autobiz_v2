import * as Haptics from "expo-haptics";
import React from "react";
import { ActivityIndicator, Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { radius, shadow, useTheme } from "@/theme";
import { Icon } from "./Icon";
import { Text } from "./Text";

export type ButtonVariant = "primary" | "soft" | "outline" | "ghost" | "danger" | "dangerSoft" | "dark" | "light";
type Size = "sm" | "md" | "lg";

export type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: Size;
  icon?: string;
  iconRight?: string;
  loading?: boolean;
  loadingText?: string;
  disabled?: boolean;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
  haptic?: boolean;
};

export function Button({ title, onPress, variant = "primary", size = "md", icon, iconRight, loading, loadingText, disabled, full, style, haptic = true }: ButtonProps) {
  const { c, dark } = useTheme();
  const h = { sm: 38, md: 48, lg: 54 }[size];
  const fs = { sm: 13, md: 15, lg: 16 }[size];
  const pal: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: c.primary, fg: c.onPrimary },
    soft: { bg: c.primarySoft, fg: c.primary },
    outline: { bg: "transparent", fg: c.text, border: c.border },
    ghost: { bg: "transparent", fg: c.primary },
    danger: { bg: c.danger, fg: "#fff" },
    dangerSoft: { bg: c.dangerSoft, fg: c.danger },
    dark: { bg: dark ? "#fff" : "#191919", fg: dark ? "#111" : "#fff" },
    light: { bg: "rgba(255,255,255,0.18)", fg: "#fff" },
  };
  const p = pal[variant];
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      onPress={() => {
        if (haptic) Haptics.selectionAsync().catch(() => {});
        onPress?.();
      }}
      style={({ pressed }) => [
        {
          height: h,
          paddingHorizontal: size === "sm" ? 14 : 20,
          borderRadius: size === "sm" ? radius.sm : radius.md + 2,
          backgroundColor: p.bg,
          borderWidth: p.border ? 1 : 0,
          borderColor: p.border,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 8,
          opacity: off && !loading ? 0.5 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
          alignSelf: full ? "stretch" : undefined,
        },
        variant === "primary" && !off ? { ...shadow(1, dark), shadowColor: c.primary, shadowOpacity: dark ? 0 : 0.35 } : null,
        style,
      ]}
    >
      {loading ? (
        <>
          <ActivityIndicator size="small" color={p.fg} />
          <Text weight="bold" size={fs} color={p.fg}>{loadingText || "Please wait…"}</Text>
        </>
      ) : (
        <>
          {icon ? <Icon name={icon} size={fs + 3} color={p.fg} /> : null}
          <Text weight="bold" size={fs} color={p.fg} numberOfLines={1}>{title}</Text>
          {iconRight ? <Icon name={iconRight} size={fs + 2} color={p.fg} /> : null}
        </>
      )}
    </Pressable>
  );
}

export function IconButton({ icon, onPress, size = 40, color, bg, badge, accessibilityLabel, disabled, style }: { icon: string; onPress?: () => void; size?: number; color?: string; bg?: string; badge?: number | boolean; accessibilityLabel?: string; disabled?: boolean; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={() => { Haptics.selectionAsync().catch(() => {}); onPress?.(); }}
      hitSlop={6}
      style={({ pressed }) => [{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg ?? c.surface, alignItems: "center", justifyContent: "center", opacity: disabled ? 0.4 : pressed ? 0.7 : 1 }, style]}
    >
      <Icon name={icon} size={size * 0.5} color={color ?? c.text} />
      {badge ? (
        <View style={{ position: "absolute", top: 2, right: 2, minWidth: typeof badge === "number" ? 17 : 9, height: typeof badge === "number" ? 17 : 9, borderRadius: 9, backgroundColor: c.danger, alignItems: "center", justifyContent: "center", paddingHorizontal: 3, borderWidth: 1.5, borderColor: bg ?? c.surface }}>
          {typeof badge === "number" ? <Text size={10} weight="bold" color="#fff">{badge > 99 ? "99+" : badge}</Text> : null}
        </View>
      ) : null}
    </Pressable>
  );
}
