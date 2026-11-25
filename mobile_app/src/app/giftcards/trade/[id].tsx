import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { Linking, View } from "react-native";
import { AuthGate } from "@/components/AuthGate";
import { copy } from "@/components/overlay";
import { Badge, Button, Card, EmptyState, Header, Icon, IconButton, Notice, ProgressBar, Row, Screen, StatusPill, Summary, Text, type SummaryRow } from "@/components/ui";
import { CardTile, CodesBlock } from "@/features/giftcards/components";
import { brand, STATUS_TONE, tradeProgress } from "@/features/giftcards/logic";
import { datetime, naira, usd } from "@/lib/format";
import { useApp, type Trade, type TradeStatus } from "@/store";
import { useTheme } from "@/theme";

export default function TradeDetailScreen() {
  return <AuthGate><TradeDetail /></AuthGate>;
}

function TradeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const t = useApp((s) => s.trades.find((x) => x.id === id));
  const [, tick] = useState(0);
  useEffect(() => { const i = setInterval(() => tick((x) => x + 1), 1000); return () => clearInterval(i); }, []);
  if (!t)
    return (
      <Screen header={<Header title="Trade details" />}>
        <EmptyState icon="bi-gift" title="Trade not found" action="My trades" onAction={() => router.replace({ pathname: "/giftcards", params: { tab: "trades" } })} />
      </Screen>
    );

  const buy = t.side === "buy";
  const failed = t.status === "Failed";
  const label = buy ? "You paid" : failed ? "Not paid" : t.status === "Completed" ? "You received" : "You'll receive";
  const rows: SummaryRow[] = [
    ["Trade ID", <Row key="id" gap={6}><Text variant="sm" weight="semibold" selectable>{t.id}</Text><IconButton icon="bi-copy" size={28} bg={c.surface} onPress={() => copy(t.id, "Trade ID copied")} accessibilityLabel="Copy trade ID" /></Row>],
    ["Card", `${t.country} · ${t.type}`],
    ["Value", `${t.qty > 1 ? `${t.qty} × $${t.face} = ` : ""}${usd(t.usd)}`],
    ["Rate", `₦${t.rate.toLocaleString()}/$${t.bonus ? " (incl. bonus)" : ""}`],
  ];
  if (buy) { rows.push(["Fee", naira(t.fee || 0)]); rows.push(["Delivered to", t.email || "—"]); }
  else rows.push(t.codes.length ? ["E-codes", t.codes.join("\n")] : ["Photos", `${t.images || 0} uploaded`]);
  if (t.note) rows.push(["Note", t.note]);

  return (
    <Screen
      header={<Header title="Trade details" />}
      footer={
        <Row gap={10}>
          <Button title="Get help" icon="bi-headset" variant="outline" style={{ flex: 1 }} onPress={() => Linking.openURL(`mailto:support@autobiz.ng?subject=Trade%20${t.id}`)} />
          {buy ? (
            <Button title="Buy again" style={{ flex: 1 }} onPress={() => router.dismissTo({ pathname: "/giftcards", params: { tab: "buy", brand: t.card, face: String(t.face) } })} />
          ) : (
            <Button title="Sell another" style={{ flex: 1 }} onPress={() => router.dismissTo({ pathname: "/giftcards", params: { tab: "sell", card: t.card, country: t.country, type: t.type, step: "3" } })} />
          )}
        </Row>
      }
    >
      <Card>
        <Row gap={12}>
          <CardTile id={t.card} size={48} />
          <View style={{ flex: 1 }}>
            <Text weight="bold">{t.cardName}</Text>
            <Text variant="xs" muted>{buy ? "Bought" : "Sold"} · {datetime(t.createdAt)}</Text>
          </View>
          <StatusPill status={t.status} tone={STATUS_TONE[t.status]} />
        </Row>
        {failed ? (
          <Notice tone="danger" icon="bi-x-octagon" style={{ marginTop: 14 }}>
            <Text variant="sm" color={c.danger}><Text variant="sm" weight="bold" color={c.danger}>Reason: </Text>{t.reason}{"\n"}No money was deducted. Contact support if you think this is a mistake.</Text>
          </Notice>
        ) : null}
        <View style={{ alignItems: "center", marginVertical: 18 }}>
          <Text variant="label" muted>{label}</Text>
          <Text variant="display" tabular strike={failed} color={failed ? c.muted : buy ? c.text : c.success}>{naira(t.naira)}</Text>
          {!buy && !failed && t.status !== "Completed" ? <ProgressBar value={tradeProgress(t) / 100} style={{ width: 200, marginTop: 10 }} /> : null}
        </View>
        <Summary rows={rows} />
        {buy && t.codes.length ? <View style={{ marginTop: 12 }}><CodesBlock codes={t.codes} /></View> : null}
      </Card>

      <Card style={{ marginTop: 16 }}>
        <Text variant="h3" style={{ marginBottom: 12 }}>Progress</Text>
        <Timeline t={t} />
      </Card>
    </Screen>
  );
}

function Timeline({ t }: { t: Trade }) {
  const { c } = useTheme();
  const b = brand(t.card).name;
  const at = (s: TradeStatus) => t.timeline.find((x) => x.s === s)?.at;
  const steps: { s: TradeStatus; title: string; desc: string }[] = t.side === "buy"
    ? [
        { s: "Pending", title: "Payment received", desc: "Debited from your wallet" },
        { s: "Processing", title: "Code generated", desc: `Issued by ${b}` },
        { s: "Completed", title: "Delivered", desc: `Sent to ${t.email}` },
      ]
    : [
        { s: "Pending", title: "Trade submitted", desc: "We received your card details" },
        { s: "Processing", title: "Verifying card", desc: "Our team is checking your card" },
        t.status === "Failed" ? { s: "Failed", title: "Trade declined", desc: t.reason || "" } : { s: "Completed", title: "Paid to wallet", desc: `${naira(t.naira)} credited` },
      ];
  return (
    <View>
      {steps.map((st, i) => {
        const reached = at(st.s);
        const nextReached = steps[i + 1] ? at(steps[i + 1].s) : undefined;
        const state = st.s === "Failed" && reached ? "fail" : reached && (nextReached || t.status === "Completed") ? "done" : reached ? "now" : "pending";
        const color = state === "fail" ? c.danger : state === "done" ? c.success : state === "now" ? c.primary : c.border;
        return (
          <Row key={st.s} gap={12} align="flex-start">
            <View style={{ alignItems: "center" }}>
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: state === "pending" ? c.surface2 : color, alignItems: "center", justifyContent: "center", borderWidth: state === "now" ? 3 : 0, borderColor: c.primarySoft }}>
                {state === "done" ? <Icon name="bi-check-lg" size={14} color="#fff" /> : state === "fail" ? <Icon name="bi-x-lg" size={13} color="#fff" /> : state === "now" ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" }} /> : null}
              </View>
              {i < steps.length - 1 ? <View style={{ width: 2, height: 34, backgroundColor: state === "done" ? c.success : c.border }} /> : null}
            </View>
            <View style={{ flex: 1, paddingBottom: 12 }}>
              <Row gap={6}><Text weight="semibold">{st.title}</Text>{state === "now" ? <Badge label="In progress" tone="primary" /> : null}</Row>
              <Text variant="xs" muted>{reached ? `${st.desc} · ${datetime(reached)}` : "Waiting…"}</Text>
            </View>
          </Row>
        );
      })}
    </View>
  );
}
