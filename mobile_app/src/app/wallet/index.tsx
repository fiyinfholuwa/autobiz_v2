import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { AuthGate } from "@/components/AuthGate";
import { copy, DEDICATED_ACCOUNTS, openFund, shareText, toast } from "@/components/overlay";
import { TxRow } from "@/components/TxRow";
import { Badge, BrandTile, Button, Card, EmptyState, Flag, Header, Icon, IconButton, ProgressBar, Row, Screen, SectionHeader, Segment, Text } from "@/components/ui";
import { BUY_RATE, SELL_RATE, bankAbbr, bankColor, tierLimit, usedToday } from "@/features/wallet/constants";
import { groupDigits, naira, usd } from "@/lib/format";
import { app, useApp } from "@/store";
import { radius, useTheme } from "@/theme";

export default function WalletScreen() {
  return <AuthGate><Wallet /></AuthGate>;
}

const WALLET_TYPES = ["funding", "withdrawal", "transfer", "convert", "refund", "giftcard"];

function Wallet() {
  const { c } = useTheme();
  const wallet = useApp((s) => s.wallet);
  const user = useApp((s) => s.user);
  const hide = useApp((s) => s.settings.hideBalance);
  const txs = useApp((s) => s.transactions);
  const accounts = useApp((s) => s.bankAccounts);
  const [dir, setDir] = useState<"all" | "in" | "out">("all");
  const L = tierLimit(user.tier);
  const used = usedToday();
  const activity = txs.filter((t) => WALLET_TYPES.includes(t.type) && (dir === "all" || t.direction === dir)).slice(0, 8);

  const toggleHide = () => app().update("settings", (s) => ({ ...s, hideBalance: !s.hideBalance }));
  const actions = [
    { icon: "bi-plus-lg", label: "Add money", onPress: openFund },
    { icon: "bi-bank", label: "Withdraw", onPress: () => router.push("/wallet/withdraw") },
    { icon: "bi-send", label: "Transfer", onPress: () => router.push("/wallet/transfer") },
    { icon: "bi-arrow-left-right", label: "Convert", onPress: () => router.push("/wallet/convert") },
  ];
  const dailyPct = used / L.daily;
  const balPct = L.maxBal === Infinity ? 0.04 : wallet.balance / L.maxBal;

  return (
    <Screen header={<Header title="Wallet" subtitle="Naira & Dollar balances" right={<IconButton icon="bi-receipt" accessibilityLabel="Statement" onPress={() => router.push("/transactions")} />} />}>
      <LinearGradient colors={[c.primary600, c.primary700, "#0f3f3a"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.xxl, padding: 18, marginTop: 6 }}>
        <Row justify="space-between">
          <Row gap={8}>
            <Text variant="sm" color="rgba(255,255,255,0.85)">Available balances</Text>
            <Pressable onPress={toggleHide} hitSlop={10} accessibilityLabel={hide ? "Show balances" : "Hide balances"}>
              <Icon name={hide ? "bi-eye-slash" : "bi-eye"} size={18} color="#fff" />
            </Pressable>
          </Row>
          <Badge label={user.tier} icon="bi-patch-check" tone="success" solid />
        </Row>
        <Row gap={10} style={{ marginTop: 14 }}>
          {[
            { flag: "ng", label: "Naira · NGN", value: hide ? "₦ ••••••" : naira(wallet.balance, 2), sub: hide ? "≈ $ ••••" : `≈ ${usd(wallet.balance / BUY_RATE)}` },
            { flag: "us", label: "Dollar · USD", value: hide ? "$ ••••" : usd(wallet.usd), sub: hide ? "≈ ₦ ••••" : `≈ ${naira(wallet.usd * SELL_RATE)} at sell rate` },
          ].map((b) => (
            <View key={b.flag} style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: radius.lg, padding: 12 }}>
              <Row gap={6}><Flag code={b.flag} size={18} /><Text variant="xs" color="rgba(255,255,255,0.85)">{b.label}</Text></Row>
              <Text variant="h3" color="#fff" tabular numberOfLines={1} adjustsFontSizeToFit style={{ marginTop: 8 }}>{b.value}</Text>
              <Text size={11} color="rgba(255,255,255,0.7)" numberOfLines={1}>{b.sub}</Text>
            </View>
          ))}
        </Row>
        <Row style={{ marginTop: 16 }} justify="space-between">
          {actions.map((a) => (
            <Pressable key={a.label} onPress={a.onPress} style={{ alignItems: "center", gap: 6, flex: 1 }}>
              <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" }}>
                <Icon name={a.icon} size={20} color="#fff" />
              </View>
              <Text variant="xs" weight="semibold" color="#fff">{a.label}</Text>
            </Pressable>
          ))}
        </Row>
      </LinearGradient>

      <Card style={{ marginTop: 16 }}>
        <SectionHeader title="Account limits" subtitle={`${user.tier} · ${L.next ? "Upgrade for higher limits" : "Maximum tier"}`} action={L.next ? "Upgrade" : undefined} onAction={() => router.push({ pathname: "/settings/verification", params: { upgrade: "1" } })} />
        <View style={{ gap: 14 }}>
          <View>
            <Row justify="space-between"><Text variant="sm" muted>Daily transaction limit</Text><Text variant="sm" weight="semibold" tabular>{naira(used)} / {naira(L.daily)}</Text></Row>
            <ProgressBar value={dailyPct} color={dailyPct > 0.85 ? c.danger : c.primary} style={{ marginTop: 6 }} />
          </View>
          <View>
            <Row justify="space-between"><Text variant="sm" muted>Maximum balance</Text><Text variant="sm" weight="semibold" tabular>{L.maxBal === Infinity ? "Unlimited" : `${naira(wallet.balance)} / ${naira(L.maxBal)}`}</Text></Row>
            <ProgressBar value={balPct} color={balPct > 0.85 ? c.danger : c.primary} style={{ marginTop: 6 }} />
          </View>
          <Row justify="space-between"><Text variant="sm" muted>Single transfer limit</Text><Text variant="sm" weight="bold">{naira(L.single)}</Text></Row>
        </View>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <SectionHeader title="Wallet activity" />
        <Segment small value={dir} onChange={setDir} options={[{ value: "all", label: "All" }, { value: "in", label: "Money in" }, { value: "out", label: "Money out" }]} style={{ marginBottom: 4 }} />
        {activity.length ? activity.map((t) => <TxRow key={t.id} t={t} />) : <EmptyState icon="bi-wallet2" title="No wallet activity" message="Fund, withdraw or transfer to see it here." />}
        <Button title="View full history" variant="soft" full onPress={() => router.push("/transactions")} style={{ marginTop: 8 }} />
      </Card>

      <Card style={{ marginTop: 16 }}>
        <SectionHeader title="Dedicated accounts" subtitle="Transfer here to fund your wallet instantly" />
        <View style={{ gap: 10 }}>
          {DEDICATED_ACCOUNTS.map(([b, n]) => (
            <Row key={b} gap={12} style={{ padding: 12, borderRadius: radius.lg, backgroundColor: c.surface2 }}>
              <BrandTile color={bankColor(b)} text={bankAbbr(b)} size={40} />
              <View style={{ flex: 1 }}>
                <Text variant="xs" muted>{b}</Text>
                <Text variant="h3" tabular>{groupDigits(n).replace(/^(\d{4}) (\d{4}) (\d{2})$/, "$1 $2 $3")}</Text>
                <Text variant="xs" muted>AutoBiz – {user.firstName} {user.lastName}</Text>
              </View>
              <IconButton icon="bi-copy" bg={c.surface} accessibilityLabel="Copy account number" onPress={() => copy(n, "Account number copied")} />
            </Row>
          ))}
        </View>
        <Button title="Share account details" icon="bi-share" variant="outline" full style={{ marginTop: 12 }} onPress={() => {
          const text = `Send money to my AutoBiz wallet:\n${DEDICATED_ACCOUNTS.map(([b, n]) => `${b} – ${n}`).join("\n")}\nName: AutoBiz – ${user.firstName} ${user.lastName}`;
          shareText("AutoBiz account details", text);
        }} />
      </Card>

      <Card style={{ marginTop: 16 }}>
        <SectionHeader title="Saved bank accounts" action="+ Add" onAction={() => router.push("/wallet/withdraw")} />
        {accounts.length ? accounts.map((a) => (
          <Row key={a.id} gap={12} style={{ paddingVertical: 10 }}>
            <BrandTile color={bankColor(a.bank)} text={bankAbbr(a.bank)} size={40} />
            <View style={{ flex: 1 }}>
              <Text weight="semibold" numberOfLines={1}>{a.name}</Text>
              <Text variant="xs" muted>{a.bank} · {a.number}</Text>
            </View>
            <Button title="Withdraw" size="sm" variant="soft" onPress={() => router.push({ pathname: "/wallet/withdraw", params: { bank: a.bank, number: a.number } })} />
            <IconButton icon="bi-trash" size={34} color={c.danger} bg={c.dangerSoft} accessibilityLabel="Remove account" onPress={() => { app().update("bankAccounts", (l) => l.filter((x) => x.id !== a.id)); toast("Bank account removed", "info"); }} />
          </Row>
        )) : <EmptyState icon="bi-bank" title="No saved accounts" message="Save an account when you withdraw." />}
      </Card>

      <Card style={{ marginTop: 16 }}>
        <SectionHeader title="Exchange rates" subtitle="Updated just now" />
        <Row gap={10}>
          {[["Buy $1", BUY_RATE, "bi-arrow-down-left", "success"], ["Sell $1", SELL_RATE, "bi-arrow-up-right", "orange"]].map(([l, v, i, t]) => (
            <View key={l as string} style={{ flex: 1, padding: 14, borderRadius: radius.lg, backgroundColor: c.surface2 }}>
              <Row gap={6}><Icon name={i as string} size={14} color={t === "success" ? c.success : c.orange} /><Text variant="xs" muted>{l as string}</Text></Row>
              <Text variant="h3" style={{ marginTop: 4 }}>{naira(v as number)}</Text>
            </View>
          ))}
        </Row>
        <Button title="Convert now" icon="bi-arrow-left-right" full style={{ marginTop: 12 }} onPress={() => router.push("/wallet/convert")} />
      </Card>
    </Screen>
  );
}
