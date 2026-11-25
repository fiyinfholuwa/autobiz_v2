import React, { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { Badge, FieldError, Icon, Row, Sheet, Text, TextField } from "@/components/ui";
import { dur, hhmm, naira } from "@/lib/format";
import type { Cabin, Flight } from "@/store";
import { radius, useTheme } from "@/theme";
import { airlineColor, airlineName, airportName, allAirports, baggage, cabinOf, fareFor, nextDay, refundableFor } from "./engine";

export function AirlineLogo({ code, size = 40 }: { code: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.28, backgroundColor: airlineColor(code), alignItems: "center", justifyContent: "center" }}>
      <Text weight="extrabold" size={size * 0.32} color="#fff">{code}</Text>
    </View>
  );
}

/* ---------------- Airport picker ---------------- */
export function AirportField({ label, value, onChange, icon, error, compact }: { label: string; value: string; onChange: (code: string) => void; icon: string; error?: string | null; compact?: boolean }) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const a = allAirports.find((x) => x.code === value);
  const list = useMemo(() => {
    const s = q.toLowerCase().replace(/\(.*?\)/g, "").trim();
    if (!s) return allAirports;
    return allAirports
      .filter((x) => [x.code, x.city, x.name, x.country].some((v) => v.toLowerCase().includes(s)))
      .sort((x, y) => Number(y.code.toLowerCase() === s) - Number(x.code.toLowerCase() === s) || Number(y.city.toLowerCase().startsWith(s)) - Number(x.city.toLowerCase().startsWith(s)));
  }, [q]);
  return (
    <View style={{ flex: 1 }}>
      <Pressable
        onPress={() => { setQ(""); setOpen(true); }}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => ({ padding: compact ? 10 : 12, borderRadius: radius.lg, borderWidth: 1.5, borderColor: error ? c.danger : c.border, backgroundColor: pressed ? c.surface2 : c.surface })}
      >
        <Row gap={6}>
          <Icon name={icon} size={14} color={c.muted} />
          <Text variant="xs" muted>{label}</Text>
        </Row>
        {a ? (
          <>
            <Text variant="h2" style={{ marginTop: 2 }}>{a.code}</Text>
            <Text variant="xs" muted numberOfLines={1}>{a.city}, {a.country}</Text>
          </>
        ) : (
          <>
            <Text variant="h2" muted style={{ marginTop: 2 }}>—</Text>
            <Text variant="xs" muted>City or airport</Text>
          </>
        )}
      </Pressable>
      <FieldError error={error} />
      <Sheet visible={open} onClose={() => setOpen(false)} title={label} scroll maxHeight={0.85}>
        <TextField icon="bi-search" placeholder="City or airport" value={q} onChangeText={setQ} autoFocus autoCorrect={false} containerStyle={{ marginBottom: 8 }} />
        {list.map((x) => (
          <Pressable key={x.code} onPress={() => { onChange(x.code); setOpen(false); }} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, paddingHorizontal: 8, borderRadius: radius.md, backgroundColor: x.code === value ? c.primarySoft : pressed ? c.surface2 : "transparent" })}>
            <View style={{ width: 48, paddingVertical: 4, borderRadius: radius.sm, backgroundColor: c.surface2, alignItems: "center" }}>
              <Text weight="extrabold" size={13}>{x.code}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text weight="semibold">{x.city}, {x.country}</Text>
              <Text variant="xs" muted>{x.name}</Text>
            </View>
          </Pressable>
        ))}
        {list.length === 0 ? <Text muted center style={{ padding: 20 }}>No airports match “{q}”</Text> : null}
      </Sheet>
    </View>
  );
}

/* ---------------- Times line ---------------- */
export function TimesLine({ f, big }: { f: Flight; big?: boolean }) {
  const { c } = useTheme();
  const nd = nextDay(f.arr);
  return (
    <Row gap={10} align="center">
      <View>
        <Text variant={big ? "h2" : "h3"} tabular>{hhmm(f.dep)}</Text>
        <Text variant="xs" muted weight="semibold">{f.from}</Text>
      </View>
      <View style={{ flex: 1, alignItems: "center" }}>
        <Text variant="xs" muted>{dur(f.duration)}</Text>
        <Row gap={0} style={{ width: "100%", marginVertical: 3 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, borderWidth: 1.5, borderColor: c.muted }} />
          <View style={{ flex: 1, height: 1.5, backgroundColor: c.border }} />
          {f.stops ? <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.warning }} /> : null}
          {f.stops ? <View style={{ flex: 1, height: 1.5, backgroundColor: c.border }} /> : null}
          <Icon name="ion:airplane" size={13} color={c.primary} />
        </Row>
        <Text variant="xs" weight="semibold" color={f.stops ? c.warningText : c.success}>{f.stops ? `1 stop · ${f.via?.code}` : "Direct"}</Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Row gap={2} align="flex-start">
          <Text variant={big ? "h2" : "h3"} tabular>{hhmm(f.arr)}</Text>
          {nd ? <Text size={10} weight="bold" color={c.danger}>+{nd}</Text> : null}
        </Row>
        <Text variant="xs" muted weight="semibold">{f.to}</Text>
      </View>
    </Row>
  );
}

