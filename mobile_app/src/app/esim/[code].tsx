import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { View } from "react-native";
import { confirmPay, toast } from "@/components/overlay";
import { Badge, Button, Card, EmptyState, Header, Icon, OptionCard, Row, Screen, Stepper, Summary, Text } from "@/components/ui";
import { CountryArt, DeviceCheck } from "@/features/esim/components";
import { countryByCode, deviceOk, finishPurchase, finishTopup, plansFor, regionName } from "@/features/esim/logic";
import { naira, usd } from "@/lib/format";
import { app, useApp } from "@/store";
import { radius, useTheme } from "@/theme";

export default function PlanPicker() {
  const { code, topup } = useLocalSearchParams<{ code: string; topup?: string }>();
  const { c: col } = useTheme();
  const c = countryByCode(String(code));
  const esim = useApp((s) => (topup ? s.esims.find((e) => e.id === topup) : undefined));
  const balance = useApp((s) => (s.auth.authed ? s.wallet.balance : 0));
  const plans = c ? plansFor(c) : [];
  const [sel, setSel] = useState(Math.max(0, plans.findIndex((p) => p.popular)));
  const [qty, setQty] = useState(1);
  const [device, setDevice] = useState("");
  const [devErr, setDevErr] = useState(false);
  const isTopup = !!topup;

  if (!c || (isTopup && !esim))
    return (
      <Screen header={<Header title="eSIM" />}>
        <EmptyState icon="bi-globe2" title="Destination not found" message="This destination isn't available. Pick another country." action="Browse destinations" onAction={() => router.replace("/esim")} />
      </Screen>
    );

  const p = plans[sel];
  const q = isTopup ? 1 : qty;
  const total = p.ngn * q;

  const buy = async () => {
    if (device && !deviceOk(device)) {
      setDevErr(true);
      return toast("Your selected device doesn't support eSIM. Pick a compatible phone to continue.", "warning");
    }
    const ok = await confirmPay({
      title: isTopup ? "Confirm eSIM top-up" : "Confirm eSIM purchase",
      amount: total,
      rows: [
        ["Destination", c.name],
        ["Plan", `${p.label} · ${p.days} days`],
        isTopup ? ["eSIM", `•••• ${esim!.iccid.slice(-4)}`] : ["Quantity", String(q)],
        ["Price", `${usd(p.usd * q)} @ ₦1,580/$`],
      ],
      cta: isTopup ? "Confirm top-up" : "Pay & get eSIM",
      note: "eSIMs are delivered instantly. Unused, uninstalled eSIMs are refundable within 7 days.",
    });
    if (!ok) return;
    const tx = app().debit(total, {
      type: "esim",
      title: isTopup ? `eSIM Top-up · ${c.name}` : `eSIM · ${c.name}`,
      subtitle: `${p.label} · ${p.days} days${q > 1 ? ` × ${q}` : ""}`,
      icon: "bi-sim",
      tone: "violet",
    });
    if (!tx) return toast("Insufficient wallet balance", "error");
    if (isTopup) {
      finishTopup(esim!, p, tx);
      router.back();
    } else {
      finishPurchase(c, p, q, tx, (id) => {
        if (id) router.replace(`/esim/install/${id}`);
        else router.dismissTo({ pathname: "/esim", params: { tab: "mine" } });
      });
    }
  };

  return (
    <Screen
      header={<Header title={isTopup ? "Top up eSIM" : c.name} subtitle={isTopup ? c.name : regionName(c.region)} />}
      footer={
        <>
          <Row justify="space-between">
            <Text variant="sm" muted>Total</Text>
            <Text variant="h2" tabular>{naira(total)}</Text>
          </Row>
          <Button title={`${isTopup ? "Top up" : "Buy"} · ${naira(total)}`} icon={isTopup ? "bi-plus-lg" : "bi-bag-check"} size="lg" full onPress={buy} />
          <Text variant="xs" muted center>Wallet: {naira(balance, 2)}</Text>
        </>
      }
    >
      <LinearGradient colors={[col.primary700, "#0f3f3a"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.xl, padding: 18, flexDirection: "row", gap: 14, alignItems: "center" }}>
        <CountryArt c={c} size={56} />
        <View style={{ flex: 1 }}>
          <Text variant="label" color="rgba(255,255,255,0.75)">{isTopup ? "Top up eSIM" : regionName(c.region)}</Text>
          <Text variant="h2" color="#fff">{c.name}</Text>
          <Text variant="xs" color="rgba(255,255,255,0.8)">{isTopup ? `Adds data & extends validity on ICCID •••• ${esim!.iccid.slice(-4)}` : "Data-only eSIM · Instant delivery"}</Text>
        </View>
      </LinearGradient>

      <Text variant="h3" style={{ marginTop: 20 }}>Choose a plan</Text>
      <Text variant="xs" muted style={{ marginBottom: 10 }}>Prices in USD · charged in ₦</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {plans.map((pl, i) => (
          <OptionCard key={i} selected={sel === i} onPress={() => setSel(i)} style={{ width: "48%", paddingVertical: 14 }}>
            {pl.popular ? <Badge label="Popular" tone="warning" solid style={{ marginBottom: 6 }} /> : null}
            <Row gap={6}>
              {pl.unlimited ? <Icon name="bi-infinity" size={22} color={col.text} /> : null}
              <Text variant="h2">{pl.unlimited ? "Unlimited" : pl.data}</Text>
            </Row>
            <Text variant="xs" muted>{pl.unlimited ? "Unlimited · " : ""}{pl.days} days</Text>
            <Text weight="bold" color={col.primary} style={{ marginTop: 8 }}>{usd(pl.usd)}</Text>
            <Text variant="xs" muted>{naira(pl.ngn)}</Text>
          </OptionCard>
        ))}
      </View>

      {!isTopup ? (
        <Card style={{ marginTop: 16 }}>
          <DeviceCheck value={device} onChange={(v) => { setDevice(v); setDevErr(false); }} error={devErr} />
        </Card>
      ) : null}

      <Card style={{ marginTop: 16 }}>
        <Text variant="h3" style={{ marginBottom: 10 }}>Coverage & features</Text>
        {[
          ["ion:radio-outline", "Networks", `${c.networks}${c.regional ? " (best local network in each country)" : ""}`],
          ["bi-lightning-charge", "Speed", `${c.speed}${/5G/.test(c.speed) ? " where available, 4G/LTE fallback" : " LTE"}`],
          ["bi-wifi", "Hotspot", "Allowed — share with laptop & family"],
          ["bi-calendar3", "Activation", `Validity starts when the eSIM first connects in ${c.regional ? "a covered country" : c.name}. Install within 180 days.`],
          ["bi-phone", "Data only", "Use WhatsApp, FaceTime & Zoom for calls"],
          ["bi-plus-lg", "Top-up", "Any time from My eSIMs"],
        ].map(([icon, k, v]) => (
          <Row key={k} gap={12} align="flex-start" style={{ paddingVertical: 7 }}>
            <Icon name={icon} size={18} color={col.primary} style={{ marginTop: 1 }} />
            <Text variant="sm" style={{ flex: 1 }}><Text variant="sm" weight="bold">{k}: </Text>{v}</Text>
          </Row>
        ))}
      </Card>

      <Summary
        style={{ marginTop: 16 }}
        rows={[
          ["Plan", `${p.unlimited ? "Unlimited" : p.data} · ${p.days} days`],
          ["Price", `${usd(p.usd)}${q > 1 ? ` × ${q}` : ""}`],
          ["Rate", "₦1,580/$"],
        ]}
        total={["Total", naira(total)]}
      />

      {!isTopup ? (
        <Card style={{ marginTop: 16 }}>
          <Row justify="space-between">
            <View>
              <Text weight="semibold">Quantity</Text>
              <Text variant="xs" muted>One eSIM per device</Text>
            </View>
            <Stepper value={qty} onChange={setQty} min={1} max={5} />
          </Row>
        </Card>
      ) : null}
    </Screen>
  );
}
