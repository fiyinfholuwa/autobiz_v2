import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Icon, Text } from "@/components/ui";
import { usd } from "@/lib/format";
import type { VirtualCard } from "@/store";
import { radius, shadow } from "@/theme";
import { groupNumber, last4, maskNumber, type Brand, type Theme } from "./constants";

export function BrandMark({ brand, size = 1 }: { brand: Brand; size?: number }) {
  if (brand === "visa")
    return <Text weight="extrabold" size={20 * size} color="#fff" style={{ fontStyle: "italic", letterSpacing: 0.5 }}>VISA</Text>;
  const d = 26 * size;
  return (
    <View style={{ flexDirection: "row", width: d * 1.6, height: d }}>
      <View style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: "#eb001b" }} />
      <View style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: "#f79e1b", marginLeft: -d * 0.4, opacity: 0.92 }} />
      <View style={{ position: "absolute", left: d * 0.6, width: d * 0.4, height: d * 0.72, top: d * 0.14, borderRadius: d * 0.2, backgroundColor: "#ff5f00" }} />
    </View>
  );
}

function Chip() {
  return (
    <LinearGradient colors={["#f8e3a3", "#d4a94e", "#f2d27f"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 42, height: 32, borderRadius: 7, padding: 5, justifyContent: "space-between" }}>
      <View style={{ height: 1, backgroundColor: "rgba(0,0,0,0.25)" }} />
      <View style={{ height: 1, backgroundColor: "rgba(0,0,0,0.25)" }} />
      <View style={{ height: 1, backgroundColor: "rgba(0,0,0,0.25)" }} />
    </LinearGradient>
  );
}

function Shine() {
  return (
    <>
      <View style={{ position: "absolute", width: 260, height: 260, borderRadius: 130, backgroundColor: "rgba(255,255,255,0.07)", top: -120, right: -80 }} />
      <View style={{ position: "absolute", width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(255,255,255,0.05)", bottom: -110, left: -60 }} />
    </>
  );
}

export type FaceProps = {
  brand: Brand;
  theme: Theme;
  label: string;
  balance: number;
  number: string;
  holder: string;
  expiry?: string;
  cvv?: string;
  revealed?: boolean;
  frozen?: boolean;
};

export function CardFront({ brand, theme, label, balance, number, holder, expiry, revealed, frozen }: FaceProps) {
  return (
    <LinearGradient colors={theme.colors as [string, string, ...string[]]} locations={theme.locations as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.face}>
      <Shine />
      <View style={styles.rowBetween}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text weight="extrabold" size={15} color="#fff">AutoBiz</Text>
          <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.2)" }}>
            <Text size={10} weight="bold" color="#fff">USD</Text>
          </View>
        </View>
        <Text size={12} weight="semibold" color="rgba(255,255,255,0.85)" numberOfLines={1} style={{ maxWidth: "50%" }}>{label}</Text>
      </View>
      <View style={[styles.rowBetween, { marginTop: 14 }]}>
        <Chip />
        <Icon name="ion:wifi" size={22} color="rgba(255,255,255,0.8)" style={{ transform: [{ rotate: "90deg" }] }} />
      </View>
      <View style={{ marginTop: 10 }}>
        <Text size={10} color="rgba(255,255,255,0.7)">Balance</Text>
        <Text weight="extrabold" size={20} color="#fff" tabular>{usd(balance)}</Text>
      </View>
      <Text weight="bold" size={17} color="#fff" tabular style={{ letterSpacing: 1.5, marginTop: 6 }}>{revealed ? groupNumber(number) : maskNumber(number)}</Text>
      <View style={[styles.rowBetween, { marginTop: "auto", alignItems: "flex-end" }]}>
        <View style={{ flexDirection: "row", gap: 18 }}>
          <View>
            <Text size={9} color="rgba(255,255,255,0.65)">CARD HOLDER</Text>
            <Text size={12} weight="bold" color="#fff" numberOfLines={1}>{holder.toUpperCase()}</Text>
          </View>
          <View>
            <Text size={9} color="rgba(255,255,255,0.65)">EXPIRES</Text>
            <Text size={12} weight="bold" color="#fff" tabular>{revealed && expiry ? expiry : "••/••"}</Text>
          </View>
        </View>
        <BrandMark brand={brand} />
      </View>
      {frozen ? <FrozenOverlay /> : null}
    </LinearGradient>
  );
}

export function CardBack({ brand, theme, cvv, revealed, frozen }: FaceProps) {
  return (
    <LinearGradient colors={theme.colors as [string, string, ...string[]]} locations={theme.locations as any} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={[styles.face, { paddingHorizontal: 0 }]}>
      <View style={{ height: 40, backgroundColor: "#111", marginTop: 4 }} />
      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 14, paddingHorizontal: 18, gap: 10 }}>
        <View style={{ flex: 1, height: 34, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.85)", justifyContent: "center", paddingHorizontal: 8 }}>
          <View style={{ height: 1, backgroundColor: "#ccc", marginVertical: 3 }} />
          <View style={{ height: 1, backgroundColor: "#ccc", marginVertical: 3 }} />
        </View>
        <View style={{ width: 62, height: 34, borderRadius: 4, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
          <Text size={8} color="#666">CVV</Text>
          <Text weight="extrabold" size={14} color="#111" tabular>{revealed && cvv ? cvv : "•••"}</Text>
        </View>
      </View>
      <Text size={9} color="rgba(255,255,255,0.75)" style={{ paddingHorizontal: 18, marginTop: 12, lineHeight: 13 }}>
        This card is issued by AutoBiz Card Services for online payments in USD. Use the billing address shown in the app. Report issues: help@autobiz.ng
      </Text>
      <View style={{ marginTop: "auto", alignSelf: "flex-end", paddingHorizontal: 18 }}>
        <BrandMark brand={brand} size={0.85} />
      </View>
      {frozen ? <FrozenOverlay /> : null}
    </LinearGradient>
  );
}

function FrozenOverlay() {
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(210,235,255,0.42)", alignItems: "center", justifyContent: "center", borderRadius: radius.xl }]}>
      <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: "rgba(255,255,255,0.6)", alignItems: "center", justifyContent: "center" }}>
        <Icon name="bi-snow2" size={28} color="#1971c2" />
      </View>
      <Text weight="bold" color="#0b3a66" style={{ marginTop: 6 }}>Card frozen</Text>
    </View>
  );
}

