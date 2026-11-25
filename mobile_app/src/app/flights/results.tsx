import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { toast } from "@/components/overlay";
import { Button, Checkbox, EmptyState, Header, IconButton, Icon, OptionCard, Row, Screen, Segment, Sheet, Skeleton, SwitchRow, Text, goBack } from "@/components/ui";
import { dur, hhmm, longDay, naira, parseDay, shortDay } from "@/lib/format";
import type { Cabin, Flight } from "@/store";
import { radius, useTheme } from "@/theme";
import { AirlineLogo, FlightCard } from "@/features/flights/components";
import { airlineName, cabinOf, cheapest, cityOf, fareFor, paxFare, plusDays, refundableFor, today } from "@/features/flights/engine";
import { generateFlights } from "@/features/flights/engine";
import { startBooking, useFlights } from "@/features/flights/state";

type Sort = "cheapest" | "fastest" | "best";
const TIMES = [
  { id: "early", label: "Early", sub: "00–06", icon: "ion:moon-outline", test: (m: number) => m < 360 },
  { id: "morning", label: "Morning", sub: "06–12", icon: "ion:partly-sunny-outline", test: (m: number) => m >= 360 && m < 720 },
  { id: "afternoon", label: "Afternoon", sub: "12–18", icon: "ion:sunny-outline", test: (m: number) => m >= 720 && m < 1080 },
  { id: "evening", label: "Evening", sub: "18–24", icon: "ion:cloudy-night-outline", test: (m: number) => m >= 1080 },
];
type Filters = { stops: number[]; times: string[]; maxPrice: number | null; airlines: string[]; refundable: boolean };
const noFilters = (): Filters => ({ stops: [], times: [], maxPrice: null, airlines: [], refundable: false });

