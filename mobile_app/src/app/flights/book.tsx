import { router, useNavigation } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { confirmDialog, confirmPay, openFund, toast } from "@/components/overlay";
import {
  Badge, Button, Card, Checkbox, DateField, EmptyState, Header, Icon, IconTile, Notice, Row, Screen, Select, Sheet, Stepper, StatusPill, Summary, SwitchRow, Text, TextField, type SummaryRow,
} from "@/components/ui";
import { dur, hhmm, isoDay, longDay, naira, parseDay, ref, shortDay } from "@/lib/format";
import { rndCode } from "@/lib/random";
import { app, useApp, type Booking, type Passenger } from "@/store";
import { radius, useTheme } from "@/theme";
import { AirlineLogo, FlightTimeline, TimesLine } from "@/features/flights/components";
import {
  airlineName, baggage, cabinOf, cityOf, extraLegroomPrice, fareFor, paxFare, refundableFor, seatLayout, takenSeats, today,
} from "@/features/flights/engine";
import { BAG_PRICE, bookingTotals, INS_PRICE, PRIO_PRICE, routeString } from "@/features/flights/pricing";
import { useFlights, type BookingDraft } from "@/features/flights/state";

const STEPS = ["Review", "Passengers", "Seats", "Add-ons", "Payment"];
const NATIONALITIES = ["Nigerian", "Ghanaian", "Kenyan", "South African", "British", "American", "Canadian", "Other"];

function ageOn(dob: string, on: string) {
  const b = new Date(parseDay(dob)), d = new Date(parseDay(on));
  let a = d.getFullYear() - b.getFullYear();
  if (d.getMonth() < b.getMonth() || (d.getMonth() === b.getMonth() && d.getDate() < b.getDate())) a--;
  return a;
}
const addMonths = (iso: string, n: number) => { const d = new Date(parseDay(iso)); d.setMonth(d.getMonth() + n); return isoDay(d); };

