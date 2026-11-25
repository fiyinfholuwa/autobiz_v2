import React from "react";
import { Pressable, View } from "react-native";
import { confirmDialog } from "@/components/overlay";
import { Card, EmptyState, Header, IconTile, Screen, Text } from "@/components/ui";
import { ago } from "@/lib/format";
import { app, useApp } from "@/store";
import { radius, useTheme } from "@/theme";

export default function Notifications() {
  const { c } = useTheme();
  const list = useApp((s) => s.notifications);
  const unread = list.filter((n) => !n.read).length;
  return (
    <Screen
      header={
        <Header
          title="Notifications"
          subtitle={unread ? `${unread} unread` : "You're all caught up"}
          right={
            list.length ? (
              <Pressable hitSlop={8} onPress={async () => {
                if (unread) return app().markAllRead();
                if (await confirmDialog({ title: "Clear all notifications?", confirmLabel: "Clear", tone: "danger", icon: "bi-trash" })) app().set("notifications", []);
              }}>
                <Text variant="sm" weight="bold" color={c.primary}>{unread ? "Mark all read" : "Clear"}</Text>
              </Pressable>
            ) : null
          }
        />
      }
    >
      {list.length === 0 ? (
        <EmptyState icon="bi-bell" title="You're all caught up" message="Payment alerts, offers and account updates will appear here." />
      ) : (
        <Card style={{ padding: 6 }}>
          {list.map((n) => (
            <Pressable
              key={n.id}
              onPress={() => app().update("notifications", (all) => all.map((x) => (x.id === n.id ? { ...x, read: true } : x)))}
              style={({ pressed }) => ({ flexDirection: "row", gap: 12, padding: 12, borderRadius: radius.lg, backgroundColor: n.read ? "transparent" : c.primarySoft, opacity: pressed ? 0.7 : 1, marginBottom: 2 })}
            >
              <IconTile icon={n.icon} tone={n.tone} size={42} />
              <View style={{ flex: 1 }}>
                <Text weight={n.read ? "semibold" : "bold"}>{n.title}</Text>
                <Text variant="sm" muted style={{ marginTop: 2 }}>{n.body}</Text>
                <Text variant="xs" muted style={{ marginTop: 4 }}>{ago(n.time)}</Text>
              </View>
              {!n.read ? <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: c.primary, marginTop: 6 }} /> : null}
            </Pressable>
          ))}
        </Card>
      )}
    </Screen>
  );
}
