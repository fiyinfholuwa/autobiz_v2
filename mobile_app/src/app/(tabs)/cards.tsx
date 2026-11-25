import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Share, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { copy, toast } from "@/components/overlay";
import { startCreate } from "@/features/cards/actions";
import {
  Badge, BrandTile, Button, Card, EmptyState, Icon, IconButton, IconTile, Notice, ProgressBar, Row, Screen, Segment, StatusPill, Text,
} from "@/components/ui";
import { InfoPanels } from "@/features/cards/InfoPanels";
import { CardThumb, FlipCard, StaticCard } from "@/features/cards/CardVisual";
import {
  groupNumber, last4, MAX_CARDS, MERCHANTS, monthSpent, r2, SELL_RATE, statementCsv, THEMES, themeFor, updateCard, useCardsUI,
} from "@/features/cards/constants";
import { FundSheet, LimitSheet, RenameSheet, RevealPinSheet, SimulateSheet, TerminateSheet, WithdrawSheet } from "@/features/cards/sheets";
import { ago, date, naira, usd } from "@/lib/format";
import { app, useApp, type CardTx, type VirtualCard } from "@/store";
import { radius, TAB_BAR_SPACE, useTheme } from "@/theme";

type SheetKey = "fund" | "withdraw" | "limit" | "rename" | "terminate" | "simulate" | "reveal" | null;
type Filter = "all" | "purchase" | "topup" | "declined";
const REVEAL_SECS = 30;


