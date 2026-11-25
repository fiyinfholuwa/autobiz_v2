import { router } from "expo-router";
import React, { useState } from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { Badge, Icon, ProductArt, ProgressBar, Row, Stars, Text } from "@/components/ui";
import type { Product } from "@/data/catalog";
import { naira } from "@/lib/format";
import { useApp } from "@/store";
import { radius, shadow, useTheme } from "@/theme";
import { addToCart, disc, flashClaimed, shortDesc, toggleWish } from "./logic";

const goCart = () => router.push("/cart");
const goWish = () => router.push({ pathname: "/orders", params: { tab: "wishlist" } });

export function ProductCard({ p, list, flash, style }: { p: Product; list?: boolean; flash?: boolean; style?: StyleProp<ViewStyle> }) {
  const { c, dark } = useTheme();
  const wished = useApp((s) => s.wishlist.includes(p.id));
  const [added, setAdded] = useState(false);
  const d = disc(p);
  const open = () => router.push(`/product/${p.id}`);
  const add = () => {
    if (addToCart(p.id, 1, undefined, { onView: goCart })) {
      setAdded(true);
      setTimeout(() => setAdded(false), 1200);
    }
  };
  const art = (
    <View>
      <ProductArt icon={p.icon} tone={p.tone} size={list ? 104 : "100%"} />
      {d > 0 ? <Badge label={`-${d}%`} tone="danger" solid style={{ position: "absolute", top: 8, left: 8 }} /> : null}
      {p.badge && !p.badge.startsWith("-") && !list ? <Badge label={p.badge} tone="primary" solid style={{ position: "absolute", bottom: 8, left: 8 }} /> : null}
      <Pressable
        accessibilityLabel={wished ? "Remove from wishlist" : "Save to wishlist"}
        onPress={() => toggleWish(p.id, goWish)}
        hitSlop={6}
        style={{ position: "absolute", top: 6, right: 6, width: 32, height: 32, borderRadius: 16, backgroundColor: c.surface, alignItems: "center", justifyContent: "center", ...shadow(1, dark) }}
      >
        <Icon name={wished ? "bi-heart-fill" : "bi-heart"} size={16} color={wished ? c.pink : c.text} />
      </Pressable>
    </View>
  );
  const tags = flash ? (
    <View style={{ marginTop: 6 }}>
      <ProgressBar value={flashClaimed(p.id) / 100} color={c.danger} height={5} />
      <Text variant="xs" muted style={{ marginTop: 3 }}>{flashClaimed(p.id)}% claimed</Text>
    </View>
  ) : (
    <Row gap={4} wrap style={{ marginTop: 6 }}>
      {p.digital ? <Badge label="Instant" tone="warning" icon="bi-lightning-fill" /> : p.freeShipping ? <Badge label="Free delivery" tone="success" icon="bi-truck" /> : null}
      {p.stock <= 10 && !p.digital ? <Badge label={`Only ${p.stock} left`} tone="danger" /> : null}
    </Row>
  );
  const info = (
    <View style={{ flex: list ? 1 : undefined, padding: list ? 0 : 10, paddingTop: list ? 0 : 10 }}>
      <Text variant="xs" muted numberOfLines={1}>{p.brand}{p.brand !== p.seller ? ` · ${p.seller}` : ""}</Text>
      <Text variant="sm" weight="semibold" numberOfLines={2} style={{ marginTop: 2, minHeight: list ? undefined : 36 }}>{p.name}</Text>
      <Row gap={4} style={{ marginTop: 4 }}>
        <Stars rating={p.rating} size={11} />
        <Text variant="xs" muted>{p.rating} ({p.reviews})</Text>
      </Row>
      {list ? <Text variant="xs" muted numberOfLines={2} style={{ marginTop: 4 }}>{shortDesc(p)}</Text> : null}
      <Row justify="space-between" align="flex-end" style={{ marginTop: 6 }}>
        <View style={{ flex: 1 }}>
          <Text weight="extrabold" tabular>{naira(p.price)}</Text>
          {p.oldPrice ? <Text variant="xs" muted strike tabular>{naira(p.oldPrice)}</Text> : null}
        </View>
        <Pressable accessibilityLabel="Add to cart" onPress={add} hitSlop={6} style={({ pressed }) => ({ width: 34, height: 34, borderRadius: 17, backgroundColor: added ? c.success : c.primary, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.8 : 1 })}>
          <Icon name={added ? "bi-check-lg" : "ion:cart-outline"} size={17} color="#fff" />
        </Pressable>
      </Row>
      {tags}
    </View>
  );
  return (
    <Pressable
      onPress={open}
      style={({ pressed }) => [
        { backgroundColor: c.surface, borderRadius: radius.xl, padding: list ? 10 : 6, borderWidth: dark ? 1 : 0, borderColor: c.border, flexDirection: list ? "row" : "column", gap: list ? 12 : 0, opacity: pressed ? 0.92 : 1, ...shadow(1, dark) },
        style,
      ]}
    >
      {art}
      {info}
    </Pressable>
  );
}
