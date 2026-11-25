import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { AuthGate } from "@/components/AuthGate";
import { copy, shareText, toast } from "@/components/overlay";
import { Button, Card, EmptyState, Header, Icon, IconButton, Notice, ProductArt, Row, Screen, StatusPill, Summary, Text } from "@/components/ui";
import { productById } from "@/data/catalog";
import { date, datetime, naira } from "@/lib/format";
import { useApp, type Order } from "@/store";
import { radius, useTheme } from "@/theme";
import { canCancel, colorName, isDigitalOrder, METHOD_LABEL, ORDER_STATUS, orderUnits, reorder } from "@/features/shop/logic";
import { CancelOrderSheet, markReceived } from "@/features/shop/orderActions";

export default function OrderDetailScreen() {
  return <AuthGate><OrderDetail /></AuthGate>;
}

function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const o = useApp((s) => s.orders.find((x) => x.id === id));
  const [cancelling, setCancelling] = useState<Order | null>(null);
  useEffect(() => { if (!o) toast("We couldn't find that order", "warning"); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!o)
    return (
      <Screen header={<Header title="Order" />}>
        <EmptyState icon="bi-box-seam" title="Order not found" message="It may have been removed or the link is incorrect." action="My orders" onAction={() => router.replace("/orders")} />
      </Screen>
    );

  const st = ORDER_STATUS[o.status];
  const digital = isDigitalOrder(o);
  const units = orderUnits(o);
  const cancelled = o.status === "cancelled";
  const delivered = o.status === "delivered";
  const deliveredAt = o.timeline.find((t) => t.key === "delivered")?.date;
  const firstPending = o.timeline.findIndex((t) => !t.done);
  const payState = o.refunded ? ["Refunded", "primary"] : o.paid ? ["Paid", "success"] : cancelled ? ["Not charged", "neutral"] : ["Due on delivery", "warning"];

  const receipt = () => {
    const lines = [
      `AutoBiz · Order ${o.id}`, `Placed ${datetime(o.date)}`, "",
      ...o.items.map((i) => `${i.qty} × ${i.name} — ${naira(i.price * i.qty)}`), "",
      `Subtotal: ${naira(o.subtotal)}`, ...(o.coupon ? [`Coupon (${o.coupon}): −${naira(o.discount)}`] : []),
      `Delivery: ${o.deliveryFee ? naira(o.deliveryFee) : "Free"}`, `Total: ${naira(o.total, 2)}`,
      `Payment: ${o.payment === "wallet" ? "AutoBiz wallet" : "Pay on delivery"} (${payState[0]})`, ...(o.txId ? [`Reference: ${o.txId}`] : []),
    ];
    shareText(`Order ${o.id}`, lines.join("\n"));
  };

  return (
    <Screen header={<Header title={o.id} subtitle={`Placed ${datetime(o.date)}`} right={<IconButton icon="bi-copy" accessibilityLabel="Copy order ID" onPress={() => copy(o.id, "Order ID copied")} />} />}>
      {/* ETA */}
      <Card style={{ backgroundColor: cancelled ? c.dangerSoft : delivered ? c.successSoft : c.primarySoft }} elevated={false}>
        <Row justify="space-between">
          <View style={{ flex: 1 }}>
            <Text variant="xs" muted>{cancelled ? "Order cancelled" : delivered ? "Delivered" : "Estimated delivery"}</Text>
            <Text variant="h2" style={{ marginTop: 2 }}>
              {cancelled ? (o.refunded ? `Refunded ${naira(o.total)}` : "No charge") : delivered ? (deliveredAt ? date(deliveredAt) : "Delivered") : o.eta}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end", gap: 6 }}>
            <Icon name={st.icon} size={26} color={cancelled ? c.danger : delivered ? c.success : c.primary} />
            <StatusPill status={o.status} label={st.label} tone={st.tone} />
          </View>
        </Row>
      </Card>

      {/* Timeline */}
      <Card style={{ marginTop: 12 }}>
        <Text variant="h3" style={{ marginBottom: 12 }}>Tracking</Text>
        {o.timeline.map((t, i) => {
          const isCancel = t.key === "cancelled";
          const current = !cancelled && i === firstPending;
          const last = i === o.timeline.length - 1;
          return (
            <Row key={t.key + i} align="flex-start" gap={12}>
              <View style={{ alignItems: "center", width: 24 }}>
                {t.done ? (
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: isCancel ? c.danger : c.success, alignItems: "center", justifyContent: "center" }}>
                    <Icon name={isCancel ? "bi-x-lg" : "bi-check-lg"} size={14} color="#fff" />
                  </View>
                ) : current ? (
                  <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 3, borderColor: c.primary, alignItems: "center", justifyContent: "center" }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.primary }} />
                  </View>
                ) : (
                  <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: c.border }} />
                )}
                {!last ? <View style={{ width: 2, flex: 1, minHeight: 26, backgroundColor: t.done ? c.success : c.border }} /> : null}
              </View>
              <View style={{ flex: 1, paddingBottom: last ? 0 : 14 }}>
                <Text weight={t.done || current ? "bold" : "medium"} muted={!t.done && !current}>{t.label}</Text>
                <Text variant="xs" muted>{t.done ? `${t.note}${t.date ? ` · ${datetime(t.date)}` : ""}` : t.note}</Text>
              </View>
            </Row>
          );
        })}
      </Card>

      {/* Items */}
      <Card style={{ marginTop: 12 }}>
        <Text variant="h3" style={{ marginBottom: 6 }}>Items ({units})</Text>
        {o.items.map((it, i) => {
          const brand = productById(it.id)?.brand || "the brand";
          return (
            <View key={i} style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: c.border }}>
              <Row gap={12}>
                <ProductArt icon={it.icon} tone={it.tone} size={56} />
                <View style={{ flex: 1 }}>
                  <Text variant="sm" weight="semibold" numberOfLines={2}>{it.name}</Text>
                  <Text variant="xs" muted>{it.qty} × {naira(it.price)}{it.color ? ` · ${colorName(it.color)}` : ""} · {it.seller}</Text>
                </View>
                <Text weight="bold" tabular>{naira(it.price * it.qty)}</Text>
              </Row>
              {it.codes?.length ? (
                <View style={{ marginTop: 10, gap: 8 }}>
                  {it.codes.map((code, n) => (
                    <Row key={n} justify="space-between" style={{ padding: 12, borderRadius: radius.md, borderWidth: 1.5, borderStyle: "dashed", borderColor: cancelled ? c.border : c.warning }}>
                      <View>
                        <Text variant="xs" muted>Voucher code {n + 1}</Text>
                        <Text weight="bold" tabular strike={cancelled} muted={cancelled} selectable>{code}</Text>
                      </View>
                      {cancelled ? <Text variant="xs" weight="bold" color={c.danger}>Voided</Text> : <Button title="Copy" size="sm" variant="soft" icon="bi-copy" onPress={() => copy(code, "Voucher code copied")} />}
                    </Row>
                  ))}
                  {!cancelled ? <Text variant="xs" muted>Redeem on the official {brand} website or app.</Text> : null}
                </View>
              ) : null}
            </View>
          );
        })}
      </Card>

      {/* Address & delivery */}
      <Row gap={12} align="stretch" style={{ marginTop: 12 }}>
        <Card style={{ flex: 1 }}>
          <Text variant="label" muted>{digital && o.method === "digital" ? "Delivered to" : o.method === "pickup" ? "Pickup station" : "Ship to"}</Text>
          <Text variant="sm" weight="semibold" style={{ marginTop: 6 }}>{o.address.name}</Text>
          <Text variant="xs" muted style={{ marginTop: 2 }}>
            {o.method === "digital" ? o.address.email : o.method === "pickup" ? `${o.pickupHub}, ${o.address.state}` : `${o.address.street}, ${o.address.city}, ${o.address.state}`}
          </Text>
          <Text variant="xs" muted>{o.address.phone}</Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text variant="label" muted>Delivery</Text>
          <Text variant="sm" weight="semibold" style={{ marginTop: 6 }}>{METHOD_LABEL[o.method]}</Text>
          <Text variant="xs" muted style={{ marginTop: 2 }}>{o.method === "digital" ? "Instant" : `ETA ${o.eta}`}</Text>
        </Card>
      </Row>

      {/* Receipt */}
      <Card style={{ marginTop: 12 }}>
        <Text variant="h3" style={{ marginBottom: 10 }}>Receipt</Text>
        <Summary
          rows={[
            ["Subtotal", naira(o.subtotal)],
            ...(o.coupon ? [[`Coupon (${o.coupon})`, `−${naira(o.discount)}`, { color: c.success }] as [string, string, { color: string }]] : []),
            ["Delivery", o.deliveryFee ? naira(o.deliveryFee) : "Free"],
            ["Total", naira(o.total, 2), { bold: true }],
            ["Payment", o.payment === "wallet" ? "AutoBiz wallet" : "Pay on delivery"],
            ["Status", <StatusPill key="s" status={payState[0]} tone={payState[1]} />],
            ...(o.txId ? [["Reference", o.txId] as [string, string]] : []),
          ]}
        />
      </Card>

      {/* Actions */}
      <View style={{ gap: 10, marginTop: 14 }}>
        {o.status === "shipped" ? <Button title="I've received this order" icon="bi-check2-circle" full onPress={() => markReceived(o)} /> : null}
        <Row gap={10}>
          <Button title="Reorder items" icon="bi-arrow-repeat" variant="soft" style={{ flex: 1 }} onPress={() => reorder(o, () => router.push("/cart"))} />
          <Button title="Share receipt" icon="bi-share" variant="outline" style={{ flex: 1 }} onPress={receipt} />
        </Row>
        {canCancel(o) ? (
          <Button title="Cancel order" variant="dangerSoft" icon="bi-x-circle" full onPress={() => setCancelling(o)} />
        ) : o.status === "processing" && digital ? (
          <Notice tone="warning">Orders with digital codes can't be cancelled once codes are issued.</Notice>
        ) : null}
      </View>
      <CancelOrderSheet order={cancelling} onClose={() => setCancelling(null)} />
    </Screen>
  );
}
