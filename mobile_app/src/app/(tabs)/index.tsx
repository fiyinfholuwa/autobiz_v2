import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Dimensions, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Logo, LogoMark } from "@/components/Logo";
import { openFund, toast } from "@/components/overlay";
import { TxRow } from "@/components/TxRow";
import { Avatar, Button, Card, Chip, EmptyState, Icon, IconButton, IconTile, Row, Screen, SectionHeader, Segment, Select, Sheet, Text, TextField } from "@/components/ui";
import { usdRate } from "@/data/catalog";
import { BudgetGauge, CompareBars } from "@/features/home/charts";
import { chartSeries, expenses, maskNumber, monthLabel, spentThisMonth, upcomingBills } from "@/features/home/data";
import { MONTHS, MONTHS_LONG, initials, naira, usd } from "@/lib/format";
import { sleep } from "@/lib/random";
import { app, useApp, type VirtualCard } from "@/store";
import { TAB_BAR_SPACE, radius, shadow, useTheme } from "@/theme";

const QUICK = [
  { label: "Airtime", icon: "bi-phone", tone: "warning", href: "/(tabs)/pay?tab=airtime" },
  { label: "Data", icon: "bi-wifi", tone: "primary", href: "/(tabs)/pay?tab=data" },
  { label: "Electricity", icon: "bi-lightning-charge", tone: "orange", href: "/(tabs)/pay?tab=electricity" },
  { label: "Cable TV", icon: "bi-tv", tone: "cyan", href: "/(tabs)/pay?tab=cable" },
  { label: "eSIM", icon: "bi-sim", tone: "violet", href: "/esim" },
  { label: "Flights", icon: "bi-airplane", tone: "cyan", href: "/flights" },
  { label: "USD Card", icon: "bi-credit-card-2-front", tone: "success", href: "/(tabs)/cards" },
  { label: "Gift Cards", icon: "bi-gift", tone: "pink", href: "/giftcards" },
];
const go = (href: string) => router.push(href as any);

export default function HomeTab() {
  const authed = useApp((s) => s.auth.authed);
  return authed ? <Dashboard /> : <GuestHome />;
}

