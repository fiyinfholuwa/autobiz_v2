import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { requireLogin } from "@/components/overlay";
import { Badge, Button, Card, Chip, ChipRow, EmptyState, Header, Icon, IconTile, Row, Screen, Segment, Select, Skeleton, Stat, Text, TextField } from "@/components/ui";
import { esimCountries, esimRegions, type EsimCountry } from "@/data/catalog";
import { CountryArt, CountryTile, DeviceCheck, EsimCard } from "@/features/esim/components";
import { computeStatus, globalMin, minFrom, regionName, searchCountries } from "@/features/esim/logic";
import { naira } from "@/lib/format";
import { useApp } from "@/store";
import { radius, useTheme } from "@/theme";

type Tab = "buy" | "mine" | "how";
const FILTERS = ["All", "Active", "Not installed", "Expired", "Archived"] as const;

export default function EsimScreen() {
  const params = useLocalSearchParams<{ tab?: string; country?: string }>();
  const [tab, setTab] = useState<Tab>((["buy", "mine", "how"].includes(params.tab || "") ? params.tab : "buy") as Tab);
  const esims = useApp((s) => s.esims);
  const count = esims.filter((e) => !e.archived).length;
  const scroll = useRef<any>(null);

  useEffect(() => { if (params.tab && ["buy", "mine", "how"].includes(params.tab)) setTab(params.tab as Tab); }, [params.tab]);
  useEffect(() => {
    if (params.country && esimCountries.some((c) => c.code === params.country)) router.push({ pathname: "/esim/[code]", params: { code: params.country } });
  }, [params.country]);

  const goto = (t: Tab) => { setTab(t); scroll.current?.scrollTo({ y: 0, animated: true }); };

  return (
    <Screen
      scrollRef={scroll}
      header={<Header title="Travel eSIM" subtitle="Instant mobile data in 120+ countries" />}
    >
      <Segment value={tab} onChange={goto} style={{ marginBottom: 16 }} options={[{ value: "buy", label: "Buy eSIM" }, { value: "mine", label: "My eSIMs", badge: count || undefined }, { value: "how", label: "How it works" }]} />
      {tab === "buy" ? <BuyTab /> : tab === "mine" ? <MineTab goto={goto} /> : <HowTab goto={goto} />}
    </Screen>
  );
}

/* ---------------- Buy ---------------- */
function BuyTab() {
  const { c } = useTheme();
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("all");
  const [sort, setSort] = useState<"popular" | "price" | "name">("popular");
  const [loading, setLoading] = useState(false);
  const results = useMemo(() => searchCountries(q), [q]);
  const open = (c: EsimCountry) => router.push({ pathname: "/esim/[code]", params: { code: c.code } });

  const list = useMemo(() => {
    let l = esimCountries.filter((x) => region === "all" || x.region === region);
    if (sort === "price") l = [...l].sort((a, b) => minFrom(a) - minFrom(b));
    if (sort === "name") l = [...l].sort((a, b) => a.name.localeCompare(b.name));
    return l;
  }, [region, sort]);

  const pickRegion = (r: string) => { setRegion(r); setLoading(true); setTimeout(() => setLoading(false), 600); };

  return (
    <View>
      <LinearGradient colors={[c.primary700, "#0f3f3a"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.xl, padding: 20, overflow: "hidden" }}>
        <View style={{ position: "absolute", right: -30, top: -20, opacity: 0.12 }}><Icon name="bi-globe2" size={170} color="#fff" /></View>
        <Badge label="Instant delivery · Pay in Naira" icon="bi-lightning-charge-fill" tone="success" solid />
        <Text variant="h2" color="#fff" style={{ marginTop: 12 }}>Where are you travelling to?</Text>
        <Text variant="sm" color="rgba(255,255,255,0.8)" style={{ marginTop: 4 }}>Search a country or region and get a data plan that works the moment you land.</Text>
        <TextField
          icon="bi-search"
          placeholder="Search a country, e.g. Ghana"
          value={q}
          onChangeText={setQ}
          autoCorrect={false}
          containerStyle={{ marginTop: 16 }}
          suffix={q ? <Pressable onPress={() => setQ("")} hitSlop={8} accessibilityLabel="Clear search"><Icon name="bi-x-circle-fill" size={18} color={c.muted} /></Pressable> : null}
        />
        {q ? (
          <View style={{ backgroundColor: c.surface, borderRadius: radius.lg, marginTop: 8, paddingHorizontal: 12 }}>
            {results.length ? results.map((r) => (
              <Pressable key={r.code} onPress={() => open(r)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, opacity: pressed ? 0.6 : 1 })}>
                <CountryArt c={r} size={30} />
                <View style={{ flex: 1 }}>
                  <Text weight="semibold">{r.name}</Text>
                  <Text variant="xs" muted>{regionName(r.region)} · {r.speed}</Text>
                </View>
                <Text variant="sm" weight="bold" color={c.primary}>from ${minFrom(r).toFixed(2)}</Text>
              </Pressable>
            )) : <Text variant="sm" muted style={{ paddingVertical: 14 }}>No destination matches “{q}”. Try the Global pack.</Text>}
          </View>
        ) : null}
        <Row gap={14} wrap style={{ marginTop: 14 }}>
          {["Keep your Nigerian WhatsApp number", "Hotspot allowed", `From $${globalMin().toFixed(2)}`].map((t) => (
            <Row key={t} gap={5}><Icon name="bi-check-circle-fill" size={14} color="#a9f5dc" /><Text variant="xs" color="#fff">{t}</Text></Row>
          ))}
        </Row>
      </LinearGradient>

      <Row justify="space-between" style={{ marginTop: 22, marginBottom: 10 }}>
        <View style={{ flex: 1 }}>
          <Text variant="h3">Popular destinations</Text>
          <Text variant="xs" muted>Prices include VAT · ₦ at {naira(1580)}/$</Text>
        </View>
        <View style={{ width: 150 }}>
          <Select value={sort} onChange={setSort} title="Sort destinations" options={[{ value: "popular", label: "Most popular" }, { value: "price", label: "Lowest price" }, { value: "name", label: "A – Z" }]} />
        </View>
      </Row>
      <ChipRow style={{ marginHorizontal: -16, marginBottom: 12 }}>
        {esimRegions.map((r) => <Chip key={r.id} label={r.name} icon={r.id === "global" ? "bi-globe2" : undefined} active={region === r.id} onPress={() => pickRegion(r.id)} />)}
      </ChipRow>
      {loading ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} w={"47%" as any} h={150} r={20} />)}
        </View>
      ) : list.length ? (
        <View style={{ gap: 12 }}>
          {Array.from({ length: Math.ceil(list.length / 2) }).map((_, i) => (
            <Row key={i} gap={12} align="stretch">
              <CountryTile c={list[i * 2]} onPress={() => open(list[i * 2])} />
              {list[i * 2 + 1] ? <CountryTile c={list[i * 2 + 1]} onPress={() => open(list[i * 2 + 1])} /> : <View style={{ flex: 1 }} />}
            </Row>
          ))}
        </View>
      ) : (
        <EmptyState icon="bi-globe2" title="No destinations in this region yet" />
      )}
    </View>
  );
}

