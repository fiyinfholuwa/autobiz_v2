import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { toast } from "@/components/overlay";
import { Button, Card, Icon, Notice, Row, Text, TextField } from "@/components/ui";
import { naira } from "@/lib/format";
import { app, useApp, type CartLine, type DeliveryMethod } from "@/store";
import { radius, useTheme } from "@/theme";
import { allDigital, allFree, colorName, deliveryFee } from "./logic";

export const COUPONS: Record<string, { pct: number; label: string }> = { AUTOBIZ10: { pct: 10, label: "10% off your order" } };

export function useTotals(method: DeliveryMethod, state: string) {
  const items = useApp((s) => s.cart);
  const code = useApp((s) => s.coupon);
  const coupon = code && COUPONS[code] ? code : null;
  const sub = items.reduce((a, l) => a + l.price * l.qty, 0);
  const units = items.reduce((a, l) => a + l.qty, 0);
  const discount = coupon ? Math.round((sub * COUPONS[coupon].pct) / 100) : 0;
  const m: DeliveryMethod = allDigital(items) ? "digital" : method;
  const delivery = deliveryFee(items, m, state);
  return { items, sub, units, coupon, discount, method: m, delivery, total: Math.max(0, sub - discount + delivery), digital: allDigital(items), free: allFree(items) };
}

export function CouponBox() {
  const { c } = useTheme();
  const code = useApp((s) => s.coupon);
  const [val, setVal] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (code && COUPONS[code])
    return (
      <Row justify="space-between" style={{ padding: 12, borderRadius: radius.md, backgroundColor: c.successSoft }}>
        <Row gap={8} style={{ flex: 1 }}>
          <Icon name="bi-tag" size={18} color={c.success} />
          <Text variant="sm" weight="bold" color={c.success}>{code} · <Text variant="sm" color={c.success}>{COUPONS[code].label}</Text></Text>
        </Row>
        <Pressable accessibilityLabel="Remove coupon" hitSlop={8} onPress={() => { app().set("coupon", null); toast("Coupon removed", "info"); }}>
          <Icon name="bi-x-lg" size={16} color={c.success} />
        </Pressable>
      </Row>
    );
  const apply = () => {
    const v = val.trim().toUpperCase();
    if (!v) return setErr("Enter a coupon code.");
    setBusy(true); setErr(null);
    setTimeout(() => {
      setBusy(false);
      if (!COUPONS[v]) return setErr(`“${v}” is invalid or has expired.`);
      app().set("coupon", v); setVal("");
      toast(`Coupon **${v}** applied — ${COUPONS[v].label}`, "success");
    }, 600);
  };
  return (
    <View>
      <Row gap={8} align="flex-start">
        <TextField containerStyle={{ flex: 1 }} icon="bi-tag" placeholder="Coupon code" autoCapitalize="characters" value={val} onChangeText={(t) => { setVal(t.toUpperCase()); setErr(null); }} error={err} onSubmitEditing={apply} />
        <Button title="Apply" variant="soft" loading={busy} loadingText="…" onPress={apply} style={{ height: 50 }} />
      </Row>
      {!err ? <Text variant="xs" muted style={{ marginTop: 5 }}>Try <Text variant="xs" weight="bold">AUTOBIZ10</Text> for 10% off</Text> : null}
    </View>
  );
}

export function SummaryCard({ t, deliveryNote, showItems, children }: { t: ReturnType<typeof useTotals>; deliveryNote: string; showItems?: boolean; children?: React.ReactNode }) {
  const { c } = useTheme();
  const row = (k: string, v: string, color?: string) => (
    <Row justify="space-between" key={k}><Text variant="sm" muted style={{ flex: 1 }}>{k}</Text><Text variant="sm" weight="semibold" tabular color={color}>{v}</Text></Row>
  );
  return (
    <Card style={{ gap: 12 }}>
      <Text variant="h3">Order summary</Text>
      {showItems ? t.items.map((l: CartLine, i: number) => (
        <Row key={i} justify="space-between" gap={10}>
          <View style={{ flex: 1 }}>
            <Text variant="sm" weight="semibold" numberOfLines={1}>{l.name}</Text>
            <Text variant="xs" muted>Qty {l.qty}{l.color ? ` · ${colorName(l.color)}` : ""}</Text>
          </View>
          <Text variant="sm" weight="semibold" tabular>{naira(l.price * l.qty)}</Text>
        </Row>
      )) : null}
      <CouponBox />
      <View style={{ gap: 8 }}>
        {row(`Subtotal (${t.units} item${t.units === 1 ? "" : "s"})`, naira(t.sub))}
        {t.coupon ? row(`Coupon (${t.coupon})`, `−${naira(t.discount)}`, c.success) : null}
        {row(`Delivery ${deliveryNote}`, t.digital ? "Instant · Free" : t.delivery ? naira(t.delivery) : "Free", t.delivery ? undefined : c.success)}
        <View style={{ height: 1, backgroundColor: c.border, marginVertical: 2 }} />
        <Row justify="space-between"><Text weight="bold">Total</Text><Text variant="h2" tabular>{naira(t.total)}</Text></Row>
      </View>
      {t.free && !t.digital ? <Notice tone="success" icon="bi-truck">All items qualify for free standard delivery.</Notice> : null}
      {children}
      <Row gap={6} justify="center"><Icon name="bi-lock" size={12} color={c.muted} /><Text variant="xs" muted>Payments secured with 256-bit encryption</Text></Row>
    </Card>
  );
}