/* =========================== Authed dashboard =========================== */
function Dashboard() {
  const { c, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const user = useApp((s) => s.user);
  const wallet = useApp((s) => s.wallet);
  const cards = useApp((s) => s.cards);
  const txs = useApp((s) => s.transactions);
  const esims = useApp((s) => s.esims);
  const settings = useApp((s) => s.settings);
  const unread = useApp((s) => s.notifications.filter((n) => !n.read).length);
  const cartCount = useApp((s) => s.cart.reduce((a, l) => a + l.qty, 0));
  const hide = settings.hideBalance;
  const [refreshing, setRefreshing] = useState(false);
  const [recentDir, setRecentDir] = useState<"all" | "in" | "out">("all");
  const [mode, setMode] = useState<"week" | "month">("week");
  const [budgetOpen, setBudgetOpen] = useState(false);

  const total = wallet.balance + (wallet.usd + cards.reduce((a, x) => a + x.balance, 0)) * usdRate;
  const budget = settings.budget || 300000;
  const spent = spentThisMonth(txs);
  const bills = useMemo(() => upcomingBills(txs, esims), [txs, esims]);
  const series = useMemo(() => chartSeries(txs, mode), [txs, mode]);
  const exp = useMemo(() => expenses(txs), [txs]);
  const recent = txs.filter((t) => recentDir === "all" || t.direction === recentDir).slice(0, 5);
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const onRefresh = async () => { setRefreshing(true); await sleep(900); setRefreshing(false); };

  const header = (
    <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 10, backgroundColor: c.bg }}>
      <Row gap={12}>
        <Pressable onPress={() => router.push("/settings")} accessibilityLabel="Profile and settings">
          <Avatar text={initials(user.firstName, user.lastName)} size={44} bg={c.primary} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text variant="xs" muted>{greet} 👋</Text>
          <Text variant="h3" numberOfLines={1}>{user.firstName} {user.lastName}</Text>
        </View>
        <IconButton icon="bi-bag" accessibilityLabel="Cart" badge={cartCount || undefined} onPress={() => router.push("/cart")} />
        <IconButton icon="bi-bell" accessibilityLabel="Notifications" badge={unread || undefined} onPress={() => router.push("/notifications")} />
      </Row>
    </View>
  );

  return (
    <Screen header={header} bottomInset={TAB_BAR_SPACE} refreshing={refreshing} onRefresh={onRefresh}>
      {/* Balance hero */}
      <LinearGradient colors={dark ? ["#1f5c56", "#123a36", "#0b2422"] : [c.primary, c.primary700, "#12423d"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.xxl, paddingVertical: 18, marginTop: 4, overflow: "hidden" }}>
        <View style={{ position: "absolute", right: -40, top: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(255,255,255,0.07)" }} />
        <View style={{ position: "absolute", right: 40, bottom: -70, width: 140, height: 140, borderRadius: 70, backgroundColor: "rgba(255,255,255,0.05)" }} />
        <View style={{ paddingHorizontal: 18 }}>
          <Row justify="space-between">
            <Row gap={8}>
              <LogoMark size={22} mono />
              <Text variant="sm" color="rgba(255,255,255,0.85)">Total balance · All Accounts</Text>
            </Row>
            <Pressable onPress={() => app().update("settings", (s) => ({ ...s, hideBalance: !s.hideBalance }))} hitSlop={10} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Icon name={hide ? "bi-eye" : "bi-eye-slash"} size={16} color="#fff" />
              <Text variant="xs" weight="semibold" color="#fff">{hide ? "Show" : "Hide"}</Text>
            </Pressable>
          </Row>
          <Text variant="display" color="#fff" tabular style={{ marginTop: 8, fontSize: 34, lineHeight: 42 }} numberOfLines={1} adjustsFontSizeToFit>
            {hide ? "₦ ••••••" : naira(total, 2)}
          </Text>
        </View>
        <AccountCarousel cards={cards} hide={hide} wallet={wallet} />
        <Row style={{ marginTop: 14, paddingHorizontal: 12 }}>
          {[
            { icon: "bi-plus-lg", label: "Add money", onPress: openFund },
            { icon: "bi-bank", label: "Withdraw", onPress: () => router.push("/wallet/withdraw") },
            { icon: "bi-send", label: "Transfer", onPress: () => router.push("/wallet/transfer") },
            { icon: "bi-arrow-left-right", label: "Convert", onPress: () => router.push("/wallet/convert") },
          ].map((a) => (
            <Pressable key={a.label} onPress={a.onPress} style={({ pressed }) => ({ flex: 1, alignItems: "center", gap: 6, opacity: pressed ? 0.7 : 1 })}>
              <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" }}>
                <Icon name={a.icon} size={20} color="#fff" />
              </View>
              <Text variant="xs" weight="semibold" color="#fff">{a.label}</Text>
            </Pressable>
          ))}
        </Row>
      </LinearGradient>

      {/* Quick actions */}
      <Card style={{ marginTop: 16 }}>
        <SectionHeader title="Quick actions" action="Fund wallet +" onAction={openFund} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 14 }}>
          {QUICK.map((q) => (
            <Pressable key={q.label} onPress={() => go(q.href)} style={({ pressed }) => ({ width: "25%", alignItems: "center", gap: 6, opacity: pressed ? 0.6 : 1 })}>
              <IconTile icon={q.icon} tone={q.tone} size={48} />
              <Text size={11} weight="semibold" center numberOfLines={1}>{q.label}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      {/* Budget + upcoming bills */}
      <Card style={{ marginTop: 16 }}>
        <SectionHeader title="Monthly budget" subtitle={monthLabel()} />
        <Pressable onPress={() => setBudgetOpen(true)} accessibilityLabel="Edit budget" hitSlop={8} style={{ position: "absolute", right: 16, top: 16 }}>
          <IconTile icon="bi-pencil" size={32} />
        </Pressable>
        <BudgetGauge spent={spent} budget={budget} />
        <Row gap={10} style={{ marginTop: 14 }}>
          <View style={{ flex: 1, padding: 12, borderRadius: radius.lg, backgroundColor: c.surface2 }}>
            <Text variant="xs" muted>Spent so far</Text>
            <Text weight="bold" tabular>{hide ? "₦ ••••" : naira(spent)}</Text>
          </View>
          <View style={{ flex: 1, padding: 12, borderRadius: radius.lg, backgroundColor: c.primarySoft }}>
            <Text variant="xs" muted>Left to spend</Text>
            <Text weight="bold" tabular color={c.primary}>{hide ? "₦ ••••" : naira(Math.max(budget - spent, 0))}</Text>
          </View>
        </Row>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <SectionHeader title="Upcoming bills" action="View all" onAction={() => go("/(tabs)/pay")} />
        <View style={{ gap: 10 }}>
          {bills.map((b, i) => {
            const d = new Date(b.due);
            return (
              <Pressable key={i} onPress={() => go(b.href)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 10, borderRadius: radius.lg, backgroundColor: c.surface2, opacity: pressed ? 0.7 : 1 })}>
                <View style={{ width: 52, height: 56, borderRadius: 14, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" }}>
                  <Text variant="xs" muted weight="semibold">{MONTHS[d.getMonth()]}</Text>
                  <Text variant="h2">{d.getDate()}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="xs" muted>{b.provider}</Text>
                  <Text weight="bold" numberOfLines={1}>{b.name}</Text>
                  <Text variant="xs" muted>Last charge · {b.last}</Text>
                </View>
                <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }}>
                  <Text variant="sm" weight="bold">{b.amount ? naira(b.amount) : "Top up"}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {/* Recent transactions */}
      <Card style={{ marginTop: 16 }}>
        <SectionHeader title="Recent transactions" action="View all" onAction={() => router.push("/transactions")} />
        <Segment small value={recentDir} onChange={setRecentDir} options={[{ value: "all", label: "All" }, { value: "in", label: "Money in" }, { value: "out", label: "Money out" }]} />
        {recent.length ? recent.map((t) => <TxRow key={t.id} t={t} />) : <EmptyState icon="bi-receipt" title="No transactions yet" message="Fund your wallet to get started." action="Fund wallet" onAction={openFund} />}
      </Card>

      {/* Statistics */}
      <Card style={{ marginTop: 16 }}>
        <Row justify="space-between" style={{ marginBottom: 12 }}>
          <Text variant="h3">Statistics</Text>
          <Select<"week" | "month">
            containerStyle={{ width: 190 }} title="Compare" value={mode} onChange={setMode}
            options={[{ value: "week", label: "Weekly Comparison" }, { value: "month", label: "Monthly Comparison" }]}
          />
        </Row>
        <CompareBars labels={series.labels} cur={series.cur} prev={series.prev} legend={series.legend} />
      </Card>

      {/* Expenses */}
      <Card style={{ marginTop: 16 }}>
        <SectionHeader title="Expenses breakdown" subtitle="*Compared to last month" />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {exp.map((e) => (
            <Pressable key={e.label} onPress={() => router.push({ pathname: "/transactions", params: { type: e.type } })} style={({ pressed }) => ({ width: "48%", flexGrow: 1, padding: 12, borderRadius: radius.lg, backgroundColor: c.surface2, opacity: pressed ? 0.7 : 1 })}>
              <Row justify="space-between">
                <IconTile icon={e.icon} tone={e.tone} size={34} />
                {e.change === null ? (
                  <Text variant="xs" weight="bold" color={c.primary}>New</Text>
                ) : (
                  <Row gap={2}>
                    <Text variant="xs" weight="bold" color={e.change > 0 ? c.danger : c.success}>{Math.abs(e.change)}%*</Text>
                    <Icon name={e.change > 0 ? "bi-arrow-up-right" : "bi-arrow-down-left"} size={12} color={e.change > 0 ? c.danger : c.success} />
                  </Row>
                )}
              </Row>
              <Text variant="xs" muted style={{ marginTop: 8 }} numberOfLines={1}>{e.label}</Text>
              <Text weight="bold" tabular>{hide ? "₦ ••••" : naira(e.cur)}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <BudgetSheet visible={budgetOpen} onClose={() => setBudgetOpen(false)} budget={budget} />
    </Screen>
  );
}

/* ---------------- Account carousel ---------------- */
function BrandMark({ brand }: { brand: string }) {
  if (brand === "mastercard")
    return (
      <View style={{ flexDirection: "row" }}>
        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#eb001b" }} />
        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#f79e1b", marginLeft: -9, opacity: 0.9 }} />
      </View>
    );
  return <Text weight="extrabold" color="#fff" style={{ fontStyle: "italic", fontSize: 18, letterSpacing: 1 }}>VISA</Text>;
}

function AccountCarousel({ cards, hide, wallet }: { cards: VirtualCard[]; hide: boolean; wallet: { balance: number; usd: number } }) {
  const W = Dimensions.get("window").width;
  const cw = W - 32 - 36 - 44;
  const [idx, setIdx] = useState(0);
  const slides = [
    { key: "ngn", type: "Naira Wallet", num: "7821 4436 09", amt: hide ? "₦ ••••" : naira(wallet.balance, 2), icon: "bi-wallet2", href: "/wallet", grad: null as string[] | null, brand: null as string | null },
    { key: "usd", type: "USD Wallet", num: "AutoBiz · USD", amt: hide ? "$ ••••" : usd(wallet.usd), icon: "bi-currency-dollar", href: "/wallet/convert", grad: null, brand: null },
    ...cards.map((cd) => ({ key: cd.id, type: `${cd.brand === "mastercard" ? "Mastercard" : "Visa"} · ${cd.label || cd.name || "Virtual card"}`, num: cd.number, amt: hide ? "$ ••••" : usd(cd.balance), icon: "bi-credit-card-2-front", href: "/(tabs)/cards", grad: cd.gradient, brand: cd.brand })),
  ];
  return (
    <View style={{ marginTop: 14 }}>
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false} decelerationRate="fast" snapToInterval={cw + 10}
        contentContainerStyle={{ paddingHorizontal: 18, gap: 10 }}
        onScroll={(e) => setIdx(Math.round(e.nativeEvent.contentOffset.x / (cw + 10)))} scrollEventThrottle={32}
      >
        {slides.map((s) => {
          const inner = (
            <>
              <Row justify="space-between">
                <View style={{ flex: 1 }}>
                  <Text size={10} color="rgba(255,255,255,0.7)">Account Type</Text>
                  <Text variant="sm" weight="bold" color="#fff" numberOfLines={1}>{s.type}</Text>
                </View>
                {s.brand ? <BrandMark brand={s.brand} /> : <Icon name={s.icon} size={20} color="#fff" />}
              </Row>
              <Text variant="xs" color="rgba(255,255,255,0.75)" style={{ marginTop: 10, letterSpacing: 1 }}>{maskNumber(s.num)}</Text>
              <Row justify="space-between" style={{ marginTop: 2 }}>
                <Text variant="h3" color="#fff" tabular>{s.amt}</Text>
                <Icon name="bi-arrow-up-right" size={16} color="#fff" />
              </Row>
            </>
          );
          return (
            <Pressable key={s.key} onPress={() => go(s.href)} style={{ width: cw }}>
              {s.grad ? (
                <LinearGradient colors={s.grad as [string, string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.lg, padding: 14 }}>{inner}</LinearGradient>
              ) : (
                <View style={{ borderRadius: radius.lg, padding: 14, backgroundColor: "rgba(255,255,255,0.13)", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" }}>{inner}</View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
      <Row gap={5} justify="center" style={{ marginTop: 10 }}>
        {slides.map((s, i) => <View key={s.key} style={{ width: i === idx ? 16 : 6, height: 6, borderRadius: 3, backgroundColor: i === idx ? "#fff" : "rgba(255,255,255,0.4)" }} />)}
      </Row>
    </View>
  );
}

/* ---------------- Budget sheet ---------------- */
function BudgetSheet({ visible, onClose, budget }: { visible: boolean; onClose: () => void; budget: number }) {
  const [v, setV] = useState(String(budget));
  const [err, setErr] = useState<string | null>(null);
  React.useEffect(() => { if (visible) { setV(String(budget)); setErr(null); } }, [visible, budget]);
  const save = () => {
    const n = Number(v);
    if (!n || n < 1000) return setErr("Enter at least ₦1,000");
    app().update("settings", (s) => ({ ...s, budget: n }));
    onClose();
    toast("Monthly budget updated");
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="Set monthly budget" footer={<Button title="Save budget" size="lg" full onPress={save} />}>
      <TextField label={`Budget for ${MONTHS_LONG[new Date().getMonth()]}`} prefix="₦" big keyboardType="numeric" value={v} onChangeText={(t) => { setV(t.replace(/\D/g, "")); setErr(null); }} error={err} />
      <Row gap={8} wrap style={{ marginTop: 12 }}>
        {[100000, 250000, 500000, 1000000].map((p) => <Chip key={p} label={naira(p)} active={Number(v) === p} onPress={() => { setV(String(p)); setErr(null); }} />)}
      </Row>
    </Sheet>
  );
}

/* =========================== Guest home =========================== */
const GUEST_SERVICES = [
  { label: "Shop", sub: "Verified sellers", icon: "bi-shop", tone: "primary", href: "/(tabs)/shop" },
  { label: "Travel eSIM", sub: "120+ countries", icon: "bi-sim", tone: "violet", href: "/esim" },
  { label: "Flights", sub: "Pay in Naira", icon: "bi-airplane", tone: "cyan", href: "/flights" },
  { label: "Gift cards", sub: "Top rates", icon: "bi-gift", tone: "pink", href: "/giftcards" },
  { label: "USD cards", sub: "Netflix, AWS…", icon: "bi-credit-card-2-front", tone: "success", href: "/(tabs)/cards" },
  { label: "Airtime & bills", sub: "Instant, 24/7", icon: "bi-lightning-charge", tone: "warning", href: "/(tabs)/pay" },
];

function GuestHome() {
  const { c, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const cartCount = useApp((s) => s.cart.reduce((a, l) => a + l.qty, 0));
  return (
    <Screen
      bottomInset={TAB_BAR_SPACE}
      padded={false}
      contentStyle={{ paddingTop: 0 }}
      header={
        // Fixed top bar — stays put while the page scrolls
        <View style={{ backgroundColor: dark ? "#1f5c56" : c.primary, paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 10, zIndex: 2 }}>
          <Row justify="space-between">
            <Logo size={34} light />
            <IconButton icon="bi-bag" bg="rgba(255,255,255,0.18)" color="#fff" accessibilityLabel="Cart" badge={cartCount || undefined} onPress={() => router.push("/cart")} />
          </Row>
        </View>
      }
    >
      <LinearGradient colors={dark ? ["#1f5c56", "#0b2422"] : [c.primary, c.primary700]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ paddingTop: 4, paddingHorizontal: 20, paddingBottom: 56, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: "hidden" }}>
        <View style={{ position: "absolute", right: -60, top: -30, width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(255,255,255,0.08)" }} />
        <Text variant="display" color="#fff" style={{ marginTop: 12 }}>Shop, travel & pay{"\n"}from one wallet.</Text>
        <Text variant="body" color="rgba(255,255,255,0.85)" style={{ marginTop: 10 }}>Airtime, data & bills, travel eSIMs, flights, USD cards and gift card trading — all in Naira.</Text>
        <Row gap={10} style={{ marginTop: 20 }}>
          <Button title="Create free account" variant="dark" style={{ flex: 1.3 }} onPress={() => router.push("/register")} />
          <Button title="Log in" variant="light" style={{ flex: 1 }} onPress={() => router.push("/login")} />
        </Row>
      </LinearGradient>

      <View style={{ paddingHorizontal: 16, marginTop: -32 }}>
        <Card style={{ ...shadow(2, dark) }}>
          <SectionHeader title="Everything on AutoBiz" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {GUEST_SERVICES.map((s) => (
              <Pressable key={s.label} onPress={() => go(s.href)} style={({ pressed }) => ({ width: "31%", flexGrow: 1, padding: 12, borderRadius: radius.lg, backgroundColor: c.surface2, gap: 8, opacity: pressed ? 0.7 : 1 })}>
                <IconTile icon={s.icon} tone={s.tone} size={40} />
                <View>
                  <Text variant="sm" weight="bold" numberOfLines={1}>{s.label}</Text>
                  <Text size={11} muted numberOfLines={1}>{s.sub}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </Card>

        <Pressable onPress={() => router.push("/register")} style={{ marginTop: 16 }}>
          <LinearGradient colors={["#7048e8", "#e64980"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.xl, padding: 18 }}>
            <Row gap={14}>
              <View style={{ flex: 1 }}>
                <Text variant="label" color="rgba(255,255,255,0.8)">Welcome offer</Text>
                <Text variant="h3" color="#fff" style={{ marginTop: 4 }}>Sign up & get ₦1,000 off your first order</Text>
              </View>
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
                <Icon name="bi-gift" size={26} color="#fff" />
              </View>
            </Row>
          </LinearGradient>
        </Pressable>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16, marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
          {[
            { t: "Fly Lagos → Dubai", s: "Emirates fares this week", i: "bi-airplane", g: ["#c8102e", "#7a0a1d"], h: "/flights?from=LOS&to=DXB" },
            { t: "Travel eSIM from $0.99", s: "No roaming fees", i: "bi-sim", g: ["#7048e8", "#3b1fa6"], h: "/esim" },
            { t: "Sell gift cards", s: "Up to ₦1,210/$", i: "bi-gift", g: ["#f59f00", "#e8590c"], h: "/giftcards" },
          ].map((p) => (
            <Pressable key={p.t} onPress={() => go(p.h)}>
              <LinearGradient colors={p.g as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 230, height: 120, borderRadius: radius.xl, padding: 16, justifyContent: "space-between" }}>
                <Icon name={p.i} size={26} color="#fff" />
                <View>
                  <Text weight="bold" color="#fff">{p.t}</Text>
                  <Text variant="xs" color="rgba(255,255,255,0.8)">{p.s}</Text>
                </View>
              </LinearGradient>
            </Pressable>
          ))}
        </ScrollView>

        <Card style={{ marginTop: 16 }}>
          {[["bi-shield-check", "Buyer protection", "Refund if it doesn't arrive"], ["bi-lightning-charge", "Instant delivery", "Airtime, data & codes in seconds"], ["bi-lock", "Secure payments", "PIN-protected wallet"], ["bi-headset", "24/7 support", "Chat, call or email"]].map(([i, t, s]) => (
            <Row key={t} gap={12} style={{ paddingVertical: 8 }}>
              <IconTile icon={i} size={38} />
              <View><Text weight="semibold">{t}</Text><Text variant="xs" muted>{s}</Text></View>
            </Row>
          ))}
        </Card>
      </View>
    </Screen>
  );
}
