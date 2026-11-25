import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { copy, requireLogin, success } from "@/components/overlay";
import {
  Badge, Button, Card, Chip, ChipRow, DateField, EmptyState, Flag, Header, Icon, IconTile, OptionCard, Row, Screen, Segment, Sheet, Stepper, StatusPill, Summary, Text,
} from "@/components/ui";
import { airportByCode } from "@/data/catalog";
import { hhmm, naira, parseDay, shortDay, startOfDay } from "@/lib/format";
import { app, useApp, type Booking } from "@/store";
import { radius, useTheme } from "@/theme";
import { AirlineLogo, AirportField } from "@/features/flights/components";
import { airlineName, CABINS, cabinOf, cheapest, cityOf, DAY, flagFor, plusDays, today } from "@/features/flights/engine";
import { runSearch, type Errs } from "@/features/flights/search";
import { useFlights, type SearchForm } from "@/features/flights/state";


const POPULAR: [string, string][] = [["LOS", "ABV"], ["LOS", "DXB"], ["ABV", "LHR"], ["LOS", "ACC"], ["LOS", "PHC"], ["LOS", "JFK"], ["ABV", "KAN"]];
const TRENDING: { a: string; b: string; g: [string, string]; icon: string }[] = [
  { a: "LOS", b: "DXB", g: ["#c8102e", "#7a0a1d"], icon: "bi-buildings" },
  { a: "ABV", b: "LHR", g: ["#1e3a8a", "#0b1a4d"], icon: "bi-bank" },
  { a: "LOS", b: "ACC", g: ["#0e7490", "#0b4f6c"], icon: "bi-tree" },
  { a: "LOS", b: "ABV", g: ["#15803d", "#0b4f2c"], icon: "bi-geo" },
  { a: "LOS", b: "JFK", g: ["#7048e8", "#3b1fa6"], icon: "bi-building" },
  { a: "LOS", b: "IST", g: ["#dc2626", "#7f1d1d"], icon: "bi-moon-stars" },
];

export default function FlightsScreen() {
  const params = useLocalSearchParams<{ from?: string; to?: string; view?: string }>();
  const { c } = useTheme();
  const bookings = useApp((s) => s.bookings);
  const [view, setView] = useState<"search" | "trips">(params.view === "trips" ? "trips" : "search");
  const upcoming = bookings.filter((b) => b.status !== "Cancelled" && b.legs[b.legs.length - 1].date >= today());

  useEffect(() => {
    const from = params.from?.toUpperCase(), to = params.to?.toUpperCase();
    if (from && airportByCode(from)) {
      useFlights.getState().setForm((f) => ({ ...f, legs: [{ ...f.legs[0], from, to: to && airportByCode(to) ? to : f.legs[0].to }, f.legs[1]] }));
      if (to && airportByCode(to)) setTimeout(() => runSearch(useFlights.getState().form), 50);
    }
    if (params.view) setView(params.view === "trips" ? "trips" : "search");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.from, params.to, params.view]);

  return (
    <Screen header={<Header title="Flight Booking" subtitle="Search local & international flights" />}>
      <Segment
        value={view}
        onChange={setView}
        options={[{ value: "search", label: "Search flights", icon: "bi-search" }, { value: "trips", label: "My trips", icon: "bi-airplane", badge: upcoming.length || undefined }]}
        style={{ marginBottom: 16 }}
      />
      {view === "search" ? <SearchView /> : <TripsView />}
      <View style={{ height: 8 }} />
      <Text variant="xs" muted center>Pay straight from your wallet · Instant e-ticket</Text>
      <View style={{ height: 4, backgroundColor: c.bg }} />
    </Screen>
  );
}

