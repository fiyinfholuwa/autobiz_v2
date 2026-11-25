import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { confirmDialog, requireLogin, toast } from "@/components/overlay";
import { Button, Card, Header, Icon, IconButton, ProductArt, Row, Screen, Text } from "@/components/ui";
import { productById, products } from "@/data/catalog";
import { naira } from "@/lib/format";
import { app, useApp } from "@/store";
import { radius, useTheme } from "@/theme";
import { addToCart, colorName, cssColor, disc, inCartQty } from "@/features/shop/logic";
import { SummaryCard, useTotals } from "@/features/shop/OrderSummary";
import { ProductCard } from "@/features/shop/ProductCard";

function goCheckout() {
  if (!requireLogin({ next: "/checkout", title: "Log in to check out", message: "Sign in or create a free account to place your order. It only takes a minute." })) return;
  router.push("/checkout");
}

export default function Cart() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ checkout?: string }>();
  const wishlist = useApp((s) => s.wishlist);
  const lastState = useApp((s) => s.orders.find((o) => o.address?.state)?.address.state) || "Lagos";
  const t = useTotals("standard", lastState);
  const items = t.items;

  useEffect(() => {
    if (params.checkout === "1") {
      router.setParams({ checkout: undefined } as any);
      if (app().cart.length) setTimeout(goCheckout, 250);
    }
  }, [params.checkout]);

  const saved = wishlist.map(productById).filter(Boolean).slice(0, 6) as NonNullable<ReturnType<typeof productById>>[];
  const suggestions = useMemo(() => products.filter((p) => !wishlist.includes(p.id)).sort((a, b) => disc(b) - disc(a)).slice(0, 4), [wishlist]);

  const remove = (i: number) => {
    const line = app().cartRemove(i);
    if (!line) return;
    toast(`Removed **${line.name}**`, "info", { action: { label: "Undo", onPress: () => app().cartInsert(line, i) } });
  };
  const saveForLater = (i: number) => {
    const line = items[i];
    if (!app().wishlist.includes(line.id)) app().wishlistToggle(line.id);
    app().cartRemove(i);
    toast(`**${line.name}** saved for later`, "success");
  };
  const clearCart = async () => {
    const ok = await confirmDialog({ title: "Clear your cart?", message: `All ${t.units} items will be removed.`, confirmLabel: "Clear cart", cancelLabel: "Keep items", tone: "danger", icon: "bi-trash" });
    if (ok) { app().cartClear(); toast("Cart cleared", "success"); }
  };

  return (
    <Screen
      header={<Header title={`My cart (${t.units})`} subtitle={items.length ? "Review your items before checkout." : "Your cart is waiting to be filled."} right={<IconButton icon="bi-shop" accessibilityLabel="Continue shopping" onPress={() => router.push("/(tabs)/shop")} />} />}
      footer={items.length ? (
        <Row gap={12}>
          <View style={{ flex: 1 }}>
            <Text variant="xs" muted>Total</Text>
            <Text variant="h2" tabular>{naira(t.total)}</Text>
          </View>
          <Button title="Checkout" iconRight="bi-arrow-right" size="lg" style={{ flex: 1.4 }} onPress={goCheckout} />
        </Row>
      ) : undefined}
    >
      {items.length === 0 ? (
        <Card style={{ alignItems: "center", paddingVertical: 28 }}>
          <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: c.primarySoft, alignItems: "center", justifyContent: "center" }}>
            <Icon name="ion:cart-outline" size={40} color={c.primary} />
          </View>
          <Text variant="h2" center style={{ marginTop: 14 }}>Your cart is empty</Text>
          <Text variant="sm" muted center style={{ marginTop: 6, maxWidth: 300 }}>Browse thousands of genuine products and instant digital goods — pay from your wallet or on delivery.</Text>
          <Row gap={10} style={{ marginTop: 16 }}>
            <Button title="Start shopping" onPress={() => router.push("/(tabs)/shop")} />
            <Button title="My orders" variant="outline" onPress={() => router.push("/orders")} />
          </Row>
        </Card>
      ) : (
        <>
          <Row justify="space-between" style={{ marginBottom: 10 }}>
            <Text variant="sm" muted>{items.length} item{items.length > 1 ? "s" : ""} · {t.units} unit{t.units > 1 ? "s" : ""}</Text>
            <Pressable onPress={clearCart} hitSlop={8}><Text variant="sm" weight="bold" color={c.danger}>Clear cart</Text></Pressable>
          </Row>
          <View style={{ gap: 10 }}>
            {items.map((l, i) => <CartLineRow key={`${l.id}-${l.color}-${i}`} index={i} onRemove={() => remove(i)} onSave={() => saveForLater(i)} />)}
          </View>
          <Row gap={14} justify="center" wrap style={{ marginVertical: 14 }}>
            {[["bi-shield-check", "Buyer protection"], ["bi-arrow-counterclockwise", "7-day easy returns"], ["bi-lock", "Secure checkout"]].map(([ic, l]) => (
              <Row key={l} gap={4}><Icon name={ic} size={13} color={c.success} /><Text variant="xs" muted>{l}</Text></Row>
            ))}
          </Row>
          <SummaryCard t={t} deliveryNote={t.digital ? "" : `(${lastState}, standard)`}>
            <Button title="Proceed to checkout" iconRight="bi-arrow-right" full onPress={goCheckout} />
          </SummaryCard>
        </>
      )}

      {saved.length ? (
        <View style={{ marginTop: 22 }}>
          <Row justify="space-between" style={{ marginBottom: 10 }}>
            <Text variant="h3">Saved for later ({wishlist.length})</Text>
            <Pressable onPress={() => router.push({ pathname: "/orders", params: { tab: "wishlist" } })}><Text variant="sm" weight="bold" color={c.primary}>View wishlist</Text></Pressable>
          </Row>
          <View style={{ gap: 10 }}>
            {saved.map((p) => (
              <Card key={p.id} style={{ flexDirection: "row", gap: 12, alignItems: "center", padding: 12 }} onPress={() => router.push(`/product/${p.id}`)}>
                <ProductArt icon={p.icon} tone={p.tone} size={56} />
                <View style={{ flex: 1 }}>
                  <Text variant="sm" weight="semibold" numberOfLines={2}>{p.name}</Text>
                  <Text weight="bold" tabular style={{ marginTop: 2 }}>{naira(p.price)}</Text>
                </View>
                <Button title="Move to cart" size="sm" variant="soft" onPress={() => { if (addToCart(p.id, 1, undefined, { silent: false })) app().wishlistToggle(p.id); }} />
                <IconButton icon="bi-x-lg" size={30} bg={c.surface2} accessibilityLabel="Remove from wishlist" onPress={() => app().wishlistToggle(p.id)} />
              </Card>
            ))}
          </View>
        </View>
      ) : null}

      {items.length === 0 ? (
        <View style={{ marginTop: 22 }}>
          <Text variant="h3" style={{ marginBottom: 10 }}>You might like</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 }}>
            {suggestions.map((p) => <ProductCard key={p.id} p={p} style={{ width: "48.5%" }} />)}
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

