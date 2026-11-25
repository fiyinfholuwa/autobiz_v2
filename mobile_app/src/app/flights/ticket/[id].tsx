import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect } from "react";
import { View } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { AuthGate } from "@/components/AuthGate";
import { copy, shareText } from "@/components/overlay";
import { Button, EmptyState, Header, Icon, Notice, Row, Screen, StatusPill, Text } from "@/components/ui";
import { date as fmtDate, datetime, dur, hhmm, naira, parseDay } from "@/lib/format";
import { useApp, type Booking, type Passenger } from "@/store";
import { radius, shadow, useTheme } from "@/theme";
import { airlineColor, airlineName, boardingTime, cabinOf, cityOf, gateFor, nextDay, seed } from "@/features/flights/engine";
import { routeString } from "@/features/flights/pricing";
import * as Haptics from "expo-haptics";

function Barcode({ value, color }: { value: string; color: string }) {
  const r = seed(value);
  const bars: { x: number; w: number }[] = [];
  let x = 0;
  while (x < 280) {
    const w = 1 + Math.floor(r() * 3.5);
    if (r() > 0.35) bars.push({ x, w });
    x += w + 1 + Math.floor(r() * 2);
  }
  return (
    <Svg width="100%" height={46} viewBox="0 0 280 46" preserveAspectRatio="none">
      {bars.map((b, i) => <Rect key={i} x={b.x} y={0} width={b.w} height={46} fill={color} />)}
    </Svg>
  );
}

function BoardingPass({ b, li, p, pi }: { b: Booking; li: number; p: Passenger; pi: number }) {
  const { c, dark } = useTheme();
  const l = b.legs[li];
  const f = l.flight;
  const seat = b.seats[`${li}-${pi}`]?.seat || (p.type === "infant" ? "Lap" : "At check-in");
  const cancelled = b.status === "Cancelled";
  const d = nextDay(f.arr);
  const cell = (k: string, v: string, color?: string) => (
    <View style={{ width: "33.3%", paddingVertical: 6 }}>
      <Text size={10} weight="semibold" muted>{k.toUpperCase()}</Text>
      <Text variant="sm" weight="bold" color={color} numberOfLines={1}>{v}</Text>
    </View>
  );
  return (
    <View style={{ backgroundColor: c.surface, borderRadius: radius.xl, overflow: "hidden", marginBottom: 16, borderWidth: dark ? 1 : 0, borderColor: c.border, ...shadow(2, dark), opacity: cancelled ? 0.75 : 1 }}>
      <Row justify="space-between" style={{ backgroundColor: airlineColor(f.airline), paddingHorizontal: 16, paddingVertical: 12 }}>
        <Row gap={8}>
          <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
            <Text size={10} weight="extrabold" color="#fff">{f.airline}</Text>
          </View>
          <Text weight="bold" color="#fff">{airlineName(f.airline)}</Text>
        </Row>
        <Text size={10} weight="bold" color="rgba(255,255,255,0.85)">BOARDING PASS · {cabinOf(b.cabin).label.toUpperCase()}</Text>
      </Row>
      <View style={{ padding: 16 }}>
        <Row justify="space-between" align="center">
          <View>
            <Text variant="display">{f.from}</Text>
            <Text variant="xs" muted>{cityOf(f.from)}</Text>
            <Text weight="bold" tabular>{hhmm(f.dep)}</Text>
          </View>
          <View style={{ alignItems: "center", flex: 1 }}>
            <Icon name="ion:airplane" size={22} color={airlineColor(f.airline)} />
            <Text variant="xs" muted>{dur(f.duration)}</Text>
            <Text variant="xs" weight="semibold" color={f.via ? c.warningText : c.success}>{f.via ? `via ${f.via.code}` : "Direct"}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text variant="display">{f.to}</Text>
            <Text variant="xs" muted>{cityOf(f.to)}</Text>
            <Text weight="bold" tabular>{hhmm(f.arr)}{d ? ` +${d}` : ""}</Text>
          </View>
        </Row>
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 12 }}>
          {cell("Passenger", `${p.title} ${p.first} ${p.last}`.toUpperCase().trim())}
          {cell("Date", fmtDate(parseDay(l.date)))}
          {cell("Flight", f.flightNo)}
          {cell("Boarding", hhmm(boardingTime(f)))}
          {cell("Gate", gateFor(f))}
          {cell("Seat", seat)}
          {cell("Class", b.cabin)}
          {cell("Status", b.status.toUpperCase(), cancelled ? c.danger : c.success)}
        </View>
      </View>
      <Row style={{ marginHorizontal: -10 }}>
        <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: c.bg }} />
        <View style={{ flex: 1, borderTopWidth: 1.5, borderStyle: "dashed", borderColor: c.border }} />
        <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: c.bg }} />
      </Row>
      <View style={{ padding: 16, gap: 8 }}>
        <Row justify="space-between">
          <Text size={10} weight="semibold" muted>BOOKING REF (PNR)</Text>
          <Text variant="h3" style={{ letterSpacing: 2 }}>{b.pnr}</Text>
        </Row>
        <Barcode value={b.pnr + li + pi} color={c.text} />
        <Row justify="space-between">
          <Text variant="xs" muted>{b.pnr}-{li + 1}{pi + 1}-{f.flightNo.replace(" ", "")}</Text>
          <Text variant="xs" muted>{f.from} → {f.to} · {p.first}</Text>
        </Row>
      </View>
    </View>
  );
}