export default function FlightResults() {
  const { c } = useTheme();
  const search = useFlights((s) => s.search);
  const legIdx = useFlights((s) => s.legIdx);
  const picks = useFlights((s) => s.picks);
  const set = useFlights((s) => s.set);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<Sort>("best");
  const [filters, setFilters] = useState<Filters>(noFilters());
  const [filterOpen, setFilterOpen] = useState(false);

  const leg = search?.legs[legIdx];
  const key = leg ? `${leg.from}-${leg.to}-${leg.date}-${legIdx}` : "";
  useEffect(() => {
    if (!leg) return;
    setLoading(true);
    setFilters(noFilters());
    const t = setTimeout(() => setLoading(false), 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const all = useMemo(() => (leg ? generateFlights(leg.from, leg.to, leg.date) : []), [leg?.from, leg?.to, leg?.date]);
  if (!search || !leg)
    return (
      <Screen header={<Header title="Flights" />}>
        <EmptyState icon="bi-airplane" title="Start a new search" message="Pick your route and dates to see available flights." action="Search flights" onAction={() => router.replace("/flights")} />
      </Screen>
    );

  const cabin = search.cabin;
  const pax = search.pax;
  const travellers = pax.adults + pax.children + pax.infants;
  const fares = all.map((f) => fareFor(f, cabin));
  const minFare = Math.min(...fares), maxFare = Math.max(...fares);
  const minDur = Math.min(...all.map((f) => f.duration));
  const score = (f: Flight) => fareFor(f, cabin) / minFare + 0.8 * (f.duration / minDur) + 0.25 * f.stops;
  const byCheap = (a: Flight, b: Flight) => fareFor(a, cabin) - fareFor(b, cabin) || a.duration - b.duration;
  const byFast = (a: Flight, b: Flight) => a.duration - b.duration || fareFor(a, cabin) - fareFor(b, cabin);
  const byBest = (a: Flight, b: Flight) => score(a) - score(b);
  const cheapestF = [...all].sort(byCheap)[0];
  const fastestF = [...all].sort(byFast)[0];
  const bestF = [...all].sort(byBest)[0];
  const tagFor = (f: Flight) => (f.id === cheapestF?.id ? { label: "Cheapest", tone: "success" } : f.id === fastestF?.id ? { label: "Fastest", tone: "cyan" } : f.id === bestF?.id ? { label: "Best value", tone: "primary" } : undefined);

  const filtered = all.filter((f) => {
    const fare = fareFor(f, cabin);
    if (filters.stops.length && !filters.stops.includes(f.stops)) return false;
    if (filters.times.length && !TIMES.filter((t) => filters.times.includes(t.id)).some((t) => t.test(f.dep))) return false;
    if (filters.maxPrice !== null && fare > filters.maxPrice) return false;
    if (filters.airlines.length && !filters.airlines.includes(f.airline)) return false;
    if (filters.refundable && !refundableFor(f, cabin)) return false;
    return true;
  });
  const list = [...filtered].sort(sort === "cheapest" ? byCheap : sort === "fastest" ? byFast : byBest);
  const activeCount = filters.stops.length + filters.airlines.length + filters.times.length + (filters.refundable ? 1 : 0) + (filters.maxPrice !== null && filters.maxPrice < maxFare ? 1 : 0);

  const multi = search.legs.length > 1;
  const stepLabel = !multi ? "Select your flight" : search.trip === "round" ? (legIdx === 0 ? "Step 1 of 2 · Select outbound" : "Step 2 of 2 · Select return") : `Flight ${legIdx + 1} of 2 · Select flight`;

  const setLegDate = (date: string) => {
    const legs = search.legs.map((l) => ({ ...l }));
    legs[legIdx].date = date;
    for (let i = legIdx + 1; i < legs.length; i++) if (legs[i].date < legs[i - 1].date) legs[i].date = legs[i - 1].date;
    set({ search: { ...search, legs } });
    useFlights.getState().setForm((f) => {
      const n = { ...f, legs: [{ ...f.legs[0] }, { ...f.legs[1] }] as typeof f.legs };
      if (search.trip === "round") { n.legs[0].date = legs[0].date; n.ret = legs[1].date; }
      else legs.forEach((l, i) => { n.legs[i as 0 | 1].date = l.date; });
      return n;
    });
  };

  const select = (f: Flight) => {
    const newPicks = [...picks.slice(0, legIdx), f];
    if (legIdx < search.legs.length - 1) {
      const legs = search.legs.map((l) => ({ ...l }));
      if (legs[legIdx + 1].date < f.date) legs[legIdx + 1].date = f.date;
      set({ picks: newPicks, legIdx: legIdx + 1, search: { ...search, legs } });
      toast(search.trip === "round" ? "Outbound selected. Now choose your return flight." : "Flight 1 selected. Now choose your second flight.", "success");
    } else {
      set({ picks: newPicks, booking: startBooking(search, newPicks) });
      router.push("/flights/book");
    }
  };

  const minDate = legIdx > 0 ? search.legs[legIdx - 1].date : today();
  const strip = [-3, -2, -1, 0, 1, 2, 3].map((d) => {
    const date = plusDays(leg.date, d);
    const disabled = date < minDate;
    return { date, disabled, price: disabled ? 0 : cheapest(leg.from, leg.to, date, cabin) };
  });
  const lowest = Math.min(...strip.filter((s) => !s.disabled).map((s) => s.price));

  return (
    <Screen
      header={
        <Header
          title={`${cityOf(leg.from)} → ${cityOf(leg.to)}`}
          subtitle={`${longDay(parseDay(leg.date))} · ${travellers} traveller${travellers > 1 ? "s" : ""} · ${cabinOf(cabin).label}`}
          back={() => {
            if (legIdx > 0) set({ legIdx: legIdx - 1, picks: picks.slice(0, legIdx - 1) });
            else goBack("/flights");
          }}
          right={<IconButton icon="bi-sliders" badge={activeCount || undefined} onPress={() => setFilterOpen(true)} accessibilityLabel="Filters" />}
        />
      }
    >
      <Row justify="space-between" style={{ marginBottom: 10 }}>
        <Text variant="label" color={c.primary}>{stepLabel}</Text>
        <Pressable onPress={() => router.navigate("/flights")} hitSlop={8}>
          <Text variant="sm" weight="bold" color={c.primary}>Modify search</Text>
        </Pressable>
      </Row>

      {picks.slice(0, legIdx).map((p, i) => (
        <Row key={p.id} gap={10} style={{ padding: 12, borderRadius: radius.lg, backgroundColor: c.successSoft, marginBottom: 10 }}>
          <Icon name="bi-check-circle-fill" size={20} color={c.success} />
          <View style={{ flex: 1 }}>
            <Text variant="sm" weight="bold" color={c.success}>{search.trip === "round" ? "Outbound" : `Flight ${i + 1}`} selected · {shortDay(parseDay(p.date))}</Text>
            <Text variant="xs" muted>{p.from} {hhmm(p.dep)} → {p.to} {hhmm(p.arr)} · {airlineName(p.airline)} · {naira(fareFor(p, cabin))}</Text>
          </View>
          <Button title="Change" size="sm" variant="outline" onPress={() => set({ legIdx: i, picks: picks.slice(0, i) })} />
        </Row>
      ))}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }} style={{ marginBottom: 12, marginHorizontal: -16 }}>
        <View style={{ width: 8 }} />
        {strip.map((s) => {
          const on = s.date === leg.date;
          return (
            <Pressable
              key={s.date}
              disabled={s.disabled}
              onPress={() => setLegDate(s.date)}
              style={{ width: 92, paddingVertical: 10, borderRadius: radius.lg, alignItems: "center", backgroundColor: on ? c.primary : c.surface, borderWidth: 1, borderColor: on ? c.primary : c.border, opacity: s.disabled ? 0.4 : 1 }}
            >
              <Text variant="xs" weight="semibold" color={on ? "#fff" : c.muted}>{shortDay(parseDay(s.date))}</Text>
              <Text variant="sm" weight="bold" tabular color={on ? "#fff" : s.price === lowest ? c.success : c.text} style={{ marginTop: 2 }}>{s.disabled ? "—" : naira(s.price)}</Text>
            </Pressable>
          );
        })}
        <View style={{ width: 8 }} />
      </ScrollView>

      {loading ? (
        <View style={{ gap: 12 }}>
          <Row gap={8}><Icon name="ion:airplane" size={16} color={c.primary} /><Text variant="sm" muted>Searching 12 airlines…</Text></Row>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ backgroundColor: c.surface, borderRadius: radius.xl, padding: 14, gap: 12 }}>
              <Row gap={10}><Skeleton w={36} h={36} r={10} /><View style={{ flex: 1, gap: 6 }}><Skeleton w="50%" /><Skeleton w="30%" h={10} /></View></Row>
              <Skeleton h={34} />
              <Skeleton w="60%" h={12} />
            </View>
          ))}
        </View>
      ) : (
        <>
          <Segment
            value={sort}
            onChange={setSort}
            options={[
              { value: "cheapest", label: `Cheapest · ${naira(fareFor(cheapestF, cabin))}` },
              { value: "fastest", label: `Fastest · ${dur(fastestF.duration)}` },
              { value: "best", label: "Best" },
            ]}
            small
            style={{ marginBottom: 8 }}
          />
          <Text variant="xs" muted style={{ marginBottom: 12 }}>
            {list.length} flight{list.length === 1 ? "" : "s"} found{list.length !== all.length ? ` (of ${all.length})` : ""} · prices per adult, incl. taxes
          </Text>
          {list.length === 0 ? (
            <EmptyState icon="bi-funnel" title="No flights match your filters" message="Try widening your price range or removing a filter." action="Clear filters" onAction={() => setFilters(noFilters())} />
          ) : (
            list.map((f) => <FlightCard key={f.id} f={f} cabin={cabin} travellers={travellers} totalFor={paxFare(fareFor(f, cabin), pax).total} tag={tagFor(f)} onSelect={() => select(f)} />)
          )}
        </>
      )}

      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        all={all}
        cabin={cabin}
        filters={filters}
        setFilters={setFilters}
        minFare={minFare}
        maxFare={maxFare}
        resultCount={list.length}
      />
    </Screen>
  );
}

