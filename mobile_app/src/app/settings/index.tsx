import { router } from "expo-router";
import React from "react";
import { View } from "react-native";
import { AuthGate } from "@/components/AuthGate";
import { Avatar, Badge, Card, Header, ListRow, Row, Screen, Text } from "@/components/ui";
import { confirmLogout, confirmReset, Group } from "@/features/settings/shared";
import { initials } from "@/lib/format";
import { useApp } from "@/store";

const SECTIONS = [
  { label: "Profile", sub: "Name, email, phone & username", icon: "bi-person", tone: "primary", href: "/settings/profile" },
  { label: "Security", sub: "Password, transaction PIN, 2FA & devices", icon: "bi-shield-lock", tone: "success", href: "/settings/security" },
  { label: "Verification", sub: "Account tier & limits", icon: "bi-patch-check", tone: "violet", href: "/settings/verification" },
  { label: "Notifications", sub: "Alerts, receipts & promotions", icon: "bi-bell", tone: "orange", href: "/settings/notifications" },
  { label: "Appearance", sub: "Light, dark or system theme", icon: "bi-palette", tone: "cyan", href: "/settings/appearance" },
  { label: "Refer & earn", sub: "Earn ₦500 for every friend", icon: "bi-people", tone: "pink", href: "/settings/refer" },
  { label: "Help & support", sub: "We're available 24/7", icon: "bi-question-circle", tone: "warning", href: "/settings/help" },
];

export default function SettingsIndex() {
  const user = useApp((s) => s.user);
  return (
    <AuthGate>
      <Screen header={<Header title="Settings" />}>
        <Card onPress={() => router.push("/settings/profile")}>
          <Row gap={14}>
            <Avatar text={initials(user.firstName, user.lastName)} size={56} />
            <View style={{ flex: 1 }}>
              <Text variant="h3" numberOfLines={1}>{user.firstName} {user.lastName}</Text>
              <Text variant="sm" muted numberOfLines={1}>@{user.username || "user"} · {user.email}</Text>
              <Badge label={user.tier} tone="primary" style={{ marginTop: 6 }} />
            </View>
          </Row>
        </Card>
        <Group title="Preferences">
          {SECTIONS.map((s) => <ListRow key={s.href} icon={s.icon} tone={s.tone} title={s.label} subtitle={s.sub} chevron onPress={() => router.push(s.href as any)} />)}
        </Group>
        <Group title="Account">
          <ListRow icon="bi-arrow-counterclockwise" tone="warning" title="Reset demo data" subtitle="Restore the wallet, transactions, cart and settings to defaults" onPress={confirmReset} />
          <ListRow icon="bi-box-arrow-right" danger title="Log out" subtitle="Sign out of AutoBiz on this device" onPress={confirmLogout} />
        </Group>
      </Screen>
    </AuthGate>
  );
}