function Ticket() {
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const b = useApp((s) => s.bookings.find((x) => x.id === id));
  const { c } = useTheme();
  useEffect(() => { if (fresh && b) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); }, [fresh, b]);
  if (!b)
    return (
      <Screen header={<Header title="E-ticket" />}>
        <EmptyState icon="bi-airplane" title="Booking not found" message="This booking may have been removed." action="My trips" onAction={() => router.replace({ pathname: "/flights", params: { view: "trips" } })} />
      </Screen>
    );
  const route = routeString(b.legs, b.trip);
  const n = b.passengers.length;
  const intl = b.legs.some((l) => !l.flight.domestic);
  const share = () =>
    shareText(
      `AutoBiz e-ticket ${b.pnr}`,
      [`AutoBiz · E-ticket`, `PNR ${b.pnr} · Issued ${datetime(b.createdAt)}`, route, ...b.legs.map((l) => `${l.from} ${hhmm(l.flight.dep)} → ${l.to} ${hhmm(l.flight.arr)} · ${fmtDate(parseDay(l.date))} · ${airlineName(l.flight.airline)} ${l.flight.flightNo}`), `Travellers: ${b.passengers.map((p) => `${p.first} ${p.last}`).join(", ")}`, `Total ${naira(b.total)}`].join("\n")
    );
  return (
    <Screen
      header={<Header title={`E-ticket · ${b.pnr}`} subtitle={`${route} · ${n} traveller${n > 1 ? "s" : ""} · ${naira(b.total)}`} />}
      footer={
        <Row gap={10}>
          <Button title="Copy PNR" icon="bi-copy" variant="soft" style={{ flex: 1 }} onPress={() => copy(b.pnr, "PNR copied")} />
          <Button title="Share" icon="bi-share" variant="soft" style={{ flex: 1 }} onPress={share} />
          <Button title="Done" style={{ flex: 1 }} onPress={() => router.canGoBack() ? router.back() : router.replace({ pathname: "/flights", params: { view: "trips" } })} />
        </Row>
      }
    >
      {fresh ? (
        <View style={{ alignItems: "center", marginBottom: 14 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.successSoft, alignItems: "center", justifyContent: "center" }}>
            <Icon name="bi-check-lg" size={32} color={c.success} />
          </View>
          <StatusPill status="success" label="Payment successful" />
          <Text variant="h2" style={{ marginTop: 8 }}>You're booked!</Text>
        </View>
      ) : null}
      {b.status === "Cancelled" ? (
        <Notice tone="danger" icon="bi-x-circle" style={{ marginBottom: 14 }}>{`This booking was cancelled · ${naira(b.refund || 0)} refunded to wallet.`}</Notice>
      ) : null}
      {b.legs.map((_, li) => b.passengers.map((p, pi) => <BoardingPass key={`${li}-${pi}`} b={b} li={li} p={p} pi={pi} />))}
      <Text variant="xs" muted center>Present this pass with a valid {intl ? "passport" : "ID"} at the airport. A copy was sent to {b.contact.email}.</Text>
    </Screen>
  );
}

export default function TicketScreen() {
  return (
    <AuthGate>
      <Ticket />
    </AuthGate>
  );
}
