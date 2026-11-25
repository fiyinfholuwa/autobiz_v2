import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import { Animated, Image, Pressable, ScrollView, Switch as RNSwitch, View, type StyleProp, type ViewStyle } from "react-native";
import { radius, shadow, toneGradient, useTheme } from "@/theme";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { Text } from "./Text";

const tap = () => Haptics.selectionAsync().catch(() => {});

/* ---------------- Layout ---------------- */
export function Row({ children, gap = 8, align = "center", justify, wrap, style }: { children?: React.ReactNode; gap?: number; align?: ViewStyle["alignItems"]; justify?: ViewStyle["justifyContent"]; wrap?: boolean; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: "row", alignItems: align, justifyContent: justify, gap, flexWrap: wrap ? "wrap" : undefined }, style]}>{children}</View>;
}
export const Spacer = ({ h = 12, w }: { h?: number; w?: number }) => <View style={{ height: w ? undefined : h, width: w }} />;
export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return <View style={[{ height: 1, backgroundColor: c.border, marginVertical: 12 }, style]} />;
}

/* ---------------- Card ---------------- */
export function Card({ children, style, onPress, padded = true, elevated = true }: { children?: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; padded?: boolean; elevated?: boolean }) {
  const { c, dark } = useTheme();
  const base: ViewStyle = { backgroundColor: c.surface, borderRadius: radius.xl, padding: padded ? 16 : 0, borderWidth: dark ? 1 : 0, borderColor: c.border, ...(elevated ? shadow(1, dark) : {}) };
  if (onPress)
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [base, { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] }, style]}>
        {children}
      </Pressable>
    );
  return <View style={[base, style]}>{children}</View>;
}

export function SectionHeader({ title, subtitle, action, onAction, style }: { title: string; subtitle?: string; action?: string; onAction?: () => void; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <Row justify="space-between" style={[{ marginBottom: 10 }, style]}>
      <View style={{ flex: 1 }}>
        <Text variant="h3">{title}</Text>
        {subtitle ? <Text variant="xs" muted style={{ marginTop: 2 }}>{subtitle}</Text> : null}
      </View>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text variant="sm" weight="bold" color={c.primary}>{action}</Text>
        </Pressable>
      ) : null}
    </Row>
  );
}

/* ---------------- Icon tile ---------------- */
export function IconTile({ icon, tone = "primary", size = 44, color, bg, rounded, solid }: { icon: string; tone?: string; size?: number; color?: string; bg?: string; rounded?: boolean; solid?: boolean }) {
  const { tone: t } = useTheme();
  const tc = t(tone);
  if (solid) {
    const g = toneGradient[tone] || toneGradient.primary;
    return (
      <LinearGradient colors={g} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: size, height: size, borderRadius: rounded ? size / 2 : size * 0.3, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={size * 0.48} color="#fff" />
      </LinearGradient>
    );
  }
  return (
    <View style={{ width: size, height: size, borderRadius: rounded ? size / 2 : size * 0.3, backgroundColor: bg ?? tc.bg, alignItems: "center", justifyContent: "center" }}>
      <Icon name={icon} size={size * 0.48} color={color ?? tc.fg} />
    </View>
  );
}

/** Brand tile: solid color square with an icon or short text (networks, providers, airlines, gift cards) */
export function BrandTile({ color, icon, text, size = 44, fg = "#fff", image }: { color: string; icon?: string; text?: string; size?: number; fg?: string; image?: any }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.28, backgroundColor: color, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      {image ? <Image source={image} style={{ width: size, height: size }} resizeMode="cover" /> : icon ? <Icon name={icon} size={size * 0.5} color={fg} /> : <Text weight="extrabold" size={Math.max(10, size * 0.3)} color={fg}>{text}</Text>}
    </View>
  );
}

/* ---------------- Badges / pills ---------------- */
export function Badge({ label, tone = "primary", icon, solid, style }: { label: string; tone?: string; icon?: string; solid?: boolean; style?: StyleProp<ViewStyle> }) {
  const { tone: t } = useTheme();
  const tc = t(tone);
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: solid ? tc.fg : tc.bg }, style]}>
      {icon ? <Icon name={icon} size={12} color={solid ? "#fff" : tc.fg} /> : null}
      <Text size={11} weight="bold" color={solid ? "#fff" : tc.fg}>{label}</Text>
    </View>
  );
}

