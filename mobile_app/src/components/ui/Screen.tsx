import { router } from "expo-router";
import React from "react";
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, View, type ScrollViewProps, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme";
import { IconButton } from "./Button";
import { Text } from "./Text";

export function goBack(fallback: string = "/") {
  if (router.canGoBack()) router.back();
  else router.replace(fallback as any);
}

export type HeaderProps = {
  title?: string;
  subtitle?: string;
  back?: boolean | (() => void);
  right?: React.ReactNode;
  large?: boolean;
  transparent?: boolean;
  style?: StyleProp<ViewStyle>;
  light?: boolean;
};

export function Header({ title, subtitle, back = true, right, large, transparent, style, light }: HeaderProps) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const fg = light ? "#fff" : c.text;
  return (
    <View style={[{ paddingTop: insets.top + 6, paddingHorizontal: 16, paddingBottom: 10, backgroundColor: transparent ? "transparent" : c.bg }, style]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44 }}>
        {back ? (
          <IconButton
            icon="bi-chevron-left"
            accessibilityLabel="Back"
            color={fg}
            bg={light ? "rgba(255,255,255,0.18)" : c.surface}
            onPress={typeof back === "function" ? back : () => goBack()}
          />
        ) : null}
        {!large ? (
          <View style={{ flex: 1, minWidth: 0 }}>
            {title ? <Text variant="h3" numberOfLines={1} color={fg}>{title}</Text> : null}
            {subtitle ? <Text variant="xs" numberOfLines={1} color={light ? "rgba(255,255,255,0.8)" : c.muted}>{subtitle}</Text> : null}
          </View>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        {right ? <View style={{ flexDirection: "row", gap: 8 }}>{right}</View> : null}
      </View>
      {large && title ? (
        <View style={{ marginTop: 8 }}>
          <Text variant="h1" color={fg}>{title}</Text>
          {subtitle ? <Text variant="sm" color={light ? "rgba(255,255,255,0.8)" : c.muted} style={{ marginTop: 4 }}>{subtitle}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

export type ScreenProps = {
  children?: React.ReactNode;
  header?: React.ReactNode;
  /** Use a ScrollView body (default true) */
  scroll?: boolean;
  footer?: React.ReactNode;
  padded?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  refreshing?: boolean;
  onRefresh?: () => void;
  scrollProps?: ScrollViewProps;
  scrollRef?: React.Ref<ScrollView>;
  /** extra bottom padding (e.g. for tab bar) */
  bottomInset?: number;
  bg?: string;
};

export function Screen({ children, header, scroll = true, footer, padded = true, contentStyle, refreshing, onRefresh, scrollProps, scrollRef, bottomInset = 0, bg }: ScreenProps) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const pad: ViewStyle = padded ? { paddingHorizontal: 16 } : {};
  return (
    <View style={{ flex: 1, backgroundColor: bg ?? c.bg }}>
      {header}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {scroll ? (
          <ScrollView
            ref={scrollRef}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[pad, { paddingTop: 4, paddingBottom: (footer ? 16 : insets.bottom + 24) + bottomInset }, contentStyle]}
            refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.primary} /> : undefined}
            {...scrollProps}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[{ flex: 1 }, pad, contentStyle]}>{children}</View>
        )}
        {footer ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12) + bottomInset, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border, gap: 10 }}>
            {footer}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}
