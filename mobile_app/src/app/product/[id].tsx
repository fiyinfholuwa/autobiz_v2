import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import { Dimensions, Pressable, ScrollView, TextInput, View } from "react-native";
import { copy, toast } from "@/components/overlay";
import {
  Avatar, Badge, Button, Card, ChipRow, EmptyState, Header, Icon, IconButton, IconTile, Notice, ProductArt, ProgressBar, Row, Screen, Segment, Select, Stars, Summary, Text,
} from "@/components/ui";
import { productById, products } from "@/data/catalog";
import { date, naira } from "@/lib/format";
import { app, useApp } from "@/store";
import { radius, useTheme } from "@/theme";
import {
  addToCart, catName, colorName, cssColor, disc, eta, FEATURES, genReviews, productDeliveryFee, ratingBreakdown, sellerStats, shortDesc, STATES, toggleWish, warranty,
} from "@/features/shop/logic";
import { ProductCard } from "@/features/shop/ProductCard";

const TONES = ["primary", "violet", "pink", "cyan", "orange", "success", "warning"];

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = productById(String(id));
  const { c, dark } = useTheme();
  const cart = useApp((s) => s.cart);
  const wished = useApp((s) => (p ? s.wishlist.includes(p.id) : false));
  const user = useApp((s) => s.user);
  const lastState = useApp((s) => s.orders.find((o) => o.address?.state)?.address.state);
  const following = useApp((s) => (p ? !!s.settings.following[p.seller] : false));
  const cartCount = useApp((s) => s.cart.reduce((a, l) => a + l.qty, 0));
  const [view, setView] = useState(0);
  const [color, setColor] = useState<string | null>(p?.colors?.[0] ?? null);
  const [qty, setQty] = useState(1);
  const [qtyText, setQtyText] = useState("1");
  const [tab, setTab] = useState<"desc" | "specs" | "reviews">("desc");
  const [starFilter, setStarFilter] = useState<number | null>(null);
  const [helpful, setHelpful] = useState<Record<number, boolean>>({});
  const [state, setState] = useState(lastState || "Lagos");
  const [buying, setBuying] = useState(false);
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const tabsY = useRef(0);
  const bodyY = useRef(0);
  const galleryRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const W = Dimensions.get("window").width;

  const reviews = useMemo(() => (p ? genReviews(p) : []), [p]);
  const breakdown = useMemo(() => (p ? ratingBreakdown(p) : []), [p]);
  const stats = useMemo(() => (p ? sellerStats(p.seller) : null), [p]);
  const related = useMemo(() => {
    if (!p) return [];
    const same = products.filter((x) => x.category === p.category && x.id !== p.id);
    const other = products.filter((x) => x.category !== p.category && x.id !== p.id).sort((a, b) => b.reviews - a.reviews);
    return [...same, ...other].slice(0, 8);
  }, [p]);

  if (!p) {
    const popular = [...products].sort((a, b) => b.reviews - a.reviews).slice(0, 4);
    return (
      <Screen header={<Header title="Product" />}>
        <EmptyState icon="bi-search" title="We couldn't find that product" message="It may have been sold out, removed by the seller, or the link is incorrect. Explore similar deals below." action="Browse marketplace" onAction={() => router.replace("/(tabs)/shop")} />
        <Button title="Go to cart" variant="outline" onPress={() => router.push("/cart")} style={{ alignSelf: "center" }} />
        <Text variant="h3" style={{ marginTop: 24, marginBottom: 10 }}>Popular right now</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 }}>
          {popular.map((x) => <ProductCard key={x.id} p={x} style={{ width: "48.5%" }} />)}
        </View>
      </Screen>
    );
  }

  const d = disc(p);
  const inCart = cart.filter((l) => l.id === p.id).reduce((a, l) => a + l.qty, 0);
  const max = p.stock - inCart;
  const altTone = TONES[(TONES.indexOf(p.tone) + 2) % 7];
  const views = [
    { label: "Front", icon: p.icon, tone: p.tone, rotate: undefined as string | undefined, scale: 0.42 },
    { label: "Angle", icon: p.icon, tone: p.tone, rotate: "-18deg", scale: 0.42 },
    { label: "Detail", icon: p.icon, tone: altTone, rotate: "8deg", scale: 0.62 },
    p.digital ? { label: "Delivery", icon: "bi-envelope-paper", tone: "success", rotate: undefined, scale: 0.42 } : { label: "In the box", icon: "bi-box-seam", tone: "success", rotate: undefined, scale: 0.42 },
  ];
  const goView = (i: number) => { const n = (i + 4) % 4; setView(n); galleryRef.current?.scrollTo({ x: n * W, animated: true }); };

  const setQ = (n: number) => { const v = Math.max(1, Math.min(n, Math.max(1, max))); setQty(v); setQtyText(String(v)); };
  const stockNote =
    max <= 0 ? { t: "All available stock is in your cart", col: c.danger }
      : p.digital ? { t: "Available instantly", col: c.success }
      : p.stock <= 10 ? { t: `Only ${p.stock} left in stock${inCart ? ` · ${inCart} in cart` : ""}`, col: c.danger }
      : { t: `In stock · ${p.stock} available${inCart ? ` · ${inCart} in cart` : ""}`, col: c.muted };

  const add = () => {
    if (addToCart(p.id, qty, color, { onView: () => router.push("/cart") })) setQ(1);
  };
  const buyNow = () => {
    if (!addToCart(p.id, qty, color, { silent: true })) return;
    setBuying(true);
    setTimeout(() => { setBuying(false); setQ(1); router.push({ pathname: "/cart", params: { checkout: "1" } }); }, 500);
  };
  const toggleFollow = () => {
    const now = !following;
    app().update("settings", (s) => ({ ...s, following: { ...s.following, [p.seller]: now } }));
    toast(now ? `You're now following **${p.seller}**` : `Unfollowed ${p.seller}`, now ? "success" : "info");
  };

  const specs: [string, string][] = [
    ["Brand", p.brand], ["Model", p.name], ["Category", catName(p.category)], ["SKU", `AB-${p.id.toUpperCase()}-${p.brand.slice(0, 3).toUpperCase()}`],
    ...(p.colors ? [["Colours", p.colors.map(colorName).join(", ")] as [string, string]] : []),
    ["Condition", p.digital ? "Digital licence / code" : "Brand new, sealed"], ["Warranty", warranty(p)],
    ["Ships from", p.digital ? "Instant (online)" : "Lagos, Nigeria"], ["Seller", p.seller],
  ];
  const shownReviews = starFilter ? reviews.filter((r) => r.stars === starFilter) : reviews;
  const maxCount = Math.max(...breakdown.map((b) => b.count), 1);

  return (
    <Screen
      padded={false}
      scrollRef={scrollRef}
      header={
        <Header
          title={catName(p.category)}
          right={
            <>
              <IconButton icon="bi-share" accessibilityLabel="Share product" onPress={() => copy(`https://autobiz.app/product/${p.id}`, "Product link copied")} />
              <IconButton icon="ion:cart-outline" badge={cartCount || undefined} accessibilityLabel="Cart" onPress={() => router.push("/cart")} />
            </>
          }
        />
      }
      footer={
        <Row gap={10}>
          <IconButton icon={wished ? "bi-heart-fill" : "bi-heart"} color={wished ? c.pink : c.text} size={50} bg={c.surface2} accessibilityLabel="Wishlist" onPress={() => toggleWish(p.id, () => router.push({ pathname: "/orders", params: { tab: "wishlist" } }))} />
          <Button title="Add to cart" icon="ion:cart-outline" variant="soft" style={{ flex: 1 }} disabled={max <= 0} onPress={add} />
          <Button title="Buy now" style={{ flex: 1 }} disabled={max <= 0} loading={buying} loadingText="Buy now" onPress={buyNow} />
        </Row>
      }
    >
      {/* Gallery */}
      <View>
        <ScrollView ref={galleryRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(e) => setView(Math.round(e.nativeEvent.contentOffset.x / W))}>
          {views.map((v, i) => (
            <View key={i} style={{ width: W, paddingHorizontal: 16 }}>
              <ProductArt icon={v.icon} tone={v.tone} size="100%" iconScale={v.scale} rotate={v.rotate} style={{ borderRadius: 28 }} />
            </View>
          ))}
        </ScrollView>
        {d > 0 ? <Badge label={`-${d}%`} tone="danger" solid style={{ position: "absolute", top: 12, left: 28 }} /> : null}
        {color ? (
          <View style={{ position: "absolute", bottom: 12, left: 28, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.surface, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: cssColor(color), borderWidth: 1, borderColor: c.border }} />
            <Text variant="xs" weight="semibold">{colorName(color)}</Text>
          </View>
        ) : null}
        <View style={{ position: "absolute", top: "45%", left: 22 }}><IconButton icon="bi-chevron-left" size={34} accessibilityLabel="Previous image" onPress={() => goView(view - 1)} /></View>
        <View style={{ position: "absolute", top: "45%", right: 22 }}><IconButton icon="bi-chevron-right" size={34} accessibilityLabel="Next image" onPress={() => goView(view + 1)} /></View>
      </View>
      <Row gap={10} justify="center" style={{ marginTop: 12, paddingHorizontal: 16 }}>
        {views.map((v, i) => (
          <Pressable key={i} onPress={() => goView(i)} style={{ alignItems: "center", gap: 4 }}>
            <View style={{ borderWidth: 2, borderColor: i === view ? c.primary : "transparent", borderRadius: 16, padding: 2 }}>
              <ProductArt icon={v.icon} tone={v.tone} size={54} rotate={v.rotate} iconScale={v.scale} />
            </View>
            <Text size={10} muted={i !== view} weight="semibold">{v.label}</Text>
          </Pressable>
        ))}
      </Row>

      <View onLayout={(e) => (bodyY.current = e.nativeEvent.layout.y)} style={{ paddingHorizontal: 16, marginTop: 16, gap: 14 }}>
        <Row gap={6} wrap>
          {p.badge ? <Badge label={p.badge} tone="primary" /> : null}
          {p.digital ? <Badge label="Instant delivery" tone="warning" icon="bi-lightning-fill" /> : p.freeShipping ? <Badge label="Free delivery" tone="success" icon="bi-truck" /> : null}
          <Badge label={p.brand} tone="neutral" />
        </Row>
        <Text variant="h2">{p.name}</Text>
        <Pressable onPress={() => { setTab("reviews"); scrollRef.current?.scrollTo({ y: bodyY.current + tabsY.current - 8, animated: true }); }}>
          <Row gap={6}><Stars rating={p.rating} /><Text variant="sm" weight="semibold">{p.rating}</Text><Text variant="sm" muted>· {p.reviews.toLocaleString()} ratings</Text></Row>
        </Pressable>
        <View>
          <Row gap={10} align="flex-end">
            <Text variant="display" tabular>{naira(p.price)}</Text>
            {p.oldPrice ? <Text muted strike tabular style={{ marginBottom: 5 }}>{naira(p.oldPrice)}</Text> : null}
            {d > 0 ? <Badge label={`-${d}%`} tone="danger" style={{ marginBottom: 6 }} /> : null}
          </Row>
          {p.oldPrice ? <Text variant="sm" weight="semibold" color={c.success}>You save {naira(p.oldPrice - p.price)}</Text> : null}
        </View>

        {p.colors ? (
          <View>
            <Text variant="sm" weight="semibold" style={{ marginBottom: 8 }}>Colour: <Text variant="sm" muted>{colorName(color)}</Text></Text>
            <Row gap={10}>
              {p.colors.map((col) => (
                <Pressable key={col} accessibilityLabel={colorName(col)} onPress={() => setColor(col)} style={{ width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: color === col ? c.primary : "transparent", padding: 3 }}>
                  <View style={{ flex: 1, borderRadius: 18, backgroundColor: cssColor(col), borderWidth: 1, borderColor: c.border }} />
                </Pressable>
              ))}
            </Row>
          </View>
        ) : null}

        <Row justify="space-between">
          <View style={{ flex: 1 }}>
            <Text variant="sm" weight="semibold">Quantity</Text>
            <Text variant="xs" color={stockNote.col} style={{ marginTop: 2 }}>{stockNote.t}</Text>
          </View>
          <Row gap={8}>
            <IconButton icon="bi-dash-lg" size={36} bg={c.surface2} disabled={qty <= 1} accessibilityLabel="Decrease" onPress={() => setQ(qty - 1)} />
            <TextInput
              value={qtyText}
              keyboardType="number-pad"
              onChangeText={(t) => setQtyText(t.replace(/\D/g, ""))}
              onEndEditing={() => {
                const n = parseInt(qtyText, 10);
                if (isNaN(n) || n < 1) return setQ(1);
                if (n > max) { toast(`Only ${max} available to add`, "warning"); return setQ(max); }
                setQ(n);
              }}
              style={{ width: 44, textAlign: "center", color: c.text, fontSize: 16, fontWeight: "700" }}
            />
            <IconButton icon="bi-plus-lg" size={36} bg={c.surface2} disabled={qty >= max} accessibilityLabel="Increase" onPress={() => setQ(qty + 1)} />
          </Row>
        </Row>

        <Row gap={8}>
          {[
            ["bi-shield-check", "Buyer protection"],
            [p.digital ? "bi-arrow-repeat" : "bi-arrow-counterclockwise", p.digital ? "Refund if code fails" : "7-day returns"],
            [p.digital ? "bi-wallet2" : "bi-cash", p.digital ? "Wallet checkout" : "Pay on delivery"],
          ].map(([ic, t]) => (
            <View key={t} style={{ flex: 1, backgroundColor: c.surface, borderRadius: radius.lg, padding: 10, alignItems: "center", gap: 6 }}>
              <Icon name={ic} size={18} color={c.primary} />
              <Text size={11} weight="semibold" center>{t}</Text>
            </View>
          ))}
        </Row>

        {/* Delivery */}
        <Card>
          <Text variant="title" style={{ marginBottom: 10 }}>Delivery</Text>
          {p.digital ? (
            <Row gap={12}>
              <IconTile icon="bi-lightning-charge" tone="warning" size={40} />
              <View style={{ flex: 1 }}>
                <Text weight="semibold">Instant digital delivery</Text>
                <Text variant="xs" muted>Code shown in My Orders & sent to {user.email}</Text>
              </View>
              <Text weight="bold" color={c.success}>Free</Text>
            </Row>
          ) : (
            <>
              <Select label="Deliver to" value={state} onChange={setState} options={STATES.map((s) => ({ value: s, label: s }))} searchable title="Choose state" containerStyle={{ marginBottom: 6 }} />
              {(
                [["standard", "Door delivery", "bi-truck", "primary"], ["express", "Express delivery", "bi-lightning", "violet"], ["pickup", "Pickup station", "bi-shop-window", "success"]] as const
              ).map(([m, label, ic, tone]) => {
                const fee = productDeliveryFee(p, m, state);
                return (
                  <Row key={m} gap={12} style={{ paddingVertical: 8 }}>
                    <IconTile icon={ic} tone={tone} size={38} />
                    <View style={{ flex: 1 }}>
                      <Text variant="sm" weight="semibold">{label}</Text>
                      <Text variant="xs" muted>Arrives {eta(state, m)}</Text>
                    </View>
                    <Text variant="sm" weight="bold" color={fee ? c.text : c.success}>{fee ? naira(fee) : "Free"}</Text>
                  </Row>
                );
              })}
            </>
          )}
        </Card>

        {/* Tabs */}
        <View onLayout={(e) => (tabsY.current = e.nativeEvent.layout.y)}>
          <Segment value={tab} onChange={setTab} options={[{ value: "desc", label: "Description" }, { value: "specs", label: "Specs" }, { value: "reviews", label: `Reviews (${p.reviews > 999 ? Math.round(p.reviews / 100) / 10 + "k" : p.reviews})` }]} />
        </View>
        {tab === "desc" ? (
          <Card>
            <Text variant="sm" style={{ lineHeight: 21 }}>
              {shortDesc(p)} The <Text variant="sm" weight="bold">{p.name}</Text> from {p.brand} is one of the most-loved picks in {catName(p.category)}, with over {p.reviews.toLocaleString()} verified ratings from AutoBiz shoppers across Nigeria.
            </Text>
            <Text variant="title" style={{ marginTop: 14, marginBottom: 8 }}>Key features</Text>
            {(FEATURES[p.category] || []).map((f) => (
              <Row key={f} gap={8} align="flex-start" style={{ marginBottom: 6 }}>
                <Icon name="bi-check-circle-fill" size={16} color={c.success} style={{ marginTop: 2 }} />
                <Text variant="sm" style={{ flex: 1 }}>{f}</Text>
              </Row>
            ))}
            <Notice style={{ marginTop: 10 }}>
              {p.digital ? (
                <Text variant="sm" color={c.primary}>Your code appears in <Text variant="sm" weight="bold" color={c.primary}>My Orders</Text> right after payment. Digital goods can only be paid with your wallet.</Text>
              ) : (
                <Text variant="sm" color={c.primary}>Sold by <Text variant="sm" weight="bold" color={c.primary}>{p.seller}</Text> and fulfilled by AutoBiz Logistics. Inspect your item at delivery when paying on delivery.</Text>
              )}
            </Notice>
          </Card>
        ) : tab === "specs" ? (
          <Summary rows={specs} style={{ backgroundColor: c.surface }} />
        ) : (
          <Card>
            <Row gap={16} align="center">
              <View style={{ alignItems: "center", width: 96 }}>
                <Text variant="display">{p.rating.toFixed(1)}</Text>
                <Stars rating={p.rating} />
                <Text variant="xs" muted style={{ marginTop: 4 }}>{p.reviews.toLocaleString()} ratings</Text>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                {breakdown.map((b) => (
                  <Pressable key={b.k} onPress={() => setStarFilter(starFilter === b.k ? null : b.k)} style={{ flexDirection: "row", alignItems: "center", gap: 6, opacity: starFilter && starFilter !== b.k ? 0.45 : 1 }}>
                    <Text variant="xs" weight="semibold" style={{ width: 10 }}>{b.k}</Text>
                    <Icon name="bi-star-fill" size={10} color="#f59f00" />
                    <ProgressBar value={b.count / maxCount} color="#f59f00" height={6} style={{ flex: 1 }} />
                    <Text variant="xs" muted style={{ width: 40, textAlign: "right" }}>{b.count}</Text>
                  </Pressable>
                ))}
              </View>
            </Row>
            <Row justify="space-between" style={{ marginTop: 14 }}>
              <Text variant="sm" weight="semibold">{starFilter ? `${starFilter}-star only` : "Most recent"}</Text>
              {starFilter ? <Pressable onPress={() => setStarFilter(null)}><Text variant="sm" weight="bold" color={c.primary}>Show all</Text></Pressable> : null}
            </Row>
            {shownReviews.length === 0 ? (
              <EmptyState icon="bi-star" tone="warning" title={`No ${starFilter}-star reviews in this sample`} message="Try another rating filter." />
            ) : shownReviews.map((r) => (
              <View key={r.id} style={{ borderTopWidth: 1, borderTopColor: c.border, paddingVertical: 12, marginTop: 10 }}>
                <Row justify="space-between"><Stars rating={r.stars} size={12} /><Text variant="xs" muted>{date(r.date)}</Text></Row>
                <Text weight="bold" style={{ marginTop: 6 }}>{r.title}</Text>
                <Text variant="sm" muted style={{ marginTop: 2 }}>{r.body}</Text>
                <Text variant="xs" muted style={{ marginTop: 6 }}>{r.name} · {r.city}{r.variant ? ` · ${r.variant}` : ""} · <Text variant="xs" color={c.success}>✔ Verified purchase</Text></Text>
                <Pressable onPress={() => setHelpful((h) => ({ ...h, [r.id]: !h[r.id] }))} style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, borderWidth: 1, borderColor: helpful[r.id] ? c.primary : c.border }}>
                  <Icon name="ion:thumbs-up-outline" size={13} color={helpful[r.id] ? c.primary : c.muted} />
                  <Text variant="xs" weight="semibold" color={helpful[r.id] ? c.primary : c.muted}>Helpful ({r.helpful + (helpful[r.id] ? 1 : 0)})</Text>
                </Pressable>
              </View>
            ))}
          </Card>
        )}

        {/* Seller */}
        {stats ? (
          <Card>
            <Row gap={12}>
              <Avatar text={p.seller.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()} size={48} />
              <View style={{ flex: 1 }}>
                <Row gap={4}><Text weight="bold">{p.seller}</Text><Icon name="bi-patch-check-fill" size={15} color={c.primary} /></Row>
                <Text variant="xs" muted>{stats.years} yr{stats.years > 1 ? "s" : ""} on AutoBiz · {stats.followers}k followers</Text>
              </View>
              <Button title={following ? "Following" : "Follow"} size="sm" variant={following ? "soft" : "primary"} icon={following ? "bi-check-lg" : "bi-plus-lg"} onPress={toggleFollow} />
            </Row>
            <Summary style={{ marginTop: 12 }} rows={[["Seller rating", `${stats.rating} ★`], ["Order fulfilment", `${stats.score}%`], ["Products listed", String(stats.items)]]} />
            <Button title="Visit store" variant="outline" icon="bi-shop" style={{ marginTop: 12 }} onPress={() => router.push({ pathname: "/(tabs)/shop", params: { seller: p.seller } })} />
          </Card>
        ) : null}
      </View>

      {/* Related */}
      <Row justify="space-between" style={{ paddingHorizontal: 16, marginTop: 22, marginBottom: 10 }}>
        <Text variant="h3">You may also like</Text>
        <Pressable onPress={() => router.push({ pathname: "/(tabs)/shop", params: { cat: p.category } })}><Text variant="sm" weight="bold" color={c.primary}>See more</Text></Pressable>
      </Row>
      <ChipRow contentStyle={{ gap: 12 }}>
        {related.map((x) => <ProductCard key={x.id} p={x} style={{ width: 168 }} />)}
      </ChipRow>
    </Screen>
  );
}