export default function BookFlight() {
  const { c } = useTheme();
  const booking = useFlights((s) => s.booking);
  const navigation = useNavigation();
  const leaving = useRef(false);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [summaryOpen, setSummaryOpen] = useState(false);
  const scrollRef = useRef<any>(null);

  const setB = (fn: (b: BookingDraft) => BookingDraft) => {
    const b = useFlights.getState().booking;
    if (b) useFlights.getState().set({ booking: fn(b) });
  };
  const goStep = (s: number) => { setB((b) => ({ ...b, step: s, maxStep: Math.max(b.maxStep, s) })); setTimeout(() => scrollRef.current?.scrollTo?.({ y: 0, animated: true }), 50); };

  const resetToResults = () => {
    const st = useFlights.getState();
    if (st.search) st.set({ booking: null, legIdx: st.search.legs.length - 1, picks: st.picks.slice(0, st.search.legs.length - 1) });
  };

  // Confirm before leaving the wizard (header back, gesture, Android back)
  useEffect(() => {
    const unsub = navigation.addListener("beforeRemove" as any, (e: any) => {
      const b = useFlights.getState().booking;
      if (leaving.current || !b) return;
      if (b.step === 0) { resetToResults(); return; }
      e.preventDefault();
      confirmDialog({ title: "Leave booking?", message: "Details you entered will be lost.", confirmLabel: "Leave", tone: "danger", icon: "bi-box-arrow-left" }).then((ok) => {
        if (!ok) return;
        leaving.current = true;
        resetToResults();
        navigation.dispatch(e.data.action);
      });
    });
    return unsub;
  }, [navigation]);

  if (!booking)
    return (
      <Screen header={<Header title="Booking" />}>
        <EmptyState icon="bi-airplane" title="No flight selected" message="Search and select a flight to start booking." action="Search flights" onAction={() => router.replace("/flights")} />
      </Screen>
    );

  const b = booking;
  const T = bookingTotals(b);

  /* ---------- validation ---------- */
  const validatePassengers = () => {
    const e: Record<string, string> = {};
    const first = b.legs[0].date, last = b.legs[b.legs.length - 1].date;
    const nameRe = /^[A-Za-z][A-Za-z' -]*[A-Za-z]$/;
    b.travellers.forEach((t, i) => {
      if (!t.title) e[`${i}.title`] = "Required";
      (["first", "last"] as const).forEach((k) => {
        const v = t[k].trim();
        if (!v) e[`${i}.${k}`] = k === "first" ? "Enter first name" : "Enter last name";
        else if (!nameRe.test(v) || v.length < 2) e[`${i}.${k}`] = "Letters only, min 2 characters";
      });
      if (!t.dob) e[`${i}.dob`] = "Enter date of birth";
      else if (t.dob > today()) e[`${i}.dob`] = "Can't be in the future";
      else if (t.type === "adult") { const a = ageOn(t.dob, first); if (a < 12) e[`${i}.dob`] = "Adults must be 12+ on travel date"; else if (a > 110) e[`${i}.dob`] = "Check the year"; }
      else if (t.type === "child") { const a = ageOn(t.dob, first); if (a < 2 || a > 11) e[`${i}.dob`] = "Children must be 2–11 on travel date"; }
      else if (ageOn(t.dob, last) >= 2) e[`${i}.dob`] = "Infants must be under 2 for the whole trip";
      if (T.intl) {
        if (!/^[A-Z0-9]{6,9}$/.test(t.passport)) e[`${i}.passport`] = "6–9 letters/numbers";
        if (!t.expiry) e[`${i}.expiry`] = "Enter expiry date";
        else if (t.expiry < addMonths(last, 6)) e[`${i}.expiry`] = "Must be valid 6 months after travel";
      }
    });
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(b.contact.email.trim())) e["contact.email"] = "Enter a valid email address";
    if (!/^(0[789][01]\d{8}|\+?234[789][01]\d{8})$/.test(b.contact.phone.replace(/\s/g, ""))) e["contact.phone"] = "Enter a valid Nigerian phone number";
    setErrs(e);
    if (Object.keys(e).length) { toast("Please complete the traveller details", "warning"); return false; }
    return true;
  };

  /* ---------- pay ---------- */
  const pay = async () => {
    if (!b.agree) { setErrs({ agree: "You must accept the fare rules to continue." }); toast("Please accept the fare rules", "warning"); return; }
    const route = routeString(b.legs, b.trip);
    const dates = b.legs.length > 1 ? `${shortDay(parseDay(b.legs[0].date))} – ${shortDay(parseDay(b.legs[b.legs.length - 1].date))}` : shortDay(parseDay(b.legs[0].date));
    const ok = await confirmPay({
      title: "Confirm flight payment", amount: T.total, cta: `Pay ${naira(T.total)}`,
      rows: [["Route", route], ["Date", dates], ["Travellers", String(T.travellers)], ["Cabin", cabinOf(b.cabin).label]],
      note: "Your e-ticket will be issued instantly.",
    });
    if (!ok) return;
    const s = app();
    let pnr = rndCode(6);
    while (s.bookings.some((x) => x.pnr === pnr)) pnr = rndCode(6);
    const tx = s.debit(T.total, { type: "flight", title: `Flight ${route}`, subtitle: `${airlineName(b.legs[0].flight.airline)} · PNR ${pnr}`, icon: "bi-airplane", tone: "cyan" });
    if (!tx) { toast("Insufficient wallet balance", "error"); return; }
    const bk: Booking = {
      id: ref("FL"), pnr, trip: b.trip, cabin: b.cabin,
      legs: b.legs.map((l) => ({ from: l.from, to: l.to, date: l.date, flight: l.flight })),
      passengers: b.travellers.map((t) => ({ type: t.type, label: t.label, title: t.title, first: t.first.trim(), last: t.last.trim(), dob: t.dob, passport: t.passport, nationality: t.nationality })),
      seats: b.seats, seatsSkipped: b.seatsSkipped, addons: b.addons, contact: b.contact,
      fare: T.fare, taxes: T.taxes, total: T.total, refundable: T.refundable, status: "Confirmed", createdAt: Date.now(), txId: tx.id,
    };
    s.update("bookings", (list) => [bk, ...list]);
    s.notify({ icon: "bi-airplane", tone: "cyan", title: `Flight booked · ${pnr}`, body: `${route} on ${dates} is confirmed.` });
    leaving.current = true;
    useFlights.getState().set({ booking: null, search: null, picks: [], legIdx: 0 });
    router.dismissTo({ pathname: "/flights", params: { view: "trips" } });
    setTimeout(() => router.push({ pathname: "/flights/ticket/[id]", params: { id: bk.id, fresh: "1" } }), 350);
  };

  const next = () => {
    if (b.step === 1 && !validatePassengers()) return;
    if (b.step === 4) return pay();
    goStep(b.step + 1);
  };
  const ctas = ["Continue to passengers", "Continue to seats", "Continue to add-ons", "Continue to payment", `Pay ${naira(T.total)}`];

  return (
    <Screen
      scrollRef={scrollRef}
      header={<Header title={STEPS[b.step]} subtitle={routeString(b.legs, b.trip)} back={() => (b.step > 0 ? goStep(b.step - 1) : router.back())} />}
      footer={
        <>
          <Pressable onPress={() => setSummaryOpen(true)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View>
              <Text variant="xs" muted>Total · {T.travellers} traveller{T.travellers > 1 ? "s" : ""}</Text>
              <Text variant="h3" tabular>{naira(T.total)}</Text>
            </View>
            <Row gap={4}><Text variant="sm" weight="bold" color={c.primary}>Price details</Text><Icon name="bi-chevron-up" size={14} color={c.primary} /></Row>
          </Pressable>
          <Row gap={10}>
            {b.step === 2 ? (
              <Button title="Skip" variant="outline" style={{ flex: 1 }} onPress={() => { setB((x) => ({ ...x, seats: {}, seatsSkipped: true })); toast("Seats will be assigned free at check-in", "info"); goStep(3); }} />
            ) : null}
            <Button title={ctas[b.step]} icon={b.step === 4 ? "bi-lock-fill" : undefined} style={{ flex: 2 }} onPress={next} />
          </Row>
        </>
      }
    >
      <StepBar step={b.step} maxStep={b.maxStep} onStep={goStep} />
      {b.step === 0 ? <ReviewStep b={b} onChangeFlights={() => router.back()} /> : null}
      {b.step === 1 ? <PassengersStep b={b} setB={setB} errs={errs} setErrs={setErrs} intl={T.intl} /> : null}
      {b.step === 2 ? <SeatsStep b={b} setB={setB} intl={T.intl} /> : null}
      {b.step === 3 ? <AddonsStep b={b} setB={setB} intl={T.intl} /> : null}
      {b.step === 4 ? <PaymentStep b={b} setB={setB} total={T.total} errs={errs} setErrs={setErrs} /> : null}

      <Sheet visible={summaryOpen} onClose={() => setSummaryOpen(false)} title="Price summary" subtitle={cabinOf(b.cabin).label} scroll>
        <PriceSummary b={b} />
      </Sheet>
    </Screen>
  );
}

/* ---------------- Step bar ---------------- */
function StepBar({ step, maxStep, onStep }: { step: number; maxStep: number; onStep: (s: number) => void }) {
  const { c } = useTheme();
  return (
    <Row gap={4} style={{ marginBottom: 16 }}>
      {STEPS.map((s, i) => {
        const done = i < step, on = i === step;
        return (
          <Pressable key={s} disabled={!(i < step || i <= maxStep) || on} onPress={() => onStep(i)} style={{ flex: 1, alignItems: "center", gap: 5 }}>
            <View style={{ height: 4, alignSelf: "stretch", borderRadius: 2, backgroundColor: done || on ? c.primary : c.border }} />
            <Row gap={3}>
              {done ? <Icon name="bi-check-lg" size={11} color={c.primary} /> : null}
              <Text size={10} weight={on ? "bold" : "semibold"} color={on ? c.text : done ? c.primary : c.muted} numberOfLines={1}>{s}</Text>
            </Row>
          </Pressable>
        );
      })}
    </Row>
  );
}

/* ---------------- Price summary ---------------- */
function PriceSummary({ b }: { b: BookingDraft }) {
  const T = bookingTotals(b);
  const rows: SummaryRow[] = [];
  b.legs.forEach((l, i) => {
    const pf = T.legFares[i];
    rows.push([`${l.from} → ${l.to}`, ""]);
    rows.push([`   Adult × ${b.pax.adults}`, naira(pf.adult * b.pax.adults)]);
    if (b.pax.children) rows.push([`   Child × ${b.pax.children}`, naira(pf.child * b.pax.children)]);
    if (b.pax.infants) rows.push([`   Infant × ${b.pax.infants}`, naira(pf.infant * b.pax.infants)]);
  });
  rows.push(["Base fare", naira(T.base)], ["Taxes & fees (incl.)", naira(T.taxes)]);
  if (T.seats) rows.push(["Seat selection", naira(T.seats)]);
  if (b.addons.bags) rows.push([`Extra bags × ${b.addons.bags}`, naira(T.bags)]);
  if (T.insurance) rows.push(["Travel insurance", naira(T.insurance)]);
  if (T.priority) rows.push(["Priority boarding", naira(T.priority)]);
  rows.push(["Service fee", "Free"]);
  return (
    <View style={{ gap: 10 }}>
      <Summary rows={rows} total={["Total", naira(T.total)]} />
      <Text variant="xs" muted>Fares are guaranteed once payment is completed. {T.refundable ? "Refundable (85%)." : "Non-refundable (taxes only)."}</Text>
    </View>
  );
}

/* ---------------- Step 1: Review ---------------- */
function LegCard({ b, i }: { b: BookingDraft; i: number }) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const l = b.legs[i];
  const f = l.flight;
  const label = b.trip === "round" ? (i === 0 ? "Outbound" : "Return") : b.legs.length > 1 ? `Flight ${i + 1}` : "Departure";
  const refundable = refundableFor(f, b.cabin);
  const bag = baggage(f, b.cabin);
  return (
    <Card style={{ marginBottom: 12 }}>
      <Row justify="space-between" style={{ marginBottom: 10 }}>
        <Row gap={10} style={{ flex: 1 }}>
          <AirlineLogo code={f.airline} size={36} />
          <View style={{ flex: 1 }}>
            <Text variant="label" color={c.primary}>{label} · {shortDay(parseDay(l.date))}</Text>
            <Text weight="bold" numberOfLines={1}>{airlineName(f.airline)} · {cabinOf(b.cabin).label}</Text>
          </View>
        </Row>
        <Badge label={refundable ? "Refundable" : "Non-refundable"} tone={refundable ? "success" : "neutral"} />
      </Row>
      <TimesLine f={f} big />
      <Pressable onPress={() => setOpen((v) => !v)} style={{ marginTop: 10 }} hitSlop={6}>
        <Row gap={4}><Text variant="sm" weight="semibold" color={c.primary}>Itinerary details</Text><Icon name={open ? "bi-chevron-up" : "bi-chevron-down"} size={14} color={c.primary} /></Row>
      </Pressable>
      {open ? <FlightTimeline f={f} cabin={b.cabin} /> : null}
      <Text variant="xs" muted style={{ marginTop: 8 }}>{bag.hold} checked · {bag.cabinBag} cabin</Text>
    </Card>
  );
}

