/* Bottom sheet rendered through the root portal. Slide-up, drag-handle, backdrop tap, Android back. */
import React, { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Easing, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { radius, useTheme } from "@/theme";
import { IconButton } from "./Button";
import { backHandlers, Portal } from "./Portal";
import { Text } from "./Text";

export type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  /** wrap body in a ScrollView */
  scroll?: boolean;
  /** sticky footer (buttons) */
  footer?: React.ReactNode;
  /** prevent closing via backdrop/back (e.g. while processing) */
  locked?: boolean;
  /** custom header node replaces title row */
  header?: React.ReactNode;
  /** max height fraction of screen */
  maxHeight?: number;
  /** centered dialog instead of bottom sheet */
  dialog?: boolean;
  bodyStyle?: StyleProp<ViewStyle>;
  hideClose?: boolean;
};

export function Sheet(props: SheetProps) {
  const { visible } = props;
  const [mounted, setMounted] = useState(visible);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(anim, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    } else if (mounted) {
      Animated.timing(anim, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => setMounted(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    return backHandlers.push(() => { if (!props.locked) props.onClose(); });
  }, [visible, props.locked, props.onClose]);

  if (!mounted) return null;
  return (
    <Portal>
      <SheetView {...props} anim={anim} />
    </Portal>
  );
}

function SheetView({ anim, onClose, title, subtitle, children, scroll, footer, locked, header, maxHeight = 0.92, dialog, bodyStyle, hideClose }: SheetProps & { anim: Animated.Value }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const H = Dimensions.get("window").height;
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [dialog ? 40 : H * 0.6, 0] });
  const body = scroll ? (
    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[{ paddingHorizontal: 20, paddingBottom: 16 }, bodyStyle]} style={{ flexGrow: 0 }}>
      {children}
    </ScrollView>
  ) : (
    <View style={[{ paddingHorizontal: 20, paddingBottom: 16 }, bodyStyle]}>{children}</View>
  );
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.backdrop, opacity: anim }]}>
        <Pressable style={{ flex: 1 }} onPress={() => !locked && onClose()} accessibilityLabel="Close" />
      </Animated.View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[{ flex: 1 }, dialog ? { justifyContent: "center", padding: 24 } : { justifyContent: "flex-end" }]} pointerEvents="box-none">
        <Animated.View
          style={{
            maxHeight: H * maxHeight,
            backgroundColor: c.surface,
            borderTopLeftRadius: radius.xxl,
            borderTopRightRadius: radius.xxl,
            borderBottomLeftRadius: dialog ? radius.xxl : 0,
            borderBottomRightRadius: dialog ? radius.xxl : 0,
            paddingBottom: dialog ? 8 : Math.max(insets.bottom, 12),
            transform: [{ translateY }],
            opacity: dialog ? anim : 1,
          }}
        >
          {!dialog ? <View style={{ alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: c.border, marginTop: 8 }} /> : null}
          {header ?? (title ? (
            <View style={{ flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 20, paddingTop: dialog ? 18 : 12, paddingBottom: 12, gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text variant="h3">{title}</Text>
                {subtitle ? <Text variant="sm" muted style={{ marginTop: 2 }}>{subtitle}</Text> : null}
              </View>
              {!locked && !hideClose ? <IconButton icon="bi-x-lg" size={32} bg={c.surface2} onPress={onClose} accessibilityLabel="Close" /> : null}
            </View>
          ) : <View style={{ height: 14 }} />)}
          {body}
          {footer ? <View style={{ paddingHorizontal: 20, paddingTop: 4, gap: 10 }}>{footer}</View> : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}
