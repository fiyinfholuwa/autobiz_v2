/* Lightweight slider (no native dependency). */
import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
import { PanResponder, View, type LayoutChangeEvent } from "react-native";
import { useTheme } from "@/theme";

export default function RangeSlider({ min, max, step = 1, value, onChange }: { min: number; max: number; step?: number; value: number; onChange: (v: number) => void }) {
  const { c } = useTheme();
  const [w, setW] = useState(1);
  const wRef = useRef(1);
  const last = useRef(value);
  const cb = useRef(onChange);
  cb.current = onChange;
  const startX = useRef(0);
  const toVal = (x: number) => {
    const f = Math.max(0, Math.min(1, x / wRef.current));
    const v = Math.round((min + f * (max - min)) / step) * step;
    return Math.max(min, Math.min(max, v));
  };
  const emit = (x: number) => {
    const v = toVal(x);
    if (v !== last.current) { last.current = v; Haptics.selectionAsync().catch(() => {}); cb.current(v); }
  };
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => { startX.current = e.nativeEvent.locationX; emit(startX.current); },
      onPanResponderMove: (_, g) => emit(startX.current + g.dx),
    })
  ).current;
  const f = (value - min) / (max - min);
  return (
    <View
      onLayout={(e: LayoutChangeEvent) => { wRef.current = e.nativeEvent.layout.width; setW(e.nativeEvent.layout.width); }}
      style={{ height: 36, justifyContent: "center" }}
      accessibilityRole="adjustable"
      accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(e) => onChange(Math.max(min, Math.min(max, value + (e.nativeEvent.actionName === "increment" ? step : -step))))}
      {...pan.panHandlers}
    >
      <View pointerEvents="none" style={{ height: 6, borderRadius: 3, backgroundColor: c.surface2 }}>
        <View style={{ width: `${f * 100}%`, height: 6, borderRadius: 3, backgroundColor: c.primary }} />
      </View>
      <View pointerEvents="none" style={{ position: "absolute", left: Math.max(0, f * w - 13), width: 26, height: 26, borderRadius: 13, backgroundColor: "#fff", borderWidth: 3, borderColor: c.primary, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3 }} />
    </View>
  );
}