function CartLineRow({ index, onRemove, onSave }: { index: number; onRemove: () => void; onSave: () => void }) {
  const { c } = useTheme();
  const l = useApp((s) => s.cart[index]);
  const [text, setText] = useState(String(l?.qty ?? 1));
  useEffect(() => { if (l) setText(String(l.qty)); }, [l?.qty]);
  if (!l) return null;
  const p = productById(l.id);
  const max = (p?.stock ?? l.qty) - (inCartQty(l.id) - l.qty);
  const setQty = (n: number) => app().cartSetQty(index, n);
  return (
    <Card style={{ padding: 12 }}>
      <Row gap={12} align="flex-start">
        <Pressable onPress={() => router.push(`/product/${l.id}`)}><ProductArt icon={l.icon} tone={l.tone} size={76} /></Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="sm" weight="semibold" numberOfLines={2}>{l.name}</Text>
          <Row gap={6} wrap style={{ marginTop: 4 }}>
            {l.color ? <Row gap={4}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: cssColor(l.color), borderWidth: 1, borderColor: c.border }} /><Text variant="xs" muted>{colorName(l.color)}</Text></Row> : null}
            <Text variant="xs" muted numberOfLines={1}>{l.seller}</Text>
            {l.digital ? <Text variant="xs" weight="bold" color={c.warningText}>Instant</Text> : p?.freeShipping ? <Text variant="xs" weight="bold" color={c.success}>Free delivery</Text> : null}
          </Row>
          <Text variant="xs" muted style={{ marginTop: 4 }}>
            {naira(l.price)} each{max <= 5 && !l.digital ? <Text variant="xs" color={c.danger}> · {max} max</Text> : null}
          </Text>
        </View>
      </Row>
      <Row justify="space-between" style={{ marginTop: 10 }}>
        <Row gap={14}>
          <Pressable onPress={onSave} hitSlop={6}><Row gap={4}><Icon name="bi-heart" size={14} color={c.muted} /><Text variant="xs" weight="semibold" muted>Save for later</Text></Row></Pressable>
          <Pressable onPress={onRemove} hitSlop={6}><Row gap={4}><Icon name="bi-trash" size={14} color={c.danger} /><Text variant="xs" weight="semibold" color={c.danger}>Remove</Text></Row></Pressable>
        </Row>
        <Row gap={6}>
          <IconButton icon={l.qty <= 1 ? "bi-trash" : "bi-dash-lg"} color={l.qty <= 1 ? c.danger : c.text} size={32} bg={c.surface2} accessibilityLabel="Decrease" onPress={() => (l.qty <= 1 ? onRemove() : setQty(l.qty - 1))} />
          <TextInput
            value={text}
            keyboardType="number-pad"
            onChangeText={(v) => setText(v.replace(/\D/g, ""))}
            onEndEditing={() => {
              let n = parseInt(text, 10);
              if (isNaN(n) || n < 1) n = 1;
              if (n > max) { n = max; toast(`Only ${max} available for this item`, "warning"); }
              setQty(n); setText(String(n));
            }}
            style={{ width: 38, textAlign: "center", color: c.text, fontSize: 15, fontWeight: "700", borderRadius: radius.sm }}
          />
          <IconButton icon="bi-plus-lg" size={32} bg={c.surface2} disabled={l.qty >= max} accessibilityLabel="Increase" onPress={() => setQty(l.qty + 1)} />
        </Row>
      </Row>
      <Row justify="flex-end" style={{ marginTop: 6 }}><Text weight="extrabold" tabular>{naira(l.price * l.qty)}</Text></Row>
    </Card>
  );
}