const STATUS_TONE: Record<string, string> = {
  success: "success", successful: "success", completed: "success", active: "success", delivered: "success", confirmed: "success", paid: "success",
  pending: "warning", processing: "warning", "not installed": "primary", info: "primary", shipped: "primary",
  failed: "danger", declined: "danger", cancelled: "danger", expired: "neutral", reversed: "neutral", neutral: "neutral", archived: "neutral", frozen: "cyan", completedpast: "neutral",
};
export function StatusPill({ status, label, tone }: { status: string; label?: string; tone?: string }) {
  const { tone: t } = useTheme();
  const tc = t(tone || STATUS_TONE[status.toLowerCase()] || "neutral");
  const text = label ?? status[0].toUpperCase() + status.slice(1);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: tc.bg }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: tc.fg }} />
      <Text size={11} weight="bold" color={tc.fg}>{text}</Text>
    </View>
  );
}

export function Avatar({ text, size = 40, color, bg }: { text: string; size?: number; color?: string; bg?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg ?? c.primarySoft, alignItems: "center", justifyContent: "center" }}>
      <Text weight="bold" size={size * 0.36} color={color ?? c.primary}>{text}</Text>
    </View>
  );
}

/* ---------------- Chips / segments ---------------- */
export function Chip({ label, active, onPress, icon, count, style, tone }: { label: string; active?: boolean; onPress?: () => void; icon?: string; count?: number; style?: StyleProp<ViewStyle>; tone?: string }) {
  const { c } = useTheme();
  const fg = active ? c.onPrimary : c.text;
  return (
    <Pressable
      onPress={() => { tap(); onPress?.(); }}
      style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, height: 36, borderRadius: radius.pill, backgroundColor: active ? (tone ? tone : c.primary) : c.surface, borderWidth: 1, borderColor: active ? "transparent" : c.border, opacity: pressed ? 0.8 : 1 }, style]}
    >
      {icon ? <Icon name={icon} size={15} color={fg} /> : null}
      <Text size={13} weight="semibold" color={fg}>{label}</Text>
      {count !== undefined ? (
        <View style={{ minWidth: 18, paddingHorizontal: 5, height: 18, borderRadius: 9, backgroundColor: active ? "rgba(255,255,255,0.25)" : c.surface2, alignItems: "center", justifyContent: "center" }}>
          <Text size={10} weight="bold" color={fg}>{count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function ChipRow({ children, style, contentStyle }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; contentStyle?: StyleProp<ViewStyle> }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[{ flexGrow: 0 }, style]} contentContainerStyle={[{ gap: 8, paddingHorizontal: 16 }, contentStyle]}>
      {children}
    </ScrollView>
  );
}

export function Segment<T extends string>({ options, value, onChange, style, small }: { options: { value: T; label: string; badge?: number; icon?: string }[]; value: T; onChange: (v: T) => void; style?: StyleProp<ViewStyle>; small?: boolean }) {
  const { c, dark } = useTheme();
  return (
    <View style={[{ flexDirection: "row", backgroundColor: dark ? c.surface2 : "#eceef1", borderRadius: radius.md + 2, padding: 4, gap: 4 }, style]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => { tap(); onChange(o.value); }}
            style={{ flex: 1, height: small ? 32 : 38, borderRadius: radius.md - 2, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6, backgroundColor: on ? c.surface : "transparent", ...(on ? shadow(1, dark) : {}) }}
          >
            {o.icon ? <Icon name={o.icon} size={14} color={on ? c.text : c.muted} /> : null}
            <Text size={small ? 12 : 13} weight={on ? "bold" : "semibold"} color={on ? c.text : c.muted} numberOfLines={1}>{o.label}</Text>
            {o.badge ? (
              <View style={{ minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" }}>
                <Text size={10} weight="bold" color="#fff">{o.badge}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Selectable tile (radio/option card). */
export function OptionCard({ selected, onPress, children, style, disabled }: { selected?: boolean; onPress?: () => void; children: React.ReactNode; style?: StyleProp<ViewStyle>; disabled?: boolean }) {
  const { c } = useTheme();
  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected: !!selected, disabled }}
      onPress={() => { tap(); onPress?.(); }}
      style={({ pressed }) => [{ borderRadius: radius.lg, borderWidth: 1.5, borderColor: selected ? c.primary : c.border, backgroundColor: selected ? c.primarySoft : c.surface, padding: 12, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 }, style]}
    >
      {children}
      {selected ? (
        <View style={{ position: "absolute", top: 6, right: 6 }}>
          <Icon name="bi-check-circle-fill" size={18} color={c.primary} />
        </View>
      ) : null}
    </Pressable>
  );
}

/* ---------------- Progress / skeleton ---------------- */
export function ProgressBar({ value, color, height = 8, track, style }: { value: number; color?: string; height?: number; track?: string; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const v = Math.max(0, Math.min(1, value || 0));
  return (
    <View style={[{ height, borderRadius: height, backgroundColor: track ?? c.surface2, overflow: "hidden" }, style]}>
      <View style={{ width: `${v * 100}%`, height, borderRadius: height, backgroundColor: color ?? c.primary }} />
    </View>
  );
}

export function Skeleton({ w = "100%", h = 14, r = 8, style }: { w?: number | `${number}%`; h?: number; r?: number; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const a = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([Animated.timing(a, { toValue: 1, duration: 650, useNativeDriver: true }), Animated.timing(a, { toValue: 0.5, duration: 650, useNativeDriver: true })]));
    loop.start();
    return () => loop.stop();
  }, [a]);
  return <Animated.View style={[{ width: w, height: h, borderRadius: r, backgroundColor: c.border, opacity: a }, style]} />;
}

/* ---------------- Empty state ---------------- */
export function EmptyState({ icon = "bi-inbox", tone = "primary", title, message, action, onAction, style }: { icon?: string; tone?: string; title: string; message?: string; action?: string; onAction?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ alignItems: "center", paddingVertical: 32, paddingHorizontal: 24 }, style]}>
      <IconTile icon={icon} tone={tone} size={64} rounded />
      <Text variant="h3" center style={{ marginTop: 14 }}>{title}</Text>
      {message ? <Text variant="sm" muted center style={{ marginTop: 6, maxWidth: 300 }}>{message}</Text> : null}
      {action ? <Button title={action} onPress={onAction} size="sm" style={{ marginTop: 16 }} /> : null}
    </View>
  );
}