function ReviewStep({ b, onChangeFlights }: { b: BookingDraft; onChangeFlights: () => void }) {
  const T = bookingTotals(b);
  const rules: [string, string, string][] = [
    ["bi-arrow-counterclockwise", "Cancellation", T.refundable ? "Cancel before departure and get 85% of the total paid back to your wallet." : "On cancellation only airport taxes & fees are refunded to your wallet."],
    ["bi-calendar3", "Date change", `Allowed up to 24h before departure · ${T.intl ? "₦45,000" : "₦10,000"} fee + fare difference.`],
    ["bi-person", "Name correction", `Names must match ${T.intl ? "passports" : "a valid government ID"}. Minor corrections only.`],
    ["bi-clock", "Check-in", `Online check-in opens 24h before departure. Counter closes ${T.intl ? 60 : 45} min before.`],
  ];
  if (T.intl) rules.push(["bi-globe2", "Travel documents", "Passport valid 6 months beyond travel and any required visas are your responsibility."]);
  return (
    <View>
      <Text variant="h3" style={{ marginBottom: 10 }}>Your itinerary</Text>
      {b.legs.map((_, i) => <LegCard key={i} b={b} i={i} />)}
      <Text variant="h3" style={{ marginTop: 6, marginBottom: 10 }}>Fare rules</Text>
      <Card style={{ gap: 12 }}>
        {rules.map(([icon, t, d]) => (
          <Row key={t} gap={12} align="flex-start">
            <IconTile icon={icon} size={34} tone="primary" />
            <View style={{ flex: 1 }}>
              <Text weight="bold">{t}</Text>
              <Text variant="sm" muted>{d}</Text>
            </View>
          </Row>
        ))}
      </Card>
      <Button title="Change flights" variant="outline" icon="bi-arrow-left" style={{ marginTop: 14 }} onPress={onChangeFlights} />
    </View>
  );
}