/* ---------------- Itinerary timeline ---------------- */
export function FlightTimeline({ f, cabin }: { f: Flight; cabin: Cabin }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 2, marginTop: 4 }}>
      {f.segments.map((s, i) => (
        <View key={i}>
          <Row align="flex-start" gap={10}>
            <View style={{ alignItems: "center", width: 14 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: c.primary, marginTop: 4 }} />
              <View style={{ width: 2, flex: 1, minHeight: 34, backgroundColor: c.border }} />
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.primary }} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <View>
                <Text variant="sm" weight="bold">{hhmm(s.dep)} · {s.fromCity} ({s.from})</Text>
                <Text variant="xs" muted>{airportName(s.from)}</Text>
              </View>
              <Text variant="xs" muted>{airlineName(f.airline)} {s.flightNo} · {dur(s.mins)} · {cabinOf(cabin).label}</Text>
              <View>
                <Text variant="sm" weight="bold">{hhmm(s.arr)} · {s.toCity} ({s.to})</Text>
                <Text variant="xs" muted>{airportName(s.to)}</Text>
              </View>
            </View>
          </Row>
          {i < f.segments.length - 1 ? (
            <Row gap={6} style={{ marginLeft: 24, marginVertical: 8, padding: 8, borderRadius: radius.sm, backgroundColor: c.warningSoft }}>
              <Icon name="bi-clock" size={13} color={c.warningText} />
              <Text variant="xs" weight="semibold" color={c.warningText}>{dur(f.layover)} layover in {s.toCity}</Text>
            </Row>
          ) : null}
        </View>
      ))}
    </View>
  );
}

/* ---------------- Flight card ---------------- */
export function FlightCard({ f, cabin, travellers, totalFor, tag, onSelect }: { f: Flight; cabin: Cabin; travellers: number; totalFor: number; tag?: { label: string; tone: string }; onSelect: () => void }) {
  const { c, dark } = useTheme();
  const [open, setOpen] = useState(false);
  const fare = fareFor(f, cabin);
  const bag = baggage(f, cabin);
  const refundable = refundableFor(f, cabin);
  return (
    <View style={{ backgroundColor: c.surface, borderRadius: radius.xl, padding: 14, borderWidth: dark ? 1 : 0, borderColor: c.border, marginBottom: 12 }}>
      <Row justify="space-between" style={{ marginBottom: 12 }}>
        <Row gap={10} style={{ flex: 1 }}>
          <AirlineLogo code={f.airline} size={36} />
          <View style={{ flex: 1 }}>
            <Text weight="bold" numberOfLines={1}>{airlineName(f.airline)}</Text>
            <Text variant="xs" muted numberOfLines={1}>{f.segments.map((s) => s.flightNo).join(" · ")}</Text>
          </View>
        </Row>
        {tag ? <Badge label={tag.label} tone={tag.tone} /> : null}
      </Row>
      <TimesLine f={f} />
      <Row wrap gap={6} style={{ marginTop: 12 }}>
        <Badge label={bag.hold} icon="bi-bag" tone="neutral" />
        <Badge label={`${cabinOf(cabin).label} cabin`} tone="neutral" />
        <Badge label={refundable ? "Refundable" : "Non-refundable"} tone={refundable ? "success" : "neutral"} />
        {f.seatsLeft <= 5 ? <Badge label={`${f.seatsLeft} seats left`} tone="danger" /> : null}
      </Row>
      {open ? <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.border }}><FlightTimeline f={f} cabin={cabin} /></View> : null}
      <View style={{ height: 1, backgroundColor: c.border, marginVertical: 12 }} />
      <Row justify="space-between">
        <Pressable onPress={() => setOpen((v) => !v)} hitSlop={8}>
          <Row gap={4}>
            <Text variant="sm" weight="semibold" color={c.primary}>Flight details</Text>
            <Icon name={open ? "bi-chevron-up" : "bi-chevron-down"} size={14} color={c.primary} />
          </Row>
        </Pressable>
        <Row gap={12}>
          <View style={{ alignItems: "flex-end" }}>
            <Text variant="h3" tabular>{naira(fare)}</Text>
            <Text variant="xs" muted>{travellers > 1 ? `${naira(totalFor)} for ${travellers}` : "per adult"}</Text>
          </View>
          <Pressable onPress={onSelect} style={({ pressed }) => ({ backgroundColor: c.primary, paddingHorizontal: 18, height: 40, borderRadius: radius.md, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.85 : 1 })}>
            <Text weight="bold" color="#fff">Select</Text>
          </Pressable>
        </Row>
      </Row>
    </View>
  );
}