/** 3D flip card. Tap to flip. */
export function FlipCard({ face, flipped, onToggle, style }: { face: FaceProps; flipped: boolean; onToggle?: () => void; style?: StyleProp<ViewStyle> }) {
  const a = useRef(new Animated.Value(flipped ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(a, { toValue: flipped ? 1 : 0, friction: 8, tension: 40, useNativeDriver: true }).start();
  }, [flipped, a]);
  const front = a.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
  const back = a.interpolate({ inputRange: [0, 1], outputRange: ["180deg", "360deg"] });
  const frontOp = a.interpolate({ inputRange: [0.49, 0.5], outputRange: [1, 0], extrapolate: "clamp" });
  const backOp = a.interpolate({ inputRange: [0.49, 0.5], outputRange: [0, 1], extrapolate: "clamp" });
  return (
    <Pressable onPress={onToggle} accessibilityRole="button" accessibilityLabel="Flip card" style={[{ width: "100%", aspectRatio: 1.586 }, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, { backfaceVisibility: "hidden", opacity: frontOp, transform: [{ perspective: 1000 }, { rotateY: front }] }]}>
        <CardFront {...face} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { backfaceVisibility: "hidden", opacity: backOp, transform: [{ perspective: 1000 }, { rotateY: back }] }]}>
        <CardBack {...face} />
      </Animated.View>
    </Pressable>
  );
}

/** Static card (create preview / empty hero) */
export function StaticCard({ face, style }: { face: FaceProps; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ width: "100%", aspectRatio: 1.586 }, style]}>
      <CardFront {...face} />
    </View>
  );
}

/** Mini thumbnail used in the selector row */
export function CardThumb({ card, theme, selected, onPress }: { card: VirtualCard; theme: Theme; selected: boolean; onPress: () => void }) {
  const frozen = card.status === "frozen";
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`${card.label} card ending ${last4(card.number)}`}>
      <LinearGradient
        colors={(frozen ? ["#adb5bd", "#6c757d"] : theme.colors) as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: 128, height: 80, borderRadius: 14, padding: 10, justifyContent: "space-between", borderWidth: 2.5, borderColor: selected ? "#fff" : "transparent", opacity: selected ? 1 : 0.75, ...(selected ? shadow(2) : {}) }}
      >
        <View style={styles.rowBetween}>
          <Text size={11} weight="bold" color="#fff" numberOfLines={1} style={{ flex: 1 }}>{card.label}</Text>
          {frozen ? <Icon name="bi-snow2" size={12} color="#fff" /> : null}
        </View>
        <Text size={13} weight="extrabold" color="#fff" tabular>{usd(card.balance)}</Text>
        <View style={styles.rowBetween}>
          <Text size={10} color="rgba(255,255,255,0.85)" tabular>•••• {last4(card.number)}</Text>
          <BrandMark brand={card.brand} size={0.5} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  face: { flex: 1, borderRadius: radius.xl, padding: 18, overflow: "hidden" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});