/* ---------------- Step 2: Passengers ---------------- */
function PassengersStep({ b, setB, errs, setErrs, intl }: { b: BookingDraft; setB: (fn: (b: BookingDraft) => BookingDraft) => void; errs: Record<string, string>; setErrs: (fn: (e: Record<string, string>) => Record<string, string>) => void; intl: boolean }) {
  const user = useApp((s) => s.user);
  const clear = (k: string) => setErrs((e) => { if (!e[k]) return e; const n = { ...e }; delete n[k]; return n; });
  const upd = (i: number, patch: Partial<Passenger>) => {
    setB((x) => ({ ...x, travellers: x.travellers.map((t, j) => (j === i ? { ...t, ...patch } : t)) }));
    Object.keys(patch).forEach((k) => clear(`${i}.${k}`));
  };
  const subs = { adult: "12+ years", child: "2–11 years on travel date", infant: "Under 2 on travel date · travels on lap" };
  return (
    <View>
      <Text variant="h3">Who's travelling?</Text>
      <Text variant="sm" muted style={{ marginBottom: 12 }}>Enter names exactly as on {intl ? "the passport" : "a valid ID"}.</Text>
      <Button
        title={`I'm Adult 1 (${user.firstName})`}
        icon="bi-person-circle"
        variant="soft"
        style={{ marginBottom: 14 }}
        onPress={() => upd(0, { first: user.firstName, last: user.lastName, title: b.travellers[0].title || "Ms" })}
      />
      {b.travellers.map((t, i) => {
        const titles = t.type === "adult" ? ["Mr", "Mrs", "Ms", "Dr"] : ["Master", "Miss"];
        const e = (k: string) => errs[`${i}.${k}`];
        return (
          <Card key={i} style={{ marginBottom: 12, gap: 12 }}>
            <Row gap={10}>
              <IconTile icon={t.type === "infant" ? "mci:baby-face-outline" : t.type === "child" ? "mci:human-child" : "bi-person"} size={36} tone={t.type === "adult" ? "primary" : "violet"} />
              <View style={{ flex: 1 }}>
                <Text weight="bold">{t.label}</Text>
                <Text variant="xs" muted>{subs[t.type]}</Text>
              </View>
            </Row>
            <Row gap={10} align="flex-start">
              <Select containerStyle={{ width: 110 }} label="Title" value={t.title} placeholder="Select" options={titles.map((x) => ({ value: x, label: x }))} onChange={(v) => upd(i, { title: v })} error={e("title")} />
              <DateField containerStyle={{ flex: 1 }} label="Date of birth" value={t.dob} max={today()} display="iso" error={e("dob")} onChange={(v) => upd(i, { dob: v })} />
            </Row>
            <TextField label="First name" placeholder="As on ID" value={t.first} onChangeText={(v) => upd(i, { first: v })} error={e("first")} autoCapitalize="words" autoComplete="given-name" />
            <TextField label="Last name" placeholder="As on ID" value={t.last} onChangeText={(v) => upd(i, { last: v })} error={e("last")} autoCapitalize="words" autoComplete="family-name" />
            {intl ? (
              <>
                <TextField label="Passport number" placeholder="e.g. A01234567" value={t.passport} maxLength={9} autoCapitalize="characters" onChangeText={(v) => upd(i, { passport: v.toUpperCase().replace(/[^A-Z0-9]/g, "") })} error={e("passport")} />
                <Row gap={10} align="flex-start">
                  <DateField containerStyle={{ flex: 1 }} label="Passport expiry" value={t.expiry || ""} min={today()} display="iso" error={e("expiry")} onChange={(v) => upd(i, { expiry: v })} />
                  <Select containerStyle={{ flex: 1 }} label="Nationality" value={t.nationality} options={NATIONALITIES.map((x) => ({ value: x, label: x }))} onChange={(v) => upd(i, { nationality: v })} />
                </Row>
              </>
            ) : null}
          </Card>
        );
      })}
      <Card style={{ gap: 12 }}>
        <View>
          <Text weight="bold">Contact details</Text>
          <Text variant="xs" muted>E-ticket and flight updates go here.</Text>
        </View>
        <TextField label="Email" keyboardType="email-address" autoCapitalize="none" value={b.contact.email} onChangeText={(v) => { setB((x) => ({ ...x, contact: { ...x.contact, email: v } })); clear("contact.email"); }} error={errs["contact.email"]} />
        <TextField label="Phone" placeholder="080..." keyboardType="phone-pad" value={b.contact.phone} onChangeText={(v) => { setB((x) => ({ ...x, contact: { ...x.contact, phone: v } })); clear("contact.phone"); }} error={errs["contact.phone"]} />
      </Card>
    </View>
  );
}

