import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Button, Checkbox, Chip, ChipRow, EmptyState, FieldError, Icon, IconButton, Row, Screen, Sheet, Skeleton, Stars, SwitchRow, Text, TextField,
} from "@/components/ui";
import { categories, products, type Product } from "@/data/catalog";
import { naira } from "@/lib/format";
import { app, useApp } from "@/store";
import { radius, TAB_BAR_SPACE, useTheme } from "@/theme";
import { catName, disc } from "@/features/shop/logic";
import { ProductCard } from "@/features/shop/ProductCard";

const PAGE = 12;
type Sort = "popular" | "low" | "high" | "rating" | "discount";
const SORTS: { value: Sort; label: string }[] = [
  { value: "popular", label: "Most popular" }, { value: "low", label: "Price: low to high" }, { value: "high", label: "Price: high to low" },
  { value: "rating", label: "Top rated" }, { value: "discount", label: "Biggest discount" },
];
const PRESETS: { label: string; min: number; max: number | null }[] = [
  { label: "Under ₦50k", min: 0, max: 50000 }, { label: "₦50k–₦200k", min: 50000, max: 200000 },
  { label: "₦200k–₦1m", min: 200000, max: 1000000 }, { label: "₦1m+", min: 1000000, max: null },
];
const RATINGS = [{ v: 0, label: "Any rating" }, { v: 4.5, label: "4.5 & above" }, { v: 4, label: "4.0 & above" }, { v: 3, label: "3.0 & above" }];

type F = { q: string; cat: string; seller: string; min: number | null; max: number | null; brands: string[]; rating: number; free: boolean; stock: boolean; sale: boolean };
const EMPTY: F = { q: "", cat: "all", seller: "", min: null, max: null, brands: [], rating: 0, free: false, stock: false, sale: false };

function match(p: Product, f: F, skipBrand = false) {
  if (f.cat !== "all" && p.category !== f.cat) return false;
  if (f.seller && p.seller !== f.seller) return false;
  if (f.q) {
    const hay = `${p.name} ${p.brand} ${p.seller} ${catName(p.category)}`.toLowerCase();
    if (!f.q.toLowerCase().split(/\s+/).filter(Boolean).every((t) => hay.includes(t))) return false;
  }
  if (f.min != null && p.price < f.min) return false;
  if (f.max != null && p.price > f.max) return false;
  if (!skipBrand && f.brands.length && !f.brands.includes(p.brand)) return false;
  if (f.rating && p.rating < f.rating) return false;
  if (f.free && !(p.freeShipping || p.digital)) return false;
  if (f.stock && p.stock < 10) return false;
  if (f.sale && disc(p) < 15) return false;
  return true;
}
function sortList(list: Product[], s: Sort) {
  const l = [...list];
  if (s === "popular") l.sort((a, b) => b.reviews * b.rating - a.reviews * a.rating);
  if (s === "low") l.sort((a, b) => a.price - b.price);
  if (s === "high") l.sort((a, b) => b.price - a.price);
  if (s === "rating") l.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
  if (s === "discount") l.sort((a, b) => disc(b) - disc(a));
  return l;
}