export default function CardsScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ create?: string }>();
  const authed = useApp((s) => s.auth.authed);
  const cards = useApp((s) => s.cards);
  const user = useApp((s) => s.user);
  const { selectedId, select, revealRequest } = useCardsUI();
  const card = useMemo(() => cards.find((x) => x.id === selectedId) || cards[0], [cards, selectedId]);

  const [flipped, setFlipped] = useState(false);
  const [sheet, setSheet] = useState<SheetKey>(null);
  const [revealLeft, setRevealLeft] = useState(0);
  const [filter, setFilter] = useState<Filter>("all");
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const revealed = revealLeft > 0;

  // ?create=1 deep link
  useEffect(() => {
    if (params.create) {
      const t = setTimeout(() => { router.setParams({ create: undefined }); startCreate(); }, 350);
      return () => clearTimeout(t);
    }
  }, [params.create]);

  // reveal requested from the create flow
  const firstReveal = useRef(revealRequest);
  useEffect(() => {
    if (revealRequest !== firstReveal.current) { firstReveal.current = revealRequest; setTimeout(() => setSheet("reveal"), 400); }
  }, [revealRequest]);

  // countdown
  useEffect(() => {
    if (!revealed) return;
    const t = setInterval(() => setRevealLeft((s) => {
      if (s <= 1) { toast("Card details hidden for your security", "info"); return 0; }
      return s - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [revealed]);

  // hide details silently on card switch / freeze / terminate
  useEffect(() => { setRevealLeft(0); setFlipped(false); }, [card?.id]);
  useEffect(() => { if (card?.status === "frozen") setRevealLeft(0); }, [card?.status]);

  const header = (
    <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: c.bg }}>
      <Row justify="space-between">
        <View style={{ flex: 1 }}>
          <Text variant="h1">Virtual Cards</Text>
          <Text variant="xs" muted style={{ marginTop: 2 }}>USD cards for Netflix, Spotify, AWS, AliExpress, Apple & any online merchant.</Text>
        </View>
        <Button title="New card" icon="bi-plus-lg" size="sm" onPress={startCreate} />
      </Row>
      <Badge label="$1 = ₦1,580" icon="bi-arrow-left-right" style={{ marginTop: 10 }} />
    </View>
  );

  if (!authed || !card) {
    return (
      <Screen header={header} bottomInset={TAB_BAR_SPACE}>
        <EmptyHero />
        <View style={{ height: 14 }} />
        <InfoPanels />
      </Screen>
    );
  }

  const theme = themeFor(card);
  const frozen = card.status === "frozen";
  const spent = monthSpent(card);
  const spentPct = card.limit ? spent / card.limit : 0;
  const total = r2(cards.reduce((a, x) => a + x.balance, 0));
  const holder = card.name || `${user.firstName} ${user.lastName}`;
  const tag = `•••• ${last4(card.number)}`;

  const txns = card.txns.filter((t) =>
    filter === "all" ? true : filter === "purchase" ? t.kind === "purchase" : filter === "topup" ? t.kind !== "purchase" : t.status === "declined"
  );

  const toggleFreeze = () => {
    const s = app();
    if (frozen) {
      updateCard(card.id, (x) => ({ ...x, status: "active" }));
      toast(`**${card.label}** unfrozen and ready to use.`, "success");
      s.notify({ icon: "bi-sun", tone: "cyan", title: "Card unfrozen", body: `${card.label} (${tag})` });
    } else {
      updateCard(card.id, (x) => ({ ...x, status: "frozen" }));
      toast(`**${card.label}** frozen. All payments are paused.`, "info");
      s.notify({ icon: "bi-snow2", tone: "cyan", title: "Card frozen", body: `${card.label} (${tag})` });
    }
  };
  const statement = async () => {
    try {
      await Share.share({ title: `autobiz-card-${last4(card.number)}-statement.csv`, message: statementCsv(card) });
      toast("Statement downloaded", "success");
    } catch {
      toast("Couldn't share the statement", "error");
    }
  };

  const actions: { label: string; icon: string; tone: string; onPress: () => void; disabled?: boolean }[] = [
    { label: "Fund", icon: "bi-plus-lg", tone: "success", disabled: frozen, onPress: () => (frozen ? toast("Unfreeze this card to fund it", "warning") : setSheet("fund")) },
    { label: "Withdraw", icon: "bi-arrow-down-left", tone: "primary", disabled: frozen || card.balance <= 0, onPress: () => (frozen ? toast("Unfreeze this card to withdraw", "warning") : setSheet("withdraw")) },
    { label: frozen ? "Unfreeze" : "Freeze", icon: frozen ? "bi-sun" : "bi-snow2", tone: "cyan", onPress: toggleFreeze },
    { label: "Limit", icon: "bi-sliders", tone: "warning", onPress: () => setSheet("limit") },
    { label: "Rename", icon: "bi-pencil", tone: "violet", onPress: () => setSheet("rename") },
    { label: "Flip card", icon: "bi-arrow-repeat", tone: "orange", onPress: () => setFlipped((f) => !f) },
    { label: "Statement", icon: "bi-file-earmark-text", tone: "pink", onPress: statement },
    { label: "Terminate", icon: "bi-trash", tone: "danger", onPress: () => setSheet("terminate") },
  ];

  return (
    <Screen header={header} bottomInset={TAB_BAR_SPACE} scrollRef={scroll} padded={false}>
      {/* Summary */}
      <Row justify="space-between" style={{ paddingHorizontal: 16 }}>
        <View>
          <Text variant="label" muted>My cards ({cards.length}/{MAX_CARDS})</Text>
          <Text variant="h2" tabular>Total balance {usd(total)}</Text>
        </View>
        <StatusPill status={frozen ? "frozen" : "active"} label={frozen ? "Frozen" : "Active"} />
      </Row>

      {/* Selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16, paddingVertical: 14 }}>
        {cards.map((x) => <CardThumb key={x.id} card={x} theme={themeFor(x)} selected={x.id === card.id} onPress={() => select(x.id)} />)}
        {cards.length < MAX_CARDS ? (
          <Pressable onPress={startCreate} accessibilityRole="button" accessibilityLabel="New card" style={{ width: 128, height: 80, borderRadius: 14, borderWidth: 1.5, borderStyle: "dashed", borderColor: c.primary300, alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: c.primarySoft }}>
            <Icon name="bi-plus-lg" size={20} color={c.primary} />
            <Text size={12} weight="bold" color={c.primary}>New card</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <View style={{ paddingHorizontal: 16, gap: 14 }}>
        {/* Card */}
        <View>
          <FlipCard
            flipped={flipped}
            onToggle={() => setFlipped((f) => !f)}
            face={{ brand: card.brand, theme, label: card.label, balance: card.balance, number: card.number, holder, expiry: card.expiry, cvv: card.cvv, revealed, frozen }}
          />
          <Text variant="xs" muted center style={{ marginTop: 8 }}><Icon name="bi-arrow-repeat" size={11} color={c.muted} /> Tap the card to flip it</Text>
        </View>

        {/* Balance panel */}
        <Card>
          <Text variant="xs" muted>Available balance</Text>
          <Row justify="space-between" align="flex-end">
            <Text variant="display" tabular>{usd(card.balance)}</Text>
            <Text variant="sm" muted tabular style={{ marginBottom: 6 }}>≈ {naira(card.balance * SELL_RATE)}</Text>
          </Row>
          <Text variant="xs" muted style={{ marginTop: 2 }}>{card.brand === "visa" ? "Visa" : "Mastercard"} · {tag} · Created {date(card.createdAt)}</Text>
          {frozen ? <Notice tone="cyan" icon="bi-snow2" style={{ marginTop: 12 }}>This card is frozen. Payments, funding and withdrawals are paused until you unfreeze it.</Notice> : null}
          <Row justify="space-between" style={{ marginTop: 14, marginBottom: 6 }}>
            <Text variant="sm" weight="semibold">Monthly spend</Text>
            <Text variant="sm" muted tabular>{usd(spent)} / {usd(card.limit)}</Text>
          </Row>
          <ProgressBar value={spentPct} color={spentPct > 0.85 ? c.danger : c.primary} />
          <Row gap={10} style={{ marginTop: 14 }}>
            {!revealed ? <Button title="Reveal details" icon="bi-eye" variant="soft" style={{ flex: 1 }} onPress={() => setSheet("reveal")} /> : null}
            <Button title="Test payment" icon="bi-bag-check" variant="outline" style={{ flex: 1 }} onPress={() => setSheet("simulate")} />
          </Row>
        </Card>

        {/* Revealed details */}
        {revealed ? (
          <Card>
            <Row justify="space-between">
              <Text variant="h3">Card details</Text>
              <Row gap={8}>
                <Text variant="xs" muted>Hides in {revealLeft}s</Text>
                <Button title="Hide" size="sm" variant="outline" onPress={() => setRevealLeft(0)} />
              </Row>
            </Row>
            <ProgressBar value={revealLeft / REVEAL_SECS} height={4} style={{ marginTop: 10, marginBottom: 6 }} />
            {[
              ["Card number", groupNumber(card.number), card.number, "Card number copied"],
              ["Expiry", card.expiry, card.expiry, "Expiry date copied"],
              ["CVV", card.cvv, card.cvv, "CVV copied"],
              ["Name on card", holder.toUpperCase(), holder.toUpperCase(), "Name copied"],
            ].map(([k, v, raw, msg], i) => (
              <Row key={k} justify="space-between" style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: c.border }}>
                <View>
                  <Text variant="xs" muted>{k}</Text>
                  <Text weight="bold" tabular selectable>{v}</Text>
                </View>
                <IconButton icon="bi-copy" size={34} bg={c.surface2} accessibilityLabel={`Copy ${k}`} onPress={() => copy(raw, msg)} />
              </Row>
            ))}
          </Card>
        ) : null}

        {/* Actions */}
        <Card>
          <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 16 }}>
            {actions.map((a) => (
              <Pressable key={a.label} onPress={a.onPress} accessibilityRole="button" accessibilityLabel={a.label} style={({ pressed }) => ({ width: "25%", alignItems: "center", gap: 6, opacity: a.disabled ? 0.4 : pressed ? 0.7 : 1 })}>
                <IconTile icon={a.icon} tone={a.tone} size={46} />
                <Text size={11} weight="semibold" center numberOfLines={1}>{a.label}</Text>
              </Pressable>
            ))}
          </View>
        </Card>

        {/* Transactions */}
        <Card>
          <Text variant="h3">Card transactions</Text>
          <Text variant="xs" muted style={{ marginTop: 2, marginBottom: 12 }}>{card.label} · {tag}</Text>
          <Segment<Filter>
            small
            value={filter}
            onChange={setFilter}
            options={[{ value: "all", label: "All" }, { value: "purchase", label: "Payments" }, { value: "topup", label: "Top-ups" }, { value: "declined", label: "Declined" }]}
            style={{ marginBottom: 6 }}
          />
          {txns.length ? txns.map((t, i) => <CardTxRow key={t.id} t={t} first={i === 0} />) : (
            <EmptyState icon="bi-receipt" title="No transactions here" message="Payments made with this card will show up here." />
          )}
        </Card>

        <InfoPanels />
      </View>

      {/* Sheets */}
      <RevealPinSheet visible={sheet === "reveal"} onClose={() => setSheet(null)} onSuccess={() => setRevealLeft(REVEAL_SECS)} />
      <FundSheet visible={sheet === "fund"} onClose={() => setSheet(null)} card={card} />
      <WithdrawSheet visible={sheet === "withdraw"} onClose={() => setSheet(null)} card={card} />
      <LimitSheet visible={sheet === "limit"} onClose={() => setSheet(null)} card={card} />
      <RenameSheet visible={sheet === "rename"} onClose={() => setSheet(null)} card={card} />
      <TerminateSheet visible={sheet === "terminate"} onClose={() => setSheet(null)} card={card} onTerminated={() => { setRevealLeft(0); select(null); }} />
      <SimulateSheet
        visible={sheet === "simulate"}
        onClose={() => setSheet(null)}
        card={card}
        onSent={() => { setFilter("all"); setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 250); }}
      />
    </Screen>
  );
}