/* ---------------- Summary rows (label/value) ---------------- */
export type SummaryRow = [string, React.ReactNode] | [string, React.ReactNode, { bold?: boolean; color?: string }];
export function Summary({ rows, style, total }: { rows: SummaryRow[]; style?: StyleProp<ViewStyle>; total?: [string, React.ReactNode] }) {
  const { c } = useTheme();
  return (
    <View style={[{ backgroundColor: c.surface2, borderRadius: radius.lg, padding: 14, gap: 10 }, style]}>
      {rows.map(([k, v, o], i) => (
        <Row key={k + i} justify="space-between" align="flex-start" gap={12}>
          <Text variant="sm" muted style={{ flexShrink: 0, maxWidth: "45%" }}>{k}</Text>
          {typeof v === "string" || typeof v === "number" ? (
            <Text variant="sm" weight={o?.bold ? "bold" : "semibold"} color={o?.color} style={{ flex: 1, textAlign: "right" }} selectable>{v}</Text>
          ) : (
            <View style={{ flex: 1, alignItems: "flex-end" }}>{v}</View>
          )}
        </Row>
      ))}
      {total ? (
        <>
          <View style={{ height: 1, backgroundColor: c.border }} />
          <Row justify="space-between">
            <Text weight="bold">{total[0]}</Text>
            {typeof total[1] === "string" ? <Text variant="h3" tabular>{total[1]}</Text> : total[1]}
          </Row>
        </>
      ) : null}
    </View>
  );
}

/* ---------------- List row ---------------- */
export function ListRow({ icon, tone, left, title, subtitle, right, onPress, chevron, style, danger }: { icon?: string; tone?: string; left?: React.ReactNode; title: string; subtitle?: string; right?: React.ReactNode; onPress?: () => void; chevron?: boolean; style?: StyleProp<ViewStyle>; danger?: boolean }) {
  const { c } = useTheme();
  const body = (
    <>
      {left ?? (icon ? <IconTile icon={icon} tone={danger ? "danger" : tone} size={40} /> : null)}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text weight="semibold" numberOfLines={1} color={danger ? c.danger : undefined}>{title}</Text>
        {subtitle ? <Text variant="xs" muted numberOfLines={2} style={{ marginTop: 2 }}>{subtitle}</Text> : null}
      </View>
      {right}
      {chevron ? <Icon name="bi-chevron-right" size={18} color={c.muted} /> : null}
    </>
  );
  const st: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 };
  if (onPress) return <Pressable onPress={() => { tap(); onPress(); }} style={({ pressed }) => [st, { opacity: pressed ? 0.6 : 1 }, style]}>{body}</Pressable>;
  return <View style={[st, style]}>{body}</View>;
}

