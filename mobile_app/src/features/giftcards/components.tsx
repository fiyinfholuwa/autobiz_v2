import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import { View } from "react-native";
import { copy } from "@/components/overlay";
import { Badge, Flag, Icon, IconButton, ListRow, ProgressBar, Row, StatusPill, Text } from "@/components/ui";
import { ago, naira, usd } from "@/lib/format";
import type { Trade } from "@/store";
import { radius, useTheme } from "@/theme";
import { brand, FLAGS, STATUS_TONE, tradeProgress } from "./logic";

/** Brand gradient tile */
export function CardTile({ id, size = 48 }: { id: string; size?: number }) {
  const b = brand(id);
  return (
    <LinearGradient colors={[b.color, shade(b.color)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: size, height: size, borderRadius: size * 0.28, alignItems: "center", justifyContent: "center" }}>
      <Icon name={b.icon} size={size * 0.48} color="#fff" />
    </LinearGradient>
  );
}

/** darken a hex colour ~35% */
export function shade(hex: string, amt = 0.35) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((x) => x + x).join("") : h;
  const n = parseInt(full, 16);
  const f = (v: number) => Math.round(v * (1 - amt)).toString(16).padStart(2, "0");
  return "#" + f((n >> 16) & 255) + f((n >> 8) & 255) + f(n & 255);
}

export function CountryFlag({ country, size = 22 }: { country: string; size?: number }) {
  const { c } = useTheme();
  return FLAGS[country] ? <Flag code={FLAGS[country]} size={size} /> : <Icon name="bi-globe2" size={size} color={c.muted} />;
}

export function TradeRow({ t }: { t: Trade }) {
  const { c } = useTheme();
  const active = t.status === "Pending" || t.status === "Processing";
  const buy = t.side === "buy";
  return (
    <ListRow
      onPress={() => router.push(`/giftcards/trade/${encodeURIComponent(t.id)}`)}
      left={<CardTile id={t.card} size={44} />}
      title={t.cardName}
      subtitle={`${t.qty > 1 ? `${t.qty} × $${t.face}` : usd(t.usd)} · ${t.type} · ${t.country} · ${ago(t.createdAt)}`}
      right={
        <View style={{ alignItems: "flex-end", gap: 4, maxWidth: 130 }}>
          <Text weight="bold" tabular strike={t.status === "Failed"} color={t.status === "Failed" ? c.muted : buy ? c.text : c.success}>
            {buy ? "−" : "+"}{naira(t.naira)}
          </Text>
          <Row gap={4}>
            <Badge label={buy ? "Bought" : "Sold"} tone={buy ? "violet" : "pink"} />
            <StatusPill status={t.status} tone={STATUS_TONE[t.status]} />
          </Row>
          {active ? <ProgressBar value={tradeProgress(t) / 100} height={4} style={{ width: 90 }} /> : null}
        </View>
      }
    />
  );
}

/** Codes list with reveal/hide + copy (buy-side). */
export function CodesBlock({ codes }: { codes: string[] }) {
  const { c } = useTheme();
  const [shown, setShown] = useState<Record<number, boolean>>({});
  return (
    <View style={{ gap: 8 }}>
      {codes.map((code, i) => (
        <Row key={i} justify="space-between" style={{ padding: 12, borderRadius: radius.md, borderWidth: 1, borderStyle: "dashed", borderColor: c.primary300, backgroundColor: c.primarySoft }}>
          <View style={{ flex: 1 }}>
            <Text variant="xs" muted>Code {codes.length > 1 ? i + 1 : ""}</Text>
            <Text weight="bold" tabular selectable>{shown[i] ? code : "••••-••••-••••-" + code.slice(-4)}</Text>
          </View>
          <IconButton icon={shown[i] ? "bi-eye-slash" : "bi-eye"} size={34} onPress={() => setShown((s) => ({ ...s, [i]: !s[i] }))} accessibilityLabel={shown[i] ? "Hide code" : "Reveal code"} />
          <IconButton icon="bi-copy" size={34} onPress={() => copy(code, "Gift card code copied")} accessibilityLabel="Copy code" style={{ marginLeft: 6 }} />
        </Row>
      ))}
    </View>
  );
}