function CardTxRow({ t, first }: { t: CardTx; first: boolean }) {
  const { c } = useTheme();
  const m = t.merchant ? MERCHANTS[t.merchant] : undefined;
  const muted = t.status === "declined" || t.status === "reversed";
  const left = t.kind === "purchase"
    ? (m ? <BrandTile color={m.bg} fg={m.fg} icon={m.icon} size={40} /> : <IconTile icon="bi-globe" tone="neutral" size={40} />)
    : <IconTile icon={t.direction === "in" ? "bi-arrow-down-left" : "bi-arrow-up-right"} tone={t.direction === "in" ? "success" : "primary"} size={40} />;
  return (
    <Row gap={12} style={{ paddingVertical: 11, borderTopWidth: first ? 0 : 1, borderTopColor: c.border }}>
      {left}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text weight="semibold" numberOfLines={1}>{t.title || m?.name || "Online payment"}</Text>
        <Text variant="xs" muted numberOfLines={1}>{t.note || m?.cat} · {ago(t.date)}</Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <Text weight="bold" tabular strike={muted} color={muted ? c.muted : t.direction === "in" ? c.success : c.text}>
          {t.direction === "in" ? "+" : "−"}{usd(t.amount)}
        </Text>
        {t.status === "pending" ? <StatusPill status="pending" label="Pending…" /> : <StatusPill status={t.status} />}
      </View>
    </Row>
  );
}