export function SwitchRow({ title, subtitle, value, onChange, disabled, icon, tone }: { title: string; subtitle?: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean; icon?: string; tone?: string }) {
  const { c } = useTheme();
  return (
    <ListRow
      icon={icon}
      tone={tone}
      title={title}
      subtitle={subtitle}
      right={<RNSwitch value={value} disabled={disabled} onValueChange={(v) => { tap(); onChange(v); }} trackColor={{ true: c.primary, false: c.border }} thumbColor="#fff" ios_backgroundColor={c.border} />}
    />
  );
}

/** Alert/notice box */
export function Notice({ tone = "primary", icon = "bi-info-circle", children, style }: { tone?: string; icon?: string; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { tone: t } = useTheme();
  const tc = t(tone);
  return (
    <View style={[{ flexDirection: "row", gap: 10, padding: 12, borderRadius: radius.md, backgroundColor: tc.bg, alignItems: "flex-start" }, style]}>
      <Icon name={icon} size={18} color={tc.fg} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>{typeof children === "string" ? <Text variant="sm" color={tc.fg}>{children}</Text> : children}</View>
    </View>
  );
}

/** Stars rating */
export function Stars({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <Row gap={1}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon key={i} name={rating >= i ? "bi-star-fill" : rating >= i - 0.5 ? "bi-star-half" : "bi-star"} size={size} color="#f59f00" />
      ))}
    </Row>
  );
}

/** Country flag from flagcdn */
export function Flag({ code, size = 32, round = true }: { code: string; size?: number; round?: boolean }) {
  const { c } = useTheme();
  return (
    <Image
      source={{ uri: `https://flagcdn.com/w80/${code.toLowerCase()}.png` }}
      style={{ width: size, height: round ? size : size * 0.72, borderRadius: round ? size / 2 : 4, backgroundColor: c.surface2 }}
      resizeMode="cover"
    />
  );
}

/** Product art — gradient tile with icon (no external images). */
export function ProductArt({ icon, tone, size = 72, style, iconScale = 0.42, rotate }: { icon: string; tone: string; size?: number | "100%"; style?: StyleProp<ViewStyle>; iconScale?: number; rotate?: string }) {
  const { tone: t, dark } = useTheme();
  const tc = t(tone);
  const g = toneGradient[tone] || toneGradient.primary;
  const n = typeof size === "number" ? size : 160;
  return (
    <View style={[{ width: size, aspectRatio: 1, borderRadius: n * 0.18, backgroundColor: tc.bg, alignItems: "center", justifyContent: "center", overflow: "hidden" }, style]}>
      <LinearGradient colors={[g[0] + (dark ? "33" : "22"), "transparent"]} style={{ position: "absolute", inset: 0 } as any} />
      <View style={{ transform: rotate ? [{ rotate }] : undefined }}>
        <Icon name={icon} size={n * iconScale} color={tc.fg} />
      </View>
    </View>
  );
}

/** Quantity stepper */
export function Stepper({ value, onChange, min = 1, max = 99, size = 36, minusIcon }: { value: number; onChange: (v: number) => void; min?: number; max?: number; size?: number; minusIcon?: string }) {
  const { c } = useTheme();
  const btn = (icon: string, dis: boolean, fn: () => void, label: string) => (
    <Pressable accessibilityLabel={label} disabled={dis} onPress={() => { tap(); fn(); }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.surface2, alignItems: "center", justifyContent: "center", opacity: dis ? 0.35 : 1 }}>
      <Icon name={icon} size={size * 0.5} color={c.text} />
    </Pressable>
  );
  return (
    <Row gap={10}>
      {btn(minusIcon && value <= min ? minusIcon : "bi-dash-lg", value <= min && !minusIcon, () => onChange(value - 1), "Decrease")}
      <Text weight="bold" tabular style={{ minWidth: 22, textAlign: "center" }}>{value}</Text>
      {btn("bi-plus-lg", value >= max, () => onChange(value + 1), "Increase")}
    </Row>
  );
}

/** Small key/value tile used in stat grids */
export function Stat({ label, value, icon, tone = "primary", style }: { label: string; value: string; icon?: string; tone?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <Card style={[{ flex: 1, padding: 14 }, style]}>
      {icon ? <IconTile icon={icon} tone={tone} size={34} /> : null}
      <Text variant="xs" muted style={{ marginTop: icon ? 10 : 0 }}>{label}</Text>
      <Text variant="h3" tabular numberOfLines={1} adjustsFontSizeToFit style={{ marginTop: 2 }}>{value}</Text>
    </Card>
  );
}
