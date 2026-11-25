import * as Linking from "expo-linking";
import { router } from "expo-router";
import React, { useState } from "react";
import { LayoutAnimation, Platform, Pressable, UIManager, View } from "react-native";
import { toast } from "@/components/overlay";
import { Card, Header, Icon, IconTile, Row, Screen, Text } from "@/components/ui";
import { confirmLogout, confirmReset, Group } from "@/features/settings/shared";
import { ListRow } from "@/components/ui";
import { useApp } from "@/store";
import { useTheme } from "@/theme";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) UIManager.setLayoutAnimationEnabledExperimental(true);

const CONTACTS = [
  { title: "WhatsApp", sub: "Chat with us", icon: "bi-whatsapp", tone: "success", url: "https://wa.me/2348000000000" },
  { title: "Email", sub: "support@autobiz.ng", icon: "bi-envelope", tone: "primary", url: "mailto:support@autobiz.ng" },
  { title: "Call us", sub: "0800 000 0000", icon: "bi-telephone", tone: "violet", url: "tel:+2348000000000" },
  { title: "Report a payment", sub: "From any receipt", icon: "bi-receipt", tone: "orange", route: "/transactions" },
];

const FAQ = [
  ["How long does wallet funding take?", "Bank transfers to your dedicated account reflect within 1 minute. Card payments are instant."],
  ["My airtime/data didn't arrive. What do I do?", "Most purchases deliver in seconds. If it's been more than 10 minutes, open the transaction and tap “Report issue” — failed purchases are refunded automatically."],
  ["How do I increase my limits?", "Verify your BVN to reach Tier 2 and your NIN with proof of address for Tier 3. Go to Verification in Settings."],
  ["Is my money safe?", "Wallet funds are held with CBN-licensed partner banks. Every payment requires your transaction PIN, and you can enable 2FA for logins."],
];

export default function Help() {
  const { c } = useTheme();
  const authed = useApp((s) => s.auth.authed);
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Screen header={<Header title="Help & support" subtitle="We're available 24/7" />}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {CONTACTS.map((x) => (
          <Card key={x.title} style={{ width: "48.5%" }} onPress={() => {
            if (x.route) return authed ? router.push(x.route as any) : router.push({ pathname: "/login", params: { next: x.route } });
            Linking.openURL(x.url!).catch(() => toast("Couldn't open " + x.title, "warning"));
          }}>
            <IconTile icon={x.icon} tone={x.tone} size={42} />
            <Text weight="bold" style={{ marginTop: 10 }}>{x.title}</Text>
            <Text variant="xs" muted numberOfLines={1}>{x.sub}</Text>
          </Card>
        ))}
      </View>
      <Text variant="h3" style={{ marginTop: 22, marginBottom: 10 }}>Frequently asked questions</Text>
      <Card style={{ paddingVertical: 4 }}>
        {FAQ.map(([q, a], i) => (
          <View key={q} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: c.border }}>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: open === i }} onPress={() => { LayoutAnimation.easeInEaseOut(); setOpen(open === i ? null : i); }} style={{ paddingVertical: 14 }}>
              <Row justify="space-between" gap={10}>
                <Text weight="semibold" style={{ flex: 1 }}>{q}</Text>
                <Icon name={open === i ? "bi-chevron-up" : "bi-chevron-down"} size={18} color={c.muted} />
              </Row>
              {open === i ? <Text variant="sm" muted style={{ marginTop: 8 }}>{a}</Text> : null}
            </Pressable>
          </View>
        ))}
      </Card>
      {authed ? (
        <Group title="Account">
          <ListRow icon="bi-arrow-counterclockwise" tone="warning" title="Reset demo data" subtitle="Restore the wallet, transactions, cart and settings to defaults" onPress={confirmReset} />
          <ListRow icon="bi-box-arrow-right" danger title="Log out" subtitle="Sign out of AutoBiz on this device" onPress={confirmLogout} />
        </Group>
      ) : null}
      <Text variant="xs" muted center style={{ marginTop: 20 }}>AutoBiz Technologies Ltd · support@autobiz.ng</Text>
    </Screen>
  );
}