/* ====================== Search ====================== */
function SearchView() {
  const { c } = useTheme();
  const form = useFlights((s) => s.form);
  const setForm = useFlights((s) => s.setForm);
  const [errs, setErrs] = useState<Errs>({});
  const [paxOpen, setPaxOpen] = useState(false);
  const t = today();
  const tomorrow = plusDays(t, 1);
  const travellers = form.pax.adults + form.pax.children + form.pax.infants;

  const clear = (k: string) => setErrs((e) => { const n = { ...e }; delete n[k]; return n; });
  const setLeg = (i: 0 | 1, patch: Partial<SearchForm["legs"][0]>) =>
    setForm((f) => {
      const legs = [{ ...f.legs[0] }, { ...f.legs[1] }] as SearchForm["legs"];
      legs[i] = { ...legs[i], ...patch };
      let ret = f.ret;
      if (i === 0 && patch.date) {
        if (ret && ret < patch.date) ret = plusDays(patch.date, 3);
        if (legs[1].date && legs[1].date < patch.date) legs[1].date = plusDays(patch.date, 2);
      }
      return { ...f, legs, ret };
    });
  const setTrip = (trip: SearchForm["trip"]) =>
    setForm((f) => {
      const n = { ...f, trip, legs: [{ ...f.legs[0] }, { ...f.legs[1] }] as SearchForm["legs"] };
      if (trip === "round" && (!n.ret || n.ret < n.legs[0].date)) n.ret = plusDays(n.legs[0].date || tomorrow, 7);
      if (trip === "multi") {
        if (!n.legs[1].from) n.legs[1].from = n.legs[0].to;
        if (!n.legs[1].date || n.legs[1].date < n.legs[0].date) n.legs[1].date = plusDays(n.legs[0].date || tomorrow, 3);
      }
      return n;
    });
  const go = (f: SearchForm) => setErrs(runSearch(f));
  const quick = (a: string, b: string, date?: string) => {
    const f = useFlights.getState().form;
    const d = date || (f.legs[0].date && f.legs[0].date >= t ? f.legs[0].date : tomorrow);
    const next: SearchForm = { ...f, trip: f.trip === "multi" ? "oneway" : f.trip, legs: [{ from: a, to: b, date: d }, f.legs[1]] };
    if (next.trip === "round" && (!next.ret || next.ret < d)) next.ret = plusDays(d, 7);
    setForm(() => next);
    go(next);
  };

  const legRow = (i: 0 | 1) => (
    <View style={{ gap: 10 }}>
      {i === 1 ? <Text variant="label" muted>Flight 2</Text> : null}
      <Row gap={8} align="flex-start">
        <AirportField label={i ? "From (flight 2)" : "From"} icon="bi-geo-alt" value={form.legs[i].from} error={errs["from" + i]} onChange={(v) => { setLeg(i, { from: v }); clear("from" + i); }} />
        <Pressable
          accessibilityLabel="Swap airports"
          onPress={() => setLeg(i, { from: form.legs[i].to, to: form.legs[i].from })}
          style={{ marginTop: 26, width: 36, height: 36, borderRadius: 18, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" }}
        >
          <Icon name="bi-arrow-left-right" size={16} color="#fff" />
        </Pressable>
        <AirportField label={i ? "To (flight 2)" : "To"} icon="bi-pin-map" value={form.legs[i].to} error={errs["to" + i]} onChange={(v) => { setLeg(i, { to: v }); clear("to" + i); }} />
      </Row>
    </View>
  );

  return (
    <View>
      <LinearGradient colors={[c.primary300, c.primary700]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.xxl, padding: 18, marginBottom: -28, paddingBottom: 46 }}>
        <Row justify="space-between" align="flex-start">
          <View style={{ flex: 1 }}>
            <Text variant="h2" color="#fff">Where are you flying next?</Text>
            <Text variant="sm" color="rgba(255,255,255,0.85)" style={{ marginTop: 4 }}>Compare 12 airlines · Instant e-ticket · Pay in Naira</Text>
          </View>
          <Icon name="ion:airplane" size={40} color="rgba(255,255,255,0.35)" />
        </Row>
      </LinearGradient>
      <Card style={{ gap: 14 }}>
        <Segment small value={form.trip} onChange={setTrip} options={[{ value: "oneway", label: "One-way" }, { value: "round", label: "Round trip" }, { value: "multi", label: "Multi-city" }]} />
        {legRow(0)}
        <Row gap={8} align="flex-start">
          <DateField containerStyle={{ flex: 1 }} label="Depart" value={form.legs[0].date} min={t} max={plusDays(t, 330)} error={errs.date0} onChange={(v) => { setLeg(0, { date: v }); clear("date0"); }} />
          {form.trip === "round" ? (
            <DateField containerStyle={{ flex: 1 }} label="Return" value={form.ret} min={form.legs[0].date || t} max={plusDays(t, 330)} error={errs.ret} onChange={(v) => { setForm((f) => ({ ...f, ret: v })); clear("ret"); }} />
          ) : form.trip === "oneway" ? (
            <Pressable onPress={() => setTrip("round")} style={{ flex: 1, marginTop: 24, height: 50, borderRadius: radius.md + 2, borderWidth: 1.5, borderStyle: "dashed", borderColor: c.border, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }}>
              <Icon name="bi-plus-lg" size={16} color={c.primary} />
              <Text weight="semibold" color={c.primary}>Add return</Text>
            </Pressable>
          ) : null}
        </Row>
        {form.trip === "multi" ? (
          <>
            {legRow(1)}
            <DateField label="Depart (flight 2)" value={form.legs[1].date} min={form.legs[0].date || t} max={plusDays(t, 330)} error={errs.date1} onChange={(v) => { setLeg(1, { date: v }); clear("date1"); }} />
            <Text variant="xs" muted>Multi-city supports up to 2 flights.</Text>
          </>
        ) : null}
        <Pressable onPress={() => setPaxOpen(true)} style={{ minHeight: 50, borderRadius: radius.md + 2, borderWidth: 1.5, borderColor: c.border, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Icon name="bi-people" size={18} color={c.muted} />
          <Text weight="medium" style={{ flex: 1 }}>{travellers} Traveller{travellers > 1 ? "s" : ""} · {cabinOf(form.cabin).label}</Text>
          <Icon name="bi-chevron-down" size={16} color={c.muted} />
        </Pressable>
        <Button title="Search flights" icon="bi-search" size="lg" onPress={() => go(form)} />
      </Card>

      <Text variant="label" muted style={{ marginTop: 18, marginBottom: 8 }}>Popular</Text>
      <ChipRow contentStyle={{ paddingHorizontal: 0 }}>
        {POPULAR.map(([a, b]) => <Chip key={a + b} label={`${a} → ${b}`} icon="bi-airplane" onPress={() => quick(a, b)} />)}
      </ChipRow>

      <View style={{ marginTop: 22 }}>
        <Text variant="h3">Trending destinations</Text>
        <Text variant="xs" muted style={{ marginBottom: 10 }}>Lowest fares for next week · one-way, economy</Text>
        <TrendingCards onPick={(a, b) => quick(a, b, plusDays(t, 7))} />
      </View>

      <View style={{ gap: 10, marginTop: 18 }}>
        {[["bi-tags", "Best price guarantee", "Live fares across local & global carriers.", "success"], ["bi-lightning-charge", "Instant e-ticket", "Get your PNR and boarding pass in seconds.", "violet"], ["bi-arrow-counterclockwise", "Easy refunds", "Cancel in-app — refunds go straight to your wallet.", "cyan"]].map(([i, ti, s, tn]) => (
          <Card key={ti} style={{ flexDirection: "row", gap: 12, alignItems: "center", padding: 14 }}>
            <IconTile icon={i} tone={tn} size={40} />
            <View style={{ flex: 1 }}>
              <Text weight="bold">{ti}</Text>
              <Text variant="xs" muted>{s}</Text>
            </View>
          </Card>
        ))}
      </View>

      <PassengersSheet open={paxOpen} onClose={() => setPaxOpen(false)} />
    </View>
  );
}

function TrendingCards({ onPick }: { onPick: (a: string, b: string) => void }) {
  const d = plusDays(today(), 7);
  const data = useMemo(() => TRENDING.map((x) => ({ ...x, price: cheapest(x.a, x.b, d, "Economy") })), [d]);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
      {data.map((x) => {
        const fl = flagFor(x.b);
        return (
          <Pressable key={x.a + x.b} onPress={() => onPick(x.a, x.b)} style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
            <LinearGradient colors={x.g} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 170, height: 150, borderRadius: radius.xl, padding: 14, justifyContent: "space-between" }}>
              <Row justify="space-between">
                {fl ? <Flag code={fl} size={28} /> : <View />}
                <Icon name={x.icon} size={22} color="rgba(255,255,255,0.6)" />
              </Row>
              <View>
                <Text variant="h3" color="#fff">{cityOf(x.b)}</Text>
                <Text variant="xs" color="rgba(255,255,255,0.8)">from {cityOf(x.a)}</Text>
                <Text weight="extrabold" color="#fff" style={{ marginTop: 6 }}>{naira(x.price)}</Text>
              </View>
            </LinearGradient>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function PassengersSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { c } = useTheme();
  const form = useFlights((s) => s.form);
  const setForm = useFlights((s) => s.setForm);
  const { adults, children, infants } = form.pax;
  const seated = adults + children;
  const setPax = (p: Partial<SearchForm["pax"]>) =>
    setForm((f) => {
      const pax = { ...f.pax, ...p };
      if (pax.infants > pax.adults) pax.infants = pax.adults;
      return { ...f, pax };
    });
  let note = "Max 9 travellers. Infants travel on an adult's lap.";
  let warn = false;
  if (infants >= adults && infants > 0) { note = "Each infant must travel with an adult."; warn = true; }
  else if (seated >= 9) { note = "Maximum of 9 seated travellers per booking."; warn = true; }
  const row = (label: string, sub: string, v: number, min: number, canInc: boolean, fn: (n: number) => void) => (
    <Row justify="space-between" style={{ paddingVertical: 10 }}>
      <View>
        <Text weight="bold">{label}</Text>
        <Text variant="xs" muted>{sub}</Text>
      </View>
      <Stepper value={v} min={min} max={canInc ? v + 1 : v} onChange={fn} />
    </Row>
  );
  return (
    <Sheet visible={open} onClose={onClose} title="Passengers & cabin" scroll footer={<Button title="Done" full onPress={onClose} />}>
      {row("Adults", "12+ years", adults, 1, seated < 9, (n) => setPax({ adults: n }))}
      {row("Children", "2–11 years", children, 0, seated < 9, (n) => setPax({ children: n }))}
      {row("Infants", "Under 2 · on lap", infants, 0, infants < adults, (n) => setPax({ infants: n }))}
      <Text variant="xs" color={warn ? c.warningText : c.muted} style={{ marginTop: 4, marginBottom: 14 }}>{note}</Text>
      <Text variant="label" muted style={{ marginBottom: 8 }}>Cabin</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {CABINS.map((cb) => (
          <OptionCard key={cb.key} selected={form.cabin === cb.key} onPress={() => setForm((f) => ({ ...f, cabin: cb.key }))} style={{ width: "48%" }}>
            <Icon name={cb.icon} size={20} color={form.cabin === cb.key ? c.primary : c.muted} />
            <Text weight="bold" style={{ marginTop: 6 }}>{cb.label}</Text>
          </OptionCard>
        ))}
      </View>
    </Sheet>
  );
}

/* ====================== Trips ====================== */
function TripsView() {
  const authed = useApp((s) => s.auth.authed);
  const bookings = useApp((s) => s.bookings);
  const [tab, setTab] = useState<"up" | "past">("up");
  const [cancelling, setCancelling] = useState<Booking | null>(null);
  const t = today();
  const isPast = (b: Booking) => b.legs[b.legs.length - 1].date < t;
  const up = bookings.filter((b) => b.status !== "Cancelled" && !isPast(b)).sort((a, b) => a.legs[0].date.localeCompare(b.legs[0].date) || a.legs[0].flight.dep - b.legs[0].flight.dep);
  const past = bookings.filter((b) => b.status === "Cancelled" || isPast(b)).sort((a, b) => b.createdAt - a.createdAt);
  if (!authed)
    return <EmptyState icon="bi-person-lock" title="Log in to see your trips" message="Your e-tickets and bookings appear here once you sign in." action="Log in" onAction={() => requireLogin({ title: "Log in to see your trips", next: "/flights?view=trips" })} />;
  const list = tab === "up" ? up : past;
  return (
    <View>
      <Row gap={8} style={{ marginBottom: 14 }}>
        <Chip label={`Upcoming (${up.length})`} active={tab === "up"} onPress={() => setTab("up")} />
        <Chip label={`Past & cancelled (${past.length})`} active={tab === "past"} onPress={() => setTab("past")} />
      </Row>
      {list.length === 0 ? (
        <EmptyState
          icon="bi-airplane"
          tone="cyan"
          title={tab === "up" ? "No upcoming trips" : "No past trips yet"}
          message={tab === "up" ? "Book a flight and your e-tickets will show up here." : "Completed and cancelled bookings will appear here."}
          action="Search flights"
          onAction={() => router.setParams({ view: "search" })}
        />
      ) : (
        list.map((b) => <TripCard key={b.id} b={b} past={isPast(b)} onCancel={() => setCancelling(b)} />)
      )}
      <CancelSheet booking={cancelling} onClose={() => setCancelling(null)} />
    </View>
  );
}

function TripCard({ b, past, onCancel }: { b: Booking; past: boolean; onCancel: () => void }) {
  const { c } = useTheme();
  const l0 = b.legs[0];
  const route = b.trip === "round" ? `${cityOf(l0.from)} ⇄ ${cityOf(l0.to)}` : [...b.legs.map((l) => cityOf(l.from)), cityOf(b.legs[b.legs.length - 1].to)].join(" → ");
  const days = Math.round((parseDay(l0.date) - startOfDay()) / DAY);
  const countdown = b.status !== "Cancelled" && days >= 0 && days <= 30 ? (days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`) : null;
  const n = b.passengers.length;
  return (
    <Card style={{ marginBottom: 12 }} onPress={() => router.push(`/flights/ticket/${b.id}`)}>
      <Row gap={12} align="flex-start">
        <AirlineLogo code={l0.flight.airline} size={42} />
        <View style={{ flex: 1 }}>
          <Row justify="space-between" align="flex-start">
            <Text weight="bold" style={{ flex: 1 }} numberOfLines={2}>{route}</Text>
            {b.status === "Cancelled" ? <StatusPill status="cancelled" label="Cancelled" /> : past ? <StatusPill status="neutral" label="Completed" /> : <StatusPill status="success" label="Confirmed" />}
          </Row>
          {countdown ? <Badge label={countdown} tone="cyan" icon="bi-clock" style={{ marginTop: 6 }} /> : null}
          <Text variant="xs" muted style={{ marginTop: 6 }}>
            {b.legs.map((l) => `${shortDay(parseDay(l.date))} · ${hhmm(l.flight.dep)}`).join(" — ")} · {airlineName(l0.flight.airline)} {l0.flight.flightNo}
          </Text>
          <Text variant="xs" muted style={{ marginTop: 2 }}>
            {n} traveller{n > 1 ? "s" : ""} · {cabinOf(b.cabin).label} · {b.refundable ? "Refundable" : "Non-refundable"}{b.refund ? ` · Refunded ${naira(b.refund)}` : ""}
          </Text>
        </View>
      </Row>
      <View style={{ height: 1, backgroundColor: c.border, marginVertical: 12 }} />
      <Row justify="space-between">
        <View>
          <Text weight="extrabold" tabular>{naira(b.total)}</Text>
          <Pressable onPress={() => copy(b.pnr, "PNR copied")} hitSlop={6}>
            <Text variant="xs" weight="semibold" color={c.primary}>PNR {b.pnr} ⧉</Text>
          </Pressable>
        </View>
        <Row gap={8}>
          {!past && b.status !== "Cancelled" ? <Button title="Cancel" size="sm" variant="dangerSoft" onPress={onCancel} /> : null}
          <Button title="View ticket" size="sm" variant="soft" icon="bi-qr-code" onPress={() => router.push(`/flights/ticket/${b.id}`)} />
        </Row>
      </Row>
    </Card>
  );
}

function CancelSheet({ booking, onClose }: { booking: Booking | null; onClose: () => void }) {
  const { c } = useTheme();
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<Booking | null>(null);
  useEffect(() => { if (booking) { setLast(booking); setBusy(false); } }, [booking]);
  const b = booking || last;
  const refund = b ? (b.refundable ? Math.round(b.total * 0.85) : b.taxes) : 0;
  const doCancel = async () => {
    if (!b) return;
    setBusy(true);
    await new Promise((r) => setTimeout(r, 1000));
    const s = app();
    s.update("bookings", (list) => list.map((x) => (x.id === b.id ? { ...x, status: "Cancelled", refund, cancelledAt: Date.now() } : x)));
    if (refund > 0)
      s.credit(refund, { type: "refund", title: `Flight refund · ${b.pnr}`, subtitle: `${b.legs[0].from} → ${b.legs[0].to} cancelled`, icon: "bi-arrow-counterclockwise", tone: "cyan" });
    s.notify({ icon: "bi-airplane", tone: "danger", title: `Booking ${b.pnr} cancelled`, body: `${naira(refund)} has been refunded to your wallet.` });
    setBusy(false);
    onClose();
    setTimeout(() => success({ title: "Booking cancelled", message: `${naira(refund, 2)} has been refunded to your wallet.`, rows: [["PNR", b.pnr], ["Refund", naira(refund, 2)], ["New balance", naira(app().wallet.balance, 2)]] }), 350);
  };
  return (
    <Sheet
      visible={!!booking}
      onClose={onClose}
      locked={busy}
      title={b ? `Cancel booking ${b.pnr}?` : ""}
      scroll
      footer={
        <Row gap={10}>
          <Button title="Keep booking" variant="outline" style={{ flex: 1 }} onPress={onClose} disabled={busy} />
          <Button title={`Cancel & refund ${naira(refund)}`} variant="danger" style={{ flex: 1.4 }} loading={busy} loadingText="Cancelling…" onPress={doCancel} />
        </Row>
      }
    >
      {b ? (
        <View style={{ gap: 12 }}>
          <View style={{ padding: 12, borderRadius: radius.md, backgroundColor: b.refundable ? c.successSoft : c.warningSoft }}>
            <Text weight="bold" color={b.refundable ? c.success : c.warningText}>{b.refundable ? "Refundable fare" : "Non-refundable fare"}</Text>
            <Text variant="sm" muted style={{ marginTop: 2 }}>
              {b.refundable ? "You'll get 85% of the total paid back to your wallet. A 15% cancellation fee applies." : "Only airport taxes & fees are refunded. The base fare and add-ons are forfeited."}
            </Text>
          </View>
          <Summary
            rows={[["Amount paid", naira(b.total)], [b.refundable ? "Cancellation fee (15%)" : "Non-refundable portion", `−${naira(b.total - refund)}`, { color: c.danger }]]}
            total={["Refund to wallet", naira(refund)]}
          />
          <Text variant="xs" muted>This can't be undone. All boarding passes on this booking will be voided.</Text>
        </View>
      ) : null}
    </Sheet>
  );
}

