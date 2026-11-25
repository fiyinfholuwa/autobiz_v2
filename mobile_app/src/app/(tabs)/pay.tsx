/* Airtime, Data & Bills — web: app/bills.html */
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { openFund } from "@/components/overlay";
import { Card, Header, Icon, IconButton, Row, Screen, Text } from "@/components/ui";
import { BettingPane } from "@/features/bills/BettingPane";
import { CablePane } from "@/features/bills/CablePane";
import { EducationPane } from "@/features/bills/EducationPane";
import { ElectricityPane } from "@/features/bills/ElectricityPane";
import { MobilePane } from "@/features/bills/MobilePane";
import { PromoTile } from "@/features/bills/PromoTile";
import { RecentPanel } from "@/features/bills/RecentPanel";
import { BILL_TABS, isBillTab, type BillTab } from "@/features/bills/shared";
import { naira } from "@/lib/format";
import { useApp } from "@/store";
import { radius, TAB_BAR_SPACE, useTheme } from "@/theme";

export default function PayScreen() {
  const { c, tone } = useTheme();
  const params = useLocalSearchParams<{ tab?: string; phone?: string }>();
  const [tab, setTab] = useState<BillTab>(isBillTab(params.tab) ? params.tab : "airtime");
  const authed = useApp((s) => s.auth.authed);
  const balance = useApp((s) => (s.auth.authed ? s.wallet.balance : 0));
  const hide = useApp((s) => s.settings.hideBalance);

  useEffect(() => { if (isBillTab(params.tab)) setTab(params.tab); }, [params.tab]);
  useEffect(() => { if (params.phone && tab !== "airtime" && tab !== "data") setTab("airtime"); }, [params.phone]); // eslint-disable-line react-hooks/exhaustive-deps

  const select = (t: BillTab) => { setTab(t); router.setParams({ tab: t }); };
  const meta = BILL_TABS.find((t) => t.id === tab)!;

  return (
    <Screen
      bottomInset={TAB_BAR_SPACE}
      header={
        <Header
          back={false}
          title="Airtime, Data & Bills"
          subtitle="Instant top-ups and bill payments, 24/7"
          right={
            <>
              <IconButton icon="bi-receipt-cutoff" accessibilityLabel="History" onPress={() => router.push("/transactions" as any)} />
              <IconButton icon="bi-plus-lg" accessibilityLabel="Fund wallet" color="#fff" bg={c.primary} onPress={openFund} />
            </>
          }
        />
      }
    >
      {/* Wallet strip */}
      <Pressable onPress={openFund}>
        <Row justify="space-between" style={{ backgroundColor: c.primarySoft, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14 }}>
          <Row gap={10}>
            <Icon name="bi-wallet2" size={20} color={c.primary} />
            <View>
              <Text variant="xs" muted>Wallet balance</Text>
              <Text weight="bold" tabular>{authed ? (hide ? "₦ ••••••" : naira(balance, 2)) : "Log in to pay"}</Text>
            </View>
          </Row>
          <Text variant="sm" weight="bold" color={c.primary}>Fund +</Text>
        </Row>
      </Pressable>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
        {BILL_TABS.map((t) => {
          const on = t.id === tab;
          const tc = tone(t.tone);
          return (
            <Pressable
              key={t.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => select(t.id)}
              style={{ width: 82, alignItems: "center", gap: 6, paddingVertical: 12, borderRadius: radius.lg, backgroundColor: on ? c.surface : "transparent", borderWidth: 1.5, borderColor: on ? c.primary : c.border }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: on ? tc.fg : tc.bg, alignItems: "center", justifyContent: "center" }}>
                <Icon name={t.icon} size={20} color={on ? "#fff" : tc.fg} />
              </View>
              <Text size={12} weight={on ? "bold" : "semibold"} color={on ? c.text : c.muted} numberOfLines={1}>{t.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Card style={{ marginTop: 14 }}>
        <Row gap={8} style={{ marginBottom: 14 }}>
          <Text variant="h3">{meta.label}</Text>
          <View style={{ flex: 1 }} />
          <Text variant="xs" muted>{tab === "airtime" ? "2% cashback" : tab === "betting" ? "Zero fees" : "Instant delivery"}</Text>
        </Row>
        {tab === "airtime" || tab === "data" ? (
          <MobilePane mode={tab} initialPhone={params.phone} />
        ) : tab === "electricity" ? (
          <ElectricityPane />
        ) : tab === "cable" ? (
          <CablePane />
        ) : tab === "betting" ? (
          <BettingPane />
        ) : (
          <EducationPane />
        )}
      </Card>

      <View style={{ marginTop: 16 }}>
        <PromoTile tab={tab} />
      </View>
      <View style={{ marginTop: 16 }}>
        <RecentPanel tab={tab} />
      </View>
    </Screen>
  );
}