/* ---------------- Step 3: Seats ---------------- */
function SeatsStep({ b, setB, intl }: { b: BookingDraft; setB: (fn: (b: BookingDraft) => BookingDraft) => void; intl: boolean }) {
  const { c } = useTheme();
  const seated = b.travellers.map((t, i) => ({ t, i })).filter((x) => x.t.type !== "infant");
  const leg = b.legs[b.seatLeg];
  const L = seatLayout(b.cabin);
  const taken = takenSeats(leg.flight, b.cabin);
  const xPrice = extraLegroomPrice(intl);
  const mine = (pi: number) => b.seats[`${b.seatLeg}-${pi}`]?.seat;
  const ownerOf = (seat: string) => seated.find((x) => b.seats[`${b.seatLeg}-${x.i}`]?.seat === seat);
  const initials = (t: Passenger) => (t.first && t.last ? (t.first[0] + t.last[0]).toUpperCase() : t.label[0] + t.label.split(" ")[1]);
  const curPax = seated.find((x) => x.i === b.seatPax) ? b.seatPax : seated[0]?.i ?? 0;

  const pick = (seat: string, row: number) => {
    const owner = ownerOf(seat);
    const key = `${b.seatLeg}-${curPax}`;
    if (owner && owner.i === curPax) { setB((x) => { const s = { ...x.seats }; delete s[key]; return { ...x, seats: s }; }); return; }
    if (owner) { toast(`Seat ${seat} is already chosen for ${owner.t.label}`, "warning"); return; }
    const price = L.extra.includes(row) ? xPrice : 0;
    setB((x) => {
      const seats = { ...x.seats, [key]: { seat, price } };
      let seatLeg = x.seatLeg, seatPax = curPax;
      const nextPax = seated.find((p) => !seats[`${x.seatLeg}-${p.i}`]);
      if (nextPax) seatPax = nextPax.i;
      else if (x.seatLeg < x.legs.length - 1) {
        const nl = x.seatLeg + 1;
        const un = seated.find((p) => !seats[`${nl}-${p.i}`]);
        if (un) {
          seatLeg = nl; seatPax = un.i;
          toast(`Now choose seats for ${x.legs[nl].from} → ${x.legs[nl].to}`, "info");
        }
      }
      return { ...x, seats, seatsSkipped: false, seatLeg, seatPax };
    });
  };

  const seatW = L.wide ? 52 : 40;
  return (
    <View>
      <Text variant="h3">Choose your seats</Text>
      <Text variant="sm" muted style={{ marginBottom: 12 }}>Optional — skip and seats are assigned free at check-in.</Text>
      {b.legs.length > 1 ? (
        <Row gap={8} style={{ marginBottom: 12 }}>
          {b.legs.map((l, i) => (
            <Pressable key={i} onPress={() => setB((x) => ({ ...x, seatLeg: i }))} style={{ flex: 1, paddingVertical: 10, borderRadius: radius.md, alignItems: "center", backgroundColor: i === b.seatLeg ? c.primary : c.surface, borderWidth: 1, borderColor: i === b.seatLeg ? c.primary : c.border }}>
              <Text weight="bold" color={i === b.seatLeg ? "#fff" : c.text}>{l.from} → {l.to}</Text>
            </Pressable>
          ))}
        </Row>
      ) : null}
      <Text variant="label" muted style={{ marginBottom: 6 }}>Selecting for</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginBottom: 12 }}>
        {seated.map(({ t, i }) => {
          const s = b.seats[`${b.seatLeg}-${i}`];
          const on = i === curPax;
          return (
            <Pressable key={i} onPress={() => setB((x) => ({ ...x, seatPax: i }))} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md, borderWidth: 1.5, borderColor: on ? c.primary : c.border, backgroundColor: on ? c.primarySoft : c.surface }}>
              <Text variant="sm" weight="bold">{t.first ? `${t.first} ${t.last}` : t.label}</Text>
              <Text variant="xs" muted>{s ? `Seat ${s.seat} · ${s.price ? naira(s.price) : "Free"}` : "No seat yet"}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Row wrap gap={12} style={{ marginBottom: 12 }}>
        {[[c.surface2, "Included"], [c.violetSoft, `Extra legroom · ${naira(xPrice)}`], [c.border, "Taken"], [c.primary, "Selected"], ...(seated.length > 1 ? [[c.primary300, "Other traveller"]] : [])].map(([col, l]) => (
          <Row key={l} gap={5}><View style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: col }} /><Text variant="xs" muted>{l}</Text></Row>
        ))}
      </Row>
      <Card style={{ alignItems: "center", paddingVertical: 18 }}>
        <View style={{ width: "70%", height: 26, borderTopLeftRadius: 60, borderTopRightRadius: 60, backgroundColor: c.surface2, marginBottom: 12, alignItems: "center", justifyContent: "flex-end" }}>
          <Text variant="xs" muted>Front · {cabinOf(b.cabin).label}</Text>
        </View>
        <Row gap={6} style={{ marginBottom: 4 }}>
          <View style={{ width: 24 }} />
          {L.cols.map((col) => (
            <React.Fragment key={col}>
              <View style={{ width: seatW, alignItems: "center" }}><Text variant="xs" muted weight="bold">{col}</Text></View>
              {col === L.aisleAfter ? <View style={{ width: 18 }} /> : null}
            </React.Fragment>
          ))}
        </Row>
        {L.rows.map((row) => (
          <View key={row}>
            {L.extra.includes(row) && b.cabin === "Economy" ? <Text variant="xs" weight="bold" color={c.danger} center style={{ marginVertical: 2 }}>EXIT</Text> : null}
            <Row gap={6} style={{ marginBottom: 6 }}>
              <View style={{ width: 24, alignItems: "center" }}><Text variant="xs" muted>{row}</Text></View>
              {L.cols.map((col) => {
                const id = `${row}${col}`;
                const isTaken = taken.has(id);
                const owner = ownerOf(id);
                const own = owner && owner.i === curPax;
                const extra = L.extra.includes(row);
                const bg = isTaken ? c.border : own ? c.primary : owner ? c.primary300 : extra ? c.violetSoft : c.surface2;
                return (
                  <React.Fragment key={col}>
                    <Pressable
                      disabled={isTaken}
                      accessibilityLabel={`Seat ${id}${isTaken ? " taken" : ""}`}
                      onPress={() => pick(id, row)}
                      style={{ width: seatW, height: 38, borderRadius: 9, borderTopLeftRadius: 12, borderTopRightRadius: 12, backgroundColor: bg, alignItems: "center", justifyContent: "center", opacity: isTaken ? 0.5 : 1 }}
                    >
                      {isTaken ? <Icon name="bi-x-lg" size={12} color={c.muted} /> : <Text size={11} weight="bold" color={owner ? "#fff" : extra ? c.violet : c.muted}>{owner ? initials(owner.t) : col}</Text>}
                    </Pressable>
                    {col === L.aisleAfter ? <View style={{ width: 18 }} /> : null}
                  </React.Fragment>
                );
              })}
            </Row>
          </View>
        ))}
      </Card>
      <Text variant="xs" muted style={{ marginTop: 10 }}>
        {airlineName(leg.flight.airline)} {leg.flight.flightNo} · {cabinOf(b.cabin).label} cabin{leg.flight.stops ? " · seat applies to all segments" : ""}
      </Text>
    </View>
  );
}

