import * as Linking from "expo-linking";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Share, View } from "react-native";
import { AuthGate } from "@/components/AuthGate";
import { copy, toast } from "@/components/overlay";
import { Button, Card, Header, Icon, Row, Screen, Text } from "@/components/ui";
import { useApp } from "@/store";
import { radius, useTheme } from "@/theme";

export default function Refer() {
  const { c } = useTheme();
  const username = useApp((s) => s.user.username);
  const code = (username || "autobiz").toUpperCase().slice(0, 10) + "26";
  const link = `https://autobiz.app/register?ref=${code}`;
  const msg = `Join me on AutoBiz — pay bills, shop, buy eSIMs & more. Get ₦200 bonus with my code ${code}: ${link}`;
  return (
    <AuthGate>
      <Screen header={<Header title="Refer & earn" />}>
        <LinearGradient colors={["#f06595", "#7048e8"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 24, padding: 22, overflow: "hidden" }}>
          <View style={{ position: "absolute", right: -30, top: -30, width: 150, height: 150, borderRadius: 75, backgroundColor: "rgba(255,255,255,0.1)" }} />
          <View style={{ alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, backgroundColor: "rgba(255,255,255,0.2)" }}>
            <Text size={11} weight="bold" color="#fff">Refer & earn</Text>
          </View>
          <Text variant="h1" color="#fff" style={{ marginTop: 12 }}>Earn ₦500 for every friend</Text>
          <Text variant="sm" color="rgba(255,255,255,0.88)" style={{ marginTop: 6 }}>Your friend gets ₦200 bonus after their first ₦2,000 transaction.</Text>
          <Icon name="bi-gift" size={64} color="rgba(255,255,255,0.25)" style={{ position: "absolute", right: 16, bottom: 12 }} />
        </LinearGradient>
        <Card style={{ marginTop: 16 }}>
          <Text variant="label" muted>Your referral code</Text>
          <Row justify="space-between" style={{ marginTop: 8, padding: 14, borderRadius: radius.lg, borderWidth: 1.5, borderStyle: "dashed", borderColor: c.primary, backgroundColor: c.primarySoft }}>
            <Text variant="h2" color={c.primary} selectable>{code}</Text>
            <Button title="Copy" size="sm" icon="bi-copy" onPress={() => copy(code, "Referral code copied")} />
          </Row>
          <Text variant="xs" muted style={{ marginTop: 10 }} numberOfLines={1}>{link}</Text>
          <Row gap={10} style={{ marginTop: 14 }}>
            <Button title="Copy link" icon="bi-copy" variant="soft" style={{ flex: 1 }} onPress={() => copy(link, "Referral link copied")} />
            <Button title="WhatsApp" icon="bi-whatsapp" variant="soft" style={{ flex: 1 }} onPress={() => Linking.openURL("https://wa.me/?text=" + encodeURIComponent(msg)).catch(() => toast("WhatsApp isn't available", "warning"))} />
          </Row>
          <Button title="Share invite" icon="bi-share" style={{ marginTop: 10 }} onPress={() => Share.share({ message: msg }).catch(() => {})} />
        </Card>
        <Row gap={10} style={{ marginTop: 16 }}>
          {[["12", "Invited", "bi-send"], ["8", "Joined", "bi-people"], ["₦4k", "Earned", "bi-wallet2"]].map(([v, l, i]) => (
            <Card key={l} style={{ flex: 1, alignItems: "center", padding: 14 }}>
              <Icon name={i} size={20} color={c.primary} />
              <Text variant="h2" style={{ marginTop: 6 }}>{v}</Text>
              <Text variant="xs" muted>{l}</Text>
            </Card>
          ))}
        </Row>
        <Card style={{ marginTop: 16, gap: 12 }}>
          <Text variant="h3">How it works</Text>
          {["Share your code or link with friends", "They sign up and make a ₦2,000+ transaction", "You get ₦500, they get ₦200 — instantly"].map((t, i) => (
            <Row key={t} gap={10}>
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: c.primarySoft, alignItems: "center", justifyContent: "center" }}><Text variant="xs" weight="bold" color={c.primary}>{i + 1}</Text></View>
              <Text variant="sm" style={{ flex: 1 }}>{t}</Text>
            </Row>
          ))}
        </Card>
      </Screen>
    </AuthGate>
  );
}