function useCountdown() {
  const next = () => { const d = new Date(); const h = (Math.floor(d.getHours() / 6) + 1) * 6; const t = new Date(d); t.setHours(h, 0, 0, 0); return t.getTime(); };
  const [left, setLeft] = useState(next() - Date.now());
  useEffect(() => { const i = setInterval(() => setLeft(next() - Date.now()), 1000); return () => clearInterval(i); }, []);
  const s = Math.max(0, Math.floor(left / 1000));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

const SLIDES = [
  { colors: ["#3a3f5c", "#15172b", "#0b0c18"], iconColor: "#ffd43b", icon: "bi-phone", eyebrow: "Black Friday week", title: "Up to 30% off phones & gadgets", body: "Samsung, Apple, Xiaomi & more — free delivery nationwide.", cta: "Shop phones", action: { cat: "phones" } },
  { colors: ["#e64980", "#9c36b5"], iconColor: "#fff", icon: "bi-play-btn", eyebrow: "Delivered instantly", title: "Netflix, Steam & Microsoft 365 codes", body: "Pay from your wallet, get your code in seconds.", cta: "Browse digital", action: { cat: "digital" } },
  { colors: ["#f59f00", "#e8590c"], iconColor: "#fff", icon: "bi-sun", eyebrow: "Beat the grid", title: "Solar inverter kits from ₦1.15m", body: "Power your home 24/7. Installation available in Lagos & Abuja.", cta: "View deal", action: { product: "p22" } },
] as const;

export default function Shop() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ q?: string; cat?: string; seller?: string; free?: string }>();
  const view = useApp((s) => s.settings.marketView);
  const wishCount = useApp((s) => s.wishlist.length);
  const cartCount = useApp((s) => s.cart.reduce((a, l) => a + l.qty, 0));
  const authed = useApp((s) => s.auth.authed);
  const [f, setF] = useState<F>(EMPTY);
  const [sort, setSort] = useState<Sort>("popular");
  const [shown, setShown] = useState(PAGE);
  const [loading, setLoading] = useState(false);
  const [moreBusy, setMoreBusy] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [slide, setSlide] = useState(0);
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const carRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const catalogY = useRef(0);
  const countdown = useCountdown();
  const W = Dimensions.get("window").width - 32;

  // URL params → filters
  useEffect(() => {
    const cat = params.cat && categories.some((x) => x.id === params.cat) ? params.cat : undefined;
    if (params.q !== undefined || cat || params.seller !== undefined || params.free) {
      setF((p) => ({ ...p, q: params.q ?? p.q, cat: cat ?? p.cat, seller: params.seller ?? p.seller, free: params.free === "1" ? true : p.free, brands: cat ? [] : p.brands }));
      setTimeout(scrollToCatalog, 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.q, params.cat, params.seller, params.free]);

  // skeleton on filter change
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setShown(PAGE); setLoading(true);
    const t = setTimeout(() => setLoading(false), 380);
    return () => clearTimeout(t);
  }, [f, sort]);

  // carousel auto-advance
  useEffect(() => {
    const i = setInterval(() => setSlide((s) => { const n = (s + 1) % SLIDES.length; carRef.current?.scrollTo({ x: n * W, animated: true }); return n; }), 5500);
    return () => clearInterval(i);
  }, [W]);

  const priceErr = f.min != null && f.max != null && f.min > f.max ? "Min price can't be greater than max." : null;
  const eff = priceErr ? { ...f, min: null, max: null } : f;
  const results = useMemo(() => sortList(products.filter((p) => match(p, eff)), sort), [eff, sort]);
  const flash = useMemo(() => [...products].sort((a, b) => disc(b) - disc(a)).slice(0, 8), []);
  const brandPool = useMemo(() => [...new Set(products.filter((p) => f.cat === "all" || p.category === f.cat).map((p) => p.brand))].sort(), [f.cat]);
  const brandCount = (b: string) => products.filter((p) => p.brand === b && match(p, eff, true)).length;

  const activeCount = (f.seller ? 1 : 0) + (f.min != null || f.max != null ? 1 : 0) + f.brands.length + (f.rating ? 1 : 0) + (f.free ? 1 : 0) + (f.stock ? 1 : 0) + (f.sale ? 1 : 0) + (f.cat !== "all" ? 1 : 0);
  const pills: { label: string; clear: () => void }[] = [];
  if (f.q) pills.push({ label: `“${f.q}”`, clear: () => setF({ ...f, q: "" }) });
  if (f.seller) pills.push({ label: `Seller: ${f.seller}`, clear: () => setF({ ...f, seller: "" }) });
  if (f.min != null || f.max != null) pills.push({ label: `${f.min != null ? naira(f.min) : "₦0"} – ${f.max != null ? naira(f.max) : "any"}`, clear: () => setF({ ...f, min: null, max: null }) });
  f.brands.forEach((b) => pills.push({ label: b, clear: () => setF({ ...f, brands: f.brands.filter((x) => x !== b) }) }));
  if (f.rating) pills.push({ label: `${f.rating}★ & up`, clear: () => setF({ ...f, rating: 0 }) });
  if (f.free) pills.push({ label: "Free delivery", clear: () => setF({ ...f, free: false }) });
  if (f.stock) pills.push({ label: "In stock", clear: () => setF({ ...f, stock: false }) });
  if (f.sale) pills.push({ label: "15%+ off", clear: () => setF({ ...f, sale: false }) });

  function scrollToCatalog() { scrollRef.current?.scrollTo({ y: Math.max(0, catalogY.current - 10), animated: true }); }
  const setCat = (cat: string) => { setF((p) => ({ ...p, cat, brands: [] })); setTimeout(scrollToCatalog, 50); };
  const resetAll = () => { setF(EMPTY); setSort("popular"); router.setParams({ q: undefined, cat: undefined, seller: undefined, free: undefined } as any); };
  const setView = (v: "grid" | "list") => app().update("settings", (s) => ({ ...s, marketView: v }));
  const page = results.slice(0, shown);

  return (
    <Screen
      bottomInset={TAB_BAR_SPACE}
      scrollRef={scrollRef}
      padded={false}
      header={
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 10, backgroundColor: c.bg }}>
          <Row justify="space-between">
            <View>
              <Text variant="h1">Marketplace</Text>
              <Text variant="xs" muted>Genuine products from verified sellers</Text>
            </View>
            <Row gap={8}>
              <IconButton icon="bi-heart" badge={wishCount || undefined} accessibilityLabel="Wishlist" onPress={() => router.push({ pathname: "/orders", params: { tab: "wishlist" } })} />
              {authed ? <IconButton icon="bi-box-seam" accessibilityLabel="My orders" onPress={() => router.push("/orders")} /> : null}
              <IconButton icon="ion:cart-outline" badge={cartCount || undefined} accessibilityLabel="Cart" onPress={() => router.push("/cart")} />
            </Row>
          </Row>
          <TextField
            icon="bi-search"
            placeholder="Search products, brands, sellers…"
            value={f.q}
            onChangeText={(q) => setF((p) => ({ ...p, q }))}
            returnKeyType="search"
            onSubmitEditing={scrollToCatalog}
            containerStyle={{ marginTop: 12 }}
            suffix={f.q ? <Pressable onPress={() => setF((p) => ({ ...p, q: "" }))} hitSlop={8}><Icon name="bi-x-circle-fill" size={18} color={c.muted} /></Pressable> : null}
          />
        </View>
      }
    >
      {/* Promo carousel */}
      <View style={{ paddingHorizontal: 16, marginTop: 6 }}>
        <ScrollView
          ref={carRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setSlide(Math.round(e.nativeEvent.contentOffset.x / W))}
          style={{ borderRadius: radius.xl }}
        >
          {SLIDES.map((s, i) => (
            <LinearGradient key={i} colors={s.colors as unknown as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: W, height: 168, borderRadius: radius.xl, padding: 18, overflow: "hidden" }}>
              <Icon name={s.icon} size={130} color={s.iconColor} style={{ position: "absolute", right: -18, bottom: -18, opacity: 0.22 }} />
              <Text variant="label" color="rgba(255,255,255,0.8)">{s.eyebrow}</Text>
              <Text variant="h2" color="#fff" style={{ marginTop: 6, maxWidth: "80%" }}>{s.title}</Text>
              <Text variant="xs" color="rgba(255,255,255,0.85)" style={{ marginTop: 4, maxWidth: "78%" }} numberOfLines={2}>{s.body}</Text>
              <Pressable
                onPress={() => ("cat" in s.action ? setCat(s.action.cat) : router.push(`/product/${s.action.product}`))}
                style={{ marginTop: "auto", alignSelf: "flex-start", backgroundColor: "#fff", paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, flexDirection: "row", gap: 6, alignItems: "center" }}
              >
                <Text variant="sm" weight="bold" color="#111">{s.cta}</Text>
                <Icon name="bi-arrow-right" size={14} color="#111" />
              </Pressable>
            </LinearGradient>
          ))}
        </ScrollView>
        <Row gap={5} justify="center" style={{ marginTop: 8 }}>
          {SLIDES.map((_, i) => <View key={i} style={{ width: i === slide ? 22 : 6, height: 5, borderRadius: 3, backgroundColor: i === slide ? c.primary : c.border }} />)}
        </Row>
      </View>

      {/* Quick tiles */}
      <Row gap={8} style={{ paddingHorizontal: 16, marginTop: 14 }}>
        {[
          { icon: "bi-lightning-charge", tone: "warning", title: "Instant digital", sub: "Codes in seconds", on: () => setCat("digital") },
          { icon: "bi-truck", tone: "success", title: "Free delivery", sub: "No delivery fee", on: () => { setF((p) => ({ ...p, free: true })); setTimeout(scrollToCatalog, 50); } },
          { icon: "bi-fire", tone: "danger", title: "Flash sales", sub: "Every 6 hours", on: () => scrollRef.current?.scrollTo({ y: 560, animated: true }) },
        ].map((t) => (
          <Pressable key={t.title} onPress={t.on} style={({ pressed }) => ({ flex: 1, backgroundColor: c.surface, borderRadius: radius.lg, padding: 10, opacity: pressed ? 0.8 : 1 })}>
            <Icon name={t.icon} size={18} color={t.tone === "warning" ? c.warning : t.tone === "success" ? c.success : c.danger} />
            <Text variant="xs" weight="bold" style={{ marginTop: 6 }} numberOfLines={1}>{t.title}</Text>
            <Text size={10} muted numberOfLines={1}>{t.sub}</Text>
          </Pressable>
        ))}
      </Row>

      {/* Categories */}
      <Text variant="h3" style={{ paddingHorizontal: 16, marginTop: 20, marginBottom: 10 }}>Shop by category</Text>
      <ChipRow contentStyle={{ gap: 12 }}>
        {categories.map((cat) => {
          const on = f.cat === cat.id;
          return (
            <Pressable key={cat.id} onPress={() => setCat(on ? "all" : cat.id)} style={{ alignItems: "center", width: 72 }}>
              <View style={{ width: 60, height: 60, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: on ? c.primary : c.surface, borderWidth: on ? 0 : 1, borderColor: c.border }}>
                <Icon name={cat.icon} size={24} color={on ? "#fff" : c.primary} />
              </View>
              <Text size={11} weight="semibold" center numberOfLines={2} style={{ marginTop: 6 }}>{cat.name}</Text>
            </Pressable>
          );
        })}
      </ChipRow>

      {/* Flash deals */}
      <Row justify="space-between" style={{ paddingHorizontal: 16, marginTop: 22, marginBottom: 10 }}>
        <View>
          <Row gap={6}><Icon name="bi-lightning-fill" size={18} color={c.danger} /><Text variant="h3">Flash deals</Text></Row>
          <Text variant="xs" muted>Biggest discounts, limited stock</Text>
        </View>
        <View style={{ backgroundColor: c.dangerSoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 }}>
          <Text variant="xs" weight="bold" color={c.danger} tabular>Ends in {countdown}</Text>
        </View>
      </Row>
      <ChipRow contentStyle={{ gap: 12 }}>
        {flash.map((p) => <ProductCard key={p.id} p={p} flash style={{ width: 168 }} />)}
      </ChipRow>

      {/* Catalog */}
      <View onLayout={(e) => (catalogY.current = e.nativeEvent.layout.y)} style={{ marginTop: 24 }}>
        <ChipRow>
          <Chip label="All" active={f.cat === "all"} onPress={() => setF((p) => ({ ...p, cat: "all", brands: [] }))} />
          {categories.map((cat) => <Chip key={cat.id} label={cat.name} icon={cat.icon} active={f.cat === cat.id} onPress={() => setF((p) => ({ ...p, cat: cat.id, brands: [] }))} />)}
        </ChipRow>
        <Row justify="space-between" style={{ paddingHorizontal: 16, marginTop: 14 }}>
          <Text variant="sm" muted style={{ flex: 1 }}>
            <Text variant="sm" weight="bold">{results.length}</Text> product{results.length === 1 ? "" : "s"}
            {f.cat !== "all" ? <> in <Text variant="sm" weight="bold">{catName(f.cat)}</Text></> : null}
          </Text>
          <Row gap={8}>
            <Pressable onPress={() => setFilterOpen(true)} style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }}>
              <Icon name="bi-sliders" size={16} color={c.text} />
              <Text variant="sm" weight="semibold">Filters</Text>
              {activeCount ? <View style={{ minWidth: 18, height: 18, borderRadius: 9, backgroundColor: c.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }}><Text size={10} weight="bold" color="#fff">{activeCount}</Text></View> : null}
            </Pressable>
            <IconButton icon={view === "grid" ? "bi-list" : "bi-grid"} size={36} accessibilityLabel="Toggle view" onPress={() => setView(view === "grid" ? "list" : "grid")} style={{ borderWidth: 1, borderColor: c.border }} />
          </Row>
        </Row>
        <ChipRow style={{ marginTop: 10 }}>
          {SORTS.map((s) => <Chip key={s.value} label={s.label} active={sort === s.value} onPress={() => setSort(s.value)} style={{ height: 32 }} />)}
        </ChipRow>
        {pills.length ? (
          <Row wrap gap={6} style={{ paddingHorizontal: 16, marginTop: 10 }}>
            {pills.map((p) => (
              <Pressable key={p.label} onPress={p.clear} style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: c.primarySoft }}>
                <Text variant="xs" weight="semibold" color={c.primary}>{p.label}</Text>
                <Icon name="bi-x" size={14} color={c.primary} />
              </Pressable>
            ))}
            {pills.length > 1 ? <Pressable onPress={resetAll} style={{ paddingHorizontal: 8, paddingVertical: 5 }}><Text variant="xs" weight="bold" color={c.danger}>Clear all</Text></Pressable> : null}
          </Row>
        ) : null}

        <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
          {loading ? (
            <View style={{ flexDirection: view === "grid" ? "row" : "column", flexWrap: "wrap", gap: 12 }}>
              {Array.from({ length: view === "grid" ? 4 : 3 }).map((_, i) => <Skeleton key={i} w={view === "grid" ? "47%" : "100%"} h={view === "grid" ? 250 : 120} r={20} />)}
            </View>
          ) : results.length === 0 ? (
            <EmptyState icon="bi-search" title="No products match your filters" message="Try a different search term, widen your price range or clear some filters." action="Clear all filters" onAction={resetAll} />
          ) : view === "grid" ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 }}>
              {page.map((p) => <ProductCard key={p.id} p={p} style={{ width: "48.5%" }} />)}
            </View>
          ) : (
            <View style={{ gap: 12 }}>{page.map((p) => <ProductCard key={p.id} p={p} list />)}</View>
          )}
          {!loading && results.length > 0 ? (
            <View style={{ alignItems: "center", marginTop: 16, gap: 8 }}>
              <Text variant="xs" muted>Showing {Math.min(shown, results.length)} of {results.length}</Text>
              {shown < results.length ? (
                <Button title="Load more" variant="outline" loading={moreBusy} onPress={() => { setMoreBusy(true); setTimeout(() => { setShown((s) => s + PAGE); setMoreBusy(false); }, 600); }} />
              ) : null}
            </View>
          ) : null}
        </View>
      </View>

      {/* Filters sheet */}
      <Sheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filters"
        scroll
        footer={
          <Row gap={10}>
            <Button title="Reset" variant="outline" style={{ flex: 1 }} onPress={resetAll} />
            <Button title={`Show ${results.length} result${results.length === 1 ? "" : "s"}`} style={{ flex: 2 }} onPress={() => { setFilterOpen(false); setTimeout(scrollToCatalog, 250); }} />
          </Row>
        }
      >
        <Text variant="label" muted style={{ marginBottom: 8 }}>Sort by</Text>
        <Row wrap gap={8}>{SORTS.map((s) => <Chip key={s.value} label={s.label} active={sort === s.value} onPress={() => setSort(s.value)} />)}</Row>

        <Text variant="label" muted style={{ marginTop: 18, marginBottom: 8 }}>Price (₦)</Text>
        <Row gap={10}>
          <TextField containerStyle={{ flex: 1 }} placeholder="Min" keyboardType="numeric" value={f.min != null ? String(f.min) : ""} onChangeText={(t) => { const v = t.replace(/\D/g, ""); setF((p) => ({ ...p, min: v ? Math.max(0, Number(v)) : null })); }} />
          <TextField containerStyle={{ flex: 1 }} placeholder="Max" keyboardType="numeric" value={f.max != null ? String(f.max) : ""} onChangeText={(t) => { const v = t.replace(/\D/g, ""); setF((p) => ({ ...p, max: v ? Math.max(0, Number(v)) : null })); }} />
        </Row>
        <FieldError error={priceErr} />
        <Row wrap gap={8} style={{ marginTop: 10 }}>
          {PRESETS.map((pr) => {
            const on = f.min === pr.min && f.max === pr.max;
            return <Chip key={pr.label} label={pr.label} active={on} onPress={() => setF((p) => (on ? { ...p, min: null, max: null } : { ...p, min: pr.min, max: pr.max }))} />;
          })}
        </Row>

        <Row justify="space-between" style={{ marginTop: 18, marginBottom: 6 }}>
          <Text variant="label" muted>Brand</Text>
          {f.brands.length ? <Pressable onPress={() => setF((p) => ({ ...p, brands: [] }))}><Text variant="xs" weight="bold" color={c.primary}>Clear</Text></Pressable> : null}
        </Row>
        {brandPool.length === 0 ? <Text variant="sm" muted>No brands</Text> : brandPool.map((b) => (
          <Checkbox key={b} checked={f.brands.includes(b)} onChange={(v) => setF((p) => ({ ...p, brands: v ? [...p.brands, b] : p.brands.filter((x) => x !== b) }))}>
            <Row justify="space-between"><Text variant="sm">{b}</Text><Text variant="xs" muted>{brandCount(b)}</Text></Row>
          </Checkbox>
        ))}

        <Text variant="label" muted style={{ marginTop: 18, marginBottom: 6 }}>Customer rating</Text>
        {RATINGS.map((r) => (
          <Pressable key={r.v} onPress={() => setF((p) => ({ ...p, rating: r.v }))} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 }}>
            <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: f.rating === r.v ? c.primary : c.border, alignItems: "center", justifyContent: "center" }}>
              {f.rating === r.v ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.primary }} /> : null}
            </View>
            {r.v ? <Stars rating={r.v} /> : null}
            <Text variant="sm">{r.label}</Text>
          </Pressable>
        ))}

        <View style={{ marginTop: 10 }}>
          <SwitchRow title="Free delivery" value={f.free} onChange={(v) => setF((p) => ({ ...p, free: v }))} />
          <SwitchRow title="In stock (10+ units)" value={f.stock} onChange={(v) => setF((p) => ({ ...p, stock: v }))} />
          <SwitchRow title="15% off or more" value={f.sale} onChange={(v) => setF((p) => ({ ...p, sale: v }))} />
        </View>
      </Sheet>
    </Screen>
  );
}