/* ---------------- Step 4: Add-ons ---------------- */
function AddonsStep({ b, setB, intl }: { b: BookingDraft; setB: (fn: (b: BookingDraft) => BookingDraft) => void; intl: boolean }) {
  const T = bookingTotals(b);
  const n = b.legs.length;
  return (
    <View>
      <Text variant="h3">Make your trip better</Text>
      <Text variant="sm" muted style={{ marginBottom: 12 }}>All add-ons are optional.</Text>
      <Card style={{ marginBottom: 12 }}>
        <Row gap={12}>
          <IconTile icon="bi-bag" tone="orange" />
          <View style={{ flex: 1 }}>
            <Text weight="bold">Extra checked bag</Text>
            <Text variant="xs" muted>23kg per bag · {naira(BAG_PRICE(intl))} per bag, per flight{n > 1 ? ` (×${n} flights)` : ""}</Text>
          </View>
        </Row>
        <Row justify="space-between" style={{ marginTop: 12 }}>
          <Text weight="semibold" tabular>{T.bags ? naira(T.bags) : "None"}</Text>
          <Stepper value={b.addons.bags} min={0} max={T.seated * 2} onChange={(v) => setB((x) => ({ ...x, addons: { ...x.addons, bags: v } }))} />
        </Row>
      </Card>
      <Card style={{ marginBottom: 12, paddingVertical: 4 }}>
        <SwitchRow icon="bi-shield-check" tone="success" title="Travel insurance" subtitle={`Medical cover, trip cancellation & lost baggage · ${naira(INS_PRICE(intl))} per traveller${b.addons.insurance ? ` · ${naira(T.insurance)}` : ""}`} value={b.addons.insurance} onChange={(v) => setB((x) => ({ ...x, addons: { ...x.addons, insurance: v } }))} />
      </Card>
      <Card style={{ paddingVertical: 4 }}>
        <SwitchRow icon="bi-lightning-charge" tone="violet" title="Priority boarding" subtitle={`Board first & fast-track security · ${naira(PRIO_PRICE)} per traveller, per flight · ${naira(PRIO_PRICE * T.seated * n)}`} value={b.addons.priority} onChange={(v) => setB((x) => ({ ...x, addons: { ...x.addons, priority: v } }))} />
      </Card>
    </View>
  );
}

