import React, { useState } from "react";
import { Pressable, View } from "react-native";
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import { Row, Text } from "@/components/ui";
import { naira, nairaCompact } from "@/lib/format";
import { font, useTheme } from "@/theme";

/** Semicircle budget gauge (r=72) with needle. */
export function BudgetGauge({ spent, budget }: { spent: number; budget: number }) {
  const { c } = useTheme();
  const r = 72, sw = 16, cx = 90, cy = 88;
  const fill = Math.min(spent / budget, 1);
  const over = spent > budget;
  const len = Math.PI * r;
  const arc = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const ang = Math.PI * (1 - fill);
  const nx = cx + (r - 22) * Math.cos(ang), ny = cy - (r - 22) * Math.sin(ang);
  const pct = Math.round((spent / budget) * 100);
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={180} height={104}>
        <Path d={arc} stroke={c.surface2} strokeWidth={sw} fill="none" strokeLinecap="round" />
        <Path d={arc} stroke={over ? c.danger : c.primary} strokeWidth={sw} fill="none" strokeLinecap="round" strokeDasharray={`${len * fill} ${len}`} />
        <Line x1={cx} y1={cy} x2={nx} y2={ny} stroke={c.text} strokeWidth={3} strokeLinecap="round" />
        <Circle cx={cx} cy={cy} r={6} fill={c.text} />
      </Svg>
      <Text variant="h2" tabular style={{ marginTop: -6 }} color={over ? c.danger : c.text}>{pct}%</Text>
      <Row justify="space-between" style={{ width: 180, marginTop: -2 }}>
        <Text variant="xs" muted>₦0</Text>
        <Text variant="xs" muted>Spent vs Budget</Text>
        <Text variant="xs" muted>{nairaCompact(budget)}</Text>
      </Row>
    </View>
  );
}

/** Grouped bar chart: this period (primary) vs last period (muted). */
export function CompareBars({ labels, cur, prev, legend }: { labels: string[]; cur: number[]; prev: number[]; legend: [string, string] }) {
  const { c } = useTheme();
  const [sel, setSel] = useState<number | null>(null);
  const [w, setW] = useState(300);
  const H = 170, left = 44, bottom = 22, top = 8;
  const max = Math.max(1, ...cur, ...prev);
  const step = Math.ceil((max * 1.1) / 4 / 5000) * 5000;
  const yTop = step * 4;
  const plotW = w - left, plotH = H - bottom - top;
  const gw = plotW / labels.length;
  const bw = Math.min(14, gw / 3.2);
  const y = (v: number) => top + plotH - (v / yTop) * plotH;
  const tick = (v: number) => (v >= 1e6 ? `₦${(v / 1e6).toFixed(1)}m` : v === 0 ? "₦0" : `₦${Math.round(v / 1000)}k`);
  return (
    <View>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        <Svg width={w} height={H}>
          {[0, 1, 2, 3, 4].map((i) => (
            <React.Fragment key={i}>
              <Line x1={left} x2={w} y1={y(step * i)} y2={y(step * i)} stroke={c.border} strokeDasharray="3 4" />
              <SvgText x={0} y={y(step * i) + 4} fontSize={10} fill={c.muted} fontFamily={font.medium}>{tick(step * i)}</SvgText>
            </React.Fragment>
          ))}
          {labels.map((l, i) => {
            const gx = left + gw * i + gw / 2;
            const on = sel === i;
            return (
              <React.Fragment key={l + i}>
                <Rect x={gx - bw - 2} y={y(cur[i])} width={bw} height={Math.max(2, top + plotH - y(cur[i]))} rx={bw / 2.5} fill={c.primary} opacity={sel === null || on ? 1 : 0.45} />
                <Rect x={gx + 2} y={y(prev[i])} width={bw} height={Math.max(2, top + plotH - y(prev[i]))} rx={bw / 2.5} fill={c.chartMuted} />
                <SvgText x={gx} y={H - 6} fontSize={10} fill={on ? c.text : c.muted} textAnchor="middle" fontFamily={font.semibold}>{l}</SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
        <Row style={{ position: "absolute", left, right: 0, top: 0, bottom: bottom }} gap={0}>
          {labels.map((l, i) => (
            <Pressable key={l + i} style={{ flex: 1, height: "100%" }} onPress={() => setSel(sel === i ? null : i)} accessibilityLabel={`${l}: ${legend[0]} ${naira(cur[i])}, ${legend[1]} ${naira(prev[i])}`} />
          ))}
        </Row>
      </View>
      <Row justify="space-between" style={{ marginTop: 8 }}>
        <Row gap={14}>
          <Row gap={6}><View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: c.primary }} /><Text variant="xs" muted>{legend[0]}</Text></Row>
          <Row gap={6}><View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: c.chartMuted }} /><Text variant="xs" muted>{legend[1]}</Text></Row>
        </Row>
        {sel !== null ? <Text variant="xs" weight="semibold">{labels[sel]}: {naira(cur[sel])} · {naira(prev[sel])}</Text> : <Text variant="xs" muted>Tap a bar</Text>}
      </Row>
    </View>
  );
}
