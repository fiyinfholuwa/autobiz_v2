import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Platform, View } from "react-native";
import { AuthGate } from "@/components/AuthGate";
import { Button, Card, EmptyState, Header, Notice, Row, Screen, Segment, Text } from "@/components/ui";
import { CountryArt, InstallBlock } from "@/features/esim/components";
import { activate, computeStatus } from "@/features/esim/logic";
import { sleep } from "@/lib/random";
import { useApp } from "@/store";
import { radius, useTheme } from "@/theme";

const STEPS = {
  ios: [
    "Connect to Wi‑Fi and open **Settings → Mobile Service** (or Cellular).",
    "Tap **Add eSIM** → **Use QR Code** and scan the code (or tap *Enter details manually*).",
    "Label the line **“Travel”** and set it for **Mobile Data** only. Keep your Nigerian line for iMessage & calls.",
    "On arrival, turn on **Data Roaming** for the Travel line. Your plan activates automatically.",
  ],
  android: [
    "Connect to Wi‑Fi and open **Settings → Connections → SIM manager** (Samsung) or **Network & internet → SIMs** (Pixel).",
    "Tap **Add eSIM** → **Scan QR code**, or choose *Enter activation code* and paste the SM-DP+ address and code.",
    "Set the new eSIM as your **Mobile data** SIM. Keep your local SIM for calls & SMS.",
    "On arrival, enable **Roaming** for the eSIM. It connects to a partner network automatically.",
  ],
};

function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return (
    <Text variant="sm" style={{ flex: 1 }}>
      {parts.map((p, i) => p.startsWith("**") ? <Text key={i} variant="sm" weight="bold">{p.slice(2, -2)}</Text> : p.startsWith("*") ? <Text key={i} variant="sm" style={{ fontStyle: "italic" }}>{p.slice(1, -1)}</Text> : p)}
    </Text>
  );
}

export default function InstallScreen() {
  return <AuthGate><Install /></AuthGate>;
}

function Install() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const e = useApp((s) => s.esims.find((x) => x.id === id));
  const [os, setOs] = useState<"ios" | "android">(Platform.OS === "android" ? "android" : "ios");
  const [busy, setBusy] = useState(false);
  if (!e)
    return (
      <Screen header={<Header title="Install eSIM" />}>
        <EmptyState icon="bi-sim" title="eSIM not found" message="It may have been deleted." action="My eSIMs" onAction={() => router.replace({ pathname: "/esim", params: { tab: "mine" } })} />
      </Screen>
    );
  const notInstalled = computeStatus(e) === "Not installed";
  return (
    <Screen
      header={<Header title={`Install ${e.country} eSIM`} subtitle={`${e.plan} · ICCID ${e.iccid}`} />}
      footer={
        notInstalled ? (
          <Button title="I've installed it — activate now" icon="bi-check2-circle" size="lg" full loading={busy} onPress={async () => { setBusy(true); await sleep(900); setBusy(false); activate(e.id); router.back(); }} />
        ) : (
          <Button title="Done" size="lg" full onPress={() => router.back()} />
        )
      }
    >
      <Card>
        <Row gap={12} style={{ marginBottom: 14 }}>
          <CountryArt c={{ code: e.code, regional: e.regional, icon: e.icon }} size={40} />
          <View style={{ flex: 1 }}>
            <Text weight="bold">{e.country}</Text>
            <Text variant="xs" muted>{e.plan}</Text>
          </View>
        </Row>
        <InstallBlock code={e.activationCode} />
      </Card>
      <Card style={{ marginTop: 16 }}>
        <Segment value={os} onChange={setOs} options={[{ value: "ios", label: "iPhone", icon: "bi-apple" }, { value: "android", label: "Android", icon: "ion:logo-android" }]} style={{ marginBottom: 14 }} />
        {STEPS[os].map((s, i) => (
          <Row key={i} gap={12} align="flex-start" style={{ paddingVertical: 8 }}>
            <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: c.primarySoft, alignItems: "center", justifyContent: "center" }}>
              <Text variant="xs" weight="bold" color={c.primary}>{i + 1}</Text>
            </View>
            <Rich text={s} />
          </Row>
        ))}
      </Card>
      <Notice tone="warning" icon="bi-exclamation-triangle" style={{ marginTop: 16, borderRadius: radius.lg }}>
        <Text variant="sm">Each QR code can be installed <Text variant="sm" weight="bold">once</Text>. Don't delete the eSIM from your phone after installing.</Text>
      </Notice>
    </Screen>
  );
}