/* ---------------- Mine ---------------- */
function MineTab({ goto }: { goto: (t: Tab) => void }) {
  const authed = useApp((s) => s.auth.authed);
  const esims = useApp((s) => s.esims);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 30000); return () => clearInterval(t); }, []);

  if (!authed)
    return (
      <Card>
        <EmptyState icon="bi-person-lock" title="Sign in to see your eSIMs" message="Your purchased eSIMs, QR codes and data usage live in your account." action="Log in" onAction={() => requireLogin({ title: "Log in to view your eSIMs", next: "/esim?tab=mine" })} />
      </Card>
    );

  const live = esims.filter((e) => !e.archived);
  const stats = {
    active: live.filter((e) => computeStatus(e) === "Active").length,
    ready: live.filter((e) => computeStatus(e) === "Not installed").length,
    countries: new Set(esims.map((e) => e.code)).size,
    spent: esims.reduce((a, e) => a + e.price + e.topups.reduce((x, t) => x + t.price, 0), 0),
  };
  const shown = filter === "All" ? live : filter === "Archived" ? esims.filter((e) => e.archived) : live.filter((e) => computeStatus(e) === filter);

  return (
    <View>
      <Row gap={10}>
        <Stat label="Active" value={String(stats.active)} icon="bi-sim" tone="success" />
        <Stat label="Ready to install" value={String(stats.ready)} icon="bi-qr-code" tone="violet" />
      </Row>
      <Row gap={10} style={{ marginTop: 10 }}>
        <Stat label="Countries" value={String(stats.countries)} icon="bi-globe2" tone="cyan" />
        <Stat label="Total spent" value={naira(stats.spent)} icon="bi-wallet2" />
      </Row>
      <Row justify="space-between" style={{ marginTop: 20, marginBottom: 10 }}>
        <Text variant="h3">My eSIMs</Text>
        <Button title="Buy new eSIM" icon="bi-plus-lg" size="sm" variant="soft" onPress={() => goto("buy")} />
      </Row>
      <ChipRow style={{ marginHorizontal: -16, marginBottom: 14 }}>
        {FILTERS.map((f) => <Chip key={f} label={f} active={filter === f} onPress={() => setFilter(f)} />)}
      </ChipRow>
      {!esims.length ? (
        <Card><EmptyState icon="bi-sim" tone="violet" title="No eSIMs yet" message="Buy a travel eSIM and stay connected the moment you land." action="Find a destination" onAction={() => goto("buy")} /></Card>
      ) : !shown.length ? (
        <Card><EmptyState icon="bi-funnel" title="No eSIMs here" message="Nothing matches this filter." action="Show all" onAction={() => setFilter("All")} /></Card>
      ) : (
        <View style={{ gap: 14 }}>{shown.map((e) => <EsimCard key={e.id} e={e} />)}</View>
      )}
    </View>
  );
}

