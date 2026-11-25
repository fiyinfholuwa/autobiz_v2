import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { View } from "react-native";
import { AuthGate } from "@/components/AuthGate";
import { toast } from "@/components/overlay";
import { Button, Card, Chip, ChipRow, EmptyState, Header, Icon, IconButton, ProductArt, Row, Screen, Segment, StatusPill, Text, TextField } from "@/components/ui";
import { productById } from "@/data/catalog";
import { datetime, naira } from "@/lib/format";
import { app, useApp, type Order, type OrderStatus } from "@/store";
import { useTheme } from "@/theme";
import { canCancel, inCartQty, isDigitalOrder, lineFor, METHOD_LABEL, ORDER_STATUS, orderUnits, reorder } from "@/features/shop/logic";
import { CancelOrderSheet } from "@/features/shop/orderActions";
import { ProductCard } from "@/features/shop/ProductCard";

export default function OrdersScreen() {
  return <AuthGate><Orders /></AuthGate>;
}

const goCart = () => router.push("/cart");

function Orders() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<"orders" | "wishlist">(params.tab === "wishlist" ? "wishlist" : "orders");
  const wishlist = useApp((s) => s.wishlist);
  const cartCount = useApp((s) => s.cart.reduce((a, l) => a + l.qty, 0));
  return (
    <Screen
      header={
        <View>
          <Header title="My orders" subtitle="Track deliveries, get your digital codes and reorder favourites." right={<IconButton icon="ion:cart-outline" badge={cartCount || undefined} accessibilityLabel="Cart" onPress={goCart} />} />
          <Segment
            style={{ marginHorizontal: 16, marginBottom: 10 }}
            value={tab}
            onChange={(v) => { setTab(v); router.setParams({ tab: v === "wishlist" ? "wishlist" : undefined } as any); }}
            options={[{ value: "orders", label: "Orders" }, { value: "wishlist", label: `Wishlist (${wishlist.length})` }]}
          />
        </View>
      }
    >
      {tab === "orders" ? <OrdersPane /> : <WishlistPane />}
    </Screen>
  );
}