function FilterSheet({ open, onClose, all, cabin, filters, setFilters, minFare, maxFare, resultCount }: {
  open: boolean; onClose: () => void; all: Flight[]; cabin: Cabin; filters: Filters; setFilters: (f: Filters) => void; minFare: number; maxFare: number; resultCount: number;
}) {
  const { c } = useTheme();
  const toggle = <K extends "stops" | "times" | "airlines">(k: K, v: Filters[K][number]) => {
    const arr = filters[k] as any[];
    setFilters({ ...filters, [k]: arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v] });
  };
  const stopsPresent = [...new Set(all.map((f) => f.stops))].sort();
  const minFor = (pred: (f: Flight) => boolean) => Math.min(...all.filter(pred).map((f) => fareFor(f, cabin)));
  const airlinesPresent = [...new Set(all.map((f) => f.airline))].map((a) => ({ a, min: minFor((f) => f.airline === a) })).sort((x, y) => x.min - y.min);
  const step = maxFare - minFare > 200000 ? 5000 : 1000;
  const cur = filters.maxPrice ?? maxFare;
  const setMax = (v: number) => setFilters({ ...filters, maxPrice: Math.max(minFare, Math.min(maxFare, v)) });
  const presets = [0.25, 0.5, 0.75].map((p) => Math.ceil((minFare + (maxFare - minFare) * p) / step) * step);
  return (
    <Sheet
      visible={open}
      onClose={onClose}
      title="Filter results"
      scroll
      header={
        <Row justify="space-between" style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
          <Text variant="h3">Filter results</Text>
          <Pressable onPress={() => setFilters(noFilters())} hitSlop={8}><Text weight="bold" color={c.primary}>Reset</Text></Pressable>
        </Row>
      }
      footer={<Button title={`Show ${resultCount} flight${resultCount === 1 ? "" : "s"}`} full onPress={onClose} />}
    >
      <Text variant="label" muted style={{ marginBottom: 6 }}>Stops</Text>
      {stopsPresent.map((s) => (
        <Row key={s} justify="space-between">
          <View style={{ flex: 1 }}><Checkbox checked={filters.stops.includes(s)} onChange={() => toggle("stops", s)} label={s === 0 ? "Direct" : "1 stop"} /></View>
          <Text variant="sm" muted tabular>{naira(minFor((f) => f.stops === s))}</Text>
        </Row>
      ))}

      <Text variant="label" muted style={{ marginTop: 16, marginBottom: 8 }}>Departure time</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {TIMES.map((t) => (
          <OptionCard key={t.id} selected={filters.times.includes(t.id)} onPress={() => toggle("times", t.id)} style={{ width: "48%", padding: 10 }}>
            <Icon name={t.icon} size={18} color={filters.times.includes(t.id) ? c.primary : c.muted} />
            <Text weight="bold" style={{ marginTop: 4 }}>{t.label}</Text>
            <Text variant="xs" muted>{t.sub}</Text>
          </OptionCard>
        ))}
      </View>

      <Text variant="label" muted style={{ marginTop: 16, marginBottom: 8 }}>Max price</Text>
      <Row justify="space-between" style={{ padding: 10, borderRadius: radius.lg, backgroundColor: c.surface2 }}>
        <IconButton icon="bi-dash-lg" size={36} onPress={() => setMax(cur - step)} disabled={cur <= minFare} accessibilityLabel="Lower max price" />
        <Text weight="bold" tabular>Up to {naira(cur)}</Text>
        <IconButton icon="bi-plus-lg" size={36} onPress={() => setMax(cur + step)} disabled={cur >= maxFare} accessibilityLabel="Raise max price" />
      </Row>
      <Row gap={8} wrap style={{ marginTop: 8 }}>
        {presets.map((p) => (
          <Pressable key={p} onPress={() => setMax(p)} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1, borderColor: cur === p ? c.primary : c.border, backgroundColor: cur === p ? c.primarySoft : c.surface }}>
            <Text variant="xs" weight="semibold">≤ {naira(p)}</Text>
          </Pressable>
        ))}
        <Pressable onPress={() => setFilters({ ...filters, maxPrice: null })} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1, borderColor: filters.maxPrice === null ? c.primary : c.border, backgroundColor: filters.maxPrice === null ? c.primarySoft : c.surface }}>
          <Text variant="xs" weight="semibold">Any price</Text>
        </Pressable>
      </Row>

      <Text variant="label" muted style={{ marginTop: 16, marginBottom: 6 }}>Airlines</Text>
      {airlinesPresent.map(({ a, min }) => (
        <Row key={a} justify="space-between">
          <View style={{ flex: 1 }}>
            <Checkbox checked={filters.airlines.includes(a)} onChange={() => toggle("airlines", a)}>
              <Row gap={8}><AirlineLogo code={a} size={22} /><Text variant="sm" weight="semibold">{airlineName(a)}</Text></Row>
            </Checkbox>
          </View>
          <Text variant="sm" muted tabular>{naira(min)}</Text>
        </Row>
      ))}
      <View style={{ marginTop: 8 }}>
        <SwitchRow title="Refundable fares only" value={filters.refundable} onChange={(v) => setFilters({ ...filters, refundable: v })} />
      </View>
    </Sheet>
  );
}