/* ---------------- Step 5: Payment ---------------- */
function PaymentStep({ b, setB, total, errs, setErrs }: { b: BookingDraft; setB: (fn: (b: BookingDraft) => BookingDraft) => void; total: number; errs: Record<string, string>; setErrs: (fn: (e: Record<string, string>) => Record<string, string>) => void }) {
  const { c } = useTheme();
  const balance = useApp((s) => (s.auth.authed ? s.wallet.balance : 0));
  const can = balance >= total;
  return (
    <View>
      <Text variant="h3" style={{ marginBottom: 10 }}>Review & pay</Text>
      <Card style={{ gap: 10, marginBottom: 12 }}>
        {b.legs.map((l, i) => (
          <Row key={i} gap={10}>
            <AirlineLogo code={l.flight.airline} size={32} />
            <View style={{ flex: 1 }}>
              <Text weight="bold">{l.from} {hhmm(l.flight.dep)} → {l.to} {hhmm(l.flight.arr)}{l.flight.arr >= 1440 ? " +1" : ""}</Text>
              <Text variant="xs" muted>{longDay(parseDay(l.date))} · {airlineName(l.flight.airline)} {l.flight.flightNo} · {dur(l.flight.duration)}</Text>
            </View>
          </Row>
        ))}
      </Card>
      <Card style={{ gap: 10, marginBottom: 12 }}>
        <Text variant="label" muted>Travellers</Text>
        {b.travellers.map((t, i) => (
          <Row key={i} justify="space-between">
            <View style={{ flex: 1 }}>
              <Text weight="semibold">{t.title} {t.first} {t.last}</Text>
              <Text variant="xs" muted>{t.label}{t.passport ? ` · ${t.passport}` : ""}</Text>
            </View>
            <Text variant="sm" weight="semibold">{t.type === "infant" ? "On lap" : b.legs.map((_, li) => b.seats[`${li}-${i}`]?.seat || "—").join(" / ")}</Text>
          </Row>
        ))}
        <View style={{ height: 1, backgroundColor: c.border }} />
        <Text variant="xs" muted>Contact: {b.contact.email} · {b.contact.phone}</Text>
      </Card>
      <PriceSummary b={b} />
      <Row justify="space-between" style={{ marginTop: 12, padding: 12, borderRadius: radius.lg, borderWidth: 1.5, borderColor: can ? c.border : c.danger }}>
        <Row gap={10}>
          <IconTile icon="bi-wallet2" size={36} />
          <View>
            <Text weight="semibold">Pay from wallet</Text>
            <Text variant="xs" muted>Balance: {naira(balance, 2)}</Text>
          </View>
        </Row>
        {can ? <Icon name="bi-check-circle-fill" size={20} color={c.success} /> : <Button title="Top up" size="sm" variant="soft" onPress={openFund} />}
      </Row>
      <View style={{ marginTop: 12 }}>
        <Checkbox
          checked={b.agree}
          onChange={(v) => { setB((x) => ({ ...x, agree: v })); setErrs((e) => { const n = { ...e }; delete n.agree; return n; }); }}
          label="I accept the fare rules and confirm traveller names match their travel documents."
          error={errs.agree}
        />
      </View>
      {!can ? <Notice tone="warning" icon="bi-exclamation-triangle" style={{ marginTop: 10 }}>Your wallet balance is lower than the total. Top up to complete this booking.</Notice> : null}
      <View style={{ height: 6 }} />
      <StatusPill status="info" label="Secure payment · PIN protected" />
    </View>
  );
}