function OrdersPane() {
  const { c } = useTheme();
  const orders = useApp((s) => s.orders);
  const [status, setStatus] = useState<"all" | OrderStatus>("all");
  const [q, setQ] = useState("");
  const [cancelling, setCancelling] = useState<Order | null>(null);
  const list = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return orders.filter((o) => (status === "all" || o.status === status) && (!ql || o.id.toLowerCase().includes(ql) || o.items.some((i) => i.name.toLowerCase().includes(ql))));
  }, [orders, status, q]);
  const count = (s: "all" | OrderStatus) => (s === "all" ? orders.length : orders.filter((o) => o.status === s).length);

  if (!orders.length)
    return <EmptyState icon="bi-box-seam" title="No orders yet" message="When you buy something on the marketplace, you'll track it here." action="Start shopping" onAction={() => router.push("/(tabs)/shop")} />;

  return (
    <View>
      <ChipRow contentStyle={{ paddingHorizontal: 0 }}>
        {(["all", "processing", "shipped", "delivered", "cancelled"] as const).map((s) => (
          <Chip key={s} label={s === "all" ? "All" : ORDER_STATUS[s].label} count={count(s)} active={status === s} onPress={() => setStatus(s)} />
        ))}
      </ChipRow>
      <TextField icon="bi-search" placeholder="Search order ID or item" value={q} onChangeText={setQ} containerStyle={{ marginTop: 12 }} autoCapitalize="none" />
      {list.length === 0 ? (
        <EmptyState icon="bi-search" title={`No ${status === "all" ? "" : ORDER_STATUS[status].label.toLowerCase() + " "}orders${q ? ` matching “${q}”` : ""}`} action="Show all orders" onAction={() => { setStatus("all"); setQ(""); }} />
      ) : (
        <View style={{ gap: 12, marginTop: 14 }}>
          {list.map((o) => {
            const st = ORDER_STATUS[o.status];
            const units = orderUnits(o);
            const digital = isDigitalOrder(o);
            return (
              <Card key={o.id} onPress={() => router.push(`/orders/${o.id}`)}>
                <Row justify="space-between">
                  <View>
                    <Text weight="bold">{o.id}</Text>
                    <Text variant="xs" muted>{datetime(o.date)}</Text>
                  </View>
                  <StatusPill status={o.status} label={st.label} tone={st.tone} />
                </Row>
                <Row gap={8} style={{ marginTop: 12 }}>
                  {o.items.slice(0, 4).map((i, k) => <ProductArt key={k} icon={i.icon} tone={i.tone} size={46} />)}
                  {o.items.length > 4 ? <View style={{ width: 46, height: 46, borderRadius: 10, backgroundColor: c.surface2, alignItems: "center", justifyContent: "center" }}><Text variant="sm" weight="bold">+{o.items.length - 4}</Text></View> : null}
                </Row>
                <Text variant="sm" weight="semibold" numberOfLines={1} style={{ marginTop: 10 }}>{o.items[0].name}{o.items.length > 1 ? ` + ${o.items.length - 1} more` : ""}</Text>
                <Text variant="xs" muted>
                  {units} item{units > 1 ? "s" : ""} · {METHOD_LABEL[o.method]}{o.status === "cancelled" ? "" : o.status === "delivered" ? " · Delivered" : ` · ETA ${o.eta}`}
                </Text>
                {digital && o.status !== "cancelled" ? <Row gap={4} style={{ marginTop: 4 }}><Icon name="bi-upc-scan" size={13} color={c.warningText} /><Text variant="xs" weight="bold" color={c.warningText}>Digital code{units > 1 ? "s" : ""} ready</Text></Row> : null}
                <Row justify="space-between" style={{ marginTop: 10 }}>
                  <View>
                    <Text weight="extrabold" tabular>{naira(o.total)}</Text>
                    <Text variant="xs" muted>{o.payment === "wallet" ? (o.refunded ? "Refunded to wallet" : "Paid · Wallet") : o.paid ? "Paid on delivery" : "Pay on delivery"}</Text>
                  </View>
                </Row>
                <Row gap={8} wrap style={{ marginTop: 12 }}>
                  <Button size="sm" title={o.status === "cancelled" ? "View details" : digital ? "View codes & details" : "Track order"} onPress={() => router.push(`/orders/${o.id}`)} />
                  <Button size="sm" variant="soft" title="Reorder" icon="bi-arrow-repeat" onPress={() => reorder(o, goCart)} />
                  {canCancel(o) ? <Button size="sm" variant="dangerSoft" title="Cancel order" onPress={() => setCancelling(o)} /> : null}
                </Row>
              </Card>
            );
          })}
        </View>
      )}
      <CancelOrderSheet order={cancelling} onClose={() => setCancelling(null)} />
    </View>
  );
}

function WishlistPane() {
  const wishlist = useApp((s) => s.wishlist);
  const items = wishlist.map(productById).filter(Boolean) as NonNullable<ReturnType<typeof productById>>[];
  if (!items.length)
    return <EmptyState icon="bi-heart" tone="pink" title="Your wishlist is empty" message="Tap the heart on any product to save it for later." action="Explore marketplace" onAction={() => router.push("/(tabs)/shop")} />;
  const addAll = () => {
    let n = 0;
    for (const p of items) {
      if (p.stock - inCartQty(p.id) <= 0) continue;
      const color = p.colors?.[0] ?? null;
      const ex = app().cart.find((l) => l.id === p.id && l.color === color);
      app().cartAdd(lineFor(p, color), 1, (ex?.qty || 0) + 1);
      n++;
    }
    if (n) toast(`${n} item${n > 1 ? "s" : ""} added to cart`, "success", { action: { label: "Go to cart", onPress: goCart } });
    else toast("All saved items are already in your cart", "info");
  };
  return (
    <View>
      <Row justify="space-between" style={{ marginBottom: 12 }}>
        <Text variant="sm" muted>{items.length} saved item{items.length > 1 ? "s" : ""}</Text>
        <Button title="Add all to cart" size="sm" icon="ion:cart-outline" onPress={addAll} />
      </Row>
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 }}>
        {items.map((p) => <ProductCard key={p.id} p={p} style={{ width: "48.5%" }} />)}
      </View>
    </View>
  );
}