function EmptyHero() {
  const { c } = useTheme();
  return (
    <View style={{ gap: 14 }}>
      <LinearGradient colors={["#1e2a78", "#0b1230"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.xxl, padding: 20, overflow: "hidden" }}>
        <View style={{ height: 190, marginBottom: 8 }}>
          <StaticCard
            style={{ position: "absolute", width: "86%", top: 0, right: 0, transform: [{ rotate: "6deg" }], opacity: 0.9 }}
            face={{ brand: "mastercard", theme: THEMES[1], label: "Subscriptions", balance: 49.99, number: "5399000000001234", holder: "AutoBiz User" }}
          />
          <StaticCard
            style={{ position: "absolute", width: "86%", top: 22, left: 0, transform: [{ rotate: "-4deg" }] }}
            face={{ brand: "visa", theme: THEMES[0], label: "Shopping", balance: 250, number: "4539580000004821", holder: "AutoBiz User" }}
          />
        </View>
        <Badge label="Ready in 30 seconds" icon="bi-lightning-charge-fill" solid tone="success" style={{ marginTop: 6 }} />
        <Text variant="h1" color="#fff" style={{ marginTop: 10 }}>Get your USD virtual card</Text>
        <Text variant="sm" color="rgba(255,255,255,0.8)" style={{ marginTop: 6 }}>
          Pay for subscriptions, ads, cloud services and shopping worldwide — fund it straight from your Naira wallet.
        </Text>
        <View style={{ gap: 8, marginTop: 14 }}>
          {["Visa or Mastercard, 6 beautiful designs", "Freeze, set limits & withdraw anytime", "Only $2 to create · 1% funding fee"].map((p) => (
            <Row key={p} gap={8}>
              <Icon name="bi-check-circle-fill" size={16} color="#63e6be" />
              <Text variant="sm" color="#fff">{p}</Text>
            </Row>
          ))}
        </View>
        <Button title="Create my card" icon="bi-credit-card-2-front" size="lg" style={{ marginTop: 18 }} onPress={startCreate} />
      </LinearGradient>

      <Card>
        <Text variant="h3" style={{ marginBottom: 6 }}>How it works</Text>
        {[
          ["bi-palette", "violet", "Design it", "Pick Visa or Mastercard and a card design you love."],
          ["bi-wallet2", "primary", "Fund in Naira", "Top up from your wallet at ₦1,580/$1."],
          ["bi-bag-check", "success", "Pay anywhere", "Use it on Netflix, AWS, AliExpress, Apple & more."],
        ].map(([icon, tone, t, d], i) => (
          <Row key={t} gap={12} align="flex-start" style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: c.border }}>
            <IconTile icon={icon} tone={tone} size={40} />
            <View style={{ flex: 1 }}>
              <Text weight="bold">{i + 1}. {t}</Text>
              <Text variant="sm" muted>{d}</Text>
            </View>
          </Row>
        ))}
      </Card>
    </View>
  );
}
