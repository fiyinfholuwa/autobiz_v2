import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Pressable, View } from "react-native";
import { openFund } from "@/components/overlay";
import { Icon, Text } from "@/components/ui";
import { radius, useTheme } from "@/theme";
import type { BillTab } from "./shared";

type Promo = { colors?: [string, string]; icon: string; title: string; body: string; cta: string; go: () => void };

export function PromoTile({ tab }: { tab: BillTab }) {
  const { c } = useTheme();
  const PROMOS: Record<BillTab, Promo> = {
    airtime: { colors: ["#f59f00", "#e8590c"], icon: "bi-phone-vibrate", title: "2% back on every top-up", body: "Airtime purchases earn instant cashback into your wallet.", cta: "Upgrade to reseller", go: () => router.push({ pathname: "/settings/verification", params: { upgrade: "1" } } as any) },
    data: { icon: "bi-wifi", title: "Travelling soon?", body: "Skip roaming. Get an eSIM with data in 120+ countries.", cta: "Browse eSIMs", go: () => router.push("/esim" as any) },
    electricity: { colors: ["#fd7e14", "#d6336c"], icon: "bi-lightning-charge", title: "Never run out of units", body: "Save your meter and recharge in 2 taps — token arrives instantly.", cta: "View history", go: () => router.push({ pathname: "/transactions", params: { type: "electricity" } } as any) },
    cable: { colors: ["#1098ad", "#0b6b8a"], icon: "bi-tv", title: "Stream on Netflix & Showmax", body: "Pay for global subscriptions with a USD virtual card.", cta: "Get a USD card", go: () => router.push("/(tabs)/cards" as any) },
    betting: { colors: ["#12b886", "#087f5b"], icon: "bi-trophy", title: "Instant wallet funding", body: "Zero fees on all betting platforms. Funds reflect in seconds.", cta: "Fund wallet", go: () => openFund() },
    education: { colors: ["#7048e8", "#4c2bd1"], icon: "bi-mortarboard", title: "Bulk PINs for schools", body: "Buy up to 5 PINs per order. Resellers get extra discounts.", cta: "Upgrade account", go: () => router.push({ pathname: "/settings/verification", params: { upgrade: "1" } } as any) },
  };
  const p = PROMOS[tab];
  return (
    <Pressable onPress={p.go} style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}>
      <LinearGradient colors={p.colors ?? [c.primary, c.primary700]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.xl, padding: 18, overflow: "hidden" }}>
        <View style={{ position: "absolute", right: -18, bottom: -22, opacity: 0.18 }}>
          <Icon name={p.icon} size={120} color="#fff" />
        </View>
        <View style={{ alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, backgroundColor: "rgba(255,255,255,0.22)" }}>
          <Text size={11} weight="bold" color="#fff">Offer</Text>
        </View>
        <Text variant="h3" color="#fff" style={{ marginTop: 10, maxWidth: "80%" }}>{p.title}</Text>
        <Text variant="sm" color="rgba(255,255,255,0.88)" style={{ marginTop: 4, maxWidth: "85%" }}>{p.body}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 }}>
          <Text variant="sm" weight="bold" color="#fff">{p.cta}</Text>
          <Icon name="bi-arrow-right" size={16} color="#fff" />
        </View>
      </LinearGradient>
    </Pressable>
  );
}