/* ---------------- How it works ---------------- */
const STEPS = [
  ["Pick a destination", "Search a country or choose a regional pack for multi-country trips.", "violet", "bi-geo-alt"],
  ["Pay in Naira", "Choose a plan and pay from your AutoBiz wallet. No dollar card needed.", "primary", "bi-wallet2"],
  ["Scan the QR code", "Install on Wi‑Fi before you fly. It takes under 2 minutes.", "cyan", "bi-qr-code"],
  ["Land & connect", "Turn on roaming for the eSIM when you arrive. Validity starts on first connection.", "success", "bi-airplane"],
] as const;
const FAQ: [string, string][] = [
  ["Which phones support eSIM?", "Most phones from 2019 onwards: iPhone XS/XR and newer, Samsung Galaxy S20 and newer, Z Fold/Flip, Google Pixel 4 and newer, and many Xiaomi, Oppo and Huawei flagships. Most Tecno, Infinix and itel models do **not** support eSIM yet. Your phone must also be **carrier-unlocked**."],
  ["Can I keep my Nigerian SIM active?", "Yes. eSIM works alongside your physical SIM (dual SIM). Keep your Nigerian line for calls, SMS and bank OTPs, and use the eSIM for data."],
  ["When does my plan start?", "Validity starts when the eSIM first connects to a supported network in your destination — not when you buy or install it. Install within 180 days of purchase."],
  ["Can I make calls or send SMS?", "These are data-only eSIMs. Use WhatsApp, FaceTime, Telegram or Zoom for calls and messages."],
  ["What if I run out of data?", "Open **My eSIMs** and tap **Top up**. New data is added instantly to the same eSIM — no new QR code needed."],
  ["Can I reuse or transfer the QR code?", "Each QR code can be installed only once. If you delete the eSIM from your phone, contact support for a replacement before your trip."],
  ["Refunds", "Unused eSIMs that haven't been installed can be refunded to your wallet within 7 days of purchase."],
];

function HowTab({ goto }: { goto: (t: Tab) => void }) {
  const { c } = useTheme();
  const [openIdx, setOpenIdx] = useState(0);
  const [device, setDevice] = useState("");
  return (
    <View style={{ gap: 12 }}>
      {STEPS.map(([t, d, tone, icon], i) => (
        <Card key={t}>
          <Row gap={14} align="flex-start">
            <IconTile icon={icon} tone={tone} size={46} />
            <View style={{ flex: 1 }}>
              <Text variant="xs" weight="bold" muted>0{i + 1}</Text>
              <Text weight="bold">{t}</Text>
              <Text variant="sm" muted style={{ marginTop: 2 }}>{d}</Text>
            </View>
          </Row>
        </Card>
      ))}
      <Text variant="h3" style={{ marginTop: 10 }}>Frequently asked questions</Text>
      <Card padded={false}>
        {FAQ.map(([q, a], i) => (
          <Pressable key={q} onPress={() => setOpenIdx(openIdx === i ? -1 : i)} style={{ padding: 16, borderTopWidth: i ? 1 : 0, borderTopColor: c.border }}>
            <Row justify="space-between" gap={10}>
              <Text weight="semibold" style={{ flex: 1 }}>{q}</Text>
              <Icon name={openIdx === i ? "bi-chevron-up" : "bi-chevron-down"} size={16} color={c.muted} />
            </Row>
            {openIdx === i ? <FaqText text={a} /> : null}
          </Pressable>
        ))}
      </Card>
      <Card>
        <Text variant="h3">Is my phone compatible?</Text>
        <Text variant="xs" muted style={{ marginBottom: 12 }}>Pick your model to check eSIM support</Text>
        <DeviceCheck value={device} onChange={setDevice} />
        <Text variant="xs" muted style={{ marginTop: 10 }}>Quick test: dial *#06#. If you see an EID number, your phone supports eSIM.</Text>
      </Card>
      <LinearGradient colors={[c.violet, c.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.xl, padding: 20 }}>
        <Text variant="h3" color="#fff">Ready to travel?</Text>
        <Text variant="sm" color="rgba(255,255,255,0.85)" style={{ marginTop: 4, marginBottom: 14 }}>Buy now, install at home on Wi‑Fi, and your plan only starts when you connect abroad.</Text>
        <Button title="Find a plan" variant="dark" iconRight="bi-arrow-right" onPress={() => goto("buy")} style={{ alignSelf: "flex-start" }} />
      </LinearGradient>
    </View>
  );
}

function FaqText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <Text variant="sm" muted style={{ marginTop: 8 }}>
      {parts.map((p, i) => (p.startsWith("**") ? <Text key={i} variant="sm" weight="bold">{p.slice(2, -2)}</Text> : p))}
    </Text>
  );
}
