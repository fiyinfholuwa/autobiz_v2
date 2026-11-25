import { router } from "expo-router";
import React from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { confirmDialog, toast } from "@/components/overlay";
import { Card, Text } from "@/components/ui";
import { app } from "@/store";
import { useTheme } from "@/theme";

export async function confirmLogout() {
  const ok = await confirmDialog({ title: "Log out of AutoBiz?", message: "You'll need your password to sign in again.", confirmLabel: "Log out", tone: "danger", icon: "bi-box-arrow-right" });
  if (!ok) return;
  app().logout();
  if (router.canDismiss()) router.dismissAll();
  router.replace("/(tabs)");
  toast("You've been logged out", "info");
}

export async function confirmReset() {
  const ok = await confirmDialog({
    title: "Reset demo data?",
    message: "Your wallet balance, transactions, cart, orders and settings will be restored to the defaults. This can't be undone.",
    confirmLabel: "Yes, reset", tone: "danger", icon: "bi-arrow-counterclockwise", loadingMs: 600,
  });
  if (!ok) return;
  app().resetDemo();
  toast("Demo data restored", "success");
}

/** Titled card section with dividers between children */
export function Group({ title, subtitle, children, style, right }: { title?: string; subtitle?: string; children: React.ReactNode; style?: StyleProp<ViewStyle>; right?: React.ReactNode }) {
  const { c } = useTheme();
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[{ marginTop: 18 }, style]}>
      {title ? (
        <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 10, paddingHorizontal: 2 }}>
          <View style={{ flex: 1 }}>
            <Text variant="h3">{title}</Text>
            {subtitle ? <Text variant="xs" muted style={{ marginTop: 2 }}>{subtitle}</Text> : null}
          </View>
          {right}
        </View>
      ) : null}
      <Card style={{ paddingVertical: 4 }}>
        {items.map((ch, i) => <View key={i} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: c.border }}>{ch}</View>)}
      </Card>
    </View>
  );
}
