import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Tabs } from "expo-router";
import React from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, Text } from "@/components/ui";
import { useApp } from "@/store";
import { radius, shadow, useTheme } from "@/theme";

export const TAB_BAR_HEIGHT = 64;

const TABS: Record<string, { label: string; icon: string; iconOn: string; fab?: boolean }> = {
  index: { label: "Home", icon: "ion:home-outline", iconOn: "ion:home" },
  shop: { label: "Shop", icon: "ion:storefront-outline", iconOn: "ion:storefront" },
  pay: { label: "Pay", icon: "ion:flash", iconOn: "ion:flash", fab: true },
  cards: { label: "Cards", icon: "ion:card-outline", iconOn: "ion:card" },
  more: { label: "More", icon: "ion:grid-outline", iconOn: "ion:grid" },
};

type TabBarProps = { state: { index: number; routes: { key: string; name: string; params?: object }[] }; emitter: { emit: (e: any) => any }; navigateToTab: (key: string) => void };

function TabBar({ state, emitter, navigateToTab }: TabBarProps) {
  const { c, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const cartCount = useApp((s) => s.cart.reduce((a, l) => a + l.qty, 0));
  const unread = useApp((s) => s.notifications.filter((n) => !n.read).length);
  return (
    <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingBottom: Math.max(insets.bottom, 10), paddingTop: 8, paddingHorizontal: 10, backgroundColor: c.surface, borderTopWidth: dark ? 1 : 0, borderTopColor: c.border, ...shadow(2, dark) }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
        {state.routes.map((route, i) => {
          const t = TABS[route.name];
          if (!t) return null;
          const focused = state.index === i;
          const onPress = () => {
            Haptics.selectionAsync().catch(() => {});
            const e = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!focused && !e?.defaultPrevented) navigateToTab(route.key);
          };
          if (t.fab)
            return (
              <Pressable key={route.key} onPress={onPress} accessibilityRole="button" accessibilityLabel="Pay bills" style={{ flex: 1, alignItems: "center" }}>
                <LinearGradient colors={[c.primary300, c.primary700]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", marginTop: -26, borderWidth: 4, borderColor: c.surface, ...shadow(2, false), shadowColor: c.primary }}>
                  <Icon name={t.icon} size={24} color="#fff" />
                </LinearGradient>
                <Text size={11} weight={focused ? "bold" : "medium"} color={focused ? c.primary : c.muted} style={{ marginTop: 3 }}>{t.label}</Text>
              </Pressable>
            );
          const badge = route.name === "shop" ? cartCount : route.name === "more" ? unread : 0;
          return (
            <Pressable key={route.key} onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={t.label} style={{ flex: 1, alignItems: "center", gap: 3, paddingVertical: 4 }}>
              <View style={{ width: 48, height: 28, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: focused ? c.primarySoft : "transparent" }}>
                <Icon name={focused ? t.iconOn : t.icon} size={21} color={focused ? c.primary : c.muted} />
                {badge ? (
                  <View style={{ position: "absolute", top: -3, right: 4, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 3, backgroundColor: c.danger, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: c.surface }}>
                    <Text size={9} weight="bold" color="#fff">{badge > 9 ? "9+" : badge}</Text>
                  </View>
                ) : null}
              </View>
              <Text size={11} weight={focused ? "bold" : "medium"} color={focused ? c.primary : c.muted}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(p: any) => <TabBar {...p} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="shop" />
      <Tabs.Screen name="pay" />
      <Tabs.Screen name="cards" />
      <Tabs.Screen name="more" />
    </Tabs>
  );
}
