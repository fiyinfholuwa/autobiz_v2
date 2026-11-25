import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import { Dimensions, FlatList, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Icon, Row, Text } from "@/components/ui";
import { Logo } from "@/features/auth/components";
import { app } from "@/store";
import { useTheme } from "@/theme";

const W = Dimensions.get("window").width;

const SLIDES = [
  {
    title: "Shop, travel & pay\nfrom one wallet",
    text: "Marketplace, travel eSIMs, flights, USD cards, gift cards, airtime, data and bills — all in Naira.",
    colors: ["#3fb5a8", "#1c6b63"] as [string, string],
    features: [["bi-shop", "Marketplace", "Shop verified sellers with buyer protection"], ["bi-sim", "Travel eSIM", "Data in 120+ countries, installed by QR"]],
    hero: "bi-wallet2",
  },
  {
    title: "Go global without\na dollar card",
    text: "Pay Netflix, AWS & Amazon with USD virtual cards and book flights in Naira with instant e-tickets.",
    colors: ["#7048e8", "#3b1fa6"] as [string, string],
    features: [["bi-credit-card-2-front", "USD virtual cards", "Pay Netflix, AWS, Amazon & more"], ["bi-airplane", "Flights in Naira", "200+ airlines, instant e-tickets"]],
    hero: "bi-globe2",
  },
  {
    title: "Fast, rewarding\n& bank-grade secure",
    text: "Sell gift cards at top rates, earn cashback on top-ups and approve every payment with your PIN.",
    colors: ["#e64980", "#a61e4d"] as [string, string],
    features: [["bi-gift", "Gift card exchange", "Top rates, paid in minutes"], ["bi-shield-check", "Bank-grade security", "PIN-protected, 256-bit encrypted"]],
    hero: "bi-lightning-charge-fill",
  },
];

export default function Onboarding() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [i, setI] = useState(0);
  const list = useRef<FlatList>(null);
  const done = (to: "/login" | "/register" | "/(tabs)") => {
    app().completeOnboarding();
    router.replace("/(tabs)");
    if (to !== "/(tabs)") setTimeout(() => router.push(to), 50);
  };
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20 }}>
        <Row justify="space-between" style={{ minHeight: 44 }}>
          <Logo size={34} />
          <Pressable onPress={() => done("/(tabs)")} hitSlop={10}><Text variant="sm" weight="bold" color={c.muted}>Skip</Text></Pressable>
        </Row>
      </View>
      <FlatList
        ref={list}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(s) => s.title}
        onMomentumScrollEnd={(e) => setI(Math.round(e.nativeEvent.contentOffset.x / W))}
        renderItem={({ item: s }) => (
          <View style={{ width: W, paddingHorizontal: 20, paddingTop: 18 }}>
            <LinearGradient colors={s.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 32, padding: 22, height: 300, overflow: "hidden", justifyContent: "space-between" }}>
              <View style={{ position: "absolute", right: -40, top: -40, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(255,255,255,0.08)" }} />
              <View style={{ position: "absolute", left: -60, bottom: -70, width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(255,255,255,0.06)" }} />
              <View style={{ width: 76, height: 76, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" }}>
                <Icon name={s.hero} size={38} color="#fff" />
              </View>
              <View style={{ gap: 10 }}>
                {s.features.map(([icon, t, d]: string[]) => (
                  <Row key={t} gap={12} style={{ backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 18, padding: 12 }}>
                    <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" }}>
                      <Icon name={icon} size={19} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text weight="bold" color="#fff">{t}</Text>
                      <Text variant="xs" color="rgba(255,255,255,0.85)">{d}</Text>
                    </View>
                  </Row>
                ))}
              </View>
            </LinearGradient>
            <Text variant="display" style={{ marginTop: 28 }}>{s.title}</Text>
            <Text muted style={{ marginTop: 10 }}>{s.text}</Text>
          </View>
        )}
      />
      <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 16, gap: 12 }}>
        <Row gap={6} justify="center" style={{ marginBottom: 6 }}>
          {SLIDES.map((_, k) => <View key={k} style={{ width: k === i ? 26 : 8, height: 8, borderRadius: 4, backgroundColor: k === i ? c.primary : c.border }} />)}
        </Row>
        {i < SLIDES.length - 1 ? (
          <Button title="Next" size="lg" full iconRight="bi-arrow-right" onPress={() => { list.current?.scrollToIndex({ index: i + 1 }); setI(i + 1); }} />
        ) : (
          <Button title="Create account" size="lg" full onPress={() => done("/register")} />
        )}
        <Row gap={10}>
          <Button title="Log in" variant="soft" size="lg" style={{ flex: 1 }} onPress={() => done("/login")} />
          <Button title="Explore as guest" variant="outline" size="lg" style={{ flex: 1 }} onPress={() => done("/(tabs)")} />
        </Row>
      </View>
    </View>
  );
}
